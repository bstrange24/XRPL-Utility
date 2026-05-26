import { Component, ChangeDetectorRef, OnInit, inject, ChangeDetectionStrategy, computed, effect, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { CurrencyFormSectionComponent } from '../shared/currency-form-section/currency-form-section.component';
import { ActivatedRoute } from '@angular/router';
import { TrustlineRequirementsInfoComponent } from './ui-components/trustline-requirements-info/trustline-requirements-info.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TRUSTLINE_TAB_META, TRUSTLINE_TABS, SET_FLAGS, CLEAR_FLAGS } from './constants/trustline.ui';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { TRUSTLINE, TRUSTLINE_TAB } from './constants/trustline.constants';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { TrustlineViewModelService } from '../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { TrustlineActionTypes } from './constants/trustline.types';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TrustlineFlagsComponent } from './tab/trustline-flags/trustline-flags.component';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { TrustlineTransactionOrchestratorService } from '../../services/trustlines/trustline-transaction-orchestrator/trustline-transaction-orchestrator.service';
import { TrustlineIssuersComponent } from './tab/trustline-issuers/trustline-issuers.component';
import { TrustlineIssueComponent } from './tab/trustline-issue/trustline-issue.component';
import { TrustlineClawbackComponent } from './tab/trustline-clawback/trustline-clawback.component';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TrustlinesSummaryComponent } from './ui-components/trustline-summary/trustlines-summary.component';
import { ButtonTooltipComponent } from '../shared/button-tooltip/button-tooltip.component';

