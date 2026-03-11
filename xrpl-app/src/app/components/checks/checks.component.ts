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
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { CheckUtilService } from '../../services/checks/check-util/check-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { MptUtilService } from '../../services/mpt-service/mpt-util/mpt-util.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { TrustlineOrchestratorService } from '../../services/trustline-currency/trustline-orchestrator/trustline-orchestrator.service';
import { TransactionOptionsSectionComponent } from '../shared/transaction-options-section/transaction-options-section.component';
import { CheckListItem } from '../../models/interface-items.model';
import { CheckCancelItemComponent } from './ui-components/check-cancel-item/check-cancel-item.component';
import { CheckCreateItemComponent } from './ui-components/check-create-item/check-create-item.component';
import { CheckCashItemComponent } from './ui-components/check-cash-item/check-cash-item.component';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { ActivatedRoute } from '@angular/router';
import { XrplDateService } from '../../core/xrpl-date.service';

@Component({
     selector: 'app-checks',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, CheckCreateItemComponent, CheckCancelItemComponent, CheckCashItemComponent],
     animations: [
          trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])]),
          trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(-20px)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))])]),
     ],
     templateUrl: './checks.component.html',
     styleUrl: './checks.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendChecksComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly checkTransactionOrchestrator = inject(CheckTransactionOrchestrator);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly trustlineOrchestratorService = inject(TrustlineOrchestratorService);
     private readonly walletManager = inject(WalletManagerService);
     public readonly route = inject(ActivatedRoute);
     public readonly xrplDateService = inject(XrplDateService);
     private readonly cdr = inject(ChangeDetectorRef);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     checkIdSearchQuery = signal<string>('');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal<boolean>(false);
     activeTab = signal<'create' | 'cash' | 'cancel'>('create');

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.trustlineCurrencyService.currencyBalance;

     outstandingChecks = signal<string>('');
     mptIssuanceIdField = signal<string>('');
     cancellableChecks = signal<any[]>([]);
     cashableChecks = signal<any[]>([]);
     existingChecks = signal<any[]>([]);
     outstandingChecksCollapsed = signal<boolean>(true);
     existingIOUs = signal<any[]>([]);
     /**
      * If the XRPL adds MPT to checks, we can uncomment the MPT.
      * existingMpts = signal<any[]>([]);
      */
     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     private readonly createCheckSpecificKeys = ['amountField', 'destinationTagField', 'sourceTagField', 'invoiceIdField', 'currencyCode', 'currencyIssuer'] as const;
     private readonly cashCheckSpecificKeys = ['amountField', 'checkIdField', 'currencyCode', 'currencyIssuer', 'checkCreator', 'suppressIndividualFeedback'] as const;
     private readonly setTrustlineSpecificKeys = ['trustlineLimitField', 'currencyCode', 'currencyIssuer', 'submitAndWait', 'suppressIndividualFeedback'] as const;
     private readonly cancelCheckSpecificKeys = ['checkIdField'] as const;
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
          void this.getChecks(false);
     });

     selectedCheckItem = computed<SelectItem | null>(() => {
          const id = this.txUiService.checkIdField();
          if (!id) return null;

          const items = this.checkItems();
          if (!items) return null;

          return items.find(item => item.id === id) ?? null;
     });

     checkItems = computed(() => {
          const mode = this.activeTab();
          const checks = mode === 'cash' ? this.cashableChecks : this.cancellableChecks;
          const modeSignal = this.activeTab;
          return this.checkUtilService.mapCheckItems(checks, modeSignal, amt => this.utilsService.formatIOUXrpAmountOutstanding(amt))();
     });

     checkIdDisplay = this.checkUtilService.checkIdDisplay(this.txUiService.checkIdField, this.checkItems, this.checkIdSearchQuery);

     checkIdInputDisplay = computed(() => {
          if (this.checkIdSearchQuery()) {
               return this.checkIdSearchQuery();
          }
          return this.checkIdDisplay();
     });

     filteredCheckIds = this.checkUtilService.filteredCheckItems(this.checkItems, this.checkIdSearchQuery);

     selectedFullCheck = computed(() => {
          const selectedId = this.txUiService.checkIdField();
          if (!selectedId) return null;
          return this.cashableChecks().find(check => check.id === selectedId) ?? null;
     });

     selectedCheckIsExpired = computed(() => this.selectedFullCheck()?.isExpired ?? false);

     selectedIssuerAddress = computed(() => this.trustlineCurrencyService.getSelectedIssuer());

     selectedCurrencyItem = computed(() => this.currencyItems().find(i => i.id === this.trustlineCurrencyService.currentCurrency()) ?? null);

     selectedIssuerItem = computed(() => this.issuerItems().find(i => i.id === this.trustlineCurrencyService.selectedIssuer()) ?? null);

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

     readonly checkCount = computed(() => {
          const tab = this.activeTab();
          if (tab === 'create') return this.existingChecks().length;
          if (tab === 'cash') return this.cashableChecks().length;
          if (tab === 'cancel') return this.cancellableChecks().length;
          return 0;
     });

     readonly checksToShow = computed<CheckListItem[]>(() => {
          const tab = this.activeTab();
          const address = this.currentWallet()?.address;

          if (!address) return [];

          if (tab === 'create') {
               // Outgoing checks created by you
               return this.existingChecks().map(c => ({
                    tab: 'create',
                    id: c.id,
                    index: c.id,
                    amount: this.utilsService.formatIOUXrpAmountOutstanding(c.sendMax),
                    destination: c.destination,
                    destinationTag: c.destinationTag,
                    expiration: c.expiration,
                    invoiceId: c.invoiceId,
                    isExpired: this.checkUtilService.isCheckExpired(c.expiration),
               }));
          }

          if (tab === 'cash') {
               // Incoming escrows you can cash
               return this.cashableChecks().map(c => ({
                    tab: 'cash',
                    id: c.id,
                    index: c.id,
                    amount: c.amount,
                    sender: c.sender,
                    expiration: c.expiration,
                    isExpired: c.isExpired,
               }));
          }

          if (tab === 'cancel') {
               return this.cancellableChecks().map(c => ({
                    tab: 'cancel',
                    id: c.id,
                    index: c.id,
                    amount: c.amount,
                    destination: c.destination,
                    expiration: c.expiration,
                    isExpired: this.checkUtilService.isCheckExpired(c.expiration),
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

          if (this.existingChecks().length > 0) {
               links.push(`<a href="${base}account/${addr}/checks" target="_blank" rel="noopener" class="xrpl-win-link">View Checks</a>`);
          }
          if (this.existingIOUs().length > 0) {
               links.push(`<a href="${base}account/${addr}/tokens" target="_blank" rel="noopener" class="xrpl-win-link">View IOUs</a>`);
          }
          /**
           * Added this for MPT checks if they are ever an option on the XRPL
           * if (this.existingMpts().length > 0) {
           *   links.push(`<a href="${base}account/${addr}/mpts/owned" target="_blank" rel="noopener" class="xrpl-win-link">View MPTs</a>`);
           * }
           */

          return links.length > 0 ? links.join(' | ') : null;
     });

     readonly infoData = computed(() => {
          const wallet = this.currentWalletData();
          if (!wallet) return null;

          return {
               walletName: wallet.name,
               checkCount: this.checkCount(),
               checksToShow: this.checksToShow(),
               links: this.explorerLinks(),
          };
     });

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     constructor() {
          super();
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          const tab = this.route.snapshot.queryParamMap.get('tab');
          if (tab) {
               const allowedTabs = ['create', 'cash', 'cancel'] as const;
               type TabType = (typeof allowedTabs)[number];
               if (tab && allowedTabs.includes(tab as TabType)) {
                    // Type assertion is safe because we checked includes
                    this.setTab(tab as TabType);
               }
          }

          this.trustlineCurrencyService.setPreferXrpAsDefault(true);
          this.trustlineCurrencyService.setXrpInDropdown(true);
          this.trustlineCurrencyService.setAddMptInDropdown(false);
          this.transactionDropdownService.loadCustomDestinations();
          this.setExpirationToNow();
          this.trustlineCurrencyService.resetToDefault();
     }

     onCheckSelected(item: SelectItem | null) {
          if (item) {
               const [amount] = item.display.split(' ');
               this.txUiService.amountField.set(amount);
          }
          this.checkUtilService.onCheckSelected(item);
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

          this.setExpirationToNow();

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

     toggleOutstandingChecks() {
          this.outstandingChecksCollapsed.set(!this.outstandingChecksCollapsed());
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

     getCheckById(id: string) {
          return [...this.cashableChecks(), ...this.cancellableChecks()].find(c => c.id === id);
     }

     getIssuerForCheck(checks: any[], checkIndex: string, currencyType: string): string | null {
          const check = checks.find(c => c.index === checkIndex);
          if (currencyType === 'Token') return check?.SendMax?.issuer || null;
          else return check?.Account || null;
     }

     async setTab(tab: 'create' | 'cash' | 'cancel'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.checkIdSearchQuery.set('');
          this.clearInputFields();

          if (tab === 'create') this.trustlineCurrencyService.resetToDefault();

          if (this.hasWallets()) {
               await this.getChecks(false);
               this.setExpirationToNow();
          }
     }

     async getChecks(forceRefresh = false): Promise<void> {
          await this.measure('getChecks', true, async () => {
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
                    console.error('Failed to load checks:', error);
                    this.toastService.error(error.message || 'Failed to load checks', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async createCheck(): Promise<void> {
          await this.withPerf('createCheck', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

               if (!destination) {
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
                         destinationAddress: destination,
                    });

                    if (env.destinationAccountInfo?.result?.account_flags?.disallowIncomingCheck) {
                         this.toastService.error(`Destination ${destination} has disallowIncomingCheck enabled. This wallet cannot receive checks.`, AppConstants.TOAST.ERROR);
                         return;
                    }

                    const result = await this.checkTransactionOrchestrator.executeCheckTx('create', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.createCheckSpecificKeys)),
                              destinationAddress: destination,
                         },
                         extra: {
                              expiration: this.txUiService.expirationTimeField(),
                              enableExpirationDate: this.txUiService.enableExpirationDate(),
                         },
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              destinationAddress: destination,
                              wallet: env.wallet,
                         },
                    });

                    await this.handleTxResult(result, env.client, env.wallet, destination, 'Failed to create check');
               } catch (error: any) {
                    console.error('Error creating check:', error);
                    this.toastService.error(error.message || 'Error creating check', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async cashCheck(): Promise<void> {
          await this.withPerf('cashCheck', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               const checkId = this.txUiService.checkIdField();
               if (!checkId) {
                    this.toastService.error('Please select a valid Check ID', AppConstants.TOAST.ERROR);
                    return;
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeChecks: true,
                    });

                    const checkObject = await this.xrplService.getCheckByCheckId(env.client, checkId, 'validated');
                    // Fail fast if not found
                    if (!checkObject) {
                         return this.toastService.error(`No check found with Check ID ${checkId}`, AppConstants.TOAST.ERROR);
                    }

                    // Expiration check (only if present)
                    if (checkObject.Expiration) {
                         const currentRippleTime = await this.xrplService.getCurrentRippleTime(env.client);
                         if (currentRippleTime >= checkObject.Expiration) {
                              return this.toastService.error('This check has expired.', AppConstants.TOAST.ERROR);
                         }
                    }

                    // Issuer validation (only for IOU checks)
                    let checkIssuer;
                    const currencyCode = this.txUiService.currencyCode();
                    const accountObjects = env.checkObjects?.result.account_objects;
                    if (accountObjects) {
                         if (currencyCode === AppConstants.XRP_CURRENCY) {
                              checkIssuer = this.getIssuerForCheck(accountObjects, checkId, 'XRP');
                         } else {
                              checkIssuer = this.getIssuerForCheck(accountObjects, checkId, 'Token');
                              if (checkIssuer && this.txUiService.currencyIssuer() !== checkIssuer) {
                                   return this.toastService.error(`Invalid issuer ${checkIssuer} for this check`, AppConstants.TOAST.ERROR);
                              }
                         }
                    }

                    let trustlinesToCheck: any = env.trustlines;
                    if (this.txUiService.showEnableTrustline()) {
                         const currencyCode = this.txUiService.missingTrustlineInfo.currencyCode();
                         const currencyIssuer = this.txUiService.missingTrustlineInfo.issuer();
                         if (!currencyCode || !currencyIssuer) return;

                         this.txUiService.submitAndWait.set(true);
                         this.txUiService.suppressIndividualFeedback.set(true);

                         const resetTrustlinesult = await this.trustlineOrchestratorService.executeTrustlineTx('setTrustline', {
                              wallet: this.currentWallet(),
                              formValues: {
                                   ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.setTrustlineSpecificKeys)),
                              },
                              extra: {},
                              preFetchedEnv: {
                                   client: env.client,
                                   accountInfo: env.accountInfo,
                                   checkObjects: env.checkObjects,
                                   fee: env.fee!,
                                   currentLedger: env.currentLedger!,
                                   wallet: env.wallet,
                              },
                         });

                         if (!resetTrustlinesult.success) {
                              this.toastService.error(resetTrustlinesult.error || 'Failed to create trustline');
                              return;
                         }

                         const updatedEnv = await this.txEnvironmentService.prepareTxEnvironment({
                              includeTrustlines: true,
                              forceRefresh: true,
                         });

                         trustlinesToCheck = updatedEnv.trustlines ?? [];
                    }

                    console.log('trustlinesToCheck:', trustlinesToCheck);

                    if (currencyCode !== AppConstants.XRP_CURRENCY) {
                         const issuer = this.txUiService.currencyIssuer();
                         const hasTrustline = await this.trustlineCurrencyService.hasTrustline(trustlinesToCheck, currencyCode, issuer);

                         console.log('hasTrustline for', currencyCode, issuer, ':', hasTrustline);

                         if (hasTrustline) {
                              this.txUiService.showEnableTrustline.set(false);
                         } else {
                              // Fix: show the slider / section when MISSING
                              this.txUiService.showEnableTrustline.set(true);

                              this.txUiService.missingTrustlineInfo.currencyCode.set(currencyCode);
                              this.txUiService.missingTrustlineInfo.issuer.set(issuer);
                              this.txUiService.trustlineLimitField.set(10000000);

                              // Optional: better user message
                              this.toastService.error(`No trustline found for ${currencyCode} (${issuer}).\nCashing this check will create a trustline to ${issuer}.`, AppConstants.TOAST.ERROR);
                              return;
                         }
                    }

                    const result = await this.checkTransactionOrchestrator.executeCheckTx('cash', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.cashCheckSpecificKeys)),
                         },
                         extra: {},
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              checkObjects: env.checkObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    await this.handleTxResult(result, env.client, env.wallet, checkIssuer || '', 'Failed to cash check');
               } catch (error: any) {
                    console.error('Error cashing check:', error);
                    this.toastService.error(error.message || 'Error cashing check', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async cancelCheck() {
          await this.withPerf('cancelCheck', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               const checkId = this.txUiService.checkIdField();
               if (!checkId) {
                    this.toastService.error('Please select a valid Check ID', AppConstants.TOAST.ERROR);
                    return;
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeChecks: true,
                    });

                    const result = await this.checkTransactionOrchestrator.executeCheckTx('cancel', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.cancelCheckSpecificKeys)),
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

                    await this.handleTxResult(result, env.client, env.wallet, null, 'Failed to cancel check');
               } catch (error: any) {
                    console.error('Error cancelling check:', error);
                    this.toastService.error(error.message || 'Error cancelling check', AppConstants.TOAST.ERROR);
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

     private updateLocalAccountState(accountObjects: any, address: string): void {
          this.existingChecks.set(this.checkUtilService.getExistingChecks(accountObjects, address));
          this.cashableChecks.set(this.checkUtilService.getCashableChecks(accountObjects, address));
          this.cancellableChecks.set(this.checkUtilService.getCancelableChecks(accountObjects, address));
          /**
           * this.existingMpts.set(this.mptUtilService.getExistingMpts(accountObjects, address));
           */
          this.existingIOUs.set(this.trustlineCurrencyService.getExistingIOUs(accountObjects, address));
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

     onCurrencyChange(currency: string) {
          this.trustlineCurrencyService.selectCurrency(currency, '');
     }

     onIssuerChange(issuer: string) {
          this.trustlineCurrencyService.selectIssuer(issuer);
     }

     toggleOptions(enabled: boolean): void {
          this.txUiService.wantsOptions.set(enabled);
          if (!enabled) this.txUiService.clearOptionalInputFields();
     }

     addCheckToExpiration(seconds: number): void {
          this.checkUtilService.addToDateTimeField(this.txUiService.expirationTimeField, this.txUiService.expirationTimeField, seconds);
     }

     setExpirationToNow(): void {
          this.txUiService.expirationTimeField.set(this.xrplDateService.toLocalDateTimeString(new Date()));
     }

     toggleExpiration(enabled: boolean): void {
          this.txUiService.enableExpirationDate.set(enabled);
          if (enabled && !this.txUiService.expirationTimeField()) {
               this.setExpirationToNow();
          } else if (!enabled) {
               this.txUiService.expirationTimeField.set('');
          }
     }

     clearExpiration(): void {
          this.txUiService.expirationTimeField.set('');
     }

     isValidExpiration(): boolean {
          if (!this.txUiService.expirationTimeField()) return true;
          const selected = new Date(this.txUiService.expirationTimeField());
          return selected > new Date();
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

          this.checkIdSearchQuery.set('');
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.setExpirationToNow();
     }
}
