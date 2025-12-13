import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { XrplService } from '../xrpl-services/xrpl.service';
import { UtilsService } from '../../services/util-service/utils.service';

type TxBuilder = (ctx: { wallet: xrpl.Wallet; accountInfo: any; currentLedger: number; fee: any; selectedTransaction?: string }) => any;

interface SignTransactionOptions {
     client: xrpl.Client;
     wallet: xrpl.Wallet;
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
     constructor(private readonly xrplService: XrplService, private readonly utilsService: UtilsService) {}

     async createBatchpRequestText({ client, wallet }: SignTransactionOptions): Promise<string> {
          const [accountInfo, currentLedger] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getLastLedgerIndex(client)]);

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
          const { client, wallet, selectedTransaction, isMemoEnable, isTicketEnabled, ticketSequence } = options;

          if (!selectedTransaction || !this.builders[selectedTransaction]) {
               throw new Error(`Unsupported transaction type: ${selectedTransaction}`);
          }

          const { accountInfo, currentLedger, fee } = await this.baseTx(client, wallet);

          const tx = this.builders[selectedTransaction]({
               wallet,
               accountInfo,
               currentLedger,
               fee,
               selectedTransaction,
          });

          await this.applyTicket(tx, client, wallet, isTicketEnabled, ticketSequence);
          this.applyMemo(tx, isMemoEnable);

          return JSON.stringify(tx, null, 2);
     }

     private builders: Record<string, TxBuilder> = {
          sendXrp: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: 'rMiqQ8m11gBUR3XhTstpjJDbTPdcdATCgE',
               Amount: xrpl.xrpToDrops('0.000001'),
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          setTrustline: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'TrustSet',
               Account: wallet.classicAddress,
               LimitAmount: { currency: 'CTZ', issuer: 'rLBknJdCzFGV15Vyyewd3U8jQmDR3abRJ4', value: '10000000000' },
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          removeTrustline: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'TrustSet',
               Account: wallet.classicAddress,
               LimitAmount: { currency: 'CTZ', issuer: 'rLBknJdCzFGV15Vyyewd3U8jQmDR3abRJ4', value: '0' },
               Fee: fee,
               LastLedgerSequence: currentLedger,
               Sequence: accountInfo.result.account_data.Sequence,
          }),

          issueCurrency: ({ wallet, accountInfo, currentLedger, fee }) => ({
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Destination: 'rHp1RqKdRSG5cJY5ikZadRA91yE35wTJFf',
               Amount: {
                    currency: 'CTZ',
                    issuer: 'rLBknJdCzFGV15Vyyewd3U8jQmDR3abRJ4',
                    value: '100',
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
          if (!isTicketEnabled) return;

          if (ticketSequence) {
               const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticketSequence));

               if (!exists) {
                    throw new Error(`ERROR: Ticket Sequence ${ticketSequence} not found for account ${wallet.classicAddress}`);
               }

               tx.TicketSequence = Number(ticketSequence);
          } else {
               tx.TicketSequence = 'TICKET_SEQUENCE';
          }

          tx.Sequence = 0;
     }

     private applyMemo(tx: any, isMemoEnable?: boolean): void {
          if (!isMemoEnable) return;

          tx.Memos = [{ Memo: { MemoData: '', MemoType: 'text/plain' } }, { Memo: { MemoData: '', MemoType: 'text/plain' } }];
     }

     private async baseTx(client: xrpl.Client, wallet: xrpl.Wallet): Promise<{ accountInfo: any; currentLedger: number; fee: any }> {
          const [accountInfo, fee, currentLedger] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client)]);

          return { accountInfo, currentLedger, fee };
     }
}
