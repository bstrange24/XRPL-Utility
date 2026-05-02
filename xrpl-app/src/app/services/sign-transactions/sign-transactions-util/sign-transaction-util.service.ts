import { computed, inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { SignTransationStoreService } from '../sign-transaction-store/sign-transation-store.service';

type TxBuilder = (ctx: { wallet: xrpl.Wallet; accountInfo: any; currentLedger: number; fee: any; selectedTransaction?: string }) => any;

interface SignTransactionOptions {
     client: xrpl.Client;
     wallet: xrpl.Wallet;
     accountInfo: xrpl.AccountInfoResponse;
     fee: any;
     currentLedger: any;
     selectedTransaction?:
          | 'sendXrp'
          | 'accountFlagSet'
          | 'accountFlagClear'
          | 'setTrustline'
          | 'removeTrustline'
          | 'issueCurrency'
          | 'clawback'
          | 'createTimeEscrow'
          | 'createTimeEscrowToken'
          | 'finishTimeEscrow'
          | 'finishTimeEscrowToken'
          | 'createConditionEscrow'
          | 'createConditionEscrowToken'
          | 'finishConditionEscrow'
          | 'finishConditionEscrowToken'
          | 'cancelEscrow'
          | 'createCheck'
          | 'createCheckToken'
          | 'cashCheck'
          | 'cashCheckToken'
          | 'cancelCheck'
          | 'createPaymentChannel'
          | 'fundPaymentChannel'
          | 'claimPaymentChannel'
          | 'closePaymentChannel'
          | 'createMPT'
          | 'authorizeMPT'
          | 'unauthorizeMPT'
          | 'sendMPT'
          | 'lockMPT'
          | 'unlockMPT'
          | 'destroyMPT';
     isTicketEnabled?: boolean;
     isMemoEnable?: boolean;
     ticketSequence?: string;
}

@Injectable({
     providedIn: 'root',
})
export class SignTransactionUtilService {
     public readonly signTransationStoreService = inject(SignTransationStoreService);
     public readonly xrplService = inject(XrplService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);

     constructor() {}

     get isAnyButtonLoading(): boolean {
          return Object.values(this.signTransationStoreService.buttonLoading()).includes(true);
     }

     // Transaction Type Dropdown Items
     transactionTypeItems = computed(() => {
          const current = this.signTransationStoreService.selectedTransaction();

          return [
               // Basic
               // { id: 'batch', display: 'Batch', group: 'Basic' },
               { id: 'sendXrp', display: 'Send XRP', group: 'Basic' },

               // Trustline
               { id: 'setTrustline', display: 'Set Trustline', group: 'Trustline' },
               { id: 'removeTrustline', display: 'Remove Trustline', group: 'Trustline' },
               { id: 'issueCurrency', display: 'Issue Currency', group: 'Trustline' },
               { id: 'clawback', display: 'Clawback Currency', group: 'Trustline' },

               // Account Flags
               { id: 'accountFlagSet', display: 'Account Flag Set', group: 'Account Flags' },
               { id: 'accountFlagClear', display: 'Account Flag Clear', group: 'Account Flags' },

               // Escrow
               { id: 'createTimeEscrow', display: 'Create Time Escrow', group: 'Escrow' },
               { id: 'finishTimeEscrow', display: 'Finish Time Escrow', group: 'Escrow' },
               { id: 'createConditionEscrow', display: 'Create Condition Escrow', group: 'Escrow' },
               { id: 'finishConditionEscrow', display: 'Finish Condition Escrow', group: 'Escrow' },
               { id: 'cancelEscrow', display: 'Cancel Escrow', group: 'Escrow' },

               // Token Escrow
               { id: 'createTimeEscrowToken', display: 'Create Token Time Escrow', group: 'Token Escrow' },
               { id: 'finishTimeEscrowToken', display: 'Finish Token Time Escrow', group: 'Token Escrow' },
               { id: 'createConditionEscrowToken', display: 'Create Token Condition Escrow', group: 'Token Escrow' },
               { id: 'finishConditionEscrowToken', display: 'Finish Token Condition Escrow', group: 'Token Escrow' },

               // Check
               { id: 'createCheck', display: 'Check Create', group: 'Check' },
               { id: 'cashCheck', display: 'Check Cash', group: 'Check' },
               { id: 'cancelCheck', display: 'Check Cancel', group: 'Check' },

               // Token Check
               { id: 'createCheckToken', display: 'Check Token Create', group: 'Token Check' },
               { id: 'cashCheckToken', display: 'Check Token Cash', group: 'Token Check' },

               // Payment Channel
               { id: 'createPaymentChannel', display: 'Create Payment Channel', group: 'Payment Channel' },
               { id: 'fundPaymentChannel', display: 'Fund Payment Channel', group: 'Payment Channel' },
               { id: 'claimPaymentChannel', display: 'Claim Payment Channel', group: 'Payment Channel' },
               { id: 'closePaymentChannel', display: 'Close Payment Channel', group: 'Payment Channel' },

               // MPT
               { id: 'createMPT', display: 'MPT Create', group: 'MPT' },
               { id: 'authorizeMPT', display: 'Authorize MPT', group: 'MPT' },
               { id: 'unauthorizeMPT', display: 'Unauthorize MPT', group: 'MPT' },
               { id: 'sendMPT', display: 'Send MPT', group: 'MPT' },
               { id: 'lockMPT', display: 'Lock MPT', group: 'MPT' },
               { id: 'unlockMPT', display: 'Unlock MPT', group: 'MPT' },
               { id: 'destroyMPT', display: 'Destroy MPT', group: 'MPT' },
          ].map(item => ({
               id: item.id,
               display: item.display,
               group: item.group,
               // secondary: item.group,
               secondary: undefined,
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: item.id === current,
               showSecondaryInInput: true,
          }));
     });

     readonly getTransactionJsonButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle' || !this.signTransationStoreService.buttonLoading().getJson) return 'Get Transaction JSON';
          if (step === 'waiting_validation') return 'Get Transaction JSON';
          return this.txUiService.stepMessage();
     });

     readonly signTransactionButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle' || !this.signTransationStoreService.buttonLoading().signed) return 'Signed Transaction';
          if (step === 'waiting_validation') return 'Signed Transaction';
          return this.txUiService.stepMessage();
     });

     readonly submitTransactionButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle' || !this.signTransationStoreService.buttonLoading().submit) return 'Submit Transaction';
          if (step === 'waiting_validation') return 'Submit Transaction';
          return this.txUiService.stepMessage();
     });

     readonly signMultiSignButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle' || !this.signTransationStoreService.buttonLoading().multiSign) return 'Sign for Multi-Sign';
          if (step === 'waiting_validation') return 'Sign for Multi-Sign';
          return this.txUiService.stepMessage();
     });

     readonly signWithRegularKeyButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle' || !this.signTransationStoreService.buttonLoading().regularKeySign) return 'Sign with Regular Key';
          if (step === 'waiting_validation') return 'Sign with Regular Key';
          return this.txUiService.stepMessage();
     });

     onTxJsonChange(value: string) {
          this.signTransationStoreService.setField('txJson', value);

          try {
               JSON.parse(value);
               this.signTransationStoreService.setField('jsonEditorError', '');
          } catch (error: any) {
               console.error(`Error onTxJsonChange JSON: ${error.message}`);
               this.signTransationStoreService.setField('jsonEditorError', 'Invalid JSON');
          }
     }

     setTxJson(json: string) {
          this.signTransationStoreService.setField('txJson', json);
     }

     setSigned(blob: string) {
          this.signTransationStoreService.setField('outputField', blob);
     }

     async createBatchpRequestText(options: SignTransactionOptions): Promise<string> {
          const { wallet, accountInfo } = options;

          let batchRequest: any = {
               TransactionType: 'Batch',
               Account: wallet.classicAddress,
               Flags: 65536,
               RawTransactions: [
                    {
                         RawTransaction: {
                              TransactionType: 'Payment',
                              Flags: 1073741824,
                              Account: wallet.classicAddress,
                              Destination: 'rskBKJYGVpTDNfTWV9qmM8smPJnNXEkSYH',
                              Amount: '0.00001',
                              Sequence: accountInfo.result.account_data.Sequence + 1,
                              Fee: '0',
                              SigningPubKey: '',
                         },
                    },
                    {
                         RawTransaction: {
                              TransactionType: 'Payment',
                              Flags: 1073741824,
                              Account: wallet.classicAddress,
                              Destination: 'r9KUJAJUbLpVeVd8zs78tbHnNroW38vbAq',
                              Amount: '0.00001',
                              Sequence: accountInfo.result.account_data.Sequence + 2,
                              Fee: '0',
                              SigningPubKey: '',
                         },
                    },
               ],
               Sequence: accountInfo.result.account_data.Sequence,
               Fee: '40',
               SigningPubKey: '',
               TxnSignature: '',
               Memos: [
                    {
                         Memo: {
                              MemoData: '',
                              MemoType: 'text/plain',
                         },
                    },
                    {
                         Memo: {
                              MemoData: '',
                              MemoType: 'text/plain',
                         },
                    },
               ],
          };

          const txString = JSON.stringify(batchRequest, null, 2);
          return txString;
     }

     async buildTransactionText(options: SignTransactionOptions): Promise<string> {
          const { client, wallet, accountInfo, currentLedger, fee, selectedTransaction } = options;

          if (!selectedTransaction || !this.builders[selectedTransaction]) {
               throw new Error(`Unsupported transaction type: ${selectedTransaction}`);
          }

          const tx = this.builders[selectedTransaction]({
               wallet,
               accountInfo,
               currentLedger,
               fee,
               selectedTransaction,
          });

          await this.applyTicket(tx, client, wallet, options.isTicketEnabled, options.ticketSequence);

          return JSON.stringify(tx, null, 2);
     }

     private readonly builders: Record<string, TxBuilder> = {
          sendXrp: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: 'rKCvwruCxFM3sdqRAWKFiWR5WctQP182jr',
               Amount: xrpl.xrpToDrops('0.000001'),
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          setTrustline: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'TrustSet',
               Account: wallet.classicAddress,
               LimitAmount: { currency: 'CTZ', issuer: 'rBRQ1Dt3wg9b4D1vsqL2DP4VgLgXaK2vHV', value: '10000000000' },
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          removeTrustline: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'TrustSet',
               Account: wallet.classicAddress,
               LimitAmount: { currency: 'CTZ', issuer: 'rBRQ1Dt3wg9b4D1vsqL2DP4VgLgXaK2vHV', value: '0' },
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          issueCurrency: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: 'rHp1RqKdRSG5cJY5ikZadRA91yE35wTJFf',
               Amount: {
                    currency: 'USD',
                    issuer: 'rBRQ1Dt3wg9b4D1vsqL2DP4VgLgXaK2vHV',
                    value: '10',
               },
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          clawback: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'Clawback',
               Account: wallet.classicAddress,
               Amount: {
                    currency: 'CTZ',
                    issuer: 'rLBknJdCzFGV15Vyyewd3U8jQmDR3abRJ4',
                    value: '1',
               },
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          accountFlagSet: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'AccountSet',
               Account: wallet.classicAddress,
               SetFlag: '0',
               Fee: fee,
               Flags: 0,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          accountFlagClear: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'AccountSet',
               Account: wallet.classicAddress,
               ClearFlag: '0',
               Fee: fee,
               Flags: 0,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          createTimeEscrow: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'EscrowCreate',
               Account: wallet.classicAddress,
               Destination: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               Amount: '0',
               Fee: fee,
               FinishAfter: 815102293,
               CancelAfter: 815102343,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          finishTimeEscrow: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'EscrowFinish',
               Account: wallet.classicAddress,
               Owner: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               Fee: fee,
               OfferSequence: '0',
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          createTimeEscrowToken: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'EscrowCreate',
               Account: wallet.classicAddress,
               Destination: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               Amount: {
                    currency: 'CTZ',
                    issuer: 'rLBknJdCzFGV15Vyyewd3U8jQmDR3abRJ4',
                    value: '100',
               },
               Fee: fee,
               FinishAfter: 815102293,
               CancelAfter: 815102343,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          finishTimeEscrowToken: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'EscrowFinish',
               Account: wallet.classicAddress,
               Owner: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               Fee: fee,
               OfferSequence: '0',
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          cancelEscrow: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'EscrowCancel',
               Account: wallet.classicAddress,
               Owner: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               Fee: fee,
               OfferSequence: '0',
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          createConditionEscrow: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'EscrowCreate',
               Account: wallet.classicAddress,
               Destination: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               Amount: '0',
               Fee: '10',
               Condition: 'A0258020B5C9EDAD034B32EE218F7F31ABC1CD42778D0919D5EBC5AF65F460650764E73F810120',
               CancelAfter: '815102343',
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          finishConditionEscrow: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'EscrowFinish',
               Account: wallet.classicAddress,
               Owner: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               Fee: '40',
               Condition: 'A0258020B5C9EDAD034B32EE218F7F31ABC1CD42778D0919D5EBC5AF65F460650764E73F810120',
               Fulfillment: 'A0228020A21657FA950220324BC9060B548BFCBE63ADF26AA5716BDB5AC00116CA7CA097',
               OfferSequence: '0',
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          createConditionEscrowToken: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'EscrowCreate',
               Account: wallet.classicAddress,
               Destination: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               Amount: {
                    currency: 'CTZ',
                    issuer: 'rLBknJdCzFGV15Vyyewd3U8jQmDR3abRJ4',
                    value: '100',
               },
               Fee: fee,
               Condition: 'A0258020B5C9EDAD034B32EE218F7F31ABC1CD42778D0919D5EBC5AF65F460650764E73F810120',
               CancelAfter: '815102343',
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          finishConditionEscrowToken: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'EscrowFinish',
               Account: wallet.classicAddress,
               Owner: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               Fee: '40',
               Condition: 'A0258020B5C9EDAD034B32EE218F7F31ABC1CD42778D0919D5EBC5AF65F460650764E73F810120',
               Fulfillment: 'A0228020A21657FA950220324BC9060B548BFCBE63ADF26AA5716BDB5AC00116CA7CA097',
               OfferSequence: '0',
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          createCheck: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'CheckCreate',
               Account: wallet.classicAddress,
               Destination: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               SendMax: '0',
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          createCheckToken: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'CheckCreate',
               Account: wallet.classicAddress,
               Destination: 'rB59o63jhXxHU9RHDMUq2bypc8pW4m5f6s',
               SendMax: {
                    currency: 'CTZ',
                    issuer: 'rLBknJdCzFGV15Vyyewd3U8jQmDR3abRJ4',
                    value: '1',
               },
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          cashCheck: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'CheckCash',
               Account: wallet.classicAddress,
               CheckID: 'CheckID',
               Amount: '0',
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          cashCheckToken: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'CheckCash',
               Account: wallet.classicAddress,
               CheckID: 'CheckID',
               Amount: {
                    currency: 'CTZ',
                    issuer: 'rLBknJdCzFGV15Vyyewd3U8jQmDR3abRJ4',
                    value: '50',
               },
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          cancelCheck: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'CheckCancel',
               Account: wallet.classicAddress,
               CheckID: '0',
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          createMPT: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'MPTokenIssuanceCreate',
               Account: wallet.classicAddress,
               MaximumAmount: '100',
               Fee: fee,
               Flags: '0',
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          authorizeMPT: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'MPTokenAuthorize',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: '0',
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          unauthorizeMPT: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'MPTokenAuthorize',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: '0',
               Flags: xrpl.MPTokenAuthorizeFlags.tfMPTUnauthorize,
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          sendMPT: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Amount: {
                    mpt_issuance_id: '',
                    value: '0',
               },
               Destination: '',
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          lockMPT: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'MPTokenIssuanceSet',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: '0',
               Flags: xrpl.MPTokenIssuanceSetFlags.tfMPTLock,
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          unlockMPT: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'MPTokenIssuanceSet',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: '0',
               Flags: xrpl.MPTokenIssuanceSetFlags.tfMPTUnlock,
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          destroyMPT: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'MPTokenIssuanceDestroy',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: '0',
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),
     };

     private async applyTicket(tx: any, client: xrpl.Client, wallet: xrpl.Wallet, isTicketEnabled?: boolean, ticketSequence?: string): Promise<void> {
          if (!isTicketEnabled || !ticketSequence) return;

          const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticketSequence));
          if (!exists) throw new Error(`Ticket ${ticketSequence} not found`);
          this.utilsService.setTicketSequence(tx, ticketSequence, true);
     }

     // private applyMemo(tx: any): void {
     //      if (this.txUiService.isMemoEnabled()) {
     //           const memo = this.txUiService.memoField();
     //           if (this.txUiService.isMemoEnabled() && memo) this.utilsService.setMemoField(tx, memo);
     //      } else {
     //           return;
     //      }
     // }
}
