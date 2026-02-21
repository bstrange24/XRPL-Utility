import { Component, OnInit, inject, computed, DestroyRef, signal, ChangeDetectionStrategy, effect } from '@angular/core';
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
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { from, switchMap } from 'rxjs';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { CheckUtilService } from '../../services/checks/check-util/check-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { MptUtilService } from '../../services/mpt-service/mpt-util/mpt-util.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';

@Component({
     selector: 'app-checks',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     templateUrl: './checks.component.html',
     styleUrl: './checks.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendChecksComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly checkTransactionOrchestrator = inject(CheckTransactionOrchestrator);
     public readonly mptUtilService = inject(MptUtilService);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     checkIdSearchQuery = signal<string>('');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     activeTab = signal<'create' | 'cash' | 'cancel'>('create');

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.trustlineCurrencyService.currencyBalance;

     outstandingChecks = signal<string>('');
     mptIssuanceIdField = signal<string>('');
     cancellableChecks = signal<any[]>([]);
     cashableChecks = signal<any[]>([]);
     existingChecks = signal<any[]>([]);
     outstandingChecksCollapsed = signal(true);
     existingIOUs = signal<any[]>([]);
     existingMpts = signal<any[]>([]);

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     private readonly createCheckSpecificKeys = ['amountField', 'destinationTagField', 'sourceTagField', 'invoiceIdField', 'currencyCode', 'currencyIssuer'] as const;
     private readonly cashCheckSpecificKeys = ['amountField', 'checkIdField', 'currencyCode', 'currencyIssuer', 'checkCreator'] as const;
     private readonly cancelCheckSpecificKeys = ['checkIdField'] as const;
     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');

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

     readonly infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const explorerBase = this.txUiService.explorerUrl();
          const address = wallet.address;
          let checkCount = 0;
          let checksToShow: any[] = [];
          const tab = this.activeTab();
          const existingChecks = this.existingChecks();
          const existingIOUs = this.existingIOUs();
          const existingMpts = this.existingMpts();

          switch (tab) {
               case 'create':
                    checkCount = existingChecks.length;
                    checksToShow = existingChecks.map(c => ({
                         id: c.id, // ← add this
                         index: c.id, // or c.index if different
                         amount: this.utilsService.formatIOUXrpAmountOutstanding(c.sendMax),
                         destination: c.destination,
                         destinationTag: c.destinationTag,
                         expiration: c.expiration,
                         invoiceId: c.invoiceId,
                         isExpired: this.checkUtilService.isCheckExpired(c.expiration),
                    }));
                    break;

               case 'cash':
                    checkCount = this.cashableChecks().length;
                    checksToShow = this.cashableChecks().map(c => ({
                         id: c.id, // ← add this
                         index: c.id,
                         amount: c.amount,
                         sender: c.sender,
                         expiration: c.expiration,
                         isExpired: c.isExpired,
                    }));
                    break;

               case 'cancel':
                    checkCount = this.cancellableChecks().length;
                    checksToShow = this.cancellableChecks().map(c => ({
                         id: c.id, // ← add this
                         index: c.id,
                         amount: c.amount,
                         destination: c.destination,
                         expiration: c.expiration,
                         isExpired: this.checkUtilService.isCheckExpired(c.expiration),
                    }));
                    break;
          }

          // Build the links (only on create tab we show all 3)
          const links: string[] = [];
          if (tab === 'create') {
               const hasChecks = existingChecks.length > 0;
               const hasIOUs = existingIOUs.length > 0;
               const hasMPTs = existingMpts.length > 0;

               if (hasChecks) links.push(`<a href="${explorerBase}account/${address}/checks" target="_blank" rel="noopener" class="xrpl-win-link">View Checks</a>`);
               if (hasIOUs) links.push(`<a href="${explorerBase}account/${address}/tokens" target="_blank" rel="noopener" class="xrpl-win-link">View IOUs</a>`);
               if (hasMPTs) links.push(`<a href="${explorerBase}account/${address}/mpts/owned" target="_blank" rel="noopener" class="xrpl-win-link">View MPTs</a>`);
          }

          return {
               walletName,
               checkCount,
               checksToShow,
               links: links.length > 0 ? links.join(' | ') : null,
          };
     });

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     constructor() {
          super();

          effect(() => {
               const item = this.selectedCheckItem();
               if (item) {
                    const [amount] = item.display.split(' ');
                    this.txUiService.amountField.set(amount);
               }
          });

          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.trustlineCurrencyService.setPreferXrpAsDefault(true);
          this.trustlineCurrencyService.setAddMptInDropdown(false);
          this.transactionDropdownService.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.setExpirationToNow();

          // Force initial default + balance refresh
          this.trustlineCurrencyService.resetToDefault();
     }

     onCheckSelected(item: SelectItem | null) {
          this.checkUtilService.onCheckSelected(item);
     }

     onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency, '');
          this.txUiService.clearAllOptionsAndMessages();
     }

     onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);
     }

     private setupWalletSubscriptions(): void {
          // Has wallets → clear warning
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.();
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
                    this.txUiService.setInfoMessage('');
               }
          });

          // Wallets list changes
          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
          });

          // Selected wallet index changes
          this.walletManagerService.selectedIndex$
               .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    switchMap(() => {
                         this.txUiService.clearAllOptionsAndMessages();
                         this.clearInputFields();
                         return from(this.getChecks(false));
                    })
               )
               .subscribe();
     }

     private selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }

          // Reset currency to XRP when wallet changes
          this.trustlineCurrencyService.resetToDefault();

          this.setExpirationToNow();

          // Only change currency if needed — avoid re-triggering selectCurrency('XRP')
          const current = this.trustlineCurrencyService.currentCurrency() ?? 'XRP';
          if (current !== 'XRP') {
               this.onCurrencyChange(current);
          }
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

     getIssuerForCheck(checks: any[], checkIndex: string): string | null {
          const check = checks.find(c => c.index === checkIndex);
          return check?.SendMax?.issuer || null;
     }

     async setTab(tab: 'create' | 'cash' | 'cancel'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.checkIdSearchQuery.set('');
          this.clearInputFields();

          if (tab === 'create') {
               this.trustlineCurrencyService.resetToDefault();
          }

          if (this.hasWallets()) {
               await this.getChecks(false);
               this.setExpirationToNow();
          }
     }

     async getChecks(forceRefresh = false): Promise<void> {
          await this.measure('getChecks', true, async () => {
               this.txUiService.resetCurrentStepToIdle();

               if (!this.ensureWalletSelected()) return;

               try {
                    const { wallet, accountInfo, accountObjects } = await this.measure('getChecks:prepareTxEnvironment', false, async () =>
                         this.txEnvironmentService.prepareTxEnvironment({
                              includeAccountInfo: true,
                              includeAccountObject: true,
                              forceRefresh: forceRefresh,
                         })
                    );

                    if (!accountInfo || !accountObjects) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    this.updateLocalAccountState(accountObjects, wallet.classicAddress);

                    const currencyValue = this.trustlineCurrencyService.currentCurrency() ?? 'XRP';
                    if (currencyValue !== 'XRP' && currencyValue !== 'MPT' && this.trustlineCurrencyService.selectedIssuer()) {
                         this.trustlineCurrencyService.selectCurrency(currencyValue, '');
                    }

                    this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
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
               }
          });
     }

     async cashCheck(): Promise<void> {
          await this.withPerf('cashCheck', async () => {
               this.txUiService.resetCurrentStepToIdle();

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
                    const currencyCode = this.txUiService.currencyCode();
                    if (currencyCode !== AppConstants.XRP_CURRENCY) {
                         const accountObjects = env.checkObjects?.result.account_objects;
                         if (accountObjects) {
                              const issuer = this.getIssuerForCheck(accountObjects, checkId);
                              if (issuer && this.txUiService.currencyIssuer() !== issuer) {
                                   return this.toastService.error(`Invalid issuer ${issuer} for this check`, AppConstants.TOAST.ERROR);
                              }
                         }
                    }

                    // if (this.txUiService.showEnableTrustline()) {
                    //      const info = this.txUiService.missingTrustlineInfo();
                    //      if (!info) return;

                    //      const trustResult = await this.trustlineTransactionOrchestrator.createTrustline({
                    //           wallet: this.currentWallet(),
                    //           currency: info.currency,
                    //           issuer: info.issuer,
                    //           limit: '1000000000', // or dynamic
                    //      });

                    //      if (!trustResult.success) {
                    //           this.toastService.error(trustResult.error || 'Failed to create trustline');
                    //           return;
                    //      }

                    //      this.toastService.success('Trustline created successfully.');
                    // }

                    if (currencyCode !== AppConstants.XRP_CURRENCY) {
                         const issuer = this.txUiService.currencyIssuer();
                         const hasTrustline = await this.trustlineCurrencyService.hasTrustline(env.trustlines!, currencyCode, issuer);

                         console.log('hasTrustline for', currencyCode, issuer, ':', hasTrustline);

                         if (!hasTrustline) {
                              // ────────────────────────────────────────
                              // Fix: show the slider / section when MISSING
                              // ────────────────────────────────────────
                              this.txUiService.showEnableTrustline.set(true); // ← changed

                              this.txUiService.missingTrustlineInfo.currencyCode.set(currencyCode);
                              this.txUiService.missingTrustlineInfo.issuer.set(issuer);

                              // Optional: better user message
                              this.toastService.error(`No trustline found for ${currencyCode} (${issuer}). ` + `Enable trustline below to proceed with cashing.`, AppConstants.TOAST.ERROR);
                              return;
                         } else {
                              this.txUiService.showEnableTrustline.set(false);
                         }
                    }

                    // const issuer = this.txUiService.currencyIssuer();
                    // if (currencyCode !== AppConstants.XRP_CURRENCY) {
                    //      const hasLine = await this.trustlineCurrencyService.hasTrustline(env.trustlines!, currencyCode, issuer);
                    //      console.log('hasLine', hasLine);

                    //      if (!hasLine) {
                    //           this.txUiService.showEnableTrustline.set(true);
                    //           this.txUiService.missingTrustlineInfo.currencyCode.set(currencyCode);
                    //           this.txUiService.missingTrustlineInfo.issuer.set(issuer);

                    //           this.toastService.error(`No trustline found for ${currencyCode}. Enable trustline to proceed.`, AppConstants.TOAST.ERROR);
                    //           return;
                    //      }
                    // }

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

                    await this.handleTxResult(result, env.client, env.wallet, '', 'Failed to cash check');
               } catch (error: any) {
                    console.error('Error cashing check:', error);
                    this.toastService.error(error.message || 'Error cashing check', AppConstants.TOAST.ERROR);
               }
          });
     }

     async cancelCheck() {
          await this.withPerf('cancelCheck', async () => {
               this.txUiService.resetCurrentStepToIdle();

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

                    await this.handleTxResult(result, env.client, env.wallet, '', 'Failed to cancel check');
               } catch (error: any) {
                    console.error('Error cancelling check:', error);
                    this.toastService.error(error.message || 'Error cancelling check', AppConstants.TOAST.ERROR);
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
          this.existingMpts.set(this.mptUtilService.getExistingMpts(accountObjects, address));
          this.existingIOUs.set(this.trustlineCurrencyService.getExistingIOUs(accountObjects, address));
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]): Promise<void> {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (_, newCurrent) => this.currentWallet.set({ ...newCurrent }));
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
          if (!enabled) this.clearInputFields();
     }

     addCheckToExpiration(seconds: number): void {
          this.checkUtilService.addToDateTimeField(this.txUiService.expirationTimeField, this.txUiService.expirationTimeField, seconds);
     }

     setExpirationToNow(): void {
          this.txUiService.expirationTimeField.set(this.utilsService.formatDateTimeLocal(new Date()));
     }

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Check ID copied!');
          });
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
          this.txUiService.enableExpirationDate.set(false);
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
          this.selectedDestinationAddress.set('');

          this.transactionDropdownService.resetDestinationInputs(this.destinationSearchQuery, this.selectedDestinationAddress);
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();

          // Reset service to XRP (safe default)
          this.trustlineCurrencyService.resetToDefault();
     }
}
