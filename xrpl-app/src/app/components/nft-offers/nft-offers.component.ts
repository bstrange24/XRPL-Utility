import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, NgZone } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { NFTokenAcceptOffer, NFTokenCreateOffer, NFTokenCancelOffer } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { BatchService } from '../../services/batch/batch-service.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { AppWalletDynamicInputComponent } from '../app-wallet-dynamic-input/app-wallet-dynamic-input.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { LucideAngularModule } from 'lucide-angular';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged, pairwise, startWith } from 'rxjs/operators';
import { NgIcon } from '@ng-icons/core';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { TemplatePortal } from '@angular/cdk/portal';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
declare var Prism: any;

interface ValidationInputs {
     selectedAccount?: string;
     senderAddress?: string;
     seed?: string;
     accountInfo?: any;
     destination?: string;
     nft_info?: any;
     nftIdField?: string;
     uri?: string;
     batchMode?: string;
     amount?: string;
     nftIndexField?: string;
     nftCountField?: string;
     issuerAddressField?: string;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeySeed?: string;
     useMultiSign?: boolean;
     multiSignSeeds?: string;
     multiSignAddresses?: string;
     isTicket?: boolean;
     ticketSequence?: string;
     selectedSingleTicket?: string;
     selectedTicket?: string;
     signerQuorum?: number;
     signers?: { account: string; weight: number }[];
}

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

interface IssuerItem {
     name: string;
     address: string;
}

