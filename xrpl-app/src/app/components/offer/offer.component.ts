import { OnInit, Component, inject, ChangeDetectionStrategy, computed, DestroyRef, signal } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { OfferCreate, OfferCreateFlags, BookOffer, IssuedCurrencyAmount, AMMInfoRequest } from 'xrpl';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { Observable, Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { OfferCurrencyService } from '../../services/offer-currency/offer-currency.service';
import BigNumber from 'bignumber.js';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../services/toast/toast.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';

interface XRPLCurrency {
     currency: string;
     issuer?: string;
}

interface AMMAsset {
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

interface CurrencyObjectXRP {
     currency: 'XRP';
     value: string;
}

interface CurrencyObjectToken {
     currency: string;
     issuer: string;
     value: string;
}

interface AMMInfoResponse {
     result: {
          amm?: {
               amount: string | { currency: string; issuer: string; value: string };
               amount2: string | { currency: string; issuer: string; value: string };
               lp_token: { currency: string; issuer?: string; value: string };
               trading_fee: number;
               account: string; // Added for AMM account
          };
     };
}

type CurrencyObject = CurrencyObjectXRP | CurrencyObjectToken;
type CurrencyAmount = CurrencyAmountXRP | CurrencyAmountToken;

type CustomBookOffer = Partial<Omit<BookOffer, 'TakerGets' | 'TakerPays'>> & {
     Account: string;
     Flags: number;
     LedgerEntryType: 'Offer';
     Sequence: number;
     TakerGets: string | IssuedCurrencyAmount;
     TakerPays: string | IssuedCurrencyAmount;
     isAMM?: boolean;
     rate?: BigNumber;
};

interface AccountFlags {
     tfPassive: boolean;
     tfImmediateOrCancel: boolean;
     tfFillOrKill: boolean;
}

interface IssuerItem {
     name: string;
     address: string;
}

@Component({
     selector: 'app-offer',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './offer.component.html',
     styleUrl: './offer.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOfferComponent extends PerformanceBaseComponent implements OnInit {
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
     activeTab = signal<'getOffers' | 'cancelOffer'>('getOffers');
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

     existingOffers = signal<any[]>([]);
     existingSellOffers = signal<any[]>([]);
     existingBuyOffers = signal<any[]>([]);
     existingSellOffersCollapsed = signal<boolean>(true);

     amountTimeout = signal<ReturnType<any> | null>(null);
     weWantIssuersTrigger = signal(0);
     weSpendIssuersTrigger = signal(0);

     public destinationSearch$ = new Subject<string>();
     offerSequenceField = signal<string>(''); //: string = '';
     offersArray = signal<any[]>([]); //: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket = signal<string>('');
     multiSelectMode = signal<boolean>(false); //: boolean = false;
     // tokenBalance: string = '';
     // phnixExchangeXrp: string = '0'; // To store the calculated XRP amount
     // xrpPrice: string = '0'; // New property to store XRP price in RLUSD
     // averageExchangeRate: string = '';
     slippage = signal<number>(0.2357); //: number = 0.2357; // Default to 23.57%
     // private memeTokensSubject = new BehaviorSubject<{ transactionType: string; action: string; amountXrp: string; amountToken: string; currency: string; issuer: string; transactionHash: string; timestamp: Date; createdDate: Date; creationAge: string }[]>([]);
     // memeTokens$ = this.memeTokensSubject.asObservable(); // Use Observable for UI binding
     // currencies: string[] = [];
     // deleteTicketSequence: string = '';
     // issuers: { name?: string; address: string }[] = [];
     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');
     displayExistingOffers = signal<boolean>(true);
     private flagValues = {
          tfPassive: 0x00010000,
          tfImmediateOrCancel: 0x00020000,
          tfFillOrKill: 0x00040000,
     };
     readonly FLAG_VALUES = xrpl.OfferCreateFlags;
     flags: AccountFlags = {
          tfPassive: false,
          tfImmediateOrCancel: false,
          tfFillOrKill: false,
     };
     offerFlagsConfig = [
          {
               key: 'tfPassive',
               title: 'Passive',
               desc: 'The offer does not consume offers that exactly match it, and instead becomes an Offer object in the ledger. It still consumes offers that cross it.',
          },
          {
               key: 'tfFillOrKill',
               title: 'Fill Or Kill',
               desc: 'Only try to match existing offers in the ledger, and only do so if the entire TakerPays quantity can be obtained.',
          },
          {
               key: 'tfImmediateOrCancel',
               title: 'Immediate Or Cancel',
               desc: 'The offer never becomes a ledger object: it only tries to match existing offers in the ledger.',
          },
     ] as const;

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

     weSpendCurrencyItems = computed(() => {
          const currentCode = this.weSpendCurrency();
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

     selectedWeSpendCurrencyItem = computed(() => {
          const code = this.weSpendCurrency();
          if (!code) return null;
          return this.weSpendCurrencyItems().find(item => item.id === code) || null;
     });

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
                    await this.getOffers(false, true);
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

     toggleExistingOffers() {
          this.displayExistingOffers.set(!this.displayExistingOffers);
     }

     async setTab(tab: 'getOffers' | 'cancelOffer'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.clearFields();
          if (this.hasWallets()) {
               await this.getOffers(true, true);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getOffers(forceRefresh = false, clearMessages = false): Promise<void> {
          await this.withPerf('getOffers', async () => {
               if (clearMessages) {
                    this.txUiService.clearAllOptionsAndMessages();
               }
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, offersResponse] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh), this.xrplService.getAccountOffers(client, wallet.classicAddress, 'validated', '')]);
                    //  const [accountInfo, offersResponse, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountOffers(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    // const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    this.getExistingOffers(accountObjects, wallet.classicAddress);

                    this.refreshUiState(wallet, accountInfo, accountObjects);
                    // this.clearFields(false);
                    this.updateInfoMessage();
               } catch (error: any) {
                    console.error('Error in getOffers:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async getOrderBook() {
          await this.withPerf('getOrderBook', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, false);

                    // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validationService.validate('GetOrderBook', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    // Prepare currency objects
                    const we_want: CurrencyAmount = this.weWantCurrency() === 'XRP' ? { currency: 'XRP', value: this.weWantAmount() } : { currency: this.utilsService.encodeIfNeeded(this.weWantCurrency()), issuer: this.weWantIssuer(), value: this.weWantAmount() };
                    const we_spend: CurrencyAmount = this.weSpendCurrency() === 'XRP' ? { currency: 'XRP', value: this.weSpendAmount() } : { currency: this.utilsService.encodeIfNeeded(this.weSpendCurrency()), issuer: this.weSpendIssuer(), value: this.weSpendAmount() };

                    // Decode currencies for display
                    const displayWeWantCurrency = this.utilsService.decodeIfNeeded(we_want.currency);
                    const displayWeSpendCurrency = this.utilsService.decodeIfNeeded(we_spend.currency);
                    const offerType = we_spend.currency === AppConstants.XRP_CURRENCY ? 'buy' : 'sell';

                    // PARALLELIZE — fetch order book, counter order book, and AMM data
                    const [orderBook, counterOrderBook, ammData] = await Promise.all([
                         client.request({
                              command: 'book_offers',
                              taker: wallet.classicAddress,
                              ledger_index: 'current',
                              taker_gets: we_want,
                              taker_pays: we_spend,
                         }),
                         client.request({
                              command: 'book_offers',
                              taker: wallet.classicAddress,
                              ledger_index: 'current',
                              taker_gets: we_spend,
                              taker_pays: we_want,
                         }),
                         client.request(this.createAmmRequest(we_spend, we_want)).catch(err => {
                              console.warn('No AMM pool found for this pair:', err);
                              return null; // prevent rejection
                         }) as Promise<AMMInfoResponse | null>,
                    ]);

                    this.utilsService.logObjects('orderBook', orderBook);
                    this.utilsService.logObjects('counterOrderBook', counterOrderBook);
                    this.utilsService.logObjects('ammData', ammData ? ammData.result : '');

                    // Process AMM data if available
                    const combinedOffers: CustomBookOffer[] = [...orderBook.result.offers];

                    if (ammData?.result?.amm) {
                         const amm = ammData.result.amm;

                         const takerGets: string | IssuedCurrencyAmount = this.isTokenAmount(we_want)
                              ? {
                                     currency: we_want.currency,
                                     issuer: we_want.issuer!,
                                     value: typeof amm.amount2 === 'string' ? String(xrpl.dropsToXrp(amm.amount2)) : amm.amount2.value,
                                }
                              : typeof amm.amount2 === 'string'
                              ? amm.amount2
                              : amm.amount2.value;

                         const takerPays: string | IssuedCurrencyAmount = this.isTokenAmount(we_spend)
                              ? {
                                     currency: we_spend.currency,
                                     issuer: we_spend.issuer!,
                                     value: typeof amm.amount === 'string' ? String(xrpl.dropsToXrp(amm.amount)) : amm.amount.value,
                                }
                              : typeof amm.amount === 'string'
                              ? amm.amount
                              : amm.amount.value;

                         const ammOffer: CustomBookOffer = {
                              Account: amm.account || 'AMM_POOL',
                              Flags: 0,
                              LedgerEntryType: 'Offer',
                              Sequence: 0,
                              TakerGets: takerGets,
                              TakerPays: takerPays,
                              isAMM: true,
                              rate: new BigNumber(typeof amm.amount2 === 'string' ? xrpl.dropsToXrp(amm.amount2) : amm.amount2.value).dividedBy(typeof amm.amount === 'string' ? xrpl.dropsToXrp(amm.amount) : amm.amount.value),
                              BookDirectory: '0',
                              BookNode: '0',
                              OwnerNode: '0',
                              PreviousTxnID: '0',
                              PreviousTxnLgrSeq: 0,
                         };

                         combinedOffers.unshift(ammOffer);
                    }

                    // Calculate stats
                    const spread = this.computeBidAskSpread(offerType === 'sell' ? counterOrderBook.result.offers : combinedOffers, offerType === 'sell' ? combinedOffers : counterOrderBook.result.offers);
                    const liquidity = this.computeLiquidityRatio(offerType === 'sell' ? counterOrderBook.result.offers : combinedOffers, offerType === 'sell' ? combinedOffers : counterOrderBook.result.offers, offerType === 'sell');
                    const stats = this.computeAverageExchangeRateBothWays(combinedOffers, 5);

                    // Build UI data — RENDER IMMEDIATELY
                    const pair = `${displayWeWantCurrency}/${displayWeSpendCurrency}`;
                    const reversePair = `${displayWeSpendCurrency}/${displayWeWantCurrency}`;

                    // Add stats if available
                    if (combinedOffers.length > 0 || ammData?.result?.amm) {
                         this.populateStatsFields(stats, we_want, we_spend, spread, liquidity, offerType);

                         const statsContent = [
                              { key: 'VWAP', value: `${stats.forward.vwap.toFixed(8)} ${pair}` },
                              { key: 'Simple Average', value: `${stats.forward.simpleAvg.toFixed(8)} ${pair}` },
                              { key: 'Best Rate', value: `${stats.forward.bestRate.toFixed(8)} ${pair}` },
                              { key: 'Worst Rate', value: `${stats.forward.worstRate.toFixed(8)} ${pair}` },
                              { key: '1 XRP per Token', value: `${stats.inverse.vwap.toFixed(8)} ${reversePair}` },
                              { key: '1 XRP per Token (Best Rate)', value: `${stats.inverse.bestRate.toFixed(8)} ${reversePair}` },
                              {
                                   key: 'Depth (30% slippage)',
                                   value: `${stats.forward.depthDOG.toFixed(2)} ${displayWeWantCurrency} for ${stats.forward.depthXRP.toFixed(2)} ${displayWeSpendCurrency}`,
                              },
                              {
                                   key: `Execution (5 ${displayWeSpendCurrency})`,
                                   value: stats.forward.insufficientLiquidity ? `Insufficient liquidity: ${stats.forward.executionDOG.toFixed(2)} ${displayWeWantCurrency} for ${stats.forward.executionXRP.toFixed(2)} ${displayWeSpendCurrency}, Avg Rate: ${stats.forward.executionPrice.toFixed(8)} ${pair}` : `Receive ${stats.forward.executionDOG.toFixed(2)} ${displayWeWantCurrency}, Avg Rate: ${stats.forward.executionPrice.toFixed(8)} ${pair}`,
                              },
                              {
                                   key: 'Price Volatility',
                                   value: `Mean ${stats.forward.simpleAvg.toFixed(8)} ${pair}, StdDev ${stats.forward.volatility.toFixed(8)} (${stats.forward.volatilityPercent.toFixed(2)}%)`,
                              },
                              {
                                   key: 'Spread',
                                   value: offerType === 'buy' ? `${spread.spread.toFixed(8)} ${pair} (${spread.spreadPercent.toFixed(2)}%)` : `${spread.spread.toFixed(8)} ${reversePair} (${spread.spreadPercent.toFixed(2)}%)`,
                              },
                              {
                                   key: 'Liquidity Ratio',
                                   value: `${liquidity.ratio.toFixed(2)} (${pair} vs ${reversePair})`,
                              },
                         ];
                    }

                    // this.currentWallet().balance = await this.updateXrpBalance(client, accountInfo, wallet);
                    // this.refreshUIData(wallet, accountInfo, accountObjects);
                    // this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.clearFields();
                    // this.updateTickets(accountObjects);
               } catch (error: any) {
                    console.error('Error in getOrderBook:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createOffer() {
          await this.withPerf('createOffer', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [accountInfo, fee, initialXrpBalance, trustLines, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), client.getXrpBalance(wallet.classicAddress), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    this.utilsService.logAccountInfoObjects(accountInfo, null);
                    this.utilsService.logObjects(`trustLines`, trustLines.result);
                    this.utilsService.logObjects(`serverInfo`, serverInfo);
                    this.utilsService.logObjects(`fee`, fee);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validationService.validate('OfferCreate', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    // Trust line setup
                    let issuerAddr, issuerCur;
                    if (this.weWantIssuer() === AppConstants.XRP_CURRENCY || this.weWantIssuer() === '') {
                         issuerAddr = this.weSpendIssuer();
                         issuerCur = this.weSpendCurrency();
                    } else {
                         issuerAddr = this.weWantIssuer();
                         issuerCur = this.weWantCurrency();
                    }

                    this.utilsService.logObjects(`issuerAddr`, issuerAddr);
                    this.utilsService.logObjects(`issuerCur`, issuerCur);

                    const doesTrustLinesExists = trustLines.result.lines.filter((line: any) => {
                         // Decode currency for comparison
                         const decodedCurrency = line.currency.length > 3 ? this.utilsService.decodeCurrencyCode(line.currency) : line.currency;
                         return (
                              parseFloat(line.limit) > 0 &&
                              parseFloat(line.balance) >= 0 &&
                              line.account === issuerAddr && // Use 'account' as the issuer field
                              (issuerCur ? decodedCurrency === issuerCur : true)
                         );
                    });
                    console.debug(`Active trust lines for ${wallet.classicAddress}:`, doesTrustLinesExists);

                    // if (doesTrustLinesExists.length <= 0) {
                    //      const decodedCurrency = issuerCur.length > 3 ? this.utilsService.encodeCurrencyCode(issuerCur) : issuerCur;
                    //      const currentLedger = await this.xrplService.getLastLedgerIndex(client);
                    //      const trustSetTx: TrustSet = {
                    //           TransactionType: 'TrustSet',
                    //           Account: wallet.classicAddress,
                    //           LimitAmount: {
                    //                currency: decodedCurrency,
                    //                issuer: issuerAddr,
                    //                value: '100000000',
                    //           },
                    //           Fee: fee,
                    //           LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    //      };

                    //      if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, trustSetTx, fee)) {
                    //           return this.txUiService.setError('Insufficient XRP to complete transaction');
                    //      }

                    //      this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? 'Simulating Trustline (no changes will be made)...' : 'Submitting Trustline to Ledger...', 200);

                    //      this.txUiService.setPaymentTx(trustSetTx);
                    //      this.updatePaymentTx();

                    //      let response: any;

                    //      if (this.txUiService.isSimulateEnabled()) {
                    //           response = await this.xrplTransactions.simulateTransaction(client, trustSetTx);
                    //      } else {
                    //           const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    //           const signedTx = await this.xrplTransactions.signTransaction(client, wallet, trustSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    //           if (!signedTx) {
                    //                return this.txUiService.setError('Failed to sign Payment transaction.');
                    //           }

                    //           response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    //      }

                    //      // this.utilsService.logObjects('response', response);
                    //      // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    //      this.txUiService.setTxResult(response.result);
                    //      this.updateTxResult();

                    //      const isSuccess = this.utilsService.isTxSuccessful(response);
                    //      if (!isSuccess) {
                    //           const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    //           const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    //           console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    //           (response.result as any).errorMessage = userMessage;
                    //      }
                    // }

                    const xrpReserve = this.xrplService.getXrpReserveRequirements(accountInfo, serverInfo);
                    console.log(`Initial XRP Balance ${initialXrpBalance} (drops): ${xrpl.xrpToDrops(initialXrpBalance)}`);

                    // Build currency objects
                    let we_want = this.weWantCurrency() === AppConstants.XRP_CURRENCY ? { currency: AppConstants.XRP_CURRENCY, value: this.weWantAmount() } : { currency: this.weWantCurrency(), issuer: this.weWantIssuer(), value: this.weWantAmount() };
                    let we_spend = this.weSpendCurrency() === AppConstants.XRP_CURRENCY ? { amount: this.weSpendAmount() } : { currency: this.weSpendCurrency(), issuer: this.weSpendIssuer(), value: this.weSpendAmount() };

                    if (this.weSpendCurrency() === AppConstants.XRP_CURRENCY) {
                         if (!this.weSpendAmount()) {
                              throw new Error('weSpendAmount() is required for XRP');
                         }
                         we_spend = { amount: this.weSpendAmount() };
                    } else {
                         if (!this.weSpendAmount() || !this.weSpendIssuer()) {
                              throw new Error('weSpendAmount() and weSpendIssuerField are required for token');
                         }
                         we_spend = {
                              currency: this.utilsService.encodeIfNeeded(this.weSpendCurrency()),
                              value: this.weSpendAmount(),
                              issuer: this.weSpendIssuer(),
                         };
                    }

                    we_want.currency = this.utilsService.encodeIfNeeded(we_want.currency);

                    const offerType = we_spend.currency ? 'sell' : 'buy';
                    this.utilsService.logObjects(`offerType`, offerType);

                    // Rate analysis
                    console.log(`weSpendAmount():  ${this.weSpendAmount()} weWantAmount(): ${this.weWantAmount()} `);
                    const proposedQuality = new BigNumber(this.weSpendAmount()).dividedBy(this.weWantAmount());
                    const effectiveRate = this.calculateEffectiveRate(proposedQuality, xrpReserve, offerType);
                    const rateAnalysis = [
                         {
                              key: 'Proposed Rate',
                              value: `1 ${we_want.currency} = ${proposedQuality.toFixed(8)} ${we_spend.currency || AppConstants.XRP_CURRENCY}`,
                         },
                         {
                              key: 'Effective Rate',
                              value: `1 ${we_want.currency} = ${effectiveRate.toFixed(8)} ${we_spend.currency || AppConstants.XRP_CURRENCY}`,
                         },
                    ];
                    if (effectiveRate.gt(proposedQuality)) {
                         rateAnalysis.push({
                              key: 'Note',
                              value: 'Effective rate is worse than proposed due to XRP reserve requirements',
                         });
                    }

                    // fetch order book, counter order book, and AMM data
                    const [orderBook, orderBook2] = await Promise.all([
                         client.request({
                              command: 'book_offers',
                              taker: wallet.address,
                              taker_gets: we_want,
                              taker_pays: we_spend.currency ? we_spend : { currency: AppConstants.XRP_CURRENCY, value: this.weSpendAmount() },
                              ledger_index: 'current',
                         }),
                         client.request({
                              command: 'book_offers',
                              taker: wallet.address,
                              taker_gets: we_spend.currency ? we_spend : { currency: AppConstants.XRP_CURRENCY, value: this.weSpendAmount() },
                              taker_pays: we_want,
                              ledger_index: 'current',
                         }),
                    ]);

                    const MAX_SLIPPAGE = 0.05;
                    const offers = orderBook.result.offers;
                    let runningTotal = new BigNumber(0);
                    const wantAmount = new BigNumber(this.weWantAmount());
                    let bestOfferQuality = null;
                    let marketAnalysis: MarketAnalysisItem[] = [];
                    if (offers.length > 0) {
                         for (const o of offers) {
                              const offerQuality = new BigNumber(o.quality ?? '0');
                              if (!bestOfferQuality || offerQuality.lt(bestOfferQuality)) {
                                   bestOfferQuality = offerQuality;
                              }
                              if (offerQuality.lte(proposedQuality.times(1 + MAX_SLIPPAGE))) {
                                   const slippage = proposedQuality.minus(offerQuality).dividedBy(offerQuality);
                                   marketAnalysis = [
                                        {
                                             key: 'Best Rate',
                                             value: `1 ${we_want.currency} = ${bestOfferQuality?.toFixed(6) || '0'} ${we_spend.currency || AppConstants.XRP_CURRENCY}`,
                                        },
                                        {
                                             key: 'Proposed Rate',
                                             value: `1 ${we_want.currency} = ${proposedQuality.toFixed(6)} ${we_spend.currency || AppConstants.XRP_CURRENCY}`,
                                        },
                                        { key: 'Slippage', value: `${slippage.times(100).toFixed(2)}%` },
                                   ];
                                   if (slippage.gt(MAX_SLIPPAGE)) {
                                        marketAnalysis.push({
                                             key: 'Warning',
                                             value: `Slippage ${slippage.times(100).toFixed(2)}% exceeds ${MAX_SLIPPAGE * 100}%`,
                                        });
                                   }
                                   runningTotal = runningTotal.plus(new BigNumber(o.owner_funds || (typeof o.TakerGets === 'object' && 'value' in o.TakerGets ? o.TakerGets.value : o.TakerGets)));
                                   if (runningTotal.gte(wantAmount)) break;
                              }
                         }
                    }

                    if (runningTotal.eq(0)) {
                         const offeredQuality = new BigNumber(this.weWantAmount()).dividedBy(this.weSpendAmount());
                         const offers2 = orderBook2.result.offers;
                         let runningTotal2 = new BigNumber(0);
                         let tallyCurrency = we_spend.currency || AppConstants.XRP_CURRENCY;
                         if (tallyCurrency === AppConstants.XRP_CURRENCY) {
                              tallyCurrency = 'drops of XRP';
                         }
                         if (offers2.length > 0) {
                              for (const o of offers2) {
                                   if (typeof o.quality !== 'undefined' && Number(o.quality) <= effectiveRate.toNumber()) {
                                        const bestOfferQuality2 = new BigNumber(o.quality);
                                        const slippage = proposedQuality.minus(bestOfferQuality2).dividedBy(bestOfferQuality2);
                                        marketAnalysis = [
                                             {
                                                  key: 'Best Rate',
                                                  value: `1 ${we_spend.currency || AppConstants.XRP_CURRENCY} = ${bestOfferQuality2.toFixed(6)} ${we_want.currency}`,
                                             },
                                             {
                                                  key: 'Proposed Rate',
                                                  value: `1 ${we_spend.currency || AppConstants.XRP_CURRENCY} = ${proposedQuality.toFixed(6)} ${we_want.currency}`,
                                             },
                                             { key: 'Slippage', value: `${slippage.times(100).toFixed(2)}%` },
                                        ];
                                        if (slippage.gt(MAX_SLIPPAGE)) {
                                             marketAnalysis.push({
                                                  key: 'Warning',
                                                  value: `Slippage ${slippage.times(100).toFixed(2)}% exceeds ${MAX_SLIPPAGE * 100}%`,
                                             });
                                        }
                                        runningTotal2 = runningTotal2.plus(new BigNumber(o.owner_funds || '0'));
                                   } else {
                                        break;
                                   }
                              }
                              if (runningTotal2.gt(0)) {
                                   marketAnalysis.push({
                                        key: 'Order Book Position',
                                        value: `Offer placed below at least ${runningTotal2.toFixed(2)} ${tallyCurrency}`,
                                   });
                              }
                         }
                         if (!offers2.length) {
                              marketAnalysis.push({
                                   key: 'Order Book Position',
                                   value: 'No similar offers; this would be the first',
                              });
                         }
                    }
                    interface MarketAnalysisItem {
                         key: string;
                         value: string;
                    }

                    // Properly assign and type we_want1 and we_spend1 for OfferCreate
                    let we_want1: string | { currency: string; issuer: string; value: string };
                    let we_spend1: string | { currency: string; issuer: string; value: string };

                    // we_want1
                    if (this.weWantCurrency() === AppConstants.XRP_CURRENCY) {
                         if (!this.weWantAmount()) {
                              throw new Error('weWantAmount() is required for XRP');
                         }
                         // XRP is represented as drops (string)
                         we_want1 = xrpl.xrpToDrops(this.weWantAmount());
                    } else {
                         if (!this.weWantAmount() || !this.weWantIssuer()) {
                              throw new Error('weWantAmount() and weWantIssuerField are required for token');
                         }
                         we_want1 = {
                              currency: this.utilsService.encodeIfNeeded(this.weWantCurrency()),
                              issuer: this.weWantIssuer(),
                              value: this.weWantAmount(),
                         };
                    }

                    // we_spend1
                    if (this.weSpendCurrency() === AppConstants.XRP_CURRENCY) {
                         if (!this.weSpendAmount()) {
                              throw new Error('weSpendAmount() is required for XRP');
                         }
                         we_spend1 = xrpl.xrpToDrops(this.weSpendAmount());
                    } else {
                         if (!this.weSpendAmount() || !this.weSpendIssuer()) {
                              throw new Error('weSpendAmount() and weSpendIssuerField are required for token');
                         }
                         we_spend1 = {
                              currency: this.utilsService.encodeIfNeeded(this.weSpendCurrency()),
                              issuer: this.weSpendIssuer(),
                              value: this.weSpendAmount(),
                         };
                    }

                    let flags = 0;

                    if (this.isMarketOrder()) {
                         // For a market order, you might want ImmediateOrCancel
                         flags |= OfferCreateFlags.tfImmediateOrCancel;
                    } else if (this.isFillOrKill()) {
                         // Optional: if you also want FillOrKill
                         flags |= OfferCreateFlags.tfFillOrKill;
                    } else {
                         // For a passive order, use tfPassive
                         flags |= OfferCreateFlags.tfPassive;
                    }

                    const currentLedger = await this.xrplService.getLastLedgerIndex(client);

                    let offerCreateTx: OfferCreate = {
                         TransactionType: 'OfferCreate',
                         Account: wallet.classicAddress,
                         TakerGets: we_spend1,
                         TakerPays: we_want1,
                         Flags: flags, // numeric bitmask of selected options
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, offerCreateTx, wallet, accountInfo, 'createOffer');

                    const result = await this.txExecutor.createOffer(offerCreateTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Offer creation successfully!' : 'Offer created successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);

                    // if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, offerCreateTx, fee)) {
                    //      return this.txUiService.setError('Insufficient XRP to complete transaction');
                    // }

                    // this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? 'Simulating Create Offer (no changes will be made)...' : 'Submitting Create Offer to Ledger...', 200);

                    // this.txUiService.setPaymentTx(offerCreateTx);
                    // this.updatePaymentTx();

                    // let response: any;

                    // if (this.txUiService.isSimulateEnabled()) {
                    //      response = await this.xrplTransactions.simulateTransaction(client, offerCreateTx);
                    // } else {
                    //      const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    //      const signedTx = await this.xrplTransactions.signTransaction(client, wallet, offerCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    //      if (!signedTx) {
                    //           return this.txUiService.setError('Failed to sign Payment transaction.');
                    //      }

                    //      response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    // }

                    // // this.utilsService.logObjects('response', response);
                    // // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    // this.txUiService.setTxResult(response.result);
                    // this.updateTxResult();

                    // const isSuccess = this.utilsService.isTxSuccessful(response);
                    // if (!isSuccess) {
                    //      const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    //      const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    //      console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    //      (response.result as any).errorMessage = userMessage;
                    //      return this.txUiService.setError(userMessage);
                    // } else {
                    //      this.txUiService.setSuccess(this.txUiService.result);
                    // }

                    // // Balance changes
                    // let balanceChanges: { account: string; balances: any[] }[] = [];
                    // if (response.result.meta && typeof response.result.meta !== 'string') {
                    //      balanceChanges = xrpl.getBalanceChanges(response.result.meta);
                    // }
                    // data.sections.push({
                    //      title: 'Balance Changes',
                    //      openByDefault: true,
                    //      content: balanceChanges.length
                    //           ? balanceChanges.flatMap((change, index) =>
                    //                  change.balances.map((bal, balIdx) => ({
                    //                       key: `Change ${index + 1}${change.balances.length > 1 ? `.${balIdx + 1}` : ''}`,
                    //                       value: `${bal.value} ${bal.currency}${bal.issuer ? ` (Issuer: <code>${bal.issuer}</code>)` : ''} for <code>${change.account}</code>`,
                    //                  }))
                    //             )
                    //           : [{ key: 'Status', value: 'No balance changes recorded' }],
                    // });

                    // const [finalXrpBalance, acctOffers] = await Promise.all([client.getXrpBalance(wallet.classicAddress), this.xrplService.getAccountOffers(client, wallet.classicAddress, 'validated', '')]);

                    // data.sections.push({
                    //      title: 'Updated Balances',
                    //      openByDefault: true,
                    //      content: [
                    //           { key: 'XRP', value: finalXrpBalance.toString() },
                    //           // { key: tokenBalance, value: updatedTokenBalance },
                    //      ],
                    // });

                    // // Outstanding offers
                    // function amt_str(amt: any): string {
                    //      if (typeof amt === 'string') {
                    //           // Assume XRP in drops
                    //           return `${xrpl.dropsToXrp(amt)} XRP`;
                    //      } else if (amt && typeof amt === 'object') {
                    //           // Assume token object
                    //           return `${amt.value} ${amt.currency}${amt.issuer ? ` (Issuer: ${amt.issuer})` : ''}`;
                    //      }
                    //      return String(amt);
                    // }
                    // if (acctOffers.result.offers && acctOffers.result.offers.length > 0) {
                    //      data.sections.push({
                    //           title: `Outstanding Offers (${acctOffers.result.offers.length})`,
                    //           openByDefault: false,
                    //           subItems: acctOffers.result.offers.map((offer: any, index: number) => ({
                    //                key: `Offer ${index + 1}`,
                    //                openByDefault: false,
                    //                content: [{ key: 'Sequence', value: offer.seq }, { key: 'TakerGets', value: amt_str(offer.taker_gets) }, { key: 'TakerPays', value: amt_str(offer.taker_pays) }, ...(offer.expiration ? [{ key: 'Expiration', value: new Date(offer.expiration * 1000).toISOString() }] : [])],
                    //           })),
                    //      });
                    // }

                    // // Account Details
                    // data.sections.push({
                    //      title: 'Account Details',
                    //      openByDefault: true,
                    //      content: [
                    //           { key: 'Name', value: this.currentWallet().balance },
                    //           { key: 'Address', value: `<code>${wallet.address}</code>` },
                    //           { key: 'Final XRP Balance', value: finalXrpBalance.toString() },
                    //      ],
                    // });

                    // Render result
                    // this.txUiService.setSuccess(this.result);

                    // this.txUiService.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

                    // if (!this.txUiService.isSimulateEnabled()) {
                    //      this.txUiService.successMessage = 'Offer created successfully!';
                    //      const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    //      this.getExistingOffers(updatedAccountObjects, wallet.classicAddress);
                    //      // this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    //      // this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    //      // this.updateTickets(updatedAccountObjects);
                    //      this.clearFields();
                    //      this.updateInfoMessage();
                    //      // this.cdr.detectChanges();
                    // } else {
                    //      this.txUiService.successMessage = 'Simulated Offer create successfully!';
                    // }
               } catch (error: any) {
                    console.error('Error in createPffer:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async cancelOffer() {
          await this.withPerf('cancelOffer', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               const offerSequenceArray = this.offerSequenceField()
                    .split(',')
                    .map(seq => seq.trim())
                    .filter(seq => seq !== '');

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    this.utilsService.logAccountInfoObjects(accountInfo, null);
                    this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validationService.validate('OfferCancel', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    let offersSuccessfullyDeleted = 0;

                    for (const offerSeq of offerSequenceArray) {
                         const offerSequence = parseInt(offerSeq);

                         // let signedTx: { tx_blob: string; hash: string } | null = null;
                         let currentLedger = await this.xrplService.getLastLedgerIndex(client);

                         const offerCancelTx = await client.autofill({
                              TransactionType: 'OfferCancel',
                              Account: wallet.classicAddress,
                              OfferSequence: offerSequence,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         });

                         // await this.setTxOptionalFields(client, offerCancelTx, wallet, accountInfo, 'cancelOffer');

                         // if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, offerCancelTx, fee)) {
                         //      return this.txUiService.setError('Insufficient XRP to complete transaction');
                         // }

                         // this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? `Simulating Cancel Offer ${offerSeq}...` : `Submitting Cancel Offer for offer sequence ${offerSeq}...`, 200);

                         // this.txUiService.setPaymentTx(offerCancelTx);
                         // this.updatePaymentTx();

                         // let response: any;
                         // if (this.txUiService.isSimulateEnabled()) {
                         //      response = await this.xrplTransactions.simulateTransaction(client, offerCancelTx);
                         // } else {
                         //      const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                         //      const signedTx = await this.xrplTransactions.signTransaction(client, wallet, offerCancelTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         //      if (!signedTx) {
                         //           console.error(`Failed to sign transaction for ticket ${offerSeq}`);
                         //           continue;
                         //      }

                         //      response = await this.xrplTransactions.submitTransaction(client, signedTx);
                         // }

                         // // this.utilsService.logObjects('response', response);
                         // // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                         // this.txUiService.setTxResult(response.result);
                         // this.updateTxResult();

                         // this.utilsService.logObjects('response', response);
                         // const isSuccess = this.utilsService.isTxSuccessful(response);
                         // if (!isSuccess) {
                         //      console.warn(`Cancel offer ${offerSeq} failed:`, response);
                         // } else {
                         //      offersSuccessfullyDeleted += 1;
                         //      const hash = response.result.hash ?? response.result.tx_json.hash;
                         //      this.txUiService.txHashes.push(hash); // ← push to array
                         //      console.log(`Offer ${offerSeq} cancelled successfully. TxHash:`, response.result.hash ? response.result.hash : response.result.tx_json.hash);
                         // }
                    }

                    // this.txUiService.setSuccess(this.txUiService.result);

                    // if (!this.txUiService.isSimulateEnabled()) {
                    //      this.txUiService.successMessage = 'Cancelled offer successfully!';

                    //      const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    //      this.getExistingOffers(updatedAccountObjects, wallet.classicAddress);
                    //      await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    //      // this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    //      // this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    //      // this.updateTickets(updatedAccountObjects);
                    //      this.clearFields();
                    //      this.updateInfoMessage();
                    //      // this.cdr.detectChanges();
                    // } else {
                    //      this.txUiService.successMessage = 'Simulated Cancel offer successfully!';
                    // }
               } catch (error: any) {
                    console.error('Error in cancelOFfer:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     decodeOfferFlags(flags: number): string[] {
          const decoded: string[] = [];

          if ((flags & 0x00010000) !== 0) decoded.push('tfPassive');
          if ((flags & 0x00020000) !== 0) decoded.push('tfImmediateOrCancel');
          if ((flags & 0x00040000) !== 0) decoded.push('tfFillOrKill');
          if ((flags & 0x00080000) !== 0) decoded.push('tfSell');

          return decoded.length ? decoded : ['None'];
     }

     private getExistingOffers(offerObjects: xrpl.AccountObjectsResponse, classicAddress: string): any[] {
          const offers = (offerObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'Offer' && obj.Account === classicAddress);

          this.offersArray.set(offers.map((obj: any) => obj.Sequence));

          const mapped = offers.map((obj: any): any => {
               let takerGetsUI: any = null;
               let takerGets = obj.TakerGets;
               let takerGetsAmount = '0';
               let takerGetsCurrency = '';
               let takerGetsIssuer = '';

               let takerPaysUI: any = null;
               const takerPays = obj.TakerPays;
               let takerPaysAmount = '0';
               let takerPaysCurrency = '';
               let takerPaysIssuer = '';

               if (typeof takerGets === 'string') {
                    takerGetsAmount = String(xrpl.dropsToXrp(takerGets));
                    takerGetsUI = takerGetsAmount.trim();
               } else if (takerGets?.value) {
                    takerGetsAmount = takerGets.value;
                    takerGetsIssuer = takerGets.issuer;
                    takerGetsCurrency = this.utilsService.normalizeCurrencyCode(takerGets.currency);

                    takerGetsUI = `${takerGetsAmount} ${takerGetsCurrency} ${takerGetsIssuer}`;
               }

               if (typeof takerPays === 'string') {
                    takerPaysAmount = String(xrpl.dropsToXrp(takerPays));
                    takerPaysUI = takerPaysAmount.trim();
               } else if (takerPays?.value) {
                    takerPaysAmount = takerPays.value;
                    takerPaysIssuer = takerPays.issuer;
                    takerPaysCurrency = this.utilsService.normalizeCurrencyCode(takerPays.currency);

                    takerPaysUI = `${takerPaysAmount} ${takerPaysCurrency} ${takerPaysIssuer}`;
               }

               return {
                    LedgerEntryType: obj.LedgerEntryType,
                    Account: obj.Account,
                    TakerGets: takerGetsUI,
                    TakerPays: takerPaysUI,
                    Flags: obj.Flags,
                    BookDirectory: obj.BookDirectory,
                    TxHash: obj.index,
                    Sequence: obj.Sequence,
               };
          });

          this.existingOffers.set(mapped);
          this.utilsService.logObjects('mapped', mapped);
          this.utilsService.logObjects('existingOffers', this.existingOffers());
          this.utilsService.logObjects('offersArray (sequences)', this.offersArray());

          return this.existingOffers();
     }

     invertOrder() {
          const tempCurr = this.weWantCurrency();
          const tempIss = this.weWantIssuer();
          const tempAmt = this.weWantAmount();

          this.weWantCurrency.set(this.weSpendCurrency());
          this.weSpendCurrency.set(tempCurr);
          this.weWantIssuer.set(this.weSpendIssuer());
          this.weSpendIssuer.set(tempIss);

          this.onWeWantCurrencyChange();
          //     this.offerCurrency.selectWeWantCurrency(this.weWantCurrency());
          this.onWeSpendCurrencyChange();
          //     this.offerCurrency.selectWeSpendCurrency(this.weSpendCurrency());

          this.weSpendAmount.set(tempAmt || '');
          if (this.weSpendAmount()) this.updateTokenBalanceAndExchange();
     }

     computeBidAskSpread(tokenXrpOffers: any, xrpTokenOffers: any) {
          let bestTokenXrp = 0;
          if (tokenXrpOffers.length > 0) {
               const getsValue = tokenXrpOffers[0].TakerGets.value ? parseFloat(tokenXrpOffers[0].TakerGets.value) : parseFloat(tokenXrpOffers[0].TakerGets) / 1_000_000;
               const paysValue = tokenXrpOffers[0].TakerPays.value ? parseFloat(tokenXrpOffers[0].TakerPays.value) : parseFloat(tokenXrpOffers[0].TakerPays) / 1_000_000;
               bestTokenXrp = getsValue / paysValue;
          }

          let bestXrpToken = 0;
          if (xrpTokenOffers.length > 0) {
               const getsValue = xrpTokenOffers[0].TakerGets.value ? parseFloat(xrpTokenOffers[0].TakerGets.value) : parseFloat(xrpTokenOffers[0].TakerGets) / 1_000_000;
               const paysValue = xrpTokenOffers[0].TakerPays.value ? parseFloat(xrpTokenOffers[0].TakerPays.value) : parseFloat(xrpTokenOffers[0].TakerPays) / 1_000_000;
               bestXrpToken = getsValue / paysValue;
          }

          const bestXrpTokenInverse = bestXrpToken > 0 ? 1 / bestXrpToken : 0;
          const spread = bestTokenXrp > 0 && bestXrpToken > 0 ? Math.abs(bestTokenXrp - bestXrpTokenInverse) : 0;
          const midPrice = bestTokenXrp > 0 && bestXrpToken > 0 ? (bestTokenXrp + bestXrpTokenInverse) / 2 : 0;
          const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
          return { spread, spreadPercent, bestTokenXrp, bestXrpToken };
     }

     computeLiquidityRatio(tokenXrpOffers: any, xrpTokenOffers: any, isTokenXrp = true) {
          let tokenVolume = 0;
          if (tokenXrpOffers.length > 0) {
               tokenVolume = tokenXrpOffers.reduce((sum: number, offer: { TakerGets: { value?: string } | string }) => sum + (typeof offer.TakerGets === 'object' && 'value' in offer.TakerGets && offer.TakerGets.value ? parseFloat(offer.TakerGets.value) : parseFloat(typeof offer.TakerGets === 'string' ? offer.TakerGets : '') / 1_000_000), 0);
          }

          let xrpVolume = 0;
          if (xrpTokenOffers.length > 0) {
               xrpVolume = xrpTokenOffers.reduce((sum: number, offer: { TakerGets: { value?: string } | string }) => sum + (typeof offer.TakerGets === 'object' && 'value' in offer.TakerGets && offer.TakerGets.value ? parseFloat(offer.TakerGets.value) : parseFloat(typeof offer.TakerGets === 'string' ? offer.TakerGets : '') / 1_000_000), 0);
          }

          const ratio = isTokenXrp ? (xrpVolume > 0 ? tokenVolume / xrpVolume : 0) : tokenVolume > 0 ? xrpVolume / tokenVolume : 0;
          return { tokenVolume, xrpVolume, ratio };
     }

     computeAverageExchangeRateBothWays(offers: any, tradeSizeXRP = 15) {
          let totalPays = 0; // XRP
          let totalGets = 0; // TOKEN
          interface ExchangeRates {
               vwap: number;
               simpleAvg: number;
               bestRate: number;
               worstRate: number;
               depthDOG: number;
               depthXRP: number;
               executionPrice: number;
               executionDOG: number;
               executionXRP: number;
               insufficientLiquidity: boolean;
               volatility: number;
               volatilityPercent: number;
          }

          interface InverseRates {
               vwap: number;
               simpleAvg: number;
               bestRate: number;
               worstRate: number;
          }

          interface ExchangeRateResult {
               forward: ExchangeRates;
               inverse: InverseRates;
          }

          let forwardRates: number[] = []; // TOKEN/XRP
          let inverseRates: number[] = []; // XRP/TOKEN
          let bestQuality = Infinity;

          interface Offer {
               TakerGets: { value?: string } | string;
               TakerPays: { value?: string } | string;
          }

          const offersTyped: Offer[] = offers as Offer[];
          offersTyped.forEach((offer: Offer) => {
               let getsValue: number = typeof offer.TakerGets === 'string' ? parseFloat(offer.TakerGets) / 1_000_000 : parseFloat(offer.TakerGets.value as string); // TOKEN
               let paysValue: number = typeof offer.TakerPays === 'string' ? parseFloat(offer.TakerPays) / 1_000_000 : parseFloat(offer.TakerPays.value as string); // XRP
               if (getsValue > 0 && paysValue > 0) {
                    totalPays += paysValue;
                    totalGets += getsValue;
                    forwardRates.push(getsValue / paysValue); // TOKEN/XRP
                    inverseRates.push(paysValue / getsValue); // XRP/TOKEN
                    bestQuality = Math.min(bestQuality, paysValue / getsValue); // Quality = XRP/TOKEN
               }
          });

          // Depth at 5% slippage
          const maxQuality = bestQuality * 1.05;
          let depthGets = 0; // TOKEN
          let depthPays = 0; // XRP
          interface Offer {
               TakerGets: { value?: string } | string;
               TakerPays: { value?: string } | string;
          }

          (offers as Offer[]).forEach((offer: Offer) => {
               const getsValue: number = typeof offer.TakerGets === 'string' ? parseFloat(offer.TakerGets) / 1_000_000 : parseFloat(offer.TakerGets.value as string);
               const paysValue: number = typeof offer.TakerPays === 'string' ? parseFloat(offer.TakerPays) / 1_000_000 : parseFloat(offer.TakerPays.value as string);
               if (paysValue / getsValue <= maxQuality) {
                    depthGets += getsValue;
                    depthPays += paysValue;
               }
          });

          // Execution price for paying tradeSizeXRP XRP
          let execGets = 0; // TOKEN
          let execPays = 0; // XRP
          let remainingPays = tradeSizeXRP; // Want to pay tradeSizeXRP XRP
          let insufficientLiquidity = false;
          for (const offer of offers) {
               const getsValue = typeof offer.TakerGets === 'string' ? parseFloat(offer.TakerGets) / 1_000_000 : parseFloat(offer.TakerGets.value);
               const paysValue = typeof offer.TakerPays === 'string' ? parseFloat(offer.TakerPays) / 1_000_000 : parseFloat(offer.TakerPays.value);
               const paysToUse = Math.min(remainingPays, paysValue);
               if (paysToUse > 0) {
                    execGets += (paysToUse / paysValue) * getsValue;
                    execPays += paysToUse;
                    remainingPays -= paysToUse;
               }
               if (remainingPays <= 0) break;
          }
          if (remainingPays > 0) {
               insufficientLiquidity = true;
          }

          // Volatility
          const meanForward = forwardRates.length > 0 ? forwardRates.reduce((a, b) => a + b, 0) / forwardRates.length : 0;
          const varianceForward = forwardRates.length > 0 ? forwardRates.reduce((sum, rate) => sum + Math.pow(rate - meanForward, 2), 0) / forwardRates.length : 0;
          const stdDevForward = Math.sqrt(varianceForward);

          return {
               forward: {
                    // TOKEN/XRP
                    vwap: totalPays > 0 ? totalGets / totalPays : 0,
                    simpleAvg: meanForward,
                    bestRate: forwardRates.length > 0 ? Math.max(...forwardRates) : 0,
                    worstRate: forwardRates.length > 0 ? Math.min(...forwardRates) : 0,
                    depthDOG: depthGets,
                    depthXRP: depthPays,
                    executionPrice: execPays > 0 ? execGets / execPays : 0, // TOKEN/XRP
                    executionDOG: execGets,
                    executionXRP: execPays,
                    insufficientLiquidity,
                    volatility: stdDevForward,
                    volatilityPercent: meanForward > 0 ? (stdDevForward / meanForward) * 100 : 0,
               },
               inverse: {
                    // XRP/TOKEN
                    vwap: totalGets > 0 ? totalPays / totalGets : 0,
                    simpleAvg: inverseRates.length > 0 ? inverseRates.reduce((a, b) => a + b, 0) / inverseRates.length : 0,
                    bestRate: inverseRates.length > 0 ? Math.max(...inverseRates) : 0,
                    worstRate: inverseRates.length > 0 ? Math.min(...inverseRates) : 0,
               },
          };
     }

     calculateEffectiveRate(proposedQuality: any, reserveInfo: any, offerType: any) {
          // Convert to BigNumber for precise calculations
          const quality = new BigNumber(proposedQuality);

          // Estimate additional reserve requirements for this offer
          // Each new offer typically requires 2 XRP owner reserve
          const additionalReserveCost = new BigNumber(reserveInfo.ownerReserve);

          // For simplicity, we'll amortize the reserve cost over the offer amount
          // This is a simplified model - adjust based on your trading strategy
          const reserveCostFactor = additionalReserveCost
               .dividedBy(new BigNumber(10).pow(6)) // Convert to XRP
               .dividedBy(quality); // Spread over the offer amount

          // Adjust the quality based on reserve costs
          // For buy offers: effective rate is slightly worse (higher)
          // For sell offers: effective rate is slightly worse (lower)
          const adjustmentFactor = offerType === 'buy' ? new BigNumber(1).plus(reserveCostFactor) : new BigNumber(1).minus(reserveCostFactor);

          return quality.multipliedBy(adjustmentFactor);
     }

     populateStatsFields(stats: any, we_want: any, we_spend: any, spread: any, liquidity: any, offerType: any) {
          const orderBookDirectionField = document.getElementById('orderBookDirectionField') as HTMLInputElement | null;
          if (orderBookDirectionField) orderBookDirectionField.value = `${we_want.currency}/${we_spend.currency}`;
          const vwapField = document.getElementById('vwapField') as HTMLInputElement | null;
          if (vwapField) vwapField.value = stats.forward.vwap.toFixed(8);
          const simpleAverageField = document.getElementById('simpleAverageField') as HTMLInputElement | null;
          if (simpleAverageField) simpleAverageField.value = stats.forward.simpleAvg.toFixed(8);
          const bestRateField = document.getElementById('bestRateField') as HTMLInputElement | null;
          if (bestRateField) bestRateField.value = stats.forward.bestRate.toFixed(8);
          const worstRateField = document.getElementById('worstRateField') as HTMLInputElement | null;
          if (worstRateField) worstRateField.value = stats.forward.worstRate.toFixed(8);
          const depthField = document.getElementById('depthField') as HTMLInputElement | null;
          if (depthField) depthField.value = `${stats.forward.depthDOG.toFixed(2)} ${we_want.currency} for ${stats.forward.depthXRP.toFixed(2)} ${we_spend.currency}`;

          const liquidityField = document.getElementById('liquidityField') as HTMLInputElement | null;
          const averageRateField = document.getElementById('averageRateField') as HTMLInputElement | null;
          if (stats.forward.insufficientLiquidity) {
               if (liquidityField) liquidityField.value = `${15} ${we_spend.currency}: Insufficient liquidity (only ${stats.forward.executionDOG.toFixed(2)} ${we_want.currency} for ${stats.forward.executionXRP.toFixed(2)} ${we_spend.currency} available)`;
               if (averageRateField) averageRateField.value = `${stats.forward.executionPrice.toFixed(8)} ${we_want.currency}/${we_spend.currency}`;
          } else {
               if (liquidityField) liquidityField.value = `${15} ${we_spend.currency} for ${stats.forward.executionDOG.toFixed(2)} ${we_want.currency}`;
               if (averageRateField) averageRateField.value = `${stats.forward.executionPrice.toFixed(8)} ${we_want.currency}/${we_spend.currency}`;
          }

          const liquidityRatioField = document.getElementById('liquidityRatioField') as HTMLInputElement | null;
          if (liquidityRatioField) liquidityRatioField.value = `${liquidity.ratio.toFixed(2)} (${we_want.currency}/${we_spend.currency} vs ${we_spend.currency}/${we_want.currency})`;
          const priceVolatilityField = document.getElementById('priceVolatilityField') as HTMLInputElement | null;
          if (priceVolatilityField) priceVolatilityField.value = `${stats.forward.simpleAvg.toFixed(8)} ${we_want.currency}/${we_spend.currency}`;
          const stdDeviationField = document.getElementById('stdDeviationField') as HTMLInputElement | null;
          if (stdDeviationField) stdDeviationField.value = `${stats.forward.volatility.toFixed(8)} (${stats.forward.volatilityPercent.toFixed(2)}%)`;

          const spreadField = document.getElementById('spreadField') as HTMLInputElement | null;
          if (offerType === 'buy') {
               if (spreadField) spreadField.value = `${spread.spread.toFixed(8)} ${we_want.currency}/${we_spend.currency} (${spread.spreadPercent.toFixed(2)}%)`;
          } else {
               if (spreadField) spreadField.value = `${spread.spread.toFixed(8)} ${we_spend.currency}/${we_want.currency} (${spread.spreadPercent.toFixed(2)}%)`;
          }
     }

     createAmmRequest(we_spend: CurrencyAmount, we_want: CurrencyAmount): AMMInfoRequest {
          return {
               command: 'amm_info',
               asset: this.isTokenAmount(we_spend) ? { currency: we_spend.currency, issuer: we_spend.issuer } : { currency: 'XRP' },
               asset2: this.isTokenAmount(we_want) ? { currency: we_want.currency, issuer: we_want.issuer } : { currency: 'XRP' },
          };
     }

     isTokenAmount(amount: CurrencyAmount): amount is CurrencyAmountToken {
          return amount.currency !== 'XRP';
     }

     formatCurrencyAmount(amount: string | IssuedCurrencyAmount | CurrencyAmount): string {
          if (typeof amount === 'string') {
               return `${xrpl.dropsToXrp(amount)} XRP`;
          }
          if ('issuer' in amount) {
               return `${amount.value} ${amount.currency} (${amount.issuer})`;
          }
          return `${amount.value} XRP`;
     }

     normalizeAmount = (val: string | IssuedCurrencyAmount | CurrencyAmount) => {
          if (typeof val === 'string') {
               // Only convert if it's an integer (drops)
               return /^\d+$/.test(val) ? xrpl.dropsToXrp(val) : val;
          }
          return val.value; // Already a decimal string
     };

     calculateRate(gets: string | IssuedCurrencyAmount | CurrencyAmount, pays: string | IssuedCurrencyAmount | CurrencyAmount): string {
          const getsValue = this.normalizeAmount(gets);
          const paysValue = this.normalizeAmount(pays);
          return new BigNumber(paysValue).dividedBy(getsValue).toFixed(15);
     }

     // Add this new method for the reverse calculation (want → spend)
     async updateTokenBalanceAndExchangeReverse() {
          console.log('Entering updateTokenBalanceAndExchangeReverse');
          const startTime = Date.now();
          this.txUiService.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          if (!this.weWantAmount() || parseFloat(this.weWantAmount()) <= 0) {
               this.weSpendAmount.set('0');
               return;
          }

          this.txUiService.spinner.set(true);
          this.txUiService.showSpinnerWithDelay('Calculating required amount...', 500);

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.utilsService.getWalletFromAddress(this.currentWallet().address);

               const weWant: CurrencyAmount =
                    this.weWantCurrency() === 'XRP'
                         ? { currency: 'XRP', value: this.weWantAmount() }
                         : {
                                currency: this.weWantCurrency().length > 3 ? this.utilsService.encodeCurrencyCode(this.weWantCurrency()) : this.weWantCurrency(),
                                issuer: this.weWantIssuer(),
                                value: this.weWantAmount(),
                           };

               const weSpend: CurrencyAmount =
                    this.weSpendCurrency() === 'XRP'
                         ? { currency: 'XRP', value: '0' }
                         : {
                                currency: this.weSpendCurrency().length > 3 ? this.utilsService.encodeCurrencyCode(this.weSpendCurrency()) : this.weSpendCurrency(),
                                issuer: this.weSpendIssuer(),
                                value: '0',
                           };

               const [orderBook, ammPoolData] = await Promise.all([
                    client.request({
                         command: 'book_offers',
                         taker_gets: weWant, // Receive
                         taker_pays: weSpend, // Pay
                         limit: 400,
                         ledger_index: 'current',
                         taker: wallet.classicAddress,
                    }),
                    client
                         .request({
                              command: 'amm_info',
                              asset: this.weSpendCurrency() === 'XRP' ? { currency: 'XRP' } : { currency: weSpend.currency, issuer: (weSpend as any).issuer },
                              asset2: this.weWantCurrency() === 'XRP' ? { currency: 'XRP' } : { currency: weWant.currency, issuer: (weSpend as any).issuer },
                         })
                         .catch(() => null),
               ]);

               let allOffers = [...orderBook.result.offers];

               if (ammPoolData?.result?.amm) {
                    const amm = ammPoolData.result.amm;
                    const getVal = (x: any) => (typeof x === 'string' ? x : x.value);
                    const amount1 = getVal(amm.amount);
                    const amount2 = getVal(amm.amount2);

                    let receiveVal, payVal;
                    if (this.weWantCurrency() === 'XRP') {
                         receiveVal = typeof amm.amount2 === 'string' ? xrpl.dropsToXrp(amount2) : amount2;
                         payVal = typeof amm.amount === 'string' ? xrpl.dropsToXrp(amount1) : amount1;
                    } else {
                         receiveVal = typeof amm.amount === 'string' ? xrpl.dropsToXrp(amount1) : amount1;
                         payVal = typeof amm.amount2 === 'string' ? xrpl.dropsToXrp(amount2) : amount2;
                    }

                    const ammRate = new BigNumber(payVal).dividedBy(receiveVal); // pay / receive
                    const ammOffer = {
                         TakerGets: receiveVal, // receive
                         TakerPays: payVal, // pay
                         isAMM: true,
                         rate: ammRate,
                    };
                    allOffers.push(ammOffer as any);
               }

               // Sort by best rate (lowest pay per receive, ascending)
               allOffers.sort((a, b) => {
                    const rateA = new BigNumber(this.normalizeAmount(a.TakerPays)).dividedBy(this.normalizeAmount(a.TakerGets));
                    const rateB = new BigNumber(this.normalizeAmount(b.TakerPays)).dividedBy(this.normalizeAmount(b.TakerGets));
                    return rateA.minus(rateB).toNumber();
               });

               let remainingReceive = new BigNumber(this.weWantAmount());
               let totalPay = new BigNumber(0);

               for (const offer of allOffers) {
                    if (remainingReceive.lte(0)) break;

                    const availableReceive = new BigNumber(this.normalizeAmount(offer.TakerGets));
                    const payForThis = new BigNumber(this.normalizeAmount(offer.TakerPays));

                    if (availableReceive.isZero()) continue;

                    const rate = payForThis.dividedBy(availableReceive); // pay / receive

                    const useReceive = BigNumber.min(remainingReceive, availableReceive);
                    const requiredPay = useReceive.multipliedBy(rate);

                    totalPay = totalPay.plus(requiredPay);
                    remainingReceive = remainingReceive.minus(useReceive);
               }

               this.weSpendAmount.set(totalPay.toFixed(8));
               // this.phnixExchangeXrp = totalPay.toFixed(8);
               this.insufficientLiquidityWarning.set(remainingReceive.gt(0));
          } catch (error: any) {
               console.error('Error in updateTokenBalanceAndExchangeReverse:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
               // this.phnixExchangeXrp = 'Error';
               this.weSpendAmount.set('0');
          } finally {
               this.txUiService.spinner.set(false);
               let executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving updateTokenBalanceAndExchangeReverse in ${executionTime}ms`);
          }
     }
     async updateTokenBalanceAndExchange() {
          console.log('Entering updateTokenBalanceAndExchange');
          const startTime = Date.now();
          this.txUiService.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          if (!this.weSpendAmount() || parseFloat(this.weSpendAmount()) <= 0) {
               this.weWantAmount.set('0');
               return;
          }

          this.txUiService.spinner.set(true);
          this.txUiService.showSpinnerWithDelay('Calculating best rate...', 500);

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.utilsService.getWalletFromAddress(this.currentWallet().address);

               const weWant: CurrencyAmount =
                    this.weWantCurrency() === 'XRP'
                         ? { currency: 'XRP', value: '0' }
                         : {
                                currency: this.weWantCurrency().length > 3 ? this.utilsService.encodeCurrencyCode(this.weWantCurrency()) : this.weWantCurrency(),
                                issuer: this.weWantIssuer(),
                                value: '0',
                           };

               const weSpend: CurrencyAmount =
                    this.weSpendCurrency() === 'XRP'
                         ? { currency: 'XRP', value: this.weSpendAmount() }
                         : {
                                currency: this.weSpendCurrency().length > 3 ? this.utilsService.encodeCurrencyCode(this.weSpendCurrency()) : this.weSpendCurrency(),
                                issuer: this.weSpendIssuer(),
                                value: this.weSpendAmount(),
                           };

               // === ORDER BOOK + AMM LOGIC (your original code) ===
               const [orderBook, ammPoolData] = await Promise.all([
                    client.request({
                         command: 'book_offers',
                         taker_gets: weWant,
                         taker_pays: weSpend,
                         limit: 400,
                         ledger_index: 'current',
                         taker: wallet.classicAddress,
                    }),
                    client
                         .request({
                              command: 'amm_info',
                              asset: 'currency' in weSpend && weSpend.currency !== 'XRP' ? weSpend : { currency: 'XRP' },
                              asset2: 'currency' in weWant && weWant.currency !== 'XRP' ? weWant : { currency: 'XRP' },
                         })
                         .catch(() => null),
               ]);

               let allOffers = [...orderBook.result.offers];

               if (ammPoolData?.result?.amm) {
                    const amm = ammPoolData.result.amm;
                    const getVal = (x: any) => (typeof x === 'string' ? x : x.value);
                    const amount1 = getVal(amm.amount);
                    const amount2 = getVal(amm.amount2);

                    let xrpVal = typeof amm.amount === 'string' ? amount1 : amount2;
                    let tokenVal = typeof amm.amount === 'string' ? amount2 : amount1;

                    if (typeof amm.amount === 'string') xrpVal = xrpl.dropsToXrp(xrpVal);
                    if (typeof amm.amount2 === 'string') xrpVal = xrpl.dropsToXrp(xrpVal);

                    const ammOffer: any = {
                         TakerGets: typeof amm.amount === 'string' ? { currency: weWant.currency, issuer: (weWant as any).issuer, value: tokenVal } : amount1,
                         TakerPays: typeof amm.amount === 'string' ? amount2 : { currency: 'XRP', value: xrpVal },
                         isAMM: true,
                         rate: new BigNumber(tokenVal).dividedBy(xrpVal),
                    };
                    allOffers.push(ammOffer);
               }

               // Sort by best rate
               allOffers.sort((a, b) => {
                    const rateA = new BigNumber(this.normalizeAmount(a.TakerGets)).dividedBy(this.normalizeAmount(a.TakerPays));
                    const rateB = new BigNumber(this.normalizeAmount(b.TakerGets)).dividedBy(this.normalizeAmount(b.TakerPays));
                    return rateA.minus(rateB).toNumber();
               });

               let remaining = new BigNumber(this.weSpendAmount());
               let totalReceived = new BigNumber(0);

               for (const offer of allOffers) {
                    if (remaining.lte(0)) break;
                    const pays = new BigNumber(this.normalizeAmount(offer.TakerPays));
                    const gets = new BigNumber(this.normalizeAmount(offer.TakerGets));
                    if (pays.isZero()) continue;

                    const use = BigNumber.min(remaining, pays);
                    const received = use.multipliedBy(gets).dividedBy(pays);
                    totalReceived = totalReceived.plus(received);
                    remaining = remaining.minus(use);
               }

               this.weWantAmount.set(totalReceived.toFixed(8));
               // this.phnixExchangeXrp = totalReceived.toFixed(8);
               this.insufficientLiquidityWarning.set(remaining.gt(0));
          } catch (error: any) {
               console.error('Error in updateTokenBalanceAndExchange:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
               // this.phnixExchangeXrp = 'Error';
               this.weWantAmount.set('0');
          } finally {
               this.txUiService.spinner.set(false);
               let executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving updateTokenBalanceAndExchange in ${executionTime}ms`);
          }
     }

     onWeSpendAmountChange() {
          clearTimeout(this.amountTimeout());
          this.amountTimeout.set(
               setTimeout(() => {
                    this.updateTokenBalanceAndExchange();
               }, 400)
          );
     }

     onWeWantAmountChange() {
          clearTimeout(this.amountTimeout());
          this.amountTimeout.set(
               setTimeout(() => {
                    this.updateTokenBalanceAndExchangeReverse();
               }, 400)
          );
     }

     toggleFlag(key: 'tfPassive' | 'tfImmediateOrCancel' | 'tfFillOrKill') {
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          if (this.flags.tfPassive) sum |= this.flagValues.tfPassive;
          if (this.flags.tfImmediateOrCancel) sum |= this.flagValues.tfImmediateOrCancel;
          if (this.flags.tfFillOrKill) sum |= this.flagValues.tfFillOrKill;

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     private getFlagsValue(flags: AccountFlags): number {
          let v_flags = 0;
          if (flags.tfPassive) {
               v_flags |= OfferCreateFlags.tfPassive;
          }
          if (flags.tfImmediateOrCancel) {
               v_flags |= OfferCreateFlags.tfImmediateOrCancel;
          }
          if (flags.tfFillOrKill) {
               v_flags |= OfferCreateFlags.tfFillOrKill;
          }
          return v_flags;
     }

     updateDeleteTicketSequence(): void {
          if (this.multiSelectMode()) {
               // Join all selected tickets into a comma-separated string
               this.offerSequenceField.set(this.selectedTickets.join(','));
          } else {
               // Just one ticket selected
               this.offerSequenceField.set(this.selectedSingleTicket() || '');
          }
     }

     clearCancelOfferSequence() {
          if (!this.multiSelectMode()) {
               this.offerSequenceField.set('');
               this.selectedSingleTicket.set('');
          }
     }

     private async setTxOptionalFields(client: xrpl.Client, offerTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'createOffer' || txType === 'cancelOffer') {
               if (this.txUiService.isTicket()) {
                    const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
                    if (ticket) {
                         const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                         if (!exists) throw new Error(`Ticket ${ticket} not found`);
                         this.utilsService.setTicketSequence(offerTx, ticket, true);
                    }
               }

               if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
                    this.utilsService.setMemoField(offerTx, this.txUiService.memoField());
               }
          }
     }

     clearFields() {
          this.weSpendAmount.set('');
          this.weWantAmount.set('');

          this.isMarketOrder.set(false);
          this.isPassive.set(false);
          this.isFillOrKill.set(false);
          // this.cdr.detectChanges();
     }

     onOrderTypeChange(selectedType: string) {
          // Reset all to false first
          this.isPassive.set(false);
          this.isMarketOrder.set(false);
          this.isFillOrKill.set(false);

          // Set the selected one to true
          switch (selectedType) {
               case 'passive':
                    this.isPassive.set(true);
                    break;
               case 'marketOrder':
                    this.isMarketOrder.set(true);
                    break;
               case 'fillOrKill':
                    this.isFillOrKill.set(true);
                    break;
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest) this.addNewDestinationFromUser(destination || '');
          await this.offerCurrency.refreshBothBalances(this.currentWallet());
          await this.getExistingOffers(accountObjects, wallet.classicAddress);
          await this.getOffers(true, false);
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

     setSlippage(slippage: number) {
          this.slippage.set(slippage);
          this.updateTokenBalanceAndExchange(); // Recalculate exchange with new slippage
          // this.cdr.detectChanges();
     }

     copyOfferHash(offerHash: string) {
          navigator.clipboard.writeText(offerHash).then(() => {
               this.txUiService.showToastMessage('Offer Hash copied!');
          });
     }

     private updateInfoMessage() {
          const walletName = this.currentWallet().name || 'selected';

          const offerCount = this.existingOffers.length;

          let message: string;

          // if (nftCount === 0 && sellOfferCount === 0 && buyOfferCount === 0) {
          if (offerCount === 0) {
               message = `<code>${walletName}</code> wallet has no offers on the DEX.`;
          } else {
               const parts: string[] = [];

               if (offerCount > 0) {
                    const offerWord = offerCount === 1 ? 'Offer' : 'Offers';
                    parts.push(`${offerCount} ${offerWord}`);
               }

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
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View Offers on XRPL Win</a>`;
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

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }
}
