import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { MptStoreService } from '../../../mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../../mpt/mpt-util/mpt-util.service';
import * as xrpl from 'xrpl';
import { XrplService } from '../../../xrpl-services/xrpl.service';
import { WalletManagerService } from '../../../wallets/manager/wallet-manager.service';

type AsyncState<T> = {
     loading: boolean;
     value: T | null;
};

@Injectable({
     providedIn: 'root',
})
export class MptAuthorizeValidatorService {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly mptUtil = inject(MptUtilService);
     public readonly xrplService = inject(XrplService);
     public readonly walletManagerService = inject(WalletManagerService);

     private readonly dropdownDestinationIsValid = signal<boolean>(true);
     public readonly mptDetails = computed(() => this.mptDetailsState().value);
     public readonly mptIssuer = computed(() => this.mptDetailsState().issuer);
     public readonly isCheckingMpt = computed(() => this.mptExistsState().loading);
     private readonly currentAccount = computed(() => this.walletManagerService.getSelectedWallet() || null);
     private readonly issuanceId = this.mptStoreService.mptIssuanceId;

     readonly fetchedMptDetails = signal<any>(null);
     private mptCheckPending = signal(false);
     private lastCheckedId: string | null = null;
     private checkTimeout: any;
     private destroyRef = inject(DestroyRef);

     private mptDetailsState = signal<{
          loading: boolean;
          value: any | null; // full MPTokenIssuance object
          issuer: string | null;
     }>({ loading: false, value: null, issuer: null });

     constructor() {
          this.setupMptLookup();
          this.destroyRef.onDestroy(() => {
               if (this.checkTimeout) clearTimeout(this.checkTimeout);
          });
     }

     readonly isCurrentUserIssuer = computed(() => {
          const current = this.currentAccount()?.classicAddress?.toUpperCase();
          let issuer = this.mptIssuer()?.toUpperCase();

          // Also check raw fetched object
          if (!issuer) {
               const mpt = this.mptDetails() || this.fetchedMptDetails();
               issuer = (mpt?.Issuer || mpt?.node?.Issuer || mpt?.Account || '').toUpperCase();
          }

          return !!current && !!issuer && current === issuer;
     });

     readonly requiresIssuerAction = computed(() => {
          const mpt = this.mptDetails();
          if (!mpt) return false;
          const requiresAuth = !!(mpt.Flags & 0x00000004);
          return requiresAuth && this.isCurrentUserIssuer();
     });

     readonly requiresAuth = computed(() => {
          const mpt = this.mptDetails() || this.fetchedMptDetails();
          if (!mpt) return false;

          const flags = Number(mpt.Flags) || Number(mpt.node?.Flags) || 0;
          return (flags & 0x00000004) !== 0; // tfMPTRequireAuth
     });

     readonly authorizationMode = computed(() => {
          if (!this.requiresAuth()) return 'none';
          return this.isCurrentUserIssuer() ? 'issuer' : 'holder';
     });

     readonly requiresHolderAction = computed(() => {
          const mpt = this.mptDetails();
          if (!mpt) return false;
          const requiresAuth = !!(mpt.Flags & 0x00000004);
          return requiresAuth && !this.isCurrentUserIssuer();
     });

     mptExistsState = signal<AsyncState<boolean>>({
          loading: false,
          value: null,
     });

     readonly validIssuanceId = computed(() => {
          const id = this.issuanceId()?.trim();
          return !!id && /^[A-F0-9]{48}$/i.test(id);
     });

     readonly mptLookupTrigger = computed(() => {
          const id = this.issuanceId()?.trim();
          if (!id || !this.validIssuanceId()) {
               return null;
          }
          return id;
     });

     private setupMptLookup() {
          effect(() => {
               const id = this.mptLookupTrigger();

               if (!id) {
                    this.mptExistsState.set({ loading: false, value: null });
                    this.mptDetailsState.set({ loading: false, value: null, issuer: null });
                    this.lastCheckedId = null;
                    return;
               }

               if (id === this.lastCheckedId) return;
               this.lastCheckedId = id;

               this.performMptCheck(id);
          });
     }

