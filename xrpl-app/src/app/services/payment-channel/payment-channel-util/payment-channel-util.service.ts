import { computed, inject, Injectable, signal } from '@angular/core';
import { SelectItem } from '../../../components/ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { PaymentChannelObject, UnifiedPaymentChannel } from '../../../models/interface-items.model';
import * as xrpl from 'xrpl';
import { sign, verify } from 'ripple-keypairs';
import { UtilsService } from '../../util-service/utils.service';
import BigNumber from 'bignumber.js';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AppConstants } from '../../../core/app.constants';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';

type PaymentChannelTxType = 'create' | 'fund' | 'claim' | 'renew' | 'close';

@Injectable({
     providedIn: 'root',
})
export class PaymentChannelUtilService extends PerformanceBaseComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     walletPaymentChannelCount = signal<number>(0);
     existingPaymentChannels = signal<any[]>([]);
     receivablePaymentChannels = signal<any[]>([]);
     closablePaymentChannels = signal<any[]>([]);
     flags = {
          renew: false,
          close: true,
          claimAndClose: false,
     };
     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');
     private readonly flagValues = {
          renew: 0x00010000,
          close: 0x00020000,
     };

     readonly createChannelButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create Channel';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly fundChannelButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Fund Channel';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly claimFundsButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Claim Funds';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly renewChannelButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Renew Channel';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly closeChannelButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Close Channel';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly generateClaimSignatureButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Generate Claim Signature';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     getTransactionValues() {
          const amount = this.txUiService.amountField();
          const isSimulate = this.xrplTxOptionsStore.isSimulateEnabled();
          const useMultiSign = this.xrplTxOptionsStore.useMultiSign();
          const isRegularKeyAddress = this.accountConfiguratorStoreService.isRegularKeyAddress();
          // const isRegularKeyAddress = this.txUiService.isRegularKeyAddress();
          const regularKeyAddress = this.txUiService.regularKeyAddress();
          const regularKeySeed = this.txUiService.regularKeySeed();
          const multiSignAddress = this.txUiService.multiSignAddress();
          const multiSignSeeds = this.txUiService.multiSignSeeds();
          const channelIDField = this.txUiService.channelIDField();
          const settleDelay = this.txUiService.settleDelayField();
          const channelClaimSignatureField = this.txUiService.channelClaimSignatureField();
          const publicKeyField = this.txUiService.publicKeyField();
          const isTicket = this.xrplTxOptionsStore.isTicket();
          const memo = this.txUiService.memoField();
          const isMemoEnabled = this.txUiService.isMemoEnabled();
          const destinationTag = this.txUiService.destinationTagField();
          return { amount, isSimulate, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds, channelIDField, settleDelay, channelClaimSignatureField, publicKeyField, isTicket, memo, isMemoEnabled, destinationTag };
     }

     buildSuccessMessage(type: PaymentChannelTxType, formValues: any): string {
          if (type === 'create') {
               return `Payment Channel created successfully`;
          }

          if (type === 'fund') {
               return `Payment Channel funded successfully`;
          }

          if (type === 'claim') {
               return `Payment Channel claim successfully`;
          }

          if (type === 'renew') {
               return `Payment Channel renew successfully`;
          }

          return `Closed Payment Channel successfully`;
     }

     checkChannelExpired(channel: any) {
          if (channel.CancelAfter) {
               const unixExpiration = channel.CancelAfter + AppConstants.RIPPLE_EPOCH_OFFSET;
               console.log('Expiration (UTC):', new Date(unixExpiration * 1000).toISOString());
               let isExpired = Date.now() / 1000 > unixExpiration;
               console.log('Expired?', isExpired);
               if (isExpired) {
                    return true;
               }
               return false;
          } else {
               console.log('This channel has no expiration set.');
               return false;
          }
     }

     setChannelId(item: SelectItem | null): void {
          const next = item?.id ?? '';
          if (this.txUiService.channelIDField() !== next) {
               this.txUiService.channelIDField.set(next);
          }
     }

     onSignatureChannelSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.txUiService.channelIDField.set('');
               return;
          }
          const channel = this.existingPaymentChannels().find(e => e.id?.toString() === item.id);
          if (channel) {
               this.txUiService.channelIDField.set(channel.id);
               // Optional: pre-fill amount with full remaining if desired
               this.txUiService.amountField.set(channel.totalAmount.split(' ')[0] || '0');
          }
     }

     processPaymentChannels(objects: PaymentChannelObject[], classicAddress: string) {
          const nowUnix = Math.floor(Date.now() / 1000);

          const existing: UnifiedPaymentChannel[] = [];
          const receivable: UnifiedPaymentChannel[] = [];
          const closable: UnifiedPaymentChannel[] = [];

          for (const obj of objects) {
               if (obj.LedgerEntryType !== 'PayChannel') continue;

               const { totalXrp, balanceXrp, remainingXrp, remainingDrops } = this.getXrpAmounts(obj);
               const { expirationUnix, isExpired } = this.getProcessPaymentChannelExpiration(obj, nowUnix);

               const base: Partial<UnifiedPaymentChannel> = {
                    id: obj.index,
                    totalAmount: `${totalXrp} XRP`,
                    balance: `${balanceXrp} XRP`,
                    remaining: `${remainingXrp} XRP`,
                    settleDelay: obj.SettleDelay.toString(),
                    expiration: expirationUnix ? new Date(expirationUnix * 1000).toLocaleString() : '—',
               };

               if (obj.Account === classicAddress) {
                    let status: 'Expired' | 'Fully Claimed' | 'Open';
                    if (isExpired) {
                         status = 'Expired';
                    } else if (remainingDrops === 0n) {
                         status = 'Fully Claimed';
                    } else {
                         status = 'Open';
                    }
                    const entry: UnifiedPaymentChannel = {
                         ...(base as UnifiedPaymentChannel),
                         destination: obj.Destination,
                         publicKey: obj.PublicKey,
                         status,
                         canClose: status !== 'Open' || isExpired,
                         isExpired,
                    };
                    existing.push(entry);
                    closable.push(entry);
               }

               if (obj.Destination === classicAddress) {
                    let status: 'Expired' | 'Claimable' | 'Fully Claimed';

                    if (isExpired) {
                         status = 'Expired';
                    } else if (remainingDrops > 0n) {
                         status = 'Claimable';
                    } else {
                         status = 'Fully Claimed';
                    }

                    const entry: UnifiedPaymentChannel = {
                         ...(base as UnifiedPaymentChannel),
                         sender: obj.Account,
                         status,
                         canClaim: !isExpired && remainingDrops > 0n,
                         isExpired,
                    };
                    receivable.push(entry);

                    if (remainingDrops === 0n || isExpired) {
                         closable.push({ ...entry, canClose: true });
                    }
               }
          }

          // Sort by remaining amount descending (synchronous operation)
          const sortByRemaining = (a: UnifiedPaymentChannel, b: UnifiedPaymentChannel) => Number(b.remaining.split(' ')[0]) - Number(a.remaining.split(' ')[0]);

          existing.sort(sortByRemaining);
          receivable.sort(sortByRemaining);
          closable.sort(sortByRemaining);

          // Optional debug (keep conditional if you want)
          console.group('Payment Channels Processed');
          console.log('Created (source):', existing.length);
          console.log('Receivable (dest):', receivable.length);
          console.log('Closable:', closable.length);
          console.groupEnd();

          this.existingPaymentChannels.set(existing);
          this.receivablePaymentChannels.set(receivable);
          this.closablePaymentChannels.set(closable);
     }

     private getProcessPaymentChannelExpiration(obj: PaymentChannelObject, nowUnix: number) {
          const expirationRipple = obj.Expiration ?? obj.CancelAfter;
          const expirationUnix = expirationRipple ? Number(expirationRipple) + AppConstants.RIPPLE_EPOCH_OFFSET : null;
          const isExpired = expirationUnix ? nowUnix >= expirationUnix : false;
          return { expirationUnix, isExpired };
     }

     private getXrpAmounts(obj: PaymentChannelObject) {
          const totalDrops = BigInt(obj.Amount || '0');
          const balanceDrops = BigInt(obj.Balance || '0');
          const remainingDrops = totalDrops - balanceDrops;

          const totalXrp = xrpl.dropsToXrp(totalDrops.toString());
          const balanceXrp = xrpl.dropsToXrp(balanceDrops.toString());
          const remainingXrp = remainingDrops > 0n ? xrpl.dropsToXrp(remainingDrops.toString()) : '0';
          return { totalXrp, balanceXrp, remainingXrp, remainingDrops };
     }

     async generateCreatorClaimSignature(currentWallet: any) {
          await this.withPerf('generateCreatorClaimSignature', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               const wallet = await this.utilsService.getWallet(currentWallet.seed);
               try {
                    this.txUiService.publicKeyField.set(wallet.publicKey);
                    this.txUiService.channelClaimSignatureField.set(this.generateChannelSignature(this.txUiService.channelIDField(), this.txUiService.amountField(), wallet));
               } catch (error: any) {
                    console.error('Error in generateCreatorClaimSignature:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     generateChannelSignature(channelID: string, amountXRP: BigNumber.Value, wallet: xrpl.Wallet) {
          try {
               if (!/^[0-9A-Fa-f]{64}$/.test(channelID)) {
                    throw new Error('Invalid Channel ID: ID must be a 64-character hexadecimal string');
               }

               if (amountXRP === null || amountXRP === undefined) {
                    throw new Error('Amount cannot be empty');
               }

               const amountBN = new BigNumber(amountXRP);

               if (!amountBN || amountBN.toString().trim() === '') {
                    throw new Error('Amount can not be empty');
               }
               const amountDrops = xrpl.xrpToDrops(amountBN);
               if (Number.isNaN(Number.parseFloat(this.txUiService.amountField())) || Number.parseFloat(this.txUiService.amountField()) <= 0) {
                    throw new Error('Amount must be a valid number and greater than 0');
               }

               // Convert the amount to 8-byte big-endian buffer
               const amountBuffer = Buffer.alloc(8);
               amountBuffer.writeBigUInt64BE(BigInt(amountDrops), 0);

               // Create the message buffer: 'CLM\0' + ChannelID (hex) + Amount (8 bytes)
               const message = Buffer.concat([
                    Buffer.from('CLM\0'), // Prefix for channel claims
                    Buffer.from(channelID, 'hex'), // 32-byte channel ID
                    amountBuffer, // 8-byte drop amount
               ]);

               // Sign the message using ripple-keypairs
               const messageHex = message.toString('hex');
               const signature = sign(messageHex, wallet.privateKey);

               // Verify the signature
               const isValid = verify(messageHex, signature, wallet.publicKey);
               if (!isValid) {
                    throw new Error('Generated signature is invalid');
               }

               return signature.toUpperCase();
          } catch (error: any) {
               throw new Error(`${error.message}`);
          }
     }

     formatChannelItem(e: any, arrow: '→' | '←', secondarySuffix: string): SelectItem {
          const total = (e.totalAmount ?? '0').split(' ')[0];
          const remaining = e.remaining ?? '0';

          console.log('formatChannelItem: ', e);

          return {
               id: String(e.id ?? 'unknown'),
               display: `${total} XRP ${arrow} ${remaining} Remaining`,
               secondary: `Channel ID: ${e.id ?? '?'} • ${secondarySuffix}`,
          };
     }

     resetChannelIdSelection() {
          // if (this.txUiService.errorMessage?.length && this.txUiService.errorMessage?.length <= 0) {
          this.txUiService.channelIDField.set('');
          this.txUiService.channelClaimSignatureField.set('');
          this.txUiService.amountField.set('');
          // }
     }

     toggleFlag(key: 'renew' | 'close' | 'claimAndClose') {
          if (key === 'close') {
               // Do nothing – tfClose is locked
               return;
          }
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     updateFlagTotal() {
          let sum = 0;
          if (this.flags.claimAndClose) sum |= this.flagValues.close;
          if (this.flags.renew) sum |= this.flagValues.renew;
          if (this.flags.close) sum |= this.flagValues.close; // always included

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     clearFlagsValue() {
          this.flags = { renew: false, close: true, claimAndClose: false };
          this.totalFlagsValue.set(0);
          this.totalFlagsHex.set('0x0');
     }

     existingChannelMap = computed(() => {
          const map = new Map<string, any>();
          for (const c of this.existingPaymentChannels()) {
               if (c.id) map.set(String(c.id), c);
          }
          return map;
     });
}
