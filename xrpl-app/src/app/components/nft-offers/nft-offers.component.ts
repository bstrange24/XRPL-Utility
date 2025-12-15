import { OnInit, Component, inject, computed, DestroyRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { NFTokenAcceptOffer, NFTokenCreateOffer, NFTokenCancelOffer } from 'xrpl';
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
import { NavbarComponent } from '../navbar/navbar.component';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';

interface AccountFlags {
     asfRequireDest: boolean;
     asfRequireAuth: boolean;
     asfDisallowXRP: boolean;
     asfDisableMaster: boolean;
     asfNoFreeze: boolean;
     asfGlobalFreeze: boolean;
     asfDefaultRipple: boolean;
     asfDepositAuth: boolean;
     asfAllowTrustLineClawback: boolean;
     asfDisallowIncomingNFTokenOffer: boolean;
     asfDisallowIncomingCheck: boolean;
     asfDisallowIncomingPayChan: boolean;
     asfDisallowIncomingTrustline: boolean;
     asfAllowTrustLineLocking: boolean;
}

interface NftFlags {
     burnableNft: boolean;
     onlyXrpNft: boolean;
     trustLine: boolean;
     transferableNft: boolean;
     mutableNft: boolean;
}

interface BactchFlags {
     canLock: boolean;
     canClawback: boolean;
     isRequireAuth: boolean;
     canTransfer: boolean;
     canTrade: boolean;
     canEscrow: boolean;
}

interface IssuerItem {
     name: string;
     address: string;
}

@Component({
     selector: 'app-nft-offers',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './nft-offers.component.html',
     styleUrl: './nft-offers.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftOffersComponent extends PerformanceBaseComponent implements OnInit {
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

     // Destination Dropdown
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     checkIdSearchQuery = signal<string>('');

     // Reactive State (Signals)
     activeTab = signal<'buy' | 'sell' | 'buyOffer' | 'sellOffer' | 'cancelOffer'>('sell');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     amountField = signal<string>('');
     destinationField = signal<string>('');
     destinationTagField = signal<string>('');
     sourceTagField = signal<string>('');
     invoiceIdField = signal<string>('');
     currencyFieldDropDownValue = signal<string>('XRP');
     checkExpirationTime = signal<string>('seconds');
     issuerFields = signal<string>('');
     expirationTimeField = signal<string>('');
     ticketSequence = signal<string>('');
     checkIdField = signal<string>('');
     outstandingChecks = signal<string>('');
     mptIssuanceIdField = signal<string>('');
     isMptEnabled = signal(false);
     selectedWalletIndex = signal<number>(0);
     isTicketEnabled = signal<boolean>(false);
     existingMpts = signal<any[]>([]);
     existingIOUs = signal<any[]>([]);
     existingMptsCollapsed = signal<boolean>(true);
     outstandingIOUCollapsed = signal<boolean>(true);
     metaDataField = signal<string>('');
     tokenCountField = signal<string>('');
     assetScaleField = signal<string>('');
     isdepositAuthAddress = signal<boolean>(false);
     isMptFlagModeEnabled = signal<boolean>(false);
     transferFeeField = signal<string>('');
     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');
     currencyBalanceField = signal<string>('0');
     gatewayBalance = signal<string>('0');
     private readonly knownTrustLinesIssuers = signal<{ [key: string]: string[] }>({ XRP: [] });
     issuerToRemove = signal<string>('');
     currencies = signal<string[]>([]);
     userAddedCurrencyFieldDropDownValue = signal<string[]>([]);
     userAddedissuerFields = signal<string>('');
     allKnownIssuers = signal<string[]>([]);
     storedIssuers = signal<IssuerItem[]>([]);
     selectedIssuer = signal<string>('');
     newCurrency = signal<string>('');
     newIssuer = signal<string>('');
     tokenToRemove = signal<string>('');
     showTrustlineOptions = signal<boolean>(false);
     issuers = signal<{ name?: string; address: string }[]>([]);
     lastCurrency = signal<string>('');
     lastIssuer = signal<string>('');
     trustlineFlags: Record<string, boolean> = { ...AppConstants.TRUSTLINE.FLAGS };
     trustlineFlagList = AppConstants.TRUSTLINE.FLAG_LIST;
     flagMap = AppConstants.TRUSTLINE.FLAG_MAP;
     ledgerFlagMap = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;
     showManageTokens = signal<boolean>(false);
     encryptionType = signal<string>('');
     accountTrustlines = signal<any[]>([]);
     isUpdateMetaData = signal<boolean>(false);
     isUpdateNFTMetaData = signal<boolean>(false);
     isBatchModeEnabled = signal<boolean>(false);
     isNftFlagModeEnabled = signal<boolean>(false);
     isSubmitSignedTransactionEnabled = signal<boolean>(false);
     isDestinationEnabled = signal<boolean>(false);
     signedTransactionField = signal<string>('');
     isAuthorizedNFTokenMinter = signal<boolean>(false);
     isNFTokenMinterEnabled = signal<boolean>(false);
     nfTokenMinterAddress = signal<string>('');
     tickSize = signal<string>('');
     // selectedNft = signal<string | null>(null);
     isMessageKey = signal<boolean>(false);
     destinationFields = signal<string>('');
     newDestination = signal<string>('');
     tokenBalance = signal<string>('0');
     currencyIssuers: string[] = [];
     domain = signal<string>('');
     memo = signal<string>('');
     taxonField = signal<string>('');
     burnableNft = signal<{ checked: any } | undefined>(undefined);
     onlyXrpNft = signal<{ checked: any } | undefined>(undefined);
     transferableNft = signal<{ checked: any } | undefined>(undefined);
     mutableNft = signal<{ checked: any } | undefined>(undefined);
     batchMode: 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent' = 'allOrNothing';
     minterAddressField = signal<string>('');
     issuerAddressField = signal<string>('');
     expirationField = signal<string>('');
     expirationTimeUnit = signal<string>('seconds');
     initialURIField = signal<string>('https://ipfs.io/ipfs/bafybeigjro2d2tc43bgv7e4sxqg7f5jga7kjizbk7nnmmyhmq35dtz6deq');
     nftIdField = signal<string>('');
     nftIndexField = signal<string>('');
     nftCountField = signal<string>('');
     private nftFlagValues = {
          burnableNft: 0x00000001,
          onlyXrpNft: 0x00000002,
          trustLine: 0x00000004,
          transferableNft: 0x00000008,
          mutableNft: 0x00000010,
     };
     nftFlags: NftFlags = {
          burnableNft: false,
          onlyXrpNft: false,
          trustLine: false,
          transferableNft: false,
          mutableNft: false,
     };
     flags: AccountFlags = {
          asfRequireDest: false,
          asfRequireAuth: false,
          asfDisallowXRP: false,
          asfDisableMaster: false,
          asfNoFreeze: false,
          asfGlobalFreeze: false,
          asfDefaultRipple: false,
          asfDepositAuth: false,
          asfAllowTrustLineClawback: false,
          asfDisallowIncomingNFTokenOffer: false,
          asfDisallowIncomingCheck: false,
          asfDisallowIncomingPayChan: false,
          asfDisallowIncomingTrustline: false,
          asfAllowTrustLineLocking: false,
     };
     existingNfts = signal<any[]>([]);
     existingNftsCollapsed = signal<boolean>(true);
     nftOwnerAddress = signal<string>('');
     currencyChangeTrigger = signal(0);

     selectedNftOfferIndex = signal<string | null>(null);
     expirationDateTimeUnit = signal<string>('seconds');
     uriField = signal<string>('');
     existingSellOffers = signal<any[]>([]);
     existingBuyOffers = signal<any[]>([]);
     existingSellOffersCollapsed = signal<boolean>(true);

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

     currencyItems = computed(() => {
          const currentCode = this.currencyFieldDropDownValue();
          return this.availableCurrencies.map(curr => ({
               id: curr,
               display: curr === 'XRP' ? 'XRP' : curr,
               secondary:
                    curr === 'XRP'
                         ? 'Native currency'
                         : (() => {
                                const count = this.trustlineCurrency.getIssuersForCurrency(curr).length;
                                return count === 0 ? 'No issuers' : `${count} issuer${count !== 1 ? 's' : ''}`;
                           })(),
               isCurrentAccount: false,
               isCurrentCode: curr === currentCode, // This one!
               isCurrentToken: false,
          }));
     });

     selectedCurrencyItem = computed(() => {
          const code = this.currencyFieldDropDownValue();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     });

     onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id || 'XRP';
          this.currencyFieldDropDownValue.set(currency);
          this.onCurrencyChange(currency); // triggers issuer reload + balance update
     }

     destinations = computed(() => [
          ...this.wallets().map((w: DropdownItem) => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
          })),
          ...this.customDestinations(),
     ]);

     destinationDisplay = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return this.destinationSearchQuery(); // while typing → show typed text

          const dest = this.destinations().find(d => d.address === addr);
          if (!dest) return addr;

          return this.dropdownService.formatDisplay(dest);
     });

     filteredDestinations = computed(() => {
          const q = this.destinationSearchQuery().trim().toLowerCase();
          const list = this.destinations();

          if (q === '') {
               return list;
          }

          return this.destinations()
               .filter(d => d.address !== this.currentWallet().address)
               .filter(d => d.address.toLowerCase().includes(q) || (d.name ?? '').toLowerCase().includes(q));
     });

     hasWallets = computed(() => this.wallets().length > 0);

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const baseUrl = this.txUiService.explorerUrl();
          const address = wallet.address;

          let offers: any[] = [];
          switch (this.activeTab()) {
               case 'buy':
               case 'buyOffer':
                    offers = this.existingBuyOffers();
                    break;
               case 'sell':
               case 'sellOffer':
               case 'cancelOffer':
                    offers = this.existingSellOffers();
                    break;
          }

          const count = offers.length;

          const links = count > 0 ? `<a href="${baseUrl}account/${address}/nft-offers" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View Offers</a>` : '';

          const offersToShow = this.infoPanelExpanded()
               ? offers.map(o => ({
                      index: o.OfferIndex || o.nft_offer_index,
                      nftId: o.NFTokenID || o.nftId,
                      amount: typeof o.Amount === 'string' ? xrpl.dropsToXrp(o.Amount) + ' XRP' : o.Amount,
                      counterparty: o.Owner || o.owner || o.Destination || o.buyer,
                      isSell: !!(o.Flags & 1),
                      expiration: o.Expiration,
                 }))
               : [];

          return {
               walletName,
               activeTab: this.activeTab(),
               offerCount: count,
               offersToShow,
               links,
          };
     });

     // Offer Dropdown Items
     offerItems = computed(() => {
          return this.existingSellOffers().map(o => ({
               id: o.OfferIndex,
               display: `${xrpl.dropsToXrp(o.Amount)} XRP offer`,
               secondary: o.NFTokenID.slice(0, 12) + '...' + o.NFTokenID.slice(-10),
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
          }));
     });

     selectedOfferItem = computed(() => {
          const id = this.nftIndexField();
          if (!id) return null;
          return this.offerItems().find(i => i.id === id) || null;
     });

     onOfferSelected(item: SelectItem | null) {
          this.nftIndexField.set(item?.id || '');
     }

     issuerItems = computed(() => {
          const currentIssuer = this.trustlineCurrency.getSelectedIssuer();
          return this.issuers().map((iss, i) => ({
               id: iss.address,
               display: iss.name || `Issuer ${i + 1}`,
               secondary: iss.address.slice(0, 7) + '...' + iss.address.slice(-7),
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: iss.address === currentIssuer, // This one!
          }));
     });

     selectedIssuerAddress = computed(() => this.trustlineCurrency.getSelectedIssuer());

     selectedIssuerItem = computed(() => {
          const addr = this.trustlineCurrency.getSelectedIssuer(); // ← read directly from service
          if (!addr) return null;
          return this.issuerItems().find((item: { id: string }) => item.id === addr) || null;
     });

     onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrency.selectIssuer(address);
          this.onIssuerChange(address); // your existing logic runs
     }

     // NFT Dropdown Items
     nftItems = computed(() => {
          return this.existingNfts().map((nft: { NFTokenID: string; URI: any }) => ({
               id: nft.NFTokenID,
               display: nft.URI ? `NFT • ${nft.URI}` : 'NFT • No URI',
               secondary: nft.NFTokenID.slice(0, 12) + '...' + nft.NFTokenID.slice(-10),
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
          }));
     });

     selectedNftItem = computed(() => {
          const id = this.nftIdField();
          if (!id) return null;
          return this.nftItems().find((i: { id: string }) => i.id === id) || null;
     });

     onNftSelected(item: SelectItem | null) {
          this.nftIdField.set(item?.id || '');
     }

     // Time Unit Dropdown
     timeUnitItems = computed(() => [
          { id: 'seconds', display: 'Seconds' },
          { id: 'minutes', display: 'Minutes' },
          { id: 'hours', display: 'Hours' },
          { id: 'days', display: 'Days' },
     ]);

     selectedTimeUnitItem = computed(() => {
          const unit = this.expirationTimeUnit();
          return this.timeUnitItems().find(i => i.id === unit) || null;
     });

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.loadKnownIssuers();
          this.refreshStoredIssuers();
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.currencyFieldDropDownValue.set('XRP');

          // Subscribe once
          this.trustlineCurrency.currencies$.subscribe(currencies => {
               this.currencies.set(currencies);
               if (currencies.length > 0 && !this.currencyFieldDropDownValue()) {
                    this.currencyFieldDropDownValue.set(currencies[0]);
                    this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue(), this.currentWallet().address);
               }
          });

          this.trustlineCurrency.issuers$.subscribe(issuers => {
               this.issuers.set(issuers);
          });

          this.trustlineCurrency.selectedIssuer$.subscribe(issuer => {
               this.issuerFields.set(issuer);
          });

          this.trustlineCurrency.balance$.subscribe(balance => {
               this.currencyBalanceField.set(balance); // ← This is your live balance!
          });
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
                         this.clearFields(true);
                         this.selectWallet(wallet);
                    }
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.clearFields(true);
                    await this.getNFTOffers(true);
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          // Clear NFT state when switching wallets
          this.existingNfts.set([]);
          this.nftIdField.set('');
          // this.selectedNft = null;

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

     onSelectNftOfferIndex(nftOfferIndex: string | null) {
          this.selectedNftOfferIndex.set(nftOfferIndex);
          this.nftIndexField.set(nftOfferIndex ?? '');
     }

     trackByOfferIndex(index: number, offer: any): string {
          return offer.OfferIndex;
     }

     toggleExistingNfts() {
          this.existingNftsCollapsed.set(!this.existingNftsCollapsed);
     }

     toggleExistingSellOffers() {
          this.existingSellOffersCollapsed.set(!this.existingSellOffersCollapsed);
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(v => !v);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     async setTab(tab: 'buy' | 'sell' | 'buyOffer' | 'sellOffer' | 'cancelOffer'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          if (Object.keys(this.knownTrustLinesIssuers).length > 0 && this.issuerFields() === '') {
               this.currencyFieldDropDownValue.set(Object.keys(this.knownTrustLinesIssuers)[0]);
          }

          this.clearFields(true);
          if (this.hasWallets()) {
               await this.getNFTOffers(true);
          }
     }

     toggleFlags() {}

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getNFTOffers(forceRefresh = false): Promise<void> {
          await this.withPerf('getNFTOffers', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const { accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse } = await this.getNftOfferDetails(client, wallet);
                    this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
                    this.utilsService.logObjects('nftInfo', nftInfo);
                    this.utilsService.logObjects('sellOffersResponse', sellOffersResponse);
                    this.utilsService.logObjects('buyOffersResponse', buyOffersResponse);

                    // this.getExistingSellOffers(sellOffersResponse);
                    // this.getExistingBuyOffers(buyOffersResponse);
                    this.getExistingSellOffers(accountObjects);
                    this.getExistingBuyOffers(accountObjects);
                    this.getExistingNfts(accountObjects, this.currentWallet().address);

                    if (this.currencyFieldDropDownValue() !== 'XRP' && this.currencyFieldDropDownValue() !== 'MPT' && this.issuerFields() !== '') {
                         this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue(), this.currentWallet().address);
                    }

                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getNFT:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async buyNFT() {
          console.log('Entering buyNFT');
          await this.withPerf('mintNFT', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [accountInfo, sellOffersResponse, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getNFTSellOffers(client, this.nftIdField()), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    this.utilsService.logAccountInfoObjects(accountInfo, null);
                    this.utilsService.logObjects('sellOffersResponse', sellOffersResponse);
                    this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = this.validateInputs(inputs, 'buyNFT');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    const sellOffer = sellOffersResponse.result?.offers || [];
                    if (!Array.isArray(sellOffer) || sellOffer.length === 0) {
                         this.txUiService.setError(`No sell offers found for this NFT ${this.nftIdField}`);
                         return;
                    }

                    // Filter offers where:
                    // - no Destination is specified (anyone can buy)
                    // - OR destination matches our wallet
                    // - And price is valid
                    const validOffers = sellOffer.filter(offer => {
                         const isUnrestricted = !offer.Destination;
                         const isTargeted = offer.Destination === wallet.classicAddress;
                         return (isUnrestricted || isTargeted) && offer.amount;
                    });

                    if (validOffers.length === 0) {
                         this.txUiService.setError('No matching sell offers found for this wallet.');
                         return;
                    }

                    // Sort by lowest price
                    validOffers.sort((a, b) => parseInt(a.amount) - parseInt(b.amount));

                    const matchingOffers = sellOffer.filter(o => o.amount && o.flags === 1); // 1 = tfSellNFToken
                    console.log('Matching Offers:', matchingOffers);

                    const selectedOffer = validOffers[0];
                    console.log('First sell offer:', validOffers[0]);

                    if (selectedOffer && selectedOffer.Destination) {
                         this.txUiService.setError(`This NFT is only purchasable by: ${selectedOffer.Destination}`);
                         return;
                    }

                    if (selectedOffer && selectedOffer.owner === wallet.classicAddress) {
                         this.txUiService.setError('You already own this NFT.');
                         return;
                    }

                    const nFTokenAcceptOfferTx: NFTokenAcceptOffer = {
                         TransactionType: 'NFTokenAcceptOffer',
                         Account: wallet.classicAddress,
                         NFTokenSellOffer: selectedOffer.nft_offer_index,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, nFTokenAcceptOfferTx, wallet, accountInfo, 'buy');

                    const result = await this.txExecutor.createBuyNft(nFTokenAcceptOfferTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated NFT buy offer created successfully!' : 'Created NFT buy offer successfully!';
                    this.onCurrencyChange(this.currencyFieldDropDownValue());
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in buyNFT:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async sellNFT() {
          await this.withPerf('sellNFT', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    this.utilsService.logAccountInfoObjects(accountInfo, null);
                    this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = this.validateInputs(inputs, 'sellNFT');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    const nFTokenCreateOfferTx: NFTokenCreateOffer = {
                         TransactionType: 'NFTokenCreateOffer',
                         Account: wallet.classicAddress,
                         NFTokenID: this.nftIdField(),
                         Amount: xrpl.xrpToDrops(this.amountField()),
                         Flags: 1, // Sell offer,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    if (this.currencyFieldDropDownValue() !== 'XRP') {
                         const curr: xrpl.IssuedCurrencyAmount = {
                              currency: this.currencyFieldDropDownValue().length > 3 ? this.utilsService.encodeCurrencyCode(this.currencyFieldDropDownValue()) : this.currencyFieldDropDownValue(),
                              issuer: this.selectedIssuer(),
                              value: this.amountField(),
                         };
                         nFTokenCreateOfferTx.Amount = curr;
                    } else {
                         nFTokenCreateOfferTx.Amount = xrpl.xrpToDrops(this.amountField());
                    }

                    await this.setTxOptionalFields(client, nFTokenCreateOfferTx, wallet, accountInfo, 'sell');

                    const result = await this.txExecutor.createSellNft(nFTokenCreateOfferTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated NFT sell offer created successfully!' : 'Created NFT sell offer successfully!';
                    this.onCurrencyChange(this.currencyFieldDropDownValue());
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in sellNFT:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createOffer(offerType: 'Buy' | 'Sell') {
          await this.withPerf('createOffer', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, serverInfo, nftInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', ''), this.xrplService.getNFTSellOffers(client, this.nftIdField())]);
                    this.utilsService.logAccountInfoObjects(accountInfo, null);
                    this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = this.validateInputs(inputs, 'buyNFT');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    if (!nftInfo || nftInfo.result?.offers?.length <= 0) {
                         return this.txUiService.setError(`No NFT offers for ${this.nftIdField}`);
                    }

                    const nFTokenCreateOfferTx: NFTokenCreateOffer = {
                         TransactionType: 'NFTokenCreateOffer',
                         Account: wallet.classicAddress,
                         NFTokenID: this.nftIdField(),
                         Amount: '',
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    if (this.currencyFieldDropDownValue() !== 'XRP') {
                         const curr: xrpl.IssuedCurrencyAmount = {
                              currency: this.currencyFieldDropDownValue().length > 3 ? this.utilsService.encodeCurrencyCode(this.currencyFieldDropDownValue()) : this.currencyFieldDropDownValue(),
                              issuer: this.selectedIssuer(),
                              value: this.amountField(),
                         };
                         nFTokenCreateOfferTx.Amount = curr;
                    } else {
                         nFTokenCreateOfferTx.Amount = xrpl.xrpToDrops(this.amountField());
                    }

                    await this.setTxOptionalFields(client, nFTokenCreateOfferTx, wallet, accountInfo, 'sell');

                    if (offerType === 'Buy') {
                         nFTokenCreateOfferTx.Flags = 0;
                         nFTokenCreateOfferTx.Owner = nftInfo.result.offers[0].owner;
                    } else {
                         nFTokenCreateOfferTx.Flags = 1;
                    }

                    const result = await this.txExecutor.createNftOffer(nFTokenCreateOfferTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated NFT offer created successfully!' : 'Created NFT offer successfully!';
                    this.onCurrencyChange(this.currencyFieldDropDownValue());
                    await this.refreshAfterTx(client, wallet, null, true);
               } catch (error: any) {
                    console.error('Error in createOffer:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async cancelOffer() {
          await this.withPerf('cancelOffer', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, null);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = this.validateInputs(inputs, 'cancelSell');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    const nFTokenCancelOfferTx: NFTokenCancelOffer = {
                         TransactionType: 'NFTokenCancelOffer',
                         Account: wallet.classicAddress,
                         NFTokenOffers: [this.nftIndexField()],
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, nFTokenCancelOfferTx, wallet, accountInfo, 'cancelSellOffer');

                    const result = await this.txExecutor.cancelNftOffer(nFTokenCancelOfferTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated NFT offer cancel successfully!' : 'Cancelled NFT offer successfully!';

                    this.onCurrencyChange(this.currencyFieldDropDownValue());
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in cancelOffer:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private getExistingNfts(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const nftPages = (checkObjects?.result?.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'NFTokenPage');

          // Flatten all NFTokens from all pages
          const allNfts = nftPages.flatMap((page: any) => {
               return page.NFTokens.map((entry: any) => {
                    const nft = entry.NFToken;

                    return {
                         LedgerEntryType: page.LedgerEntryType,
                         PageIndex: page.index,
                         NFTokenID: nft.NFTokenID,
                         Flags: nft.Flags ?? 0,
                         Issuer: nft.Issuer,
                         Taxon: nft.NFTaxon,
                         TransferFee: nft.TransferFee,
                         Sequence: nft.Sequence,
                         URI_hex: nft.URI,
                         URI: nft.URI ? this.utilsService.decodeHex(nft.URI) : null,
                    };
               });
          });

          this.existingNfts.set(allNfts);
          this.utilsService.logObjects('existingNfts', this.existingNfts());
          return this.existingNfts();
     }

     private getExistingSellOffers(accountObjects: xrpl.AccountObjectsResponse) {
          const offers = (accountObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'NFTokenOffer' && (obj.Flags & 1) === 1) // tfSellNFToken
               .map((obj: any) => ({
                    OfferIndex: obj.index,
                    NFTokenID: obj.NFTokenID,
                    Amount: obj.Amount,
                    Owner: obj.Owner,
                    Destination: obj.Destination,
                    Expiration: obj.Expiration,
                    Flags: obj.Flags,
               }));

          this.existingSellOffers.set(offers);
          this.utilsService.logObjects('existingSellOffers (from account_objects)', offers);
     }

     private getExistingBuyOffers(accountObjects: xrpl.AccountObjectsResponse) {
          const offers = (accountObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'NFTokenOffer' && (obj.Flags & 1) === 0) // Buy offer
               .map((obj: any) => ({
                    OfferIndex: obj.index,
                    NFTokenID: obj.NFTokenID,
                    Amount: obj.Amount,
                    Owner: obj.Owner,
                    Destination: obj.Destination,
                    Expiration: obj.Expiration,
                    Flags: obj.Flags,
               }));

          this.existingBuyOffers.set(offers);
          this.utilsService.logObjects('existingBuyOffers (from account_objects)', offers);
     }

     private getExistingSellOffers1(sellOfferData: any) {
          if (sellOfferData.length > 0) {
               const allSellOffers = sellOfferData.flatMap((nft: any) => {
                    return nft.offers.map((offer: any) => {
                         return {
                              LedgerEntryType: 'NFTokenOffer',
                              NFTokenID: nft.nftId,
                              OfferIndex: offer.nft_offer_index,
                              AmountDrops: offer.amount,
                              AmountXRP: xrpl.dropsToXrp(offer.amount),
                              Flags: offer.flags ?? 0,
                              Owner: offer.owner,
                              IsSellOffer: (offer.flags & 1) === 1,
                         };
                    });
               });

               this.existingSellOffers.set(allSellOffers);
          }
          this.utilsService.logObjects('existingSellOffers', this.existingSellOffers());
          return this.existingSellOffers();
     }

     private getExistingBuyOffers1(checkObjects: any) {
          if (checkObjects && checkObjects?.result?.offers?.length > 0) {
               const nftPages = (checkObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'NFTokenPage');

               // Flatten all NFTokens from all pages
               const allNfts = nftPages.flatMap((page: any) => {
                    return page.NFTokens.map((entry: any) => {
                         const nft = entry.NFToken;

                         return {
                              LedgerEntryType: page.LedgerEntryType,
                              PageIndex: page.index,
                              NFTokenID: nft.NFTokenID,
                              Flags: nft.Flags ?? 0,
                              Issuer: nft.Issuer,
                              Taxon: nft.NFTaxon,
                              TransferFee: nft.TransferFee,
                              Sequence: nft.Sequence,
                              URI_hex: nft.URI,
                              URI: nft.URI ? this.utilsService.decodeHex(nft.URI) : null,
                         };
                    });
               });

               this.existingBuyOffers.set(allNfts);
          }
          this.utilsService.logObjects('existingBuyOffers', this.existingBuyOffers());
          return this.existingBuyOffers();
     }

     decodeNftFlags(value: number): string {
          const active: string[] = [];
          for (const [name, bit] of Object.entries(AppConstants.NFT_FLAGS)) {
               if ((value & bit) !== 0) {
                    active.push(name);
               }
          }
          return active.join(', ');
     }

     decodeOfferFlags(value: number): string[] {
          const active: string[] = [];

          for (const [name, bit] of Object.entries(AppConstants.NFT_FLAGS)) {
               if ((value & bit) !== 0) {
                    active.push(name);
               }
          }

          return active;
     }

     private async getNftOfferDetails(client: any, wallet: any) {
          if (this.nftIdField) {
               // Single NFT mode - returns { result: { offers: [...] } }
               const [accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse, nftAccountOffers] = await Promise.all([
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } })),
                    this.xrplService.getNFTSellOffers(client, this.nftIdField()).catch(() => ({ result: { offers: [] } })),
                    this.xrplService.getNFTBuyOffers(client, this.nftIdField()).catch(() => ({ result: { offers: [] } })),
                    this.xrplService.getAccountNFTOffers(client, wallet.classicAddress, 'validated', 'nft_offer').catch(() => ({ result: { account_nfts: [] } })),
               ]);

               // Filter only sell offers (Flags = 1) and buy offers (Flags = 0)
               const s = this.filterSellOffers(nftAccountOffers, wallet);
               const b = this.filterBuyOffers(nftAccountOffers, wallet);

               return { accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse, s, b };
          } else {
               const [accountInfo, accountObjects, nftInfo, nftAccountOffers] = await Promise.all([
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } })),
                    this.xrplService.getAccountNFTOffers(client, wallet.classicAddress, 'validated', 'nft_offer').catch(() => ({ result: { account_nfts: [] } })),
               ]);

               const nfts = nftInfo.result.account_nfts;
               if (nfts.length === 0) {
                    return { accountInfo, accountObjects, nftInfo, sellOffersResponse: [], buyOffersResponse: [] };
               }

               // CREATE ALL PROMISES FIRST
               const buyOfferPromises = this.createBuyOfferPromises(nfts, client);
               const sellOfferPromises = this.createSellOfferPromises(nfts, client);

               // AWAIT ALL PROMISES IN PARALLEL
               const [buyOffersResponses, sellOffersResponses] = await Promise.all([Promise.all(buyOfferPromises), Promise.all(sellOfferPromises)]);

               const buyOffersResponse = this.createBuyOffersResponse(nfts, buyOffersResponses);
               const sellOffersResponse = this.createSellOffersResponse(nfts, sellOffersResponses);
               this.utilsService.logObjects('buyOffersResponse', buyOffersResponse);
               this.utilsService.logObjects('sellOffersResponse', sellOffersResponse);

               // Filter only sell offers (Flags = 1) and buy offers (Flags = 0)
               const s = this.filterSellOffers(nftAccountOffers, wallet);
               const b = this.filterBuyOffers(nftAccountOffers, wallet);
               this.utilsService.logObjects('s', s);
               this.utilsService.logObjects('b', b);

               const mergedBuyOffersResponse = this.mergeOffers(buyOffersResponse, b);
               const mergedSellOffersResponse = this.mergeOffers(sellOffersResponse, s);
               // const mergedBuyOffersResponse = this.mergeByNftId(buyOffersResponse, b, false);
               // const mergedSellOffersResponse = this.mergeByNftId(sellOffersResponse, s, true);
               this.utilsService.logObjects('mergedBuyOffersResponse', mergedBuyOffersResponse);
               this.utilsService.logObjects('mergedSellOffersResponse', mergedSellOffersResponse);

               // return { accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse };
               return { accountInfo, accountObjects, nftInfo, sellOffersResponse: mergedSellOffersResponse, buyOffersResponse: mergedBuyOffersResponse };
          }
     }

     private createSellOffersResponse(nfts: any, sellOffersResponses: any[]) {
          return nfts.map((nft: any, index: any) => ({
               nftId: nft.NFTokenID,
               offers: sellOffersResponses[index]?.result?.offers || [],
          }));
     }

     private createBuyOffersResponse(nfts: any, buyOffersResponses: any[]) {
          return nfts.map((nft: any, index: any) => ({
               nftId: nft.NFTokenID,
               offers: buyOffersResponses[index]?.result?.offers || [],
          }));
     }

     private createSellOfferPromises(nfts: any, client: any) {
          return nfts.map((nft: any) =>
               this.xrplService.getNFTSellOffers(client, nft.NFTokenID).catch(err => {
                    console.warn(`Sell offers error for ${nft.NFTokenID}:`, err.message);
                    return { result: { offers: [] } };
               })
          );
     }

     private createBuyOfferPromises(nfts: any, client: any) {
          return nfts.map((nft: any) =>
               this.xrplService.getNFTBuyOffers(client, nft.NFTokenID).catch(err => {
                    console.warn(`Buy offers error for ${nft.NFTokenID}:`, err.message);
                    return { result: { offers: [] } };
               })
          );
     }

     private filterBuyOffers(nftAccountOffers: any, wallet: any) {
          const sells = nftAccountOffers.result.account_objects.filter((obj: any) => {
               return obj.LedgerEntryType === 'NFTokenOffer' && obj.Flags === 0;
          });

          const b = sells.map((o: any) => ({
               nftOfferIndex: o.index,
               nftId: o.NFTokenID,
               amount: o.Amount,
               owner: o.Owner, // the NFT’s current owner (seller)
               buyer: wallet.classicAddress, // the account that submitted this offer
               expiration: o.Expiration ?? null,
          }));
          return b;
     }

     private filterSellOffers(nftAccountOffers: any, wallet: any) {
          const buys = nftAccountOffers.result.account_objects.filter((obj: any) => {
               return obj.LedgerEntryType === 'NFTokenOffer' && obj.Flags === 1;
          });

          const s = buys.map((o: any) => ({
               nftOfferIndex: o.index,
               nftId: o.NFTokenID,
               amount: o.Amount,
               seller: wallet.classicAddress, // the account that submitted this offer
               buyer: o.Destination ?? null, // optional target buyer
               expiration: o.Expiration ?? null,
          }));
          return s;
     }

     private mergeOffers(existingResponses: any[], newOffers: any[]) {
          // Flatten all existing offer indices
          const existingIndices = new Set(existingResponses.flatMap(r => r.offers.map((o: any) => o.nftOfferIndex || o.nft_offer_index)));

          // Filter new offers to only those not already in existingIndices
          const filteredNewOffers = newOffers.filter(o => !existingIndices.has(o.nftOfferIndex));

          if (filteredNewOffers.length > 0) {
               return [
                    ...existingResponses,
                    {
                         nftId: 'account_level', // marker bucket for account_objects
                         offers: filteredNewOffers,
                    },
               ];
          }
          return existingResponses;
     }

     private mergeByNftId(existingResponses: any[], newOffers: any[], isSell: boolean) {
          // Clone so we don't mutate original
          const merged = [...existingResponses];

          for (const offer of newOffers) {
               const nftId = offer.nftId;

               // Find existing entry for this NFT
               let existing = merged.find(r => r.nftId === nftId);
               if (!existing) {
                    // No entry yet → create it
                    existing = { nftId, offers: [] };
                    merged.push(existing);
               }

               // Collect existing offer indices
               const existingIndices = new Set(existing.offers.map((o: any) => o.nftOfferIndex || o.index));

               // Only push if not already there
               if (!existingIndices.has(offer.nftOfferIndex)) {
                    existing.offers.push(offer);
               }
          }

          return merged;
     }

     setBatchFlags() {
          let flags = 0;
          if (this.batchMode === 'allOrNothing') {
               flags |= AppConstants.BATCH_FLAGS.ALL_OR_NOTHING;
          }

          if (this.batchMode === 'onlyOne') {
               flags |= AppConstants.BATCH_FLAGS.ONLY_ONE;
          }

          if (this.batchMode === 'untilFailure') {
               flags |= AppConstants.BATCH_FLAGS.UNTIL_FAILURE;
          }

          if (this.batchMode === 'independent') {
               flags |= AppConstants.BATCH_FLAGS.INDEPENDENT;
          }

          console.log('Batch flags ' + flags);
          return flags;
     }

     get availableCurrencies(): string[] {
          return [
               'XRP',
               ...Object.keys(this.knownTrustLinesIssuers())
                    .filter(c => c && c !== 'XRP' && c !== 'MPT')
                    .sort((a, b) => a.localeCompare(b)),
          ];
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, nftTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string): Promise<string | void> {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(nftTx, ticket, true);
               }
          }

          // --- Helper: set expiration ---
          const setExpiration = (): boolean => {
               if (this.expirationField()) {
                    const expireTime = this.utilsService.addTime(this.expirationField(), 'hours');
                    this.utilsService.setExpiration(nftTx, expireTime);
                    return true;
               }
               return false;
          };

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(nftTx, this.txUiService.memoField());
          }

          if (['sell'].includes(txType)) {
               setExpiration();
          }

          return nftTx;
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          // const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          const { accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse } = await this.getNftOfferDetails(client, wallet);
          this.getExistingSellOffers(accountObjects);
          this.getExistingBuyOffers(accountObjects);
          // this.getExistingSellOffers(sellOffersResponse);
          // this.getExistingBuyOffers(buyOffersResponse);
          this.getExistingNfts(accountObjects, wallet.classicAddress);
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest) this.addNewDestinationFromUser(destination || '');
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

     setBatchMode(mode: 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent') {
          this.batchMode = mode;
          this.toggleFlags(); // optional: update your XRPL batch flags
     }

     onBurnToggle(checked: boolean, nftId: string) {
          // normalize current ids
          const ids = (this.nftIdField() || '')
               .split(',')
               .map(s => s.trim())
               .filter(Boolean);

          if (checked) {
               if (!ids.includes(nftId)) ids.push(nftId);
          } else {
               // remove
               const idx = ids.indexOf(nftId);
               if (idx !== -1) ids.splice(idx, 1);
          }

          this.nftIdField.set(ids.join(', '));
     }

     updateNftTextField(nftId: string, add: boolean) {
          let ids = (this.nftIdField() || '')
               .split(',')
               .map(s => s.trim())
               .filter(Boolean);

          if (add && !ids.includes(nftId)) {
               ids.push(nftId);
          } else if (!add) {
               ids = ids.filter(id => id !== nftId);
          }

          this.nftIdField.set(ids.join(', '));
     }

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
     }

     copyNFTokenID(NFTokenID: string) {
          navigator.clipboard.writeText(NFTokenID).then(() => {
               this.txUiService.showToastMessage('MPT Issuance ID copied!');
          });
     }

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Check ID copied!');
          });
     }

     copyIOUIssuanceAddress(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.txUiService.showToastMessage('IOU Token Issuer copied!');
          });
     }

     formatXrplTimestamp(timestamp: number): string {
          return this.utilsService.convertXRPLTime(timestamp);
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.isBatchModeEnabled.set(false);
               this.isNftFlagModeEnabled.set(false);
          }

          this.amountField.set('');
          this.minterAddressField.set('');
          this.expirationField.set('');
          this.nftIdField.set('');
          this.nftIndexField.set('');
          this.nftCountField.set('');
          this.ticketSequence.set('');
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     private loadKnownIssuers() {
          const data = this.storageService.getKnownIssuers('knownIssuers');
          if (data) {
               this.knownTrustLinesIssuers.set(data);
               this.updateCurrencies();
          }
     }

     onCurrencyChange(currency: string) {
          this.trustlineCurrency.selectCurrency(currency, this.currentWallet().address);
          this.currencyChangeTrigger.update(n => n + 1); // ← forces dropdown reset
     }

     onIssuerChange(issuer: string) {
          this.trustlineCurrency.selectIssuer(issuer);
     }

     private refreshStoredIssuers() {
          const issuers: IssuerItem[] = [];
          const knownIssuers = this.knownTrustLinesIssuers();

          for (const currency in knownIssuers) {
               if (currency === 'XRP') continue;
               for (const address of knownIssuers[currency]) {
                    issuers.push({
                         name: currency,
                         address: address,
                    });
               }
          }
          // Optional: sort by currency
          issuers.sort((a: IssuerItem, b: IssuerItem) => a.name.localeCompare(b.name));
          this.storedIssuers.set(issuers);
     }

     private updateCurrencies() {
          // Get all currencies except XRP
          const allCurrencies = Object.keys(this.knownTrustLinesIssuers);
          const filtered = allCurrencies.filter(c => c !== 'XRP');
          // allCurrencies.push('MPT');

          // Sort alphabetically
          const sorted = filtered.sort((a, b) => a.localeCompare(b));
          this.currencies.set(sorted);

          // AUTO-SELECT FIRST CURRENCY — SAFE WAY
          if (sorted.length > 0) {
               // Only set if nothing is selected OR current selection is invalid/removed
               const shouldSelectFirst = !this.currencyFieldDropDownValue() || !sorted.includes(this.currencyFieldDropDownValue());

               if (shouldSelectFirst) {
                    this.currencyFieldDropDownValue.set(sorted[0]);
                    // Trigger issuer load — but do it in next tick so binding is ready
                    Promise.resolve().then(() => {
                         if (this.currencyFieldDropDownValue()) {
                              this.onCurrencyChange(this.currencyFieldDropDownValue());
                         }
                    });
               }
          } else {
               // No currencies left
               this.currencyFieldDropDownValue.set('');
               this.issuerFields.set('');
               this.issuers.set([]);
          }
     }
}
