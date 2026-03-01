import { Component, OnInit, inject, computed, DestroyRef, signal, ChangeDetectionStrategy, effect, ChangeDetectorRef } from '@angular/core';
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
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../shared/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { MptUtilService } from '../../services/mpt-service/mpt-util/mpt-util.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { TrustlineOrchestratorService } from '../../services/trustline-currency/trustline-orchestrator/trustline-orchestrator.service';
import { CurrencyFormSectionComponent } from '../shared/currency-form-section/currency-form-section.component';

@Component({
     selector: 'app-trustlines',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent, CurrencyFormSectionComponent],
     animations: [
          trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])]),
          trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(-20px)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))])]),
     ],
     templateUrl: './trustlines.component.html',
     styleUrl: './trustlines.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlinesComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly trustlineOrchestratorService = inject(TrustlineOrchestratorService);
     private readonly walletManager = inject(WalletManagerService);
     private readonly cdr = inject(ChangeDetectorRef);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     selectedWalletIndex = signal<number>(0);
     trustlineAlreadyExist = signal<boolean>(false);
     removeTrustlineAviable = signal<boolean>(true);
     removeTrustlineMessage = signal<string[]>([]);
     activeTab = signal<'setTrustline' | 'removeTrustline' | 'issueCurrency' | 'clawbackTokens' | 'addNewIssuers'>('setTrustline');

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.trustlineCurrencyService.currencyBalance;

     showTrustlineOptions = signal<boolean>(false);
     outstandingIOUCollapsed = signal<boolean>(true);
     existingIOUs = signal<any[]>([]);

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     private readonly setTrustlineSpecificKeys = ['trustlineLimitField', 'currencyCode', 'currencyIssuer', 'trustlineFlags', 'suppressIndividualFeedback'] as const;
     private readonly removeTrustlineSpecificKeys = ['trustlineLimitField', 'currencyCode', 'currencyIssuer', 'trustlineFlags'] as const;
     private readonly issueClawbackCurrencySpecificKeys = ['trustlineLimitField', 'destinationTagField', 'sourceTagField', 'invoiceIdField', 'currencyCode', 'currencyIssuer'] as const;
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

     // Selected index change → clear + refresh checks
     private readonly _selectedIndexEffect = effect(() => {
          // Reading the signal is enough to trigger the effect
          this.walletManager.selectedIndex();

          this.txUiService.clearAllOptionsAndMessages();
          this.clearInputFields();

          // Fire-and-forget refresh
          void this.getTrustlinesForAccount(false);
     });

     selectedIssuerAddress = computed(() => this.trustlineCurrencyService.getSelectedIssuer());

     selectedCurrencyItem = computed(() => this.currencyItems().find(i => i.id === this.trustlineCurrencyService.currentCurrency()) ?? null);

     selectedIssuerItem = computed(() => this.issuerItems().find(i => i.id === this.trustlineCurrencyService.selectedIssuer()) ?? null);

     readonly canSubmit = computed(() => this.isIdle() && this.hasWallets());

     readonly infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const explorerBase = this.txUiService.explorerUrl();
          const address = wallet.address;

          const allTrustlines = this.existingIOUs();
          const tab = this.activeTab();

          let relevantTrustlines: typeof allTrustlines = [];
          let countText: string;
          let emptyMessage: string;
          let helpHint: string | null = null;

          switch (tab) {
               case 'setTrustline':
                    // For setting new trustlines → we usually show nothing useful here,
                    // or optionally show already trusted ones as "cannot set again"
                    relevantTrustlines = allTrustlines;
                    countText = 'existing trustlines';
                    emptyMessage = 'has no trustlines yet.';
                    helpHint = 'You can set trustlines to new issuers/currencies.';
                    break;

               case 'removeTrustline':
                    relevantTrustlines = allTrustlines.filter(tl => {
                         const bal = Number(tl.balance);
                         const lim = Number(tl.limit);
                         const needsClearNoRipple = tl.flags?.includes('NoRipple') && !this.trustlineCurrencyService.flags.tfClearNoRipple;
                         const frozen = tl.flags?.some((f: string | string[]) => f.includes('Freeze'));
                         return bal === 0 && lim === 0 && !frozen && !needsClearNoRipple;
                         // You can make this stricter or looser depending on your remove logic
                    });
                    countText = 'removable trustlines';
                    emptyMessage = 'has no trustlines that can be removed right now.';
                    helpHint = relevantTrustlines.length === 0 && allTrustlines.length > 0 ? '' : null;
                    break;

               case 'issueCurrency':
               case 'clawbackTokens':
                    // Only trustlines where THIS wallet is the issuer → negative balance (obligation)
                    relevantTrustlines = allTrustlines.filter(tl => Number(tl.balance) < 0);
                    countText = tab === 'issueCurrency' ? 'currencies you can issue' : 'currencies you can clawback';
                    emptyMessage = tab === 'issueCurrency' ? 'has no currencies you can issue (you must be the issuer).' : 'has no clawback-enabled currencies (you must be the issuer).';
                    helpHint = relevantTrustlines.length === 0 && allTrustlines.length > 0 ? '' : null;
                    break;

               case 'addNewIssuers':
                    relevantTrustlines = allTrustlines;
                    countText = 'saved trustlines';
                    emptyMessage = 'has no trustlines configured yet.';
                    break;

               default:
                    relevantTrustlines = allTrustlines;
                    countText = 'trustlines';
                    emptyMessage = 'has no trustlines.';
          }

          const count = relevantTrustlines.length;

          const links = count > 0 ? `<a href="${explorerBase}account/${address}/tokens" target="_blank" class="xrpl-win-link">View on explorer</a>` : '';

          // Only show items when expanded
          const trustlinesToShow = this.txUiService.infoPanelExpanded()
               ? relevantTrustlines.map(tl => ({
                      currency: tl.currency,
                      issuer: tl.issuer,
                      balance: tl.balance,
                      limit: tl.limit,
                      flags: tl.flags || [],
                 }))
               : [];

          return {
               walletName,
               activeTab: tab,
               trustlineCount: count,
               trustlinesToShow,
               links,
               countText, // new
               emptyMessage, // new
               helpHint, // new — shown only when useful
          };
     });

     readonly infoData1 = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const explorerBase = this.txUiService.explorerUrl();
          const address = wallet.address;

          const allTrustlines = this.existingIOUs();
          const count = allTrustlines.length;

          // Super lightweight links
          const links = count > 0 ? `<a href="${explorerBase}account/${address}/tokens" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View tokens</a>` : '';

          // Only build list when panel is expanded — this is the key!
          const trustlinesToShow = this.txUiService.infoPanelExpanded()
               ? allTrustlines.map(tl => {
                      const balance = tl.Balance.value;
                      const limit = tl.HighLimit?.issuer === address ? tl.HighLimit.value : tl.LowLimit?.value;
                      const issuer = tl.HighLimit?.issuer === address ? tl.LowLimit.issuer : tl.HighLimit?.issuer;

                      const flags = Object.entries(AppConstants.TRUSTLINE.LEDGER_FLAG_MAP)
                           .filter(([_, v]) => tl.Flags & v)
                           .map(([k]) =>
                                k
                                     .replace('lsf', '')
                                     .replaceAll(/([A-Z])/g, ' $1')
                                     .trim()
                           );

                      return {
                           currency: tl.Balance.currency,
                           issuer,
                           balance,
                           limit,
                           flags,
                      };
                 })
               : [];

          return {
               walletName,
               activeTab: this.activeTab(),
               trustlineCount: count,
               trustlinesToShow,
               links,
          };
     });

     readonly isIssuerForSelected = computed(() => {
          const walletAddr = this.currentWallet()?.address?.toLowerCase().trim();
          if (!walletAddr) return false;

          // Get the *currently active* issuer from the dropdown / service
          // This ensures it's the one the user has selected right now
          const activeIssuer = this.selectedIssuerItem()?.id?.toLowerCase().trim();

          // Fallback: if no dropdown item selected yet, use the service's raw value
          const fallbackIssuer = this.trustlineCurrencyService.selectedIssuer()?.toLowerCase().trim();

          const currentIssuer = activeIssuer || fallbackIssuer || '';

          return walletAddr === currentIssuer;
     });

     readonly actionButtonLabel = computed(() => {
          if (this.isIssuerForSelected()) {
               return 'Issue Tokens';
          } else {
               return 'Send Tokens';
          }
     });

     readonly formTitle = computed(() => {
          return this.isIssuerForSelected() ? 'Issue new tokens to destination' : 'Send held tokens to destination';
     });

     readonly hintText = computed(() => {
          if (this.isIssuerForSelected()) {
               return 'You are the issuer — this will increase the total supply of this currency.';
          } else {
               return 'You are sending tokens you already hold — not creating them.';
          }
     });

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     readonly isSplitLayout = computed(() => this.activeTab() === 'setTrustline' || this.activeTab() === 'removeTrustline');

     readonly isPairedLayout = computed(() => this.activeTab() === 'issueCurrency' || this.activeTab() === 'clawbackTokens');

     readonly currencyLayout = computed<'split' | 'paired'>(() => {
          const tab = this.activeTab();

          if (tab === 'setTrustline' || tab === 'removeTrustline') {
               return 'split';
          }

          if (tab === 'issueCurrency' || tab === 'clawbackTokens') {
               return 'paired';
          }

          return 'paired';
     });

     // New computed — only used for issue/clawback tabs
     readonly transactionAmount = computed(() => {
          const tab = this.activeTab();

          // Only apply special logic for send/issue and clawback tabs
          if (tab === 'issueCurrency' || tab === 'clawbackTokens') {
               // Always editable, start empty or with a sensible default
               // You can also read from txUiService.amountField() if you want to preserve user input
               return this.txUiService.amountField() || '0'; // or '' if you prefer blank
          }

          // For set/remove trustline tabs → fall back to trustline limit logic
          return this.displayedTrustLimit();
     });

     readonly displayedTrustLimit = computed(() => {
          const tab = this.activeTab();

          const existing = this.foundTrustline();

          if (tab === 'removeTrustline') {
               // Show real limit if trustline exists, else 0
               return existing ? existing.limit : '0';
          }

          // Set tab
          if (existing) {
               return existing.limit;
          }
          return ''; // new trustline → empty
     });

     readonly displayedBalance = computed(() => {
          const tab = this.activeTab();

          // Remove tab: always show real balance (should be 0 anyway)
          if (tab === 'removeTrustline') {
               return this.foundTrustline()?.balance ?? '0';
          }

          // Set tab: show real balance if exists, else 0
          const existing = this.foundTrustline();
          return existing ? existing.balance : '0';
     });

     // Helper to find current selected trustline (null if none)
     private readonly foundTrustline = computed(() => {
          const currency = this.trustlineCurrencyService.currentCurrency();
          const issuer = this.trustlineCurrencyService.selectedIssuer();
          if (!currency || !issuer) return null;

          return this.existingIOUs().find(tl => tl.currency === currency && tl.issuer === issuer) ?? null;
     });

     // Amount displayed/used in the form field
     readonly formAmount = computed(() => {
          const tab = this.activeTab();

          if (tab === 'issueCurrency' || tab === 'clawbackTokens') {
               // Transaction tabs: use persistent user input (or default to empty/'0')
               // const userEntered = this.txUiService.amountField();
               // return userEntered ?? '';
               return '';
               // Alternative: always start fresh → return '';
          }

          if (tab === 'removeTrustline') {
               // Remove tab: show 0 (as you requested), or real limit if preferred
               return '0';
               // If you want real current limit instead: return this.foundTrustline()?.limit ?? '0';
          }

          // Set Trustline tab
          const existing = this.foundTrustline();
          if (existing) {
               // Existing trustline → pre-fill current limit (read-only)
               return existing.limit;
          }
          // New trustline → empty/editable
          return '';
     });

     // Optional: separate read-only flag for clarity
     readonly isAmountReadOnly = computed(() => {
          const tab = this.activeTab();
          return tab === 'removeTrustline' || (tab === 'setTrustline' && this.trustlineAlreadyExist());
     });

     constructor() {
          super();
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.trustlineCurrencyService.setPreferXrpAsDefault(false);
          this.trustlineCurrencyService.setXrpInDropdown(false);
          this.trustlineCurrencyService.setAddMptInDropdown(false);
          this.transactionDropdownService.loadCustomDestinations();
     }

     async onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.currentWalletAddress.set(this.currentAddress());
          this.trustlineCurrencyService.selectCurrency(currency, '');

          const env = await this.txEnvironmentService.prepareTxEnvironment({
               includeTrustlines: true,
          });

          this.checkForExistingTrustline(env); // ← this now sets amountField correctly
          this.cdr.markForCheck(); // force UI update
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

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }

          this.trustlineCurrencyService.refreshCurrentBalance();
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

     toggleOutstandingIOU() {
          this.outstandingIOUCollapsed.set(!this.outstandingIOUCollapsed());
     }

     onFlagChange(flag: string) {
          if (this.trustlineCurrencyService.trustlineFlags[flag]) {
               AppConstants.TRUSTLINE.CONFLICTS[flag]?.forEach((conflict: string | number) => {
                    this.trustlineCurrencyService.trustlineFlags[conflict] = false;
               });
          }
     }

     toggleInfoPanel() {
          this.txUiService.infoPanelExpanded.update(expanded => !expanded);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     async setTab(tab: 'setTrustline' | 'removeTrustline' | 'issueCurrency' | 'clawbackTokens' | 'addNewIssuers'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          // === 1. Handle flag state FIRST ===
          if (this.activeTab() === 'removeTrustline') {
               // Smart detection: only enable what's needed
               if (this.currentWallet().address) {
                    try {
                         const env = await this.txEnvironmentService.prepareTxEnvironment({
                              includeAccountObject: true,
                         });
                         this.setRemoveFlagsBasedOnExistingTrustline(env.accountObjects!);
                    } catch (error: any) {
                         console.warn(`Error setting remove flags based on existing trustline: ${error.message}`);
                         this.trustlineCurrencyService.flags.tfClearNoRipple = true;
                         this.trustlineCurrencyService.flags.tfClearFreeze = true;
                         this.trustlineCurrencyService.flags.tfClearDeepFreeze = false;
                         this.trustlineCurrencyService.updateFlagTotal();
                    }
               }
          } else {
               // Leaving remove tab → reset remove-specific flags
               this.trustlineCurrencyService.flags.tfClearNoRipple = false;
               this.trustlineCurrencyService.flags.tfClearFreeze = false;
               this.trustlineCurrencyService.flags.tfClearDeepFreeze = false;
               this.trustlineCurrencyService.updateFlagTotal();
          }

          if (this.activeTab() === 'removeTrustline') {
               this.txUiService.amountField.set('0');
          }

          this.clearInputFields();
          if (this.hasWallets()) {
               await this.getTrustlinesForAccount(false);
          }
     }

     async getTrustlinesForAccount(forceRefresh = false): Promise<void> {
          await this.withPerf('getTrustlinesForAccount', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         forceRefresh: forceRefresh,
                    });

                    if (!env.accountInfo || !env.accountObjects) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    this.updateLocalAccountState(env.accountObjects, env.wallet.classicAddress);

                    const activeTab = this.activeTab();
                    if (activeTab === 'removeTrustline') {
                         this.txUiService.amountField.set('0');
                    }

                    const trustLine = this.checkForExistingTrustline(env);
                    if (trustLine) {
                         this.trustlineAlreadyExist.set(true);
                         return;
                    }

                    this.updateTrustLineFlagsInUI(env.accountObjects, env.wallet);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getTrustlinesForAccount:', error);
                    this.toastService.error(error.message || 'Failed to get trustlines', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     private checkForExistingTrustline(env: any): boolean {
          const currency = this.trustlineCurrencyService.currentCurrency();
          const issuer = this.trustlineCurrencyService.selectedIssuer();

          if (!currency || !issuer) {
               this.trustlineAlreadyExist.set(false);
               this.txUiService.amountField.set('');
               return false;
          }

          const trustLine = env.trustlines?.result.lines.find((line: any) => {
               const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
               return line.account === issuer && lineCurrency === currency;
          });

          if (trustLine) {
               this.trustlineAlreadyExist.set(true);

               // For Set tab: pre-fill limit
               if (this.activeTab() === 'setTrustline') {
                    this.txUiService.amountField.set(trustLine.limit);
               } else if (this.activeTab() === 'removeTrustline') {
                    this.txUiService.amountField.set('0');
               }

               // Balance is handled via displayedBalance() computed signal
               return true;
          } else {
               this.trustlineAlreadyExist.set(false);

               if (this.activeTab() === 'setTrustline') {
                    this.txUiService.amountField.set(''); // or '1000000' if you want default
               } else if (this.activeTab() === 'removeTrustline') {
                    this.txUiService.amountField.set('0');
               }

               return false;
          }
     }

     private checkForExistingTrustline1(env: any) {
          const currency = this.trustlineCurrencyService.currentCurrency();
          const issuer = this.trustlineCurrencyService.selectedIssuer();
          this.trustlineCurrencyService.selectCurrency(currency, '');

          this.trustlineAlreadyExist.set(false);
          this.removeTrustlineAviable.set(true);
          const trustLine = env.trustlines?.result.lines.find((line: any) => {
               const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
               const trustline = line.account === issuer && lineCurrency === currency && line.balance > 0;
               if (trustline) {
                    this.txUiService.amountField.set(line.limit);
               }
               return trustline;
          });
          return trustLine;
     }

     async setTrustLine() {
          await this.withPerf('setTrustLine', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (this.trustlineCurrencyService.flags['tfSetNoRipple'] && this.trustlineCurrencyService.flags['tfClearNoRipple']) {
                         return this.txUiService.setError('Cannot set both tfSetNoRipple and tfClearNoRipple');
                    }
                    if (this.trustlineCurrencyService.flags['tfSetFreeze'] && this.trustlineCurrencyService.flags['tfClearFreeze']) {
                         return this.txUiService.setError('Cannot set both tfSetFreeze and tfClearFreeze');
                    }

                    const currency = this.trustlineCurrencyService.getSelectedCurrency();
                    this.txUiService.currencyCode.set(currency);
                    const issuer = this.trustlineCurrencyService.selectedIssuer();
                    this.txUiService.currencyIssuer.set(issuer);
                    this.txUiService.suppressIndividualFeedback.set(false);

                    let flags = 0;
                    Object.entries(this.trustlineCurrencyService.flags).forEach(([key, value]) => {
                         if (value) {
                              flags |= AppConstants.TRUSTLINE.FLAG_MAP[key as keyof typeof AppConstants.TRUSTLINE.FLAG_MAP];
                         }
                    });

                    this.txUiService.trustlineFlags.set(flags);

                    const result = await this.trustlineOrchestratorService.executeTrustlineTx('setTrustline', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.setTrustlineSpecificKeys)),
                              // destinationAddress: destination,
                         },
                         extra: {},
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              // destinationAddress: destination,
                              wallet: env.wallet,
                         },
                    });

                    await this.handleTxResult(result, env.client, env.wallet, '', 'Failed to set trustline');
               } catch (error: any) {
                    console.error('Error in setTrustLine:', error);
                    this.toastService.error(error.message || 'Error setting trustline', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async removeTrustline() {
          await this.withPerf('removeTrustline', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (this.trustlineCurrencyService.flags['tfSetNoRipple'] && this.trustlineCurrencyService.flags['tfClearNoRipple']) {
                         this.toastService.error(`Cannot set both tfSetNoRipple and tfClearNoRipple`, AppConstants.TOAST.ERROR);
                         return;
                    }
                    if (this.trustlineCurrencyService.flags['tfSetFreeze'] && this.trustlineCurrencyService.flags['tfClearFreeze']) {
                         this.toastService.error(`Cannot set both tfSetFreeze and tfClearFreeze`, AppConstants.TOAST.ERROR);
                         return;
                    }

                    const currency = this.trustlineCurrencyService.getSelectedCurrency();
                    this.txUiService.currencyCode.set(currency);
                    const issuer = this.trustlineCurrencyService.selectedIssuer();
                    this.txUiService.currencyIssuer.set(issuer);
                    const trustLine = env.trustlines?.result.lines.find((line: any) => {
                         const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
                         return line.account === issuer && lineCurrency === currency;
                    });

                    if (!trustLine) {
                         this.toastService.error(`No trust line found for ${currency} to issuer ${issuer}`, AppConstants.TOAST.ERROR);
                         return;
                    }

                    let flags = 0;
                    Object.entries(this.trustlineCurrencyService.flags).forEach(([key, value]) => {
                         if (value) {
                              flags |= AppConstants.TRUSTLINE.FLAG_MAP[key as keyof typeof AppConstants.TRUSTLINE.FLAG_MAP];
                         }
                    });

                    this.txUiService.trustlineFlags.set(flags);

                    const check = this.canRemoveTrustline(trustLine);
                    if (!check.canRemove) {
                         this.toastService.error(`Cannot remove trustline ${trustLine.currency}/${trustLine.account}: ${check.reasons}`, AppConstants.TOAST.ERROR);
                         return;
                    }

                    const result = await this.trustlineOrchestratorService.executeTrustlineTx('removeTrustline', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.removeTrustlineSpecificKeys)),
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

                    await this.handleTxResult(result, env.client, env.wallet, '', 'Failed to remove trustline');
               } catch (error: any) {
                    console.error('Error removing trustline:', error);
                    this.toastService.error(error.message || 'Error removing trustline', AppConstants.TOAST.ERROR);
               }
          });
     }

     async issueCurrency() {
          await this.withPerf('issueCurrency', async () => {
               this.txUiService.resetCurrentStepToIdle();

               if (!this.ensureWalletSelected()) return;

               const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

               if (!destination) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const currency = this.trustlineCurrencyService.getSelectedCurrency();
                    this.txUiService.currencyCode.set(currency);
                    const issuer = this.trustlineCurrencyService.selectedIssuer();
                    this.txUiService.currencyIssuer.set(issuer);

                    const result = await this.trustlineOrchestratorService.executeTrustlineTx('issueCurrency', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.issueClawbackCurrencySpecificKeys)),
                              destinationAddress: destination,
                         },
                         extra: {},
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

                    await this.handleTxResult(result, env.client, env.wallet, '', 'Failed to remove trustline');
               } catch (error: any) {
                    console.error('Error issuing currency:', error);
                    this.toastService.error(error.message || 'Error issuing currency', AppConstants.TOAST.ERROR);
               }
          });
     }

     async clawbackTokens() {
          await this.withPerf('clawbackTokens', async () => {
               this.txUiService.resetCurrentStepToIdle();

               if (!this.ensureWalletSelected()) return;

               const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

               if (!destination) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const currency = this.trustlineCurrencyService.getSelectedCurrency();
                    this.txUiService.currencyCode.set(this.utilsService.encodeIfNeeded(currency));
                    const issuer = this.trustlineCurrencyService.selectedIssuer();
                    this.txUiService.currencyIssuer.set(issuer);

                    const result = await this.trustlineOrchestratorService.executeTrustlineTx('clawbackTokens', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.issueClawbackCurrencySpecificKeys)),
                              destinationAddress: destination,
                         },
                         extra: {},
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
                    await this.handleTxResult(result, env.client, env.wallet, '', 'Failed to clawback tokens');
               } catch (error: any) {
                    console.error('Error issuing currency:', error);
                    this.toastService.error(error.message || 'Error issuing currency', AppConstants.TOAST.ERROR);
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

     async onCurrencyChange(currency: string) {
          this.trustlineCurrencyService.selectCurrency(currency, '');

          const env = await this.txEnvironmentService.prepareTxEnvironment({
               includeTrustlines: true,
          });

          this.checkForExistingTrustline(env); // ← this now sets amountField correctly
          // this.cdr.markForCheck(); // force UI update
          // if (this.checkForExistingTrustline(env)) {
          //      this.trustlineAlreadyExist.set(true);
          // } else {
          //      this.txUiService.amountField.set('');
          // }
     }

     onIssuerChange(issuer: string) {
          this.trustlineCurrencyService.selectIssuer(issuer);
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

          this.txUiService.newCurrency.set('');
          this.txUiService.newIssuer.set('');
          this.trustlineCurrencyService.clearFlagsValue(this.activeTab());
          this.selectedDestinationAddress.set('');
     }

     private updateTrustLineFlagsInUI(accountObjects: xrpl.AccountObjectsResponse, wallet: xrpl.Wallet) {
          const currency = this.trustlineCurrencyService.getSelectedCurrency();
          const issuer = this.trustlineCurrencyService.selectedIssuer();
          const activeTab = this.activeTab();

          Object.keys(this.trustlineCurrencyService.flags).forEach(k => (this.trustlineCurrencyService.flags[k as keyof typeof this.trustlineCurrencyService.flags] = false));

          const encoded = this.utilsService.encodeIfNeeded(currency);
          const walletAddr = wallet.classicAddress || wallet.address;

          const state = accountObjects.result.account_objects.find((obj): obj is xrpl.LedgerEntry.RippleState => {
               return obj.LedgerEntryType === 'RippleState' && obj.Balance?.currency === encoded && (obj.LowLimit?.issuer === walletAddr || obj.HighLimit?.issuer === walletAddr) && (obj.LowLimit?.issuer === issuer || obj.HighLimit?.issuer === issuer);
          });

          if (!state) {
               if (activeTab !== 'removeTrustline') this.trustlineCurrencyService.clearFlagsValue(activeTab);
               return;
          }

          const flags = state.Flags ?? 0;
          const isLowSide = state.LowLimit?.issuer === walletAddr;
          const map = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

          if (activeTab === 'removeTrustline') {
               if (flags & map.lsfNoRipple) this.trustlineCurrencyService.flags.tfClearNoRipple = true;
               if (isLowSide ? flags & map.lsfLowFreeze : flags & map.lsfHighFreeze) this.trustlineCurrencyService.flags.tfClearFreeze = true;
               // tfSetfAuth is almost never required for removal → keep false
          } else {
               // Normal "Set Trustline" tab → show current state
               this.trustlineCurrencyService.flags.tfSetfAuth = isLowSide ? !!(flags & map.lsfLowAuth) : !!(flags & map.lsfHighAuth);
               this.trustlineCurrencyService.flags.tfSetNoRipple = !!(flags & map.lsfNoRipple);
               this.trustlineCurrencyService.flags.tfSetFreeze = isLowSide ? !!(flags & map.lsfLowFreeze) : !!(flags & map.lsfHighFreeze);
          }

          this.trustlineCurrencyService.updateFlagTotal();
     }

     private setRemoveFlagsBasedOnExistingTrustline(accountObjects: xrpl.AccountObjectsResponse) {
          const currency = this.trustlineCurrencyService.getSelectedCurrency();
          const issuer = this.trustlineCurrencyService.selectedIssuer();

          // Reset everything that can block removal
          this.trustlineCurrencyService.flags.tfClearNoRipple = false;
          this.trustlineCurrencyService.flags.tfClearFreeze = false;
          this.trustlineCurrencyService.flags.tfClearDeepFreeze = false;
          this.trustlineCurrencyService.flags.tfSetfAuth = false; // ← This was your bug!

          if (!currency || !issuer || !this.currentWallet().address) return;

          const encoded = this.utilsService.encodeIfNeeded(currency);
          const walletAddr = this.currentWallet().classicAddress || this.currentWallet().address;

          const state = accountObjects.result.account_objects.find((obj): obj is xrpl.LedgerEntry.RippleState => {
               return obj.LedgerEntryType === 'RippleState' && obj.Balance?.currency === encoded && (obj.LowLimit?.issuer === walletAddr || obj.HighLimit?.issuer === walletAddr) && (obj.LowLimit?.issuer === issuer || obj.HighLimit?.issuer === issuer);
          });

          if (!state) return;

          const flags = state.Flags ?? 0;
          const isLowSide = state.LowLimit?.issuer === walletAddr;
          const map = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

          // Only turn on the clear flags if they are actually set
          if (flags & map.lsfNoRipple) this.trustlineCurrencyService.flags.tfClearNoRipple = true;
          if (isLowSide ? flags & map.lsfLowFreeze : flags & map.lsfHighFreeze) this.trustlineCurrencyService.flags.tfClearFreeze = true;

          // tfSetfAuth is almost never needed for removal — only if the *other* side authorized you
          // In 99.9% of cases (including yours) it should stay OFF
          // → So we deliberately DO NOT touch it here
          this.trustlineCurrencyService.updateFlagTotal();
     }

     public isAddValid(): boolean {
          const currency = this.txUiService.newCurrency()?.trim();
          const issuer = this.txUiService.newIssuer()?.trim();

          if (!currency || !issuer) return false;
          if (!this.utilsService.isValidCurrencyCode(currency)) return false;
          if (!xrpl.isValidAddress(issuer)) return false;

          const existing = this.trustlineCurrencyService.getIssuersForCurrency(currency);
          return !existing.includes(issuer);
     }

     public isRemoveValid(): boolean {
          const currency = this.trustlineCurrencyService.getSelectedCurrency();
          const issuer = this.trustlineCurrencyService.selectedIssuer();

          return !!currency && currency !== 'XRP' && !!issuer;
     }

     addNewCurrencyIssuer(): void {
          const currency = this.txUiService.newCurrency();
          const issuer = this.txUiService.newIssuer();

          if (!this.isAddValid()) {
               this.txUiService.setError('Invalid currency code or issuer address, or already exists');
               return;
          }

          this.trustlineCurrencyService.addToken(currency, issuer);

          this.onCurrencyChange(currency);

          this.txUiService.newCurrency.set('');
          this.txUiService.newIssuer.set('');

          this.toastService.success('Currency/Issuer added successfully');
     }

     removeCurrentCurrencyIssuer(): void {
          const currency = this.trustlineCurrencyService.getSelectedCurrency();
          const issuer = this.trustlineCurrencyService.selectedIssuer();

          if (!this.isRemoveValid()) {
               this.txUiService.setError('No valid currency or issuer selected to remove');
               return;
          }

          this.trustlineCurrencyService.removeToken(currency, issuer);

          this.toastService.success('Currency/Issuer removed successfully');

          const remainingIssuers = this.trustlineCurrencyService.getIssuersForCurrency(currency);
          if (remainingIssuers.length === 0) {
               const available = this.trustlineCurrencyService.getCurrencies();
               if (available.length > 0) {
                    this.onCurrencyChange(available[0]);
               }
          }
     }

     private canRemoveTrustline(line: any): { canRemove: boolean; reasons: string[] } {
          const reasons: string[] = [];

          const balance = Number(line.balance);

          if (balance !== 0) {
               reasons.push(`Balance is ${line.balance} (must be 0)`);
          }

          if (line.freeze) {
               reasons.push(`Trustline is frozen`);
          }

          if (line.no_ripple && !this.trustlineCurrencyService.flags.tfClearNoRipple) {
               reasons.push(`NoRipple flag must be cleared`);
          }

          if (line.authorized) {
               reasons.push(`Trustline is authorized (issuer must unauthorize first)`);
          }

          if (line.peer_authorized) {
               reasons.push(`Peer authorization is enabled`);
          }

          return {
               canRemove: reasons.length === 0,
               reasons,
          };
     }
}
