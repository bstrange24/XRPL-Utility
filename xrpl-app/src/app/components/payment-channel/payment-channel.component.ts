import { Component, OnInit, inject, computed, DestroyRef, signal, ChangeDetectionStrategy, Signal, WritableSignal, effect } from '@angular/core';
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
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, switchMap } from 'rxjs';

interface PaymentChannelObject {
     LedgerEntryType: string;
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
     destination?: string;
     sender?: string;
     settleDelay: string;
     expiration: string;
     status: string;
     canClose: boolean;
     canClaim?: boolean;
     publicKey?: string;
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

     // Destination Dropdown
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');

     // Reactive State (Signals)
     private walletCache = new Map<string, xrpl.Wallet>();
     activeTab = signal<'create' | 'fund' | 'claim' | 'renew' | 'close'>('create');
     isCreatorMode = signal<boolean>(false);
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     paymentChannelCancelAfterTimeField = signal<string>('');
     paymentChannelCancelAfterTimeUnit = signal<string>('seconds');
     channelAction = signal<string>('create');
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
          claimAndClose: false,
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

          return this.allDestinations().map(d => ({
               id: d.address,
               display: d.name ?? 'Unknown Wallet',
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

     private readonly destinationMap = computed(() => {
          return new Map(this.allDestinations().map(d => [d.address, d]));
     });

     destinationDisplay = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return this.destinationSearchQuery();
          return this.dropdownService.formatDisplay(this.destinationMap().get(addr) ?? { address: addr });
     });

     filteredDestinations = computed(() => {
          const q = this.destinationSearchQuery().trim().toLowerCase();
          if (!q) return this.allDestinations();

          const current = this.currentWallet().address;
          return this.allDestinations().filter(d => d.address !== current && (d.address.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q)));
     });

     closeableItems = computed(() => {
          return this.closablePaymentChannels().map(e => {
               const amt = `${(e.totalAmount || '0').split(' ')[0]} XRP Total`;
               const remainingSafe = e.remaining ?? '0'; // fallback if missing
               return {
                    id: e.id?.toString() ?? 'unknown',
                    display: `${amt} → ${remainingSafe} Remaining`,
                    secondary: `Channel ID: ${e.id ?? '?'} • You created`,
               };
          });
     });

     claimItems = computed(() => {
          return this.receivablePaymentChannels().map(e => {
               const amt = `${(e.totalAmount || '0').split(' ')[0]} XRP Total`;
               const remainingSafe = e.remaining ?? '0'; // fallback
               return {
                    id: e.id?.toString() ?? 'unknown',
                    display: `${amt} ← ${remainingSafe} Remaining`,
                    secondary: `Channel ID: ${e.id ?? '?'} • From ${e.sender?.slice(0, 7) + '...' + e.sender?.slice(-7) || 'unknown'}`,
               };
          });
     });

     renewableItems = computed(() => {
          return this.existingPaymentChannels().map(e => {
               const amt = `${(e.totalAmount || '0').split(' ')[0]} XRP Total`;
               const remainingSafe = e.remaining ?? '0';
               return {
                    id: e.id?.toString() ?? 'unknown',
                    display: `${amt} → ${remainingSafe} Remaining`,
                    secondary: `Channel ID: ${e.id ?? '?'} • You created`,
               };
          });
     });

     fundableItems = computed(() => {
          return this.existingPaymentChannels().map(e => {
               const amt = `${(e.totalAmount || '0').split(' ')[0]} XRP`;
               const remainingSafe = e.remaining ?? '0';
               return {
                    id: e.id?.toString() ?? 'unknown',
                    display: `${amt} → ${remainingSafe} Remaining`,
                    secondary: `Channel ID: ${e.id ?? '?'} • You created`,
               };
          });
     });

     selectedClosablePaymentChannelItem = computed(() => {
          const channelId = this.txUiService.channelIDField();
          if (!channelId) return null;
          return this.closeableItems().find(i => i.id === channelId) || null;
     });

