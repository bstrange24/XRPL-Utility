import { Component, OnInit, inject, computed, signal, ChangeDetectionStrategy, effect, ChangeDetectorRef } from '@angular/core';
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
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { EscrowDisplayItem, EscrowObject } from '../../models/interface-items.model';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { CheckUtilService } from '../../services/checks/check-util/check-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { MptUtilService } from '../../services/mpt-service/mpt-util/mpt-util.service';
import { EscrowUtilService } from '../../services/escrow/escrow-util/escrow-util.service';
import { TimeBasedEscrowOrchestrator } from '../../services/escrow/escrow-orchestrator/escrow-orchestrator.service';
import * as cc from 'five-bells-condition';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { EscrowCancelItemComponent } from '../time-escrow/ui-components/escrow-cancel-item/escrow-cancel-item.component';
import { EscrowCreateItemComponent } from '../time-escrow/ui-components/escrow-create-item/escrow-create-item.component';
import { EscrowFinishItemComponent } from '../time-escrow/ui-components/escrow-finish-item/escrow-finish-item.component';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';

@Component({
     selector: 'app-conditional-escrow',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, SelectSearchDropdownComponent, EscrowCreateItemComponent, EscrowFinishItemComponent, EscrowCancelItemComponent],
     animations: [
          trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])]),
          trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(-20px)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))])]),
     ],
     templateUrl: './conditional-escrow.component.html',
     styleUrl: './conditional-escrow.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateConditionalEscrowComponent extends PerformanceBaseComponent implements OnInit {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly timeBasedEscrowOrchestrator = inject(TimeBasedEscrowOrchestrator);
     private readonly walletManager = inject(WalletManagerService);
     private readonly cdr = inject(ChangeDetectorRef);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');

     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal<boolean>(false);
     activeTab = signal<'create' | 'finish' | 'cancel'>('create');

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.trustlineCurrencyService.currencyBalance;

     isMptEnabled = signal<boolean>(false);

     expiredOrFulfilledEscrows = signal<any[]>([]);
     allEscrowsRaw = signal<any[]>([]); // holds raw escrow objects from ledger
     finishEscrow = signal<any[]>([]);
     existingEscrow = signal<any[]>([]);
     existingIOUs = signal<any[]>([]);
     existingMpts = signal<any[]>([]);

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     private readonly createEscrowSpecificKeys = ['amountField', 'escrowFinishTimeField', 'escrowCancelTimeField', 'finishAfter', 'cancelAfter'] as const;
     private readonly finishEscrowSpecificKeys = ['escrowSequenceNumberField', 'escrowOwnerField'] as const;
     private readonly cancelEscrowSpecificKeys = ['escrowSequenceNumberField'] as const;
     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');

     // Has wallets → warning handling
     private readonly _hasWalletsEffect = effect(() => {
          if (this.walletManager.hasWallets()) {
               this.txUiService.clearWarning?.();
          } else {
               this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
               this.txUiService.setError('');
               this.txUiService.setInfoMessage('');
          }
     });

     // Effect 2: Wallets list sync
     private readonly _walletsSyncEffect = effect(() => {
          this.wallets.set(this.walletManager.wallets());
     });

     // Effect 3: Selected index change → clear + refresh checks
     private readonly _selectedIndexEffect = effect(() => {
          // Reading the signal is enough to trigger the effect
          this.walletManager.selectedIndex();

          this.txUiService.clearAllOptionsAndMessages();

          // Fire-and-forget refresh
          void this.getEscrows(false);
     });

     escrowItems = computed(() => this.escrowUtilService.escrowItems(this.allEscrowsRaw(), this.currentWallet().address, this.activeTab() === 'cancel'));

     selectedEscrowItem = computed(() => this.escrowUtilService.selectedEscrowItem(this.escrowItems(), this.txUiService.escrowSequenceNumberField()));

     selectedIssuerAddress = computed(() => this.trustlineCurrencyService.getSelectedIssuer());

     // Selected currency
     selectedCurrencyItem = computed(() => {
          const code = this.trustlineCurrencyService.currentCurrency();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     });

     // Selected issuer
     selectedIssuerItem = computed(() => {
          const addr = this.trustlineCurrencyService.selectedIssuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     });

     readonly currentWalletData = computed(() => {
          const currentAddr = this.currentWallet()?.address;
          if (!currentAddr) return null;

          const wallet = this.walletManager.wallets().find(w => w.address === currentAddr);
          if (!wallet?.address) return null;

          return {
               address: wallet.address,
               name: wallet.name || wallet.address.slice(0, 10) + '...',
          };
     });

     readonly escrowCount = computed(() => {
          const tab = this.activeTab();
          const address = this.currentWallet()?.address ?? '';

          if (tab === 'create') return this.existingEscrow().length;
          if (tab === 'finish') return this.allEscrowsRaw().filter(e => e.Destination === address).length;
          if (tab === 'cancel') return this.expiredOrFulfilledEscrows().length;
          return 0;
     });

     readonly escrowsToShow = computed<EscrowDisplayItem[]>(() => {
          const tab = this.activeTab();
          const address = this.currentWallet()?.address;

          if (!address) return [];

          if (tab === 'create') {
               // Outgoing escrows created by you
               return this.existingEscrow().map(e => ({
                    tab: 'create',
                    EscrowSequence: e.Sequence?.toString() || 'Unknown',
                    amount: this.utilsService.formatIOUXrpAmountOutstanding(e.Amount),
                    destination: e.Destination,
                    finishAfter: e.FinishAfter ? Number(e.FinishAfter) : undefined,
                    cancelAfter: e.CancelAfter ? Number(e.CancelAfter) : undefined,
                    isExpired: this.escrowUtilService.isEscrowExpired(e.CancelAfter, e.FinishAfter, tab),
                    id: e.Sequence?.toString() || 'Unknown',
                    display: `${this.utilsService.formatIOUXrpAmountOutstanding(e.Amount)} → ${e.Destination.slice(0, 8)}...`,
                    secondary: `Seq: ${e.Sequence?.toString() || 'Unknown'} • You created • ${e.Destination.slice(0, 8)}...`,
               }));
          }

          if (tab === 'finish') {
               // Incoming – sent TO you (this is what was working)
               const incoming = this.allEscrowsRaw().filter(e => e.Destination === address);

               return incoming.map(e => {
                    const sequence = e.EscrowSequence?.toString() || 'Unknown';
                    const amtStr = this.utilsService.formatIOUXrpAmountOutstanding(e.Amount);
                    return {
                         tab: 'finish',
                         EscrowSequence: sequence,
                         amount: amtStr,
                         sender: e.Sender,
                         finishAfter: e.FinishAfter ? Number(e.FinishAfter) : undefined,
                         // cancelAfter usually irrelevant for finish, but include if needed
                         cancelAfter: e.CancelAfter ? Number(e.CancelAfter) : undefined,
                         isExpired: this.escrowUtilService.isEscrowExpired(e.CancelAfter, e.FinishAfter, tab),

                         id: sequence,
                         display: `${amtStr} ← ${e.Sender.slice(0, 8)}...`,
                         secondary: `Seq: ${sequence} • Sent to you`,
                    } satisfies EscrowDisplayItem;
               });
          }

          if (tab === 'cancel') {
               return this.expiredOrFulfilledEscrows().map(e => ({
                    tab: 'cancel',
                    EscrowSequence: e.EscrowSequence?.toString() || 'Unknown',
                    amount: this.utilsService.formatIOUXrpAmountOutstanding(e.Amount),
                    destination: e.Destination,
                    finishAfter: e.FinishAfter ? Number(e.FinishAfter) : undefined,
                    cancelAfter: e.CancelAfter ? Number(e.CancelAfter) : undefined,
                    isExpired: this.escrowUtilService.isEscrowExpired(e.CancelAfter, e.FinishAfter, tab),
                    id: e.Sequence?.toString() || 'Unknown',
                    display: `${this.utilsService.formatIOUXrpAmountOutstanding(e.Amount)} → ${e.Destination.slice(0, 8)}...`,
                    secondary: `Seq: ${e.Sequence?.toString() || 'Unknown'} • You created • ${e.Destination.slice(0, 8)}...`,
               }));
          }

          return [];
     });

     readonly explorerLinks = computed(() => {
          const tab = this.activeTab();
          if (tab !== 'create') return null;

          const wallet = this.currentWalletData();
          if (!wallet) return null;

          const base = this.txUiService.explorerUrl();
          const addr = wallet.address;

          const links: string[] = [];

          if (this.existingEscrow().length > 0) {
               links.push(`<a href="${base}account/${addr}/escrows" target="_blank" rel="noopener" class="xrpl-win-link">View Escrows</a>`);
          }
          if (this.existingIOUs().length > 0) {
               links.push(`<a href="${base}account/${addr}/tokens" target="_blank" rel="noopener" class="xrpl-win-link">View IOUs</a>`);
          }
          if (this.existingMpts().length > 0) {
               links.push(`<a href="${base}account/${addr}/mpts/owned" target="_blank" rel="noopener" class="xrpl-win-link">View MPTs</a>`);
          }

          return links.length > 0 ? links.join(' | ') : null;
     });

     readonly infoData = computed(() => {
          const wallet = this.currentWalletData();
          if (!wallet) return null;

          return {
               walletName: wallet.name,
               escrowCount: this.escrowCount(),
               escrowsToShow: this.escrowsToShow(),
               links: this.explorerLinks(),
               activeTab: this.activeTab(), // keep for template switch if needed
          };
     });

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     selectedEscrowIsExpired = computed(() => {
          const selected = this.selectedEscrowItem();
          if (!selected) return false;

          // Look up full escrow by sequence
          const fullEscrow = this.allEscrowsRaw().find(e => e.EscrowSequence?.toString() === selected.id);

          return !!fullEscrow && this.escrowUtilService.isEscrowExpired(fullEscrow.CancelAfter, fullEscrow.FinishAfter, 'finish');
     });

     // MPT Dropdown Items
     mptItems = computed(() => this.mptUtilService.computeMptItems(this.existingMpts()));

     selectedMptItem = computed(() => this.mptUtilService.computeSelectedMptItem(this.mptItems(), this.txUiService.mptIssuanceIdField()));

     onMptSelected(item: SelectItem | null) {
          this.txUiService.mptIssuanceIdField.set(item?.id || '');
     }

     constructor() {
          super();
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.trustlineCurrencyService.setPreferXrpAsDefault(true);
          this.trustlineCurrencyService.setXrpInDropdown(true);
          this.trustlineCurrencyService.setAddMptInDropdown(true);

          this.transactionDropdownService.loadCustomDestinations();
          this.setEscrowFinishAfterExpirationToNow();
          this.setEscrowCancelAfterExpirationToNow();
          this.trustlineCurrencyService.resetToDefault();
          this.txUiService.clearAllOptions();
          this.txUiService.enableEscrowFinishAfterExpirationDate.set(false);
     }

     onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.currentWalletAddress.set(this.currentAddress());
          this.trustlineCurrencyService.selectCurrency(currency, '');
          this.txUiService.clearAllOptionsAndMessages();
     }

     onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);
     }

     private selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.trustlineCurrencyService.currentWalletAddress.set(wallet.address);
          this.txUiService.currentWallet.set(wallet);
          this.txUiService.showEnableTrustline.set(false);

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }

          // Reset currency to XRP when wallet changes
          this.trustlineCurrencyService.resetToDefault();

          this.setEscrowFinishAfterExpirationToNow();
          this.setEscrowCancelAfterExpirationToNow();

          // Only change currency if needed — avoid re-triggering selectCurrency('XRP')
          const current = this.trustlineCurrencyService.currentCurrency() ?? 'XRP';
          if (current !== 'XRP') this.onCurrencyChange(current);
     }

     private ensureWalletSelected(): boolean {
          if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
               console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
               return false;
          }
          return true;
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

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     onEscrowSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.txUiService.escrowSequenceNumberField.set('');
               this.txUiService.escrowOwnerField.set('');
               return;
          }

          const escrow = this.expiredOrFulfilledEscrows().find((e: any) => e.EscrowSequence?.toString() === item.id);

          if (escrow) {
               this.txUiService.escrowSequenceNumberField.set(escrow.EscrowSequence);
               this.txUiService.escrowOwnerField.set(escrow.Sender); // owner is the sender
          }
     }

     async setTab(tab: 'create' | 'finish' | 'cancel'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          this.clearInputFields();

          if (tab === 'create') this.trustlineCurrencyService.resetToDefault();

          if (this.hasWallets()) {
               await this.getEscrows(false);
               this.setEscrowFinishAfterExpirationToNow();
               this.setEscrowCancelAfterExpirationToNow();
          }
     }

     async getEscrows(forceRefresh = false): Promise<void> {
          await this.measure('getEscrows', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         forceRefresh: forceRefresh,
                    });

                    if (!env.accountInfo || !env.accountObjects) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    this.updateLocalAccountState(env.accountObjects, env.wallet.classicAddress);

                    const currencyValue = this.trustlineCurrencyService.currentCurrency() ?? 'XRP';
                    if (currencyValue !== 'XRP' && currencyValue !== 'MPT' && this.trustlineCurrencyService.selectedIssuer()) {
                         this.trustlineCurrencyService.selectCurrency(currencyValue, '');
                    }

                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Failed to get escrows:', error);
                    this.toastService.error(error.message || 'Failed to get escrows', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async createConditionalEscrow(): Promise<void> {
          await this.withPerf('createConditionalEscrow', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               const destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

               if (!destinationAddress) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }

               try {
                    this.txUiService.currencyCode.set(this.trustlineCurrencyService.getSelectedCurrency());
                    this.txUiService.currencyIssuer.set(this.trustlineCurrencyService.selectedIssuer());
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeDestinationAccountInfo: true,
                         destinationAddress,
                    });

                    if (!env.accountInfo || !env.accountObjects || !env.destinationAccountInfo) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    const condition = this.txUiService.escrowConditionField()?.trim()?.toUpperCase() || null;
                    let finishInput = null;
                    if (this.txUiService.enableEscrowFinishAfterExpirationDate()) {
                         finishInput = this.txUiService.escrowFinishTimeField();
                    }
                    let cancelInput = null;
                    if (this.txUiService.enableEscrowCancelAfterExpirationDate()) {
                         cancelInput = this.txUiService.escrowCancelTimeField();
                    }
                    const finishAfter = finishInput ? Math.floor(new Date(finishInput).getTime() / 1000) - AppConstants.RIPPLE_EPOCH_START : null;
                    const cancelAfter = cancelInput ? Math.floor(new Date(cancelInput).getTime() / 1000) - AppConstants.RIPPLE_EPOCH_START : null;
                    const currentRippleTime = await this.xrplService.getCurrentRippleTime(env.client);
                    const validation = this.escrowUtilService.validateEscrowCreate({ finishAfter, cancelAfter, condition, currentRippleTime });
                    if (!validation.valid) {
                         this.toastService.error(validation.errors.join(' '), AppConstants.TOAST.ERROR);
                         return;
                    }

                    const uiErrors = this.escrowUtilService.validateConditionalEscrowUI({ finishAfter, cancelAfter, condition });
                    if (uiErrors.length) {
                         this.toastService.error(uiErrors, AppConstants.TOAST.ERROR);
                         return;
                    }

                    const result = await this.timeBasedEscrowOrchestrator.executeEscrowTx('create', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.createEscrowSpecificKeys)),
                              destinationAddress,
                              currencyValue: this.trustlineCurrencyService.currentCurrency() || 'XRP',
                              issuer: this.trustlineCurrencyService?.selectedIssuer?.() || '',
                              condition: this.txUiService.escrowConditionField()?.trim()?.toUpperCase(),
                              cancelAfter: this.txUiService.escrowCancelTimeField(),
                         },
                         extra: {},
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              destinationAccountInfo: env.destinationAccountInfo,
                              wallet: env.wallet,
                         },
                    });

                    await this.handleTxResult(result, env.client, env.wallet, destinationAddress, 'Failed to create escrow');
               } catch (error: any) {
                    console.error('Error creating escrow:', error);
                    this.toastService.error(error.message || 'Error creating escrow', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async finishConditionalEscrow(): Promise<void> {
          await this.withPerf('finishConditionalEscrow', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               const escrowSequenceNumberField = this.txUiService.escrowSequenceNumberField();
               if (!escrowSequenceNumberField) {
                    this.toastService.error('Sequence ID is required.', AppConstants.TOAST.ERROR);
                    return;
               }

               // Fulfillment is required for conditional escrows
               const fulfillment = this.txUiService.escrowFulfillmentField();
               if (!fulfillment) {
                    this.toastService.error('Fulfillment is required to finish a conditional escrow', AppConstants.TOAST.ERROR);
                    return;
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeEscrowBySequenceId: true,
                         escrowSequenceNumberField: escrowSequenceNumberField,
                    });

                    const currentRippleTime = await this.xrplService.getCurrentRippleTime(env.client);

                    // Get escrow timing fields
                    const finishAfterNum = env.escrowObjectsBySequenceId.FinishAfter ? Number(env.escrowObjectsBySequenceId.FinishAfter) : undefined;
                    const cancelAfterNum = env.escrowObjectsBySequenceId.CancelAfter ? Number(env.escrowObjectsBySequenceId.CancelAfter) : undefined;
                    const condition = env.escrowObjectsBySequenceId.Condition;

                    // Validate this is a conditional escrow
                    if (!condition) {
                         this.toastService.error('This is not a conditional escrow (missing Condition)', AppConstants.TOAST.ERROR);
                         return;
                    }

                    // Conditional escrow MUST have CancelAfter
                    if (!cancelAfterNum) {
                         this.toastService.error('Invalid conditional escrow: Missing CancelAfter time', AppConstants.TOAST.ERROR);
                         return;
                    }

                    // Conditional escrow should NOT have FinishAfter
                    if (finishAfterNum) {
                         console.warn('Conditional escrow has FinishAfter - this is unusual but may be valid');
                    }

                    const escrowStatus = this.escrowUtilService.checkEscrowStatus(
                         {
                              FinishAfter: finishAfterNum, // Optional for conditional
                              CancelAfter: cancelAfterNum, // Required for conditional
                              owner: this.txUiService.escrowOwnerField(),
                              escrowType: 'condition',
                         },
                         currentRippleTime,
                         env.wallet.classicAddress
                    );

                    if (!escrowStatus.canFinish && !escrowStatus.canCancel) {
                         return this.toastService.error(`${escrowStatus.reasonCancel} ${escrowStatus.reasonFinish}`);
                    }

                    if (!escrowStatus.canFinish) {
                         return this.toastService.error(escrowStatus.reasonFinish || 'Cannot finish escrow yet');
                    }

                    // For conditional escrows, we need to verify the condition hasn't expired
                    if (cancelAfterNum <= currentRippleTime) {
                         return this.toastService.error('This escrow has expired and can no longer be finished', AppConstants.TOAST.ERROR);
                    }

                    const result = await this.timeBasedEscrowOrchestrator.executeEscrowTx('finish', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.finishEscrowSpecificKeys)),
                              escrowSequenceNumberField,
                              escrowStatus: this.txUiService.escrowOwnerField(),
                              condition: this.txUiService.escrowConditionField(),
                              fulfillment: fulfillment,
                         },
                         extra: {},
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              fee: String(4 * Number(env.fee!)),
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    await this.handleTxResult(result, env.client, env.wallet, null, 'Failed to finish escrow');
               } catch (error: any) {
                    console.error('Error finishing escrow:', error);
                    this.toastService.error(error.message || 'Error finishing escrow', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async cancelEscrow(): Promise<void> {
          await this.withPerf('cancelEscrow', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               const escrowSequenceNumberField = this.txUiService.escrowSequenceNumberField();
               if (!escrowSequenceNumberField) {
                    this.toastService.error('Sequence ID is required.', AppConstants.TOAST.ERROR);
                    return;
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeEscrows: true,
                    });

                    if (!env.accountInfo || !env.escrowObjects) {
                         throw new Error('Failed to fetch account information or escrows');
                    }

                    let { escrow, escrowOwner }: { escrow: EscrowObject | undefined; escrowOwner: string } = await this.escrowUtilService.findEscrowAndOwner(env.escrowObjects, escrowSequenceNumberField);

                    if (!escrow) {
                         return this.toastService.error(`No escrow found for sequence ${escrowSequenceNumberField}`, AppConstants.TOAST.ERROR);
                    }

                    const currentRippleTime = await this.xrplService.getCurrentRippleTime(env.client);

                    // Get escrow timing fields
                    const finishAfterNum = escrow.FinishAfter ? Number(escrow.FinishAfter) : undefined;
                    const cancelAfterNum = escrow.CancelAfter ? Number(escrow.CancelAfter) : undefined;
                    const hasCondition = !!escrow.Condition;

                    // For conditional escrows, CancelAfter is mandatory
                    if (hasCondition && !cancelAfterNum) {
                         throw new Error('Invalid conditional escrow: Missing CancelAfter time');
                    }

                    const escrowStatus = this.escrowUtilService.checkEscrowStatus(
                         {
                              FinishAfter: finishAfterNum,
                              CancelAfter: cancelAfterNum,
                              owner: escrowOwner,
                              escrowType: 'condition',
                         },
                         currentRippleTime,
                         env.wallet.classicAddress
                    );

                    if (!escrowStatus.canCancel) {
                         return this.toastService.error(escrowStatus.reasonCancel || 'Cannot cancel this escrow yet', AppConstants.TOAST.ERROR);
                    }

                    const result = await this.timeBasedEscrowOrchestrator.executeEscrowTx('cancel', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.cancelEscrowSpecificKeys)),
                         },
                         extra: {},
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    await this.handleTxResult(result, env.client, env.wallet, null, 'Failed to cancel escrow');
               } catch (error: any) {
                    console.error('Error cancelling escrow:', error);
                    this.toastService.error(error.message || 'Error cancelling escrow', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     private async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, errorMessage: string): Promise<boolean> {
          if (!result.success) {
               this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
               return false;
          }

          await this.refreshAfterTx(client, wallet, destination);

          this.trustlineCurrencyService.refreshNonNativeCurrency();

          this.clearInputFields();
          this.cdr.markForCheck();
          return true;
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

          this.updateLocalAccountState(accountObjects, wallet.classicAddress);

          await this.refreshWallets(client, destination ? [wallet.classicAddress, destination] : [wallet.classicAddress]);

          this.addCustomDestination(destination);
          this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
     }

     private async updateLocalAccountState(accountObjects: any, address: string) {
          this.existingEscrow.set(await this.escrowUtilService.getExistingEscrows(accountObjects, address));
          this.expiredOrFulfilledEscrows.set(await this.escrowUtilService.getExpiredOrFulfilledEscrows(accountObjects, address, this.activeTab()));
          this.existingMpts.set(this.mptUtilService.getExistingMpts(accountObjects, address));
          this.existingIOUs.set(this.trustlineCurrencyService.getExistingIOUs(accountObjects, address));
          const escrows = await this.escrowUtilService.loadAllEscrows(accountObjects);
          this.allEscrowsRaw.set(escrows);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(
               client,
               addresses, // only the addresses to target
               (updatedList, newCurrent) => {
                    this.currentWallet.set({ ...newCurrent });
               }
          );
     }

     private addCustomDestination(destination: string | null): void {
          if (!destination) return;
          const addr = destination.trim();
          if (xrpl.isValidAddress(addr) && !this.destinationMap().has(addr)) {
               this.transactionDropdownService.addCustomIfNewAndSelect(destination, this.destinationMap, this.selectedDestinationAddress, this.destinationSearchQuery);
          }
     }

     getCondition() {
          const { condition, fulfillment } = this.generateCondition();
          this.txUiService.escrowConditionField.set(condition);
          this.txUiService.escrowFulfillmentField.set(fulfillment);
     }

     generateCondition(): { condition: string; fulfillment: string } {
          console.log('Generating a cryptographic condition and fulfillment for XRPL escrow');

          // Use Web Crypto API to generate 32 random bytes
          const preimage = new Uint8Array(32);
          globalThis.crypto.getRandomValues(preimage); // Browser-compatible random bytes

          // Create a PREIMAGE-SHA-256 condition
          const fulfillment = new cc.PreimageSha256();
          fulfillment.setPreimage(Buffer.from(preimage)); // Convert Uint8Array to Buffer

          // Get the condition (hash of the preimage) in hexadecimal
          const condition = fulfillment.getConditionBinary().toString('hex').toUpperCase();

          // Get the fulfillment (preimage) in hexadecimal, to be kept secret
          const fulfillment_hex = fulfillment.serializeBinary().toString('hex').toUpperCase();

          console.log('Condition:', condition);
          console.log('Fulfillment (keep secret until ready to finish escrow):', fulfillment_hex);

          return { condition, fulfillment: fulfillment_hex };
     }

     onCurrencyChange(currency: string) {
          this.trustlineCurrencyService.selectCurrency(currency, '');
     }

     onIssuerChange(issuer: string) {
          this.trustlineCurrencyService.selectIssuer(issuer);
     }

     setEscrowFinishAfterExpirationToNow(): void {
          this.txUiService.escrowFinishTimeField.set(this.utilsService.formatDateTimeLocal(new Date()));
     }

     setEscrowCancelAfterExpirationToNow(): void {
          this.txUiService.escrowCancelTimeField.set(this.utilsService.formatDateTimeLocal(new Date()));
     }

     addEscrowFinishToExpiration(seconds: number): void {
          this.escrowUtilService.addToDateTimeField(this.txUiService.escrowFinishTimeField, this.txUiService.escrowFinishTimeField, seconds);
     }

     addEscrowCancelToExpiration(seconds: number): void {
          this.escrowUtilService.addToDateTimeField(this.txUiService.escrowCancelTimeField, this.txUiService.escrowCancelTimeField, seconds);
     }

     toggleEscrowFinishAfteExpiration(enabled: boolean): void {
          this.txUiService.enableEscrowFinishAfterExpirationDate.set(enabled);
          if (enabled && !this.txUiService.escrowFinishTimeField()) {
               this.setEscrowFinishAfterExpirationToNow();
          } else if (!enabled) {
               this.txUiService.escrowFinishTimeField.set('');
          }
     }

     toggleEscrowCancelAfterExpiration(enabled: boolean): void {
          this.txUiService.enableEscrowCancelAfterExpirationDate.set(enabled);
          if (enabled && !this.txUiService.escrowCancelTimeField()) {
               this.setEscrowCancelAfterExpirationToNow();
          } else if (!enabled) {
               this.txUiService.escrowCancelTimeField.set('');
          }
     }

     clearEscrowFinishAfterExpiration(): void {
          this.txUiService.escrowFinishTimeField.set('');
          // this.txUiService.enableEscrowFinishAfterExpirationDate.set(false);
     }

     clearEscrowCancelAfterExpiration(): void {
          this.txUiService.escrowCancelTimeField.set('');
          this.txUiService.enableEscrowCancelAfterExpirationDate.set(false);
     }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }

     clearInputFields(): void {
          if (this.txUiService.isSimulateEnabled()) return;

          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.setEscrowFinishAfterExpirationToNow();
          this.setEscrowCancelAfterExpirationToNow();
     }
}
