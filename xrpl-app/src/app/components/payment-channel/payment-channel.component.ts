import { Component, OnInit, inject, computed, DestroyRef, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { UtilsService } from '../../services/util-service/utils.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, from, switchMap } from 'rxjs';
import { PaymentChannelObject, UnifiedPaymentChannel } from '../../models/interface-items.model';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { PaymentChannelUtilService } from '../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { PaymentChannelOrchestratorService } from '../../services/payment-channel/payment-channel-orchestrator/payment-channel-orchestrator.service';
import { DropdownItem } from '../../models/dropdown-item.model';

@Component({
     selector: 'app-account',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [
          trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])]),
          trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(-20px)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))])]),
     ],
     templateUrl: './payment-channel.component.html',
     styleUrl: './payment-channel.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePaymentChannelComponent extends PerformanceBaseComponent implements OnInit {
     private readonly destroyRef = inject(DestroyRef);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly paymentChannelOrchestratorService = inject(PaymentChannelOrchestratorService);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');

     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     activeTab = signal<'create' | 'fund' | 'claim' | 'renew' | 'close'>('create');
     isCreatorMode = signal<boolean>(false);

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     readonly currentAddress = computed(() => this.currentWallet().address);
     private readonly hasWallets = computed(() => this.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');
     readonly hasWalletsSignal = toSignal(this.walletManagerService.hasWallets$, { initialValue: false });
     private readonly selectedChannelId = computed(() => this.txUiService.channelIDField()?.toString() ?? '');

     selectedChannelForClaim = computed(() => {
          const id = this.txUiService.channelIDField();
          if (!id) return null;
          return this.paymentChannelUtilService.receivablePaymentChannels().find(ch => ch.id === id) ?? null;
     });

     selectedChannelForRenewOrClose = computed(() => this.paymentChannelUtilService.existingChannelMap().get(this.selectedChannelId()) ?? null);

     isCurrentWalletDestination = computed(() => {
          const c = this.selectedChannelForClaim();
          return !!c && c.sender !== this.currentWallet().address;
     });

     isCurrentWalletSource = computed(() => {
          const c = this.selectedChannelForRenewOrClose();
          return !!c && c.destination !== this.currentWallet().address;
     });

     hasClaimableChannels = computed(() => this.paymentChannelUtilService.receivablePaymentChannels().length > 0);
     hasRenewableChannels = computed(() => this.paymentChannelUtilService.existingPaymentChannels().length > 0);

     isValidClaimTab = computed(
          () => this.activeTab() === 'claim' && this.hasClaimableChannels() && !!this.selectedChannelForClaim() && this.selectedChannelForClaim()!.sender !== this.currentWallet().address // destination = current
     );

     isValidRenewTab = computed(
          () => this.activeTab() === 'renew' && this.hasRenewableChannels() && !!this.selectedChannelForRenewOrClose() && this.selectedChannelForRenewOrClose()!.destination !== this.currentWallet().address // source = current
     );

     selectedChannel = computed(() => {
          const id = this.txUiService.channelIDField();
          if (!id) return null;

          const tab = this.activeTab();

          let list: UnifiedPaymentChannel[] = [];
          if (tab === 'claim') list = this.paymentChannelUtilService.receivablePaymentChannels();
          else if (tab === 'fund' || tab === 'renew') list = this.paymentChannelUtilService.existingPaymentChannels();
          else if (tab === 'close') list = this.paymentChannelUtilService.closablePaymentChannels();

          return list.find(ch => ch.id === id) ?? null;
     });

     selectedIsExpired = computed(() => !!this.selectedChannel()?.isExpired);

     // Unified dropdown items
     channelItems = computed(() => {
          const tab = this.activeTab();

          // Claim tab is special: depends on creator/normal mode
          if (tab === 'claim') {
               if (this.isCreatorMode()) {
                    // Generate Signature (as Creator): show your OWN created channels
                    return this.paymentChannelUtilService.existingPaymentChannels().map(e => this.paymentChannelUtilService.formatChannelItem(e, '→', 'You created'));
               } else {
                    // Normal Claim (as Destination): show receivable/claimable channels
                    return this.paymentChannelUtilService.receivablePaymentChannels().map(e => this.paymentChannelUtilService.formatChannelItem(e, '←', `From ${e.sender?.slice(0, 7)}...${e.sender?.slice(-7) ?? 'unknown'}`));
               }
          }

          // Other tabs (fund, renew, close) - no mode switch needed
          if (tab === 'fund' || tab === 'renew') {
               return this.paymentChannelUtilService.existingPaymentChannels().map(e => this.paymentChannelUtilService.formatChannelItem(e, '→', 'You created'));
          }
          if (tab === 'close') {
               return this.paymentChannelUtilService.closablePaymentChannels().map(e => this.paymentChannelUtilService.formatChannelItem(e, '→', 'You created'));
          }

          // Fallback for create or unknown
          return [];
     });

     // Optional: per-tab booleans if needed (but usually not)
     selectedClaimIsExpired = computed(() => this.activeTab() === 'claim' && this.selectedIsExpired());
     selectedFundIsExpired = computed(() => this.activeTab() === 'fund' && this.selectedIsExpired());
     selectedRenewIsExpired = computed(() => this.activeTab() === 'renew' && this.selectedIsExpired());

     selectedChannelItem = computed(() => {
          const id = this.txUiService.channelIDField();
          return this.channelItems().find(i => i.id === id) ?? null;
     });

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';

          let channels: any[] = [];
          const tab = this.activeTab();

          if (tab === 'claim') {
               // Special case: switch based on creator mode
               if (this.isCreatorMode()) {
                    // Creator mode: show your OWN created channels
                    channels = this.paymentChannelUtilService.existingPaymentChannels();
               } else {
                    // Normal mode: show receivable/claimable
                    channels = this.paymentChannelUtilService.receivablePaymentChannels();
               }
          } else if (tab === 'fund' || tab === 'renew') {
               channels = this.paymentChannelUtilService.existingPaymentChannels();
          } else if (tab === 'close') {
               channels = this.paymentChannelUtilService.closablePaymentChannels();
          } else {
               // create fallback
               channels = this.paymentChannelUtilService.existingPaymentChannels();
          }

          const channelsToShow = channels.map(ch => ({
               ...ch,
               isExpired: !!ch.isExpired,
          }));

          return {
               walletName,
               activeTab: tab,
               channelCount: channels.length,
               channelsToShow,
          };
     });

     constructor() {
          super();
          // Auto-select typed address if it's valid and not already selected
          effect(() => {
               const typed = this.destinationSearchQuery().trim();
               const current = this.selectedDestinationAddress();

               if (typed && typed !== current && xrpl.isValidAddress(typed)) {
                    if (!this.allDestinations().some(d => d.address === typed)) {
                         this.selectedDestinationAddress.set(typed);
                    }
               }
          });

          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.transactionDropdownService.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.txUiService.clearAllOptions();
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
               if (this.hasWallets() && !this.currentAddress()) {
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
                         return from(this.getPaymentChannels(false));
                    })
               )
               .subscribe();
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
          this.populateDefaultDateTime();
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

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     toggleCreatorMode(input: HTMLInputElement): void {
          this.isCreatorMode.set(input.checked);
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     async setTab(tab: 'create' | 'close' | 'claim' | 'renew' | 'fund'): Promise<void> {
          this.activeTab.set(tab);
          this.isCreatorMode.set(false); // reset when leaving Claim tab
          this.destinationSearchQuery.set('');
          this.paymentChannelUtilService.clearFlagsValue();
          this.clearFields();
          if (this.hasWallets()) {
               await this.getPaymentChannels(false);
               this.populateDefaultDateTime();
          }
     }

     async getPaymentChannels(forceRefresh = false): Promise<void> {
          await this.measure('getPaymentChannels', true, async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.resetCurrentStepToIdle();

               if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) {
                    return this.toastService.error('Please select a wallet.');
               }

               try {
                    const { wallet, accountInfo, accountObjects, paymentChannelObjects } = await this.measure('getPaymentChannels:prepareTxEnvironment', true, async () =>
                         this.txEnvironmentService.prepareTxEnvironment({
                              includeAccountInfo: true,
                              includeAccountObject: true,
                              includePaymentChannelObjects: true,
                              forceRefresh: forceRefresh,
                         })
                    );

                    if (!accountInfo || !accountObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    await this.measure('getPaymentChannels:processAndUpdate', true, async () => {
                         this.paymentChannelUtilService.processPaymentChannels(paymentChannelObjects.result.account_objects as PaymentChannelObject[], wallet.classicAddress);
                         this.paymentChannelUtilService.walletPaymentChannelCount.set(paymentChannelObjects.result.account_objects.length);
                         this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
                    });
               } catch (error: any) {
                    console.error('Error in getPaymentChannels:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async handlePaymentChannelAction() {
          await this.withPerf('handlePaymentChannelAction', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const action = this.activeTab();

                    const destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

                    if (action === 'create') {
                         if (!destinationAddress) {
                              return this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                         }
                    }

                    const env = await this.measure(
                         'handlePaymentChannelAction:prepareTxEnvironment',
                         false,
                         async () =>
                              await this.txEnvironmentService.prepareTxEnvironment({
                                   includeAccountInfo: true,
                                   includeAccountObject: true,
                                   includeFee: true,
                                   includeLedgerIndex: true,
                                   includeDestinationAccountInfo: true,
                                   includePaymentChannelObjects: true,
                                   destinationAddress,
                              })
                    );

                    const { client, wallet, accountInfo, accountObjects, paymentChannelObjects, destinationAccountInfo, fee, currentLedger } = env;

                    if (!accountInfo || !accountObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    switch (action) {
                         case 'create':
                              await this.createChannel(client, wallet, accountInfo, accountObjects, fee!, currentLedger!, destinationAddress, destinationAccountInfo);
                              break;
                         case 'fund':
                              await this.fundChannel(client, wallet, accountInfo, fee!, currentLedger!);
                              break;
                         case 'claim':
                              await this.claimChannel(client, wallet, accountInfo, fee!, currentLedger!, paymentChannelObjects);
                              break;
                         case 'renew':
                              await this.renewChannel(client, wallet, accountInfo, fee!, currentLedger!);
                              break;
                         case 'close':
                              await this.closeChannel(client, wallet, accountInfo, fee!, currentLedger!, paymentChannelObjects);
                              break;
                    }

                    await this.refreshAfterTx(env.client, env.wallet, this.selectedDestinationAddress().trim(), true);
                    if (!this.txUiService.isSimulateEnabled()) this.paymentChannelUtilService.resetChannelIdSelection();
               } catch (error: any) {
                    console.error('Error in handlePaymentChannelAction:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     private async createChannel(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, accountObjects: any, fee: string, currentLedger: number, destinationAddress: string, destinationAccountInfo: any) {
          await this.withPerf('createChannel', async () => {
               const result = await this.paymentChannelOrchestratorService.executePaymentChannelTx('create', {
                    wallet: this.currentWallet(),
                    formValues: {
                         ...this.paymentChannelUtilService.getTransactionValues(),
                         destinationAddress,
                    },
                    extra: {},
                    preFetchedEnv: {
                         client,
                         accountInfo,
                         accountObjects,
                         fee: fee,
                         currentLedger: currentLedger,
                         destinationAccountInfo,
                         wallet: wallet,
                    },
               });

               if (!result.success) {
                    this.toastService.error(result.error || 'Failed to create payment channel');
                    return;
               }

               await this.refreshAfterTx(client, wallet, destinationAddress, true);
          });
     }

     private async fundChannel(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: string, currentLedger: number) {
          await this.withPerf('fundChannel', async () => {
               const result = await this.paymentChannelOrchestratorService.executePaymentChannelTx('fund', {
                    wallet: this.currentWallet(),
                    formValues: {
                         ...this.paymentChannelUtilService.getTransactionValues(),
                    },
                    extra: {},
                    preFetchedEnv: {
                         client,
                         accountInfo,
                         fee: fee,
                         currentLedger: currentLedger,
                         wallet: wallet,
                    },
               });

               if (!result.success) {
                    this.toastService.error(result.error || 'Failed to create payment channel');
                    return;
               }

               await this.refreshAfterTx(client, wallet, null, true);
          });
     }

     private async claimChannel(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: string, currentLedger: number, paymentChannelObjects: any) {
          await this.withPerf('claimChannel', async () => {
               const { amount, channelIDField, publicKeyField, channelClaimSignatureField } = this.paymentChannelUtilService.getTransactionValues();
               if (!this.isValidClaimTab()) {
                    return this.toastService.error('Invalid claim setup. Ensure you are the destination and a channel is selected.');
               }

               if (!this.isCurrentWalletDestination()) {
                    return this.toastService.error('You can only claim from a payment channel if you are the destination account.');
               }

               const requestedDrops = xrpl.xrpToDrops(amount || '0');
               const channelExist = (paymentChannelObjects.result.account_objects as PaymentChannelObject[]).find(c => c.index === channelIDField);

               if (!channelExist) {
                    return this.toastService.error(`Payment channel ${channelIDField} not found`);
               }

               const remainingDrops = BigInt(channelExist.Amount || '0') - BigInt(channelExist.Balance || '0');
               if (BigInt(requestedDrops) > remainingDrops) {
                    return this.toastService.error(`Claim amount exceeds remaining (${xrpl.dropsToXrp(remainingDrops.toString())} XRP)`);
               }

               // Measure signature verification – this usually involves a network call to the ledger
               const signatureVerified = await this.measure('claimChannel:verifySignature', false, () => this.xrplService.getChannelVerifiy(client, channelIDField, amount, publicKeyField, channelClaimSignatureField));

               if (!signatureVerified.result.signature_verified) {
                    return this.toastService.error('Invalid signature');
               }

               const result = await this.paymentChannelOrchestratorService.executePaymentChannelTx('claim', {
                    wallet: this.currentWallet(),
                    formValues: {
                         ...this.paymentChannelUtilService.getTransactionValues(),
                    },
                    extra: {},
                    preFetchedEnv: {
                         client,
                         accountInfo,
                         fee: fee,
                         currentLedger: currentLedger,
                         wallet: wallet,
                    },
               });

               if (!result.success) {
                    this.toastService.error(result.error || 'Failed to create payment channel');
                    return;
               }

               await this.refreshAfterTx(client, wallet, null, true);
          });
     }

     private async renewChannel(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: string, currentLedger: number) {
          await this.withPerf('renewChannel', async () => {
               if (!this.isValidRenewTab()) {
                    return this.toastService.error('Invalid renew setup. Ensure you are the source/creator and a channel is selected.');
               }

               if (!this.isCurrentWalletSource()) {
                    return this.toastService.error('You can only renew a payment channel if you are the creator (source) of the channel.');
               }

               const result = await this.paymentChannelOrchestratorService.executePaymentChannelTx('renew', {
                    wallet: this.currentWallet(),
                    formValues: {
                         ...this.paymentChannelUtilService.getTransactionValues(),
                    },
                    extra: {},
                    preFetchedEnv: {
                         client,
                         accountInfo,
                         fee: fee,
                         currentLedger: currentLedger,
                         wallet: wallet,
                    },
               });

               if (!result.success) {
                    this.toastService.error(result.error || 'Failed to create payment channel');
                    return;
               }

               await this.refreshAfterTx(client, wallet, null, true);
          });
     }

     private async closeChannel(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: string, currentLedger: number, paymentChannelObjects: any) {
          await this.withPerf('closeChannel', async () => {
               const { channelIDField } = this.paymentChannelUtilService.getTransactionValues();
               const channels = paymentChannelObjects.result.account_objects as PaymentChannelObject[];
               const channel = channels.find(c => c.index === channelIDField);
               if (!channel) {
                    return this.toastService.error(`Payment channel ${channelIDField} not found`);
               }

               let isOwnerCancelling = wallet.classicAddress === channel.Account;

               // Measure ledger close time fetch (network call)
               const currentLedgerTime = await this.measure('closeChannel:getLedgerCloseTime', false, () => this.xrplService.getLedgerCloseTime(client));

               if (channel.Expiration && channel.Expiration > currentLedgerTime) {
                    return this.toastService.error('Cannot close channel before expiration');
               }

               const hasChannelExpired = this.paymentChannelUtilService.checkChannelExpired(channel);

               const ownerCancelling = !!isOwnerCancelling;
               const expired = !!hasChannelExpired;

               if (!ownerCancelling && !expired) {
                    const amount = BigInt(channel.Amount ?? '0');
                    const balance = BigInt(channel.Balance ?? '0');
                    const remaining = amount - balance;
                    if (remaining > 0n) {
                         return this.toastService.error(`Cannot close channel with non-zero balance. ${xrpl.dropsToXrp(remaining.toString())} XRP still available to claim.`);
                    }
               }

               const result = await this.paymentChannelOrchestratorService.executePaymentChannelTx('close', {
                    wallet: this.currentWallet(),
                    formValues: {
                         ...this.paymentChannelUtilService.getTransactionValues(),
                    },
                    extra: {},
                    preFetchedEnv: {
                         client,
                         accountInfo,
                         fee: fee,
                         currentLedger: currentLedger,
                         wallet: wallet,
                    },
               });

               if (!result.success) {
                    this.toastService.error(result.error || 'Failed to close payment channel');
                    return;
               }

               await this.refreshAfterTx(client, wallet, null, true);
          });
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const [{ accountInfo, accountObjects }, paymentChannelObjects] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, true), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'payment_channel')]);
          this.paymentChannelUtilService.processPaymentChannels(paymentChannelObjects.result.account_objects as PaymentChannelObject[], wallet.classicAddress);
          this.paymentChannelUtilService.walletPaymentChannelCount.set(paymentChannelObjects.result.account_objects.length);

          await this.refreshWallets(client, destination ? [wallet.classicAddress, destination] : [wallet.classicAddress]);
          this.addCustomDestination(addDest, destination);
          this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
          this.txUiService.clearAllOptions();
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     private addCustomDestination(addDest: boolean, destination: string | null) {
          if (addDest && destination) {
               const addr = destination.trim();
               if (xrpl.isValidAddress(addr)) {
                    const added = this.transactionDropdownService.addCustomIfNewAndSelect(destination, this.destinationMap, this.selectedDestinationAddress, this.destinationSearchQuery);
                    if (added) {
                         console.log('Custom added via service');
                    }
               }
          }
     }

     addCancelAfterToExpiration(seconds: number): void {
          this.utilsService.addToDateTimeField(this.txUiService.paymentChannelCancelAfterTimeField, this.txUiService.paymentChannelCancelAfterTimeField, seconds);
     }

     setCancelAfterExpirationToNow() {
          this.txUiService.paymentChannelCancelAfterTimeField.set(this.utilsService.setDateTimeFieldToNow());
     }

     populateDefaultDateTime() {
          this.txUiService.paymentChannelCancelAfterTimeField.set('');
     }

     async generateCreatorClaimSignature() {
          this.paymentChannelUtilService.generateCreatorClaimSignature(this.currentWallet());
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields() {
          this.txUiService.paymentChannelCancelAfterTimeField.set('');
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
