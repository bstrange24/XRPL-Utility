import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { AccountFlags, MptDisplayItem, MPToken, MPTokenHolder, MPTokenIssuance } from '../../../models/interface-items.model';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';
import { MPTokenIssuanceCreate, MPTokenIssuanceCreateFlags } from 'xrpl';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { MptStoreService } from '../mpt-store/mpt-store.service';
import { MptFlagKey } from '../../../components/mpt/constants/mpt.types';
import { LogServiceService } from '../../shared/log-service/log-service.service';

@Injectable({
     providedIn: 'root',
})
export class MptUtilService extends PerformanceBaseComponent {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly logService = inject(LogServiceService);

     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');

     private readonly flagValues = {
          canLock: 0x00000002,
          isRequireAuth: 0x00000004,
          canEscrow: 0x00000008,
          canTrade: 0x00000010,
          canTransfer: 0x00000020,
          canClawback: 0x00000040,
          isAuthorized: 0x00000002,
     };
     flags: AccountFlags = {
          canLock: false,
          isRequireAuth: false,
          canEscrow: false,
          canTrade: false,
          canClawback: false,
          canTransfer: false,
     };

     readonly selectedMptIssuanceId = computed(() => this.mptStoreService.mptIssuanceId());

     readonly createMptButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create MPT';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     readonly authorizeButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') {
               return this.mptStoreService.authAction() === 'authorize' ? 'Authorize MPT' : 'Unauthorize MPT';
          }
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     readonly sendMptButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Send MPT';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     readonly lockMptButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') {
               return this.mptStoreService.lockAction() === 'lock' ? 'Lock MPT' : 'Unlock MPT';
          }
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     readonly clawbackMptButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Clawback MPT';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     readonly destroyMptButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Destroy MPT';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     getMpts(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const issuances = new Map<string, any>();
          const holdings: any[] = [];

          // 1. Collect all issuances and holdings
          (accountObjects.result.account_objects ?? []).forEach(obj => {
               const o = obj as any;
               if (o.LedgerEntryType === 'MPTokenIssuance') {
                    issuances.set(o.mpt_issuance_id, o);
               } else if (o.LedgerEntryType === 'MPToken' && o.Account === classicAddress) {
                    holdings.push(o);
               }
          });

          const result: any[] = [];

          // 2. Add holdings (you hold tokens)
          for (const holding of holdings) {
               const issuance = issuances.get(holding.MPTokenIssuanceID) || {};
               result.push({
                    LedgerEntryType: 'MPToken',
                    id: holding.index,
                    mpt_issuance_id: holding.MPTokenIssuanceID,
                    MPTAmount: holding.MPTAmount || '0',
                    OutstandingAmount: issuance.OutstandingAmount || '0',
                    MaximumAmount: issuance.MaximumAmount || 'Unlimited',
                    TransferFee: issuance.TransferFee || '0',
                    MPTokenMetadata: issuance.MPTokenMetadata || 'N/A',
                    Flags: holding.Flags || 0,
                    AssetScale: issuance.AssetScale || 'N/A',
                    Issuer: issuance.Account || 'Unknown',
                    isHolder: true,
                    amount: holding.MPTAmount || '0',
               });
          }

          // 3. Add issuances that you own (even if you hold 0)
          for (const [id, issuance] of issuances.entries()) {
               const alreadyAddedAsHolder = result.some(r => r.mpt_issuance_id === id);
               if (!alreadyAddedAsHolder) {
                    result.push({
                         LedgerEntryType: 'MPTokenIssuance',
                         id: issuance.index,
                         mpt_issuance_id: issuance.mpt_issuance_id,
                         MPTAmount: '0',
                         OutstandingAmount: issuance.OutstandingAmount || '0',
                         MaximumAmount: issuance.MaximumAmount || 'Unlimited',
                         TransferFee: issuance.TransferFee || '0',
                         MPTokenMetadata: issuance.MPTokenMetadata || 'N/A',
                         Flags: issuance.Flags || 0,
                         AssetScale: issuance.AssetScale || 'N/A',
                         Issuer: issuance.Account || 'Unknown',
                         isHolder: false,
                         amount: issuance.OutstandingAmount || '0',
                    });
               }
          }

          this.logService.logObjects('existingMpts (holders + issuers)', result);
          return result;
     }

     getExistingMpts(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (escrowObjects.result.account_objects ?? [])
               .filter((obj: any) => (obj.LedgerEntryType === 'MPToken' || obj.LedgerEntryType === 'MPTokenIssuance') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
               .map((obj: any): MPToken => {
                    return {
                         LedgerEntryType: obj.LedgerEntryType,
                         MPTAmount: obj.MaximumAmount ? obj.MaximumAmount : obj.MPTAmount,
                         mpt_issuance_id: obj.mpt_issuance_id ? obj.mpt_issuance_id : obj.MPTokenIssuanceID,
                    };
               })
               .sort((a, b) => {
                    const ai = a.mpt_issuance_id ?? '';
                    const bi = b.mpt_issuance_id ?? '';
                    return ai.localeCompare(bi);
               });

          this.logService.logObjects('existingMpts', mapped);
          return mapped;
     }

     computeMptItems(existingMpts: any[]): MptDisplayItem[] {
          return existingMpts.map(m => {
               const isHolder = m.LedgerEntryType === 'MPToken';
               const amount = isHolder ? (m.MPTAmount ?? '0') : (m.OutstandingAmount ?? '0');

               const rawId = m.mpt_issuance_id ?? m.id ?? '';

               return {
                    id: rawId,
                    display: `MPT • ${amount} ${isHolder ? 'held' : 'issued'}`,
                    secondary: rawId.length > 25 ? rawId.slice(0, 15) + '...' + rawId.slice(-10) : rawId,
               };
          });
     }

     mptDropDownItems(existingMpts: any[]) {
          computed(() => {
               const t = existingMpts
                    // .filter(m => m.mpt_issuance_id) // Only show entries with a valid issuance ID
                    .map(m => {
                         const type = m.LedgerEntryType === 'MPToken' ? 'MPToken' : 'MPTokenIssuance';
                         let isHolder = false;
                         if (type === 'MPToken') {
                              isHolder = true;
                         }
                         const amount = isHolder ? m.MPTAmount || '0' : m.OutstandingAmount || '0';

                         const displayAmount = amount === '0' ? '0' : amount;

                         return {
                              id: m.mpt_issuance_id ? m.mpt_issuance_id : m.id,
                              // display: `MPT • ${displayAmount} ${isHolder ? 'held' : 'issued'} • ${isHolder ? `${m.MaximumAmount} outstanding` : 'issued'}`,
                              display: `MPT • ${displayAmount} ${isHolder ? 'held' : 'issued'}`,
                              secondary: m.mpt_issuance_id ? m.mpt_issuance_id.slice(0, 15) + '...' + m.mpt_issuance_id.slice(-10) : m.id.slice(0, 12) + '...' + m.id.slice(-10),
                              isCurrentAccount: false,
                              isCurrentCode: false,
                              isCurrentToken: false,
                         };
                    });
               return t;
          });
     }

     computeSelectedMptItem(items: MptDisplayItem[], issuanceId: string | null | undefined): MptDisplayItem | null {
          if (!issuanceId) return null;

          return items.find(i => i.id === issuanceId) ?? null;
     }

     selectedMptItem(mptIssuanceIdField: any, mptItems: any) {
          return computed(() => {
               const id = mptIssuanceIdField;
               if (!id) return null;
               return mptItems().find((i: { id: any }) => i.id === id) || null;
          });
     }

     getMetadataByteLength(metaDataField: any) {
          return computed(() => {
               const meta = metaDataField().trim();
               if (!meta) return 0;

               try {
                    // Convert to hex (same as xrpl.convertStringToHex does)
                    const hex = xrpl.convertStringToHex(meta);
                    return hex.length / 2; // hex string: 2 chars = 1 byte
               } catch {
                    return 0;
               }
          });
     }

     metadataIsValid(metadataByteLength: any) {
          return computed(() => {
               return metadataByteLength() <= 1024;
          });
     }

     getAllMptTokens(accountObjects: xrpl.AccountObjectsResponse) {
          const mptokens = accountObjects.result.account_objects.filter((o: any) => o.LedgerEntryType === 'MPTToken' || o.LedgerEntryType === 'MPTokenIssuance' || o.LedgerEntryType === 'MPToken');
          const accountIssuerToken = mptokens.some((obj: any) => obj.mpt_issuance_id === this.mptStoreService.mptIssuanceId());
          return accountIssuerToken;
     }

     getMPTokenIssuance(accountObjects: xrpl.AccountObjectsResponse) {
          const mptokens = accountObjects.result.account_objects.filter((o: any) => o.LedgerEntryType === 'MPTokenIssuance');
          const accountIssuerToken = mptokens.some((obj: any) => obj.mpt_issuance_id === this.mptStoreService.mptIssuanceId());
          return accountIssuerToken;
     }

     getMptToken(accountObjects: xrpl.AccountObjectsResponse) {
          const mptokens = accountObjects.result.account_objects.filter((o: any) => o.LedgerEntryType === 'MPToken');
          const accountIssuerToken = mptokens.some((obj: any) => obj.mpt_issuance_id === this.mptStoreService.mptIssuanceId());
          return accountIssuerToken;
     }

     isDestinationAuthorizedForMpt(issuanceObjects: any[], holderObjects: any[], issuanceId: string): boolean {
          console.log('=== MPT AUTH DEBUG START ==='); // keep for now

          const issuance = issuanceObjects.find((o: any) => o.LedgerEntryType === 'MPTokenIssuance' && o.mpt_issuance_id === issuanceId);

          if (!issuance) {
               console.warn('Issuance not found in issuer account objects');
               return false; // safety
          }

          const requiresAuth = this.issuanceRequiresAuth(issuance.Flags);
          if (!requiresAuth) {
               console.log('=== MPT AUTH DEBUG END (NO AUTH REQUIRED) ===');
               return true; // ← this is the key line
          }

          const holder = holderObjects.find((o: any) => o.LedgerEntryType === 'MPToken' && o.MPTokenIssuanceID === issuanceId);

          const isAuth = holder ? this.holderIsAuthorized(holder.Flags) : false;

          console.log('=== MPT AUTH DEBUG END ===');
          return isAuth;
     }

     issuanceRequiresAuth(flags: number): boolean {
          return (flags & this.flagValues.isRequireAuth) !== 0;
     }

     holderIsAuthorized(flags: number): boolean {
          return (flags & this.flagValues.isAuthorized) !== 0;
     }

     toggleFlag(flag: MptFlagKey): void {
          this.flags[flag] = !this.flags[flag];
          this.updateFlagTotal();
     }

     updateFlagTotal() {
          let sum = 0;
          if (this.flags.canLock) sum |= this.flagValues.canLock;
          if (this.flags.isRequireAuth) sum |= this.flagValues.isRequireAuth;
          if (this.flags.canEscrow) sum |= this.flagValues.canEscrow;
          if (this.flags.canTrade) sum |= this.flagValues.canTrade;
          if (this.flags.canTransfer) sum |= this.flagValues.canTransfer;
          if (this.flags.canClawback) sum |= this.flagValues.canClawback;

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     resetFlags() {
          this.flags = {
               canLock: false,
               isRequireAuth: false,
               canEscrow: false,
               canTrade: false,
               canTransfer: false,
               canClawback: false,
          };
          this.updateFlagTotal();
     }

     getFlagsValue(flags: AccountFlags): number {
          let v_flags = 0;
          if (flags.canLock) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanLock; // 0x00000002
          }
          if (flags.isRequireAuth) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTRequireAuth; // 0x00000004
          }
          if (flags.canEscrow) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanEscrow; // 0x00000008
          }
          if (flags.canTrade) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanTrade; // 0x00000010
          }
          if (flags.canTransfer) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanTransfer; // 0x00000020
          }
          if (flags.canClawback) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanClawback; // 0x00000040;
          }
          return v_flags;
     }

     decodeMPTFlags(flags: number) {
          const MPT_FLAGS = {
               tfMPTCanLock: 0x00000002,
               tfMPTRequireAuth: 0x00000004,
               tfMPTCanEscrow: 0x00000008,
               tfMPTCanTrade: 0x00000010,
               tfMPTCanTransfer: 0x00000020,
               tfMPTCanClawback: 0x00000040,
          };

          const activeFlags = [];
          for (const [name, value] of Object.entries(MPT_FLAGS)) {
               if ((flags & value) !== 0) {
                    activeFlags.push(name);
               }
          }
          return activeFlags;
     }

     decodeMptFlagsForUi(flags: number): string {
          const flagDefinitions = [
               { value: 2, name: 'canLock' },
               { value: 4, name: 'isRequireAuth' },
               { value: 8, name: 'canEscrow' },
               { value: 10, name: 'canTrade' },
               { value: 16, name: 'canTransfer' },
               { value: 40, name: 'canClawback' },
          ];

          const activeFlags: string[] = [];

          for (const flag of flagDefinitions) {
               if ((flags & flag.value) === flag.value) {
                    activeFlags.push(flag.name);
               }
          }

          return activeFlags.length > 0 ? activeFlags.join(', ') : 'None';
     }

     // Inside MptUtilService class
     formatMptAmount(rawAmount: string | number, assetScale: number | string | undefined): string {
          if (!rawAmount || rawAmount === '0') return '0';

          const amountStr = rawAmount.toString();
          const scale = typeof assetScale === 'number' ? assetScale : parseInt(assetScale || '0', 10);

          if (scale === 0 || Number.isNaN(scale)) return amountStr;

          // Pad with zeros if needed
          let padded = amountStr.padStart(scale + 1, '0');

          const integerPart = padded.slice(0, -scale) || '0';
          const decimalPart = padded.slice(-scale);

          return decimalPart === '0'.repeat(scale) ? integerPart : `${integerPart}.${decimalPart}`;
     }
}
