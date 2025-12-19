import { Component, inject, OnInit, computed, DestroyRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { IssuedCurrencyAmount } from 'xrpl';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
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
import { BehaviorSubject, combineLatest, Observable, Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { OfferCurrencyService } from '../../services/offer-currency/offer-currency.service';
import BigNumber from 'bignumber.js';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { ToastService } from '../../services/toast/toast.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface XRPLCurrency {
     currency: string;
     issuer?: string;
}

interface CurrencyAmountXRP {
     currency: 'XRP';
     value: string;
}

interface CurrencyAmountToken {
     currency: string;
     issuer: string;
     value: string;
}

interface SectionContent {
     key: string;
     value: string;
}

interface SectionSubItem {
     key: string;
     openByDefault: boolean;
     content: SectionContent[];
}

interface Section {
     title: string;
     openByDefault: boolean;
     content?: SectionContent[];
     subItems?: SectionSubItem[];
}

type CurrencyAmount = CurrencyAmountXRP | CurrencyAmountToken;

interface IssuerItem {
     name: string;
     address: string;
}

type PoolOptions = {
     bothPools: boolean;
     firstPoolOnly: boolean;
     secondPoolOnly: boolean;
};

@Component({
     selector: 'app-amm',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './amm.component.html',
     styleUrl: './amm.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAmmComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly offerCurrency = inject(OfferCurrencyService);

     public weWantIssuers$!: Observable<IssuerItem[]>;
     public weSpendIssuers$!: Observable<IssuerItem[]>;
     public weWantBalance$!: Observable<string>;
     public weSpendBalance$!: Observable<string>;
     private destroy$ = new Subject<void>();
     private ammInfoTrigger = new Subject<void>();

     // Destination Dropdown
     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     checkIdSearchQuery = signal<string>('');

     // Reactive State (Signals)
     activeTab = signal<'createAMM' | 'depositToAMM' | 'withdrawlTokenFromAMM' | 'clawbackFromAMM' | 'swapViaAMM' | 'deleteAMM'>('createAMM');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     amountField = signal<string>('');
     destinationField = signal<string>('');
     destinationTagField = signal<string>('');
     currencyFieldDropDownValue = signal<string>('XRP');
     selectedWalletIndex = signal<number>(0);
     currencyChangeTrigger = signal(0);
     holderField = signal<string>('');
     insufficientLiquidityWarning = signal<boolean>(false);
     lpTokenBalanceField = signal<string>('0');
     tradingFeeField = signal<string>('0.1');
     withdrawlLpTokenFromPoolField = signal<string>('');

     // Pool & LP balances – now signals instead of BehaviorSubjects
     assetPool1Balance = signal<string>('0');
     assetPool2Balance = signal<string>('0');
     lpTokenBalance = signal<string>('0');

     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];

     // Primary currency/issuer/amount signals (removed duplicate "*Field" versions)
     weWantCurrency = signal<string>('');
     weSpendCurrency = signal<string>('XRP');
     availableCurrencies: string[] = [];
     weWantIssuer = signal<string>('');
     weSpendIssuer = signal<string>('');
     weWantAmount = signal<string>('');
     weSpendAmount = signal<string>('');

     isMarketOrder = signal<boolean>(false);
     isFillOrKill = signal<boolean>(false);
     isPassive = signal<boolean>(true);

     knownIssuers = signal<Record<string, string[]>>({ XRP: [] });
     knownTrustLinesIssuers = signal<Record<string, string[]>>({ XRP: [] });

     existingOffers: any = [];
     existingSellOffers: any = [];
     existingBuyOffers: any = [];
     existingSellOffersCollapsed = signal<boolean>(true);

     withdrawOptions = signal<PoolOptions>({
          bothPools: true,
          firstPoolOnly: false,
          secondPoolOnly: false,
     });

     depositOptions = signal<PoolOptions>({
          bothPools: true,
          firstPoolOnly: false,
          secondPoolOnly: false,
     });

     amountTimeout = signal<ReturnType<typeof setTimeout> | null>(null);
     weWantIssuersTrigger = signal(0);
     weSpendIssuersTrigger = signal(0);

     // Computed properties
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
          if (!addr) return this.destinationSearchQuery();
          const dest = this.destinations().find(d => d.address === addr);
          if (!dest) return addr;
          return this.dropdownService.formatDisplay(dest);
     });

     filteredDestinations = computed(() => {
          const q = this.destinationSearchQuery().trim().toLowerCase();
          if (q === '') return this.destinations();
          return this.destinations()
               .filter(d => d.address !== this.currentWallet().address)
               .filter(d => d.address.toLowerCase().includes(q) || (d.name ?? '').toLowerCase().includes(q));
     });

     storedIssuers = computed(() => {
          const issuersMap = this.knownTrustLinesIssuers();
          const result: { name: string; address: string }[] = [];
          for (const currency in issuersMap) {
               if (currency === 'XRP') continue;
               for (const address of issuersMap[currency]) {
                    result.push({ name: currency, address });
               }
          }
          return result.sort((a, b) => a.name.localeCompare(b.name));
     });

     weWantCurrencyItems = computed(() => {
          const currentCode = this.weWantCurrency();
          return this.offerCurrency.getAvailableCurrencies(true).map(curr => ({
               id: curr,
               display: curr === 'XRP' ? 'XRP' : curr,
               secondary:
                    curr === 'XRP'
                         ? 'Native currency'
                         : (() => {
                                const count = this.offerCurrency.getIssuersForCurrency(curr).length;
                                return count === 0 ? 'No issuers' : `${count} issuer${count !== 1 ? 's' : ''}`;
                           })(),
               isCurrentCode: curr === currentCode,
          }));
     });

     selectedWeWantCurrencyItem = computed(() => {
          const code = this.weWantCurrency();
          if (!code) return null;
          return this.weWantCurrencyItems().find(item => item.id === code) || null;
     });

     weSpendCurrencyItems = computed(() => [
          {
               id: 'XRP',
               display: 'XRP',
               secondary: 'Native currency',
               isCurrentCode: true,
          },
     ]);

     // weSpendCurrencyItems = computed(() => {
     //      const currentCode = this.weSpendCurrency();
     //      return this.offerCurrency.getAvailableCurrencies(true).map(curr => ({
     //           id: curr,
     //           display: curr === 'XRP' ? 'XRP' : curr,
     //           secondary:
     //                curr === 'XRP'
     //                     ? 'Native currency'
     //                     : (() => {
     //                            const count = this.offerCurrency.getIssuersForCurrency(curr).length;
     //                            return count === 0 ? 'No issuers' : `${count} issuer${count !== 1 ? 's' : ''}`;
     //                       })(),
     //           isCurrentCode: curr === currentCode,
     //      }));
     // });

     selectedWeSpendCurrencyItem = computed(() => ({
          id: 'XRP',
          display: 'XRP',
          secondary: '',
          isCurrentCode: true,
     }));

     // selectedWeSpendCurrencyItem = computed(() => {
     //      const code = this.weSpendCurrency();
     //      if (!code) return null;
     //      return this.weSpendCurrencyItems().find(item => item.id === code) || null;
     // });

     weWantIssuerItems = computed(() => {
          this.weWantIssuersTrigger();
          const currentIssuer = this.weWantIssuer();
          const issuers = this.offerCurrency.weWant.issuers$.value || [];
          return issuers.map((iss: IssuerItem, i: number) => ({
               id: iss.address,
               display: iss.name || `Issuer ${i + 1}`,
               secondary: `${iss.address.slice(0, 8)}...${iss.address.slice(-6)}`,
               isCurrentToken: iss.address === currentIssuer,
          }));
     });

     selectedWeWantIssuerItem = computed(() => {
          const addr = this.weWantIssuer();
          if (!addr) return null;
          return this.weWantIssuerItems().find((item: { id: string }) => item.id === addr) || null;
     });

     weSpendIssuerItems = computed(() => {
          this.weSpendIssuersTrigger();
          const currentIssuer = this.weSpendIssuer();
          const issuers = this.offerCurrency.weSpend.issuers$.value || [];
          return issuers.map((iss: IssuerItem, i: number) => ({
               id: iss.address,
               display: iss.name || `Issuer ${i + 1}`,
               secondary: `${iss.address.slice(0, 8)}...${iss.address.slice(-6)}`,
               isCurrentToken: iss.address === currentIssuer,
          }));
     });

     selectedWeSpendIssuerItem = computed(() => {
          const addr = this.weSpendIssuer();
          if (!addr) return null;
          return this.weSpendIssuerItems().find((item: { id: string }) => item.id === addr) || null;
     });

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const baseUrl = this.txUiService.explorerUrl();
          const address = wallet.address;
          return '';
     });

     hasWallets = computed(() => this.wallets().length > 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
          this.weWantIssuers$ = this.offerCurrency.weWant.issuers$;
          this.weSpendIssuers$ = this.offerCurrency.weSpend.issuers$;
          this.weWantBalance$ = this.offerCurrency.weWant.balance$;
          this.weSpendBalance$ = this.offerCurrency.weSpend.balance$;
          this.availableCurrencies = this.offerCurrency.getAvailableCurrencies(true);
     }

     ngOnInit(): void {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.currencyFieldDropDownValue.set('XRP');

          // Auto-select first issuer when issuers list changes
          this.offerCurrency.weWant.issuers$.pipe(takeUntil(this.destroy$)).subscribe(issuers => {
               this.weWantIssuersTrigger.update(n => n + 1);
               const firstIssuer = issuers[0]?.address ?? '';
               this.offerCurrency.selectWeWantIssuer(firstIssuer, this.currentWallet());
          });

          this.offerCurrency.weSpend.issuers$.pipe(takeUntil(this.destroy$)).subscribe(issuers => {
               this.weSpendIssuersTrigger.update(n => n + 1);
               const firstIssuer = issuers[0]?.address ?? '';
               this.offerCurrency.selectWeSpendIssuer(firstIssuer, this.currentWallet());
          });

          // Keep signals in sync with service selections
          this.offerCurrency.weWant.currency$.pipe(takeUntil(this.destroy$)).subscribe(currency => {
               this.weWantCurrency.set(currency);
          });

          this.offerCurrency.weWant.issuer$.pipe(takeUntil(this.destroy$)).subscribe(issuer => {
               this.weWantIssuer.set(issuer);
          });

          this.offerCurrency.weSpend.currency$.pipe(takeUntil(this.destroy$)).subscribe(currency => {
               this.weSpendCurrency.set(currency);
          });

          this.offerCurrency.weSpend.issuer$.pipe(takeUntil(this.destroy$)).subscribe(issuer => {
               this.weSpendIssuer.set(issuer);
          });

          // Initial defaults
          this.weSpendCurrency.set('XRP');
          this.offerCurrency.selectWeSpendCurrency('XRP', this.currentWallet());
          this.offerCurrency.selectWeSpendIssuer('', this.currentWallet());
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
                    if (wallet) {
                         this.clearFields();
                         this.selectWallet(wallet);
                         this.offerCurrency.setWalletAddress(wallet.address);

                         const currencies = this.offerCurrency.getAvailableCurrencies(true);
                         const defaultWant = currencies.includes('BOB') ? 'BOB' : currencies[0] || 'XRP';
                         this.offerCurrency.selectWeWantCurrency(defaultWant, wallet);
                         this.offerCurrency.selectWeSpendCurrency('XRP', wallet);
                    }
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.clearFields();
                    this.offerCurrency.setWalletAddress(wallet.address);

                    const currencies = this.offerCurrency.getAvailableCurrencies(true);
                    const defaultWant = currencies.includes('BOB') ? 'BOB' : currencies[0] || 'XRP';
                    this.offerCurrency.selectWeWantCurrency(defaultWant, wallet);
                    this.offerCurrency.selectWeSpendCurrency('XRP', wallet);
                    await this.getAMMPoolInfo(false, true);
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
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(v => !v);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
          this.offerCurrency.setWalletAddress(wallet.address);

          const currencies = this.offerCurrency.getAvailableCurrencies(true);
          const defaultWant = currencies.includes('BOB') ? 'BOB' : currencies[0] || 'XRP';
          this.offerCurrency.selectWeWantCurrency(defaultWant, wallet);
          this.offerCurrency.selectWeSpendCurrency('XRP', wallet);
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     ngOnDestroy(): void {
          this.destroy$.next();
          this.destroy$.complete();
          const existing = this.amountTimeout();
          if (existing) clearTimeout(existing);
     }

     trackByOfferIndex(index: number, offer: any): string {
          return offer.OfferIndex;
     }

     toggleExistingSellOffers() {
          this.existingSellOffersCollapsed.set(!this.existingSellOffersCollapsed);
     }

     async setTab(tab: 'createAMM' | 'depositToAMM' | 'withdrawlTokenFromAMM' | 'clawbackFromAMM' | 'swapViaAMM' | 'deleteAMM'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.clearFields();
          if (this.hasWallets()) {
               await this.getAMMPoolInfo(true, true);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getAMMPoolInfo(forceRefresh = false, clearMessages = false): Promise<void> {
          await this.withPerf('getAMMPoolInfo', async () => {
               if (clearMessages) {
                    this.txUiService.clearAllOptionsAndMessages();
               }
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const asset = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weWantCurrency()), this.weWantIssuer());
                    const asset2 = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weSpendCurrency()), this.weSpendIssuer());

                    const [{ accountInfo, accountObjects }, ammResponse, participation] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh), this.xrplService.getAMMInfo(client, asset, asset2, wallet.classicAddress, 'validated'), this.checkAmmParticipation(client, wallet.classicAddress, asset, asset2, true)]);

                    const amm = ammResponse?.result?.amm;

                    if (!amm) {
                         this.assetPool1Balance.set('0');
                         this.assetPool2Balance.set('0');
                         this.lpTokenBalance.set('0');
                    } else {
                         const toDisplay = (amt: any): string => {
                              const val = typeof amt === 'string' ? xrpl.dropsToXrp(amt) : amt.value;
                              return this.utilsService.formatTokenBalance(val, 18);
                         };

                         this.assetPool1Balance.set(toDisplay(amm.amount));
                         this.assetPool2Balance.set(toDisplay(amm.amount2));
                         this.lpTokenBalance.set(this.utilsService.formatTokenBalance(amm.lp_token.value, 18));
                         this.tradingFeeField.set(`${amm.trading_fee / 10000}`);
                    }

                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getAMMPoolInfo:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createAMM() {
          await this.withPerf('createAMM', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               // Define correct type for currency amounts
               type CurrencyAmount = string | xrpl.IssuedCurrencyAmount;

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, accountObjects, fee, currentLedger] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client)]);

                    const we_want_currency = this.utilsService.encodeIfNeeded(this.weWantCurrency());
                    const we_spend_currency = this.utilsService.encodeIfNeeded(this.weSpendCurrency());
                    const asset = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weWantCurrency()), this.weWantIssuer());
                    const asset2 = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weSpendCurrency()), this.weSpendIssuer());
                    this.utilsService.logObjects('we_want_currency', we_want_currency);
                    this.utilsService.logObjects('we_spend_currency', we_spend_currency);
                    this.utilsService.logAssets('asset', asset);
                    this.utilsService.logAssets('asset2', asset2);

                    // Build properly typed currency objects
                    const we_want: CurrencyAmount =
                         this.weWantCurrency() === 'XRP'
                              ? xrpl.xrpToDrops(this.weWantAmount())
                              : {
                                     currency: we_want_currency,
                                     issuer: this.weWantIssuer()!,
                                     value: this.weWantAmount(),
                                };

                    const we_spend: CurrencyAmount =
                         this.weSpendCurrency() === 'XRP'
                              ? xrpl.xrpToDrops(this.weSpendAmount())
                              : {
                                     currency: we_spend_currency,
                                     issuer: this.weSpendIssuer()!,
                                     value: this.weSpendAmount(),
                                };

                    this.utilsService.logAssets(we_want, we_spend);
                    const insufficientBalance = this.utilsService.validateAmmCreateBalances(accountInfo.result.account_data.Balance, accountObjects.result.account_objects, we_want, we_spend);
                    if (insufficientBalance) return this.txUiService.setError(insufficientBalance);

                    const initialXrpBalance = xrpl.dropsToXrp(accountInfo.result.account_data.Balance);
                    console.log('initialXrpBalance: ', initialXrpBalance);

                    const isSpendXrp = this.weSpendCurrency() === 'XRP';

                    const tradingFeeBps = Math.round(Number(this.tradingFeeField()) * 1000);
                    if (tradingFeeBps < 0 || tradingFeeBps > 1000) {
                         return this.txUiService.setError('Trading fee must be between 0% and 1%.');
                    }

                    // Build AMM Create transaction
                    const ammCreateTx: xrpl.AMMCreate = {
                         TransactionType: 'AMMCreate',
                         Account: wallet.classicAddress,
                         Amount: isSpendXrp ? we_spend : we_want,
                         Amount2: isSpendXrp ? we_want : we_spend,
                         TradingFee: tradingFeeBps, // Convert % to basis points (e.g., 0.5% = 500)
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, ammCreateTx, wallet, accountInfo, 'createAmm');

                    const result = await this.txExecutor.createAMM(ammCreateTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });

                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated AMM Create successfully!' : 'AMM created successfully!';
                    if (!this.txUiService.isSimulateEnabled()) {
                         await this.refreshAfterTx(client, wallet, null, false);
                    }
               } catch (error: any) {
                    console.error('Error in createAMM:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async depositToAMM() {
          await this.withPerf('depositToAMM', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               type CurrencyAmount = string | xrpl.IssuedCurrencyAmount;

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, accountObjects, fee, currentLedger] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client)]);

                    const we_want_currency = this.utilsService.encodeIfNeeded(this.weWantCurrency());
                    const we_spend_currency = this.utilsService.encodeIfNeeded(this.weSpendCurrency());

                    if (this.depositOptions().firstPoolOnly) {
                         this.weSpendAmount.set('0');
                    }
                    if (this.depositOptions().secondPoolOnly) {
                         this.weWantAmount.set('0');
                    }

                    // Then use it in your function:
                    const we_want: CurrencyAmount = this.weWantCurrency() === 'XRP' ? xrpl.xrpToDrops(this.weWantAmount()) : { currency: we_want_currency, issuer: this.weWantIssuer(), value: this.weWantAmount() };

                    const we_spend: CurrencyAmount = this.weSpendCurrency() === 'XRP' ? xrpl.xrpToDrops(this.weSpendAmount()) : { currency: we_spend_currency, issuer: this.weSpendIssuer(), value: this.weSpendAmount() };

                    const insufficientBalance = this.utilsService.validateAmmDepositBalances(accountInfo.result.account_data.Balance, accountObjects.result.account_objects, we_want, we_spend);
                    if (insufficientBalance) return this.txUiService.setError(insufficientBalance);

                    const assetDef: xrpl.Currency = { currency: 'XRP' };
                    const asset2Def: xrpl.Currency = {
                         currency: we_want_currency,
                         issuer: typeof we_want === 'string' ? '' : we_want.issuer ?? '',
                    };

                    let ammDepositTx: xrpl.AMMDeposit;

                    if (this.depositOptions().bothPools) {
                         ammDepositTx = {
                              TransactionType: 'AMMDeposit',
                              Account: wallet.classicAddress,
                              Asset: assetDef,
                              Asset2: asset2Def,
                              Amount: typeof we_spend === 'string' ? we_spend : { currency: we_spend.currency, issuer: we_spend.issuer, value: we_spend.value },
                              Amount2: typeof we_want === 'string' ? we_want : { currency: we_want.currency, issuer: we_want.issuer, value: we_want.value },
                              Flags: xrpl.AMMDepositFlags.tfTwoAsset,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };
                    } else if (this.depositOptions().firstPoolOnly) {
                         ammDepositTx = {
                              TransactionType: 'AMMDeposit',
                              Account: wallet.classicAddress,
                              Asset: assetDef,
                              Asset2: asset2Def,
                              Amount: typeof we_want === 'string' ? we_want : { currency: we_want.currency, issuer: we_want.issuer, value: we_want.value },
                              Flags: xrpl.AMMDepositFlags.tfSingleAsset,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };
                    } else {
                         ammDepositTx = {
                              TransactionType: 'AMMDeposit',
                              Account: wallet.classicAddress,
                              Asset: assetDef,
                              Asset2: asset2Def,
                              Amount: typeof we_spend === 'string' ? we_spend : { currency: we_spend.currency, issuer: we_spend.issuer, value: we_spend.value },
                              Flags: xrpl.AMMDepositFlags.tfSingleAsset,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };
                    }

                    await this.setTxOptionalFields(client, ammDepositTx, wallet, accountInfo, 'depositToAmm');

                    const result = await this.txExecutor.depositToAMM(ammDepositTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });

                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated AMM Deposit successfully!' : 'AMM Deposit successfully!';
                    if (!this.txUiService.isSimulateEnabled()) {
                         await this.refreshAfterTx(client, wallet, null, false);
                    }
               } catch (error: any) {
                    console.error('Error in depositToAMM:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async withdrawlTokenFromAMM() {
          await this.withPerf('withdrawlTokenFromAMM', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               // Define correct type for currency amounts
               type CurrencyAmount = string | xrpl.IssuedCurrencyAmount;

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, accountObjects, fee, currentLedger] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client)]);

                    // Build currency objects correctly
                    const we_want_currency = this.utilsService.encodeIfNeeded(this.weWantCurrency());
                    const we_spend_currency = this.utilsService.encodeIfNeeded(this.weSpendCurrency());
                    const withdraw = this.withdrawOptions();

                    if (withdraw.bothPools) {
                         this.weSpendAmount.set('0');
                         this.weWantAmount.set('0');
                    } else {
                         if (withdraw.firstPoolOnly) {
                              this.weSpendAmount.set('0');
                         }

                         if (withdraw.secondPoolOnly) {
                              this.weWantAmount.set('0');
                         }
                    }

                    // Build properly typed currency objects
                    const we_want: CurrencyAmount = this.weWantCurrency() === 'XRP' ? xrpl.xrpToDrops(this.weWantAmount()) : { currency: we_want_currency, issuer: this.weWantIssuer()!, value: this.weWantAmount() };
                    const we_spend: CurrencyAmount = this.weSpendCurrency() === 'XRP' ? xrpl.xrpToDrops(this.weSpendAmount()) : { currency: we_spend_currency, issuer: this.weSpendIssuer()!, value: this.weSpendAmount() };

                    // Get AMM participation info
                    const asset = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weWantCurrency()), this.weWantIssuer());
                    const asset2 = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weSpendCurrency()), this.weSpendIssuer());

                    const participation = await this.checkAmmParticipation(client, wallet.classicAddress, asset, asset2, false);

                    const insufficientBalance = this.utilsService.validateAmmWithdrawBalances(accountInfo.result.account_data.Balance, accountObjects.result.account_objects, this.withdrawlLpTokenFromPoolField(), participation);
                    if (insufficientBalance) return this.txUiService.setError(insufficientBalance);

                    if (!participation?.lpTokens?.[0]) return this.txUiService.setError('No LP token found for this AMM pool');

                    const ammIssuer = participation.lpTokens[0].issuer;
                    const ammCurrency = participation.lpTokens[0].currency;

                    // Validate LP token balance
                    const lpTokenBalance = participation.lpTokens[0].balance;
                    if (Number.parseFloat(this.withdrawlLpTokenFromPoolField()) > Number.parseFloat(lpTokenBalance)) {
                         return this.txUiService.setError(`Insufficient LP token balance. Available: ${lpTokenBalance}`);
                    }

                    const assetDef: xrpl.Currency = { currency: 'XRP' };
                    const asset2Def: xrpl.Currency = {
                         currency: we_want_currency,
                         issuer: typeof we_want === 'string' ? '' : we_want.issuer ?? '',
                    };

                    const cleanLpAmount = this.utilsService.removeCommaFromAmount(this.withdrawlLpTokenFromPoolField());
                    const lpTokenIn: xrpl.IssuedCurrencyAmount = {
                         currency: ammCurrency,
                         issuer: ammIssuer,
                         value: cleanLpAmount,
                    };

                    let ammWithdrawTx: xrpl.AMMWithdraw;

                    if (this.withdrawOptions().bothPools) {
                         ammWithdrawTx = {
                              TransactionType: 'AMMWithdraw',
                              Account: wallet.classicAddress,
                              Asset: assetDef,
                              Asset2: asset2Def,
                              LPTokenIn: lpTokenIn,
                              Flags: xrpl.AMMWithdrawFlags.tfLPToken,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };
                    } else if (this.withdrawOptions().firstPoolOnly) {
                         const asset2Amount: xrpl.IssuedCurrencyAmount = {
                              currency: we_want_currency,
                              issuer: typeof we_want === 'string' ? '' : we_want.issuer ?? '',
                              value: this.weWantAmount(),
                         };

                         ammWithdrawTx = {
                              TransactionType: 'AMMWithdraw',
                              Account: wallet.classicAddress,
                              Asset: assetDef,
                              Asset2: asset2Def,
                              Amount: asset2Amount,
                              Flags: xrpl.AMMWithdrawFlags.tfSingleAsset,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };
                    } else {
                         ammWithdrawTx = {
                              TransactionType: 'AMMWithdraw',
                              Account: wallet.classicAddress,
                              Asset: assetDef,
                              Asset2: asset2Def,
                              Amount: xrpl.xrpToDrops(this.weSpendAmount()),
                              Flags: xrpl.AMMWithdrawFlags.tfSingleAsset,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };
                    }

                    await this.setTxOptionalFields(client, ammWithdrawTx, wallet, accountInfo, 'withdrawlFromAmm');

                    const result = await this.txExecutor.withdrawlFromAMM(ammWithdrawTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });

                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated AMM Withdraw successfully!' : 'AMM Withdraw successfully!';
                    if (!this.txUiService.isSimulateEnabled()) {
                         this.withdrawlLpTokenFromPoolField.set('');
                         await this.refreshAfterTx(client, wallet, null, false);
                    }
               } catch (error: any) {
                    console.error('Error in withdrawlTokenFromAMM:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async clawbackFromAMM() {
          await this.withPerf('clawbackFromAMM', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               // Define correct type for currency amounts
               type CurrencyAmount = string | xrpl.IssuedCurrencyAmount;

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);

                    const assetDef: xrpl.Currency = {
                         currency: this.weSpendCurrency() === 'XRP' ? 'XRP' : this.utilsService.encodeIfNeeded(this.weSpendCurrency()),
                         issuer: this.weSpendCurrency() !== 'XRP' ? this.weSpendIssuer() : '',
                    };

                    const asset2Def: xrpl.Currency = {
                         currency: this.weWantCurrency() === 'XRP' ? 'XRP' : this.utilsService.encodeIfNeeded(this.weWantCurrency()),
                         issuer: this.weWantCurrency() !== 'XRP' ? this.weWantIssuer() : '',
                    };

                    // Get AMM participation to validate LP token balance
                    const participation = await this.checkAmmParticipation(client, wallet.classicAddress, assetDef, asset2Def);
                    this.utilsService.logObjects(`participation:`, participation);

                    if (!participation?.lpTokens?.[0]) {
                         return this.txUiService.setError('No LP token found for this AMM pool');
                    }

                    const lpTokenInfo = participation.lpTokens[0];
                    const availableLpBalance = parseFloat(lpTokenInfo.balance);
                    const requestedLpAmount = parseFloat(this.lpTokenBalanceField());

                    if (requestedLpAmount > availableLpBalance) {
                         return this.txUiService.setError(`Insufficient LP token balance. Available: ${availableLpBalance}`);
                    }

                    // Build AMM Clawback transaction
                    // LP tokens use the actual LP token currency/issuer, NOT 'AMM'
                    const lpTokenAmount: xrpl.IssuedCurrencyAmount = {
                         currency: lpTokenInfo.currency,
                         issuer: lpTokenInfo.issuer,
                         value: this.lpTokenBalanceField(),
                    };

                    const ammClawbackTx: xrpl.AMMClawback = {
                         TransactionType: 'AMMClawback',
                         Account: wallet.classicAddress,
                         Asset: assetDef,
                         Asset2: asset2Def,
                         Amount: lpTokenAmount,
                         Holder: this.holderField(),
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         Fee: fee,
                    };

                    await this.setTxOptionalFields(client, ammClawbackTx, wallet, accountInfo, 'clawbackFromAmm');

                    const result = await this.txExecutor.clawbackFromAMM(ammClawbackTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated AMM Clawback successfully!' : 'AMM Clawback successful!';
                    if (!this.txUiService.isSimulateEnabled()) {
                         this.withdrawlLpTokenFromPoolField.set('');
                         await this.refreshAfterTx(client, wallet, null, false);
                    }
               } catch (error: any) {
                    console.error('Error in clawbackFromAMM:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async swapViaAMM() {
          await this.withPerf('swapViaAMM', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);

                    const asset = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weWantCurrency()), 'r9DZiCr2eejjRUqqTnTahL5UpLfku9Fe9D');
                    const asset2 = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weSpendCurrency()), 'r9DZiCr2eejjRUqqTnTahL5UpLfku9Fe9D');

                    const amount: xrpl.Amount = this.weWantCurrency() === 'XRP' ? xrpl.xrpToDrops(this.weWantAmount().toString()) : { currency: asset.currency, issuer: asset.issuer!, value: this.weWantAmount().toString() };

                    const swapPaymentTx: xrpl.Payment = {
                         TransactionType: 'Payment',
                         Account: wallet.classicAddress,
                         Destination: wallet.classicAddress,
                         Amount: amount,
                         SendMax: this.weSpendCurrency() === 'XRP' ? xrpl.xrpToDrops(this.weSpendAmount().toString()) : { currency: asset2.currency, issuer: asset2.issuer!, value: '10' },
                         Fee: fee,
                         Flags: 131072,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, swapPaymentTx, wallet, accountInfo, 'swamViaAMM');

                    const result = await this.txExecutor.swapViaAMM(swapPaymentTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Swap via AMM successfully!' : 'Swap via AMM successful!';
                    if (!this.txUiService.isSimulateEnabled()) {
                         this.withdrawlLpTokenFromPoolField.set('');
                         await this.refreshAfterTx(client, wallet, null, false);
                    }
               } catch (error: any) {
                    console.error('Error in swapViaAMM:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async deleteAMM() {
          await this.withPerf('deleteAMM', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);

                    const asset = this.toCurrency(this.utilsService.encodeIfNeeded(this.weWantCurrency()), this.weWantIssuer());
                    const asset2 = this.toCurrency(this.utilsService.encodeIfNeeded(this.weSpendCurrency()), this.weSpendIssuer());

                    const deleteAmmTx: xrpl.AMMDelete = {
                         TransactionType: 'AMMDelete',
                         Account: wallet.classicAddress,
                         Asset: asset,
                         Asset2: asset2,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, deleteAmmTx, wallet, accountInfo, 'deleteAMM');

                    const result = await this.txExecutor.deleteAMM(deleteAmmTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated AMM delete successfully!' : 'Deleted AMM successfully!';
                    if (!this.txUiService.isSimulateEnabled()) {
                         this.withdrawlLpTokenFromPoolField.set('');
                         // const currencyChangePromise = Promise.all([this.onWeSpendCurrencyChange(), this.onWeWantCurrencyChange()]);
                         // const [participation] = await Promise.all([this.checkAmmParticipation(client, wallet.classicAddress, asset, asset2, true), currencyChangePromise]);
                         // this.updatePoolBalances(participation?.ammInfo);
                         await this.refreshAfterTx(client, wallet, null, false);
                    }
               } catch (error: any) {
                    console.error('Error in deleteAMM:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     // private normalizeAmount = (val: string | IssuedCurrencyAmount) => {
     //      if (typeof val === 'string') return /^\d+$/.test(val) ? xrpl.dropsToXrp(val) : val;
     //      return val.value;
     // };

     // private updatePoolBalances(amm: any) {
     //      if (!amm) {
     //           this.assetPool1Balance.set('0');
     //           this.assetPool2Balance.set('0');
     //           return;
     //      }
     //      const format = (a: any) => this.utilsService.formatTokenBalance(typeof a === 'string' ? xrpl.dropsToXrp(a) : a.value, 18);
     //      this.assetPool1Balance.set(format(amm.amount));
     //      this.assetPool2Balance.set(format(amm.amount2));
     // }

     // async updateTokenBalanceAndExchangeReverse() {
     //      console.log('Entering updateTokenBalanceAndExchangeReverse');
     //      const startTime = Date.now();
     //      // this.txUiService.clearMessages();
     //      // this.txUiService.updateSpinnerMessage(``);

     //      if (!this.weWantAmount() || Number.parseFloat(this.weWantAmount()) <= 0) {
     //           this.weSpendAmount.set('0');
     //           return;
     //      }

     //      this.txUiService.spinner.set(true);
     //      this.txUiService.showSpinnerWithDelay('Calculating required amount...', 500);

     //      try {
     //           const client = await this.xrplService.getClient();
     //           const wallet = await this.utilsService.getWalletFromAddress(this.currentWallet().address);

     //           const weWant: CurrencyAmount =
     //                this.weWantCurrency() === 'XRP'
     //                     ? { currency: 'XRP', value: this.weWantAmount() }
     //                     : {
     //                            currency: this.weWantCurrency().length > 3 ? this.utilsService.encodeCurrencyCode(this.weWantCurrency()) : this.weWantCurrency(),
     //                            issuer: this.weWantIssuer(),
     //                            value: this.weWantAmount(),
     //                       };

     //           const weSpend: CurrencyAmount =
     //                this.weSpendCurrency() === 'XRP'
     //                     ? { currency: 'XRP', value: '0' }
     //                     : {
     //                            currency: this.weSpendCurrency().length > 3 ? this.utilsService.encodeCurrencyCode(this.weSpendCurrency()) : this.weSpendCurrency(),
     //                            issuer: this.weSpendIssuer(),
     //                            value: '0',
     //                       };

     //           const [orderBook, ammPoolData] = await Promise.all([
     //                client.request({
     //                     command: 'book_offers',
     //                     taker_gets: weWant, // Receive
     //                     taker_pays: weSpend, // Pay
     //                     limit: 400,
     //                     ledger_index: 'current',
     //                     taker: wallet.classicAddress,
     //                }),
     //                client
     //                     .request({
     //                          command: 'amm_info',
     //                          asset: this.weSpendCurrency() === 'XRP' ? { currency: 'XRP' } : { currency: weSpend.currency, issuer: (weSpend as any).issuer },
     //                          asset2: this.weWantCurrency() === 'XRP' ? { currency: 'XRP' } : { currency: weWant.currency, issuer: (weSpend as any).issuer },
     //                     })
     //                     .catch(() => null),
     //           ]);

     //           let allOffers = [...orderBook.result.offers];

     //           if (ammPoolData?.result?.amm) {
     //                const amm = ammPoolData.result.amm;
     //                const getVal = (x: any) => (typeof x === 'string' ? x : x.value);
     //                const amount1 = getVal(amm.amount);
     //                const amount2 = getVal(amm.amount2);

     //                let receiveVal, payVal;
     //                if (this.weWantCurrency() === 'XRP') {
     //                     receiveVal = typeof amm.amount2 === 'string' ? xrpl.dropsToXrp(amount2) : amount2;
     //                     payVal = typeof amm.amount === 'string' ? xrpl.dropsToXrp(amount1) : amount1;
     //                } else {
     //                     receiveVal = typeof amm.amount === 'string' ? xrpl.dropsToXrp(amount1) : amount1;
     //                     payVal = typeof amm.amount2 === 'string' ? xrpl.dropsToXrp(amount2) : amount2;
     //                }

     //                const ammRate = new BigNumber(payVal).dividedBy(receiveVal); // pay / receive
     //                const ammOffer = {
     //                     TakerGets: receiveVal, // receive
     //                     TakerPays: payVal, // pay
     //                     isAMM: true,
     //                     rate: ammRate,
     //                };
     //                allOffers.push(ammOffer as any);
     //           }

     //           // Sort by best rate (lowest pay per receive, ascending)
     //           allOffers.sort((a, b) => {
     //                const rateA = new BigNumber(this.normalizeAmount(a.TakerPays)).dividedBy(this.normalizeAmount(a.TakerGets));
     //                const rateB = new BigNumber(this.normalizeAmount(b.TakerPays)).dividedBy(this.normalizeAmount(b.TakerGets));
     //                return rateA.minus(rateB).toNumber();
     //           });

     //           let remainingReceive = new BigNumber(this.weWantAmount());
     //           let totalPay = new BigNumber(0);

     //           for (const offer of allOffers) {
     //                if (remainingReceive.lte(0)) break;

     //                const availableReceive = new BigNumber(this.normalizeAmount(offer.TakerGets));
     //                const payForThis = new BigNumber(this.normalizeAmount(offer.TakerPays));

     //                if (availableReceive.isZero()) continue;

     //                const rate = payForThis.dividedBy(availableReceive); // pay / receive

     //                const useReceive = BigNumber.min(remainingReceive, availableReceive);
     //                const requiredPay = useReceive.multipliedBy(rate);

     //                totalPay = totalPay.plus(requiredPay);
     //                remainingReceive = remainingReceive.minus(useReceive);
     //           }

     //           this.weSpendAmount.set(totalPay.toFixed(8));
     //           this.insufficientLiquidityWarning.set(remainingReceive.gt(0));
     //      } catch (error: any) {
     //           console.error('Error in updateTokenBalanceAndExchangeReverse:', error);
     //           this.txUiService.setError(`${error.message || 'Unknown error'}`);
     //           this.weSpendAmount.set('0');
     //      } finally {
     //           this.txUiService.spinner.set(false);
     //           let executionTime = (Date.now() - startTime).toString();
     //           console.log(`Leaving updateTokenBalanceAndExchangeReverse in ${executionTime}ms`);
     //      }
     // }

     // async updateTokenBalanceAndExchange() {
     //      console.log('Entering updateTokenBalanceAndExchange');
     //      const startTime = Date.now();
     //      // this.txUiService.clearMessages();
     //      // this.txUiService.updateSpinnerMessage(``);

     //      if (!this.weSpendAmount() || Number.parseFloat(this.weSpendAmount()) <= 0) {
     //           this.weWantAmount.set('0');
     //           return;
     //      }

     //      this.txUiService.spinner.set(true);
     //      this.txUiService.showSpinnerWithDelay('Calculating best rate...', 500);

     //      try {
     //           const client = await this.xrplService.getClient();
     //           const wallet = await this.utilsService.getWalletFromAddress(this.currentWallet().address);

     //           const weWant: CurrencyAmount =
     //                this.weWantCurrency() === 'XRP'
     //                     ? { currency: 'XRP', value: '0' }
     //                     : {
     //                            currency: this.weWantCurrency().length > 3 ? this.utilsService.encodeCurrencyCode(this.weWantCurrency()) : this.weWantCurrency(),
     //                            issuer: this.weWantIssuer(),
     //                            value: '0',
     //                       };

     //           const weSpend: CurrencyAmount =
     //                this.weSpendCurrency() === 'XRP'
     //                     ? { currency: 'XRP', value: this.weSpendAmount() }
     //                     : {
     //                            currency: this.weSpendCurrency().length > 3 ? this.utilsService.encodeCurrencyCode(this.weSpendCurrency()) : this.weSpendCurrency(),
     //                            issuer: this.weSpendIssuer(),
     //                            value: this.weSpendAmount(),
     //                       };

     //           // === ORDER BOOK + AMM LOGIC (your original code) ===
     //           const [orderBook, ammPoolData] = await Promise.all([
     //                client.request({
     //                     command: 'book_offers',
     //                     taker_gets: weWant,
     //                     taker_pays: weSpend,
     //                     limit: 400,
     //                     ledger_index: 'current',
     //                     taker: wallet.classicAddress,
     //                }),
     //                client
     //                     .request({
     //                          command: 'amm_info',
     //                          asset: 'currency' in weSpend && weSpend.currency !== 'XRP' ? weSpend : { currency: 'XRP' },
     //                          asset2: 'currency' in weWant && weWant.currency !== 'XRP' ? weWant : { currency: 'XRP' },
     //                     })
     //                     .catch(() => null),
     //           ]);

     //           let allOffers = [...orderBook.result.offers];

     //           if (ammPoolData?.result?.amm) {
     //                const amm = ammPoolData.result.amm;
     //                const getVal = (x: any) => (typeof x === 'string' ? x : x.value);
     //                const amount1 = getVal(amm.amount);
     //                const amount2 = getVal(amm.amount2);

     //                let xrpVal = typeof amm.amount === 'string' ? amount1 : amount2;
     //                let tokenVal = typeof amm.amount === 'string' ? amount2 : amount1;

     //                if (typeof amm.amount === 'string') xrpVal = xrpl.dropsToXrp(xrpVal);
     //                if (typeof amm.amount2 === 'string') xrpVal = xrpl.dropsToXrp(xrpVal);

     //                const ammOffer: any = {
     //                     TakerGets: typeof amm.amount === 'string' ? { currency: weWant.currency, issuer: (weWant as any).issuer, value: tokenVal } : amount1,
     //                     TakerPays: typeof amm.amount === 'string' ? amount2 : { currency: 'XRP', value: xrpVal },
     //                     isAMM: true,
     //                     rate: new BigNumber(tokenVal).dividedBy(xrpVal),
     //                };
     //                allOffers.push(ammOffer);
     //           }

     //           // Sort by best rate
     //           allOffers.sort((a, b) => {
     //                const rateA = new BigNumber(this.normalizeAmount(a.TakerGets)).dividedBy(this.normalizeAmount(a.TakerPays));
     //                const rateB = new BigNumber(this.normalizeAmount(b.TakerGets)).dividedBy(this.normalizeAmount(b.TakerPays));
     //                return rateA.minus(rateB).toNumber();
     //           });

     //           let remaining = new BigNumber(this.weSpendAmount());
     //           let totalReceived = new BigNumber(0);

     //           for (const offer of allOffers) {
     //                if (remaining.lte(0)) break;
     //                const pays = new BigNumber(this.normalizeAmount(offer.TakerPays));
     //                const gets = new BigNumber(this.normalizeAmount(offer.TakerGets));
     //                if (pays.isZero()) continue;

     //                const use = BigNumber.min(remaining, pays);
     //                const received = use.multipliedBy(gets).dividedBy(pays);
     //                totalReceived = totalReceived.plus(received);
     //                remaining = remaining.minus(use);
     //           }

     //           this.weWantAmount.set(totalReceived.toFixed(8));
     //           this.insufficientLiquidityWarning.set(remaining.gt(0));
     //      } catch (error: any) {
     //           console.error('Error in updateTokenBalanceAndExchange:', error);
     //           this.txUiService.setError(`${error.message || 'Unknown error'}`);
     //           this.weWantAmount.set('0');
     //      } finally {
     //           this.txUiService.spinner.set(false);
     //           let executionTime = (Date.now() - startTime).toString();
     //           console.log(`Leaving updateTokenBalanceAndExchange in ${executionTime}ms`);
     //      }
     // }

     // onWeSpendAmountChange(): void {
     //      const existing = this.amountTimeout();
     //      if (existing) clearTimeout(existing);
     //      this.amountTimeout.set(
     //           setTimeout(() => {
     //                this.updateTokenBalanceAndExchange();
     //                this.amountTimeout.set(null);
     //           }, 400)
     //      );
     // }

     // onWeWantAmountChange(): void {
     //      const existing = this.amountTimeout();
     //      if (existing) clearTimeout(existing);
     //      this.amountTimeout.set(
     //           setTimeout(() => {
     //                this.updateTokenBalanceAndExchangeReverse();
     //                this.amountTimeout.set(null);
     //           }, 400)
     //      );
     // }

     private async setTxOptionalFields(client: xrpl.Client, ammTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'createAmm' || txType === 'swamViaAMM' || txType === 'depositToAmm' || txType === 'withdrawlFromAmm' || txType === 'clawbackFromAmm') {
               if (this.txUiService.isTicket()) {
                    const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
                    if (ticket) {
                         const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                         if (!exists) throw new Error(`Ticket ${ticket} not found`);
                         this.utilsService.setTicketSequence(ammTx, ticket, true);
                    }
               }
          }

          if (txType === 'swamViaAMM') {
               if (this.destinationTagField() && Number.parseInt(this.destinationTagField()) > 0) {
                    this.utilsService.setDestinationTag(ammTx, this.destinationTagField());
               }
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(ammTx, this.txUiService.memoField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest) this.addNewDestinationFromUser(destination || '');
          await this.offerCurrency.refreshBothBalances(this.currentWallet());
          await this.getAMMPoolInfo(true, false);
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

     clearFields() {
          this.weSpendAmount.set('');
          this.weWantAmount.set('');
     }

     async checkAmmParticipation(client: xrpl.Client, account: string, asset: any, asset2: any, displayChanges: boolean = false) {
          let result: { isAmmPool: boolean; isLiquidityProvider: boolean; ammInfo?: any; lpTokens: { issuer: string; currency: string; balance: string }[] } = {
               isAmmPool: false,
               isLiquidityProvider: false,
               ammInfo: undefined,
               lpTokens: [], // always an array
          };

          try {
               const ammResponse = await this.xrplService.getAMMInfo(client, asset, asset2, account, 'validated');
               if (ammResponse.result && ammResponse.result.amm) {
                    this.utilsService.logObjects('checkAmmParticipation', ammResponse);
                    result.isAmmPool = true;
                    result.ammInfo = ammResponse.result.amm;
                    result.lpTokens.push({
                         issuer: ammResponse.result.amm.account,
                         currency: ammResponse.result.amm.lp_token.currency, // Assuming LPTokenCurrency is part of the response
                         balance: ammResponse.result.amm.lp_token.value, // Balance not directly available here
                    });
                    if (displayChanges) {
                         this.lpTokenBalance.set(ammResponse.result.amm.lp_token.value);
                         const toDisplay = (amt: any): string => {
                              const val = typeof amt === 'string' ? xrpl.dropsToXrp(amt) : amt.value;
                              return this.utilsService.formatTokenBalance(val, 18);
                         };
                         this.assetPool1Balance.set(toDisplay(result.ammInfo.amount));
                         this.assetPool2Balance.set(toDisplay(result.ammInfo.amount2));
                    }
               } else {
                    if (displayChanges) {
                         this.lpTokenBalance.set('0');
                         this.assetPool1Balance.set('0');
                         this.assetPool2Balance.set('0');
                    }
               }
          } catch (e) {
               // Not an AMM, ignore
               console.warn('Not an AMM account:', e);
          }
          return result;
     }

     selectDepositOption(mode: 'bothPools' | 'firstPoolOnly' | 'secondPoolOnly'): void {
          this.depositOptions.set({
               bothPools: mode === 'bothPools',
               firstPoolOnly: mode === 'firstPoolOnly',
               secondPoolOnly: mode === 'secondPoolOnly',
          });
     }

     selectWithdrawOption(mode: 'bothPools' | 'firstPoolOnly' | 'secondPoolOnly'): void {
          this.withdrawOptions.set({
               bothPools: mode === 'bothPools',
               firstPoolOnly: mode === 'firstPoolOnly',
               secondPoolOnly: mode === 'secondPoolOnly',
          });
     }

     toXRPLCurrency(currency: string, issuerAddress: string): XRPLCurrency {
          if (currency === 'XRP') return { currency: 'XRP' };
          return { currency, issuer: issuerAddress };
     }

     toCurrency(currency: string, issuerAddress: string): xrpl.Currency {
          if (currency === 'XRP') return { currency: 'XRP' };
          return { currency, issuer: issuerAddress };
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
          this.ensureDefaultNotSelected();
     }

     ensureDefaultNotSelected() {
          const currentAddress = this.currentWallet().address;
          if (currentAddress && this.destinations().length > 0) {
               if (!this.destinations() || this.destinationField() === currentAddress) {
                    const nonSelectedDest = this.destinations().find((d: { address: string }) => d.address !== currentAddress);
                    this.selectedDestinationAddress.set(nonSelectedDest ? nonSelectedDest.address : this.destinations()[0].address);
               }
          }
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
     }

     private updateInfoMessage() {
          const walletName = this.currentWallet().name || 'selected';

          const nftCount = this.existingOffers.length;
          // const sellOfferCount = this.existingSellOffers.length;
          // const buyOfferCount = this.existingBuyOffers.length;

          let message: string;

          // if (nftCount === 0 && sellOfferCount === 0 && buyOfferCount === 0) {
          if (nftCount === 0) {
               message = `<code>${walletName}</code> wallet has no NFTs or NFT offers.`;
          } else {
               const parts: string[] = [];

               if (nftCount > 0) {
                    const nftWord = nftCount === 1 ? 'NFT' : 'NFTs';
                    parts.push(`${nftCount} ${nftWord}`);
               }

               // if (sellOfferCount > 0) {
               //      const sellWord = sellOfferCount === 1 ? 'sell offer' : 'sell offers';
               //      parts.push(`${sellOfferCount} ${sellWord}`);
               // }

               // if (buyOfferCount > 0) {
               //      const buyWord = buyOfferCount === 1 ? 'buy offer' : 'buy offers';
               //      parts.push(`${buyOfferCount} ${buyWord}`);
               // }

               let summaryText: string;
               if (parts.length === 1) {
                    summaryText = parts[0];
               } else {
                    const lastPart = parts.pop()!;
                    summaryText = `${parts.join(', ')} and ${lastPart}`;
               }

               message = `<code>${walletName}</code> wallet has <strong>${summaryText}</strong>.`;

               // Add link to view NFTs when any NFTs or offers are present
               const link = `${this.txUiService.explorerUrl()}account/${this.currentWallet().address}/objects`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View AMM on XRPL Win</a>`;
          }

          this.txUiService.setInfoMessage(message);
     }

     onWeWantIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.weWantIssuer.set(address);
          this.offerCurrency.selectWeWantIssuer(address, this.currentWallet());
          this.ammInfoTrigger.next();
     }

     onWeSpendIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.weSpendIssuer.set(address);
          this.offerCurrency.selectWeSpendIssuer(address, this.currentWallet());
          this.ammInfoTrigger.next();
     }

     onWeWantCurrencySelected(item: SelectItem | null) {
          const currency = item?.id || 'XRP';
          this.weWantCurrency.set(currency);
          this.offerCurrency.selectWeWantCurrency(currency, this.currentWallet());
          this.ammInfoTrigger.next();
     }

     onWeSpendCurrencySelected(item: SelectItem | null) {
          const currency = item?.id || 'XRP';
          this.weSpendCurrency.set(currency);
          this.offerCurrency.selectWeSpendCurrency(currency, this.currentWallet());
          this.ammInfoTrigger.next();
     }

     async onWeWantCurrencyChange() {
          this.offerCurrency.selectWeWantCurrency(this.weWantCurrency(), this.currentWallet());
          this.ammInfoTrigger.next();
     }

     async onWeSpendCurrencyChange() {
          this.offerCurrency.selectWeSpendCurrency(this.weSpendCurrency(), this.currentWallet());
          this.ammInfoTrigger.next();
     }
}
