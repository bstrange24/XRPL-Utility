import { computed, inject, Injectable } from '@angular/core';
import { SelectItem } from '../../../components/shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import * as xrpl from 'xrpl';
import { sign, verify } from 'ripple-keypairs';
import { UtilsService } from '../../utils/util-service/utils.service';
import BigNumber from 'bignumber.js';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AppConstants } from '../../../core/app.constants';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { PaymentChannelStoreService } from '../payment-channel-store/payment-channel-store.service';
import { PaymentChannelObject, UnifiedPaymentChannel } from '../../../components/payment-channel/constants/payment-channel.types';
import { PaymentChannelSignatureContextService } from '../payment-channel-signature-context/payment-channel-signature-context.service';

@Injectable({
     providedIn: 'root',
})
export class PaymentChannelUtilService extends PerformanceBaseComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly paymentChannelSignatureContextService = inject(PaymentChannelSignatureContextService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     selectedPaymentChannelId = computed(() => this.paymentChannelStoreService.channelIDField());

     readonly createChannelButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create Channel';
          if (step === 'waiting_validation') return 'Create Channel';
          return this.txUiService.stepMessage();
     });

     readonly fundChannelButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Fund Channel';
          if (step === 'waiting_validation') return 'Fund Channel';
          return this.txUiService.stepMessage();
     });

     readonly claimFundsButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Claim Funds';
          if (step === 'waiting_validation') return 'Claim Funds';
          return this.txUiService.stepMessage();
     });

     readonly renewChannelButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Renew Channel';
          if (step === 'waiting_validation') return 'Renew Channel';
          return this.txUiService.stepMessage();
     });

     readonly closeChannelButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Close Channel';
          if (step === 'waiting_validation') return 'Close Channel';
          return this.txUiService.stepMessage();
     });

     readonly generateClaimSignatureButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Generate Claim Signature';
          if (step === 'waiting_validation') return 'Generate Claim Signature';
          return this.txUiService.stepMessage();
     });

     toggleCreatorMode(input: HTMLInputElement): void {
          this.paymentChannelStoreService.setField('isCreatorMode', input.checked);
     }

     checkChannelExpired(channel: any) {
          if (channel.CancelAfter || channel.Expiration) {
               const unixExpiration = channel.CancelAfter ? channel.CancelAfter : channel.Expiration + AppConstants.RIPPLE_EPOCH_OFFSET;
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
          if (this.paymentChannelStoreService.channelIDField() !== next) {
               this.paymentChannelStoreService.setField('channelIDField', next);
          }
     }

     selectPaymentChannelFromList(channel: UnifiedPaymentChannel, tab: string): void {
          console.log('✅ selectPaymentChannelFromList called with:', channel.id, tab);
          const isCreateTab = tab === 'createPaymentChannel';

          if (isCreateTab) {
               this.paymentChannelStoreService.setField('channelIDField', '');
               this.paymentChannelStoreService.setField('isPaymentChannelOwner', false);
               return;
          }

          this.paymentChannelStoreService.setField('channelIDField', channel.id);
          this.paymentChannelStoreService.setField('isPaymentChannelOwner', channel.isOwner);

          if (tab === 'claimPaymentChannel' || tab === 'renewPaymentChannel' || tab === 'fundPaymentChannel') {
               const remainingAmount = channel.remaining?.split(' ')[0] ?? '0';
               this.paymentChannelStoreService.setField('amount', remainingAmount);
          }

          this.txUiService.clearAllOptionsAndMessages();
     }

     onSignatureChannelSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.paymentChannelStoreService.setField('channelIDField', '');
               return;
          }
          const channel = this.paymentChannelStoreService.existingPaymentChannels().find(e => e.id?.toString() === item.id);
          if (channel) {
               this.paymentChannelStoreService.setField('channelIDField', channel.id);
               // Optional: pre-fill amount with full remaining if desired
               this.paymentChannelStoreService.setField('amount', channel.totalAmount.split(' ')[0] || '0');
          }
     }

     loadFlagsFromSignature(signature: string) {
          const context = this.paymentChannelSignatureContextService.getSignatureContext(signature);

          if (context?.flags) {
               // Update the store with the flags from the signature context
               this.paymentChannelStoreService.updateField('flags', () => ({
                    renew: context.flags.renew ?? false,
                    close: context.flags.close ?? true,
                    claimAndClose: context.flags.claimAndClose ?? false,
               }));

               // Update the total flags value
               this.updateFlagTotal();

               // Also update other fields if needed
               if (context.channelId && !this.paymentChannelStoreService.channelIDField()) {
                    this.paymentChannelStoreService.setField('channelIDField', context.channelId);
               }

               if (context.amount && !this.paymentChannelStoreService.amount()) {
                    this.paymentChannelStoreService.setField('amount', context.amount);
               }

               console.log('Loaded flags from signature context:', context.flags);
          }
     }

     onSignatureInput(signature: string) {
          this.paymentChannelStoreService.setField('channelClaimSignatureField', signature);
          // The subscription will automatically load the flags
     }

     onChannelSelected(channel: any) {
          // If channel has flags, you might also want to load them
          if (channel?.Flags) {
               const hasCloseFlag = (channel.Flags & 0x00020000) !== 0;
               this.paymentChannelStoreService.updateField('flags', () => ({
                    renew: false,
                    close: true,
                    claimAndClose: hasCloseFlag,
               }));
               this.updateFlagTotal();
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
                         isOwner: true,
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
                         isOwner: false,
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

          this.paymentChannelStoreService.setField('existingPaymentChannels', existing);
          this.paymentChannelStoreService.setField('receivablePaymentChannels', receivable);
          this.paymentChannelStoreService.setField('closablePaymentChannels', closable);
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
                    const channelId = this.paymentChannelStoreService.channelIDField();
                    const amount = this.paymentChannelStoreService.amount();
                    const flags = this.paymentChannelStoreService.flags();

                    this.paymentChannelStoreService.setField('publicKeyField', wallet.publicKey);
                    const signature = this.generateChannelSignature(channelId, amount, wallet);

                    // Save the signature context with flags
                    this.paymentChannelSignatureContextService.saveSignatureContext(signature, {
                         channelId: channelId,
                         amount: amount,
                         flags: {
                              claimAndClose: flags.claimAndClose,
                              renew: flags.renew,
                              close: flags.close,
                         },
                         generatedAt: new Date().toISOString(),
                         generatedBy: 'creator',
                    });

                    // Optional: Show success message
                    console.log('Signature generated and context saved');

                    this.paymentChannelStoreService.setField('channelClaimSignatureField', signature);
               } catch (error: any) {
                    console.error('Error in generateCreatorClaimSignature:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
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
               if (Number.isNaN(Number.parseFloat(this.paymentChannelStoreService.amount())) || Number.parseFloat(this.paymentChannelStoreService.amount()) <= 0) {
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

     toggleFlag(key: 'renew' | 'close' | 'claimAndClose') {
          if (key === 'close') {
               // Do nothing – tfClose is locked
               return;
          }

          // Update the flag in the store
          this.paymentChannelStoreService.updateField('flags', currentFlags => ({
               ...currentFlags,
               [key]: !currentFlags[key],
          }));

          this.updateFlagTotal();
     }

     updateFlagTotal() {
          // Get current flags from store
          const flags = this.paymentChannelStoreService.flags();
          const flagValues = this.paymentChannelStoreService.flagValues();

          let sum = 0;

          if (flags.claimAndClose) sum |= flagValues.close;
          if (flags.renew) sum |= flagValues.renew;
          if (flags.close) sum |= flagValues.close;

          this.paymentChannelStoreService.setField('totalFlagsValue', sum);
          this.paymentChannelStoreService.setField('totalFlagsHex', '0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     clearFlagsValue() {
          // Reset flags using updateField
          this.paymentChannelStoreService.updateField('flags', () => ({
               renew: false,
               close: true,
               claimAndClose: false,
          }));

          this.paymentChannelStoreService.setField('totalFlagsValue', 0);
          this.paymentChannelStoreService.setField('totalFlagsHex', '0x0');
     }

     existingChannelMap = computed(() => {
          const map = new Map<string, any>();
          for (const c of this.paymentChannelStoreService.existingPaymentChannels()) {
               if (c.id) map.set(String(c.id), c);
          }
          return map;
     });

     clearInputFields(): void {
          if (this.xrplTxOptionsStore.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
     }
}
