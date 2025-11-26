import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { CheckCreate, CheckCash, CheckCancel } from 'xrpl';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
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
     senderAddress?: string;
     accountInfo?: any;
     seed?: string;
     amount?: string;
     destination?: string;
     tokenBalance?: string;
     issuers?: any;
     checkExpirationTime?: any;
     expirationTimeField?: any;
     currencyFieldDropDownValue?: any;
     checkId?: string;
     destinationTag?: string;
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

interface MPToken {
     LedgerEntryType: 'MPToken';
     index?: string;
     mpt_issuance_id?: string;
     MPTokenIssuanceID?: string;
     PreviousTxnID?: string;
     Flags?: number;
     MPTAmount?: string | number;
     MaximumAmount?: string | number;
     OutstandingAmount?: string | number;
     TransferFee?: string | number;
     MPTokenMetadata?: string;
}

interface IssuerItem {
     name: string;
     address: string;
}

@Component({
     selector: 'app-checks',
     standalone: true,
     imports: [CommonModule, FormsModule, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './checks.component.html',
     styleUrl: './checks.component.css',
})
export class SendChecksComponent implements OnInit, AfterViewInit {
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
     currencyFieldDropDownValue: string = 'XRP';
     checkExpirationTime: string = 'seconds';
     issuerFields: string = '';
     expirationTimeField: string = '';
     ticketSequence: string = '';
     isTicket: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     checkIdField: string = '';
     outstandingChecks: string = '';
     executionTime: string = '';
     amountField: string = '';
     destinationField: string = '';
     destinationTagField: string = '';
     mptIssuanceIdField: string = '';
     isMptEnabled: boolean = false;
     memoField: string = '';
     isMemoEnabled: boolean = false;
     useMultiSign: boolean = false;
     multiSignSeeds: string = '';
     multiSignAddress: string = '';
     isRegularKeyAddress: boolean = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     signerQuorum: number = 0;
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     masterKeyDisabled: boolean = false;
     tokenBalance: string = '0';
     gatewayBalance: string = '0';
     private knownTrustLinesIssuers: { [key: string]: string[] } = { XRP: [] };
     issuerToRemove: string = '';
     currencies: string[] = [];
     userAddedCurrencyFieldDropDownValue: string[] = [];
     userAddedissuerFields: string = '';
     allKnownIssuers: string[] = [];
     storedIssuers: IssuerItem[] = [];
     selectedIssuer: string = '';
     newCurrency: string = '';
     newIssuer: string = '';
     tokenToRemove: string = '';
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
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
     destinations: { name?: string; address: string }[] = [];
     issuers: { name?: string; address: string }[] = [];
     customDestinations: { name?: string; address: string }[] = [];
     showDropdown = false;
     dropdownOpen = false;
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;
     lastCurrency: string = '';
     lastIssuer: string = '';
     showManageTokens: boolean = false;
     environment: string = '';
     activeTab: string = 'create'; // default
     sourceTagField: string = '';
     invoiceIdField: string = '';
     encryptionType: string = '';
     hasWallets: boolean = true;
     cancellableChecks: any = [];
     cashableChecks: any = [];
     existingChecks: any = [];
     // Controls whether the panel is expanded or collapsed
     outstandingChecksCollapsed = true;
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     filterQuery: string = '';
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
          private readonly cdr: ChangeDetectorRef,
          private readonly storageService: StorageService,
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
     ) {}

     ngOnInit() {
          this.getKnownIssuersFromLocalStorage();

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

     ngAfterViewInit() {
          setTimeout(() => {
               this.textareas.forEach(ta => this.autoResize(ta.nativeElement));
          });
     }

     ngOnDestroy() {
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

          if (this.activeTab === 'cancel') {
               const client = await this.xrplService.getClient();
               const checkObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'check');
               this.getCancelableChecks(checkObjects, this.currentWallet.address);
          }

          if (this.activeTab === 'create') {
               const client = await this.xrplService.getClient();
               const checkObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'check');
               this.getExistingChecks(checkObjects, this.currentWallet.address);
          }

          if (this.activeTab === 'cash') {
               const client = await this.xrplService.getClient();
               const checkObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'check');
               this.getCashableChecks(checkObjects, this.currentWallet.address);
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
               this.accountDataCache.clear();
               this.ui.clearWarning();
               this.updateDestinations();
               await this.getChecks();
               if (this.currencyFieldDropDownValue !== 'XRP') {
                    await this.onCurrencyChange();
               }
          } else if (this.currentWallet.address) {
               this.ui.setError('Failed to refresh balance');
          }
     }

     toggleOutstandingChecks() {
          this.outstandingChecksCollapsed = !this.outstandingChecksCollapsed;
     }

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign, this.signers, (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.ui.setError(`${error.message}`);
          }
     }

     async getChecks() {
          console.log('Entering getChecks');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const inputs: ValidationInputs = { seed: this.currentWallet.seed, accountInfo: accountInfo };

               const errors = await this.validationService.validate('AccountInfo', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               this.getExistingChecks(accountObjects, wallet.classicAddress);
               this.getCashableChecks(accountObjects, wallet.classicAddress);
               this.getCancelableChecks(accountObjects, wallet.classicAddress);

               if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT' && this.issuerFields !== '') {
                    const tokenBalance = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');
                    console.debug('Token Balance:', tokenBalance.result);

                    console.debug(`parseAllGatewayBalances:`, this.parseAllGatewayBalances(tokenBalance, wallet));
                    const parsedBalances = this.parseAllGatewayBalances(tokenBalance, wallet);
                    if (parsedBalances && Object.keys(parsedBalances).length > 0) {
                         this.tokenBalance = parsedBalances?.[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';
                    } else {
                         this.tokenBalance = '0';
                    }

                    this.setCachedAccountData(this.currentWallet.address, { accountObjects, tokenBalance });
                    this.toggleIssuerField();
               }

               await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);

               this.updateTickets(accountObjects);

               this.clearFields(false);
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getChecks:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getChecks in ${this.executionTime}ms`);
          }
     }

     async createCheck() {
          console.log('Entering createCheck');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               senderAddress: this.currentWallet.address,
               amount: this.amountField,
               destination: this.destinationField,
               tokenBalance: this.tokenBalance,
               issuers: this.issuers,
               checkExpirationTime: this.checkExpirationTime,
               expirationTimeField: this.expirationTimeField,
               currencyFieldDropDownValue: this.currencyFieldDropDownValue,
               destinationTag: this.destinationTagField,
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

               if (this.destinationField === '') {
                    return this.ui.setError(`Destination cannot be empty.`);
               }
               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               const [accountInfo, destinationAccountInfo, trustLines, fee, currentLedger, serverInfo] = await Promise.all([
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountInfo(client, resolvedDestination, 'validated', ''),
                    this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.calculateTransactionFee(client),
                    this.xrplService.getLastLedgerIndex(client),
                    this.xrplService.getXrplServerInfo(client, 'current', ''),
               ]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logObjects('trustLines', trustLines);
               this.utilsService.logObjects('destinationAccountInfo', destinationAccountInfo);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;
               inputs.destination = resolvedDestination;

               const errors = await this.validationService.validate('CreateCheck', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               if (destinationAccountInfo.result.account_flags.disallowIncomingCheck) {
                    return this.ui.setError(`Error:\nDestination ${resolvedDestination} has disallowIncomingCheck enabled. This wallet can not recieve checks.`);
               }

               // Build SendMax amount
               const curr: xrpl.MPTAmount = {
                    mpt_issuance_id: this.mptIssuanceIdField,
                    value: this.amountField,
               };

               let sendMax;
               if (this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY) {
                    // if (this.isMptEnabled) {
                    // sendMax = curr;
                    // } else {
                    sendMax = xrpl.xrpToDrops(this.amountField);
                    // }
               } else {
                    sendMax = {
                         currency: this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue),
                         value: this.amountField,
                         issuer: this.issuerFields,
                    };
               }

               let checkCreateTx: CheckCreate = await client.autofill({
                    TransactionType: 'CheckCreate',
                    Account: wallet.classicAddress,
                    SendMax: sendMax,
                    Destination: resolvedDestination,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               });

               await this.setTxOptionalFields(client, checkCreateTx, wallet, accountInfo, 'create');

               if (this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY) {
                    if (this.amountField || this.amountField === '') {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, checkCreateTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    } else {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, checkCreateTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    }
               } else if (this.currencyFieldDropDownValue !== 'MPT') {
                    if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, checkCreateTx, resolvedDestination)) {
                         return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
                    }
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Create Check (no changes will be made)...' : 'Submitting Create Check to Ledger...', 200);

               this.ui.paymentTx.push(checkCreateTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, checkCreateTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, checkCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.successMessage = 'Created check successfully!';
                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    this.getExistingChecks(updatedAccountObjects, wallet.classicAddress);

                    if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
                         await this.updateCurrencyBalance(gatewayBalances, wallet);
                         await this.toggleIssuerField();
                    }

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Create Check successfully!';
               }
          } catch (error: any) {
               console.error('Error in createCheck:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving createCheck in ${this.executionTime}ms`);
          }
     }

     async cashCheck() {
          console.log('Entering cashCheck');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               amount: this.amountField,
               checkId: this.checkIdField,
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

               const [accountInfo, trustLines, checkObjects, fee, currentLedger, serverInfo] = await Promise.all([
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'check'),
                    this.xrplService.calculateTransactionFee(client),
                    this.xrplService.getLastLedgerIndex(client),
                    this.xrplService.getXrplServerInfo(client, 'current', ''),
               ]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logObjects('trustLines', trustLines);
               // this.utilsService.logObjects('checkObjects', checkObjects);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('CashCheck', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const checkObject = await this.xrplService.getCheckByCheckId(client, this.checkIdField, 'validated');
               if (checkObject) {
                    console.log('checkObject: ', checkObject);
                    if (checkObject.Expiration) {
                         const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
                         if (currentRippleTime >= checkObject.Expiration) {
                              return this.ui.setError(`Transaction or object has expired.`);
                         }
                    }
               } else {
                    return this.ui.setError(`No check found with Check ID ${this.checkIdField}`);
               }

               if (this.currencyFieldDropDownValue !== AppConstants.XRP_CURRENCY) {
                    console.debug(`checkObjects for ${wallet.classicAddress}:`, checkObjects.result);
                    const issuer = this.getIssuerForCheck(checkObjects.result.account_objects, this.checkIdField);
                    console.log('Issuer:', issuer);
                    if (issuer) {
                         this.selectedIssuer = issuer;
                    }
               }

               // Build amount object depending on currency
               const amountToCash =
                    this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY
                         ? xrpl.xrpToDrops(this.amountField)
                         : {
                                value: this.amountField,
                                currency: this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue),
                                issuer: this.selectedIssuer,
                           };

               let checkCashTx: CheckCash = await client.autofill({
                    TransactionType: 'CheckCash',
                    Account: wallet.classicAddress,
                    Amount: amountToCash,
                    CheckID: this.checkIdField,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               });

               await this.setTxOptionalFields(client, checkCashTx, wallet, accountInfo, 'cash');

               if (this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY) {
                    if (this.amountField || this.amountField === '') {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, checkCashTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    } else {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, checkCashTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    }
               } else if (this.currencyFieldDropDownValue !== 'MPT') {
                    // if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, checkCashTx, this.issuerFields)) {
                    // return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
                    // }
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Cashing Check (no changes will be made)...' : 'Submitting Cash Check to Ledger...', 200);

               this.ui.paymentTx.push(checkCashTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, checkCashTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, checkCashTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.successMessage = 'Check cashed successfully!';
                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.getCashableChecks(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingChecks(updatedAccountObjects, wallet.classicAddress);

                    this.addNewDestinationFromUser();

                    if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
                         await this.updateCurrencyBalance(gatewayBalances, wallet);
                         await this.toggleIssuerField();
                    }

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Check cash successfully!';
               }
          } catch (error: any) {
               console.error('Error in cashCheck:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving cashCheck in ${this.executionTime}ms`);
          }
     }

     async cancelCheck() {
          console.log('Entering cancelCheck');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               checkId: this.checkIdField,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               if (this.destinationField === '') {
                    return this.ui.setError(`Destination cannot be empty.`);
               }
               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;
               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('CancelCheck', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               let checkCancelTx: CheckCancel = await client.autofill({
                    TransactionType: 'CheckCancel',
                    Account: wallet.classicAddress,
                    CheckID: this.checkIdField,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               });

               await this.setTxOptionalFields(client, checkCancelTx, wallet, accountInfo, 'cancelCheck');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, checkCancelTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Canceling Check (no changes will be made)...' : 'Submitting Cancel Check to Ledger...', 200);

               this.ui.paymentTx.push(checkCancelTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, checkCancelTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, checkCancelTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.successMessage = 'Check cancelled successfully!';

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    this.getCancelableChecks(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingChecks(updatedAccountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    this.addNewDestinationFromUser();

                    if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
                         await this.updateCurrencyBalance(gatewayBalances, wallet);
                         await this.toggleIssuerField();
                    }

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Check cancel successfully!';
               }
          } catch (error: any) {
               console.error('Error in cancelCheck:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving cancelCheck in ${this.executionTime}ms`);
          }
     }

     private getExistingChecks(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          this.existingChecks = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Account === classicAddress)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';
                    let currency = '';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = sendMax.value;
                         currency = this.utilsService.normalizeCurrencyCode(sendMax.currency);
                    }

                    return {
                         id: obj.index,
                         amount: `${amount} ${currency}`,
                         destination: obj.Destination,
                         sendMax,
                         expiration: obj.Expiration,
                         destinationTag: obj.DestinationTag,
                         sourceTag: obj.SourceTag,
                         invoiceId: obj.InvoiceID,
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));
          this.utilsService.logObjects('existingChecks', this.existingChecks);
     }

     private getCashableChecks(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          this.cashableChecks = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Destination === classicAddress)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';
                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }
                    return {
                         id: obj.index,
                         amount,
                         sender: obj.Account,
                         sendMax,
                    };
               })
               .sort((a, b) => a.sender.localeCompare(b.sender));
          this.utilsService.logObjects('cashableChecks', this.cashableChecks);
     }

     private getCancelableChecks(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          this.cancellableChecks = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Account === sender)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';

                    if (typeof sendMax === 'string') {
                         // XRP (drops)
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         // IOU
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }

                    return {
                         id: obj.index, // <-- CheckID
                         amount,
                         destination: obj.Destination,
                         sendMax,
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));
          this.utilsService.logObjects('cancellableChecks', this.cancellableChecks);
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
               const currencies = ['XRP', 'MPT', ...baseCurrencies];
               return [...new Set(currencies)].sort(); // dedupe + sort
          }

          // On ANY other tab (especially Create Trustline) → MPT is NOT allowed
          return baseCurrencies.sort();
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

     private async setTxOptionalFields(client: xrpl.Client, checkTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'create') {
               if (this.expirationTimeField && this.expirationTimeField != '') {
                    const checkExpiration = this.utilsService.addTime(parseInt(this.expirationTimeField), this.checkExpirationTime as 'seconds' | 'minutes' | 'hours' | 'days').toString();
                    this.utilsService.setExpiration(checkTx, Number(checkExpiration));
               }

               if (this.destinationTagField && parseInt(this.destinationTagField) > 0) {
                    this.utilsService.setDestinationTag(checkTx, this.destinationTagField);
               }

               if (this.invoiceIdField) {
                    await this.utilsService.setInvoiceIdField(checkTx, this.invoiceIdField);
               }

               if (this.sourceTagField) {
                    this.utilsService.setSourceTagField(checkTx, this.sourceTagField);
               }
          }

          if (this.selectedSingleTicket) {
               const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!ticketExists) {
                    throw new Error(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
               }
               this.utilsService.setTicketSequence(checkTx, this.selectedSingleTicket, true);
          } else {
               if (this.multiSelectMode && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(checkTx, accountInfo.result.account_data.Sequence, false);
               }
          }

          if (this.memoField) {
               this.utilsService.setMemoField(checkTx, this.memoField);
          }
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

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.ui.showToastMessage('Check ID copied!');
          });
     }

     public get infoMessage(): string | null {
          const tabConfig = {
               create: {
                    checks: this.existingChecks,
                    getDescription: (count: number) => (count === 1 ? 'check' : 'checks'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
               cash: {
                    checks: this.cashableChecks,
                    getDescription: (count: number) => (count === 1 ? 'check that can be cashed' : 'checks that can be cashed'),
                    dynamicText: '', // Empty for no additional text
                    showLink: true,
               },
               cancel: {
                    checks: this.cancellableChecks,
                    getDescription: (count: number) => (count === 1 ? 'check that can be cancelled' : 'checks that can be cancelled'),
                    dynamicText: '', // Dynamic text before the count
                    showLink: true,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';
          const count = config.checks.length;

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          let message = `The <code>${walletName}</code> wallet has ${dynamicText}${count} ${config.getDescription(count)}.`;

          if (config.showLink && count > 0) {
               const link = `${this.url}account/${this.currentWallet.address}/checks`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View checks on XRPL Win</a>`;
          }

          return message;
     }

     formatIOUXrpAmountUI(amount: any): string {
          if (!amount) return 'Unknown';

          if (typeof amount === 'string' && amount.split(' ').length === 1) {
               // XRP in drops
               return `${amount} XRP`;
          } else if (amount.split(' ').length === 2) {
               const splitAmount = amount.split(' ');
               return `${splitAmount[0]} ${splitAmount[1]}`;
          }

          if (typeof amount === 'object') {
               // Issued currency
               const { currency, issuer, value } = amount;
               return `${value} ${currency} (issuer: ${issuer})`;
          }

          return 'Unknown';
     }

     formatIOUXrpAmountOutstanding(amount: any): string {
          if (!amount) return 'Unknown';

          if (typeof amount === 'string' && /^[0-9]+$/.test(amount)) {
               return `${xrpl.dropsToXrp(amount)} XRP`;
          }

          if (typeof amount === 'object') {
               // Issued currency
               const { currency, value } = amount;
               return `${value} ${this.utilsService.decodeIfNeeded(currency)}`;
          }

          return `${amount} XRP`;
     }

     formatInvoiceId(invoiceId: any): string {
          return this.utilsService.formatInvoiceId(invoiceId ? invoiceId : '');
     }

     formatXrplTimestamp(timestamp: number): string {
          return this.utilsService.convertXRPLTime(timestamp);
     }

     autoResize(textarea: HTMLTextAreaElement) {
          if (!textarea) return;
          textarea.style.height = 'auto'; // reset
          textarea.style.height = textarea.scrollHeight + 'px'; // expand
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.amountField = '';
               this.expirationTimeField = '';
          }

          if (this.activeTab === 'cash') {
               this.amountField = '';
          }

          this.isMemoEnabled = false;
          this.memoField = '';
          this.checkIdField = '';
          this.ticketSequence = '';
          this.isTicket = false;
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
