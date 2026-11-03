import { Component, ChangeDetectorRef, OnInit, inject, ChangeDetectionStrategy, computed, effect, signal, OnDestroy, ViewChild } from '@angular/core';
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
import { PermissionedDomainStoreService } from '../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { TrustlineActionTypes } from './constants/trustline.types';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TrustlineFlagsComponent } from './tab/trustline-flags/trustline-flags.component';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { TrustlineTransactionOrchestratorService } from '../../services/trustlines/trustline-transaction-orchestrator/trustline-transaction-orchestrator.service';
import { TrustlineIssuersComponent } from './tab/trustline-issuers/trustline-issuers.component';
import { TrustlineIssueComponent } from './tab/trustline-issue/trustline-issue.component';
import { TrustlineDelegateComponent } from './tab/trustline-delegate/trustline-delegate.component';
import { TrustlineClawbackComponent } from './tab/trustline-clawback/trustline-clawback.component';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { TrustlinesSummaryComponent } from './ui-components/trustline-summary/trustlines-summary.component';
import { ButtonTooltipComponent } from '../shared/button-tooltip/button-tooltip.component';
import { ToggleSliderComponent } from '../shared/toggle-slider/toggle-slider.component';

@Component({
     selector: 'app-trustlines',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, ButtonTooltipComponent, OverlayModule, TransactionPreviewComponent, CurrencyFormSectionComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TransactionOptionsComponent, TrustlineFlagsComponent, TrustlineIssuersComponent, TrustlineIssueComponent, TrustlineClawbackComponent, TrustlineDelegateComponent, ToggleSliderComponent],
     templateUrl: './trustlines.component.html',
     styleUrl: './trustlines.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlinesComponent extends WalletDestinationBase implements OnInit, OnDestroy {
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
     private readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     private readonly rightPanelService = inject(RightPanelService);
     private readonly cdr = inject(ChangeDetectorRef);
     readonly permissionedDomainItems = computed<SelectItem[]>(() => {
          const walletAddress = this.currentWallet()?.classicAddress;
          if (!walletAddress || this.sharedObjectsStore.address() !== walletAddress) return [];

          const accountObjects = this.sharedObjectsStore.accountObjects()?.result?.account_objects;
          if (!Array.isArray(accountObjects)) return [];

          return accountObjects
               .filter(
                    (object: unknown): object is { LedgerEntryType: string; Owner: string; index: string } =>
                         typeof object === 'object' &&
                         object !== null &&
                         'LedgerEntryType' in object &&
                         object.LedgerEntryType === 'PermissionedDomain' &&
                         'Owner' in object &&
                         object.Owner === walletAddress &&
                         'index' in object &&
                         typeof object.index === 'string'
               )
               .map(domain => ({
                    id: domain.index,
                    display: `${domain.index.slice(0, 8)}...${domain.index.slice(-8)}`,
                    secondary: 'Permissioned Domain',
               }))
               .sort((a, b) => a.id.localeCompare(b.id));
     });
     public      readonly tabs = TRUSTLINE_TABS;
     public readonly tabMeta = TRUSTLINE_TAB_META;
     readonly setFlags: Record<string, any> = SET_FLAGS;
     readonly clearFlags: Record<string, any> = CLEAR_FLAGS;
     private isSwitchingWallet = false;
     readonly summaryExpanded = signal<boolean>(false);
     readonly delegateOptionEnabled = signal(false);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();

     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, TRUSTLINE_TAB, tab => this.setTab(tab));
          this.trustlineCurrencyService.load();
          this.trustlineCurrencyService.preferXrpAsDefault.set(false);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(false);
          this.trustlineCurrencyService.addMptInCurrencyDropdown.set(false);
          this.transactionDropdownService.loadCustomDestinations();
          this.setRightPanel();
     }

     private clearTrustlineData() {
          this.trustlineStoreService.setField('existingIOUs', []);
          this.trustlineStoreService.setField('trustlineAlreadyExist', false);
          this.trustlineStoreService.setField('isLoaded', false);
          this.trustlineStoreService.setField('isLoading', true);
          this.currencyStoreService.setField('balance', '0');

          this.cdr?.detectChanges();
     }

     private async loadWalletDataPreservingSelection(wallet: Wallet, savedCurrency: string, savedIssuer: string) {
          if (!wallet?.classicAddress) return;
          const currentTab = this.trustlineViewModelService.activeTab();

          try {
               const env = await this.txEnvironmentService.prepareTxEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    includeGatewayBalance: true,
                    forceRefresh: false,
               });

               if (!env.accountObjects?.result || !env.accountInfo) {
                    throw new Error('Unable to fetch wallet account data.');
               }

               this.updateSharedObjectsStore(env);
               this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);

               const existingIOUs = this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, wallet.classicAddress);
               this.trustlineStoreService.setField('existingIOUs', existingIOUs);

               let selectionRestored = false;

               // First, try to restore saved selection
               if (savedCurrency && savedIssuer) {
                    const selectionExists = existingIOUs.some((tl: any) => tl.currency === savedCurrency && tl.issuer === savedIssuer);
                    if (selectionExists) {
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
                    }

                    // For Set Trustline tab on an issuer wallet, we want to select self to show warning
                    if (currentTab === 'setTrustline' && isIssuerForCurrencies.length > 0) {
                         const currencyToSelect = isIssuerForCurrencies[0];
                         const selfAddress = wallet.classicAddress;

                         this.currencyStoreService.setCurrency(currencyToSelect);
                         this.currencyStoreService.setIssuer(selfAddress);
                         this.trustlineCurrencyService.forceIssuerRefresh();

                         selectionRestored = true;
                    }

                    // If not restored, try to find a trustline where this wallet is NOT the issuer (holder)
                    if (!selectionRestored) {
                         const nonSelfTrustline = existingIOUs.find((tl: any) => tl.issuer !== wallet.classicAddress);
                         if (nonSelfTrustline) {
                              this.currencyStoreService.setCurrency(nonSelfTrustline.currency);
                              this.currencyStoreService.setIssuer(nonSelfTrustline.issuer);
                              selectionRestored = true;
                         } else if (existingIOUs.length > 0) {
                              const first = existingIOUs[0];
                              this.currencyStoreService.setCurrency(first.currency);
                              this.currencyStoreService.setIssuer(first.issuer);
                              selectionRestored = true;
                         }
                    }

                    // If no trustlines, try to find a good currency/issuer pair
                    if (!selectionRestored) {
                         const currenciesList = this.trustlineCurrencyService.currencies();

                         for (const currency of currenciesList) {
                              const issuers = this.trustlineCurrencyService.getIssuersForCurrency(currency);
                              if (issuers.includes(wallet.classicAddress)) {
                                   this.currencyStoreService.setCurrency(currency);
                                   this.currencyStoreService.setIssuer(wallet.classicAddress);
                                   selectionRestored = true;
                                   break;
                              }
                         }

                         // If not restored and not a self-issuer, find a non-self issuer
                         if (!selectionRestored) {
                              for (const currency of currenciesList) {
                                   const issuers = this.trustlineCurrencyService.getIssuersForCurrency(currency);
                                   const nonSelfIssuer = issuers.find(issuer => issuer !== wallet.classicAddress);
                                   if (nonSelfIssuer) {
                                        this.currencyStoreService.setCurrency(currency);
                                        this.currencyStoreService.setIssuer(nonSelfIssuer);
                                        selectionRestored = true;
                                        break;
                                   }
                              }
                         }

                         // Ultimate fallback
                         if (!selectionRestored && currenciesList.length > 0) {
                              const currency = currenciesList[0];
                              this.currencyStoreService.setCurrency(currency);
                              this.currencyStoreService.setIssuer(this.trustlineCurrencyService.getIssuersForCurrency(currency)[0] ?? '');
                         }
                    }
               }

               const selectedCurrency = this.currencyStoreService.currency();
               const selectedIssuer = this.currencyStoreService.issuer();

               // Check if trustline exists (for holders) OR if this is a self-selection for issuer
               const trustLineExists = selectedIssuer !== wallet.classicAddress && existingIOUs.some((tl: any) => tl.currency === selectedCurrency && tl.issuer === selectedIssuer);

               this.trustlineStoreService.setField('trustlineAlreadyExist', trustLineExists);

               // Force flag + limit sync
               await this.trustlineUtilService.onCurrencyIssuerChange(env);
               this.cdr.detectChanges();

               this.trustlineStoreService.setField('isLoaded', true);
          } catch (error) {
               console.error('[loadWalletDataPreservingSelection] ERROR:', error);
               this.toastService.error('Failed to load wallet data', AppConstants.TOAST.ERROR);
          } finally {
               this.trustlineStoreService.setField('isLoading', false);
          }
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

     readonly isDelegateOptionEnabled = computed(() => this.trustlineViewModelService.activeTab() === 'setTrustline' && (this.delegateOptionEnabled() || !!this.trustlineStoreService.delegatorAddress()?.trim()));
     readonly isDelegating = computed(() => this.isDelegateOptionEnabled());

     onDelegateOptionToggled(enabled: boolean): void {
          this.delegateOptionEnabled.set(enabled);
          if (!enabled) {
               this.trustlineStoreService.setField('delegatorAddress', '');
               this.trustlineStoreService.setField('delegateHolder', '');
               this.trustlineStoreService.setField('delegateCurrency', '');
          }
     }

     private readonly isDelegationReady = computed(() => {
          const delegator = this.trustlineStoreService.delegatorAddress()?.trim();
          const holder = this.trustlineStoreService.delegateHolder()?.trim();
          return xrpl.isValidAddress(delegator) && delegator !== this.currentWallet()?.address && !!holder && xrpl.isValidAddress(holder) && holder !== delegator && !!this.trustlineStoreService.delegateCurrency()?.trim();
     });

     public canPerformAction = computed(() => {
          const idle = this.isIdle();
          const ready = this.connectionGuard.isConnectionReady();

          if (!idle || !ready) return false;

          const tab = this.trustlineViewModelService.activeTab();

          switch (tab) {
               case 'setTrustline':
                    if (this.isDelegating()) return this.isDelegationReady();
                    // Can't set if trustline exists OR if trying to set trustline to self
                    // return !this.trustlineStoreService.trustlineAlreadyExist() && !this.trustlineViewModelService.isSelfTrustline();
                    return !this.trustlineViewModelService.shouldShowSelfWarning() && !this.trustlineViewModelService.shouldShowExistsWarning();

               case 'removeTrustline':
                    return this.trustlineStoreService.removeTrustlineAvailable();

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

     @ViewChild('currencyFormRef') currencyForm?: CurrencyFormSectionComponent;

     protected async onSelectedWalletIndexChange(): Promise<void> {
          if (this.isSwitchingWallet) return;
          this.isSwitchingWallet = true;

          const wallet = this.walletManagerService.getSelectedWallet();
          const savedCurrency = this.currencyStoreService.currency();
          const savedIssuer = this.currencyStoreService.issuer();

          this.isSummaryLoading.set(true);

          try {
               this.trustlineStoreService.reset();
               this.currencyStoreService.reset();
               this.rightPanelService.resetFilters();
               this.xrplTxOptionsStore.reset();
               this.permissionedDomainStoreService.setField('domainId', '');
               this.clearTrustlineData();

               if (wallet?.classicAddress) {
                    this.tryPrePopulateFromCache(wallet.classicAddress);
                    await this.loadWalletDataPreservingSelection(wallet, savedCurrency, savedIssuer);
               } else {
                    this.trustlineStoreService.setField('isLoading', false);
               }
          } finally {
               this.isSummaryLoading.set(false);
               this.isSwitchingWallet = false;
          }
     }

     async onCurrencyChange(item: any) {
          // Update currency store immediately
          this.trustlineCurrencyService.selectCurrency(item?.id ?? item ?? 'XRP', false);
          await this.trustlineUtilService.onCurrencyIssuerChange();
          this.cdr?.detectChanges();
     }

     async onIssuerChange(item: any) {
          // Update issuer store immediately
          this.trustlineCurrencyService.selectIssuer(item?.id ?? item ?? '', false);
          await this.trustlineUtilService.onCurrencyIssuerChange();
          this.cdr?.detectChanges();
     }

     async onCurrencySelected(item: SelectItem | null) {
          this.trustlineCurrencyService.selectCurrency(item?.id ?? item ?? 'XRP', false);
          await this.trustlineUtilService.onCurrencyIssuerChange();
     }

     async onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address, false);

          if (this.currencyStoreService.currency() && address) {
               await this.trustlineUtilService.onCurrencyIssuerChange();
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
          this.txUiService.resetCurrentStepToIdle();
          this.txUiService.clearAllOptionsAndMessages();
          this.xrplTxOptionsStore.reset();
          if (this.hasWallets() && this.trustlineStoreService.isLoaded()) {
               await this.trustlineUtilService.onCurrencyIssuerChange();
          }
     }

     async getTrustlinesForAccount(forceRefresh = false, preserveTransactionDisplay = false): Promise<void> {
          this.isSummaryLoading.set(true);

          await this.measure('getTrustlinesForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               if (!preserveTransactionDisplay) {
                    this.txUiService.clearAllOptionsAndMessages();
               }
               this.xrplTxOptionsStore.reset();

               this.trustlineStoreService.setField('isLoading', true);
               this.trustlineStoreService.setField('error', '');

               try {
                    if (!this.walletManagerService.ensureWalletSelected()) return;

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeGatewayBalance: true,
                         forceRefresh,
                    });

                    if (!env.accountInfo || !env.accountObjects?.result) throw new Error('Unable to get environment.');

                    this.updateSharedObjectsStore(env);
                    await this.trustlineUtilService.loadTrustlines(forceRefresh, env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Failed to load trustlines:', error);
                    this.toastService.error(error.message || 'Failed to load checks', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.trustlineStoreService.setField('isLoading', false);
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

          const isDelegating = this.isDelegating();

          if (currentTab === 'setTrustline' && !isDelegating) {
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

          // Validate currency form if present (prevents submitting invalid amounts)
          if (this.currencyForm && !isDelegating) {
               const valid = this.currencyForm.validate();
               if (!valid) {
                    this.toastService.error('Please fix validation errors before submitting.', AppConstants.TOAST.ERROR);
                    return;
               }
          }

          if (currentTab === 'issueCurrency' || currentTab === 'clawbackTokens') {
               const destinationTag = this.xrplTxOptionsStore.destinationTag()?.trim();
               if (destinationTag && (!/^\d+$/.test(destinationTag) || Number(destinationTag) <= 0 || Number(destinationTag) > 4294967295)) {
                    this.toastService.error('Destination Tag must be a whole number between 1 and 4294967295.', AppConstants.TOAST.ERROR);
                    return;
               }

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

          // Reload trustlines to get updated data (newly created trustlines, updated limits, etc.)
          await this.getTrustlinesForAccount(true, true);

          this.txUiService.resetCurrentStepToIdle();
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          this.trustlineStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, env.wallet.classicAddress));
     }

     protected override handleCachedAccountObjects(accountObjects: xrpl.AccountObjectsResponse, address: string): void {
          this.trustlineStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(accountObjects, address));
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
                    wallet: this.currentWallet(),
                    selectedWalletAddress: this.currentWallet()?.classicAddress || this.currentWallet()?.address || '',
               },

               mainComponent: TrustlineRequirementsInfoComponent,
          });
     }

     getButtonTooltip(): string {
          if (!this.connectionGuard.isConnectionReady()) {
               return 'Connection not ready. Please wait.';
          }

          if (!this.isIdle() || !this.hasWallets()) {
               return 'Please wait or select a wallet';
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
          this.currencyStoreService.setField('amount', null);
          this.xrplTxOptionsStore.setField('destinationTag', '');
          this.permissionedDomainStoreService.setField('domainId', '');
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
          this.trustlineStoreService.setField('delegatorAddress', '');
          this.trustlineStoreService.setField('delegateHolder', '');
          this.trustlineStoreService.setField('delegateCurrency', '');
          this.delegateOptionEnabled.set(false);
     }
}
