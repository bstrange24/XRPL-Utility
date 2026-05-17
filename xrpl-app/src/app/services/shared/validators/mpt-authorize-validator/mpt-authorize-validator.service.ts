import { computed, inject, Injectable, signal } from '@angular/core';
import { MptStoreService } from '../../../mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../../mpt/mpt-util/mpt-util.service';
import * as xrpl from 'xrpl';
import { XrplService } from '../../../xrpl-services/xrpl.service';

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

     private mptCheckPending = signal(false);
     readonly mptExists = computed(() => this.mptExistsState().value);
     readonly isCheckingMpt = computed(() => this.mptExistsState().loading);
     private readonly issuanceId = this.mptStoreService.mptIssuanceId;

     constructor() {
          this.setupMptLookup();
     }

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
          const trigger = this.mptLookupTrigger;

          let lastValue: string | null = null;

          computed(async () => {
               const id = trigger();

               // ignore invalid or unchanged
               if (!id || id === lastValue) return;

               lastValue = id;

               this.mptExistsState.set({
                    loading: true,
                    value: null,
               });

               try {
                    const client = await this.xrplService.getClient();
                    const exists = await this.xrplService.doesMptExist(client, id);
                    console.log(`MPT ID ${id} existence: ${exists}`);

                    this.mptExistsState.set({
                         loading: false,
                         value: exists,
                    });
               } catch (e) {
                    this.mptExistsState.set({
                         loading: false,
                         value: false,
                    });
               }
          });
     }

     // MPT Issuance ID Validation
     isMptIssuanceIdValid = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();

          if (!issuanceId || issuanceId.trim().length === 0) {
               return false;
          }
          // return true;

          const normalized = issuanceId.trim().toUpperCase()
          return /^[A-F0-9]{48}$/.test(normalized);
          // const hexRegex = /^[0-9A-Fa-f]{64}$/;
          // return hexRegex.test(issuanceId.trim());
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
               return 'MPT Issuance ID is required.';
          }

          if (!this.validIssuanceId()) {
               return 'MPT Issuance ID must be a 48-character hexadecimal string (0-9, A-F).';
          }

          if (this.isCheckingMpt()) {
               return '';
          }

          if (this.mptExists() === false) {
               return 'MPT Issuance ID not found. Please check the ID and try again.';
          }

          return '';
     });

     // Destination Validation
     isDestinationValid = computed(() => {
          const destination = this.mptStoreService.destination();

          if (!destination || destination.trim().length === 0) {
               return false;
          }

          return xrpl.isValidAddress(destination);
     });

     isDestinationInvalid = computed(() => {
          const destination = this.mptStoreService.destination();

          if (!destination || destination.trim().length === 0) {
               return false;
          }

          return !this.isDestinationValid();
     });

     getDestinationErrorMessage = computed(() => {
          const destination = this.mptStoreService.destination();

          if (!destination || destination.trim().length === 0) {
               // return 'Destination address is required.';
               return '';
          }

          if (!this.isDestinationValid()) {
               return 'Please enter a valid XRP address (starts with "r").';
          }

          return '';
     });

     // Action Validation
     isActionValid = computed(() => {
          const action = this.mptStoreService.authAction();
          return action === 'authorize' || action === 'unauthorize';
     });

     // Check if action matches MPT requirements
     isActionAppropriateForMpt = computed(() => {
          const mpt = this.getSelectedMptDetails();
          if (!mpt) return true; // Can't check until MPT is selected

          const requiresAuth = this.doesMptRequireAuth(mpt);
          const action = this.mptStoreService.authAction();

          // If MPT requires auth, you can only authorize (not unauthorize from issuer side)
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

     // Helper to get selected MPT details
     private getSelectedMptDetails() {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId) return null;

          // This would come from your MPT data service
          const mpts = this.mptUtil.getExistingMpts({ result: { account_objects: [] } } as any, '');
          return mpts.find(m => m.mpt_issuance_id === issuanceId);
     }

     private doesMptRequireAuth(mpt: any): boolean {
          return !!(mpt?.Flags & 0x00000004) || mpt?.flags?.includes?.('isRequireAuth');
     }

     // Async validation - check if MPT ID exists
     async validateMptIssuanceId(issuanceId: string) {
          if (!this.isMptIssuanceIdValid()) {
               // this.mptExists.set(null);
               return false;
          }

          this.mptCheckPending.set(true);

          try {
               // Check if MPT exists in the system
               const exists = await this.checkMptExists(issuanceId);
               // this.mptExists.set(exists);
               return exists;
          } catch (error) {
               // this.mptExists.set(false);
               return false;
          } finally {
               this.mptCheckPending.set(false);
          }
     }

     private async checkMptExists(issuanceId: string): Promise<boolean> {
          // Implementation depends on your API/service
          // This could check against a known list or make an RPC call
          const existingMpts = this.mptUtil.getExistingMpts({ result: { account_objects: [] } } as any, '');
          return existingMpts.some(m => m.mpt_issuance_id === issuanceId);
     }

     // Overall Form Validation
     canAuthorize = computed(() => {
          if (!this.isMptIssuanceIdValid()) return false;
          if (!this.isDestinationValid()) return false;
          if (!this.isActionValid()) return false;
          if (!this.isActionAppropriateForMpt()) return false;

          return true;
     });

     // Get all validation error messages
     getAllValidationErrors = computed(() => {
          const errors: string[] = [];

          const mptIdError = this.getMptIssuanceIdErrorMessage();
          if (mptIdError) errors.push(`MPT Issuance ID: ${mptIdError}`);

          const destinationError = this.getDestinationErrorMessage();
          if (destinationError) errors.push(`Destination: ${destinationError}`);

          const actionError = this.getActionErrorMessage();
          if (actionError) errors.push(`Action: ${actionError}`);

          return errors;
     });
}