@Component({
     selector: 'app-trustlines',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, ButtonTooltipComponent, OverlayModule, TransactionPreviewComponent, CurrencyFormSectionComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TransactionOptionsComponent, TrustlineFlagsComponent, TrustlineIssuersComponent, TrustlineIssueComponent, TrustlineClawbackComponent],
     templateUrl: './trustlines.component.html',
     styleUrl: './trustlines.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlinesComponent extends WalletDestinationBase implements OnInit, OnDestroy {
     private readonly currencyDebouncer = new Subject<any>();
     private readonly issuerDebouncer = new Subject<any>();
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly trustlineTransactionOrchestratorService = inject(TrustlineTransactionOrchestratorService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly trustlineViewModelService = inject(TrustlineViewModelService);
     private readonly rightPanelService = inject(RightPanelService);
     private readonly cdr = inject(ChangeDetectorRef);
     public readonly tabs = TRUSTLINE_TABS;
     public readonly tabMeta = TRUSTLINE_TAB_META;
     readonly setFlags: Record<string, any> = SET_FLAGS;
     readonly clearFlags: Record<string, any> = CLEAR_FLAGS;
     private isSwitchingWallet = false;
     activeTabForRequirements = computed(() => this.trustlineViewModelService.activeTab());
     readonly summaryExpanded = signal<boolean>(false);
     private readonly currentWalletAddress = signal<string>('');

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();

          effect(() => {
               const ious = this.trustlineStoreService.existingIOUs();
               console.log(`[Component] existingIOUs changed, count: ${ious.length}`);
               if (ious.length > 0) {
                    console.log(`[Component] First IOU:`, ious[0]);
               }
          });
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, TRUSTLINE_TAB, tab => this.setTab(tab));
          this.trustlineCurrencyService.load();
          this.trustlineCurrencyService.preferXrpAsDefault.set(false);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(false);
          this.trustlineCurrencyService.addMptInCurrencyDropdown.set(false);
          this.transactionDropdownService.loadCustomDestinations();
          this.setRightPanel();
          this.setupDebouncers();

          // DO NOT call setDefaultCurrencyAndIssuer here - let the wallet change effect handle it
          // But only for non-issuer wallets
          setTimeout(() => {
               const wallet = this.currentWallet()?.classicAddress;
               const existingIOUs = this.trustlineStoreService.existingIOUs();
               const isIssuerWallet = existingIOUs.some((tl: any) => tl.issuer === wallet);

               if (!isIssuerWallet) {
                    this.setDefaultCurrencyAndIssuer();
               }
          }, 500);
     }

     private setupDebouncers() {
          this.currencyDebouncer.pipe(debounceTime(160), distinctUntilChanged()).subscribe(async item => {
               this.trustlineCurrencyService.selectCurrency(item?.id ?? item ?? 'XRP');
               this.syncAfterSelection(false); // light sync

               await this.trustlineCurrencyService.refreshCurrentBalance();
          });

          this.issuerDebouncer.pipe(debounceTime(160), distinctUntilChanged()).subscribe(async item => {
               this.trustlineCurrencyService.selectIssuer(item?.id ?? item ?? '');
               this.syncAfterSelection(false);
               await this.trustlineCurrencyService.refreshCurrentBalance();
          });
     }

     private setDefaultCurrencyAndIssuer() {
          const currentWallet = this.currentWallet()?.classicAddress;
          const currentTab = this.trustlineViewModelService.activeTab();
          const existingIOUs = this.trustlineStoreService.existingIOUs();

          // CRITICAL: For Set tab, if this wallet has ANY trustlines where it's the issuer, skip entirely
          // Because loadWalletDataPreservingSelection already handled it
          const isIssuerWallet = existingIOUs.some((tl: any) => tl.issuer === currentWallet);

          if (currentTab === 'setTrustline' && isIssuerWallet) {
               console.log(`[setDefaultCurrencyAndIssuer] SKIP - Wallet is an issuer on Set tab`);
               return;
          }

          // Also skip if we already have a valid selection and this is not the initial load
          const currentCurrency = this.currencyStoreService.currency();
          const currentIssuer = this.currencyStoreService.issuer();

          if (currentCurrency && currentIssuer && currentIssuer !== currentWallet) {
               console.log(`[setDefaultCurrencyAndIssuer] SKIP - Valid selection already exists: ${currentCurrency}/${currentIssuer?.slice(0, 8)}...`);
               return;
          }

          console.log(`[setDefaultCurrencyAndIssuer] Running auto-selection...`);

          // Wait for trustlines to load
          setTimeout(() => {
               const existingIOUsNow = this.trustlineStoreService.existingIOUs();
               const currencies = this.trustlineCurrencyService.currencies();

               if (existingIOUsNow.length > 0) {
                    const nonSelfTrustline = existingIOUsNow.find((tl: any) => tl.issuer !== currentWallet);
                    if (nonSelfTrustline) {
                         console.log(`[setDefaultCurrencyAndIssuer] Selected non-self trustline: ${nonSelfTrustline.currency}/${nonSelfTrustline.issuer?.slice(0, 8)}...`);
                         this.currencyStoreService.setCurrency(nonSelfTrustline.currency);
                         this.currencyStoreService.setIssuer(nonSelfTrustline.issuer);
                    } else if (existingIOUsNow.length > 0) {
                         const first = existingIOUsNow[0];
                         console.log(`[setDefaultCurrencyAndIssuer] Selected first trustline: ${first.currency}/${first.issuer?.slice(0, 8)}...`);
                         this.currencyStoreService.setCurrency(first.currency);
                         this.currencyStoreService.setIssuer(first.issuer);
                    }
               } else if (currencies.length > 0) {
                    // Find a currency where this wallet is NOT the issuer
                    for (const currency of currencies) {
                         const issuers = this.trustlineCurrencyService.getIssuersForCurrency(currency);
                         const nonSelfIssuer = issuers.find(issuer => issuer !== currentWallet);
                         if (nonSelfIssuer) {
                              console.log(`[setDefaultCurrencyAndIssuer] Selected currency: ${currency} with issuer: ${nonSelfIssuer?.slice(0, 8)}...`);
                              this.currencyStoreService.setCurrency(currency);
                              this.currencyStoreService.setIssuer(nonSelfIssuer);
                              return;
                         }
                    }

                    // Fallback to first available
                    const firstCurrency = currencies[0];
                    const issuers = this.trustlineCurrencyService.getIssuersForCurrency(firstCurrency);
                    if (issuers.length > 0) {
                         console.log(`[setDefaultCurrencyAndIssuer] Fallback to first currency: ${firstCurrency} with issuer: ${issuers[0]?.slice(0, 8)}...`);
                         this.currencyStoreService.setCurrency(firstCurrency);
                         this.currencyStoreService.setIssuer(issuers[0]);
                    }
               }
          }, 100);
     }

     // Effect to watch for wallet changes
     private readonly walletChangeEffect = effect(() => {
          const wallet = this.currentWallet();
          const newAddress = wallet?.classicAddress || wallet?.address || '';
          const oldAddress = this.currentWalletAddress();

          console.log(`[walletChangeEffect] ===== WALLET CHANGE DETECTED =====`);
          console.log(`[walletChangeEffect] Old: ${oldAddress?.slice(0, 8)}..., New: ${newAddress?.slice(0, 8)}...`);

          if (newAddress && newAddress !== oldAddress) {
               console.log(`[walletChangeEffect] Processing wallet change...`);
               this.currentWalletAddress.set(newAddress);

               console.log(`[walletChangeEffect] Clearing trustline data...`);
               this.clearTrustlineData();

               console.log(`[walletChangeEffect] Loading new wallet data...`);
               this.loadWalletDataPreservingSelection();
          } else {
               console.log(`[walletChangeEffect] No change or invalid address`);
          }
     });

     private clearTrustlineData() {
          console.log(`[clearTrustlineData] START - Clearing data for wallet change`);
          console.log(`[clearTrustlineData] Current balance before clear: ${this.currencyStoreService.balance()}`);

          this.trustlineStoreService.setField('existingIOUs', []);
          this.trustlineStoreService.setField('trustlineAlreadyExist', false);
          this.trustlineStoreService.setField('isLoaded', false);
          this.trustlineStoreService.setField('isLoading', true);
          this.currencyStoreService.setField('balance', '0');

          console.log(`[clearTrustlineData] Balance set to 0, isLoading set to true`);
          this.cdr?.detectChanges();
     }

     private async loadWalletDataPreservingSelection() {
          const wallet = this.currentWallet();
          if (!wallet?.classicAddress) {
               console.log(`[loadWalletDataPreservingSelection] No wallet address, returning`);
               return;
          }

          const savedCurrency = this.currencyStoreService.currency();
          const savedIssuer = this.currencyStoreService.issuer();
          const currentTab = this.trustlineViewModelService.activeTab();

          console.log(`[loadWalletDataPreservingSelection] ===== LOADING DATA =====`);
          console.log(`[loadWalletDataPreservingSelection] Wallet: ${wallet.classicAddress.slice(0, 8)}...`);
          console.log(`[loadWalletDataPreservingSelection] Current Tab: ${currentTab}`);
          console.log(`[loadWalletDataPreservingSelection] Saved selection: ${savedCurrency}/${savedIssuer?.slice(0, 8)}...`);

          try {
               const env = await this.txEnvironmentService.refreshEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    includeGatewayBalance: true,
                    forceRefresh: true,
               });

               const existingIOUs = this.trustlineCurrencyService.getExistingIOUs(env.accountObjects!, wallet.classicAddress);
               console.log(`[loadWalletDataPreservingSelection] Found ${existingIOUs.length} trustlines`);
               this.trustlineStoreService.setField('existingIOUs', existingIOUs);

               let selectionRestored = false;

               // First, try to restore saved selection
               if (savedCurrency && savedIssuer) {
                    const selectionExists = existingIOUs.some((tl: any) => tl.currency === savedCurrency && tl.issuer === savedIssuer);
                    if (selectionExists) {
                         console.log(`[loadWalletDataPreservingSelection] ✓ Restoring saved selection: ${savedCurrency}/${savedIssuer?.slice(0, 8)}...`);
                         this.currencyStoreService.setCurrency(savedCurrency);
                         this.currencyStoreService.setIssuer(savedIssuer);
                         selectionRestored = true;
                    }
               }

               if (!selectionRestored) {
                    // Check if this wallet is an issuer for any currency (has obligations in gateway_balances)
                    const gatewayBalance = env.gatewayBalanceObject?.result;
                    const isIssuerForCurrencies: string[] = [];

                    if (gatewayBalance?.obligations) {
                         // Get all currencies where this wallet has obligations (meaning it's an issuer)
                         Object.keys(gatewayBalance.obligations).forEach(currency => {
                              isIssuerForCurrencies.push(currency);
                         });
                         console.log(`[loadWalletDataPreservingSelection] This wallet is an issuer for currencies:`, isIssuerForCurrencies);
                    }

                    // For Set Trustline tab on an issuer wallet, we want to select self to show warning
                    if (currentTab === 'setTrustline' && isIssuerForCurrencies.length > 0) {
                         const currencyToSelect = isIssuerForCurrencies[0];
                         const selfAddress = wallet.classicAddress;

                         console.log(`[loadWalletDataPreservingSelection] ✓ Set Tab + Issuer Wallet - Selecting self issuer for ${currencyToSelect}`);

                         this.currencyStoreService.setCurrency(currencyToSelect);

                         // CRITICAL: Small async delay + force refresh
                         setTimeout(() => {
                              this.currencyStoreService.setIssuer(selfAddress);

                              // Force Angular + signals to re-evaluate everything
                              this.cdr.detectChanges();

                              // Extra push to make issuerItems recompute
                              this.trustlineCurrencyService.forceIssuerRefresh?.(); // we'll add this below
                         }, 50);

                         selectionRestored = true;
                    }

                    // If not restored, try to find a trustline where this wallet is NOT the issuer (holder)
                    if (!selectionRestored) {
                         const nonSelfTrustline = existingIOUs.find((tl: any) => tl.issuer !== wallet.classicAddress);
                         if (nonSelfTrustline) {
                              console.log(`[loadWalletDataPreservingSelection] ✓ Using non-self trustline: ${nonSelfTrustline.currency}/${nonSelfTrustline.issuer?.slice(0, 8)}...`);
                              this.currencyStoreService.setCurrency(nonSelfTrustline.currency);
                              this.currencyStoreService.setIssuer(nonSelfTrustline.issuer);
                              selectionRestored = true;
                         } else if (existingIOUs.length > 0) {
                              const first = existingIOUs[0];
                              console.log(`[loadWalletDataPreservingSelection] ✓ Using first trustline: ${first.currency}/${first.issuer?.slice(0, 8)}...`);
                              this.currencyStoreService.setCurrency(first.currency);
                              this.currencyStoreService.setIssuer(first.issuer);
                              selectionRestored = true;
                         }
                    }

                    // If no trustlines, try to find a good currency/issuer pair
                    if (!selectionRestored) {
                         console.log(`[loadWalletDataPreservingSelection] No trustlines, finding best currency/issuer pair`);
                         const currenciesList = this.trustlineCurrencyService.currencies();

                         // For Set tab on an issuer wallet (even if we couldn't detect from gateway_balances)
                         // Check if this wallet is in the issuers list for any currency
                         let foundSelfAsIssuer = false;

                         for (const currency of currenciesList) {
                              const issuers = this.trustlineCurrencyService.getIssuersForCurrency(currency);
                              if (issuers.includes(wallet.classicAddress)) {
                                   console.log(`[loadWalletDataPreservingSelection] ✓ Set Tab - Found ${currency} where this wallet is an issuer, selecting self to show warning`);
                                   this.currencyStoreService.setCurrency(currency);
                                   this.currencyStoreService.setIssuer(wallet.classicAddress);
                                   this.debugSelection('After setIssuer');
                                   selectionRestored = true;
                                   foundSelfAsIssuer = true;
                                   break;
                              }
                         }

                         // If not restored and not a self-issuer, find a non-self issuer
                         if (!selectionRestored) {
                              for (const currency of currenciesList) {
                                   const issuers = this.trustlineCurrencyService.getIssuersForCurrency(currency);
                                   const nonSelfIssuer = issuers.find(issuer => issuer !== wallet.classicAddress);
                                   if (nonSelfIssuer) {
                                        console.log(`[loadWalletDataPreservingSelection] ✓ Using currency ${currency} with non-self issuer ${nonSelfIssuer?.slice(0, 8)}...`);
                                        this.currencyStoreService.setCurrency(currency);
                                        this.currencyStoreService.setIssuer(nonSelfIssuer);
                                        selectionRestored = true;
                                        break;
                                   }
                              }
                         }

                         // Ultimate fallback
                         if (!selectionRestored && currenciesList.length > 0) {
                              console.log(`[loadWalletDataPreservingSelection] ⚠ Ultimate fallback - selecting first currency`);
                              this.trustlineCurrencyService.selectCurrency(currenciesList[0]);
                         }
                    }
               }

               const selectedCurrency = this.currencyStoreService.currency();
               const selectedIssuer = this.currencyStoreService.issuer();

               // Check if trustline exists (for holders) OR if this is a self-selection for issuer
               let trustLineExists = false;

               if (selectedIssuer === wallet.classicAddress) {
                    // If selected issuer is self, this is for showing the warning, not an actual trustline
                    trustLineExists = false;
               } else {
                    trustLineExists = existingIOUs.some((tl: any) => tl.currency === selectedCurrency && tl.issuer === selectedIssuer);
               }

               console.log(`[loadWalletDataPreservingSelection] Final selection: ${selectedCurrency}/${selectedIssuer?.slice(0, 8)}...`);
               console.log(`[loadWalletDataPreservingSelection] Trustline exists: ${trustLineExists}`);
               console.log(`[loadWalletDataPreservingSelection] Is Self: ${selectedIssuer === wallet.classicAddress}`);

               this.trustlineStoreService.setField('trustlineAlreadyExist', trustLineExists);

               await this.trustlineCurrencyService.refreshCurrentBalanceFromEnv(env);

               // Force flag + limit sync
               await this.trustlineUtilService.onCurrencyIssuerChange();
               this.cdr.detectChanges();

               this.trustlineStoreService.setField('isLoaded', true);

               if (!selectionRestored && !this.currencyStoreService.currency()) {
                    this.setDefaultCurrencyAndIssuer();
               }
               console.log(`[loadWalletDataPreservingSelection] ===== LOAD COMPLETE =====`);
          } catch (error) {
               console.error('[loadWalletDataPreservingSelection] ERROR:', error);
               this.toastService.error('Failed to load wallet data', AppConstants.TOAST.ERROR);
          } finally {
               this.trustlineStoreService.setField('isLoading', false);
          }
     }

     private debugSelection(step: string) {
          console.log(`[DEBUG ${step}] Currency: ${this.currencyStoreService.currency()}, Issuer: ${this.currencyStoreService.issuer()?.slice(0, 8)}...`);
          console.log(`[DEBUG ${step}] SelectedCurrencyItem:`, this.trustlineViewModelService.selectedCurrencyItem());
          console.log(`[DEBUG ${step}] SelectedIssuerItem:`, this.trustlineViewModelService.selectedIssuerItem());
     }

     ngOnDestroy(): void {
          this.rightPanelService.clearPanel();
     }

     private readonly updateRightPanelEffect = effect(() => {
          const wallet = this.currentWallet();
          if (wallet?.address) {
               this.setRightPanel();
          }
     });

     public canPerformAction = computed(() => {
          const idle = this.isIdle();
          const ready = this.connectionGuard.isConnectionReady();

          if (!idle || !ready) return false;

          const tab = this.trustlineViewModelService.activeTab();

          switch (tab) {
               case 'setTrustline':
                    // Can't set if trustline exists OR if trying to set trustline to self
                    // return !this.trustlineStoreService.trustlineAlreadyExist() && !this.trustlineViewModelService.isSelfTrustline();
                    return !this.trustlineViewModelService.shouldShowSelfWarning() && !this.trustlineViewModelService.shouldShowExistsWarning();

               case 'removeTrustline':
                    return this.trustlineStoreService.removeTrustlineAvailable();
               // return true;

               case 'issueCurrency':
                    return true;

               case 'clawbackTokens':
                    return this.trustlineViewModelService.isIssuerForSelected();

               default:
                    return false;
          }
     });

     readonly isCurrencyFlow = computed(() => {
          const tab = this.trustlineViewModelService.activeTab();
          return ['setTrustline', 'removeTrustline', 'issueCurrency', 'clawbackTokens'].includes(tab);
     });

     protected async onSelectedWalletIndexChange(): Promise<void> {
          if (this.isSwitchingWallet) return;
          this.isSwitchingWallet = true;

          console.log('Wallet changed, reloading...');

          // Save current currency/issuer before clearing
          const savedCurrency = this.currencyStoreService.currency();
          const savedIssuer = this.currencyStoreService.issuer();

          // COMPLETELY reset all state
          this.trustlineStoreService.reset();
          this.currencyStoreService.reset();
          this.rightPanelService.resetFilters();
          this.xrplTxOptionsStore.reset();

          // Force fresh load
          this.isSummaryLoading.set(true);

          try {
               // Load new wallet data
               await this.getTrustlinesForAccount(true);

               await this.trustlineUtilService.onCurrencyIssuerChange();

               // Restore the currency/issuer selection if they exist for this wallet
               if (savedCurrency && savedIssuer) {
                    const existingIOUs = this.trustlineStoreService.existingIOUs();
                    const stillExists = existingIOUs.some((tl: any) => tl.currency === savedCurrency && tl.issuer === savedIssuer);

                    if (stillExists) {
                         this.currencyStoreService.setCurrency(savedCurrency);
                         this.currencyStoreService.setIssuer(savedIssuer);
                    } else if (existingIOUs.length > 0) {
                         // Pick the first available
                         this.currencyStoreService.setCurrency(existingIOUs[0].currency);
                         this.currencyStoreService.setIssuer(existingIOUs[0].issuer);
                    }
               }

               // Force balance refresh
               await this.trustlineCurrencyService.refreshCurrentBalance();
          } finally {
               this.isSummaryLoading.set(false);
               this.isSwitchingWallet = false;
          }
     }

     async onCurrencyChange(item: any) {
          const stack = new Error().stack;
          console.log(`[onCurrencyChange] Called with:`, item);
          console.log(`[onCurrencyChange] Stack:`, stack?.split('\n').slice(1, 4).join('\n'));
          this.currencyDebouncer.next(item);
          await new Promise(resolve => setTimeout(resolve, 50));
          await this.trustlineUtilService.onCurrencyIssuerChange();
          await this.trustlineCurrencyService.refreshCurrentBalance();
          this.cdr?.detectChanges();
     }

     async onIssuerChange(item: any) {
          const stack = new Error().stack;
          console.log(`[onIssuerChange] Called with:`, item?.id?.slice(0, 8));
          console.log(`[onIssuerChange] Stack:`, stack?.split('\n').slice(1, 4).join('\n'));
          this.issuerDebouncer.next(item);
          await new Promise(resolve => setTimeout(resolve, 50));
          await this.trustlineUtilService.onCurrencyIssuerChange();
          await this.trustlineCurrencyService.refreshCurrentBalance();
          this.cdr?.detectChanges();
     }

     async onCurrencySelected(item: SelectItem | null) {
          this.trustlineCurrencyService.selectCurrency(item?.id ?? item ?? 'XRP');
          await this.trustlineUtilService.loadTrustlines(false);
     }

     async onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);

          // Add this: If both currency and issuer are set, fetch env and update flags
          if (this.currencyStoreService.currency() && address) {
               await this.trustlineUtilService.loadTrustlines(false);
          }
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          this.infoPanelExpanded.set(false);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     toggleOutstandingIOU() {
          this.trustlineStoreService.setField('outstandingIOUCollapsed', !this.trustlineStoreService.outstandingIOUCollapsed());
     }

     onFlagChange(flag: string) {
          if (this.trustlineCurrencyService.trustlineFlags[flag]) {
               TRUSTLINE.CONFLICTS[flag]?.forEach((conflict: string | number) => {
                    this.trustlineCurrencyService.trustlineFlags[conflict] = false;
               });
          }
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: string): Promise<void> {
          if (!TRUSTLINE_TAB.includes(tab as any)) return;
          this.trustlineViewModelService.activeTab.set(tab as TrustlineActionTypes);
          this.trustlineUtilService.activeTab.set(tab as TrustlineActionTypes);
          this.clearInputFields();
          if (this.hasWallets() && this.trustlineStoreService.isLoaded()) {
               await this.getTrustlinesForAccount(true);
          }
     }

     async getTrustlinesForAccount(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);

          await this.measure('getTrustlinesForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();

               this.trustlineStoreService.setField('isLoading', true);
               this.trustlineStoreService.setField('error', '');

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);

                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
                    await this.trustlineUtilService.loadTrustlines(forceRefresh);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Failed to load trustlines:', error);
                    this.toastService.error(error.message || 'Failed to load checks', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.trustlineViewModelService.activeTab();
          const wallet = this.currentWallet();

          let destinationAddress = '';

          // Special case for non-TX tab
          if (currentTab === 'addNewIssuers') {
               return;
          }

          if (currentTab === 'setTrustline') {
               const trustLineflags = this.trustlineCurrencyService.flags();
               if (trustLineflags['tfSetNoRipple'] && trustLineflags['tfClearNoRipple']) {
                    this.toastService.error(`Cannot set both tfSetNoRipple and tfClearNoRipple`, AppConstants.TOAST.ERROR);
                    return;
               }
               if (trustLineflags['tfSetFreeze'] && trustLineflags['tfClearFreeze']) {
                    this.toastService.error(`Cannot set both tfSetFreeze and tfClearFreeze`, AppConstants.TOAST.ERROR);
                    return;
               }
               let flags = 0;
               Object.entries(this.trustlineCurrencyService.flags()).forEach(([key, value]) => {
                    if (value) {
                         flags |= TRUSTLINE.FLAG_MAP[key as keyof typeof TRUSTLINE.FLAG_MAP];
                    }
               });

               this.trustlineStoreService.setField('trustlineFlags', flags);
          }

          if (currentTab === 'issueCurrency' || currentTab === 'clawbackTokens') {
               destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
               if (!destinationAddress) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }
               this.currencyStoreService.setField('destination', destinationAddress);
          }

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    ...(currentTab === 'issueCurrency' || currentTab === 'clawbackTokens' ? { destination: destinationAddress } : {}),
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (currentTab === 'removeTrustline') {
               const trustLineflags = this.trustlineCurrencyService.flags();
               if (trustLineflags['tfSetNoRipple'] && trustLineflags['tfClearNoRipple']) {
                    this.toastService.error(`Cannot set both tfSetNoRipple and tfClearNoRipple`, AppConstants.TOAST.ERROR);
                    return;
               }
               if (trustLineflags['tfSetFreeze'] && trustLineflags['tfClearFreeze']) {
                    this.toastService.error(`Cannot set both tfSetFreeze and tfClearFreeze`, AppConstants.TOAST.ERROR);
                    return;
               }

               const trustLine = env.trustlines?.result.lines.find((line: any) => {
                    const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
                    return line.account === this.currencyStoreService.issuer() && lineCurrency === this.currencyStoreService.currency();
               });

               if (!trustLine) {
                    this.toastService.error(`No trust line found for ${this.currencyStoreService.currency()} to issuer ${this.currencyStoreService.issuer()}`, AppConstants.TOAST.ERROR);
                    return;
               }

               let flags = 0;
               Object.entries(this.trustlineCurrencyService.flags()).forEach(([key, value]) => {
                    if (value) {
                         flags |= TRUSTLINE.FLAG_MAP[key as keyof typeof TRUSTLINE.FLAG_MAP];
                    }
               });

               this.trustlineStoreService.setField('trustlineFlags', flags);

               const check = this.trustlineUtilService.canRemoveTrustline(trustLine);
               if (!check.canRemove) {
                    this.toastService.error(`Cannot remove trustline ${trustLine.currency}/${trustLine.account}: ${check.reasons}`, AppConstants.TOAST.ERROR);
                    return;
               }
          }

          const trustline = this.trustlineStoreService.getAll();
          const currency = this.currencyStoreService.getAll();
          const account = this.accountConfiguratorStoreService.getAll();
          const txOptions = this.xrplTxOptionsStore.getAll();

          const config = {
               trustline,
               currency,
               account,
               txOptions,
               wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'setTrustline':
                              txResult = await this.trustlineTransactionOrchestratorService.executeTrustlineTx('setTrustline', config);
                              break;
                         case 'removeTrustline':
                              txResult = await this.trustlineTransactionOrchestratorService.executeTrustlineTx('removeTrustline', config);
                              break;
                         case 'issueCurrency':
                              txResult = await this.trustlineTransactionOrchestratorService.executeTrustlineTx('issueCurrency', config);
                              break;
                         case 'clawbackTokens':
                              txResult = await this.trustlineTransactionOrchestratorService.executeTrustlineTx('clawbackTokens', config);
                              break;
                    }
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) {
               this.toastService.error('Unexpected error when submitting transaction.', AppConstants.TOAST.ERROR);
               return;
          }

          await this.handleTxResult(txResult, env.client, env.wallet, destinationAddress);
          await this.trustlineCurrencyService.refreshCurrentBalance();
          this.txUiService.resetCurrentStepToIdle();
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          this.trustlineStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, env.wallet.classicAddress));
     }

     protected override handleCachedAccountObjects(accountObjects: xrpl.AccountObjectsResponse, address: string): void {
          this.trustlineStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(accountObjects, address));
     }

     private async syncAfterSelection(load = true) {
          if (load) {
               // Load trustlines with force refresh for the new pair
               await this.trustlineUtilService.onCurrencyIssuerChange();

               await this.trustlineCurrencyService.refreshCurrentBalance();

               // Force UI update
               this.cdr?.detectChanges(); // Inject ChangeDetectorRef if needed
          }
     }

     async refreshBalance() {
          await this.trustlineViewModelService.forceRefreshBalance();
     }

     private setRightPanel(): void {
          this.rightPanelService.setPanel({
               summaryComponent: TrustlinesSummaryComponent,
               summaryInputs: {
                    info: this.trustlineViewModelService.infoData(),
                    tab: this.trustlineViewModelService.activeTab(),
                    resetTrigger: this.rightPanelService.resetTrigger(),
               },

               mainComponent: TrustlineRequirementsInfoComponent,
               mainInputs: {
                    activeTab: this.activeTabForRequirements,
               },
          });
     }

     getButtonTooltip(): string {
          if (!this.connectionGuard.isConnectionReady()) {
               return 'Connection not ready. Please wait.';
          }

          if (!this.canPerformAction()) {
               const tab = this.trustlineViewModelService.activeTab();

               if (tab === 'setTrustline') {
                    if (this.trustlineViewModelService.isSelfTrustline()) {
                         return 'Cannot set trustline to yourself';
                    }
                    if (this.trustlineStoreService.trustlineAlreadyExist()) {
                         return 'Trustline already exists for this pair';
                    }
                    if (this.trustlineViewModelService.shouldShowSelfWarning()) {
                         return 'You cannot set a trustline to yourself. Please select a different issuer.';
                    }
                    if (this.trustlineViewModelService.shouldShowExistsWarning()) {
                         return 'Trustline already exists for this currency/issuer pair.';
                    }
                    return 'Cannot set trustline';
               }
               if (tab === 'removeTrustline') {
                    return 'Cannot remove trustline (balance > 0 or other restrictions)';
               }
               if (tab === 'clawbackTokens') {
                    return 'You must be the issuer to clawback tokens';
               }
               return 'Please fill required fields';
          }

          return '';
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
     }

     protected clearInputFields(): void {
          if (this.xrplTxOptionsStore.isSimulateEnabled()) return;
          this.trustlineCurrencyService.clearFlagsValue(this.trustlineViewModelService.activeTab());
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }
}
