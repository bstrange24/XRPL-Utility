import { computed, inject, Injectable } from '@angular/core';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';
import { sha256 } from 'js-sha256';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { SelectItem } from '../../../components/shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { EscrowStoreService } from '../escrow-store/escrow-store.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { EscrowDataForUI, EscrowDropdownItem, EscrowObject, EscrowValidationInput, EscrowValidationResult } from '../../../components/escrow/constants/time-escrow.types';
import { LogServiceService } from '../../shared/log-service/log-service.service';

@Injectable({
     providedIn: 'root',
})
export class EscrowUtilService {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactions = inject(XrplTransactionService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly logService = inject(LogServiceService);

     readonly escrowLength = computed(() => this.escrowStoreService.existingEscrow().length);
     readonly selectedEscrowSequenceNumber = computed(() => this.escrowStoreService.escrowSequenceNumber());

     readonly createEscrowButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create Escrow';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     readonly finishEscrowButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Finish Escrow';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     readonly cancelEscrowButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Cancel Escrow';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     readonly generateConditionButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Generate Condition';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     async getExistingEscrows(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string, isConditional: boolean = false, activeTab: string): Promise<EscrowDataForUI[]> {
          const filtered = (escrowObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'Escrow' && obj.Account === classicAddress && (isConditional ? !!obj.Condition : (obj.FinishAfter || obj.CancelAfter) && !obj.Condition));

          const mapped = await Promise.all(
               filtered.map(async (obj: any): Promise<EscrowDataForUI> => {
                    const sendMax = obj.Amount;
                    let amount = '0';
                    let currency = '';
                    let issuer = '';

                    if (typeof sendMax === 'string') {
                         if (activeTab === 'createEscrow') {
                              amount = String(sendMax);
                         } else {
                              amount = String(xrpl.dropsToXrp(sendMax));
                         }
                    } else if (sendMax?.value) {
                         amount = sendMax.value;
                         currency = this.utilsService.normalizeCurrencyCode(sendMax.currency);
                         issuer = sendMax.issuer;
                    }

                    let EscrowSequence: number | null = null;

                    if (obj.PreviousTxnID) {
                         try {
                              const sequenceTx = await this.xrplCache.getTxCached(obj.PreviousTxnID, 90);

                              EscrowSequence = sequenceTx?.result?.tx_json?.Sequence ?? sequenceTx?.result?.tx_json?.TicketSequence ?? null;
                         } catch (error: any) {
                              console.warn(`Failed to fetch escrow sequence for ${obj.PreviousTxnID}:`, error.message);
                         }
                    }

                    return {
                         Account: obj.Account,
                         Amount: `${amount} ${currency} ${issuer ? `issued by ${issuer}` : ''}`.trim(),
                         Destination: obj.Destination,
                         DestinationTag: obj.DestinationTag,
                         CancelAfter: obj.CancelAfter,
                         FinishAfter: obj.FinishAfter,
                         TxHash: obj.PreviousTxnID,
                         Sequence: EscrowSequence,
                    };
               })
          );

          mapped.sort((a, b) => a.Destination.localeCompare(b.Destination));
          this.logService.logObjects('existingEscrow', mapped);
          return mapped;
     }

     async getExpiredOrFulfilledEscrows(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string, activeTab: string) {
          const filteredEscrows = (escrowObjects.result.account_objects ?? []).filter(
               (obj: any) =>
                    obj.LedgerEntryType === 'Escrow' &&
                    (activeTab === 'cancelEscrow'
                         ? obj.Account === classicAddress // creator can cancel
                         : obj.Destination === classicAddress) // receiver can finish
          );

          const processedEscrows = await Promise.all(
               filteredEscrows.map(async (obj: any) => {
                    const sendMax = obj.Amount;
                    let amount = '0';
                    let currency = '';
                    let issuer = '';

                    if (typeof sendMax === 'string') {
                         if (activeTab === 'cancelEscrow') {
                              amount = String(sendMax);
                         } else {
                              amount = String(xrpl.dropsToXrp(sendMax));
                         }
                    } else if (sendMax?.value) {
                         // amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                         amount = sendMax.value;
                         currency = this.utilsService.normalizeCurrencyCode(sendMax.currency);
                         issuer = sendMax.issuer;
                    }

                    let EscrowSequence: number | null = null;
                    if (obj.PreviousTxnID) {
                         try {
                              const sequenceTx = await this.xrplCache.getTxCached(obj.PreviousTxnID, 90);

                              EscrowSequence = sequenceTx?.result?.tx_json?.Sequence ? sequenceTx?.result?.tx_json?.Sequence : sequenceTx?.result?.tx_json?.TicketSequence;
                         } catch (error: any) {
                              console.warn(`Failed to fetch escrow sequence for ${obj.PreviousTxnID}:`, error.message);
                         }
                    }

                    return {
                         Amount: `${amount} ${currency} ${issuer ? `issued by ${issuer}` : ''}`.trim(),
                         Sender: obj.Account,
                         Destination: obj.Destination,
                         EscrowSequence,
                         CancelAfter: obj.CancelAfter,
                         FinishAfter: obj.FinishAfter,
                    };
               })
          );

          const sortEscrows = processedEscrows.slice().sort((a, b) => a.Sender.localeCompare(b.Sender));
          this.logService.logObjects('expiredOrFulfilledEscrows', sortEscrows);
          return sortEscrows;
     }

     async loadAllEscrows(accountObjects: xrpl.AccountObjectsResponse): Promise<any[]> {
          const rawEscrows = (accountObjects.result.account_objects ?? [])
               .filter(obj => obj.LedgerEntryType === 'Escrow' && (obj.FinishAfter || obj.CancelAfter))
               .map(async (obj: any) => {
                    let EscrowSequence: number | null = null;

                    if (obj.PreviousTxnID) {
                         try {
                              const tx = await this.xrplCache.getTxCached(obj.PreviousTxnID, 90);
                              EscrowSequence = tx.result.tx_json.Sequence ? tx.result.tx_json.Sequence : tx.result.tx_json.TicketSequence;
                         } catch (error: any) {
                              console.error(`Failed to fetch sequence for escrow ${error.message}`);
                              console.warn('Failed to fetch sequence for escrow', obj.PreviousTxnID);
                         }
                    }

                    return {
                         Sender: obj.Account,
                         Destination: obj.Destination,
                         Amount: obj.Amount,
                         EscrowSequence,
                         CancelAfter: obj.CancelAfter,
                         FinishAfter: obj.FinishAfter,
                    };
               });

          return Promise.all(rawEscrows);
     }

     escrowItems(escrows: any[], address: string, isCancel: boolean): EscrowDropdownItem[] {
          return escrows
               .filter(e => (isCancel ? e.Sender === address : e.Destination === address))
               .map(e => {
                    const amt = this.formatEscrowAmount(e.Amount);

                    return {
                         id: e.EscrowSequence?.toString() ?? 'unknown',
                         display: `${amt} ${isCancel ? '→' : '←'} ${isCancel ? e.Destination : e.Sender}`,
                         secondary: `Seq: ${e.EscrowSequence ?? '?'} • ${isCancel ? 'You created' : 'Sent to you'}`,
                    };
               });
     }

     selectedEscrowItem(escrowItems: EscrowDropdownItem[], sequenceNumber: string | number | null | undefined): EscrowDropdownItem | null {
          if (!sequenceNumber) return null;

          const seqStr = sequenceNumber.toString();
          return escrowItems.find(i => i.id === seqStr) ?? null;
     }

     async findEscrowAndOwner(escrowObjects: xrpl.AccountObjectsResponse, escrowSequenceNumberField: string) {
          let escrow: EscrowObject | undefined = undefined;
          let escrowOwner = '';
          for (const [, obj] of escrowObjects.result.account_objects.entries()) {
               if (obj.PreviousTxnID) {
                    const sequenceTx = await this.xrplCache.getTxCached(obj.PreviousTxnID, 90);
                    if (sequenceTx.result.tx_json.Sequence === Number(escrowSequenceNumberField) || (sequenceTx.result.tx_json.TicketSequence != undefined && sequenceTx.result.tx_json.TicketSequence === Number(escrowSequenceNumberField))) {
                         escrow = obj as unknown as EscrowObject;
                         escrowOwner = escrow.Account;
                         break;
                    }
               }
          }
          return { escrow, escrowOwner };
     }

     checkEscrowStatus(
          escrow: { FinishAfter?: number; CancelAfter?: number; Condition?: string; owner: string; escrowType: string },
          currentRippleTime: number,
          callerAddress: string,
          fulfillment?: string
     ): {
          canFinish: boolean;
          canCancel: boolean;
          reasonFinish: string;
          reasonCancel: string;
     } {
          const cancelResult = this.validateCancel(escrow, currentRippleTime, callerAddress);

          const finishResult = this.validateFinish(escrow, currentRippleTime, fulfillment);

          return {
               canFinish: finishResult.canFinish,
               canCancel: cancelResult.canCancel,
               reasonFinish: finishResult.reason,
               reasonCancel: cancelResult.reason,
          };
     }

     private validateCancel(escrow: { CancelAfter?: number; owner: string; escrowType: string }, ledgerRippleTime: number, callerAddress: string): { canCancel: boolean; reason: string } {
          const { CancelAfter, owner, escrowType } = escrow;

          if (escrowType !== 'finish' && !CancelAfter) {
               return { canCancel: false, reason: 'No CancelAfter time defined.' };
          }

          if (CancelAfter !== undefined && ledgerRippleTime < CancelAfter) {
               return {
                    canCancel: false,
                    reason: `Escrow can only be canceled after ${this.xrplDateService.rippleToISO(CancelAfter)}, current time is ${this.xrplDateService.rippleToISO(ledgerRippleTime)}.`,
               };
          }

          if (callerAddress !== owner) {
               return { canCancel: false, reason: `Only the escrow owner (${owner}) can cancel this escrow.` };
          }

          return { canCancel: true, reason: '' };
     }

     private validateFinish(escrow: { FinishAfter?: number; CancelAfter?: number; Condition?: string }, ledgerRippleTime: number, fulfillment?: string): { canFinish: boolean; reason: string } {
          const { FinishAfter, CancelAfter, Condition } = escrow;

          // Expired escrows cannot be finished
          if (CancelAfter !== undefined && this.xrplDateService.isExpired(CancelAfter, ledgerRippleTime)) {
               return { canFinish: false, reason: 'Escrow has expired and can no longer be finished.' };
          }

          // Must have either FinishAfter or Condition
          if (FinishAfter === undefined && !Condition) {
               return { canFinish: false, reason: 'No FinishAfter time or Condition defined.' };
          }

          // Time requirement
          if (FinishAfter !== undefined && ledgerRippleTime < FinishAfter) {
               return {
                    canFinish: false,
                    reason: `Escrow can only be finished after ${this.xrplDateService.rippleToISO(FinishAfter)}, current time is ${this.xrplDateService.rippleToISO(ledgerRippleTime)}.`,
               };
          }

          // Condition validation
          if (Condition && !fulfillment) {
               return { canFinish: false, reason: 'A fulfillment is required for condition-based escrow.' };
          }

          if (!Condition && fulfillment) {
               return { canFinish: false, reason: 'No condition is set, so fulfillment is not applicable.' };
          }

          return { canFinish: true, reason: '' };
     }

     validateEscrowCreate(input: EscrowValidationInput): EscrowValidationResult {
          const { finishAfter, cancelAfter, condition, currentRippleTime } = input;
          const errors: string[] = [];

          const hasFinish = finishAfter !== null && finishAfter !== undefined;
          const hasCancel = cancelAfter !== null && cancelAfter !== undefined;
          const hasCondition = condition !== null && condition !== undefined;

          // Rule 1: Must include FinishAfter OR Condition
          if (!hasFinish && !hasCondition) {
               errors.push('Escrow must include either FinishAfter or Condition.');
          }

          // Rule 2: CancelAfter cannot exist alone
          if (hasCancel && !hasFinish && !hasCondition) {
               errors.push('CancelAfter cannot exist without FinishAfter or Condition.');
          }

          // Rule 3: FinishAfter must be < CancelAfter
          if (hasFinish && hasCancel && finishAfter >= cancelAfter) {
               errors.push('FinishAfter must be earlier than CancelAfter.');
          }

          // Rule 4: Condition format validation
          if (hasCondition) {
               if (condition === '') {
                    errors.push('Condition must be a 64-character uppercase hex SHA256 hash.');
               }
          }

          if (hasFinish && finishAfter <= currentRippleTime!) {
               errors.push('FinishAfter must be in the future.');
          }

          return {
               valid: errors.length === 0,
               errors,
          };
     }

     validateTimeEscrowUI(input: { finishAfter: number | null; cancelAfter: number | null }): string[] {
          const errors: string[] = [];

          if (!input.finishAfter) {
               errors.push('FinishAfter is required for time-based escrows.');
          }

          return errors;
     }

     validateConditionalEscrowUI(input: { finishAfter: number | null; cancelAfter: number | null; condition: string | null }): string {
          if (!input.condition) {
               return 'Condition is required for conditional escrows.';
          }
          return '';
     }

     formatEscrowAmount(amount: any): string {
          if (typeof amount === 'string') return `${xrpl.dropsToXrp(amount.trim())} XRP`;

          if (amount?.mpt_issuance_id) return `${amount.value} MPT`;

          return `${amount.value} ${this.utilsService.normalizeCurrencyCode(amount.currency)}`;
     }

     isEscrowExpired(cancelAfter?: number, finishAfter?: number, activeTab?: string): boolean {
          if (!cancelAfter) return false; // No cancel time → never expired for finish

          const rippleEpoch = new Date('2000-01-01T00:00:00Z').getTime() / 1000;
          const now = Math.floor(Date.now() / 1000);
          const cancelTime = cancelAfter + rippleEpoch;

          // For finish tab: expired if past cancel time (cannot finish anymore)
          if (activeTab === 'finishEscrow') {
               return now > cancelTime;
          }

          // For cancel tab: expired if past cancel time (can cancel, but we still show badge)
          return now > cancelTime;
     }

     onEscrowSelected(item: SelectItem | null) {
          if (item) {
               const id = item?.id || '';
               this.escrowStoreService.setField('escrowSequenceNumber', id);

               const parts = item.display?.split(' ') || [];
               this.escrowStoreService.setField('escrowOwner', parts[3] || '');
               this.currencyStoreService.setField('currencyCode', this.utilsService.encodeIfNeeded(parts[1]) || '');
               this.currencyStoreService.setField('currencyIssuer', item.issuer || '');
          }
     }

     onEscrowSelectedInUi(item: any | null) {
          if (item) {
               const id = item?.id || '';
               this.escrowStoreService.setField('escrowSequenceNumber', id);
               if (item.amount.split(' ').length > 2) {
                    this.escrowStoreService.setField('amount', item?.amount?.split(' ')[0] || '');
                    this.currencyStoreService.setField('currencyCode', this.utilsService.encodeIfNeeded(item?.amount?.split(' ')[1]) || '');
                    this.currencyStoreService.setField('currencyIssuer', item.amount.split(' ')[3].replaceAll(')', '') || '');
               } else {
                    this.escrowStoreService.setField('amount', item?.amount?.split(' ')[0] || '');
               }
               this.escrowStoreService.setField('escrowOwner', item.sender || '');
          }
     }

     validateCondition(condition: string | undefined | null): string | null {
          // Ensure condition is a valid hex string (uppercase, 0-9, A-F)
          const hexRegex = /^[0-9A-F]+$/;
          if (!hexRegex.test(condition!)) {
               return 'Condition must be a valid uppercase hex string (0-9, A-F)';
          }

          // Check length for SHA-256 (32 bytes = 64 hex characters)
          if (condition!.length !== 64) {
               return 'Condition must be 64 hex characters (32 bytes) for SHA-256';
          }

          return null;
     }

     validateFulfillment(fulfillment: string | undefined | null, condition: string): string | null {
          const hexRegex = /^[0-9A-F]+$/;
          if (!hexRegex.test(fulfillment!)) {
               return 'Fulfillment must be a valid uppercase hex string (0-9, A-F)';
          }
          try {
               // Convert hex to binary and compute SHA-256 hash
               const fulfillmentBytes = Buffer.from(fulfillment!, 'hex'); // Buffer polyfill or use Uint8Array
               const computedHash = sha256(fulfillmentBytes).toUpperCase();
               if (computedHash !== condition) {
                    return 'Fulfillment does not match the condition';
               }
          } catch (error: any) {
               console.error(`Error validateFulfillment ${error.message}`);
               return 'Invalid fulfillment: unable to compute SHA-256 hash';
          }
          return null;
     }
}