@Component({
     selector: 'app-nft-offers',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './nft-offers.component.html',
     styleUrl: './nft-offers.component.css',
})
export class NftOffersComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     @ViewChild('accountForm') accountForm!: NgForm;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('signers') signersRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChild('seeds') seedsRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChildren('signers, seeds') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef; // We'll add this to the input
     private overlayRef: OverlayRef | null = null;
     private issuerFieldSubject = new Subject<void>();
     private destinationInputSubject = new Subject<string>();
     private readonly injector = inject(Injector);
     executionTime: string = '';
     destinationTagField: string = '';
     useMultiSign: boolean = false;
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
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
     tokenBalance: string = '0';
     gatewayBalance: string = '0';
     currencyFieldDropDownValue: string = 'XRP';
     private knownTrustLinesIssuers: { [key: string]: string[] } = { XRP: [] };
     issuerToRemove: string = '';
     issuerFields: string = '';
     currencies: string[] = [];
     selectedIssuer: string = '';
     domain: string = '';
     memo: string = '';
     memoField: string = '';
     isMemoEnabled: boolean = false;
     isRegularKeyAddress: boolean = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     isTicket: boolean = false;
     isTicketEnabled: boolean = false;
     ticketSequence: string = '';
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     signerQuorum: number = 0;
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     expirationDateTimeUnit: string = 'seconds';
     burnableNft: { checked: any } | undefined;
     onlyXrpNft: { checked: any } | undefined;
     transferableNft: { checked: any } | undefined;
     mutableNft: { checked: any } | undefined;
     batchMode: 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent' = 'allOrNothing';
     amountField: string = '0';
     minterAddressField: string = '';
     issuerAddressField: string = '';
     expirationField: string = '';
     expirationTimeUnit: string = 'seconds';
     // uriField: string = 'https://ipfs.io/ipfs/bafybeigjro2d2tc43bgv7e4sxqg7f5jga7kjizbk7nnmmyhmq35dtz6deq';
     // uriField: string = 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjhubGpubms0bXl5ZzM0cWE4azE5aTlyOHRyNmVhd2prcDc1am43ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/NxwglXLqMeOuRF3FHv/giphy.gif';
     uriField: string = '';
     initialURIField: string = '';
     nftIdField: string = '';
     nftIndexField: string = '';
     nftCountField: string = '';
     masterKeyDisabled: boolean = false;
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
     destinationField: string = '';
     destinations: { name?: string; address: string }[] = [];
     customDestinations: { name?: string; address: string }[] = [];
     showDropdown = false;
     dropdownOpen = false;
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;
     allKnownIssuers: string[] = [];
     storedIssuers: IssuerItem[] = [];
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     private burnCheckboxHandlerBound!: (e: Event) => void;
     wallets: Wallet[] = [];
     selectedWalletIndex: number = 0;
     currentWallet: Wallet = {
          classicAddress: '',
          address: '',
          seed: '',
          name: undefined,
          balance: '0',
          ownerCount: undefined,
          xrpReserves: undefined,
          spendableXrp: undefined,
     };
     tokenToRemove: string = '';
     currencyIssuers: { name?: string; address: string }[] = [];
     issuers: { name?: string; address: string }[] = [];
     private lastCurrency: string = '';
     private lastIssuer: string = '';
     showManageTokens: boolean = false;
     totalFlagsValue = 0;
     totalFlagsHex = '0x0';
     showSecret: boolean = false;
     environment: string = '';
     activeTab = 'sell'; // default
     encryptionType: string = '';
     hasWallets: boolean = true;
     existingNfts: any = [];
     existingSellOffers: any = [];
     existingBuyOffers: any = [];
     existingNftsCollapsed: boolean = true;
     existingSellOffersCollapsed: boolean = true;
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     filterQuery: string = '';
     nftOwnerAddress: string = '';
     private accountDataCache = new Map<
          string,
          {
               accountObjects?: xrpl.AccountObjectsResponse;
               tokenBalance?: xrpl.GatewayBalancesResponse;
               timestamp: number;
          }
     >();

     constructor(
          private readonly xrplService: XrplService,
          private readonly utilsService: UtilsService,
          private ngZone: NgZone,
          private readonly cdr: ChangeDetectorRef,
          private readonly storageService: StorageService,
          private readonly batchService: BatchService,
          private readonly xrplTransactions: XrplTransactionService,
          private walletGenerator: WalletGeneratorService,
          private walletManagerService: WalletManagerService,
          public ui: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private validationService: ValidationService,
          private overlay: Overlay,
          private viewContainerRef: ViewContainerRef,
          private destinationDropdownService: DestinationDropdownService
     ) {
          this.burnCheckboxHandlerBound = (e: Event) => this.burnCheckboxHandler(e);
     }

     async ngOnInit(): Promise<void> {
          this.getKnownIssuersFromLocalStorage();
          this.currencyFieldDropDownValue = 'XRP'; // Set default to XRP

          this.environment = this.xrplService.getNet().environment;
          this.encryptionType = this.storageService.getInputValue('encryptionType');

          this.editingIndex = this.walletManagerService.isEditing.bind(this.walletManagerService);

          type EnvKey = keyof typeof AppConstants.XRPL_WIN_URL;
          const env = this.xrplService.getNet().environment.toUpperCase() as EnvKey;
          this.url = AppConstants.XRPL_WIN_URL[env] || AppConstants.XRPL_WIN_URL.DEVNET;

          this.walletManagerService.wallets$.pipe(startWith(null), pairwise(), takeUntil(this.destroy$)).subscribe(([prev, curr]) => {
               this.wallets = curr || [];
               this.hasWallets = this.wallets.length > 0;

               const prevSelected = prev?.[this.selectedWalletIndex];
               const currSelected = curr?.[this.selectedWalletIndex];

               const walletSwitched = !prev || prevSelected?.address !== currSelected?.address || prev.length !== curr?.length;

               if (walletSwitched) {
                    this.selectedWalletIndex = Math.min(this.selectedWalletIndex, this.wallets.length - 1 || 0);
                    this.onAccountChange(); // Only on actual change
               }
               this.cdr.markForCheck();
          });

          // Debounce issuer/currency changes → 200ms
          this.issuerFieldSubject.pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => this.toggleIssuerField());

          // Debounce destination input
          this.destinationInputSubject.pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(query => {
               this.filterQuery = query;
               this.destinationDropdownService.filter(query);
               this.destinationDropdownService.openDropdown();
          });

          // Load custom destinations from storage
          const storedCustoms = this.storageService.get('customDestinations');
          this.customDestinations = storedCustoms ? JSON.parse(storedCustoms) : [];
          this.updateDestinations();

          // Ensure service knows the list
          this.destinationDropdownService.setItems(this.destinations);

          // Subscribe to filtered list updates
          this.destinationDropdownService.filtered$.pipe(takeUntil(this.destroy$)).subscribe(list => {
               this.filteredDestinations = list;
               // keep selection sane
               this.highlightedIndex = list.length > 0 ? 0 : -1;
               this.cdr.detectChanges();
          });

          // Subscribe to open/close state from service
          this.destinationDropdownService.isOpen$.pipe(takeUntil(this.destroy$)).subscribe(open => {
               this.dropdownOpen = open;
               if (open) {
                    this.openDropdownInternal(); // create + attach overlay (component-owned)
               } else {
                    this.closeDropdownInternal(); // detach overlay (component-owned)
               }
          });
     }

     onSelectNft(nftId: string | null) {
          this.selectedNft = nftId;
          this.nftIdField = nftId ?? '';
     }

     onSelectNftOfferIndex(nftOfferIndex: string | null) {
          this.selectedNftOfferIndex = nftOfferIndex;
          this.nftIndexField = nftOfferIndex ?? '';
     }

     ngAfterViewInit() {
          setTimeout(() => {
               this.textareas.forEach(ta => this.autoResize(ta.nativeElement));
          });
     }

     ngOnDestroy(): void {
          document.removeEventListener('change', this.burnCheckboxHandlerBound);
          this.destroy$.next();
          this.destroy$.complete();
     }

     async onCurrencyChange() {
          this.issuerFieldSubject.next(); // ← instead of toggleIssuerField()
     }

     private getKnownIssuersFromLocalStorage() {
          const knownIssuersObj = this.storageService.getKnownIssuers('knownIssuers');

          this.storedIssuers = [];

          if (knownIssuersObj) {
               for (const currency in knownIssuersObj) {
                    for (const address of knownIssuersObj[currency]) {
                         this.storedIssuers.push({
                              name: currency,
                              address: address,
                         });
                    }
               }
               this.knownTrustLinesIssuers = knownIssuersObj;

               if (Object.keys(this.knownTrustLinesIssuers).length > 0) {
                    this.currencyFieldDropDownValue = Object.keys(this.knownTrustLinesIssuers)[0];
               }

               // This is the key line
               this.updateCurrencies(); // ← Triggers auto-select + sorting
          }
     }

     trackByWalletAddress(index: number, wallet: Wallet): string {
          return wallet.address;
     }

     trackByOfferIndex(index: number, offer: any): string {
          return offer.OfferIndex;
     }

     setTab(tab: string) {
          this.activeTab = tab;
          this.selectedNft = null;

          if (Object.keys(this.knownTrustLinesIssuers).length > 0 && this.issuerFields === '') {
               this.currencyFieldDropDownValue = Object.keys(this.knownTrustLinesIssuers)[0];
          }

          if (this.currencyFieldDropDownValue !== 'XRP') {
               this.toggleIssuerField();
          }

          this.clearFields(true);
          this.ui.clearMessages();
          this.ui.clearWarning();
     }

     selectWallet(index: number) {
          if (this.selectedWalletIndex === index) return;
          this.selectedWalletIndex = index;
          this.onAccountChange();
     }

     editName(i: number) {
          this.walletManagerService.startEdit(i);
          const wallet = this.wallets[i];
          this.tempName = wallet.name || `Wallet ${i + 1}`;
          setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
     }

     saveName() {
          this.walletManagerService.saveEdit(this.tempName);
          this.tempName = '';
          this.updateDestinations();
     }

     cancelEdit() {
          this.walletManagerService.cancelEdit();
          this.tempName = '';
     }

     toggleSecret(index: number) {
          this.wallets[index].showSecret = !this.wallets[index].showSecret;
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          try {
               const client = await this.xrplService.getClient();
               const walletAddress = wallet.classicAddress ? wallet.classicAddress : wallet.address;
               await this.refreshWallets(client, [walletAddress]).catch(console.error);
          } catch (err) {
               this.ui.setError('Failed to refresh balance');
          }
     }

     deleteWallet(index: number) {
          if (confirm('Delete this wallet? This cannot be undone.')) {
               this.walletManagerService.deleteWallet(index);
               if (this.selectedWalletIndex >= this.wallets.length) {
                    this.selectedWalletIndex = Math.max(0, this.wallets.length - 1);
               }
               this.onAccountChange();
          }
     }

     async generateNewAccount() {
          console.log('Entering generateNewAccount');
          const startTime = Date.now();
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);

          try {
               // Default to ed25519
               this.encryptionType = AppConstants.ENCRYPTION.ED25519;
               console.log('encryptionType: ', this.encryptionType);
               const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment, this.encryptionType);
               const client = await this.xrplService.getClient();
               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner = false;
               this.ui.clearWarning();
               this.ui.txResult.push(faucetWallet);
               this.updateTxResult(this.ui.txResult);
          } catch (error: any) {
               console.error('Error in generateNewAccount:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving generateNewAccount in ${this.executionTime}ms`);
          }
     }

     dropWallet(event: CdkDragDrop<any[]>) {
          moveItemInArray(this.wallets, event.previousIndex, event.currentIndex);

          // Update your selectedWalletIndex if needed
          if (this.selectedWalletIndex === event.previousIndex) {
               this.selectedWalletIndex = event.currentIndex;
          } else if (this.selectedWalletIndex > event.previousIndex && this.selectedWalletIndex <= event.currentIndex) {
               this.selectedWalletIndex--;
          } else if (this.selectedWalletIndex < event.previousIndex && this.selectedWalletIndex >= event.currentIndex) {
               this.selectedWalletIndex++;
          }

          // Persist the new order to localStorage
          this.walletManagerService.setWallets(this.wallets); // ← this saves + updates observable

          // Update destinations and account state
          this.updateDestinations();
          this.onAccountChange();
     }

     async onAccountChange() {
          if (this.wallets.length === 0) {
               this.currentWallet = {
                    classicAddress: '',
                    address: '',
                    seed: '',
                    name: undefined,
                    balance: '0',
                    ownerCount: undefined,
                    xrpReserves: undefined,
                    spendableXrp: undefined,
               };
               return;
          }

          const selected = this.wallets[this.selectedWalletIndex];
          this.currentWallet = {
               ...selected,
               balance: selected.balance || '0',
               ownerCount: selected.ownerCount || '0',
               xrpReserves: selected.xrpReserves || '0',
               spendableXrp: selected.spendableXrp || '0',
          };

          if (this.currentWallet.address && xrpl.isValidAddress(this.currentWallet.address)) {
               this.ui.clearWarning();
               this.updateDestinations();
               this.getNFTOffers();
               if (this.currencyFieldDropDownValue !== 'XRP') {
                    await this.onCurrencyChange();
               }
          } else if (this.currentWallet.address) {
               this.ui.setError('Invalid XRP address');
          }
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

     onAuthorizedNFTokenMinter() {
          this.cdr.detectChanges();
     }

     toggleFlags() {}

     async getNFTOffers() {
          console.log('Entering getNFTOffers');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const { accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse } = await this.getNftOfferDetails(client, wallet);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logObjects('nftInfo', nftInfo);
               this.utilsService.logObjects('sellOffersResponse', sellOffersResponse);
               this.utilsService.logObjects('buyOffersResponse', buyOffersResponse);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet.seed,
                    accountInfo: accountInfo,
               };

               const errors = this.validateInputs(inputs, 'getNFTOffers');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               // Prepare data structure
               const data: { sections: any[] } = { sections: [] };

               const nfts = nftInfo.result.account_nfts || [];
               const nft = nfts.find((n: any) => n.NFTokenID === this.nftIdField);

               this.getExistingSellOffers(sellOffersResponse);
               // this.getExistingBuyOffers(buyOffersResponse);

               this.getExistingNfts(accountObjects, this.currentWallet.address);

               if (sellOffersResponse.result !== undefined) {
                    if (nft) {
                         data.sections.push({
                              title: 'NFT Details',
                              openByDefault: true,
                              content: [{ key: 'NFToken ID', value: `<code>${nft.NFTokenID}</code>` }, { key: 'Issuer', value: `<code>${nft.Issuer || wallet.classicAddress}</code>` }, { key: 'Taxon', value: String(nft.NFTokenTaxon) }, ...(nft.URI ? [{ key: 'URI', value: `<code>${nft.URI}</code>` }] : []), { key: 'Serial', value: String(nft.nft_serial || 'N/A') }],
                         });
                    } else {
                         data.sections.push({
                              title: 'NFT Details',
                              openByDefault: true,
                              content: [
                                   {
                                        key: 'Status',
                                        value: `No NFT found for TokenID <code>${this.nftIdField}</code> in account <code>${wallet.classicAddress}</code>`,
                                   },
                              ],
                         });
                    }

                    const sellOffers = sellOffersResponse.result?.offers || [];
                    if (sellOffers.length === 0) {
                         data.sections.push({
                              title: 'Sell Offers',
                              openByDefault: true,
                              content: [{ key: 'Status', value: 'No sell offers available' }],
                         });
                    } else {
                         data.sections.push({
                              title: `Sell Offers (${sellOffers.length})`,
                              openByDefault: true,
                              subItems: sellOffers.map((offer: any, index: number) => ({
                                   key: `Sell Offer ${index + 1} (Index: ${offer.nft_offer_index.slice(0, 8)}...)`,
                                   openByDefault: false,
                                   content: [{ key: 'Offer Index', value: `<code>${offer.nft_offer_index}</code>` }, { key: 'Amount', value: offer.amount ? `${this.utilsService.formatIOUXrpAmountUI(offer.amount)}` : 'Unknown' }, { key: 'Owner', value: `<code>${offer.owner}</code>` }, ...(offer.expiration ? [{ key: 'Expiration', value: this.utilsService.convertXRPLTime(offer.expiration) }] : []), ...(offer.destination ? [{ key: 'Destination', value: `<code>${offer.destination}</code>` }] : [])],
                              })),
                         });
                    }

                    const buyOffers = buyOffersResponse.result?.offers || [];
                    if (buyOffers.length === 0) {
                         data.sections.push({
                              title: 'Buy Offers',
                              openByDefault: true,
                              content: [{ key: 'Status', value: 'No buy offers available' }],
                         });
                    } else {
                         data.sections.push({
                              title: `Buy Offers (${buyOffers.length})`,
                              openByDefault: true,
                              subItems: buyOffers.map((offer: any, index: number) => ({
                                   key: `Buy Offer ${index + 1} (Index: ${offer.nft_offer_index.slice(0, 8)}...)`,
                                   openByDefault: false,
                                   content: [{ key: 'Offer Index', value: `<code>${offer.nft_offer_index}</code>` }, { key: 'Amount', value: offer.amount ? `${this.utilsService.formatIOUXrpAmountUI(offer.amount)}` : 'Unknown' }, { key: 'Owner', value: `<code>${offer.owner}</code>` }, ...(offer.expiration ? [{ key: 'Expiration', value: this.utilsService.convertXRPLTime(offer.expiration) }] : []), ...(offer.destination ? [{ key: 'Destination', value: `<code>${offer.destination}</code>` }] : [])],
                              })),
                         });
                    }
               } else {
                    const allSellOffers = sellOffersResponse.flatMap((entry: any) =>
                         entry.offers.map((offer: any) => ({
                              ...offer,
                              nftId: entry.nftId,
                         }))
                    );

                    if (allSellOffers.length === 0) {
                         data.sections.push({
                              title: 'Sell Offers',
                              openByDefault: true,
                              content: [{ key: 'Status', value: 'No sell offers available' }],
                         });
                    } else {
                         data.sections.push({
                              title: `Sell Offers (${allSellOffers.length})`,
                              openByDefault: true,
                              subItems: allSellOffers.map((offer: any, index: number) => ({
                                   key: `Sell Offer ${index + 1} (NFT ID: ${offer.nftId})`,
                                   openByDefault: false,
                                   content: [
                                        { key: 'NFT ID', value: `${offer.nftId}` },
                                        { key: 'Offer Index', value: `<code>${offer.nft_offer_index ? offer.nft_offer_index : offer.nftOfferIndex}</code>` },
                                        { key: 'Amount', value: offer.amount ? `${this.utilsService.formatIOUXrpAmountUI(offer.amount)}` : 'Unknown' },
                                        { key: 'Owner', value: `<code>${offer.owner ? offer.owner : 'N/A'}</code>` },
                                        ...(offer.expiration ? [{ key: 'Expiration', value: this.utilsService.convertXRPLTime(offer.expiration) }] : []),
                                        ...(offer.destination ? [{ key: 'Destination', value: `<code>${offer.destination ? offer.destination : 'N/A'}</code>` }] : []),
                                   ],
                              })),
                         });
                    }

                    const allBuyOffers = buyOffersResponse.flatMap((entry: any) =>
                         entry.offers.map((offer: any) => ({
                              ...offer,
                              nft_id: entry.nft_id,
                         }))
                    );

                    if (allBuyOffers.length === 0) {
                         data.sections.push({
                              title: 'Buy Offers',
                              openByDefault: true,
                              content: [{ key: 'Status', value: 'No buy offers available' }],
                         });
                    } else {
                         data.sections.push({
                              title: `Buy Offers (${allBuyOffers.length})`,
                              openByDefault: true,
                              subItems: allBuyOffers.map((offer: any, index: number) => ({
                                   key: `Buy Offer ${index + 1} (NFT Offer Index: ${offer.nft_offer_index ? offer.nft_offer_index : offer.nftOfferIndex})`,
                                   openByDefault: false,
                                   content: [
                                        { key: 'Offer Index', value: `<code>${offer.nft_offer_index ? offer.nft_offer_index : offer.nftOfferIndex}</code>` },
                                        { key: 'Amount', value: offer.amount ? `${this.utilsService.formatIOUXrpAmountUI(offer.amount)}` : 'Unknown' },
                                        { key: 'Owner', value: `<code>${offer.owner}</code>` },
                                        ...(offer.expiration ? [{ key: 'Expiration', value: new Date(offer.expiration * 1000).toISOString() }] : []),
                                        ...(offer.destination ? [{ key: 'Destination', value: `<code>${offer.destination}</code>` }] : []),
                                   ],
                              })),
                         });
                    }
               }

               if (this.currencyFieldDropDownValue !== 'XRP' && this.issuerFields !== '') {
                    const tokenBalance = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');
                    console.debug('Token Balance:', tokenBalance.result);

                    console.debug(`parseAllGatewayBalances:`, this.parseAllGatewayBalances(tokenBalance, wallet));
                    const parsedBalances = this.parseAllGatewayBalances(tokenBalance, wallet);
                    if (parsedBalances && Object.keys(parsedBalances).length > 0) {
                         this.tokenBalance = parsedBalances?.[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';
                    } else {
                         this.tokenBalance = '0';
                    }
                    this.toggleIssuerField();
               }

               await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);

               this.updateTickets(accountObjects);

               this.clearFields(false);
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getNFTOffers:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getNFTOffers in ${this.executionTime}ms`);
          }
     }

     async buyNFT() {
          console.log('Entering buyNFT');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               nftIdField: this.nftIdField,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, sellOffersResponse, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getNFTSellOffers(client, this.nftIdField), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logObjects('sellOffersResponse', sellOffersResponse);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = this.validateInputs(inputs, 'buyNFT');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const sellOffer = sellOffersResponse.result?.offers || [];
               if (!Array.isArray(sellOffer) || sellOffer.length === 0) {
                    this.ui.setError(`ERROR: No sell offers found for this NFT ${this.nftIdField}`);
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
                    this.ui.setError('ERROR: No matching sell offers found for this wallet.');
                    return;
               }

               // Sort by lowest price
               validOffers.sort((a, b) => parseInt(a.amount) - parseInt(b.amount));

               const matchingOffers = sellOffer.filter(o => o.amount && o.flags === 1); // 1 = tfSellNFToken
               console.log('Matching Offers:', matchingOffers);

               const selectedOffer = validOffers[0];
               console.log('First sell offer:', validOffers[0]);

               if (selectedOffer && selectedOffer.Destination) {
                    this.ui.setError(`ERROR: This NFT is only purchasable by: ${selectedOffer.Destination}`);
                    return;
               }

               if (selectedOffer && selectedOffer.owner === wallet.classicAddress) {
                    this.ui.setError('ERROR: You already own this NFT.');
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

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, nFTokenAcceptOfferTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating NFT Buy Offer (no changes will be made)...' : 'Submitting NFT Buy Offer to Ledger...', 200);

               this.ui.paymentTx.push(nFTokenAcceptOfferTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, nFTokenAcceptOfferTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, nFTokenAcceptOfferTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.txResult.push(response.result);
               this.updateTxResult(this.ui.txResult);

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

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Buy NFT executed successfully!';

                    const { accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse } = await this.getNftOfferDetails(client, wallet);

                    this.getExistingSellOffers(sellOffersResponse);
                    // this.getExistingBuyOffers(buyOffersResponse);

                    // const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);
                    const gatewayBalances = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');

                    this.getExistingNfts(accountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    if (this.currencyFieldDropDownValue !== 'XRP') {
                         await this.updateCurrencyBalance(gatewayBalances, wallet);
                         await this.toggleIssuerField();
                    }

                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.clearFields(false);
                    this.updateTickets(accountObjects);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Buy NFT successfully!';
               }
          } catch (error: any) {
               console.error('Error:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getNFTOffers in ${this.executionTime}ms`);
          }
     }

     async sellNFT() {
          console.log('Entering sellNFT');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               nftIdField: this.nftIdField,
               amount: this.amountField,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = this.validateInputs(inputs, 'sellNFT');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const nFTokenCreateOfferTx: NFTokenCreateOffer = {
                    TransactionType: 'NFTokenCreateOffer',
                    Account: wallet.classicAddress,
                    NFTokenID: this.nftIdField,
                    Amount: xrpl.xrpToDrops(this.amountField),
                    Flags: 1, // Sell offer,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               if (this.currencyFieldDropDownValue !== 'XRP') {
                    const curr: xrpl.IssuedCurrencyAmount = {
                         currency: this.currencyFieldDropDownValue.length > 3 ? this.utilsService.encodeCurrencyCode(this.currencyFieldDropDownValue) : this.currencyFieldDropDownValue,
                         issuer: this.selectedIssuer,
                         value: this.amountField,
                    };
                    nFTokenCreateOfferTx.Amount = curr;
               } else {
                    nFTokenCreateOfferTx.Amount = xrpl.xrpToDrops(this.amountField);
               }

               await this.setTxOptionalFields(client, nFTokenCreateOfferTx, wallet, accountInfo, 'sell');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, nFTokenCreateOfferTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating NFT Sell Offer (no changes will be made)...' : 'Submitting NFT Sell Offer to Ledger...', 200);

               this.ui.paymentTx.push(nFTokenCreateOfferTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, nFTokenCreateOfferTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, nFTokenCreateOfferTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.txResult.push(response.result);
               this.updateTxResult(this.ui.txResult);

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

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Sell NFT executed successfully!';

                    const { accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse } = await this.getNftOfferDetails(client, wallet);

                    this.getExistingSellOffers(sellOffersResponse);
                    // this.getExistingBuyOffers(buyOffersResponse);

                    // const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);
                    const gatewayBalances = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');

                    this.getExistingNfts(accountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress, this.destinationField]).catch(console.error);

                    if (this.currencyFieldDropDownValue !== 'XRP') {
                         await this.updateCurrencyBalance(gatewayBalances, wallet);
                         await this.toggleIssuerField();
                    }

                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(accountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Sell NFT successfully!';
               }
          } catch (error: any) {
               console.error('Error:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving sellNFT in ${this.executionTime}ms`);
          }
     }

     async createOffer(offerType: 'Buy' | 'Sell') {
          console.log('Entering createBuyOffer');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               nftIdField: this.nftIdField,
               amount: this.amountField,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo, nftInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', ''), this.xrplService.getNFTSellOffers(client, this.nftIdField)]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = this.validateInputs(inputs, 'buyNFT');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               if (!nftInfo || nftInfo.result?.offers?.length <= 0) {
                    return this.ui.setError(`No NFT offers for ${this.nftIdField}`);
               }

               const nFTokenCreateOfferTx: NFTokenCreateOffer = {
                    TransactionType: 'NFTokenCreateOffer',
                    Account: wallet.classicAddress,
                    NFTokenID: this.nftIdField,
                    Amount: '',
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               if (this.currencyFieldDropDownValue !== 'XRP') {
                    const curr: xrpl.IssuedCurrencyAmount = {
                         currency: this.currencyFieldDropDownValue.length > 3 ? this.utilsService.encodeCurrencyCode(this.currencyFieldDropDownValue) : this.currencyFieldDropDownValue,
                         issuer: this.selectedIssuer,
                         value: this.amountField,
                    };
                    nFTokenCreateOfferTx.Amount = curr;
               } else {
                    nFTokenCreateOfferTx.Amount = xrpl.xrpToDrops(this.amountField);
               }

               await this.setTxOptionalFields(client, nFTokenCreateOfferTx, wallet, accountInfo, 'sell');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, nFTokenCreateOfferTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               if (offerType === 'Buy') {
                    nFTokenCreateOfferTx.Flags = 0;
                    nFTokenCreateOfferTx.Owner = nftInfo.result.offers[0].owner;
               } else {
                    nFTokenCreateOfferTx.Flags = 1;
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? `Simulating NFT ${offerType} Offer  (no changes will be made)...` : `Submitting NFT ${offerType} Offer to Ledger...`, 200);

               this.ui.paymentTx.push(nFTokenCreateOfferTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, nFTokenCreateOfferTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, nFTokenCreateOfferTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.txResult.push(response.result);
               this.updateTxResult(this.ui.txResult);

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

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Created NFT Offer successfully!';

                    const { accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse } = await this.getNftOfferDetails(client, wallet);

                    this.getExistingSellOffers(sellOffersResponse);
                    // this.getExistingBuyOffers(buyOffersResponse);

                    // const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);
                    const gatewayBalances = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    if (this.currencyFieldDropDownValue !== 'XRP') {
                         await this.updateCurrencyBalance(gatewayBalances, wallet);
                         await this.toggleIssuerField();
                    }

                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(accountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Create NFT Offer successfully!';
               }
          } catch (error: any) {
               console.error('Error:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving createBuyOffer in ${this.executionTime}ms`);
          }
     }

     async cancelOffer() {
          console.log('Entering cancelOffer');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               nftIndexField: this.nftIndexField,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = this.validateInputs(inputs, 'cancelSell');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const nFTokenCancelOfferTx: NFTokenCancelOffer = {
                    TransactionType: 'NFTokenCancelOffer',
                    Account: wallet.classicAddress,
                    NFTokenOffers: [this.nftIndexField],
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, nFTokenCancelOfferTx, wallet, accountInfo, 'cancelSellOffer');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, nFTokenCancelOfferTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating NFT Cancel Offer (no changes will be made)...' : 'Submitting NFT Cancel Offer to Ledger...', 200);

               this.ui.paymentTx.push(nFTokenCancelOfferTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, nFTokenCancelOfferTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, nFTokenCancelOfferTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.txResult.push(response.result);
               this.updateTxResult(this.ui.txResult);

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

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Cancel NFT Offer executed successfully!';

                    const { accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse } = await this.getNftOfferDetails(client, wallet);

                    this.getExistingSellOffers(sellOffersResponse);
                    // this.getExistingBuyOffers(buyOffersResponse);

                    // const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);
                    const gatewayBalances = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    if (this.currencyFieldDropDownValue !== 'XRP') {
                         await this.updateCurrencyBalance(gatewayBalances, wallet);
                         await this.toggleIssuerField();
                    }

                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.updateTickets(accountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Cancel NFT Offer successfully!';
               }
          } catch (error: any) {
               console.error('Error:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving cancelOffer in ${this.executionTime}ms`);
          }
     }

     private getExistingNfts(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
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

          this.existingNfts = allNfts;

          this.utilsService.logObjects('existingNfts', this.existingNfts);

          return this.existingNfts;
     }

     private getExistingSellOffers(sellOfferData: any) {
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

          this.existingSellOffers = allSellOffers;

          this.utilsService.logObjects('existingSellOffers', this.existingSellOffers);

          return this.existingSellOffers;
     }

     private getExistingBuyOffers(checkObjects: any) {
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

          this.existingBuyOffers = allNfts;

          this.utilsService.logObjects('existingBuyOffers', this.existingBuyOffers);

          return this.existingBuyOffers;
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

          return active; // ✅ return array, NOT joined string
     }

     private async getNftOfferDetails(client: any, wallet: any) {
          if (this.nftIdField) {
               // Single NFT mode - returns { result: { offers: [...] } }
               const [accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse, nftAccountOffers] = await Promise.all([
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } })),
                    this.xrplService.getNFTSellOffers(client, this.nftIdField).catch(() => ({ result: { offers: [] } })),
                    this.xrplService.getNFTBuyOffers(client, this.nftIdField).catch(() => ({ result: { offers: [] } })),
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

     setNftFlags() {
          let flags = 0;
          if (this.burnableNft) {
               flags |= xrpl.NFTokenMintFlags.tfBurnable;
          }

          if (this.onlyXrpNft) {
               flags |= xrpl.NFTokenMintFlags.tfOnlyXRP;
          }

          if (this.transferableNft) {
               flags |= xrpl.NFTokenMintFlags.tfTransferable;
          }

          if (this.mutableNft) {
               flags |= xrpl.NFTokenMintFlags.tfMutable;
          }

          console.log('NFt flags ' + flags);
          return flags;
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

     private addNewDestinationFromUser() {
          if (xrpl.isValidAddress(this.destinationField) && !this.destinations.some(d => d.address === this.destinationField)) {
               this.customDestinations.push({
                    name: `Custom ${this.customDestinations.length + 1}`,
                    address: this.destinationField,
               });
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations));
               this.updateDestinations();
          }
     }

     private async setTxOptionalFields(client: xrpl.Client, nftTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string): Promise<string | void> {
          const address = wallet.classicAddress;
          const sequence = accountInfo.result.account_data.Sequence;
          const hasMultipleTickets = this.multiSelectMode && this.selectedTickets.length > 0;

          // --- Helper: set ticket sequence ---
          const setTicket = async (ticket?: string | number): Promise<string | void> => {
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, address, Number(ticket));
                    if (!exists) return `ERROR: Ticket Sequence ${ticket} not found for account ${address}`;
                    this.utilsService.setTicketSequence(nftTx, String(ticket), true);
               } else if (hasMultipleTickets) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(nftTx, String(sequence), false);
               } else {
                    this.utilsService.setTicketSequence(nftTx, String(sequence), false);
               }
          };

          // --- Helper: set expiration ---
          const setExpiration = (): boolean => {
               if (this.expirationField) {
                    const offerExpirationDate = this.utilsService.addTime(this.expirationField, this.expirationDateTimeUnit as 'seconds' | 'minutes' | 'hours' | 'days');
                    this.utilsService.setExpiration(nftTx, offerExpirationDate);
                    console.log(`offerExpirationDate:`, offerExpirationDate);
                    return true;
               }
               return false;
          };

          // --- Helper: set memo ---
          const setMemo = (): void => {
               if (this.memoField) this.utilsService.setMemoField(nftTx, this.memoField);
          };

          // --- Common handling for multiple tx types ---
          if (['buy', 'sell', 'buyOffer', 'sellOffer', 'cancelBuyOffer', 'cancelSellOffer'].includes(txType)) {
               const ticket = this.selectedSingleTicket || this.ticketSequence || undefined;
               const ticketError = await setTicket(ticket);
               if (ticketError) return this.ui.setError(ticketError);

               setMemo();
          }

          if (['sell'].includes(txType)) {
               setExpiration();
          }

          return nftTx;
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);

          // Clean up selections based on current mode
          if (this.multiSelectMode) {
               this.selectedSingleTicket = this.utilsService.cleanUpMultiSelection(this.selectedTickets, this.ticketArray);
          } else {
               this.selectedSingleTicket = this.utilsService.cleanUpSingleSelection(this.selectedTickets, this.ticketArray);
          }
     }

     private async refreshWallets(client: xrpl.Client, addressesToRefresh?: string[]) {
          console.log('Calling refreshWallets');

          await this.walletDataService.refreshWallets(
               client,
               this.wallets, // pass current wallet list
               this.selectedWalletIndex, // pass selected index
               addressesToRefresh,
               (updatedWalletsList, newCurrentWallet) => {
                    // This callback runs inside NgZone → UI updates safely
                    this.currentWallet = { ...newCurrentWallet };
                    // Optional: trigger change detection if needed
                    // this.cdr.markForCheck();
               }
          );
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
          this.storageService.set('destinations', this.destinations);
     }

     private validateInputs(inputs: ValidationInputs, action: string): string[] {
          const errors: string[] = [];

          // --- Shared skip helper ---
          const shouldSkipNumericValidation = (value: string | undefined): boolean => {
               return value === undefined || value === null || value.trim() === '';
          };

          // --- Common validators ---
          const isRequired = (value: string | null | undefined, fieldName: string): string | null => {
               if (value == null || !this.utilsService.validateInput(value)) {
                    return `${fieldName} cannot be empty.`;
               }
               return null;
          };

          const isValidXrpAddress = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidAddress(value)) {
                    return `${fieldName} is invalid.`;
               }
               return null;
          };

          const isValidSecret = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidSecret(value)) {
                    return `${fieldName} is invalid.`;
               }
               return null;
          };

          const isNotSelfPayment = (sender: string | undefined, receiver: string | undefined): string | null => {
               if (sender && receiver && sender === receiver) {
                    return `Sender and receiver cannot be the same.`;
               }
               return null;
          };

          const isValidNumber = (value: string | undefined, fieldName: string, minValue?: number, allowEmpty: boolean = false): string | null => {
               // Skip number validation if value is empty — required() will handle it
               if (shouldSkipNumericValidation(value) || (allowEmpty && value === '')) return null;

               // Type-safe parse
               const num = parseFloat(value as string);

               if (isNaN(num) || !isFinite(num)) {
                    return `${fieldName} must be a valid number`;
               }
               if (minValue !== undefined && num <= minValue) {
                    return `${fieldName} must be greater than ${minValue}`;
               }
               return null;
          };

          const isBatchCountValid = (value: string | undefined, fieldName: string): string | null => {
               if (value === undefined) return null; // Not required, so skip
               const num = parseInt(value);
               if (num > 8) {
                    return `${fieldName} must be less than 8`;
               } else if (num <= 0) {
                    return `${fieldName} cannot be zero`;
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

          const nftExistOnAccountAndMutable = (nft_info: any | undefined, nftId: string | undefined): string | null => {
               if (nft_info && nft_info.result?.account_nfts?.length > 0) {
                    const nfts = nft_info.result.account_nfts;
                    if (nftId) {
                         const targetNFT = nfts.find((nft: any) => nft.NFTokenID === nftId);
                         if (targetNFT) {
                              if (this.decodeNftFlags(targetNFT.Flags).includes('Mutable')) {
                                   return null;
                              } else {
                                   return 'NFT is not mutable';
                              }
                         } else {
                              return 'NFT Id not found';
                         }
                    } else {
                         return 'No NFT for the NFT ID';
                    }
               } else {
                    return 'No NFT for the NFT ID';
               }
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

          // Action-specific config: required fields and custom rules
          const actionConfig: Record<string, { required: (keyof ValidationInputs)[]; customValidators?: (() => string | null)[] }> = {
               getNFTs: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed)],
               },
               batchNFT: {
                    required: ['seed', 'nftCountField'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isValidNumber(inputs.nftCountField, 'NFT count', 0), () => isRequired(inputs.uri, 'URI'), () => isBatchCountValid(inputs.nftCountField, 'NFT Count'), () => isRequired(inputs.batchMode, 'Batch Mode')],
               },
               batchBurnNFT: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isBatchCountValid(inputs.nftCountField, 'NFT Count')],
               },
               getNFTOffers: {
                    required: ['seed'],
                    // customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIdField, 'NFT ID')],
                    customValidators: [() => isValidSeed(inputs.seed)],
               },
               buyNFT: {
                    required: ['seed', 'nftIdField'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIdField, 'NFT ID')],
               },
               sellNFT: {
                    required: ['seed', 'nftIdField', 'amount'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIdField, 'NFT ID'), () => isValidNumber(inputs.amount, 'Amount', 0)],
               },
               cancelBuyNFT: {
                    required: ['seed', 'nftIndexField'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIndexField, 'NFT Offer Index')],
               },
               cancelSellNFT: {
                    required: ['seed', 'nftIndexField'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIndexField, 'NFT Offer Index')],
               },
               updateMetadata: {
                    required: ['seed', 'nftIdField', 'uri'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isRequired(inputs.nftIdField, 'NFT ID'), () => isRequired(inputs.uri, 'URI'), () => nftExistOnAccountAndMutable(inputs.nft_info, inputs.nftIdField)],
               },
               default: { required: [], customValidators: [] },
          };

          const config = actionConfig[action] || actionConfig['default'];

          // Check required fields
          config.required.forEach((field: keyof ValidationInputs) => {
               const err = isRequired(inputs[field], field.charAt(0).toUpperCase() + field.slice(1));
               if (err) errors.push(err);
          });

          // Run custom validators
          config.customValidators?.forEach((validator: () => string | null) => {
               const err = validator();
               if (err) errors.push(err);
          });

          // Always validate optional fields if provided (e.g., multi-sign, regular key)
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

     setBatchMode(mode: 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent') {
          this.batchMode = mode;
          this.toggleFlags(); // optional: update your XRPL batch flags
     }

     onBurnToggle(checked: boolean, nftId: string) {
          // normalize current ids
          const ids = (this.nftIdField || '')
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

          this.nftIdField = ids.join(', ');
     }

     private burnCheckboxHandler(event: Event) {
          const target = event.target as HTMLInputElement;
          if (!target) return;
          if (!target.classList.contains('burn-check')) return;

          const nftId = target.getAttribute('data-id');
          if (!nftId) return;

          // run inside Angular zone so template/ngModel updates
          this.ngZone.run(() => {
               this.onBurnToggle(target.checked, nftId);
          });
     }

     updateNftTextField(nftId: string, add: boolean) {
          let ids = (this.nftIdField || '')
               .split(',')
               .map(s => s.trim())
               .filter(Boolean);

          if (add && !ids.includes(nftId)) {
               ids.push(nftId);
          } else if (!add) {
               ids = ids.filter(id => id !== nftId);
          }

          this.nftIdField = ids.join(', ');
     }

     async toggleIssuerField(): Promise<void> {
          console.log('toggleIssuerField → currency:', this.currencyFieldDropDownValue);
          // this.ui.clearMessages();

          try {
               if (!this.currencyFieldDropDownValue) {
                    this.issuers = [];
                    this.issuerFields = '';
                    this.ui.setWarning('Please select a currency first.');
                    this.ui.spinner = false;
                    return;
               }

               const currency = this.currencyFieldDropDownValue;
               const knownIssuersForThisCurrency = this.knownTrustLinesIssuers[currency] || [];

               // Build issuer list — ONLY from knownTrustLinesIssuers[currency]
               const issuerEntries: { name: string; address: string }[] = [];

               for (const addr of knownIssuersForThisCurrency) {
                    if (!xrpl.isValidAddress(addr)) continue;

                    // Try to get nice name
                    const wallet = this.wallets.find(w => w.address === addr);
                    const custom = this.customDestinations.find(d => d.address === addr);

                    const name = wallet?.name || custom?.name || currency || `Issuer (${addr.slice(0, 8)}...)`;

                    issuerEntries.push({ name, address: addr });
               }

               // Sort by name
               this.issuers = issuerEntries.sort((a, b) => a.name.localeCompare(b.name));

               // Auto-select first issuer
               if (this.issuers.length > 0) {
                    if (!this.issuerFields || !this.issuers.some(i => i.address === this.issuerFields)) {
                         this.issuerFields = this.issuers[0].address;
                    }
                    this.ui.clearWarning();
               } else {
                    if (currency !== 'XRP' && currency !== 'MPT') {
                         this.issuerFields = '';
                         this.ui.setWarning(`No issuers configured for <strong>${currency}</strong>`);
                    }
               }

               try {
                    const wallet = await this.getWallet();
                    const cache = this.getCachedAccountData(this.currentWallet.address);

                    let accountObjects: xrpl.AccountObjectsResponse;
                    let gatewayBalances: xrpl.GatewayBalancesResponse;

                    if (cache?.accountObjects && cache?.tokenBalance) {
                         accountObjects = cache.accountObjects;
                         gatewayBalances = cache.tokenBalance;
                    } else {
                         const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);
                         [gatewayBalances, accountObjects] = await Promise.all([this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                         this.setCachedAccountData(this.currentWallet.address, { accountObjects, tokenBalance: gatewayBalances });
                    }

                    await this.updateCurrencyBalance(gatewayBalances, wallet);
               } catch (e) {
                    console.warn('Balance update failed in toggleIssuerField', e);
               }

               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in toggleIssuerField:', error);
               this.ui.setError('Failed to load issuers');
               this.issuers = [];
               this.issuerFields = '';
          } finally {
               this.ui.spinner = false;
          }
     }

     get availableCurrencies(): string[] {
          const baseCurrencies = Object.keys(this.knownTrustLinesIssuers).filter(c => c !== '' && c !== 'MPT'); // Exclude XRP and MPT by default

          // On the Create Escrow tab → always include MPT (and XRP if you want)
          if (this.activeTab === 'create') {
               const currencies = ['XRP', ...baseCurrencies];
               return [...new Set(currencies)].sort(); // dedupe + sort
          }

          // On ANY other tab (especially Create Trustline) → MPT is NOT allowed
          return baseCurrencies.sort();
     }

     private async updateCurrencyBalance(gatewayBalance: xrpl.GatewayBalancesResponse, wallet: xrpl.Wallet) {
          const parsedBalances = this.parseAllGatewayBalances(gatewayBalance, wallet);
          if (parsedBalances && Object.keys(parsedBalances).length > 0) {
               this.tokenBalance = parsedBalances[this.currencyFieldDropDownValue]?.[wallet.classicAddress] ?? parsedBalances[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';
          } else {
               this.tokenBalance = '0';
          }
     }

     private parseAllGatewayBalances(gatewayBalances: xrpl.GatewayBalancesResponse, wallet: xrpl.Wallet) {
          const result = gatewayBalances.result;
          const grouped: Record<string, Record<string, string>> = {};
          // structure: { [currency]: { [issuer]: balance } }

          // --- Case 1: Obligations (this account is the gateway/issuer)
          if (result.obligations && Object.keys(result.obligations).length > 0) {
               for (const [currencyCode, value] of Object.entries(result.obligations)) {
                    const decodedCurrency = this.utilsService.normalizeCurrencyCode(currencyCode);

                    if (!grouped[decodedCurrency]) grouped[decodedCurrency] = {};

                    // Obligations are what the gateway owes → negative
                    const formatted = '-' + this.utilsService.formatTokenBalance(value, 18);
                    grouped[decodedCurrency][wallet.address] = formatted;
               }
          }

          // --- Case 2: Assets (tokens issued by others, held by this account)
          if (result.assets && Object.keys(result.assets).length > 0) {
               for (const [issuer, assetArray] of Object.entries(result.assets)) {
                    assetArray.forEach(asset => {
                         const decodedCurrency = this.utilsService.normalizeCurrencyCode(asset.currency);

                         if (!grouped[decodedCurrency]) grouped[decodedCurrency] = {};
                         grouped[decodedCurrency][issuer] = this.utilsService.formatTokenBalance(asset.value, 18);
                    });
               }
          }

          // --- Case 3: Balances (owed TO this account)
          if (result.balances && Object.keys(result.balances).length > 0) {
               for (const [issuer, balanceArray] of Object.entries(result.balances)) {
                    balanceArray.forEach(balanceObj => {
                         const decodedCurrency = this.utilsService.normalizeCurrencyCode(balanceObj.currency);

                         if (!grouped[decodedCurrency]) grouped[decodedCurrency] = {};
                         grouped[decodedCurrency][issuer] = this.utilsService.formatTokenBalance(balanceObj.value, 18);
                    });
               }
          }

          return grouped;
     }

     private getCachedAccountData(address: string) {
          const cached = this.accountDataCache.get(address);
          if (cached && Date.now() - cached.timestamp < 8000) {
               // 8 sec cache
               return cached;
          }
          return null;
     }

     private setCachedAccountData(address: string, data: Partial<{ accountObjects: xrpl.AccountObjectsResponse; tokenBalance: xrpl.GatewayBalancesResponse }>) {
          const existing = this.accountDataCache.get(address) || { timestamp: Date.now() };
          this.accountDataCache.set(address, { ...existing, ...data, timestamp: Date.now() });
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet.encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet.seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     updatePaymentTx() {
          this.scheduleHighlight();
     }

     updateTxResult(tx: any) {
          this.ui.txResult = tx;
          this.scheduleHighlight();
     }

     private scheduleHighlight() {
          // Use the captured injector to run afterRenderEffect safely
          afterRenderEffect(
               () => {
                    if (this.ui.paymentTx && this.paymentJson?.nativeElement) {
                         const json = JSON.stringify(this.ui.paymentTx, null, 2);
                         this.paymentJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                    }

                    if (this.ui.txResult && this.txResultJson?.nativeElement) {
                         const json = JSON.stringify(this.ui.txResult, null, 2);
                         this.txResultJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                    }
               },
               { injector: this.injector }
          );
     }

     copyNFTokenID(NFTokenID: string) {
          navigator.clipboard.writeText(NFTokenID).then(() => {
               this.ui.showToastMessage('NFT Token ID copied!');
          });
     }

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.ui.showToastMessage('Check ID copied!');
          });
     }

     copyIOUIssuanceAddress(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.ui.showToastMessage('IOU Token Issuer copied!');
          });
     }

     public get infoMessage(): string | null {
          const tabConfig = {
               setTrustline: {
                    // checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
               removeTrustline: {
                    // checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
               issueCurrency: {
                    // checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
               clawbackTokens: {
                    // checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';
          // const count = config.checks.length;
          const count = 0;

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          let message = `The <code>${walletName}</code> wallet has ${dynamicText}${count} ${config.getDescription(count)}.`;

          if (config.showLink && count > 0) {
               const link = `${this.url}account/${this.currentWallet.address}/nfts`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View NFTs on XRPL Win</a>`;
          }

          return message;
     }

     autoResize(textarea: HTMLTextAreaElement) {
          if (!textarea) return;
          textarea.style.height = 'auto'; // reset
          textarea.style.height = textarea.scrollHeight + 'px'; // expand
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.isBatchModeEnabled = false;
               this.isNftFlagModeEnabled = false;
               this.ui.clearMessages();
               this.ui.clearWarning();
          }

          this.amountField = '';
          this.minterAddressField = '';
          this.expirationField = '';
          this.nftIdField = '';
          this.nftIndexField = '';
          this.nftCountField = '';
          this.memoField = '';
          this.isMemoEnabled = false;
          this.isTicket = false;
          this.ticketSequence = '';
          this.cdr.detectChanges();
     }

     private updateCurrencies() {
          // Get all currencies except XRP
          const allCurrencies = Object.keys(this.knownTrustLinesIssuers);
          const filtered = allCurrencies.filter(c => c !== 'XRP');
          // allCurrencies.push('MPT');

          // Sort alphabetically
          this.currencies = filtered.sort((a, b) => a.localeCompare(b));

          // AUTO-SELECT FIRST CURRENCY — SAFE WAY
          if (this.currencies.length > 0) {
               // Only set if nothing is selected OR current selection is invalid/removed
               const shouldSelectFirst = !this.currencyFieldDropDownValue || !this.currencies.includes(this.currencyFieldDropDownValue);

               if (shouldSelectFirst) {
                    this.currencyFieldDropDownValue = this.currencies[0];
                    // Trigger issuer load — but do it in next tick so binding is ready
                    Promise.resolve().then(() => this.onCurrencyChange());
               }
          } else {
               // No currencies left
               this.currencyFieldDropDownValue = '';
               this.issuerFields = '';
               this.issuers = [];
          }
     }

     onTokenChange(): void {
          const issuers = this.knownTrustLinesIssuers[this.tokenToRemove] || [];
          this.issuerToRemove = issuers.length > 0 ? issuers[0] : '';
     }

     getIssuerForCheck(checks: any[], checkIndex: string): string | null {
          const check = checks.find(c => c.index === checkIndex);
          return check?.SendMax?.issuer || null;
     }

     openDropdown() {
          // update service items (in case destinations changed)
          this.destinationDropdownService.setItems(this.destinations);
          // prepare filtered list
          this.destinationDropdownService.filter(this.destinationField || '');
          // tell service to open -> subscription above will attach overlay
          this.destinationDropdownService.openDropdown();
     }

     // Called by outside click / programmatic close
     closeDropdown() {
          this.destinationDropdownService.closeDropdown();
     }

     // Called by chevron toggle
     toggleDropdown() {
          // make sure the service has current items first
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.toggleDropdown();
     }

     // Called on input typing
     onDestinationInput() {
          this.filterQuery = this.destinationField || '';
          this.destinationDropdownService.filter(this.filterQuery);
          this.destinationDropdownService.openDropdown(); // ensure open while typing
     }

     private openDropdownInternal() {
          // If already attached, do nothing
          if (this.overlayRef?.hasAttached()) return;

          // position strategy (your existing logic)
          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(this.dropdownOrigin)
               .withPositions([
                    {
                         originX: 'start',
                         originY: 'bottom',
                         overlayX: 'start',
                         overlayY: 'top',
                         offsetY: 8,
                    },
               ])
               .withPush(false);

          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.close(),
          });

          const portal = new TemplatePortal(this.dropdownTemplate, this.viewContainerRef);
          this.overlayRef.attach(portal);

          // Close on backdrop click
          this.overlayRef.backdropClick().subscribe(() => {
               this.destinationDropdownService.closeDropdown(); // close via service so subscribers sync
          });
     }

     private closeDropdownInternal() {
          if (this.overlayRef) {
               this.overlayRef.detach();
               this.overlayRef = null;
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

     selectDestination(address: string) {
          if (address === this.currentWallet.address) return;

          const dest = this.destinations.find(d => d.address === address);
          if (dest) {
               // show "Name (rABC12...DEF456)"
               this.destinationField = this.destinationDropdownService.formatDisplay(dest);
          } else {
               this.destinationField = `${address.slice(0, 6)}...${address.slice(-6)}`;
          }

          // close via service so subscribers remain in sync
          this.destinationDropdownService.closeDropdown();
          this.cdr.detectChanges();
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
}
