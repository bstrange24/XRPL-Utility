import { Component, OnInit, inject, computed, DestroyRef, signal, ChangeDetectionStrategy, Signal, WritableSignal } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { PaymentChannelFund, PaymentChannelClaim } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { sign, verify } from 'ripple-keypairs';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface PaymentChannelObject {
     Account: string;
     index: string;
     Expiration?: number;
     CancelAfter?: number;
     Destination: string;
     Amount: string;
     Balance: string;
     SettleDelay: number;
     PublicKey: string;
}

interface UnifiedPaymentChannel {
     id: string;
     totalAmount: string;
     balance: string;
     remaining: string;
     destination: string;
     settleDelay: string;
     expiration: any;
     status: string;
     canClose: any;
     publicKey?: string; // optional, since not all objects have it
}

@Component({
     selector: 'app-account',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './payment-channel.component.html',
     styleUrl: './payment-channel.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePaymentChannelComponent extends PerformanceBaseComponent implements OnInit {
     private readonly destroyRef = inject(DestroyRef);
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly dropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);

     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     activeTab = signal<'create' | 'close' | 'claim' | 'renew' | 'fund'>('create');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     amountField = signal<string>('');
     destinationField = signal<string>('');
     destinationTagField = signal<string>('');
     paymentChannelCancelAfterTimeField = signal<string>('');
     paymentChannelCancelAfterTimeUnit = signal<string>('seconds');
     channelIDField = signal<string>('');
     settleDelayField = signal<string>('');
     publicKeyField = signal<string>('');
     channelClaimSignatureField = signal<string>('');
     channelAction = signal<string>('create');
     renewChannel = signal<string>('');
     authorizedWalletAddress = signal<string>('');
     authorizedWallets: { name?: string; address: string }[] = [];
     selectedWalletIndex = signal<number>(0);
     authorizedWalletIndex = signal<number>(1);
     actions = [
          { value: 'create', label: 'Create' },
          { value: 'fund', label: 'Fund' },
          { value: 'renew', label: 'Renew' },
          { value: 'claim', label: 'Claim' },
          { value: 'close', label: 'Close' },
     ];
     flags = {
          renew: false,
          close: true,
     };
     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');
     private flagValues = {
          renew: 0x00010000,
          close: 0x00020000,
     };
     walletPaymentChannelCount = signal<number>(0);
     existingPaymentChannels = signal<any[]>([]);
     receivablePaymentChannels = signal<any[]>([]);
     closablePaymentChannels = signal<any[]>([]);

     selectedDestinationItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;
          return this.destinationItems().find(d => d.id === addr) || null;
     });

     destinationItems = computed(() => {
          const currentAddr = this.currentWallet().address;

          return this.destinations().map(d => ({
               id: d.address,
               display: d.name || 'Unknown Wallet',
               secondary: d.address,
               isCurrentAccount: d.address === currentAddr,
          }));
     });

     destinations = computed(() => [
          ...this.wallets().map((w: DropdownItem) => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
          })),
          ...this.customDestinations(),
     ]);

     destinationDisplay = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return this.destinationSearchQuery(); // while typing → show typed text

          const dest = this.destinations().find(d => d.address === addr);
          if (!dest) return addr;

          return this.dropdownService.formatDisplay(dest);
     });

     filteredDestinations = computed(() => {
          const q = this.destinationSearchQuery().trim().toLowerCase();
          const list = this.destinations();

          if (q === '') {
               return list;
          }

          return this.destinations()
               .filter(d => d.address !== this.currentWallet().address)
               .filter(d => d.address.toLowerCase().includes(q) || (d.name ?? '').toLowerCase().includes(q));
     });

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const baseUrl = this.txUiService.explorerUrl();

          // Get correct list per tab
          let channels: any[] = [];
          switch (this.activeTab()) {
               case 'create':
               case 'fund':
                    channels = this.existingPaymentChannels();
                    break;
               case 'claim':
                    channels = this.receivablePaymentChannels();
                    break;
               case 'close':
                    channels = this.closablePaymentChannels();
                    break;
          }

          const count = channels.length;

          // Links (only on create/close)
          let links = '';
          if (count > 0 && (this.activeTab() === 'create' || this.activeTab() === 'close')) {
               links = `<a href="${baseUrl}account/${wallet.address}/payment-channels" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View Payment Channels</a>`;
          }

          return {
               walletName,
               activeTab: this.activeTab(),
               channelCount: count,
               channelsToShow: channels,
               links,
          };
     });

     timeUnitItems = computed(() => [
          { id: 'seconds', display: 'Seconds' },
          { id: 'minutes', display: 'Minutes' },
          { id: 'hours', display: 'Hours' },
          { id: 'days', display: 'Days' },
     ]);

     selectedCancelAfterTimeUnit = computed(() => {
          const unit = this.paymentChannelCancelAfterTimeUnit();
          return this.timeUnitItems().find(i => i.id === unit) || null;
     });

     hasWallets = computed(() => this.wallets().length > 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.(); // or just clear messages when appropriate
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
               }
          });

          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) this.selectWallet(wallet);
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearAllOptionsAndMessages();
                    this.clearInputFields();
                    this.populateDefaultDateTime();
                    await this.getPaymentChannels(false);
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          // Prevent self as destination
          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
          this.populateDefaultDateTime();
     }

     trackById(index: number, item: UnifiedPaymentChannel): string {
          return item.id;
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     toggleFlag(key: 'renew' | 'close') {
          if (key === 'close') {
               // Do nothing – tfClose is locked
               return;
          }
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          if (this.flags.renew) sum |= this.flagValues.renew;
          if (this.flags.close) sum |= this.flagValues.close; // always included

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     async setTab(tab: 'create' | 'close' | 'claim' | 'renew' | 'fund'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.clearFlagsValue();
          this.clearFields();
          if (this.hasWallets()) {
               this.populateDefaultDateTime();
               await this.getPaymentChannels(true);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getPaymentChannels(forceRefresh = false): Promise<void> {
          await this.withPerf('getPaymentChannels', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, paymentChannelObjects] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'payment_channel')]);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.getExistingPaymentChannels(paymentChannelObjects, wallet.classicAddress);
                    this.getReceivablePaymentChannels(paymentChannelObjects, wallet.classicAddress);
                    this.getClosablePaymentChannels(paymentChannelObjects, wallet.classicAddress);

                    this.walletPaymentChannelCount.set(paymentChannelObjects.result.account_objects.length);
                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getPaymentChannels:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async handlePaymentChannelAction() {
          await this.withPerf('handlePaymentChannelAction', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    // const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();
                    const destinationAddress = this.selectedDestinationAddress() || this.typedDestination();
                    const [accountInfo, fee, currentLedger, paymentChannelObjects, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'payment_channel'), this.xrplService.getXrplServerInfo(client, 'current', '')]);

                    const action = this.channelAction();

                    if (action === 'create') {
                         // const errors = await this.validationService.validate('PaymentChannelCreate', { inputs, client, accountInfo });
                         // if (errors.length > 0) {
                         //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                         // }

                         let paymentChannelCreateTx: any = {
                              TransactionType: 'PaymentChannelCreate',
                              Account: wallet.classicAddress,
                              Amount: xrpl.xrpToDrops(this.amountField()),
                              Destination: destinationAddress,
                              SettleDelay: parseInt(this.settleDelayField()),
                              PublicKey: wallet.publicKey,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };

                         await this.setTxOptionalFields(client, paymentChannelCreateTx, wallet, accountInfo);

                         const result = await this.txExecutor.paymentChannelCreate(paymentChannelCreateTx, wallet, client, {
                              useMultiSign: this.txUiService.useMultiSign(),
                              isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                              regularKeySeed: this.txUiService.regularKeySeed(),
                              multiSignAddress: this.txUiService.multiSignAddress(),
                              multiSignSeeds: this.txUiService.multiSignSeeds(),
                         });
                         if (!result.success) return this.txUiService.setError(`${result.error}`);
                         this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated XRP payment successfully!' : 'XRP payment sent successfully!';
                    } else if (action === 'fund') {
                         // const errors = await this.validationService.validate('PaymentChannelFund', { inputs, client, accountInfo });
                         // if (errors.length > 0) {
                         //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                         // }

                         let paymentChannelFundTx: PaymentChannelFund = {
                              TransactionType: 'PaymentChannelFund',
                              Account: wallet.classicAddress,
                              Channel: this.channelIDField(),
                              Amount: xrpl.xrpToDrops(this.amountField()),
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };

                         await this.setTxOptionalFields(client, paymentChannelFundTx, wallet, accountInfo);

                         const result = await this.txExecutor.paymentChannelFundTx(paymentChannelFundTx, wallet, client, {
                              useMultiSign: this.txUiService.useMultiSign(),
                              isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                              regularKeySeed: this.txUiService.regularKeySeed(),
                              multiSignAddress: this.txUiService.multiSignAddress(),
                              multiSignSeeds: this.txUiService.multiSignSeeds(),
                         });
                         if (!result.success) return this.txUiService.setError(`${result.error}`);
                         this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated XRP payment successfully!' : 'XRP payment sent successfully!';
                    } else if (action === 'claim' || action === 'renew') {
                         if (action === 'claim') {
                              // const errors = await this.validationService.validate('PaymentChannelClaim', { inputs, client, accountInfo });
                              // if (errors.length > 0) {
                              //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                              // }
                         } else {
                              // const errors = await this.validationService.validate('PaymentChannelRenew', { inputs, client, accountInfo });
                              // if (errors.length > 0) {
                              //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                              // }
                         }

                         const authorizedWallet = await this.getPaymentChannelAuthorizedWallet(this.authorizedWalletAddress());
                         const [signatureVerified, isChannelAuthorized] = await Promise.all([this.xrplService.getChannelVerifiy(client, this.channelIDField(), this.amountField(), this.publicKeyField(), this.channelClaimSignatureField()), this.xrplService.getPaymentChannelAuthorized(client, this.channelIDField(), this.amountField(), authorizedWallet)]);
                         // this.utilsService.logObjects('signatureVerified', signatureVerified);
                         // this.utilsService.logObjects('isChannelAuthorized', isChannelAuthorized);

                         // Get payment channel details to verify creator and receiver
                         const channels = paymentChannelObjects.result.account_objects as PaymentChannelObject[];
                         const channel = channels.find(c => c.index === this.channelIDField());
                         if (!channel) {
                              return this.txUiService.setError(`Payment channel ${this.channelIDField} not found`);
                         }

                         // Determine if the selected account is the creator or receiver
                         const isReceiver = channel.Destination === wallet.classicAddress;
                         let signature = this.channelClaimSignatureField();
                         if (!signatureVerified.result.signature_verified) {
                              return this.txUiService.setError('Invalid signature');
                         }

                         // if (isChannelAuthorized.result.signature !== signature) {
                         // return this.ui.setError('Wallet is invalid for payment channel.');
                         // }

                         let paymentChannelClaimTx: PaymentChannelClaim = {
                              TransactionType: 'PaymentChannelClaim',
                              Account: wallet.classicAddress,
                              Channel: this.channelIDField(),
                              Balance: xrpl.xrpToDrops(this.amountField()),
                              Signature: signature,
                              PublicKey: isReceiver ? this.publicKeyField() : wallet.publicKey,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };

                         if (action === 'renew') {
                              paymentChannelClaimTx.Flags = xrpl.PaymentChannelClaimFlags.tfRenew;
                         }

                         await this.setTxOptionalFields(client, paymentChannelClaimTx, wallet, accountInfo);

                         const result = await this.txExecutor.paymentChannelClaimTx(paymentChannelClaimTx, wallet, client, {
                              useMultiSign: this.txUiService.useMultiSign(),
                              isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                              regularKeySeed: this.txUiService.regularKeySeed(),
                              multiSignAddress: this.txUiService.multiSignAddress(),
                              multiSignSeeds: this.txUiService.multiSignSeeds(),
                         });
                         if (!result.success) return this.txUiService.setError(`${result.error}`);
                         this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated XRP payment successfully!' : 'XRP payment sent successfully!';
                    } else if (action === 'close') {
                         // const errors = await this.validationService.validate('PaymentChannelClose', { inputs, client, accountInfo });
                         // if (errors.length > 0) {
                         //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                         // }

                         const channels = paymentChannelObjects.result.account_objects as PaymentChannelObject[];
                         const channel = channels.find(c => c.index === this.channelIDField());
                         if (!channel) {
                              return this.txUiService.setError(`Payment channel ${this.channelIDField} not found`);
                         }

                         let isOwnerCancelling = false;
                         if (wallet.classicAddress == channel.Account) {
                              isOwnerCancelling = true;
                         }

                         const currentLedgerTime = await this.xrplService.getLedgerCloseTime(client);
                         if (channel.Expiration && channel.Expiration > currentLedgerTime) {
                              return this.txUiService.setError('Cannot close channel before expiration');
                         }

                         let hasChannelExpired = this.checkChannelExpired(channel);

                         const ownerCancelling = !!isOwnerCancelling;
                         const expired = !!hasChannelExpired;

                         if (ownerCancelling || expired) {
                              // skip balance check — allowed to close (owner or expired)
                         } else {
                              const amount = BigInt(channel.Amount ?? '0');
                              const balance = BigInt(channel.Balance ?? '0');
                              const remaining = amount - balance;
                              if (remaining > 0n) {
                                   return this.txUiService.setError(`Cannot close channel with non-zero balance. ${xrpl.dropsToXrp(remaining.toString())} XRP still available to claim.`);
                              }
                         }

                         let paymentChannelClaimTx: PaymentChannelClaim = {
                              TransactionType: 'PaymentChannelClaim',
                              Account: wallet.classicAddress,
                              Channel: this.channelIDField(),
                              Flags: xrpl.PaymentChannelClaimFlags.tfClose,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };

                         await this.setTxOptionalFields(client, paymentChannelClaimTx, wallet, accountInfo);

                         const result = await this.txExecutor.paymentChannelClaimTx(paymentChannelClaimTx, wallet, client, {
                              useMultiSign: this.txUiService.useMultiSign(),
                              isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                              regularKeySeed: this.txUiService.regularKeySeed(),
                              multiSignAddress: this.txUiService.multiSignAddress(),
                              multiSignSeeds: this.txUiService.multiSignSeeds(),
                         });
                         if (!result.success) return this.txUiService.setError(`${result.error}`);
                         this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated XRP payment successfully!' : 'XRP payment sent successfully!';
                    }

                    await this.refreshAfterTx(client, wallet, destinationAddress, true);
               } catch (error: any) {
                    console.error('Error in handlePaymentChannelAction:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async getPaymentChannelInfo() {
          if (this.activeTab() === 'close') {
               const [client] = await Promise.all([this.getClient()]);
               const paymentChannelObjects = await this.xrplService.getAccountObjects(client, this.currentWallet().address, 'validated', 'payment_channel');
               this.getClosablePaymentChannels(paymentChannelObjects, this.currentWallet().address);
          } else if (this.activeTab() === 'create' || this.activeTab() === 'fund' || this.activeTab() === 'renew' || this.activeTab() === 'claim') {
               if (this.activeTab() === 'create' || this.activeTab() === 'fund' || this.activeTab() === 'renew') {
                    const [client] = await Promise.all([this.getClient()]);
                    const paymentChannelObjects = await this.xrplService.getAccountObjects(client, this.currentWallet().address, 'validated', 'payment_channel');
                    this.getExistingPaymentChannels(paymentChannelObjects, this.currentWallet().address);
               }

               if (this.activeTab() === 'claim') {
                    const [client] = await Promise.all([this.getClient()]);
                    const paymentChannelObjects = await this.xrplService.getAccountObjects(client, this.currentWallet().address, 'validated', 'payment_channel');
                    this.getReceivablePaymentChannels(paymentChannelObjects, this.currentWallet().address);
               }
          }
     }

     // EXISTING PAYMENT CHANNELS (walletA created)
     private getExistingPaymentChannels(channelObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const nowUnix = Math.floor(Date.now() / 1000);
          const mapped = (channelObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'PayChannel' && obj.Account === classicAddress)
               .map((obj: any) => {
                    const total = xrpl.dropsToXrp(obj.Amount);
                    const balance = xrpl.dropsToXrp(obj.Balance ?? '0');
                    // const total = parseFloat(xrpl.dropsToXrp(obj.Amount.toString()));
                    // const balance = parseFloat(xrpl.dropsToXrp(String(obj.Balance ?? '0')));
                    const remaining = (total - balance).toFixed(6);

                    // Convert Ripple epoch to Unix
                    const expirationUnix = obj.Expiration ? Number(obj.Expiration) + 946684800 : null;
                    const expired = expirationUnix ? nowUnix > expirationUnix : false;
                    const status = expired ? 'Expired' : remaining === '0.000000' ? 'Fully Claimed' : 'Open';

                    return {
                         id: obj.index,
                         totalAmount: `${total} XRP`,
                         balance: `${balance} XRP`,
                         remaining: `${remaining} XRP`,
                         destination: obj.Destination,
                         settleDelay: obj.SettleDelay,
                         expiration: expirationUnix ? new Date(expirationUnix * 1000).toLocaleString() : '—',
                         publicKey: obj.PublicKey,
                         status,
                         canClose: status !== 'Open',
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));

          this.utilsService.logObjects('existingPaymentChannels', mapped);
          this.existingPaymentChannels.set(mapped);
     }

     // RECEIVABLE PAYMENT CHANNELS (walletA can claim)
     private getReceivablePaymentChannels(channelObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const nowUnix = Math.floor(Date.now() / 1000);
          const mapped = (channelObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'PayChannel' && obj.Destination === classicAddress)
               .map((obj: any) => {
                    const total = xrpl.dropsToXrp(obj.Amount);
                    const balance = xrpl.dropsToXrp(obj.Balance ?? '0');
                    // const total = parseFloat(xrpl.dropsToXrp(obj.Amount));
                    // const balance = parseFloat(xrpl.dropsToXrp(obj.Balance ?? '0'));
                    const remaining = (total - balance).toFixed(6);

                    const expirationUnix = obj.Expiration ? Number(obj.Expiration) + 946684800 : null;
                    const expired = expirationUnix ? nowUnix > expirationUnix : false;
                    const status = expired ? 'Expired' : remaining === '0.000000' ? 'Fully Claimed' : 'Claimable';

                    return {
                         id: obj.index,
                         totalAmount: `${total} XRP`,
                         balance: `${balance} XRP`,
                         remaining: `${remaining} XRP`,
                         sender: obj.Account,
                         settleDelay: obj.SettleDelay,
                         expiration: expirationUnix ? new Date(expirationUnix * 1000).toLocaleString() : '—',
                         status,
                         canClaim: status === 'Claimable',
                    };
               })
               .sort((a, b) => a.sender.localeCompare(b.sender));

          this.utilsService.logObjects('receivablePaymentChannels', mapped);
          this.receivablePaymentChannels.set(mapped);
     }

     // CLOSABLE PAYMENT CHANNELS (walletA can close)
     private getClosablePaymentChannels(channelObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const nowUnix = Math.floor(Date.now() / 1000);
          const mapped = (channelObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'PayChannel' && obj.Account === classicAddress)
               .map((obj: any) => {
                    const total = xrpl.dropsToXrp(obj.Amount);
                    const balance = xrpl.dropsToXrp(obj.Balance ?? '0');
                    // const total = parseFloat(xrpl.dropsToXrp(obj.Amount));
                    // const balance = parseFloat(xrpl.dropsToXrp(obj.Balance ?? '0'));
                    const remaining = (total - balance).toFixed(6);

                    const expirationUnix = obj.Expiration ? Number(obj.Expiration) + 946684800 : null;
                    const expired = expirationUnix ? nowUnix > expirationUnix : false;
                    const status = expired ? 'Expired' : remaining === '0.000000' ? 'Fully Claimed' : 'Open';

                    return {
                         id: obj.index,
                         totalAmount: `${total} XRP`,
                         balance: `${balance} XRP`,
                         remaining: `${remaining} XRP`,
                         destination: obj.Destination,
                         settleDelay: obj.SettleDelay,
                         expiration: expirationUnix ? new Date(expirationUnix * 1000).toLocaleString() : '—',
                         status,
                         canClose: status !== 'Open',
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));

          this.utilsService.logObjects('closablePaymentChannels', mapped);
          this.closablePaymentChannels.set(mapped);
     }

     private async getPaymentChannelAuthorizedWallet(authorizedWalletAddress: string) {
          if (!this.wallets() || this.wallets().length === 0) {
               throw new Error('No wallets available');
          }
          if (!authorizedWalletAddress || authorizedWalletAddress === this.currentWallet().address) {
               throw new Error('Invalid authorized wallet address (must be different from selected)');
          }
          const authorizedWalletData = this.wallets().find((w: { address: string }) => w.address === authorizedWalletAddress);
          if (!authorizedWalletData) {
               throw new Error('Authorized wallet not found');
          }
          const authorizedSeed = authorizedWalletData.seed || authorizedWalletData.mnemonic || authorizedWalletData.secretNumbers;
          if (!authorizedSeed) {
               throw new Error('No seed available for authorized wallet');
          }
          const authorizedWallet = await this.utilsService.getWallet(authorizedSeed);
          if (!authorizedWallet) {
               throw new Error('Authorized wallet could not be created or is undefined');
          }
          return authorizedWallet;
     }

     async generateCreatorClaimSignature() {
          await this.withPerf('generateCreatorClaimSignature', async () => {
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    // const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();
                    const destinationAddress = this.selectedDestinationAddress() || this.typedDestination();
                    const accountInfo = await this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', '');

                    // const errors = await this.validationService.validate('PaymentChannelGenerateCreatorClaimSignature', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    this.publicKeyField.set(wallet.publicKey);
                    this.channelClaimSignatureField.set(this.generateChannelSignature(this.channelIDField(), this.amountField(), wallet));
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
                    throw new Error('Invalid channelID: must be a 64-character hexadecimal string');
               }

               if (!amountXRP || amountXRP.toString().trim() === '') {
                    throw new Error('Invalid amountXRP: must be a valid number or string');
               }
               const amountDrops = xrpl.xrpToDrops(amountXRP);
               if (isNaN(parseFloat(this.amountField())) || parseFloat(this.amountField()) <= 0) {
                    throw new Error('Invalid amountXRP: must be a valid number or string');
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
               throw new Error(`Failed to generate channel signature: ${error.message}`);
          }
     }

     checkChannelExpired(channel: any) {
          if (channel.CancelAfter) {
               const unixExpiration = channel.CancelAfter + 946684800;
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

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, paymentChannelTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(paymentChannelTx, ticket, true);
               }
          }

          if (this.txUiService.destinationTagField()) {
               this.utilsService.setDestinationTag(paymentChannelTx, this.txUiService.destinationTagField());
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(paymentChannelTx, this.txUiService.memoField());
          }

          if (this.txUiService.destinationTagField()) {
               this.utilsService.setDestinationTag(paymentChannelTx, this.txUiService.destinationTagField());
          }

          if (this.publicKeyField()) this.utilsService.setPublicKey(paymentChannelTx, this.publicKeyField());

          if (this.paymentChannelCancelAfterTimeField()) {
               // const cancelAfterTime = this.utilsService.addTime(this.paymentChannelCancelAfterTimeField(), this.paymentChannelCancelAfterTimeUnit() as 'seconds' | 'minutes' | 'hours' | 'days');
               // console.log(`cancelTime: ${this.paymentChannelCancelAfterTimeField()} cancelUnit: ${this.paymentChannelCancelAfterTimeUnit}`);
               // console.log(`cancelTime: ${this.utilsService.convertXRPLTime(cancelAfterTime)}`);
               const cancelAfterTime = this.utilsService.toRippleTime(this.paymentChannelCancelAfterTimeField());
               const currentLedgerTime = await this.xrplService.getLedgerCloseTime(client); // Implement this in xrplService
               if (cancelAfterTime <= currentLedgerTime) {
                    return this.txUiService.setError('Cancel After time must be in the future');
               }
               this.utilsService.setCancelAfter(paymentChannelTx, cancelAfterTime);
          }

          if (this.paymentChannelCancelAfterTimeField() && (this.channelAction() === 'fund' || this.channelAction() === 'renew')) {
               const newExpiration = this.utilsService.addTime(this.paymentChannelCancelAfterTimeField(), this.paymentChannelCancelAfterTimeUnit() as 'seconds' | 'minutes' | 'hours' | 'days');
               const currentLedgerTime = await this.xrplService.getLedgerCloseTime(client);
               if (newExpiration <= currentLedgerTime) {
                    return this.txUiService.setError('New expiration time must be in the future');
               }
               this.utilsService.setExpiration(paymentChannelTx, newExpiration);
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest && destination) this.addNewDestinationFromUser(destination);
          this.refreshUiState(wallet, accountInfo, accountObjects);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     private refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          // Update multi-sign & regular key flags
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          this.txUiService.regularKeySigningEnabled.set(hasRegularKey);

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.txUiService.signerQuorum.set(signerQuorum);
          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

          this.txUiService.multiSigningEnabled.set(hasSignerList);
          if (hasSignerList) {
               const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.txUiService.signers.set(entries);
          }

          const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };

          this.txUiService.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.txUiService.regularKeySeed.set(rkProps.regularKeySeed);
     }

     private setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
          const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
          this.txUiService.signers.set(signerEntries);
          this.txUiService.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
          this.txUiService.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     }

     private clearMultiSignersConfiguration(): void {
          this.txUiService.signerQuorum.set(0);
          this.txUiService.multiSignAddress.set('No Multi-Sign address configured for account');
          this.txUiService.multiSignSeeds.set('');
          this.storageService.removeValue('signerEntries');
     }

     updateDestinations() {
          // Optional: persist destinations
          const allItems = [
               ...this.wallets().map(wallet => ({
                    name: wallet.name ?? this.truncateAddress(wallet.address),
                    address: wallet.address,
               })),
               ...this.customDestinations(),
          ];
          this.storageService.set('destinations', allItems);
          this.ensureDefaultAuthorizedWallet();
     }

     private ensureDefaultAuthorizedWallet() {
          if (this.wallets().length <= 1) {
               this.authorizedWalletAddress.set('');
               return;
          }
          const currentAddress = this.currentWallet().address;
          if (!this.authorizedWalletAddress || this.authorizedWalletAddress() === currentAddress) {
               // Find a valid non-current address
               const nonSelectedWallet = this.wallets().find((w: { address: string }) => w.address !== currentAddress);
               this.authorizedWalletAddress.set(nonSelectedWallet ? nonSelectedWallet.address : this.wallets()[0].address);
          }
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
     }

     private addToDateTimeField(fieldSignal: Signal<string>, writableSignal: WritableSignal<string>, seconds: number): void {
          let currentValue = fieldSignal();

          // If field is empty, start from now
          if (!currentValue) {
               const now = new Date();
               currentValue = this.formatDateTimeLocal(now);
          }

          const date = new Date(currentValue);
          date.setSeconds(date.getSeconds() + seconds);

          const newDateTime = this.formatDateTimeLocal(date);

          writableSignal.set(newDateTime);
     }

     // Helper to avoid duplicating formatting code
     private formatDateTimeLocal(date: Date): string {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const secs = String(date.getSeconds()).padStart(2, '0');

          return `${year}-${month}-${day}T${hours}:${minutes}:${secs}`;
     }

     // Now update your public methods
     addCancelAfterToExpiration(seconds: number): void {
          this.addToDateTimeField(this.paymentChannelCancelAfterTimeField, this.paymentChannelCancelAfterTimeField, seconds);
     }

     setCancelAfterExpirationToNow() {
          const now = new Date();

          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');

          this.paymentChannelCancelAfterTimeField.set(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
     }

     populateDefaultDateTime() {
          this.setCancelAfterExpirationToNow();
     }

     clearFlagsValue() {
          this.flags = {
               renew: false,
               close: false,
          };
          this.totalFlagsValue.set(0);
          this.totalFlagsHex.set('0x0');
     }

     public copyPaymentChannelId(txHash: string): void {
          if (!txHash) {
               console.warn('no txHash');
               return;
          }

          navigator.clipboard
               .writeText(txHash)
               .then(() => {
                    this.channelIDField.set(txHash); // always set — remove conditional
                    this.txUiService.showToastMessage?.('Payment Channel Hash copied!');
               })
               .catch(err => console.error('Clipboard copy failed:', err));
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields() {
          this.typedDestination.set('');
          this.selectedDestinationAddress.set('');
          this.channelIDField.set('');
          this.channelClaimSignatureField.set('');
          this.amountField.set('');
          this.destinationTagField.set('');
          this.settleDelayField.set('');
          this.paymentChannelCancelAfterTimeField.set('');
          this.paymentChannelCancelAfterTimeUnit.set('seconds');
          this.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearInputFields() {
          this.txUiService.amountField.set('');
          this.txUiService.destinationTagField.set('');
          this.txUiService.invoiceIdField.set('');
          this.txUiService.sourceTagField.set('');
     }
}
