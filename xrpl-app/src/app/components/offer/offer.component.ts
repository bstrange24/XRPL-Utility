import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, ViewEncapsulation, NgZone } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TrustSet, OfferCreate, TransactionMetadataBase, OfferCreateFlags, BookOffer, IssuedCurrencyAmount, AMMInfoRequest } from 'xrpl';
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
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { OfferCurrencyService } from '../../services/offer-currency/offer-currency.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import BigNumber from 'bignumber.js';

declare var Prism: any;

interface ValidationInputs {
     selectedAccount?: string;
     senderAddress?: string;
     seed?: string;
     accountInfo?: any;
     weWantAmountField?: string;
     weSpendAmountField?: string;
     weWantCurrencyField?: string;
     weSpendCurrencyField?: string;
     weWantIssuerField?: string;
     weSpendIssuerField?: string;
     offerSequenceField?: string;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeySeed?: string;
     useMultiSign?: boolean;
     multiSignSeeds?: string;
     multiSignAddresses?: string;
     isTicket?: boolean;
     selectedSingleTicket?: string;
     selectedTicket?: string;
     signerQuorum?: number;
     signers?: { account: string; weight: number }[];
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
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './offer.component.html',
     styleUrl: './offer.component.css',
     encapsulation: ViewEncapsulation.None,
})
export class CreateOfferComponent implements OnInit, AfterViewInit {
     dataSource = new MatTableDataSource<any>();
     displayedColumns: string[] = ['transactionType', 'createdDate', 'creationAge', 'action', 'amountXrp', 'amountToken', 'currency', 'issuer', 'timestamp', 'transactionHash'];
     @ViewChild(MatPaginator) paginator!: MatPaginator;
     @ViewChild(MatSort) sort!: MatSort;

     weWantCurrencyField: string = 'BOB';
     weSpendCurrencyField: string = 'XRP';
     weWantIssuerField: string = '';
     weSpendIssuerField: string = '';
     public weWantIssuers$!: Observable<IssuerItem[]>;
     public weSpendIssuers$!: Observable<IssuerItem[]>;
     public weWantBalance$!: Observable<string>;
     public weSpendBalance$!: Observable<string>;
     public availableCurrencies: string[] = [];
     private amountTimeout: any;

     offerSequenceField: string = '';
     weWantAmountField: string = '';
     weSpendAmountField: string = '';
     isMarketOrder: boolean = false;
     isFillOrKill: boolean = false;
     isPassive: boolean = true;
     ticketCountField: string = '';
     ticketSequence: string = '';
     isTicket: boolean = false;
     isTicketEnabled: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     destinationTagField: string = '';
     xrpBalance1Field: string = '';
     ownerCount: string = '';
     totalXrpReserves: string = '';
     executionTime: string = '';
     amountField: string = '';
     currentTimeField: string = '';
     memoField: string = '';
     isMemoEnabled: boolean = false;
     isMultiSignTransaction: boolean = false;
     multiSignAddress: string = '';
     useMultiSign: boolean = false;
     multiSignSeeds: string = '';
     isRegularKeyAddress: boolean = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     signerQuorum: number = 0;
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     selectedIssuer: string = '';
     tokenBalance: string = '';
     spinnerMessage: string = '';
     masterKeyDisabled: boolean = false;
     phnixBalance: string = '0'; // Hardcoded for now, will be fetched dynamically
     phnixExchangeXrp: string = '0'; // To store the calculated XRP amount
     xrpPrice: string = '0'; // New property to store XRP price in RLUSD
     averageExchangeRate: string = '';
     maxSellablePhnix: string = '';
     phnixCurrencyCode: string = '';
     insufficientLiquidityWarning: boolean = false;
     showManageTokens = false;
     slippage: number = 0.2357; // Default to 23.57%
     tokens$: Observable<{ transactionType: string; action: string; amountXrp: string; amountToken: string; currency: string; issuer: string; transactionHash: string; timestamp: Date; createdDate: Date; creationAge: string }[]>;
     private memeTokensSubject = new BehaviorSubject<{ transactionType: string; action: string; amountXrp: string; amountToken: string; currency: string; issuer: string; transactionHash: string; timestamp: Date; createdDate: Date; creationAge: string }[]>([]);
     memeTokens$ = this.memeTokensSubject.asObservable(); // Use Observable for UI binding
     private readonly maxTokens = 20; // Limit to 20 tokens
     // Add a map of known issuers for tokens
     knownIssuers: { [key: string]: string[] } = { XRP: [] };
     issuerToRemove: string = '';
     currencies: string[] = [];
     newCurrency: string = '';
     newIssuer: string = '';
     tokenToRemove: string = '';
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     private readonly priceRefreshInterval: any; // For polling
     selectedWalletIndex: number = 0;

     private destroy$ = new Subject<void>();
     private readonly injector = inject(Injector);
     public destinationSearch$ = new Subject<string>();
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;

     // Form fields
     activeTab: string = 'getOffers';
     destinationField: string = '';
     sourceTagField = '';
     invoiceIdField = '';

     // Wallet state (now driven by WalletPanelComponent via service)
     currentWallet: Wallet = {} as Wallet;
     wallets: Wallet[] = [];
     hasWallets: boolean = true;
     environment = '';
     url = '';
     showDropdown: boolean = false;
     dropdownOpen: boolean = false;

     // Dropdown
     private overlayRef: OverlayRef | null = null;
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;
     destinations: DropdownItem[] = [];
     customDestinations: { name?: string; address: string }[] = [];

     // Code preview
     private lastPaymentTx = '';
     private lastTxResult = '';