     selectedClaimPaymentChannelItem = computed(() => {
          const channelId = this.txUiService.channelIDField()?.toString();
          if (!channelId) return null;
          return this.claimItems().find(i => i.id === channelId) || null;
     });

     selectedRenewPaymentChannelItem = computed(() => {
          const channelId = this.txUiService.channelIDField();
          if (!channelId) return null;
          return this.renewableItems().find(i => i.id === channelId) || null;
     });

     selectedFundPaymentChannelItem = computed(() => {
          const channelId = this.txUiService.channelIDField()?.toString();
          if (!channelId) return null;
          return this.fundableItems().find(i => i.id === channelId) || null;
     });

     onClosePaymentChannelIdSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.txUiService.channelIDField.set('');
               return;
          }

          const paymentChannel = this.closablePaymentChannels().find((e: any) => e.id?.toString() === item.id);

          if (paymentChannel) {
               this.txUiService.channelIDField.set(paymentChannel.id);
          }
     }

     onClaimPaymentChannelIdSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.txUiService.channelIDField.set('');
               return;
          }

          const paymentChannel = this.receivablePaymentChannels().find((e: any) => e.id?.toString() === item.id);

          if (paymentChannel) {
               this.txUiService.channelIDField.set(paymentChannel.id);
          }
     }

     onRenewPaymentChannelIdSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.txUiService.channelIDField.set('');
               return;
          }

          const paymentChannel = this.existingPaymentChannels().find((e: any) => e.id?.toString() === item.id);

          if (paymentChannel) {
               this.txUiService.channelIDField.set(paymentChannel.id);
          }
     }

     onFundPaymentChannelIdSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.txUiService.channelIDField.set('');
               return;
          }

          const paymentChannel = this.existingPaymentChannels().find((e: any) => e.id?.toString() === item.id);

          if (paymentChannel) {
               this.txUiService.channelIDField.set(paymentChannel.id);
          }
     }

     selectedChannelForClaim = computed(() => {
          const channelId = this.txUiService.channelIDField();
          if (!channelId) return null;

          // Look in receivable channels (you're the destination)
          return this.receivablePaymentChannels().find(c => c.id === channelId) || null;
     });

     selectedChannelForRenewOrClose = computed(() => {
          const channelId = this.txUiService.channelIDField();
          if (!channelId) return null;

          // Look in channels you created (you're the source)
          return this.existingPaymentChannels().find(c => c.id === channelId) || null;
     });

     isCurrentWalletDestination = computed(() => {
          const channel = this.selectedChannelForClaim();
          return !!channel && channel.sender !== this.currentWallet().address;
     });

     isCurrentWalletSource = computed(() => {
          const channel = this.selectedChannelForRenewOrClose();
          return !!channel && channel.destination !== this.currentWallet().address; // or check sender if you added it
     });

     hasClaimableChannels = computed(() => this.receivablePaymentChannels().length > 0);
     hasRenewableChannels = computed(() => this.existingPaymentChannels().length > 0);

     selectedClaimChannel = computed(() => {
          const id = this.txUiService.channelIDField();
          return this.receivablePaymentChannels().find(c => c.id === id) ?? null;
     });

     signatureItems = computed(() => {
          return this.existingPaymentChannels().map(e => {
               const amt = `${(e.totalAmount || '0').split(' ')[0]} XRP Total`;
               const remainingSafe = e.remaining ?? '0';
               return {
                    id: e.id?.toString() ?? 'unknown',
                    display: `${amt} → ${remainingSafe} Remaining`,
                    secondary: `Channel ID: ${e.id ?? '?'} • Destination: ${e.destination.slice(0, 7)}...${e.destination.slice(-7)}`,
               };
          });
     });

     selectedSignatureChannelItem = computed(() => {
          const channelId = this.txUiService.channelIDField()?.toString();
          if (!channelId) return null;
          return this.signatureItems().find(i => i.id === channelId) || null;
     });

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

     selectedRenewChannel = computed(() => {
          const id = this.txUiService.channelIDField();
          return this.existingPaymentChannels().find(c => c.id === id) ?? null;
     });

     isValidClaimTab = computed(
          () => this.activeTab() === 'claim' && this.hasClaimableChannels() && !!this.selectedClaimChannel() && this.selectedClaimChannel()!.sender !== this.currentWallet().address // destination = current
     );

     isValidRenewTab = computed(
          () => this.activeTab() === 'renew' && this.hasRenewableChannels() && !!this.selectedRenewChannel() && this.selectedRenewChannel()!.destination !== this.currentWallet().address // source = current
     );

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          // Get correct list per tab
          let channels: any[] = [];
          switch (this.activeTab()) {
               case 'create':
               case 'fund':
               case 'renew':
                    channels = this.existingPaymentChannels();
                    break;
               case 'claim':
                    channels = this.receivablePaymentChannels();
                    break;
               case 'close':
                    channels = this.closablePaymentChannels();
                    break;
          }

          return {
               walletName: wallet.name || wallet.address.slice(0, 10) + '...',
               activeTab: this.activeTab(),
               channelCount: channels.length,
               channelsToShow: channels,
          };
     });

     hasWallets = computed(() => this.wallets().length > 0);

     constructor() {
          super();
          // Auto-select typed address if it's valid and not already selected
          effect(() => {
               const typed = this.destinationSearchQuery().trim();
               const current = this.selectedDestinationAddress();

               if (typed && typed !== current && xrpl.isValidAddress(typed)) {
                    // Only auto-set if it's not already in the list (prevents loop)
                    if (!this.allDestinations().some(d => d.address === typed)) {
                         this.selectedDestinationAddress.set(typed);
                    }
               }
          });
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.txUiService.clearAllOptions();
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.();
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
                    this.txUiService.setInfoMessage('');
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

          this.walletManagerService.selectedIndex$
               .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    switchMap(index => {
                         const wallet = this.wallets()[index];
                         if (!wallet) return EMPTY;

                         this.isCreatorMode.set(false); // reset when switching wallets
                         this.selectWallet(wallet);
                         this.txUiService.clearAllOptionsAndMessages();
                         this.clearInputFields();
                         this.populateDefaultDateTime();
                         return this.getPaymentChannels(true);
                    })
               )
               .subscribe();
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });

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

     toggleFlag(key: 'renew' | 'close' | 'claimAndClose') {
          if (key === 'close') {
               // Do nothing – tfClose is locked
               return;
          }
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          if (this.flags.claimAndClose) sum |= this.flagValues.close;
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
          this.channelAction.set(tab);
          this.isCreatorMode.set(false); // reset when leaving Claim tab
          this.destinationSearchQuery.set('');
          this.clearFlagsValue();
          this.clearFields();
          if (this.hasWallets()) {
               this.populateDefaultDateTime();
               await this.getPaymentChannels(false);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getPaymentChannels(forceRefresh = false): Promise<void> {
          await this.withPerf('getPaymentChannels', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) {
                    throw new Error('Please select a wallet.');
               }

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, paymentChannelObjects] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'payment_channel')]);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.processPaymentChannels(paymentChannelObjects.result.account_objects as PaymentChannelObject[], wallet.classicAddress);

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
                    const [accountInfo, fee, currentLedger, paymentChannelObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'payment_channel')]);

                    const action = this.channelAction();

                    switch (action) {
                         case 'create':
                              await this.createChannel(client, wallet, accountInfo, fee, currentLedger);
                              break;
                         case 'fund':
                              await this.fundChannel(client, wallet, accountInfo, fee, currentLedger);
                              break;
                         case 'claim':
                              await this.claimChannel(client, wallet, accountInfo, fee, currentLedger, paymentChannelObjects);
                              break;
                         case 'renew':
                              await this.renewChannel(client, wallet, accountInfo, fee, currentLedger);
                              break;
                         case 'close':
                              await this.closeChannel(client, wallet, accountInfo, fee, currentLedger, paymentChannelObjects);
                              break;
                    }

                    await this.refreshAfterTx(client, wallet, this.selectedDestinationAddress().trim(), true);
                    if (!this.txUiService.isSimulateEnabled()) this.resetChannelIdSelection();
               } catch (error: any) {
                    console.error('Error in handlePaymentChannelAction:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private async createChannel(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: string, currentLedger: number) {
          let destinationAddress = this.selectedDestinationAddress().trim();
          if (!destinationAddress) {
               // Fallback: allow manual typing from search query if valid
               const typed = this.destinationSearchQuery().trim();
               if (typed && xrpl.isValidAddress(typed)) {
                    destinationAddress = typed;
               }
          }

          if (!destinationAddress || !xrpl.isValidAddress(destinationAddress)) {
               return this.txUiService.setError('Please enter a valid destination address or select one from the dropdown.');
          }

          const inputs = this.txUiService.getValidationInputs({
               wallet: this.currentWallet(),
               network: { accountInfo, fee, currentLedger },
               paymentChannelCreate: { amount: this.txUiService.amountField(), destination: destinationAddress, settleDelay: this.txUiService.settleDelayField() },
               regularKey: { isRegularKey: this.txUiService.isRegularKeyAddress(), address: this.txUiService.regularKeyAddress(), seed: this.txUiService.regularKeySeed() },
          });

          const errors = await this.validationService.validate('PaymentChannelCreate', { inputs, client, accountInfo });
          if (errors.length > 0) {
               return this.txUiService.setError(errors.join('\n• '));
          }

          let paymentChannelCreateTx: any = {
               TransactionType: 'PaymentChannelCreate',
               Account: wallet.classicAddress,
               Amount: xrpl.xrpToDrops(this.txUiService.amountField()),
               Destination: destinationAddress,
               SettleDelay: parseInt(this.txUiService.settleDelayField()),
               PublicKey: wallet.publicKey,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          await this.setTxOptionalFields(client, paymentChannelCreateTx, wallet, accountInfo);

          const result = await this.txExecutor.paymentChannelCreate(paymentChannelCreateTx, wallet, client, {
               useMultiSign: this.txUiService.useMultiSign(),
               isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
               regularKeyAddress: this.txUiService.regularKeyAddress(),
               regularKeySeed: this.txUiService.regularKeySeed(),
               multiSignAddress: this.txUiService.multiSignAddress(),
               multiSignSeeds: this.txUiService.multiSignSeeds(),
          });
          if (!result.success) return this.txUiService.setError(`${result.error}`);
          this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Payment Channel creation successfully!' : 'Payment Channel created successfully!';
     }

     private async fundChannel(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: string, currentLedger: number) {
          const inputs = this.txUiService.getValidationInputs({
               wallet: this.currentWallet(),
               network: { accountInfo, fee, currentLedger },
               paymentChannelFund: { amount: this.txUiService.amountField(), channelIDField: this.txUiService.channelIDField() },
               regularKey: { isRegularKey: this.txUiService.isRegularKeyAddress(), address: this.txUiService.regularKeyAddress(), seed: this.txUiService.regularKeySeed() },
          });

          const errors = await this.validationService.validate('PaymentChannelFund', { inputs, client, accountInfo });
          if (errors.length > 0) {
               return this.txUiService.setError(errors.join('\n• '));
          }

          let paymentChannelFundTx: PaymentChannelFund = {
               TransactionType: 'PaymentChannelFund',
               Account: wallet.classicAddress,
               Channel: this.txUiService.channelIDField(),
               Amount: xrpl.xrpToDrops(this.txUiService.amountField()),
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          await this.setTxOptionalFields(client, paymentChannelFundTx, wallet, accountInfo);

          const result = await this.txExecutor.paymentChannelFundTx(paymentChannelFundTx, wallet, client, {
               useMultiSign: this.txUiService.useMultiSign(),
               isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
               regularKeyAddress: this.txUiService.regularKeyAddress(),
               regularKeySeed: this.txUiService.regularKeySeed(),
               multiSignAddress: this.txUiService.multiSignAddress(),
               multiSignSeeds: this.txUiService.multiSignSeeds(),
          });
          if (!result.success) return this.txUiService.setError(`${result.error}`);
          this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Payment Channel funding successfully!' : 'Funded Payment Channel successfully!';
     }

     private async claimChannel(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: string, currentLedger: number, paymentChannelObjects: any) {
          // Claim requires signature
          if (!this.isValidClaimTab()) {
               return this.txUiService.setError('Invalid claim setup. Ensure you are the destination and a channel is selected.');
          }

          if (!this.isCurrentWalletDestination()) {
               return this.txUiService.setError('You can only claim from a payment channel if you are the destination account.');
          }

          // const inputs = this.txUiService.getValidationInputs({
          //      wallet: this.currentWallet(),
          //      network: { accountInfo, fee, currentLedger },
          //      paymentChannelFund: { amount: this.txUiService.amountField(), channelIDField: this.txUiService.channelIDField() },
          //      regularKey: { isRegularKey: this.txUiService.isRegularKeyAddress(), address: this.txUiService.regularKeyAddress(), seed: this.txUiService.regularKeySeed() },
          // });

          // const errors = await this.validationService.validate('PaymentChannelClaim', { inputs, client, accountInfo });
          // if (errors.length > 0) {
          //      return this.txUiService.setError(errors.join('\n• '));
          // }

          const authorizedWallet = await this.getPaymentChannelAuthorizedWallet(this.txUiService.authorizedWalletAddress());
          const [signatureVerified] = await Promise.all([this.xrplService.getChannelVerifiy(client, this.txUiService.channelIDField(), this.txUiService.amountField(), this.txUiService.publicKeyField(), this.txUiService.channelClaimSignatureField()), this.xrplService.getPaymentChannelAuthorized(client, this.txUiService.channelIDField(), this.txUiService.amountField(), authorizedWallet)]);

          const channels = paymentChannelObjects.result.account_objects as PaymentChannelObject[];
          const channel = channels.find(c => c.index === this.txUiService.channelIDField());
          if (!channel) {
               return this.txUiService.setError(`Payment channel ${this.txUiService.channelIDField()} not found`);
          }

          if (!signatureVerified.result.signature_verified) {
               return this.txUiService.setError('Invalid signature');
          }

          let paymentChannelClaimTx: PaymentChannelClaim = {
               TransactionType: 'PaymentChannelClaim',
               Account: wallet.classicAddress,
               Channel: this.txUiService.channelIDField(),
               Balance: xrpl.xrpToDrops(this.txUiService.amountField() || '0'),
               Signature: this.txUiService.channelClaimSignatureField(),
               PublicKey: this.txUiService.publicKeyField() || wallet.publicKey,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               Flags: this.flags.close ? xrpl.PaymentChannelClaimFlags.tfClose : undefined, // optional tfClose if you allow it
          };

          await this.setTxOptionalFields(client, paymentChannelClaimTx, wallet, accountInfo);

          const result = await this.txExecutor.paymentChannelClaimTx(paymentChannelClaimTx, wallet, client, {
               useMultiSign: this.txUiService.useMultiSign(),
               isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
               regularKeyAddress: this.txUiService.regularKeyAddress(),
               regularKeySeed: this.txUiService.regularKeySeed(),
               multiSignAddress: this.txUiService.multiSignAddress(),
               multiSignSeeds: this.txUiService.multiSignSeeds(),
          });

          if (!result.success) return this.txUiService.setError(`${result.error}`);
          this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated claim successfully!' : 'Claim submitted successfully!';
     }

     private async renewChannel(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: string, currentLedger: number) {
          // Source-only, no signature required
          if (!this.isValidRenewTab()) {
               return this.txUiService.setError('Invalid renew setup. Ensure you are the source/creator and a channel is selected.');
          }

          if (!this.isCurrentWalletSource()) {
               return this.txUiService.setError('You can only renew a payment channel if you are the creator (source) of the channel.');
          }

          // Renew typically uses PaymentChannelClaim with tfRenew (source resets expiration)
          let paymentChannelClaimTx: PaymentChannelClaim = {
               TransactionType: 'PaymentChannelClaim',
               Account: wallet.classicAddress,
               Channel: this.txUiService.channelIDField(),
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               Flags: xrpl.PaymentChannelClaimFlags.tfRenew, // always set for renew
          };

          // No Balance, Signature, or PublicKey needed for pure renew
          await this.setTxOptionalFields(client, paymentChannelClaimTx, wallet, accountInfo);

          const result = await this.txExecutor.paymentChannelClaimTx(paymentChannelClaimTx, wallet, client, {
               useMultiSign: this.txUiService.useMultiSign(),
               isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
               regularKeyAddress: this.txUiService.regularKeyAddress(),
               regularKeySeed: this.txUiService.regularKeySeed(),
               multiSignAddress: this.txUiService.multiSignAddress(),
               multiSignSeeds: this.txUiService.multiSignSeeds(),
          });

          if (!result.success) return this.txUiService.setError(`${result.error}`);
          this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated renew successfully!' : 'Channel renewed successfully!';
     }

     private async closeChannel(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: string, currentLedger: number, paymentChannelObjects: any) {
          const inputs = this.txUiService.getValidationInputs({
               wallet: this.currentWallet(),
               network: { accountInfo, fee, currentLedger },
               paymentChannelClose: { channelIDField: this.txUiService.channelIDField() },
               regularKey: { isRegularKey: this.txUiService.isRegularKeyAddress(), address: this.txUiService.regularKeyAddress(), seed: this.txUiService.regularKeySeed() },
          });

          const errors = await this.validationService.validate('PaymentChannelClose', { inputs, client, accountInfo });
          if (errors.length > 0) {
               return this.txUiService.setError(errors.join('\n• '));
          }

          const channels = paymentChannelObjects.result.account_objects as PaymentChannelObject[];
          const channel = channels.find(c => c.index === this.txUiService.channelIDField());
          if (!channel) {
               return this.txUiService.setError(`Payment channel ${this.txUiService.channelIDField} not found`);
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
               Channel: this.txUiService.channelIDField(),
               Flags: xrpl.PaymentChannelClaimFlags.tfClose,
               Fee: fee,
               LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          await this.setTxOptionalFields(client, paymentChannelClaimTx, wallet, accountInfo);

          const result = await this.txExecutor.paymentChannelClaimTx(paymentChannelClaimTx, wallet, client, {
               useMultiSign: this.txUiService.useMultiSign(),
               isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
               regularKeyAddress: this.txUiService.regularKeyAddress(),
               regularKeySeed: this.txUiService.regularKeySeed(),
               multiSignAddress: this.txUiService.multiSignAddress(),
               multiSignSeeds: this.txUiService.multiSignSeeds(),
          });
          if (!result.success) return this.txUiService.setError(`${result.error}`);
          this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Closing Payment Channel successfully!' : 'Closed Payment Channel successfully!';
     }

     private processPaymentChannels(objects: PaymentChannelObject[], classicAddress: string) {
          const nowUnix = Math.floor(Date.now() / 1000);

          const existing: UnifiedPaymentChannel[] = [];
          const receivable: UnifiedPaymentChannel[] = [];
          const closable: UnifiedPaymentChannel[] = [];

          for (const obj of objects) {
               if (obj.LedgerEntryType !== 'PayChannel') continue;

               // Use BigInt for exact arithmetic — avoids floating-point issues
               const totalDrops = BigInt(obj.Amount || '0');
               const balanceDrops = BigInt(obj.Balance || '0');
               const remainingDrops = totalDrops - balanceDrops;

               // Convert once — reuse strings
               const totalXrp = xrpl.dropsToXrp(totalDrops.toString());
               const balanceXrp = xrpl.dropsToXrp(balanceDrops.toString());
               const remainingXrp = remainingDrops > 0n ? xrpl.dropsToXrp(remainingDrops.toString()) : '0';

               // Handle both Expiration and CancelAfter (XRPL allows either/both)
               const expirationRipple = obj.Expiration ?? obj.CancelAfter;
               const expirationUnix = expirationRipple ? Number(expirationRipple) + 946684800 : null;
               const isExpired = expirationUnix ? nowUnix >= expirationUnix : false; // >= to be safe

               // Shared base properties
               const base: Partial<UnifiedPaymentChannel> = {
                    id: obj.index,
                    totalAmount: `${totalXrp} XRP`,
                    balance: `${balanceXrp} XRP`,
                    remaining: `${remainingXrp} XRP`,
                    settleDelay: obj.SettleDelay.toString(),
                    expiration: expirationUnix ? new Date(expirationUnix * 1000).toLocaleString() : '—',
               };

               // === Source / Creator channels ===
               if (obj.Account === classicAddress) {
                    const status = isExpired ? 'Expired' : remainingDrops === 0n ? 'Fully Claimed' : 'Open';

                    const entry: UnifiedPaymentChannel = {
                         ...(base as UnifiedPaymentChannel),
                         destination: obj.Destination,
                         publicKey: obj.PublicKey,
                         status,
                         canClose: status !== 'Open' || isExpired,
                    };

                    existing.push(entry);

                    // Source can always close (subject to settle delay if unclaimed)
                    closable.push(entry);
               }

               // === Destination / Receivable channels ===
               if (obj.Destination === classicAddress) {
                    const status = isExpired ? 'Expired' : remainingDrops > 0n ? 'Claimable' : 'Fully Claimed';

                    const entry: UnifiedPaymentChannel = {
                         ...(base as UnifiedPaymentChannel),
                         sender: obj.Account,
                         status,
                         canClaim: !isExpired && remainingDrops > 0n,
                    };

                    receivable.push(entry);

                    // Optional: destination can close if fully claimed/expired (rare, but valid)
                    if (remainingDrops === 0n || isExpired) {
                         closable.push({ ...entry, canClose: true });
                    }
               }
          }

          // Optional: sort by remaining amount descending (nice UX)
          const sortByRemaining = (a: UnifiedPaymentChannel, b: UnifiedPaymentChannel) => Number(b.remaining.split(' ')[0]) - Number(a.remaining.split(' ')[0]);

          existing.sort(sortByRemaining);
          receivable.sort(sortByRemaining);
          closable.sort(sortByRemaining);

          // Debug logging (remove in production or make conditional)
          console.group('Payment Channels Processed');
          console.log('Created (source):', existing.length);
          console.log('Receivable (dest):', receivable.length);
          console.log('Closable:', closable.length);
          console.groupEnd();

          this.existingPaymentChannels.set(existing);
          this.receivablePaymentChannels.set(receivable);
          this.closablePaymentChannels.set(closable);
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
                    const wallet = await this.getWallet();
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
                    throw new Error('Invalid channelID: must be a 64-character hexadecimal string');
               }

               if (!amountXRP || amountXRP.toString().trim() === '') {
                    throw new Error('Invalid amountXRP: must be a valid number or string');
               }
               const amountDrops = xrpl.xrpToDrops(amountXRP);
               if (isNaN(parseFloat(this.txUiService.amountField())) || parseFloat(this.txUiService.amountField()) <= 0) {
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

     private walletKey = computed(() => `${this.currentWallet().seed}:${this.currentWallet().encryptionAlgorithm}`);

     private async getWallet(): Promise<xrpl.Wallet> {
          const key = this.walletKey();
          if (this.walletCache.has(key)) {
               console.log('Using cached wallet for seed with key', key);
               return this.walletCache.get(key)!;
          }

          console.log('Creating wallet for seed with encryption algorithm', this.currentWallet().encryptionAlgorithm);
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');

          if (!wallet) throw new Error('Wallet could not be created');

          this.walletCache.set(key, wallet);
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

          if (this.txUiService.publicKeyField()) this.utilsService.setPublicKey(paymentChannelTx, this.txUiService.publicKeyField());

          // if (this.paymentChannelCancelAfterTimeField() && (this.channelAction() === 'fund' || this.channelAction() === 'claim' || this.channelAction() === 'create')) {
          //      const cancelAfterTime = this.utilsService.toRippleTime(this.paymentChannelCancelAfterTimeField());
          //      const currentLedgerTime = await this.xrplService.getLedgerCloseTime(client);
          //      if (cancelAfterTime <= currentLedgerTime) {
          //           return this.txUiService.setError('Cancel After time must be in the future');
          //      }
          //      this.utilsService.setCancelAfter(paymentChannelTx, cancelAfterTime);
          // }

          // if (this.paymentChannelCancelAfterTimeField() && this.channelAction() === 'fund') {
          //      const newExpiration = this.utilsService.addTime(this.paymentChannelCancelAfterTimeField(), this.paymentChannelCancelAfterTimeUnit() as 'seconds' | 'minutes' | 'hours' | 'days');
          //      const currentLedgerTime = await this.xrplService.getLedgerCloseTime(client);
          //      if (newExpiration <= currentLedgerTime) {
          //           return this.txUiService.setError('New expiration time must be in the future');
          //      }
          //      this.utilsService.setExpiration(paymentChannelTx, newExpiration);
          // }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const [{ accountInfo, accountObjects }, paymentChannelObjects] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, true), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'payment_channel')]);
          this.processPaymentChannels(paymentChannelObjects.result.account_objects as PaymentChannelObject[], wallet.classicAddress);
          this.walletPaymentChannelCount.set(paymentChannelObjects.result.account_objects.length);

          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          this.addCustomDestination(addDest, destination);
          this.refreshUiState(wallet, accountInfo, accountObjects);
          this.txUiService.clearAllOptions();
     }

     private addCustomDestination(addDest: boolean, destination: string | null) {
          if (addDest && destination) {
               const addr = destination.trim();

               if (xrpl.isValidAddress(addr)) {
                    // Add to custom list if not already present
                    const exists = this.allDestinations().some(d => d.address === addr);
                    if (!exists) {
                         this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: addr }]);
                         this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
                         this.updateDestinations();
                    }

                    // Force select it (so next send starts with it pre-selected)
                    this.selectedDestinationAddress.set(addr);

                    // Clear typing state so display shows nice formatted name
                    this.destinationSearchQuery.set('');
               }
          }
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

     private readonly allDestinations = computed(() => {
          const wallets = this.wallets().map(w => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
               source: 'wallet' as const,
          }));

          return [...wallets, ...this.customDestinations()];
     });

     private ensureDefaultAuthorizedWallet() {
          if (this.wallets().length <= 1) {
               this.txUiService.authorizedWalletAddress.set('');
               return;
          }
          const currentAddress = this.currentWallet().address;
          if (!this.txUiService.authorizedWalletAddress || this.txUiService.authorizedWalletAddress() === currentAddress) {
               // Find a valid non-current address
               const nonSelectedWallet = this.wallets().find((w: { address: string }) => w.address !== currentAddress);
               this.txUiService.authorizedWalletAddress.set(nonSelectedWallet ? nonSelectedWallet.address : this.wallets()[0].address);
          }
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
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

     private resetChannelIdSelection() {
          this.txUiService.channelIDField.set('');
     }

     clearFlagsValue() {
          this.flags = { renew: false, close: true, claimAndClose: false };
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
                    this.txUiService.channelIDField.set(txHash); // always set — remove conditional
                    this.txUiService.showToastMessage?.('Payment Channel Hash copied!');
               })
               .catch(err => console.error('Clipboard copy failed:', err));
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields() {
          this.paymentChannelCancelAfterTimeField.set('');
          this.paymentChannelCancelAfterTimeUnit.set('seconds');
          this.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearInputFields() {
          this.selectedDestinationAddress.set('');
          this.txUiService.channelIDField.set('');
          this.txUiService.channelClaimSignatureField.set('');
          this.txUiService.settleDelayField.set('');
          this.txUiService.amountField.set('');
          this.txUiService.destinationTagField.set('');
          this.txUiService.invoiceIdField.set('');
          this.txUiService.sourceTagField.set('');
     }
}
