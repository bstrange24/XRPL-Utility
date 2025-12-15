import { Component, ElementRef, ViewChild, ChangeDetectorRef, inject, TemplateRef, Injector, NgZone, ViewContainerRef, AfterViewInit, OnInit, afterRenderEffect, ViewEncapsulation } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { IssuedCurrencyAmount } from 'xrpl';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { MatButtonModule } from '@angular/material/button';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
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
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { OfferCurrencyService } from '../../services/offer-currency/offer-currency.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import BigNumber from 'bignumber.js';

declare var Prism: any;

interface ValidationInputs {
     selectedAccount?: string;
     senderAddress?: string;
     seed?: string;
     accountInfo?: any;
     weWantAmountField?: string;
     firstPoolAssetAmount?: string;
     weSpendAmountField?: string;
     secondPoolAssetAmount?: string;
     weWantCurrencyField?: string;
     firstPoolCurrencyField?: string;
     weSpendCurrencyField?: string;
     secondPoolCurrencyField?: string;
     weWantIssuerField?: string;
     firstPoolIssuerField?: string;
     weSpendIssuerField?: string;
     secondPoolIssuerField?: string;
     lpTokenBalanceField?: string;
     withdrawlLpTokenFromPoolField?: string;
     withdrawOptions?: { bothPools: boolean; firstPoolOnly: boolean; secondPoolOnly: boolean };
     depositOptions?: { bothPools: boolean; firstPoolOnly: boolean; secondPoolOnly: boolean };
     tradingFeeField?: string;
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
     selector: 'app-amm',
     standalone: true,
     imports: [CommonModule, FormsModule, NavbarComponent, MatTableModule, MatSortModule, MatPaginatorModule, MatButtonModule, CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, WalletPanelComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './amm.component.html',
     styleUrl: './amm.component.css',
     encapsulation: ViewEncapsulation.None,
})
export class CreateAmmComponent implements OnInit, AfterViewInit {
     dataSource = new MatTableDataSource<any>();
     displayedColumns: string[] = ['transactionType', 'createdDate', 'creationAge', 'action', 'amountXrp', 'amountToken', 'currency', 'issuer', 'timestamp', 'transactionHash'];
     @ViewChild(MatPaginator) paginator!: MatPaginator;
     @ViewChild(MatSort) sort!: MatSort;
     weWantTokenBalanceField: string = '';
     weSpendAmountField: string = '';
     weSpendTokenBalanceField: string = '';
     holderField: string = '';
     ticketSequence: string = '';
     isTicket: boolean = false;
     isTicketEnabled: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     destinationTagField: string = '';
     ownerCount: string = '';
     totalXrpReserves: string = '';
     executionTime: string = '';
     currentTimeField: string = '';
     memoField: string = '';
     isMemoEnabled: boolean = false;
     useMultiSign: boolean = false;
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
     selectedAccount: string = '';
     signerQuorum: number = 0;
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     isRegularKeyAddress = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     selectedIssuer: string = '';
     tokenBalance: string = '';
     spinnerMessage: string = '';
     masterKeyDisabled: boolean = false;
     insufficientLiquidityWarning: boolean = false;
     showManageTokens: boolean = false;
     lpTokenBalanceField: string = '0'; // LP Token balance field
     tradingFeeField: string = '0.1';
     withdrawlLpTokenFromPoolField: string = '';
     assetPool1Balance: string = '0'; // Balance of the first asset in the AMM pool
     assetPool2Balance: string = '0'; // Balance of the second asset in the AMM pool
     xrpOnly: string[] = [];
     currencies: string[] = [];
     newCurrency: string = '';
     newIssuer: string = '';
     tokenToRemove: string = '';
     issuerToRemove: string = '';
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     private readonly priceRefreshInterval: any; // For polling
     selectedWalletIndex: number = 0;
     weWantCurrencyField: string = 'BOB';
     weSpendCurrencyField: string = 'XRP';
     weWantIssuerField: string = '';
     weSpendIssuerField: string = '';
     public weWantIssuers$!: Observable<IssuerItem[]>;
     public weSpendIssuers$!: Observable<IssuerItem[]>;
     public weWantBalance$!: Observable<string>;
     public weSpendBalance$!: Observable<string>;
     private assetPool1BalanceSubject = new BehaviorSubject<string>('0');
     private assetPool2BalanceSubject = new BehaviorSubject<string>('0');
     private lpTokenBalanceSubject = new BehaviorSubject<string>('0');
     public assetPool1Balance$ = this.assetPool1BalanceSubject.asObservable();
     public assetPool2Balance$ = this.assetPool2BalanceSubject.asObservable();
     public lpTokenBalance$ = this.lpTokenBalanceSubject.asObservable();
     private ammInfoTrigger = new Subject<void>();
     public availableCurrencies: string[] = [];
     private amountTimeout: any;
     offerSequenceField: string = '';
     weWantAmountField: string = '';
     isMarketOrder: boolean = false;
     isFillOrKill: boolean = false;
     isPassive: boolean = true;
     ticketCountField: string = '';
     xrpBalance1Field: string = '';
     amountField: string = '';
     isMultiSignTransaction: boolean = false;
     phnixBalance: string = '0'; // Hardcoded for now, will be fetched dynamically
     phnixExchangeXrp: string = '0'; // To store the calculated XRP amount
     xrpPrice: string = '0'; // New property to store XRP price in RLUSD
     averageExchangeRate: string = '';
     maxSellablePhnix: string = '';
     phnixCurrencyCode: string = '';
     slippage: number = 0.2357; // Default to 23.57%
     tokens$: Observable<{ transactionType: string; action: string; amountXrp: string; amountToken: string; currency: string; issuer: string; transactionHash: string; timestamp: Date; createdDate: Date; creationAge: string }[]>;
     private memeTokensSubject = new BehaviorSubject<{ transactionType: string; action: string; amountXrp: string; amountToken: string; currency: string; issuer: string; transactionHash: string; timestamp: Date; createdDate: Date; creationAge: string }[]>([]);
     memeTokens$ = this.memeTokensSubject.asObservable(); // Use Observable for UI binding
     private readonly maxTokens = 20; // Limit to 20 tokens
     // Add a map of known issuers for tokens
     knownIssuers: { [key: string]: string[] } = { XRP: [] };
     private destroy$ = new Subject<void>();
     private readonly injector = inject(Injector);
     public destinationSearch$ = new Subject<string>();
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;