     // NFT Offer Specific
     isUpdateMetaData: boolean = false;
     isUpdateNFTMetaData: boolean = false;
     isBatchModeEnabled: boolean = false;
     isNftFlagModeEnabled: boolean = false;
     isSubmitSignedTransactionEnabled: boolean = false;
     isDestinationEnabled: boolean = false;
     signedTransactionField: string = '';
     isAuthorizedNFTokenMinter: boolean = false;
     isNFTokenMinterEnabled: boolean = false;
     nfTokenMinterAddress: string = '';
     tickSize: string = '';
     selectedNft: string | null = null; // stores NFTokenID
     selectedNftOfferIndex: string | null = null; // stores NFTokenID
     isMessageKey: boolean = false;
     destinationFields: string = '';
     newDestination: string = '';
     currencyBalanceField: string = '0';
     gatewayBalance: string = '0';
     currencyFieldDropDownValue: string = 'XRP';
     private knownTrustLinesIssuers: { [key: string]: string[] } = { XRP: [] };
     issuerFields: string = '';
     domain: string = '';
     memo: string = '';
     expirationDateTimeUnit: string = 'seconds';
     burnableNft: { checked: any } | undefined;
     onlyXrpNft: { checked: any } | undefined;
     transferableNft: { checked: any } | undefined;
     mutableNft: { checked: any } | undefined;
     batchMode: 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent' = 'allOrNothing';
     minterAddressField: string = '';
     issuerAddressField: string = '';
     expirationField: string = '';
     expirationTimeUnit: string = 'seconds';
     uriField: string = '';
     initialURIField: string = '';
     nftIdField: string = '';
     nftIndexField: string = '';
     nftCountField: string = '';
     allKnownIssuers: string[] = [];
     storedIssuers: IssuerItem[] = [];
     currencyIssuers: { name?: string; address: string }[] = [];
     issuers: { name?: string; address: string }[] = [];
     totalFlagsValue = 0;
     totalFlagsHex = '0x0';
     existingOffers: any = [];
     existingSellOffers: any = [];
     existingBuyOffers: any = [];
     existingNftsCollapsed: boolean = true;
     existingSellOffersCollapsed: boolean = true;
     outstandingIOUCollapsed: boolean = true;
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     filterQuery: string = '';
     nftOwnerAddress: string = '';
     selectedMpt: any = null;
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
               key: 'tfImmediateOrCancel',
               title: 'Immediate Or Cancel',
               desc: 'The offer never becomes a ledger object: it only tries to match existing offers in the ledger. If the offer cannot match any offers immediately, it executes "successfully" without trading any currency.',
          },
          {
               key: 'tfFillOrKill',
               title: 'Fill Or Kill',
               desc: 'Only try to match existing offers in the ledger, and only do so if the entire TakerPays quantity can be obtained.',
          },
     ] as const;

     constructor(
          private xrplService: XrplService,
          private utilsService: UtilsService,
          private ngZone: NgZone,
          private storageService: StorageService,
          private xrplTransactions: XrplTransactionService,
          private walletGenerator: WalletGeneratorService,
          private walletManagerService: WalletManagerService,
          public ui: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private validationService: ValidationService,
          private overlay: Overlay,
          private viewContainerRef: ViewContainerRef,
          private destinationDropdownService: DestinationDropdownService,
          private cdr: ChangeDetectorRef,
          private offerCurrency: OfferCurrencyService
     ) {
          // Initialize tokens observable
          this.tokens$ = this.xrplService.tokens$;
          this.weWantIssuers$ = this.offerCurrency.weWant.issuers$;
          this.weSpendIssuers$ = this.offerCurrency.weSpend.issuers$;
          this.weWantBalance$ = this.offerCurrency.weWant.balance$;
          this.weSpendBalance$ = this.offerCurrency.weSpend.balance$;
          this.availableCurrencies = this.offerCurrency.getAvailableCurrencies(true);
     }

     ngOnInit() {
          this.loadKnownIssuers();
          this.refreshStoredIssuers();

          this.environment = this.xrplService.getNet().environment;
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url = AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET;
          this.weSpendCurrencyField = 'XRP';

          // === 1. Listen to wallet list changes (wallets$.valueChanges) ===
          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               this.hasWallets = wallets.length > 0;

               // Rebuild destination dropdown whenever wallets change
               this.updateDestinations();

               // Only set currentWallet on first load if nothing is selected yet
               if (this.hasWallets && !this.currentWallet?.address) {
                    const selectedIndex = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const selectedWallet = wallets[selectedIndex];
                    if (selectedWallet) {
                         this.currentWallet = { ...selectedWallet };
                         // this.getOffers();
                    }
               }
          });

          // === 2. Listen to selected wallet index changes (ONLY update if address actually changes) ===
          this.walletManagerService.selectedIndex$
               .pipe(
                    map(index => this.wallets[index]?.address),
                    distinctUntilChanged(), // ← Prevents unnecessary emissions
                    filter(address => !!address), // ← Ignore invalid/undefined
                    takeUntil(this.destroy$)
               )
               .subscribe(selectedAddress => {
                    const wallet = this.wallets.find(w => w.address === selectedAddress);
                    // if (wallet && this.currentWallet.address !== wallet.address) {
                    if (wallet) {
                         this.currentWallet = { ...wallet };
                         this.offerCurrency.setWalletAddress(wallet.address); // ← important!

                         // optional: pre-fill defaults
                         const currencies = this.offerCurrency.getAvailableCurrencies(true);
                         if (currencies.length) {
                              this.offerCurrency.selectWeWantCurrency(currencies[0], this.currentWallet);
                              this.offerCurrency.selectWeSpendCurrency('XRP', this.currentWallet);
                         }

                         this.getOffers();
                    }
               });

          this.offerCurrency.weWant.issuer$.subscribe(issuer => {
               this.weWantIssuerField = issuer;
          });

          this.offerCurrency.weSpend.issuer$.subscribe(issuer => {
               this.weSpendIssuerField = issuer;
          });

          combineLatest([
               this.offerCurrency.weWant.currency$,
               this.offerCurrency.weWant.issuer$,
               this.offerCurrency.weSpend.currency$,
               this.offerCurrency.weSpend.issuer$,
               new BehaviorSubject(this.weSpendAmountField), // manual amount
          ])
               .pipe(
                    debounceTime(300),
                    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
                    takeUntil(this.destroy$)
               )
               .subscribe(async ([wantCurr, wantIss, spendCurr, spendIss]) => {
                    this.weWantCurrencyField = wantCurr;
                    this.weWantIssuerField = wantIss;
                    this.weSpendCurrencyField = spendCurr;
                    this.weSpendIssuerField = spendIss;

                    if (this.weSpendAmountField && parseFloat(this.weSpendAmountField) > 0) {
                         await this.updateTokenBalanceAndExchange();
                    }
               });

          // === 3. Load custom destinations from storage ===
          const stored = this.storageService.get('customDestinations');
          this.customDestinations = stored ? JSON.parse(stored) : [];
          this.updateDestinations();

          // === 4. Dropdown search integration (unchanged) ===
          this.destinationSearch$.pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(query => this.destinationDropdownService.filter(query));

          this.destinationDropdownService.setItems(this.destinations);

          this.destinationDropdownService.filtered$.pipe(takeUntil(this.destroy$)).subscribe(list => {
               this.filteredDestinations = list;
               this.highlightedIndex = list.length > 0 ? 0 : -1;
               this.cdr.detectChanges();
          });

          this.destinationDropdownService.isOpen$.pipe(takeUntil(this.destroy$)).subscribe(open => {
               open ? this.openDropdownInternal() : this.closeDropdownInternal();
          });

          this.memeTokens$.subscribe(tokens => {
               this.dataSource.data = tokens;
          });
     }

     ngAfterViewInit() {
          this.scheduleHighlight();
     }

     ngOnDestroy(): void {
          this.destroy$.next();
          this.destroy$.complete();
          if (this.amountTimeout) clearTimeout(this.amountTimeout);
          // Clean up interval to prevent memory leaks
          if (this.priceRefreshInterval) {
               clearInterval(this.priceRefreshInterval);
          }
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: Wallet): string {
          return wallet.address;
     }

     trackByOfferIndex(index: number, offer: any): string {
          return offer.OfferIndex;
     }

     toggleExistingNfts() {
          this.existingNftsCollapsed = !this.existingNftsCollapsed;
     }

     toggleExistingSellOffers() {
          this.existingSellOffersCollapsed = !this.existingSellOffersCollapsed;
     }

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign, this.signers, (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.ui.setError(`${error.message}`);
          }
     }

     onWalletSelected(wallet: Wallet) {
          this.currentWallet = { ...wallet };

          // Prevent setting self as the destination after switching wallet
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address || this.destinationField;
          if (currentDest === wallet.address) {
               this.destinationField = '';
          }

          // Re-load currency + issuer balance for new wallet
          // if (this.currencyFieldDropDownValue) {
          //      this.onCurrencyChange(this.currencyFieldDropDownValue);
          // }
          // ← THIS IS CRITICAL
          this.offerCurrency.setWalletAddress(wallet.address);

          // Optional: Set defaults
          const currencies = this.offerCurrency.getAvailableCurrencies(true);
          if (currencies.length > 0) {
               this.offerCurrency.selectWeWantCurrency(currencies[0], this.currentWallet);
               this.offerCurrency.selectWeSpendCurrency('XRP', this.currentWallet);
          }

          this.getOffers();
     }

     async setTab(tab: string) {
          const previousTab = this.activeTab;
          this.activeTab = tab;

          // Only clear messages when actually changing tabs
          if (previousTab !== tab) {
               this.ui.clearMessages();
               this.ui.clearWarning();
          }

          if (Object.keys(this.knownTrustLinesIssuers).length > 0 && this.issuerFields === '') {
               this.currencyFieldDropDownValue = Object.keys(this.knownTrustLinesIssuers)[0];
          }
          this.updateInfoMessage();

          this.clearFields(true);
          this.ui.clearMessages();
          this.ui.clearWarning();
     }

     toggleOutstandingIOU() {
          this.outstandingIOUCollapsed = !this.outstandingIOUCollapsed;
     }

     async getOffers() {
          console.log('Entering getOffers');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, offersResponse, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountOffers(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logObjects('offersResponse', offersResponse);

               const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               // const data = {
               //      sections: [{}],
               // };

               // const offers = offersResponse.result.offers || [];

               // if (offers.length <= 0) {
               //      data.sections.push({
               //           title: 'Offers',
               //           openByDefault: true,
               //           content: [{ key: 'Status', value: `No offers found for <code>${wallet.classicAddress}</code>` }],
               //      });
               // } else {
               //      data.sections.push({
               //           title: `Offers (${offers.length})`,
               //           openByDefault: true,
               //           subItems: offers.map((offer, index) => {
               //                // Format taker_gets
               //                const takerGets = typeof offer.taker_gets === 'string' ? `${xrpl.dropsToXrp(offer.taker_gets)} XRP` : `${offer.taker_gets.value} ${this.utilsService.decodeIfNeeded(offer.taker_gets.currency)}${offer.taker_gets.issuer ? ` (Issuer: ${offer.taker_gets.issuer})` : ''}`;
               //                // Format taker_pays
               //                const takerPays = typeof offer.taker_pays === 'string' ? `${xrpl.dropsToXrp(offer.taker_pays)} XRP` : `${offer.taker_pays.value} ${this.utilsService.decodeIfNeeded(offer.taker_pays.currency)}${offer.taker_pays.issuer ? ` (Issuer: ${offer.taker_pays.issuer})` : ''}`;
               //                // Build content array
               //                const content: { key: string; value: string }[] = [
               //                     { key: 'Sequence', value: String(offer.seq) },
               //                     { key: 'Taker Gets', value: takerGets },
               //                     { key: 'Taker Pays', value: takerPays },
               //                     { key: 'Rate', value: this.calculateRate(offer.taker_gets, offer.taker_pays) },
               //                ];

               //                if (offer.expiration) {
               //                     content.push({ key: 'Expiration', value: new Date(offer.expiration * 1000).toISOString() });
               //                }
               //                if (offer.flags != null) {
               //                     content.push({ key: 'Flags', value: String(offer.flags) });
               //                }

               //                return {
               //                     key: `Offer ${index + 1} (Sequence: ${offer.seq})`,
               //                     openByDefault: false,
               //                     content,
               //                };
               //           }),
               //      });
               // }

               // Render UI
               // this.ui.setSuccess(this.result);

               // const tokenBalance = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');
               // const parsedBalances = this.parseAllGatewayBalances(tokenBalance, wallet);
               // this.currencyBalanceField = parsedBalances?.[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';
               // this.setCachedAccountData(this.currentWallet.address, { accountObjects, tokenBalance });
               // this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue, this.currentWallet.address);
               this.getExistingOffers(accountObjects, wallet.classicAddress);

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.updateInfoMessage();
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getOffers:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getOffers in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async getOrderBook() {
          console.log('Entering getOrderBook');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               weWantCurrencyField: this.weWantCurrencyField,
               weSpendCurrencyField: this.weSpendCurrencyField,
               weWantIssuerField: this.weWantCurrencyField !== 'XRP' ? this.weWantIssuerField : undefined,
               weSpendIssuerField: this.weSpendCurrencyField !== 'XRP' ? this.weSpendIssuerField : undefined,
               isRegularKeyAddress: this.isRegularKeyAddress,
               regularKeyAddress: this.isRegularKeyAddress ? this.regularKeyAddress : undefined,
               regularKeySeed: this.isRegularKeyAddress ? this.regularKeySeed : undefined,
               useMultiSign: this.useMultiSign,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'getOrderBook');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               // Prepare currency objects
               const we_want: CurrencyAmount = this.weWantCurrencyField === 'XRP' ? { currency: 'XRP', value: this.weWantAmountField } : { currency: this.utilsService.encodeIfNeeded(this.weWantCurrencyField), issuer: this.weWantIssuerField, value: this.weWantAmountField };
               const we_spend: CurrencyAmount = this.weSpendCurrencyField === 'XRP' ? { currency: 'XRP', value: this.weSpendAmountField } : { currency: this.utilsService.encodeIfNeeded(this.weSpendCurrencyField), issuer: this.weSpendIssuerField, value: this.weSpendAmountField };

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

               // const data = {
               //      sections: [
               //           {
               //                title: 'Market Pair',
               //                content: [
               //                     { key: 'Trading Pair', value: `${displayWeSpendCurrency}/${displayWeWantCurrency}` },
               //                     { key: 'Offer Type', value: offerType === 'sell' ? 'Sell Order' : 'Buy Order' },
               //                ],
               //           },
               //           {
               //                title: `Order Book (${combinedOffers.length})${ammData?.result?.amm ? ' + AMM' : ''}`,
               //                openByDefault: true,
               //                subItems: combinedOffers.map((offer, index) => ({
               //                     key: `${offer.isAMM ? 'AMM Pool' : `Order ${index + 1}`}`,
               //                     openByDefault: index === 0,
               //                     content: [{ key: 'Type', value: offer.isAMM ? 'AMM Liquidity' : 'Limit Order' }, { key: 'Taker Gets', value: this.formatCurrencyAmount(offer.TakerGets) }, { key: 'Taker Pays', value: this.formatCurrencyAmount(offer.TakerPays) }, { key: 'Rate', value: this.calculateRate(offer.TakerGets, offer.TakerPays) }, ...(offer.Sequence ? [{ key: 'Sequence', value: String(offer.Sequence) }] : []), { key: 'Account', value: `<code>${offer.Account || 'AMM Pool'}</code>` }],
               //                })),
               //           },
               //      ],
               // };

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

                    // Add AMM spot price if available
                    // if (ammData?.result?.amm) {
                    //      const amm = ammData.result.amm;
                    //      const spotPrice = amm.trading_fee / 1000000;
                    //      statsContent.push({
                    //           key: 'AMM Spot Price',
                    //           value: `${spotPrice.toFixed(8)} ${pair}`,
                    //      });

                    //      const tradingFeeBps = amm.trading_fee;
                    //      data.sections.push({
                    //           title: 'AMM Pool',
                    //           content: [
                    //                { key: 'Trading Fee', value: `${(tradingFeeBps / 100).toFixed(2)}%` },
                    //                { key: 'Fee in XRP (per 1 XRP swap)', value: `${((1 * tradingFeeBps) / 10000).toFixed(6)} XRP` },
                    //           ],
                    //      });
                    // }

                    // data.sections.push({
                    //      title: 'Statistics',
                    //      content: statsContent,
                    // });
               }

               // Render UI
               // this.ui.setSuccess(this.result);

               // DEFER: Non-critical UI updates — let main render complete first
               this.currentWallet.balance = await this.updateXrpBalance(client, accountInfo, wallet);
               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.clearFields(false);
               this.updateTickets(accountObjects);
          } catch (error: any) {
               console.error('Error in getOrderBook:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getOrderBook in ${this.executionTime}ms`);
          }
     }

     async createOffer() {
          console.log('Entering createOffer');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               weWantAmountField: this.weWantAmountField,
               weSpendAmountField: this.weSpendAmountField,
               weWantCurrencyField: this.weWantCurrencyField,
               weSpendCurrencyField: this.weSpendCurrencyField,
               weWantIssuerField: this.weWantCurrencyField !== 'XRP' ? this.weWantIssuerField : undefined,
               weSpendIssuerField: this.weSpendCurrencyField !== 'XRP' ? this.weSpendIssuerField : undefined,
               isRegularKeyAddress: this.isRegularKeyAddress,
               regularKeyAddress: this.isRegularKeyAddress && !this.useMultiSign ? this.regularKeyAddress : undefined,
               regularKeySeed: this.isRegularKeyAddress && !this.useMultiSign ? this.regularKeySeed : undefined,
               useMultiSign: this.useMultiSign,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, initialXrpBalance, trustLines, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), client.getXrpBalance(wallet.classicAddress), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logObjects(`trustLines`, trustLines.result);
               this.utilsService.logObjects(`serverInfo`, serverInfo);
               this.utilsService.logObjects(`fee`, fee);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'createOffer');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               interface SpendObject {
                    amount?: string; // For XRP
                    currency?: string; // For tokens
                    value?: string; // For tokens
                    issuer?: string; // For tokens
               }

               interface CurrencyObjectXRP {
                    currency: string;
                    value: string;
               }

               interface CurrencyObjectToken {
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

               const data: { sections: Section[] } = {
                    sections: [],
               };

               // Trust line setup
               let issuerAddr, issuerCur;
               if (this.weWantIssuerField === AppConstants.XRP_CURRENCY || this.weWantIssuerField === '') {
                    issuerAddr = this.weSpendIssuerField;
                    issuerCur = this.weSpendCurrencyField;
               } else {
                    issuerAddr = this.weWantIssuerField;
                    issuerCur = this.weWantCurrencyField;
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

               if (doesTrustLinesExists.length <= 0) {
                    const decodedCurrency = issuerCur.length > 3 ? this.utilsService.encodeCurrencyCode(issuerCur) : issuerCur;
                    const currentLedger = await this.xrplService.getLastLedgerIndex(client);
                    const trustSetTx: TrustSet = {
                         TransactionType: 'TrustSet',
                         Account: wallet.classicAddress,
                         LimitAmount: {
                              currency: decodedCurrency,
                              issuer: issuerAddr,
                              value: '100000000',
                         },
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, trustSetTx, fee)) {
                         return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                    }

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Trustline (no changes will be made)...' : 'Submitting Trustline to Ledger...', 200);

                    this.ui.setPaymentTx(trustSetTx);
                    this.updatePaymentTx();

                    let response: any;

                    if (this.ui.isSimulateEnabled) {
                         response = await this.xrplTransactions.simulateTransaction(client, trustSetTx);
                    } else {
                         const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, trustSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         if (!signedTx) {
                              return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                         }

                         response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    }

                    // this.utilsService.logObjects('response', response);
                    // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    this.ui.setTxResult(response.result);
                    this.updateTxResult();

                    const isSuccess = this.utilsService.isTxSuccessful(response);
                    if (!isSuccess) {
                         const resultMsg = this.utilsService.getTransactionResultMessage(response);
                         const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                         console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                         (response.result as any).errorMessage = userMessage;
                    }
               }

               // if (!this.ui.isSimulateEnabled) {
               //      data.sections.push({
               //           title: 'Trust Line Setup',
               //           openByDefault: true,
               //           content: [
               //                { key: 'Status', value: 'Trust line created' },
               //                { key: 'Currency', value: issuerCur },
               //                { key: 'Issuer', value: `<code>${issuerAddr}</code>` },
               //                { key: 'Limit', value: this.amountField },
               //           ],
               //      });
               // } else {
               //      data.sections.push({
               //           title: 'Trust Line Setup',
               //           openByDefault: true,
               //           content: [{ key: 'Status', value: 'Trust lines already exist' }],
               //      });
               // }

               // // Fetch reserve information
               const xrpReserve = await this.xrplService.getXrpReserveRequirements(accountInfo, serverInfo);

               // data.sections.push({
               //      title: 'Account Reserve Information',
               //      openByDefault: true,
               //      content: [
               //           { key: 'Base Reserve', value: `${xrpReserve.baseReserve} XRP` },
               //           { key: 'Owner Reserve (per object)', value: `${xrpReserve.ownerReserve} XRP` },
               //           { key: 'Owner Count', value: String(xrpReserve.ownerCount) },
               //           { key: 'Current Reserve', value: `${xrpReserve.currentReserve} XRP` },
               //      ],
               // });

               // Initial balances
               console.log(`Initial XRP Balance ${initialXrpBalance} (drops): ${xrpl.xrpToDrops(initialXrpBalance)}`);

               data.sections.push({
                    title: 'Initial Balances',
                    openByDefault: true,
                    content: [{ key: 'XRP', value: `${initialXrpBalance} (${xrpl.xrpToDrops(initialXrpBalance)} drops)` }],
               });

               // Build currency objects
               let we_want = this.weWantCurrencyField === AppConstants.XRP_CURRENCY ? { currency: AppConstants.XRP_CURRENCY, value: this.weWantAmountField } : { currency: this.weWantCurrencyField, issuer: this.weWantIssuerField, value: this.weWantAmountField };
               let we_spend = this.weSpendCurrencyField === AppConstants.XRP_CURRENCY ? { amount: this.weSpendAmountField } : { currency: this.weSpendCurrencyField, issuer: this.weSpendIssuerField, value: this.weSpendAmountField };

               if (this.weSpendCurrencyField === AppConstants.XRP_CURRENCY) {
                    if (!this.weSpendAmountField) {
                         throw new Error('weSpendAmountField is required for XRP');
                    }
                    we_spend = { amount: this.weSpendAmountField };
               } else {
                    if (!this.weSpendAmountField || !this.weSpendIssuerField) {
                         throw new Error('weSpendAmountField and weSpendIssuerField are required for token');
                    }
                    we_spend = {
                         currency: this.utilsService.encodeIfNeeded(this.weSpendCurrencyField),
                         value: this.weSpendAmountField,
                         issuer: this.weSpendIssuerField,
                    };
               }

               we_want.currency = this.utilsService.encodeIfNeeded(we_want.currency);

               const offerType = we_spend.currency ? 'sell' : 'buy';
               this.utilsService.logObjects(`offerType`, offerType);

               // Rate analysis
               console.log(`weSpendAmountField:  ${this.weSpendAmountField} weWantAmountField: ${this.weWantAmountField} `);
               const proposedQuality = new BigNumber(this.weSpendAmountField).dividedBy(this.weWantAmountField);
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
                         taker_pays: we_spend.currency ? we_spend : { currency: AppConstants.XRP_CURRENCY, value: this.weSpendAmountField },
                         ledger_index: 'current',
                    }),
                    client.request({
                         command: 'book_offers',
                         taker: wallet.address,
                         taker_gets: we_spend.currency ? we_spend : { currency: AppConstants.XRP_CURRENCY, value: this.weSpendAmountField },
                         taker_pays: we_want,
                         ledger_index: 'current',
                    }),
               ]);

               const MAX_SLIPPAGE = 0.05;
               const offers = orderBook.result.offers;
               let runningTotal = new BigNumber(0);
               const wantAmount = new BigNumber(this.weWantAmountField);
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
                    const offeredQuality = new BigNumber(this.weWantAmountField).dividedBy(this.weSpendAmountField);
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

               data.sections.push({
                    title: 'Market Analysis',
                    openByDefault: true,
                    content: (marketAnalysis.length ? marketAnalysis : [{ key: 'Status', value: 'No matching offers found in order book' }]) as MarketAnalysisItem[],
               });

               // Properly assign and type we_want1 and we_spend1 for OfferCreate
               let we_want1: string | { currency: string; issuer: string; value: string };
               let we_spend1: string | { currency: string; issuer: string; value: string };

               // we_want1
               if (this.weWantCurrencyField === AppConstants.XRP_CURRENCY) {
                    if (!this.weWantAmountField) {
                         throw new Error('weWantAmountField is required for XRP');
                    }
                    // XRP is represented as drops (string)
                    we_want1 = xrpl.xrpToDrops(this.weWantAmountField);
               } else {
                    if (!this.weWantAmountField || !this.weWantIssuerField) {
                         throw new Error('weWantAmountField and weWantIssuerField are required for token');
                    }
                    we_want1 = {
                         currency: this.utilsService.encodeIfNeeded(this.weWantCurrencyField),
                         issuer: this.weWantIssuerField,
                         value: this.weWantAmountField,
                    };
               }

               // we_spend1
               if (this.weSpendCurrencyField === AppConstants.XRP_CURRENCY) {
                    if (!this.weSpendAmountField) {
                         throw new Error('weSpendAmountField is required for XRP');
                    }
                    we_spend1 = xrpl.xrpToDrops(this.weSpendAmountField);
               } else {
                    if (!this.weSpendAmountField || !this.weSpendIssuerField) {
                         throw new Error('weSpendAmountField and weSpendIssuerField are required for token');
                    }
                    we_spend1 = {
                         currency: this.utilsService.encodeIfNeeded(this.weSpendCurrencyField),
                         issuer: this.weSpendIssuerField,
                         value: this.weSpendAmountField,
                    };
               }

               let flags = 0;

               if (this.isMarketOrder) {
                    // For a market order, you might want ImmediateOrCancel
                    flags |= OfferCreateFlags.tfImmediateOrCancel;
               } else if (this.isFillOrKill) {
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

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, offerCreateTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.updateSpinnerMessage(this.ui.isSimulateEnabled ? 'Simulating Create Offer (no changes will be made)...' : 'Submitting Create Offer to Ledger...');

               this.ui.setPaymentTx(offerCreateTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, offerCreateTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, offerCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

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
               //           { key: 'Name', value: this.currentWallet.balance },
               //           { key: 'Address', value: `<code>${wallet.address}</code>` },
               //           { key: 'Final XRP Balance', value: finalXrpBalance.toString() },
               //      ],
               // });

               // Render result
               // this.ui.setSuccess(this.result);

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Offer create successfully!';
               }
          } catch (error: any) {
               console.error('Error in createOffer:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving createOffer in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async cancelOffer() {
          console.log('Entering cancelOffer');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.balance,
               seed: this.currentWallet.seed,
               offerSequenceField: this.offerSequenceField,
               isRegularKeyAddress: this.isRegularKeyAddress,
               regularKeyAddress: this.isRegularKeyAddress ? this.regularKeyAddress : undefined,
               regularKeySeed: this.isRegularKeyAddress ? this.regularKeySeed : undefined,
               useMultiSign: this.useMultiSign,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          const offerSequenceArray = this.offerSequenceField
               .split(',')
               .map(seq => seq.trim())
               .filter(seq => seq !== '');

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'cancelOffer');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               let { useRegularKeyWalletSignTx, regularKeyWalletSignTx }: { useRegularKeyWalletSignTx: boolean; regularKeyWalletSignTx: any } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

               // // Define interfaces for rendering
               // interface SectionContent {
               //      key: string;
               //      value: string;
               // }

               // interface SectionSubItem {
               //      key: string;
               //      openByDefault: boolean;
               //      content: SectionContent[];
               // }

               // interface Section {
               //      title: string;
               //      openByDefault: boolean;
               //      content?: SectionContent[];
               //      subItems?: SectionSubItem[];
               // }

               // const data: { sections: Section[] } = {
               //      sections: [],
               // };

               // Collect all transaction results
               const transactions: { type: string; result: any }[] = [];
               let hasError = false;

               for (const element of offerSequenceArray) {
                    const offerSequence = parseInt(element);

                    let signedTx: { tx_blob: string; hash: string } | null = null;
                    let lastLedgerIndex = await this.xrplService.getLastLedgerIndex(client);

                    try {
                         const offerCancelTx = await client.autofill({
                              TransactionType: 'OfferCancel',
                              Account: wallet.classicAddress,
                              OfferSequence: offerSequence,
                              LastLedgerSequence: lastLedgerIndex + AppConstants.LAST_LEDGER_ADD_TIME,
                         });

                         await this.setTxOptionalFields(client, offerCancelTx, wallet, accountInfo, 'cancelOffer');

                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, offerCancelTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }

                         const preparedTx = await client.autofill(offerCancelTx);
                         console.log(`preparedTx:`, preparedTx);
                         signedTx = useRegularKeyWalletSignTx ? regularKeyWalletSignTx.sign(preparedTx) : wallet.sign(preparedTx);

                         if (!signedTx) {
                              return this.ui.setError('ERROR: Failed to sign transaction.');
                         }
                         console.log(`signed:`, signedTx);

                         this.ui.updateSpinnerMessage('Submitting transaction to the Ledger...');
                         const response = await client.submitAndWait(signedTx.tx_blob);
                         console.log(`Response:`, response);

                         transactions.push({
                              type: 'OfferCancel',
                              result: response,
                         });

                         if (response.result.meta && typeof response.result.meta !== 'string' && (response.result.meta as TransactionMetadataBase).TransactionResult !== AppConstants.TRANSACTION.TES_SUCCESS) {
                              hasError = true;
                         }
                    } catch (error: any) {
                         hasError = true;
                         transactions.push({
                              type: 'OfferCancel',
                              result: {
                                   error: `Error cancelling offer ${element}: ${error.message || 'Unknown error'}`,
                                   OfferSequence: element,
                              },
                         });
                    }
               }

               // // Add detailed transaction data to data.sections
               // const transactionDetails: SectionSubItem[] = transactions.map((tx, index) => {
               //      const result = tx.result || {};
               //      const isSuccess = !result.error && result.meta?.TransactionResult === AppConstants.TRANSACTION.TES_SUCCESS;
               //      const content: SectionContent[] = [
               //           { key: 'Transaction Type', value: 'OfferCancel' },
               //           { key: 'Offer Sequence', value: `<code>${result.result.tx_json.OfferSequence || 'N/A'}</code>` },
               //           { key: 'Sequence', value: `<code>${result.result.tx_json.Sequence || 'N/A'}</code>` },
               //           { key: 'Hash', value: result.result.hash ? `<code>${result.result.hash}</code>` : 'N/A' },
               //           { key: 'Result', value: result.error ? `<span class="error-result">${result.error}</span>` : result.meta?.TransactionResult || 'N/A' },
               //           { key: 'Ledger Index', value: result.result.ledger_index || 'N/A' },
               //           { key: 'Validated', value: result.result.validated !== undefined ? result.result.validated.toString() : 'N/A' },
               //           { key: 'Date', value: result.result.close_time_iso ? new Date(result.result.close_time_iso).toLocaleString() : result.result.close_time_iso || 'N/A' },
               //      ];

               //      // Add Account if available
               //      if (result.result.tx_json?.Account) {
               //           content.push({ key: 'Account', value: `<code>${result.result.tx_json.Account}</code>` });
               //      }

               //      // Add Meta Data if available
               //      if (result.result.meta) {
               //           content.push({ key: 'Transaction Index', value: result.result.meta.TransactionIndex || 'N/A' }, { key: 'Delivered Amount', value: result.result.meta.delivered_amount ? this.utilsService.formatAmount(result.result.meta.delivered_amount) : 'N/A' });
               //      }

               //      return {
               //           key: `OfferCancel ${index + 1} (Sequence: ${result.result.tx_json.OfferSequence || result.result.tx_json?.OfferSequence || 'Unknown'})`,
               //           openByDefault: !isSuccess, // Open by default if failed
               //           content,
               //      };
               // });

               // data.sections.push({
               //      title: `Offer Cancellation Details (${transactions.length})`,
               //      openByDefault: true,
               //      subItems: transactionDetails,
               // });

               // Add summary section
               // data.sections.push({
               //      title: 'Offer Cancellation Summary',
               //      openByDefault: true,
               //      content: [
               //           {
               //                key: 'Status',
               //                value: hasError ? 'Some offer cancellations failed' : 'All offers cancelled successfully',
               //           },
               //           {
               //                key: 'Total Offers Processed',
               //                value: String(transactions.length),
               //           },
               //           {
               //                key: 'Successful Cancellations',
               //                value: String(transactions.filter(tx => !tx.result.error && tx.result.result.meta?.TransactionResult === AppConstants.TRANSACTION.TES_SUCCESS).length),
               //           },
               //      ],
               // });

               // if (hasError) {
               // this.setErrorProperties();
               // } else {
               // this.ui.setSuccess(this.result);
               // }

               // this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Cancelled offer successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Cancel offer successfully!';
               }
          } catch (error: any) {
               console.error('Error in cancelOffer:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving cancelOffer in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     private getExistingOffers(offerObjects: xrpl.AccountObjectsResponse, classicAddress: string): any[] {
          this.existingOffers = (offerObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Offer' && obj.Account === classicAddress)
               .map((obj: any): any => {
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
                         takerPaysCurrency = this.utilsService.normalizeCurrencyCode(takerGets.currency);
                         takerGetsUI = `${takerGetsAmount} ${takerPaysCurrency} ${takerGetsIssuer}`;
                    }

                    if (typeof takerPays === 'string') {
                         takerPaysAmount = String(xrpl.dropsToXrp(takerGets));
                         takerPaysUI = takerGetsAmount.trim();
                    } else if (takerPays?.value) {
                         takerPaysAmount = takerPays.value;
                         takerPaysIssuer = takerPays.issuer;
                         takerPaysCurrency = this.utilsService.normalizeCurrencyCode(takerPays.currency);
                         takerPaysUI = `${takerPaysAmount} ${takerPaysCurrency} ${takerPaysIssuer}`;
                    }

                    return {
                         Account: obj.Account,
                         TakerGets: `${takerGetsAmount} ${takerGetsCurrency} ${takerGetsIssuer}`,
                         TakerPays: takerPaysUI,
                         BookDirectory: obj.BookDirectory,
                         TxHash: obj.index,
                         Sequence: obj.Sequence,
                    };
               });
          // .sort((a, b) => a.Destination.localeCompare(b.Destination));

          this.utilsService.logObjects('existingOffers', this.existingOffers);
          return this.existingOffers;
     }

     invertOrder() {
          const tempCurr = this.weWantCurrencyField;
          const tempIss = this.weWantIssuerField;
          const tempAmt = this.weWantAmountField;

          this.weWantCurrencyField = this.weSpendCurrencyField;
          this.weSpendCurrencyField = tempCurr;
          this.weWantIssuerField = this.weSpendIssuerField;
          this.weSpendIssuerField = tempIss;

          this.onWeWantCurrencyChange();
          //     this.offerCurrency.selectWeWantCurrency(this.weWantCurrencyField);
          this.onWeSpendCurrencyChange();
          //     this.offerCurrency.selectWeSpendCurrency(this.weSpendCurrencyField);

          this.weSpendAmountField = tempAmt || '';
          if (this.weSpendAmountField) this.updateTokenBalanceAndExchange();
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
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          if (!this.weWantAmountField || parseFloat(this.weWantAmountField) <= 0) {
               this.weSpendAmountField = '0';
               return;
          }

          this.ui.spinner = true;
          this.ui.showSpinnerWithDelay('Calculating required amount...', 500);

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.utilsService.getWalletFromAddress(this.currentWallet.address);

               const weWant: CurrencyAmount =
                    this.weWantCurrencyField === 'XRP'
                         ? { currency: 'XRP', value: this.weWantAmountField }
                         : {
                                currency: this.weWantCurrencyField.length > 3 ? this.utilsService.encodeCurrencyCode(this.weWantCurrencyField) : this.weWantCurrencyField,
                                issuer: this.weWantIssuerField,
                                value: this.weWantAmountField,
                           };

               const weSpend: CurrencyAmount =
                    this.weSpendCurrencyField === 'XRP'
                         ? { currency: 'XRP', value: '0' }
                         : {
                                currency: this.weSpendCurrencyField.length > 3 ? this.utilsService.encodeCurrencyCode(this.weSpendCurrencyField) : this.weSpendCurrencyField,
                                issuer: this.weSpendIssuerField,
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
                              asset: this.weSpendCurrencyField === 'XRP' ? { currency: 'XRP' } : { currency: weSpend.currency, issuer: (weSpend as any).issuer },
                              asset2: this.weWantCurrencyField === 'XRP' ? { currency: 'XRP' } : { currency: weWant.currency, issuer: (weSpend as any).issuer },
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
                    if (this.weWantCurrencyField === 'XRP') {
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

               let remainingReceive = new BigNumber(this.weWantAmountField);
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

               this.weSpendAmountField = totalPay.toFixed(8);
               this.phnixExchangeXrp = totalPay.toFixed(8);
               this.insufficientLiquidityWarning = remainingReceive.gt(0);
          } catch (error: any) {
               console.error('Error in updateTokenBalanceAndExchange:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
               this.phnixBalance = '0';
               this.phnixExchangeXrp = 'Error';
               this.weSpendAmountField = '0';
          } finally {
               this.ui.spinner = false;
               let executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving updateTokenBalanceAndExchange in ${executionTime}ms`);
          }
     }
     async updateTokenBalanceAndExchange() {
          console.log('Entering updateTokenBalanceAndExchange');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          if (!this.weSpendAmountField || parseFloat(this.weSpendAmountField) <= 0) {
               this.weWantAmountField = '0';
               return;
          }

          this.ui.spinner = true;
          this.ui.showSpinnerWithDelay('Calculating best rate...', 500);

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.utilsService.getWalletFromAddress(this.currentWallet.address);

               const weWant: CurrencyAmount =
                    this.weWantCurrencyField === 'XRP'
                         ? { currency: 'XRP', value: '0' }
                         : {
                                currency: this.weWantCurrencyField.length > 3 ? this.utilsService.encodeCurrencyCode(this.weWantCurrencyField) : this.weWantCurrencyField,
                                issuer: this.weWantIssuerField,
                                value: '0',
                           };

               const weSpend: CurrencyAmount =
                    this.weSpendCurrencyField === 'XRP'
                         ? { currency: 'XRP', value: this.weSpendAmountField }
                         : {
                                currency: this.weSpendCurrencyField.length > 3 ? this.utilsService.encodeCurrencyCode(this.weSpendCurrencyField) : this.weSpendCurrencyField,
                                issuer: this.weSpendIssuerField,
                                value: this.weSpendAmountField,
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

               let remaining = new BigNumber(this.weSpendAmountField);
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

               this.weWantAmountField = totalReceived.toFixed(8);
               this.phnixExchangeXrp = totalReceived.toFixed(8);
               this.insufficientLiquidityWarning = remaining.gt(0);
          } catch (error: any) {
               console.error('Error in updateTokenBalanceAndExchange:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
               this.phnixBalance = '0';
               this.phnixExchangeXrp = 'Error';
               this.weWantAmountField = '0';
          } finally {
               this.ui.spinner = false;
               let executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving updateTokenBalanceAndExchange in ${executionTime}ms`);
          }
     }

     onWeSpendAmountChange() {
          clearTimeout(this.amountTimeout);
          this.amountTimeout = setTimeout(() => {
               this.updateTokenBalanceAndExchange();
          }, 400);
     }

     onWeWantAmountChange() {
          clearTimeout(this.amountTimeout);
          this.amountTimeout = setTimeout(() => {
               this.updateTokenBalanceAndExchangeReverse();
          }, 400);
     }

     private async startTokenMonitoring() {
          try {
               // await this.xrplService.monitorNewTokens();
               // this.tokens$.subscribe(tokens => {
               //      const currentMemeTokens = this.memeTokensSubject.getValue();
               //      // console.log('Current Meme Tokens:', currentMemeTokens);
               //      const newMemeTokens = tokens
               //           .filter(token => this.isMemeCoin(token) && !currentMemeTokens.some(t => t.currency === token.currency && t.issuer === token.issuer))
               //           .map(token => {
               //                if (token.currency.length > 10) {
               //                     const curr = this.utilsService.decodeCurrencyCode(token.currency.toUpperCase());
               //                     // console.log(`Meme coin detected: ${curr} - Transaction Hash: ${token.transactionHash}`);
               //                     return { ...token, currency: curr }; // Decode currency code
               //                } else {
               //                     // console.log(`Meme coin detected: ${token.currency} - Transaction Hash: ${token.transactionHash}`);
               //                     return token;
               //                }
               //           });
               //      if (newMemeTokens.length > 0) {
               //           // Keep only the most recent maxTokens (sorted by timestamp, newest first)
               //           const updatedTokens = [...currentMemeTokens, ...newMemeTokens].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, this.maxTokens);
               //           this.memeTokensSubject.next(updatedTokens);
               //      }
               // });
          } catch (error) {
               console.error('Error starting token monitoring:', error);
               this.ui.setError('Failed to start token monitoring');
          }
     }

     async fetchXrpPrice() {
          // Method to fetch XRP price in RLUSD
          console.log('Entering fetchXrpPrice');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.balance,
               weWantCurrencyField: this.weWantCurrencyField,
               weSpendCurrencyField: this.weSpendCurrencyField,
               weWantIssuerField: this.weWantCurrencyField !== 'XRP' ? this.weWantIssuerField : undefined,
               weSpendIssuerField: this.weSpendCurrencyField !== 'XRP' ? this.weSpendIssuerField : undefined,
          };

          const errors = await this.validateInputs(inputs, 'fetchXrpPrice');
          if (errors.length > 0) {
               this.xrpPrice = 'Error';
               return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
          }

          try {
               const client = await this.xrplService.getClient();

               interface CurrencyObjectXRP {
                    currency: string;
                    value: string;
               }

               interface CurrencyObjectToken {
                    currency: string;
                    issuer: string;
                    value: string;
               }

               type CurrencyObject = CurrencyObjectXRP | CurrencyObjectToken;
               const buildCurrencyObject = (currency: string, issuer: string, value: string): CurrencyObject => (currency === AppConstants.XRP_CURRENCY ? { currency, value } : { currency, issuer, value });

               let we_want: CurrencyObjectXRP | undefined = undefined;
               let we_spend: CurrencyObjectXRP | undefined = undefined;
               if (this.weWantCurrencyField.length <= 3 && this.weSpendCurrencyField.length <= 3) {
                    we_want = buildCurrencyObject(this.weWantCurrencyField, this.weWantIssuerField, this.weWantAmountField) as CurrencyObjectXRP;
                    we_spend = buildCurrencyObject(this.weSpendCurrencyField, this.weSpendIssuerField, this.weSpendAmountField) as CurrencyObjectXRP;
               } else if (this.weWantCurrencyField.length > 3) {
                    console.warn('New stuff: ', this.utilsService.normalizeCurrencyCode(this.weWantCurrencyField, 20));
                    const encodedCurrencyCode = this.utilsService.encodeCurrencyCode(this.weWantCurrencyField);
                    we_want = buildCurrencyObject(encodedCurrencyCode, this.weWantIssuerField, this.weWantAmountField) as CurrencyObjectXRP;
                    we_spend = buildCurrencyObject(this.weSpendCurrencyField, this.weSpendIssuerField, this.weSpendAmountField) as CurrencyObjectXRP;
               } else if (this.weSpendCurrencyField.length > 3) {
                    const encodedCurrencyCode = this.utilsService.encodeCurrencyCode(this.weSpendCurrencyField);
                    we_spend = buildCurrencyObject(encodedCurrencyCode, this.weSpendIssuerField, this.weSpendAmountField) as CurrencyObjectXRP;
                    we_want = buildCurrencyObject(this.weWantCurrencyField, this.weWantIssuerField, this.weWantAmountField) as CurrencyObjectXRP;
               }

               // Ensure both are defined before request
               if (!we_want || !we_spend) {
                    throw new Error('Both taker_gets and taker_pays must be defined');
               }

               // Decode currencies for display
               const displayWeWantCurrency = we_want && we_want.currency && we_want.currency.length > 3 ? this.utilsService.decodeCurrencyCode(we_want.currency) : we_want?.currency ?? '';
               const displayWeSpendCurrency = we_spend && we_spend.currency && we_spend.currency.length > 3 ? this.utilsService.decodeCurrencyCode(we_spend.currency) : we_spend?.currency ?? '';
               console.log(`displayWeWantCurrency: ${displayWeWantCurrency} and displayWeSpendCurrency: ${displayWeSpendCurrency}`);

               console.log('we_want:', we_want);
               console.log('we_spend:', we_spend);

               // Build destination_amount for path_find (must include value for tokens)
               let destination_amount: string | { currency: string; issuer: string; value: string };
               if (we_want.currency === 'XRP') {
                    destination_amount = we_want.value;
               } else {
                    destination_amount = {
                         currency: we_want.currency,
                         issuer: (we_want as CurrencyObjectToken).issuer,
                         value: we_want.value,
                    };
               }

               const pathFind = await client.request({
                    command: 'ripple_path_find',
                    source_account: this.currentWallet.balance ? this.currentWallet.balance : 'rDefaultTaker',
                    destination_account: this.currentWallet.balance ? this.currentWallet.balance : 'rDefaultTaker',
                    source_amount: we_spend,
                    destination_amount,
               });

               // Extract the best delivered amount (CTZ per 1 XRP)
               // if (pathFind.result && 'alternatives' in pathFind.result && Array.isArray((pathFind.result as any).alternatives) && (pathFind.result as any).alternatives.length > 0) {
               //      const bestPath = (pathFind.result as any).alternatives[0];
               //      const deliveredAmount = typeof bestPath.destination_amount === 'string' ? parseFloat(bestPath.destination_amount) : parseFloat(bestPath.destination_amount.value);
               //      this.xrpPrice = deliveredAmount.toFixed(8); // CTZ per 1 XRP
               //      console.log(`1 XRP will buy: ${this.xrpPrice} CTZ`);
               // } else {
               //      this.xrpPrice = 'N/A';
               //      console.log('No paths found for XRP/CTZ');
               // }

               if (pathFind.result && 'alternatives' in pathFind.result && Array.isArray((pathFind.result as any).alternatives) && (pathFind.result as any).alternatives.length > 0) {
                    const bestPath = (pathFind.result as any).alternatives[0];

                    const amountObj = bestPath.source_amount;
                    const deliveredAmount = typeof amountObj === 'string' ? parseFloat(amountObj) : parseFloat(amountObj.value);

                    this.xrpPrice = deliveredAmount.toFixed(8);
                    console.log(`1 XRP will buy: ${this.xrpPrice} ${displayWeWantCurrency}`);
               } else {
                    this.xrpPrice = 'N/A';
                    console.log(`No paths found for ${displayWeSpendCurrency}/${displayWeWantCurrency}`);
               }

               // // Fetch order book for XRP/RLUSD (buy RLUSD with XRP)
               // const orderBook = await client.request({
               //      command: 'book_offers',
               //      taker: this.selectedAccount === 'account1' ? this.account1.address : 'rDefaultTaker',
               //      ledger_index: 'current',
               //      taker_gets: we_want,
               //      taker_pays: we_spend,
               // });

               // // Calculate price from order book
               // if (orderBook.result.offers.length > 0) {
               //      const stats = this.computeAverageExchangeRateBothWays(orderBook.result.offers, 1);
               //      this.xrpPrice = stats.forward.vwap.toFixed(8); // RLUSD per 1 XRP (XRP/RLUSD)
               //      console.log(`1 RLUSD will buy: ${this.xrpPrice} XRP`);
               // } else {
               //      this.xrpPrice = 'N/A';
               //      console.log('No offers found for XRP/RLUSD');
               // }

               this.cdr.detectChanges(); // Trigger UI update
          } catch (error: any) {
               console.error('Error fetching XRP price:', error);
               this.xrpPrice = 'Error';
               this.ui.setError(`ERROR: Failed to fetch XRP price - ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               let executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving fetchXrpPrice in ${executionTime}ms`);
          }
     }

     // Start polling for price updates
     startPriceRefresh() {
          // Fetch price immediately
          // this.fetchXrpPrice();
          // // Set interval to refresh every 10 seconds
          // this.priceRefreshInterval = setInterval(() => {
          //      this.fetchXrpPrice();
          // }, 10000);
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

          this.totalFlagsValue = sum;
          this.totalFlagsHex = '0x' + sum.toString(16).toUpperCase().padStart(8, '0');
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

     private async setTxOptionalFields(client: xrpl.Client, offerTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'createOffer' || txType === 'cancelOffer') {
               if (this.selectedSingleTicket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
                    if (!exists) throw new Error(`Ticket ${this.selectedSingleTicket} not found`);
                    this.utilsService.setTicketSequence(offerTx, this.selectedSingleTicket, true);
               } else {
                    if (this.multiSelectMode && this.selectedTickets.length > 0) {
                         console.log('Setting multiple tickets:', this.selectedTickets);
                         this.utilsService.setTicketSequence(offerTx, accountInfo.result.account_data.Sequence, false);
                    }
               }

               if (this.memoField) this.utilsService.setMemoField(offerTx, this.memoField);
          }
     }

     private async validateInputs(inputs: ValidationInputs, action: string): Promise<string[]> {
          const errors: string[] = [];

          // Common validators as functions
          const isRequired = (value: string | null | undefined, fieldName: string): string | null => {
               if (value == null) {
                    return `${fieldName} cannot be empty`;
               }
               if (!this.utilsService.validateInput(value)) {
                    return `${fieldName} cannot be empty`;
               }
               return null;
          };

          const isValidXrpAddress = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidAddress(value)) {
                    return `${fieldName} is invalid`;
               }
               return null;
          };

          const isValidSecret = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidSecret(value)) {
                    return `${fieldName} is invalid`;
               }
               return null;
          };

          const isNotSelfPayment = (sender: string | undefined, receiver: string | undefined): string | null => {
               if (sender && receiver && sender === receiver) {
                    return `Sender and receiver cannot be the same`;
               }
               return null;
          };

          const isValidNumber = (value: string | undefined, fieldName: string, minValue?: number): string | null => {
               if (value === undefined) return null; // Not required, so skip
               const num = parseFloat(value);
               if (isNaN(num) || !isFinite(num)) {
                    return `${fieldName} must be a valid number`;
               }
               if (minValue !== undefined && num <= minValue) {
                    return `${fieldName} must be greater than ${minValue}`;
               }
               return null;
          };

          const isValidSeed = (value: string | undefined): string | null => {
               if (value) {
                    const { type, value: detectedValue } = this.utilsService.detectXrpInputType(value);
                    if (detectedValue === 'unknown') {
                         return 'Account seed is invalid';
                    }
               }
               return null;
          };

          const isValidCurrency = (value: string | undefined, fieldName: string): string | null => {
               if (value && !this.utilsService.isValidCurrencyCode(value)) {
                    return `${fieldName} must be a valid currency code (3-20 characters or valid hex)`;
               }
               return null;
          };

          const validateMultiSign = (addressesStr: string | undefined, seedsStr: string | undefined): string | null => {
               if (!addressesStr || !seedsStr) return null;
               const addresses = this.utilsService.getMultiSignAddress(addressesStr);
               const seeds = this.utilsService.getMultiSignSeeds(seedsStr);
               if (addresses.length === 0) {
                    return 'At least one signer address is required for multi-signing';
               }
               if (addresses.length !== seeds.length) {
                    return 'Number of signer addresses must match number of signer seeds';
               }
               const invalidAddr = addresses.find((addr: string) => !xrpl.isValidAddress(addr));
               if (invalidAddr) {
                    return `Invalid signer address: ${invalidAddr}`;
               }
               const invalidSeed = seeds.find((seed: string) => !xrpl.isValidSecret(seed));
               if (invalidSeed) {
                    return 'One or more signer seeds are invalid';
               }
               return null;
          };

          const validateOfferSequences = (sequencesStr: string | undefined): string | null => {
               if (!sequencesStr) return null; // Not required
               const sequences = sequencesStr.split(',').map(seq => seq.trim());
               if (sequences.length === 0 || sequences.every(seq => !seq)) {
                    return 'Offer Sequence field cannot be empty';
               }
               const invalidSequence = sequences.find(seq => isNaN(parseFloat(seq)) || parseInt(seq) <= 0);
               if (invalidSequence) {
                    return `Invalid Offer Sequence: ${invalidSequence} must be a valid positive number`;
               }
               return null;
          };

          // Action-specific config: required fields and custom rules
          const actionConfig: Record<
               string,
               {
                    required: (keyof ValidationInputs)[];
                    customValidators?: (() => string | null)[];
                    asyncValidators?: (() => Promise<string | null>)[];
               }
          > = {
               fetchXrpPrice: {
                    required: ['selectedAccount', 'weWantCurrencyField', 'weSpendCurrencyField'],
                    customValidators: [
                         () => isValidCurrency(inputs.weWantCurrencyField, 'We want currency'),
                         () => isValidCurrency(inputs.weSpendCurrencyField, 'We spend currency'),
                         () => (inputs.weWantCurrencyField !== 'XRP' ? isRequired(inputs.weWantIssuerField, 'We want issuer') : null),
                         () => (inputs.weSpendCurrencyField !== 'XRP' ? isRequired(inputs.weSpendIssuerField, 'We spend issuer') : null),
                         () => (inputs.weWantCurrencyField !== 'XRP' ? isValidXrpAddress(inputs.weWantIssuerField, 'We want issuer address') : null),
                         () => (inputs.weSpendCurrencyField !== 'XRP' ? isValidXrpAddress(inputs.weSpendIssuerField, 'We spend issuer address') : null),
                    ],
                    asyncValidators: [],
               },
               getOffers: {
                    required: ['selectedAccount', 'seed'],
                    customValidators: [() => isValidSeed(inputs.seed)],
                    asyncValidators: [],
               },
               getOrderBook: {
                    required: ['selectedAccount', 'seed', 'weWantCurrencyField', 'weSpendCurrencyField'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidCurrency(inputs.weWantCurrencyField, 'We want currency'),
                         () => isValidCurrency(inputs.weSpendCurrencyField, 'We spend currency'),
                         () => (inputs.weWantCurrencyField !== 'XRP' ? isRequired(inputs.weWantIssuerField, 'We want issuer') : null),
                         () => (inputs.weSpendCurrencyField !== 'XRP' ? isRequired(inputs.weSpendIssuerField, 'We spend issuer') : null),
                         () => (inputs.weWantCurrencyField !== 'XRP' ? isValidXrpAddress(inputs.weWantIssuerField, 'We want issuer address') : null),
                         () => (inputs.weSpendCurrencyField !== 'XRP' ? isValidXrpAddress(inputs.weSpendIssuerField, 'We spend issuer address') : null),
                         // Ticket flow
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                    ],
                    asyncValidators: [],
               },
               createOffer: {
                    required: ['selectedAccount', 'seed', 'weWantAmountField', 'weSpendAmountField', 'weWantCurrencyField', 'weSpendCurrencyField'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.weWantAmountField, 'We want amount', 0),
                         () => isValidNumber(inputs.weSpendAmountField, 'We spend amount', 0),
                         () => isValidCurrency(inputs.weWantCurrencyField, 'We want currency'),
                         () => isValidCurrency(inputs.weSpendCurrencyField, 'We spend currency'),
                         () => (inputs.weWantCurrencyField !== 'XRP' ? isRequired(inputs.weWantIssuerField, 'We want issuer') : null),
                         () => (inputs.weSpendCurrencyField !== 'XRP' ? isRequired(inputs.weSpendIssuerField, 'We spend issuer') : null),
                         () => (inputs.weWantCurrencyField !== 'XRP' ? isValidXrpAddress(inputs.weWantIssuerField, 'We want issuer address') : null),
                         () => (inputs.weSpendCurrencyField !== 'XRP' ? isValidXrpAddress(inputs.weSpendIssuerField, 'We spend issuer address') : null),
                         () => isNotSelfPayment(inputs.senderAddress, inputs.weSpendIssuerField),
                         () => isNotSelfPayment(inputs.senderAddress, inputs.weWantCurrencyField),
                         // Ticket flow
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                    ],
                    asyncValidators: [],
               },
               cancelOffer: {
                    required: ['selectedAccount', 'seed', 'offerSequenceField'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => validateOfferSequences(inputs.offerSequenceField),
                         // Ticket flow
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                    ],
                    asyncValidators: [],
               },
               getTokenBalance: {
                    required: ['selectedAccount', 'seed'],
                    customValidators: [() => isValidSeed(inputs.seed)],
                    asyncValidators: [],
               },
               onWeWantCurrencyChange: {
                    required: ['selectedAccount'],
                    customValidators: [() => isValidXrpAddress('r9DZiCr2eejjRUqqTnTahL5UpLfku9Fe9D', 'Account address')],
                    asyncValidators: [],
               },
               onWeSpendCurrencyChange: {
                    required: ['selectedAccount'],
                    customValidators: [() => isValidXrpAddress('r9DZiCr2eejjRUqqTnTahL5UpLfku9Fe9D', 'Account address')],
                    asyncValidators: [],
               },
               updateTokenBalanceAndExchange: {
                    required: ['selectedAccount', 'weWantCurrencyField', 'weSpendCurrencyField'],
                    customValidators: [
                         () => isValidXrpAddress('r9DZiCr2eejjRUqqTnTahL5UpLfku9Fe9D', 'Account address'),
                         () => isValidCurrency(inputs.weWantCurrencyField, 'We want currency'),
                         () => isValidCurrency(inputs.weSpendCurrencyField, 'We spend currency'),
                         () => (inputs.weWantCurrencyField !== 'XRP' ? isRequired(inputs.weWantIssuerField, 'We want issuer') : null),
                         () => (inputs.weSpendCurrencyField !== 'XRP' ? isRequired(inputs.weSpendIssuerField, 'We spend issuer') : null),
                         () => (inputs.weWantCurrencyField !== 'XRP' ? isValidXrpAddress(inputs.weWantIssuerField, 'We want issuer address') : null),
                         () => (inputs.weSpendCurrencyField !== 'XRP' ? isValidXrpAddress(inputs.weSpendIssuerField, 'We spend issuer address') : null),
                         // () => (inputs.weSpendAmountField ? isValidNumber(inputs.weSpendAmountField, 'We spend amount', 0) : null),
                    ],
                    asyncValidators: [],
               },
               updateTokenBalanceAndExchange1: {
                    required: ['selectedAccount', 'weSpendCurrencyField'],
                    customValidators: [() => isValidXrpAddress('r9DZiCr2eejjRUqqTnTahL5UpLfku9Fe9D', 'Account address'), () => isValidCurrency(inputs.weSpendCurrencyField, 'We spend currency'), () => (inputs.weSpendCurrencyField !== 'XRP' ? isRequired(inputs.weSpendIssuerField, 'We spend issuer') : null), () => (inputs.weSpendCurrencyField !== 'XRP' ? isValidXrpAddress(inputs.weSpendIssuerField, 'We spend issuer address') : null)],
                    asyncValidators: [],
               },
               default: { required: [], customValidators: [], asyncValidators: [] },
          };

          const config = actionConfig[action] || actionConfig['default'];

          // --- Run required checks ---
          config.required.forEach((field: keyof ValidationInputs) => {
               const err = isRequired(inputs[field], field.charAt(0).toUpperCase() + field.slice(1));
               if (err) errors.push(err);
          });

          // Run custom validators
          config.customValidators?.forEach((validator: () => string | null) => {
               const err = validator();
               if (err) errors.push(err);
          });

          // Always validate optional fields if provided
          const multiErr = validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds);
          if (multiErr) errors.push(multiErr);

          const regAddrErr = isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address');
          if (regAddrErr && inputs.regularKeyAddress !== 'No RegularKey configured for account') errors.push(regAddrErr);

          const regSeedErr = isValidSecret(inputs.regularKeySeed, 'Regular Key Seed');
          if (regSeedErr) errors.push(regSeedErr);

          if (errors.length == 0 && inputs.useMultiSign && (inputs.multiSignAddresses === 'No Multi-Sign address configured for account' || inputs.multiSignSeeds === '')) {
               errors.push('At least one signer address is required for multi-signing');
          }

          return errors;
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.weSpendAmountField = '';
               this.weWantAmountField = '';
          }

          this.isMemoEnabled = false;
          this.memoField = '';
          this.isTicket = false;
          this.ticketSequence = '';
          this.isMarketOrder = false;
          // this.isPassive = false;
          this.isFillOrKill = false;
          this.cdr.detectChanges();
     }

     onOrderTypeChange(selectedType: string) {
          // Reset all to false first
          this.isPassive = false;
          this.isMarketOrder = false;
          this.isFillOrKill = false;

          // Set the selected one to true
          switch (selectedType) {
               case 'passive':
                    this.isPassive = true;
                    break;
               case 'marketOrder':
                    this.isMarketOrder = true;
                    break;
               case 'fillOrKill':
                    this.isFillOrKill = true;
                    break;
          }
     }

     clearMemeTokens() {
          // this.memeTokensSubject.next([]);
          this.dataSource.data = [];
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);
          if (this.multiSelectMode) {
               this.selectedSingleTicket = this.utilsService.cleanUpMultiSelection(this.selectedTickets, this.ticketArray);
          } else {
               this.selectedSingleTicket = this.utilsService.cleanUpSingleSelection(this.selectedTickets, this.ticketArray);
          }
     }

     private async updateXrpBalance(client: xrpl.Client, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet) {
          const { ownerCount, totalXrpReserves } = await this.utilsService.updateOwnerCountAndReserves(client, accountInfo, wallet.classicAddress);

          this.ownerCount = ownerCount;
          this.totalXrpReserves = totalXrpReserves;

          const balance = (await client.getXrpBalance(wallet.classicAddress)) - parseFloat(this.totalXrpReserves || '0');
          return this.utilsService.formatTokenBalance(balance.toString(), 18);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets, this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet = { ...newCurrent };
          });
     }

     public refreshUiAccountObjects(accountObjects: xrpl.AccountObjectsResponse, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet): void {
          // Tickets
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);
          this.selectedTicket = this.ticketArray[0] || this.selectedTicket;

          // Signer accounts
          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          this.signerQuorum = signerQuorum;
          const hasSignerAccounts = signerAccounts?.length > 0;
          this.checkForMultiSigners(hasSignerAccounts, wallet);

          // Boolean flags
          this.multiSigningEnabled = hasSignerAccounts;
          this.useMultiSign = false;
          this.masterKeyDisabled = Boolean(accountInfo?.result?.account_flags?.disableMasterKey);

          this.clearFields(false);
     }

     private checkForMultiSigners(hasSignerAccounts: boolean, wallet: xrpl.Wallet) {
          if (hasSignerAccounts) {
               const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.multiSignAddress = signerEntries.map((e: { Account: any }) => e.Account).join(',\n');
               this.multiSignSeeds = signerEntries.map((e: { seed: any }) => e.seed).join(',\n');
          } else {
               this.signerQuorum = 0;
               this.multiSignAddress = 'No Multi-Sign address configured for account';
               this.multiSignSeeds = '';
               this.storageService.removeValue('signerEntries');
          }
     }

     public refreshUiAccountInfo(accountInfo: xrpl.AccountInfoResponse): void {
          const accountData = accountInfo?.result?.account_data;
          if (!accountData) return;

          const regularKey = accountData.RegularKey;
          const isMasterKeyDisabled = accountInfo?.result?.account_flags?.disableMasterKey ?? false;

          // Set regular key properties
          const rkProps = this.utilsService.setRegularKeyProperties(regularKey, accountData.Account) || { regularKeyAddress: 'No RegularKey configured for account', regularKeySeed: '', isRegularKeyAddress: false };
          this.regularKeyAddress = rkProps.regularKeyAddress;
          this.regularKeySeed = rkProps.regularKeySeed;

          // Set master key property
          this.masterKeyDisabled = isMasterKeyDisabled;

          // Set regular key signing enabled flag
          this.regularKeySigningEnabled = !!regularKey;
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.destinationDropdownService.setItems(this.destinations);
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet.encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet.seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     private addNewDestinationFromUser() {
          const addr = this.destinationField.includes('...') ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

          if (addr && xrpl.isValidAddress(addr) && !this.destinations.some(d => d.address === addr)) {
               this.customDestinations.push({ name: `Custom ${this.customDestinations.length + 1}`, address: addr });
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations));
               this.updateDestinations();
          }
     }

     private updateInfoMessage() {
          const walletName = this.currentWallet.name || 'selected';

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
               const link = `${this.url}account/${this.currentWallet.address}/nfts`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View NFTs on XRPL Win</a>`;
          }

          this.ui.setInfoMessage(message);
     }

     setSlippage(slippage: number) {
          this.slippage = slippage;
          // this.updateTokenBalanceAndExchange(); // Recalculate exchange with new slippage
          this.cdr.detectChanges();
     }

     async onWeWantCurrencyChange() {
          this.offerCurrency.selectWeWantCurrency(this.weWantCurrencyField, this.currentWallet);
          // Balance updates automatically via observable
     }

     async onWeSpendCurrencyChange() {
          this.offerCurrency.selectWeSpendCurrency(this.weSpendCurrencyField, this.currentWallet);
          // Balance updates automatically
     }

     onWeWantIssuerChange() {
          this.offerCurrency.selectWeWantIssuer(this.weWantIssuerField, this.currentWallet);
     }

     onWeSpendIssuerChange() {
          this.offerCurrency.selectWeSpendIssuer(this.weSpendIssuerField, this.currentWallet);
     }

     async refreshBalances() {
          await this.offerCurrency.refreshBothBalances(this.currentWallet);
     }

     onTokenChange(): void {
          const issuers = this.knownIssuers[this.tokenToRemove] || [];

          if (issuers.length > 0) {
               // Auto-select the first issuer
               this.issuerToRemove = issuers[0];
          } else {
               // No issuers found
               this.issuerToRemove = '';
          }
     }

     get safeWarningMessage() {
          return this.ui.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }

     private loadKnownIssuers() {
          const data = this.storageService.getKnownIssuers('knownIssuers');
          if (data) {
               this.knownTrustLinesIssuers = data;
               this.updateCurrencies();
          }
     }

     private refreshStoredIssuers() {
          this.storedIssuers = [];
          for (const currency in this.knownTrustLinesIssuers) {
               if (currency === 'XRP') continue;
               for (const address of this.knownTrustLinesIssuers[currency]) {
                    this.storedIssuers.push({
                         name: currency,
                         address: address,
                    });
               }
          }
          // Optional: sort by currency
          this.storedIssuers.sort((a, b) => a.name.localeCompare(b.name));
     }

     private updateCurrencies() {
          // Get all currencies except XRP
          const allCurrencies = Object.keys(this.knownTrustLinesIssuers);
          const filtered = allCurrencies.filter(c => c !== 'XRP');

          // Sort alphabetically
          this.currencies = filtered.sort((a, b) => a.localeCompare(b));

          // AUTO-SELECT FIRST CURRENCY — SAFE WAY
          if (this.currencies.length > 0) {
               // Only set if nothing is selected OR current selection is invalid/removed
               const shouldSelectFirst = !this.currencyFieldDropDownValue || !this.currencies.includes(this.currencyFieldDropDownValue);

               // if (shouldSelectFirst) {
               //      this.currencyFieldDropDownValue = this.currencies[0];
               //      // Trigger issuer load — but do it in next tick so binding is ready
               //      Promise.resolve().then(() => {
               //           if (this.currencyFieldDropDownValue) {
               //                this.onCurrencyChange(this.currencyFieldDropDownValue);
               //           }
               //      });
               // }
          } else {
               // No currencies left
               this.currencyFieldDropDownValue = '';
               this.issuerFields = '';
               this.issuers = [];
          }
     }

     filterDestinations() {
          const query = this.filterQuery.trim().toLowerCase();

          if (query === '') {
               this.filteredDestinations = [...this.destinations];
          } else {
               this.filteredDestinations = this.destinations.filter(d => d.address.toLowerCase().includes(query) || (d.name && d.name.toLowerCase().includes(query)));
          }

          this.highlightedIndex = this.filteredDestinations.length > 0 ? 0 : -1;
     }

     onArrowDown() {
          if (!this.showDropdown || this.filteredDestinations.length === 0) return;
          this.highlightedIndex = (this.highlightedIndex + 1) % this.filteredDestinations.length;
     }

     selectHighlighted() {
          if (this.highlightedIndex >= 0 && this.filteredDestinations[this.highlightedIndex]) {
               const addr = this.filteredDestinations[this.highlightedIndex].address;
               if (addr !== this.currentWallet.address) {
                    this.destinationField = addr;
                    this.closeDropdown(); // Also close on Enter
               }
          }
     }

     // Dropdown controls
     openDropdown() {
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.filter(this.destinationField || '');
          this.destinationDropdownService.openDropdown();
     }

     closeDropdown() {
          this.destinationDropdownService.closeDropdown();
     }

     toggleDropdown() {
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.toggleDropdown();
     }

     onDestinationInput() {
          this.destinationDropdownService.filter(this.destinationField || '');
          this.destinationDropdownService.openDropdown();
     }

     selectDestination(address: string) {
          if (address === this.currentWallet.address) return;
          const dest = this.destinations.find(d => d.address === address);
          this.destinationField = dest ? this.destinationDropdownService.formatDisplay(dest) : `${address.slice(0, 6)}...${address.slice(-6)}`;
          this.closeDropdown();
     }

     private openDropdownInternal() {
          if (this.overlayRef?.hasAttached()) return;

          const strategy = this.overlay
               .position()
               .flexibleConnectedTo(this.dropdownOrigin)
               .withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 }]);

          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy: strategy,
               scrollStrategy: this.overlay.scrollStrategies.close(),
          });

          this.overlayRef.attach(new TemplatePortal(this.dropdownTemplate, this.viewContainerRef));
          this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());
     }

     private closeDropdownInternal() {
          this.overlayRef?.detach();
          this.overlayRef = null;
     }

     updatePaymentTx() {
          this.scheduleHighlight();
     }

     updateTxResult() {
          this.scheduleHighlight();
     }

     private scheduleHighlight() {
          afterRenderEffect(
               () => {
                    const paymentStr = JSON.stringify(this.ui.paymentTx, null, 2);
                    const resultStr = JSON.stringify(this.ui.txResult, null, 2);

                    if (this.paymentJson?.nativeElement && paymentStr !== this.lastPaymentTx) {
                         this.paymentJson.nativeElement.textContent = paymentStr;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                         this.lastPaymentTx = paymentStr;
                    }

                    if (this.txResultJson?.nativeElement && resultStr !== this.lastTxResult) {
                         this.txResultJson.nativeElement.textContent = resultStr;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                         this.lastTxResult = resultStr;
                    }

                    this.cdr.detectChanges();
               },
               { injector: this.injector }
          );
     }
}