     private async performMptCheck(id: string) {
          if (this.checkTimeout) clearTimeout(this.checkTimeout);
          this.mptExistsState.set({ loading: true, value: null });
          this.mptDetailsState.set({ loading: true, value: null, issuer: null });

          // First check if MPT exists in local cache (existingMpts)
          const localMpt = this.findMptInLocalCache(id);
          if (localMpt) {
               console.log('Found MPT in local cache:', localMpt);
               this.mptExistsState.set({ loading: false, value: true });
               this.mptDetailsState.set({
                    loading: false,
                    value: localMpt,
                    issuer: localMpt.Issuer || localMpt.Account || null,
               });
               return;
          }

          // If not in cache, fetch from XRPL
          this.checkTimeout = setTimeout(async () => {
               try {
                    const client = await this.xrplService.getClient();
                    const mptData = await this.xrplService.doesMptExist(client, id);

                    const exists = !!mptData;

                    this.mptExistsState.set({ loading: false, value: exists });
                    // this.mptDetailsState.set({
                    //      loading: false,
                    //      value: mptData?.node || mptData, // Important: XRPL ledger_entry returns {node: {...}}
                    //      issuer: (mptData?.node || mptData)?.Issuer || (mptData?.node || mptData)?.Account || null,
                    // });

                    if (mptData && mptData.length > 0) {
                         console.log('Fetched MPT from XRPL:', mptData);
                         this.mptDetailsState.set({
                              loading: false,
                              value: mptData?.node || mptData, // Important: XRPL ledger_entry returns {node: {...}}
                              issuer: (mptData?.node || mptData)?.Issuer || (mptData?.node || mptData)?.Account || null,
                         });

                         // Optionally cache the fetched MPT
                         this.cacheFetchedMpt(id, mptData);
                         this.fetchedMptDetails.set(mptData?.node || mptData);
                    }
               } catch (e) {
                    console.error(`MPT ID ${id} check failed:`, e);
                    this.mptExistsState.set({ loading: false, value: false });
                    this.mptDetailsState.set({ loading: false, value: null, issuer: null });
               }
          }, 400);
     }

     private findMptInLocalCache(issuanceId: string): any | null {
          const existingMpts = this.mptStoreService.existingMpts();
          return existingMpts.find(m => m.mpt_issuance_id?.toUpperCase() === issuanceId.toUpperCase() || m.id?.toUpperCase() === issuanceId.toUpperCase()) || null;
     }

     private cacheFetchedMpt(issuanceId: string, mptData: any) {
          const currentMpts = this.mptStoreService.existingMpts();
          const alreadyExists = currentMpts.some(m => m.mpt_issuance_id?.toUpperCase() === issuanceId.toUpperCase());

          if (!alreadyExists) {
               const formattedMpt = {
                    LedgerEntryType: 'MPTokenIssuance',
                    mpt_issuance_id: issuanceId,
                    id: mptData.index || issuanceId,
                    AssetScale: mptData.AssetScale ?? 0,
                    OutstandingAmount: mptData.OutstandingAmount ?? '0',
                    MaximumAmount: mptData.MaximumAmount ?? 'Unlimited',
                    TransferFee: mptData.TransferFee ?? '0',
                    MPTokenMetadata: mptData.MPTokenMetadata ?? '',
                    Flags: Number(mptData.Flags) || 0, // ← Force number
                    Issuer: mptData.Issuer || mptData.Account || 'Unknown',
                    isHolder: false,
                    amount: mptData.OutstandingAmount ?? '0',
               };

               this.mptStoreService.setField('existingMpts', [...currentMpts, formattedMpt]);
          }
     }

     // Public method to get formatted MPT details for display
     getFormattedMptDetails(): any | null {
          const mpt = this.mptDetails();
          if (!mpt) return null;

          // Format the outstanding amount if asset scale is available
          let formattedOutstanding = mpt.OutstandingAmount || '0';
          const assetScale = mpt.AssetScale || 0;

          if (assetScale > 0 && formattedOutstanding !== '0') {
               formattedOutstanding = this.mptUtil.formatMptAmount(formattedOutstanding, assetScale);
          }

          return {
               id: mpt.mpt_issuance_id || mpt.index,
               assetScale: assetScale,
               maxAmount: mpt.MaximumAmount || 'Unlimited',
               outstanding: formattedOutstanding,
               flags: mpt.Flags || 0,
               transferFee: mpt.TransferFee || 0,
               requiresAuth: !!(mpt.Flags & 0x00000004),
          };
     }