     // Form fields
     activeTab: string = 'createAMM';
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
     withdrawOptions = {
          bothPools: true, // default checked
          firstPoolOnly: false,
          secondPoolOnly: false,
     };
     depositOptions = {
          bothPools: true, // default checked
          firstPoolOnly: false,
          secondPoolOnly: false,
     };

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
                    map(index => this.wallets[index]),
                    filter(wallet => !!wallet && !!wallet.address),
                    distinctUntilChanged((a, b) => a?.address === b?.address),
                    takeUntil(this.destroy$)
               )
               .subscribe(wallet => {
                    this.currentWallet = { ...wallet };
                    this.offerCurrency.setWalletAddress(wallet.address);

                    // CRITICAL: Initialize defaults here!
                    const currencies = this.offerCurrency.getAvailableCurrencies(true);

                    // Set defaults safely
                    const defaultWant = currencies.includes('BOB') ? 'BOB' : currencies[0] || 'XRP';
                    const defaultSpend = 'XRP';

                    this.offerCurrency.selectWeWantCurrency(defaultWant, wallet);
                    this.offerCurrency.selectWeSpendCurrency(defaultSpend, wallet);

                    // Now trigger AMM info load
                    this.getAMMPoolInfo();
               });
          // this.walletManagerService.selectedIndex$
          //      .pipe(
          //           map(index => this.wallets[index]?.address),
          //           distinctUntilChanged(), // ← Prevents unnecessary emissions
          //           filter(address => !!address), // ← Ignore invalid/undefined
          //           takeUntil(this.destroy$)
          //      )
          //      .subscribe(selectedAddress => {
          //           const wallet = this.wallets.find(w => w.address === selectedAddress);
          //           if (wallet && this.currentWallet.address !== wallet.address) {
          //                // if (wallet) {
          //                this.currentWallet = { ...wallet };
          //                this.offerCurrency.setWalletAddress(wallet.address); // ← important!

          //                // optional: pre-fill defaults
          //                const currencies = this.offerCurrency.getAvailableCurrencies(true);
          //                if (currencies.length) {
          //                     this.offerCurrency.selectWeWantCurrency(currencies[0], this.currentWallet);
          //                     this.offerCurrency.selectWeSpendCurrency('XRP', this.currentWallet);
          //                }

          //                this.getAMMPoolInfo();
          //           }
          //      });

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

          // Debounced AMM info refresh
          this.ammInfoTrigger.pipe(debounceTime(400), takeUntil(this.destroy$)).subscribe(() => {
               this.getAMMPoolInfo();
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
          this.offerCurrency.setWalletAddress(wallet.address);

          const currencies = this.offerCurrency.getAvailableCurrencies(true);
          const defaultWant = currencies.includes('BOB') ? 'BOB' : currencies[0] || 'XRP';

          this.offerCurrency.selectWeWantCurrency(defaultWant, wallet);
          this.offerCurrency.selectWeSpendCurrency('XRP', wallet);

          this.getAMMPoolInfo();
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

     async getAMMPoolInfo() {
          console.log('Entering getAMMPoolInfo');
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
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const asset = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weWantCurrencyField), this.weWantIssuerField);
               const asset2 = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weSpendCurrencyField), this.weSpendIssuerField);
               this.utilsService.logAssets(asset, asset2);

               const [accountInfo, accountObjects, ammResponse, participation] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAMMInfo(client, asset, asset2, wallet.classicAddress, 'validated'), this.checkAmmParticipation(client, wallet.classicAddress, asset, asset2, true)]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logObjects('ammResponse', ammResponse);
               this.utilsService.logObjects('participation', participation);

               const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const data: { sections: Section[] } = { sections: [] };

               const amm = ammResponse?.result?.amm;

               if (!amm) {
                    // this.updatePoolBalances(null);
                    this.assetPool1BalanceSubject.next('0');
                    this.assetPool2BalanceSubject.next('0');
               } else {
                    const toDisplay = (amt: any): string => {
                         const val = typeof amt === 'string' ? xrpl.dropsToXrp(amt) : amt.value;
                         return this.utilsService.formatTokenBalance(val, 18);
                    };

                    // this.updatePoolBalances(amm);
                    this.assetPool1BalanceSubject.next(toDisplay(amm.amount));
                    this.assetPool2BalanceSubject.next(toDisplay(amm.amount2));

                    // Decode currencies for display
                    // const assetCurrency = typeof amm.amount === 'string' ? 'XRP' : this.utilsService.decodeIfNeeded(amm.amount.currency) + (amm.amount.issuer ? ` (Issuer: ${amm.amount.issuer})` : '');
                    // const asset2Currency = typeof amm.amount2 === 'string' ? 'XRP' : this.utilsService.decodeIfNeeded(amm.amount2.currency) + (amm.amount2.issuer ? ` (Issuer: ${amm.amount2.issuer})` : '');

                    // data.sections.push({
                    //      title: 'AMM Pool Info',
                    //      openByDefault: true,
                    //      content: [
                    //           { key: 'Account', value: amm.account },
                    //           { key: 'Asset', value: assetCurrency },
                    //           { key: 'Asset Amount', value: this.assetPool1Balance },
                    //           { key: 'Asset2', value: asset2Currency },
                    //           { key: 'Asset2 Amount', value: this.assetPool2Balance },
                    //           { key: 'LP Token Balance', value: `${this.utilsService.formatTokenBalance(amm.lp_token.value, 2)} ${amm.lp_token.currency}` },
                    //           { key: 'Asset Frozen', value: String(amm.asset_frozen || false) },
                    //           { key: 'Trading Fee', value: `${amm.trading_fee / 1000}%` },
                    //           { key: 'Vote Slots', value: String(amm.vote_slots?.length || 0) },
                    //      ],
                    // });

                    // Optional: Show vote slots
                    if (amm.vote_slots && amm.vote_slots.length > 0) {
                         data.sections.push({
                              title: 'Vote Slots',
                              openByDefault: false,
                              subItems: amm.vote_slots.map((slot: any, index: number) => ({
                                   key: `Vote Slot ${index + 1}`,
                                   openByDefault: false,
                                   content: [
                                        { key: 'Account', value: slot.account },
                                        { key: 'Trading Fee', value: `${slot.trading_fee / 1000}%` },
                                        { key: 'Voting Weight', value: slot.vote_weight },
                                   ],
                              })),
                         });
                    }

                    this.tradingFeeField = `${amm.trading_fee / 10000}`;

                    // LP Token section
                    data.sections.push({
                         title: 'LP Token',
                         openByDefault: true,
                         content: [
                              { key: 'Currency', value: amm.lp_token.currency },
                              { key: 'Issuer', value: amm.lp_token.issuer },
                              { key: 'Balance', value: this.utilsService.formatTokenBalance(amm.lp_token.value, 2) },
                         ],
                    });
               }

               // Render UI
               // this.ui.setSuccess(this.ui.result);

               // DEFER: Non-critical UI updates — let main render complete first
               this.currentWallet.balance = await this.updateXrpBalance(client, accountInfo, wallet);
               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.clearFields(false);
               this.updateTickets(accountObjects);
          } catch (error: any) {
               console.error('Error in getAMMPoolInfo:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getAMMPoolInfo in ${this.executionTime}ms`);
          }
     }

     async createAMM() {
          console.log('Entering createAMM');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          // Define correct type for currency amounts
          type CurrencyAmount = string | xrpl.IssuedCurrencyAmount;

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               senderAddress: this.currentWallet.address,
               firstPoolAssetAmount: this.weWantAmountField,
               secondPoolAssetAmount: this.weSpendAmountField,
               firstPoolCurrencyField: this.weWantCurrencyField,
               secondPoolCurrencyField: this.weSpendCurrencyField,
               firstPoolIssuerField: this.weWantCurrencyField !== 'XRP' ? this.weWantIssuerField : undefined,
               secondPoolIssuerField: this.weSpendCurrencyField !== 'XRP' ? this.weSpendIssuerField : undefined,
               tradingFeeField: this.tradingFeeField,
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

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('AMMCreate', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               // const errors = await this.validationService.validate('AMMCreate', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               // if (errors.length > 0) {
               //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               // }

               // Build currency objects correctly
               const we_want_currency = this.utilsService.encodeIfNeeded(this.weWantCurrencyField);
               const we_spend_currency = this.utilsService.encodeIfNeeded(this.weSpendCurrencyField);
               this.utilsService.logAssets(we_want_currency, we_spend_currency);

               // Build properly typed currency objects
               const we_want: CurrencyAmount =
                    this.weWantCurrencyField === 'XRP'
                         ? xrpl.xrpToDrops(this.weWantAmountField)
                         : {
                                currency: we_want_currency,
                                issuer: this.weWantIssuerField!,
                                value: this.weWantAmountField,
                           };

               const we_spend: CurrencyAmount =
                    this.weSpendCurrencyField === 'XRP'
                         ? xrpl.xrpToDrops(this.weSpendAmountField)
                         : {
                                currency: we_spend_currency,
                                issuer: this.weSpendIssuerField!,
                                value: this.weSpendAmountField,
                           };

               // Validate balances using existing account data
               const insufficientBalance = this.utilsService.validateAmmCreateBalances(accountInfo.result.account_data.Balance, accountObjects.result.account_objects, we_want, we_spend);

               if (insufficientBalance) {
                    return this.ui.setError(insufficientBalance);
               }

               // Prepare initial balances display
               // const data: { sections: any[] } = { sections: [] };
               const initialXrpBalance = xrpl.dropsToXrp(accountInfo.result.account_data.Balance);
               console.log('initialXrpBalance: ', initialXrpBalance);

               // Build AMM Create transaction
               const ammCreateTx: xrpl.AMMCreate = {
                    TransactionType: 'AMMCreate',
                    Account: wallet.classicAddress,
                    Amount: we_spend as string, // XRP amount in drops (string)
                    Amount2: we_want as xrpl.IssuedCurrencyAmount, // Token amount object
                    TradingFee: Math.round(parseFloat(this.tradingFeeField) * 1000), // Convert % to basis points (e.g., 0.5% = 500)
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, ammCreateTx, wallet, accountInfo, 'createAmm');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, ammCreateTx, fee)) {
                    return this.ui.setError('Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled() ? 'Simulating AMM Creation (no funds will be moved)...' : 'Submitting AMM Creation to Ledger...', 200);

               this.ui.setPaymentTx(ammCreateTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, ammCreateTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    // Add a higher fee to cover multi sign
                    // let newFeeDrops = xrpl.xrpToDrops((parseFloat(fee) * 2).toString());
                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, ammCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('Failed to sign transaction.');
                    }

                    response = await client.submitAndWait(signedTx.tx_blob);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled()) {
                    this.ui.successMessage = 'AMM created successfully!';
                    const assetDef: xrpl.Currency = { currency: 'XRP' };
                    const asset2Def: xrpl.Currency = {
                         currency: we_want_currency,
                         issuer: (we_want as xrpl.IssuedCurrencyAmount).issuer ?? '',
                    };

                    const [updatedAccountInfo, updatedAccountObjects, participation] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.checkAmmParticipation(client, wallet.classicAddress, assetDef, asset2Def, true), this.onWeSpendCurrencyChange(), this.onWeWantCurrencyChange()]);
                    // this.updatePoolBalances(participation?.ammInfo);
                    this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.logObjects(`participation:`, participation);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    this.currentWallet.balance = await this.updateXrpBalance(client, updatedAccountInfo, wallet);
                    this.clearFields(false);
                    this.updateTickets(updatedAccountObjects);
               } else {
                    this.ui.successMessage = 'Simulated AMM create successfully!';
               }
          } catch (error: any) {
               console.error('Error in createAMM:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving createAMM in ${this.executionTime}ms`);
          }
     }

     async depositToAMM() {
          console.log('Entering depositToAMM');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          // Build properly typed currency objects
          type CurrencyAmount = string | xrpl.IssuedCurrencyAmount;

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               weWantAmountField: this.depositOptions.bothPools || this.depositOptions.firstPoolOnly ? this.weWantAmountField : undefined,
               weSpendAmountField: this.depositOptions.bothPools || this.depositOptions.secondPoolOnly ? this.weSpendAmountField : undefined,
               depositOptions: this.depositOptions,
               withdrawOptions: this.withdrawOptions,
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

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('AMMDeposit', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               // Build currency objects correctly
               const we_want_currency = this.utilsService.encodeIfNeeded(this.weWantCurrencyField);
               const we_spend_currency = this.utilsService.encodeIfNeeded(this.weSpendCurrencyField);

               if (this.depositOptions.firstPoolOnly) {
                    this.weSpendAmountField = '0';
               }
               if (this.depositOptions.secondPoolOnly) {
                    this.weWantAmountField = '0';
               }

               // Then use it in your function:
               const we_want: CurrencyAmount = this.weWantCurrencyField === 'XRP' ? xrpl.xrpToDrops(this.weWantAmountField) : { currency: we_want_currency, issuer: this.weWantIssuerField, value: this.weWantAmountField };
               const we_spend: CurrencyAmount = this.weSpendCurrencyField === 'XRP' ? xrpl.xrpToDrops(this.weSpendAmountField) : { currency: we_spend_currency, issuer: this.weSpendIssuerField, value: this.weSpendAmountField };

               // Validate balances using existing account data
               const insufficientBalance = this.utilsService.validateAmmDepositBalances(accountInfo.result.account_data.Balance, accountObjects.result.account_objects, we_want, we_spend);
               if (insufficientBalance) {
                    return this.ui.setError(insufficientBalance);
               }

               const assetDef: xrpl.Currency = { currency: 'XRP' };
               const asset2Def: xrpl.Currency = {
                    currency: we_want_currency,
                    issuer: typeof we_want === 'string' ? '' : we_want.issuer ?? '',
               };

               let ammDepositTx: xrpl.AMMDeposit;

               if (this.depositOptions.bothPools) {
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
               } else if (this.depositOptions.firstPoolOnly) {
                    // Single asset deposit (Asset2)
                    ammDepositTx = {
                         TransactionType: 'AMMDeposit',
                         Account: wallet.classicAddress,
                         Asset: assetDef,
                         Asset2: asset2Def,
                         Amount: typeof we_want === 'string' ? we_want : { currency: we_want.currency, issuer: we_want.issuer, value: we_want.value },
                         Flags: 524288,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };
               } else {
                    // Single asset deposit (Asset)
                    ammDepositTx = {
                         TransactionType: 'AMMDeposit',
                         Account: wallet.classicAddress,
                         Asset: assetDef,
                         Asset2: asset2Def,
                         Amount: typeof we_spend === 'string' ? we_spend : { currency: we_spend.currency, issuer: we_spend.issuer, value: we_spend.value },
                         Flags: 524288,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };
               }

               await this.setTxOptionalFields(client, ammDepositTx, wallet, accountInfo, 'depositToAmm');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, ammDepositTx, fee)) {
                    return this.ui.setError('Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled() ? 'Simulating AMM Deposit (no funds will be moved)...' : 'Submitting AMM Deposit to Ledger...', 200);

               this.ui.setPaymentTx(ammDepositTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, ammDepositTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, ammDepositTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('Failed to sign transaction.');
                    }

                    response = await client.submitAndWait(signedTx.tx_blob);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled()) {
                    this.ui.successMessage = 'AMM Deposti successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    await Promise.all([this.onWeSpendCurrencyChange(), this.onWeWantCurrencyChange(), this.checkAmmParticipation(client, wallet.classicAddress, assetDef, asset2Def, true)]);
                    // this.updatePoolBalances(participation?.ammInfo);
                    this.currentWallet.balance = await this.updateXrpBalance(client, updatedAccountInfo, wallet);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.clearFields(false);
                    this.updateTickets(updatedAccountObjects);
               } else {
                    this.ui.successMessage = 'Simulated AMM Deposit successfully!';
               }
          } catch (error: any) {
               console.error('Error in depositToAMM:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving depositToAMM in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async withdrawlTokenFromAMM() {
          console.log('Entering withdrawlTokenFromAMM');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          // Define correct type for currency amounts
          type CurrencyAmount = string | xrpl.IssuedCurrencyAmount;

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               depositOptions: this.depositOptions,
               withdrawOptions: this.withdrawOptions,
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

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('AMMWithdraw', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               // Build currency objects correctly
               const we_want_currency = this.utilsService.encodeIfNeeded(this.weWantCurrencyField);
               const we_spend_currency = this.utilsService.encodeIfNeeded(this.weSpendCurrencyField);

               if (this.withdrawOptions.bothPools) {
                    this.weSpendAmountField = '0';
                    this.weWantAmountField = '0';
               } else {
                    if (this.withdrawOptions.firstPoolOnly) {
                         this.weSpendAmountField = '0';
                    }
                    if (this.withdrawOptions.secondPoolOnly) {
                         this.weWantAmountField = '0';
                    }
               }

               // Build properly typed currency objects
               const we_want: CurrencyAmount = this.weWantCurrencyField === 'XRP' ? xrpl.xrpToDrops(this.weWantAmountField) : { currency: we_want_currency, issuer: this.weWantIssuerField!, value: this.weWantAmountField };
               const we_spend: CurrencyAmount = this.weSpendCurrencyField === 'XRP' ? xrpl.xrpToDrops(this.weSpendAmountField) : { currency: we_spend_currency, issuer: this.weSpendIssuerField!, value: this.weSpendAmountField };
               this.utilsService.logObjects(`we_want:`, we_want);
               this.utilsService.logObjects(`we_spend:`, we_spend);

               // Get AMM participation info
               const asset = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weWantCurrencyField), this.weWantIssuerField);
               const asset2 = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weSpendCurrencyField), this.weSpendIssuerField);
               this.utilsService.logObjects(`asset:`, asset);
               this.utilsService.logObjects(`asset2:`, asset2);

               const participation = await this.checkAmmParticipation(client, wallet.classicAddress, asset, asset2, false);

               // Validate balances using existing account data
               const insufficientBalance = this.utilsService.validateAmmWithdrawBalances(accountInfo.result.account_data.Balance, accountObjects.result.account_objects, this.withdrawlLpTokenFromPoolField, participation);
               if (insufficientBalance) {
                    return this.ui.setError(insufficientBalance);
               }

               if (!participation?.lpTokens?.[0]) {
                    return this.ui.setError('No LP token found for this AMM pool');
               }

               const ammIssuer = participation.lpTokens[0].issuer;
               const ammCurrency = participation.lpTokens[0].currency;

               // Validate LP token balance
               const lpTokenBalance = participation.lpTokens[0].balance;
               if (parseFloat(this.withdrawlLpTokenFromPoolField) > parseFloat(lpTokenBalance)) {
                    return this.ui.setError(`Insufficient LP token balance. Available: ${lpTokenBalance}`);
               }

               // Build AMM Withdraw transaction
               const assetDef: xrpl.Currency = { currency: 'XRP' };
               const asset2Def: xrpl.Currency = {
                    currency: we_want_currency,
                    issuer: typeof we_want === 'string' ? '' : we_want.issuer ?? '',
               };

               const cleanLpAmount = this.utilsService.removeCommaFromAmount(this.withdrawlLpTokenFromPoolField);
               const lpTokenIn: xrpl.IssuedCurrencyAmount = {
                    currency: ammCurrency,
                    issuer: ammIssuer,
                    value: cleanLpAmount,
               };

               let ammWithdrawTx: xrpl.AMMWithdraw;

               if (this.withdrawOptions.bothPools) {
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
               } else if (this.withdrawOptions.firstPoolOnly) {
                    const asset2Amount: xrpl.IssuedCurrencyAmount = {
                         currency: we_want_currency,
                         issuer: typeof we_want === 'string' ? '' : we_want.issuer ?? '',
                         value: this.weWantAmountField,
                    };

                    ammWithdrawTx = {
                         TransactionType: 'AMMWithdraw',
                         Account: wallet.classicAddress,
                         Asset: assetDef,
                         Asset2: asset2Def,
                         Amount: asset2Amount,
                         Flags: 524288,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };
               } else {
                    // Withdraw specific amount of Asset (XRP)
                    ammWithdrawTx = {
                         TransactionType: 'AMMWithdraw',
                         Account: wallet.classicAddress,
                         Asset: assetDef,
                         Asset2: asset2Def,
                         Amount: xrpl.xrpToDrops(this.weSpendAmountField),
                         Flags: 524288,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };
               }

               await this.setTxOptionalFields(client, ammWithdrawTx, wallet, accountInfo, 'withdrawlFromAmm');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, ammWithdrawTx, fee)) {
                    return this.ui.setError('Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled() ? 'Simulating AMM Withdrawal (no funds will be moved)...' : 'Submitting AMM Withdrawal to Ledger...', 200);

               this.ui.setPaymentTx(ammWithdrawTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, ammWithdrawTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, ammWithdrawTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('Failed to sign transaction.');
                    }

                    response = await client.submitAndWait(signedTx.tx_blob);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.withdrawlLpTokenFromPoolField = '';
               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled()) {
                    this.ui.successMessage = 'AMM Withdrawl successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.checkAmmParticipation(client, wallet.classicAddress, assetDef, asset2Def, true)]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    await Promise.all([this.onWeSpendCurrencyChange(), this.onWeWantCurrencyChange(), this.checkAmmParticipation(client, wallet.classicAddress, assetDef, asset2Def, true)]);
                    this.currentWallet.balance = await this.updateXrpBalance(client, updatedAccountInfo, wallet);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.clearFields(false);
                    this.updateTickets(updatedAccountObjects);
               } else {
                    this.ui.successMessage = 'Simulated AMM Withdrawl successfully!';
               }
          } catch (error: any) {
               console.error('Error in withdrawlTokenFromAMM:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving withdrawlTokenFromAMM in ${this.executionTime}ms`);
          }
     }

     async clawbackFromAMM() {
          console.log('Entering clawbackFromAMM');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          // Define correct type for currency amounts
          type CurrencyAmount = string | xrpl.IssuedCurrencyAmount;

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               lpTokenBalanceField: this.lpTokenBalanceField,
               weWantCurrencyField: this.weWantCurrencyField,
               weWantIssuerField: this.weWantCurrencyField !== 'XRP' ? this.weWantIssuerField : undefined,
               weSpendCurrencyField: this.weSpendCurrencyField,
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

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('AMMClawback', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               // Build AMM pool assets correctly
               const assetDef: xrpl.Currency = {
                    currency: this.weSpendCurrencyField === 'XRP' ? 'XRP' : this.utilsService.encodeIfNeeded(this.weSpendCurrencyField),
                    issuer: this.weSpendCurrencyField !== 'XRP' ? this.weSpendIssuerField : '',
               };

               const asset2Def: xrpl.Currency = {
                    currency: this.weWantCurrencyField === 'XRP' ? 'XRP' : this.utilsService.encodeIfNeeded(this.weWantCurrencyField),
                    issuer: this.weWantCurrencyField !== 'XRP' ? this.weWantIssuerField : '',
               };

               // Get AMM participation to validate LP token balance
               const participation = await this.checkAmmParticipation(client, wallet.classicAddress, assetDef, asset2Def);
               this.utilsService.logObjects(`participation:`, participation);

               if (!participation?.lpTokens?.[0]) {
                    return this.ui.setError('No LP token found for this AMM pool');
               }

               const lpTokenInfo = participation.lpTokens[0];
               const availableLpBalance = parseFloat(lpTokenInfo.balance);
               const requestedLpAmount = parseFloat(this.lpTokenBalanceField);

               if (requestedLpAmount > availableLpBalance) {
                    return this.ui.setError(`Insufficient LP token balance. Available: ${availableLpBalance}`);
               }

               // Build AMM Clawback transaction
               // LP tokens use the actual LP token currency/issuer, NOT 'AMM'
               const lpTokenAmount: xrpl.IssuedCurrencyAmount = {
                    currency: lpTokenInfo.currency,
                    issuer: lpTokenInfo.issuer,
                    value: this.lpTokenBalanceField,
               };

               const ammClawbackTx: xrpl.AMMClawback = {
                    TransactionType: 'AMMClawback',
                    Account: wallet.classicAddress,
                    Asset: assetDef,
                    Asset2: asset2Def,
                    Amount: lpTokenAmount,
                    Holder: this.holderField,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    Fee: fee,
               };

               await this.setTxOptionalFields(client, ammClawbackTx, wallet, accountInfo, 'clawbackFromAmm');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, ammClawbackTx, fee)) {
                    return this.ui.setError('Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled() ? 'Simulating AMM Clawback (no funds will be moved)...' : 'Submitting AMM Clawback to Ledger...', 200);

               this.ui.setPaymentTx(ammClawbackTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, ammClawbackTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, ammClawbackTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('Failed to sign transaction.');
                    }

                    response = await client.submitAndWait(signedTx.tx_blob);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled()) {
                    this.ui.successMessage = 'AMM Clawback successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    this.currentWallet.balance = await this.updateXrpBalance(client, updatedAccountInfo, wallet);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.clearFields(false);
                    this.updateTickets(updatedAccountObjects);
               } else {
                    this.ui.successMessage = 'Simulated AMM Clawback successfully!';
               }
          } catch (error: any) {
               console.error('Error in clawbackFromAMM:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving clawbackFromAMM in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async swapViaAMM() {
          console.log('Entering swapViaAMM');
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
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               // PARALLELIZE — fetch account info + account objects together
               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('AMMSwap', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const asset = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weWantCurrencyField), 'r9DZiCr2eejjRUqqTnTahL5UpLfku9Fe9D');
               const asset2 = this.toXRPLCurrency(this.utilsService.encodeIfNeeded(this.weSpendCurrencyField), 'r9DZiCr2eejjRUqqTnTahL5UpLfku9Fe9D');
               this.utilsService.logObjects(`asset:`, asset);
               this.utilsService.logObjects(`asset2:`, asset2);

               // Define Amount based on weWantCurrencyField
               const amount: xrpl.Amount = this.weWantCurrencyField === 'XRP' ? xrpl.xrpToDrops(this.weWantAmountField.toString()) : { currency: asset.currency, issuer: asset.issuer!, value: this.weWantAmountField.toString() };

               const swapPaymentTx: xrpl.Payment = {
                    TransactionType: 'Payment',
                    Account: wallet.classicAddress,
                    Destination: wallet.classicAddress,
                    Amount: amount,
                    SendMax: this.weSpendCurrencyField === 'XRP' ? xrpl.xrpToDrops(this.weSpendAmountField.toString()) : { currency: asset2.currency, issuer: asset2.issuer!, value: '10' },
                    Flags: 131072,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, swapPaymentTx, wallet, accountInfo, 'swamViaAMM');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, swapPaymentTx, fee)) {
                    return this.ui.setError('Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled() ? 'Simulating Swap via AMM (no changes will be made)...' : 'Submitting Swap via AMM to Ledger...', 200);

               this.ui.setPaymentTx(swapPaymentTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, swapPaymentTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, swapPaymentTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('Failed to sign Payment transaction.');
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

                    console.error(`Transaction ${this.ui.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled()) {
                    this.ui.successMessage = 'Swap via AMM successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    await Promise.all([this.onWeSpendCurrencyChange(), this.onWeWantCurrencyChange()]);
                    this.currentWallet.balance = await this.updateXrpBalance(client, updatedAccountInfo, wallet);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.clearFields(false);
                    this.updateTickets(updatedAccountObjects);
               } else {
                    this.ui.successMessage = 'Simulated Swap via AMM successfully!';
               }
          } catch (error: any) {
               console.error('Error in swapViaAMM:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving swapViaAMM in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async deleteAMM() {
          console.log('Entering deleteAMM');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               // weWantAmountField: this.weWantAmountField,
               // weSpendAmountField: this.weSpendAmountField,
               weWantCurrencyField: this.weWantCurrencyField,
               weSpendCurrencyField: this.weSpendCurrencyField,
               weWantIssuerField: this.weWantCurrencyField !== 'XRP' ? this.weWantIssuerField : undefined,
               weSpendIssuerField: this.weSpendCurrencyField !== 'XRP' ? this.weSpendIssuerField : undefined,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('AMMDelete', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const asset = this.toCurrency(this.utilsService.encodeIfNeeded(this.weWantCurrencyField), this.weWantIssuerField);
               const asset2 = this.toCurrency(this.utilsService.encodeIfNeeded(this.weSpendCurrencyField), this.weSpendIssuerField);
               this.utilsService.logObjects('asset', asset);
               this.utilsService.logObjects('asset2', asset2);

               const deleteAmmTx: xrpl.AMMDelete = {
                    TransactionType: 'AMMDelete',
                    Account: wallet.classicAddress,
                    Asset: asset,
                    Asset2: asset2,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, deleteAmmTx, wallet, accountInfo, 'deleteAMM');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, deleteAmmTx, fee)) {
                    return this.ui.setError('Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled() ? 'Simulating AMM Delete (no changes will be made)...' : 'Submitting AMM Delete to Ledger...', 200);

               this.ui.setPaymentTx(deleteAmmTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, deleteAmmTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, deleteAmmTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('Failed to sign Payment transaction.');
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

                    console.error(`Transaction ${this.ui.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled()) {
                    this.ui.successMessage = 'AMM Delete successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    this.currentWallet.balance = await this.updateXrpBalance(client, updatedAccountInfo, wallet);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.clearFields(false);
                    this.updateTickets(updatedAccountObjects);
               } else {
                    this.ui.successMessage = 'Simulated AM Delete successfully!';
               }
          } catch (error: any) {
               console.error('Error in deleteAMM:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving deleteAMM in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
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

     private updatePoolBalances(amm: any) {
          if (!amm) {
               this.assetPool1BalanceSubject.next('0');
               this.assetPool2BalanceSubject.next('0');
               return;
          }

          const format = (a: any) => this.utilsService.formatTokenBalance(typeof a === 'string' ? xrpl.dropsToXrp(a) : a.value, 18);

          this.assetPool1BalanceSubject.next(format(amm.amount));
          this.assetPool2BalanceSubject.next(format(amm.amount2));
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

          this.ui.spinner.set(true);
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
               console.error('Error in updateTokenBalanceAndExchangeReverse:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
               this.phnixBalance = '0';
               this.phnixExchangeXrp = 'Error';
               this.weSpendAmountField = '0';
          } finally {
               this.ui.spinner.set(false);
               let executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving updateTokenBalanceAndExchangeReverse in ${executionTime}ms`);
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

          this.ui.spinner.set(true);
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
               this.ui.setError(`${error.message || 'Unknown error'}`);
               this.phnixBalance = '0';
               this.phnixExchangeXrp = 'Error';
               this.weWantAmountField = '0';
          } finally {
               this.ui.spinner.set(false);
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

     private async setTxOptionalFields(client: xrpl.Client, ammTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'createAmm' || txType === 'swamViaAMM' || txType === 'depositToAmm' || txType === 'withdrawlFromAmm' || txType === 'clawbackFromAmm') {
               if (this.selectedSingleTicket) {
                    const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
                    if (!ticketExists) {
                         return this.ui.setError(`Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
                    }
                    this.utilsService.setTicketSequence(ammTx, this.selectedSingleTicket, true);
               } else {
                    if (this.multiSelectMode && this.selectedTickets.length > 0) {
                         console.warn('Setting multiple tickets:', this.selectedTickets);
                         this.utilsService.setTicketSequence(ammTx, accountInfo.result.account_data.Sequence, false);
                    }
               }

               if (this.memoField) {
                    this.utilsService.setMemoField(ammTx, this.memoField);
               }
          }

          if (txType === 'swamViaAMM') {
               if (this.destinationTagField && parseInt(this.destinationTagField) > 0) {
                    this.utilsService.setDestinationTag(ammTx, this.destinationTagField);
               }
          }
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
          }
          this.ui.isSimulateEnabled.set(false);
          this.weSpendAmountField = '';
          this.weWantAmountField = '';
          this.isMemoEnabled = false;
          this.memoField = '';
          this.ticketSequence = '';
          this.isTicket = false;
          this.cdr.detectChanges();
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
                         this.lpTokenBalanceSubject.next(ammResponse.result.amm.lp_token.value);
                         const toDisplay = (amt: any): string => {
                              const val = typeof amt === 'string' ? xrpl.dropsToXrp(amt) : amt.value;
                              return this.utilsService.formatTokenBalance(val, 18);
                         };
                         this.assetPool1BalanceSubject.next(toDisplay(result.ammInfo.amount));
                         this.assetPool2BalanceSubject.next(toDisplay(result.ammInfo.amount2));
                    }
               } else {
                    if (displayChanges) {
                         this.lpTokenBalanceSubject.next('0');
                         // this.updatePoolBalances(null);
                         this.assetPool1BalanceSubject.next('0');
                         this.assetPool2BalanceSubject.next('0');
                    }
               }
          } catch (e) {
               // Not an AMM, ignore
               console.warn('Not an AMM account:', e);
          }
          return result;
     }

     selectDepositOption(option: 'bothPools' | 'firstPoolOnly' | 'secondPoolOnly') {
          // Reset all options to false
          Object.keys(this.depositOptions).forEach(key => {
               this.depositOptions[key as keyof typeof this.depositOptions] = false;
          });

          // Set the clicked one to true
          this.depositOptions[option] = true;
     }

     selectWithdrawOption(option: 'bothPools' | 'firstPoolOnly' | 'secondPoolOnly') {
          // Reset all to false
          Object.keys(this.withdrawOptions).forEach(key => {
               this.withdrawOptions[key as keyof typeof this.withdrawOptions] = false;
          });

          // Enable the selected option
          this.withdrawOptions[option] = true;
     }

     toXRPLCurrency(currency: string, issuerAddress: string): XRPLCurrency {
          if (currency === 'XRP') {
               return { currency: 'XRP' };
          }
          return { currency, issuer: issuerAddress };
     }

     toCurrency(currency: string, issuerAddress: string): xrpl.Currency {
          if (currency === 'XRP') {
               return { currency: 'XRP' };
          }
          return { currency, issuer: issuerAddress };
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.destinationDropdownService.setItems(this.destinations);
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet.encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet.seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('Wallet could not be created or is undefined');
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
               const link = `${this.url}account/${this.currentWallet.address}/objects`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View AMM on XRPL Win</a>`;
          }

          this.ui.setInfoMessage(message);
     }

     async onWeWantCurrencyChange() {
          this.offerCurrency.selectWeWantCurrency(this.weWantCurrencyField, this.currentWallet);
          this.ammInfoTrigger.next();
     }

     async onWeSpendCurrencyChange() {
          this.offerCurrency.selectWeSpendCurrency(this.weSpendCurrencyField, this.currentWallet);
          this.ammInfoTrigger.next();
     }

     onWeWantIssuerChange() {
          this.offerCurrency.selectWeWantIssuer(this.weWantIssuerField, this.currentWallet);
          this.ammInfoTrigger.next();
     }

     onWeSpendIssuerChange() {
          this.offerCurrency.selectWeSpendIssuer(this.weSpendIssuerField, this.currentWallet);
          this.ammInfoTrigger.next();
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