     // Validation Methods
     isMptIssuanceIdValid = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId || issuanceId.trim().length === 0) {
               return false;
          }
          const hexRegex = /^[0-9A-Fa-f]{48}$/;
          return hexRegex.test(issuanceId.trim());
     });

     isMptIssuanceIdInvalid = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId || issuanceId.trim().length === 0) {
               return false;
          }
          return !this.isMptIssuanceIdValid();
     });

     getMptIssuanceIdErrorMessage = computed(() => {
          const id = this.issuanceId();
          if (!id || id.trim().length === 0) {
               return '';
          }
          if (!this.validIssuanceId()) {
               return 'MPT Issuance ID must be a 48-character hexadecimal string (0-9, A-F).';
          }
          if (this.isCheckingMpt()) {
               return '';
          }
          // if (this.mptExists() === false) {
          //      return 'MPT Issuance ID not found. Please check the ID and try again.';
          // }
          return '';
     });

     isDestinationValid = computed(() => {
          const destination = this.mptStoreService.destination()?.trim();
          if (!destination) return false;
          if (!this.dropdownDestinationIsValid()) {
               return false;
          }
          if (!xrpl.isValidAddress(destination)) return false;
          const currentAddress = this.getCurrentAddress();
          if (currentAddress && destination === currentAddress) return false;
          return true;
     });

     isDestinationInvalid = computed(() => {
          const destination = this.mptStoreService.destination();
          if (!destination || destination.trim().length === 0) {
               return false;
          }
          return !this.isDestinationValid();
     });

     getDestinationErrorMessage = computed(() => {
          const destination = this.mptStoreService.destination()?.trim();
          if (!destination) return '';
          if (!this.dropdownDestinationIsValid()) {
               return 'Please enter a valid XRP address.';
          }
          if (!xrpl.isValidAddress(destination)) {
               return 'Please enter a valid XRP address.';
          }
          const currentAddress = this.getCurrentAddress();
          if (currentAddress && destination === currentAddress) {
               return 'You cannot send MPT to your own account.';
          }
          return '';
     });

     isActionValid = computed(() => {
          const action = this.mptStoreService.authAction();
          return action === 'authorize' || action === 'unauthorize';
     });

     isActionAppropriateForMpt = computed(() => {
          const mpt = this.getSelectedMptDetails();
          if (!mpt) return true;
          const requiresAuth = this.doesMptRequireAuth(mpt);
          const action = this.mptStoreService.authAction();
          if (requiresAuth && action === 'unauthorize') {
               return false;
          }
          return true;
     });

     getActionErrorMessage = computed(() => {
          const mpt = this.getSelectedMptDetails();
          if (!mpt) return '';
          const requiresAuth = this.doesMptRequireAuth(mpt);
          const action = this.mptStoreService.authAction();
          if (requiresAuth && action === 'unauthorize') {
               return 'This MPT requires issuer authorization. Unauthorize is not available from the issuer side.';
          }
          return '';
     });

     private getSelectedMptDetails() {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId) return null;
          const mpts = this.mptStoreService.existingMpts();
          return mpts.find(m => m.mpt_issuance_id === issuanceId);
     }

     private doesMptRequireAuth(mpt: any): boolean {
          return !!(mpt?.Flags & 0x00000004) || mpt?.flags?.includes?.('isRequireAuth');
     }

     async validateMptIssuanceId(issuanceId: string) {
          if (!this.isMptIssuanceIdValid()) {
               return false;
          }
          this.mptCheckPending.set(true);
          try {
               const exists = await this.checkMptExists(issuanceId);
               return exists;
          } catch (error) {
               return false;
          } finally {
               this.mptCheckPending.set(false);
          }
     }

     private getCurrentAddress(): string {
          return this.walletManagerService.getSelectedWallet()?.classicAddress || '';
     }

     private async checkMptExists(issuanceId: string): Promise<boolean> {
          const existingMpts = this.mptStoreService.existingMpts();
          return existingMpts.some(m => m.mpt_issuance_id === issuanceId);
     }

     canAuthorize = computed(() => {
          if (!this.isMptIssuanceIdValid()) return false;
          return true;
     });

     getAllValidationErrors = computed(() => {
          const errors: string[] = [];
          const mptIdError = this.getMptIssuanceIdErrorMessage();
          if (mptIdError) errors.push(`${mptIdError}`);
          const destinationError = this.getDestinationErrorMessage();
          if (destinationError) errors.push(`${destinationError}`);
          const actionError = this.getActionErrorMessage();
          if (actionError) errors.push(`${actionError}`);
          return errors;
     });

     setDestinationValidation(isValid: boolean) {
          this.dropdownDestinationIsValid.set(isValid);
     }
}
