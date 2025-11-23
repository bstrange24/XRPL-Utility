import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import * as cc from 'five-bells-condition';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { AppWalletDynamicInputComponent } from '../app-wallet-dynamic-input/app-wallet-dynamic-input.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { LucideAngularModule } from 'lucide-angular';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
     conditionField?: string;
     fulfillment?: string;
     finishTime?: string;
     escrowSequence?: string;
     cancelTime?: string;
     sequence?: string;
     selectedIssuer?: string;
     currency?: string;
     escrow_objects?: any;
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

interface EscrowObject {
     Account: string;
     index: string;
     Expiration?: number;
     Destination: string;
     Condition: string;
     CancelAfter: string;
     FinshAfter: string;
     Amount: string;
     DestinationTag: string;
     Balance: string;
     SourceTag: number;
     PreviousTxnID: string;
     Memo: string | null | undefined;
     Sequence: number | null | undefined;
     TicketSequence: number | null | undefined;
}

interface EscrowDataForUI {
     Account: string;
     Amount?: string | { currency: string; value: string } | { mpt_issuance_id: string; value: string };
     CancelAfter?: number;
     Destination: string;
     DestinationNode?: string;
     FinishAfter?: number;
     Condition?: string;
     Fulfillment?: string;
     DestinationTag?: number;
     Sequence?: number | null;
     EscrowSequence?: string | null;
     TxHash?: number | null;
}

interface RippleState {
     LedgerEntryType: 'RippleState';
     Balance: { currency: string; value: string };
     HighLimit: { issuer: string };
}

interface MPToken {
     LedgerEntryType?: string;
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
     selector: 'app-conditional-escrow',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './conditional-escrow.component.html',
     styleUrl: './conditional-escrow.component.css',
})
export class CreateConditionalEscrowComponent implements OnInit, AfterViewInit {
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
     destinationField: string = '';
     issuerFields: string = '';
     currencyBalanceField: string = '';
     gatewayBalance: string = '0';
     amountField: string = '';
     ticketSequence: string = '';
     isTicket: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     executionTime: string = '';
     destinationTagField: string = '';
     escrowFinishTimeField: string = '';
     escrowFinishTimeUnit: string = 'seconds';
     escrowCancelTimeUnit: string = 'seconds';
     escrowConditionField: string = '';
     escrowFulfillmentField: string = '';
     escrowCancelTimeField: string = '';
     escrowOwnerField: string = '';
     escrowSequenceNumberField: string = '';
     selectedEscrow: any = null;
     mptIssuanceIdField: string = '';
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
     escrowCancelDateTimeField: string = '';
     escrowFinishDateTimeField: string = '';
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
     private cachedReserves: any = null;
     sourceTagField: string = '';
     invoiceIdField: string = '';
     encryptionType: string = '';
     hasWallets: boolean = true;
     expiredOrFulfilledEscrows: any = [];
     finishEscrow: any = [];
     existingEscrow: any = [];
     exsitingMpt: any = [];
     existingIOUs: any = [];
     // Controls whether the panel is expanded or collapsed
     outstandingEscrowCollapsed = true;
     outstandingMptCollapsed: boolean = true;
     outstandingIOUCollapsed: boolean = true;
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

          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               if (!this.wallets) {
                    this.hasWallets = false;
                    return;
               }
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

     onSubmit() {
          if (this.activeTab === 'create') {
               this.createConditionalEscrow();
          } else if (this.activeTab === 'finish') {
               this.finishConditionalEscrow();
          } else if (this.activeTab === 'cancel') {
               this.cancelEscrow();
          }
     }

     async setTab(tab: string) {
          console.log('Entering setTab');
          const startTime = Date.now();

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

          if (this.activeTab === 'cancel' || this.activeTab === 'finish') {
               const client = await this.xrplService.getClient();
               const escrowObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'escrow');
               this.getExpiredOrFulfilledEscrows(client, escrowObjects, this.currentWallet.address);
          }

          if (this.activeTab === 'create') {
               const client = await this.xrplService.getClient();
               const accountObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', '');
               this.getExistingEscrows(accountObjects, this.currentWallet.address);
               this.getExistingMpts(accountObjects, this.currentWallet.address);
               this.getExistingIOUs(accountObjects, this.currentWallet.address);
          }

          if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
               this.toggleIssuerField();
          }

          this.resetEscrowSelection();

          this.clearFields(true);

          this.executionTime = (Date.now() - startTime).toString();
          console.log(`Leaving setTab in ${this.executionTime}ms`);
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

     onWalletListChange(): void {
          if (this.wallets.length <= 0) {
               this.hasWallets = false;
               return;
          }

          if (this.wallets.length === 1 && this.wallets[0].address === '') {
               this.hasWallets = false;
               return;
          }

          if (this.wallets.length > 0 && this.selectedWalletIndex >= this.wallets.length) {
               this.selectedWalletIndex = 0;
          }

          this.onAccountChange();
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
          this.ui.updateSpinnerMessage(``);
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);
          const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment, this.encryptionType);
          const client = await this.xrplService.getClient();
          this.refreshWallets(client, [faucetWallet.address]);
          this.ui.spinner = false;
          this.ui.clearWarning();
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
          this.saveWallets();

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
               await this.getEscrows();
               if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
                    await this.onCurrencyChange();
               }
          } else if (this.currentWallet.address) {
               this.ui.setError('Invalid XRP address');
          }
     }

     toggleOutstandingEscrows() {
          this.outstandingEscrowCollapsed = !this.outstandingEscrowCollapsed;
     }

     toggleOutstandingMpt() {
          this.outstandingMptCollapsed = !this.outstandingMptCollapsed;
     }

     toggleOutstandingIOU() {
          this.outstandingIOUCollapsed = !this.outstandingIOUCollapsed;
     }

     validateQuorum() {
          const totalWeight = this.signers.reduce((sum, s) => sum + (s.weight || 0), 0);
          if (this.signerQuorum > totalWeight) {
               this.signerQuorum = totalWeight;
          }
     }

     async toggleMultiSign() {
          try {
               if (!this.useMultiSign) {
                    this.utilsService.clearSignerList(this.signers);
               } else {
                    const wallet = await this.getWallet();
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               }
          } catch (error: any) {
               this.ui.setError(`ERROR getting wallet in toggleMultiSign' ${error.message}`);
          }
     }

     async toggleUseMultiSign() {
          if (this.multiSignAddress === 'No Multi-Sign address configured for account') {
               this.multiSignSeeds = '';
          }
     }

     onTicketToggle(event: any, ticket: string) {
          if (event.target.checked) {
               this.selectedTickets = [...this.selectedTickets, ticket];
          } else {
               this.selectedTickets = this.selectedTickets.filter(t => t !== ticket);
          }
     }

     async getEscrows() {
          console.log('Entering getEscrows');
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

               this.getExistingEscrows(accountObjects, wallet.classicAddress);
               this.getExistingMpts(accountObjects, this.currentWallet.address);
               this.getExistingIOUs(accountObjects, this.currentWallet.address);
               this.getExpiredOrFulfilledEscrows(client, accountObjects, wallet.classicAddress);

               if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT' && this.selectedIssuer !== '') {
                    const tokenBalance = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');
                    console.debug('Token Balance:', tokenBalance.result);

                    console.debug(`parseAllGatewayBalances:`, this.parseAllGatewayBalances(tokenBalance, wallet));
                    const parsedBalances = this.parseAllGatewayBalances(tokenBalance, wallet);
                    if (parsedBalances && Object.keys(parsedBalances).length > 0) {
                         this.tokenBalance = parsedBalances?.[this.currencyFieldDropDownValue]?.[this.selectedIssuer] ?? '0';
                    } else {
                         this.tokenBalance = '0';
                    }

                    this.setCachedAccountData(this.currentWallet.address, { accountObjects, tokenBalance });
               }

               await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

               this.refreshUIData(wallet, accountInfo, accountObjects);
               // this.getEscrowOwnerAddress();
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getEscrows:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getEscrows in ${this.executionTime}ms`);
          }
     }

     async createConditionalEscrow() {
          console.log('Entering createConditionalEscrow');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               senderAddress: this.currentWallet.address,
               amount: this.amountField,
               destination: this.destinationField,
               conditionField: this.escrowConditionField,
               finishTime: this.escrowFinishTimeField,
               cancelTime: this.escrowCancelTimeField,
               destinationTag: this.destinationTagField,
               selectedIssuer: this.selectedIssuer,
               currency: this.currencyFieldDropDownValue,
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

               const [accountInfo, trustLines, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logObjects('trustLines', trustLines);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;
               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('CreateTimeBasedEscrow', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const finishAfterTime = this.utilsService.addTime(this.escrowFinishTimeField, this.escrowFinishTimeUnit as 'seconds' | 'minutes' | 'hours' | 'days');
               const cancelAfterTime = this.utilsService.addTime(this.escrowCancelTimeField, this.escrowCancelTimeUnit as 'seconds' | 'minutes' | 'hours' | 'days');
               console.log(`finishUnit: ${this.escrowFinishTimeUnit} cancelUnit: ${this.escrowCancelTimeUnit}`);
               console.log(`finishTime: ${this.utilsService.convertXRPLTime(finishAfterTime)} cancelTime: ${this.utilsService.convertXRPLTime(cancelAfterTime)}`);

               // Build amount object depending on currency
               const amountToCash =
                    this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY
                         ? xrpl.xrpToDrops(this.amountField)
                         : {
                                value: this.amountField,
                                currency: this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue),
                                issuer: this.issuerFields,
                           };

               let escrowCreateTx: xrpl.EscrowCreate = {
                    TransactionType: 'EscrowCreate',
                    Account: wallet.address,
                    Amount: amountToCash,
                    Destination: resolvedDestination,
                    FinishAfter: finishAfterTime,
                    CancelAfter: cancelAfterTime,
                    Condition: this.escrowConditionField,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, escrowCreateTx, wallet, accountInfo, 'create');

               if (this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY) {
                    if (this.amountField || this.amountField === '') {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, escrowCreateTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    } else {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, escrowCreateTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    }
               } else if (this.currencyFieldDropDownValue !== 'MPT') {
                    if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, escrowCreateTx, resolvedDestination)) {
                         return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
                    }
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Create Conditional Escrow (no changes will be made)...' : 'Submitting Create Conditional Escrow to Ledger...', 200);

               this.ui.paymentTx.push(escrowCreateTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, escrowCreateTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, escrowCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.successMessage = 'Created escrow successfully!';

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    this.getExistingEscrows(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);

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
                    this.ui.successMessage = 'Simulated Escrow create successfully!';
               }
          } catch (error: any) {
               console.error('Error in createConditionalEscrow:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving createConditionalEscrow in ${this.executionTime}ms`);
          }
     }

     async finishConditionalEscrow() {
          console.log('Entering finishConditionalEscrow');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               conditionField: this.escrowConditionField,
               fulfillment: this.escrowFulfillmentField,
               escrowSequence: this.escrowSequenceNumberField.toString(),
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

          // If condition is provided, fulfillment is required
          if (this.escrowConditionField && !this.utilsService.validateInput(this.escrowFulfillmentField)) {
               return this.ui.setError('ERROR: Fulfillment is required when a condition is provided');
          }

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, escrowObjects, escrow, trustLines, fee, currentLedger, serverInfo] = await Promise.all([
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'escrow'),
                    this.xrplService.getEscrowBySequence(client, wallet.classicAddress, Number(this.escrowSequenceNumberField)),
                    this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''),
                    String(4 * Number(await this.xrplService.calculateTransactionFee(client))),
                    this.xrplService.getLastLedgerIndex(client),
                    this.xrplService.getXrplServerInfo(client, 'current', ''),
               ]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logObjects('trustLines', trustLines);
               // this.utilsService.logEscrowObjects(escrowObjects, escrow);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.destination = this.escrowOwnerField;
               inputs.accountInfo = accountInfo;
               inputs.escrow_objects = escrowObjects;

               const errors = await this.validationService.validate('FinishTimeBasedEscrow', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               // Check if the escrow can be canceled based on the CancelAfter time
               const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
               const escrowStatus = this.utilsService.checkEscrowStatus({ FinishAfter: escrow.FinshAfter ? Number(escrow.FinshAfter) : undefined, CancelAfter: escrow.CancelAfter ? Number(escrow.CancelAfter) : undefined, Condition: this.escrowConditionField, owner: this.escrowOwnerField }, currentRippleTime, wallet.classicAddress, 'finishEscrow', this.escrowFulfillmentField);

               if (!escrowStatus.canFinish && !escrowStatus.canCancel) {
                    return this.ui.setError(`\n${escrowStatus.reasonCancel}\n${escrowStatus.reasonFinish}`);
               }

               if (!escrowStatus.canFinish) {
                    return this.ui.setError(`${escrowStatus.reasonFinish}`);
               }

               let escrowFinishTx: xrpl.EscrowFinish = {
                    TransactionType: 'EscrowFinish',
                    Account: wallet.classicAddress,
                    Owner: this.escrowOwnerField,
                    OfferSequence: parseInt(this.escrowSequenceNumberField),
                    Condition: this.escrowConditionField,
                    Fulfillment: this.escrowFulfillmentField,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, escrowFinishTx, wallet, accountInfo, 'finish');

               if (this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY) {
                    if (this.amountField || this.amountField === '') {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, escrowFinishTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    } else {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, escrowFinishTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    }
               } else if (this.currencyFieldDropDownValue !== 'MPT') {
                    // if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, escrowFinishTx, resolvedDestination)) {
                    //      return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
                    // }
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Finishing Conditional Escrow (no changes will be made)...' : 'Submitting Finish Conditional Escrow to Ledger...', 200);

               this.ui.paymentTx.push(escrowFinishTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, escrowFinishTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, escrowFinishTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.successMessage = 'Finished escrow successfully!';

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    this.getExistingEscrows(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress, this.escrowOwnerField]).catch(console.error);

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
                    this.ui.successMessage = 'Simulated Escrow finish successfully!';
               }
          } catch (error: any) {
               console.error('Error in finishConditionalEscrow:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving finishConditionalEscrow in ${this.executionTime}ms`);
          }
     }

     async cancelEscrow() {
          console.log('Entering cancelEscrow');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               escrowSequence: this.escrowSequenceNumberField.toString(),
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

               const [accountInfo, escrowObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'escrow'), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logEscrowObjects(escrowObjects, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;
               inputs.accountInfo = accountInfo;
               inputs.escrow_objects = escrowObjects;

               const errors = await this.validationService.validate('CancelTimeBasedEscrow', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               let foundSequenceNumber = false;
               let escrowOwner = this.currentWallet.address;
               let escrow: EscrowObject | undefined = undefined;
               for (const [ignore, obj] of escrowObjects.result.account_objects.entries()) {
                    if (obj.PreviousTxnID) {
                         const sequenceTx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
                         if (sequenceTx.result.tx_json.Sequence === Number(this.escrowSequenceNumberField)) {
                              foundSequenceNumber = true;
                              escrow = obj as unknown as EscrowObject;
                              escrowOwner = escrow.Account;
                              break;
                         } else if (sequenceTx.result.tx_json.TicketSequence != undefined && sequenceTx.result.tx_json.TicketSequence === Number(this.escrowSequenceNumberField)) {
                              foundSequenceNumber = true;
                              escrow = obj as unknown as EscrowObject;
                              escrowOwner = escrow.Account;
                              break;
                         }
                    }
               }

               if (!escrow) {
                    return this.ui.setError(`No escrow found for sequence ${this.escrowSequenceNumberField}`);
               }

               // Check if the escrow can be canceled based on the CancelAfter time
               const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
               // Ensure FinishAfter and CancelAfter are numbers
               const finishAfterNum = escrow.FinshAfter !== undefined ? Number(escrow.FinshAfter) : undefined;
               const cancelAfterNum = escrow.CancelAfter !== undefined ? Number(escrow.CancelAfter) : undefined;
               const escrowStatus = this.utilsService.checkTimeBasedEscrowStatus({ FinishAfter: finishAfterNum, CancelAfter: cancelAfterNum, owner: escrowOwner }, currentRippleTime, wallet.classicAddress, 'cancelEscrow');

               if (!escrowStatus.canCancel) {
                    return this.ui.setError(`${escrowStatus.reasonCancel}`);
               }

               let escrowCancelTx: xrpl.EscrowCancel = {
                    TransactionType: 'EscrowCancel',
                    Account: wallet.classicAddress,
                    Owner: escrowOwner,
                    OfferSequence: parseInt(this.escrowSequenceNumberField),
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, escrowCancelTx, wallet, accountInfo, 'cancel');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, escrowCancelTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Cancelling Conditional Escrow (no changes will be made)...' : 'Submitting Cancel Conditional Escrow to Ledger...', 200);

               this.ui.paymentTx.push(escrowCancelTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, escrowCancelTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, escrowCancelTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.successMessage = 'Cancelled escrow successfully!';

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    // Re-fetch and update the "Available Escrows to cancel" list
                    this.getExpiredOrFulfilledEscrows(client, updatedAccountObjects, wallet.classicAddress);

                    // Refresh existingEscrow list (this powers the infoMessage on the Create tab, but also keeps data consistent)
                    if (this.activeTab === 'cancel') {
                         this.getExistingEscrows(updatedAccountObjects, wallet.classicAddress);
                         this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                         this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);
                    }

                    if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
                         await this.updateCurrencyBalance(gatewayBalances, wallet);
                         await this.toggleIssuerField();
                    }

                    this.resetEscrowSelection();
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Escrow cancel successfully!';
               }
          } catch (error: any) {
               console.error('Error in cancelEscrow:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving cancelEscrow in ${this.executionTime}ms`);
          }
     }

     private getExistingEscrows(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string): EscrowDataForUI[] {
          this.existingEscrow = (escrowObjects.result.account_objects ?? [])
               .filter(
                    (obj: any) =>
                         obj.LedgerEntryType === 'Escrow' &&
                         obj.Account === classicAddress &&
                         // Only condition-based escrows:
                         (obj.FinishAfter || obj.CancelAfter) &&
                         !!obj.Condition
               )
               .map((obj: any): EscrowDataForUI => {
                    const sendMax = obj.Amount;
                    let amount = '0';
                    let currency = '';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                         currency = '';
                    } else if (sendMax?.value) {
                         amount = sendMax.value;
                         currency = this.utilsService.normalizeCurrencyCode(sendMax.currency);
                    }

                    return {
                         Account: obj.Account,
                         Amount: `${amount} ${currency}`,
                         Destination: obj.Destination,
                         DestinationTag: obj.DestinationTag,
                         CancelAfter: obj.CancelAfter,
                         FinishAfter: obj.FinishAfter,
                         TxHash: obj.PreviousTxnID,
                         Sequence: obj.PreviousTxnID,
                    };
               })
               .sort((a, b) => a.Destination.localeCompare(b.Destination));

          this.utilsService.logObjects('existingEscrow', this.existingEscrow);
          return this.existingEscrow;
     }

     private getExistingMpts(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string): MPToken[] {
          this.exsitingMpt = (escrowObjects.result.account_objects ?? [])
               .filter((obj: any) => (obj.LedgerEntryType === 'MPToken' || obj.LedgerEntryType === 'MPTokenIssuance') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
               .map((obj: any): MPToken => {
                    return {
                         LedgerEntryType: obj.LedgerEntryType,
                         MPTAmount: obj.MaximumAmount ? obj.MaximumAmount : obj.MPTAmount,
                         mpt_issuance_id: obj.mpt_issuance_id ? obj.mpt_issuance_id : obj.MPTokenIssuanceID,
                    };
               })
               .sort((a, b) => {
                    const ai = a.mpt_issuance_id ?? '';
                    const bi = b.mpt_issuance_id ?? '';
                    return ai.localeCompare(bi);
               });

          this.utilsService.logObjects('exsitingMpt', this.exsitingMpt);
          return this.exsitingMpt;
     }

     private getExistingIOUs(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string): RippleState[] {
          this.existingIOUs = (accountObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'RippleState')
               .map((obj: any): RippleState => {
                    const balance = obj.Balance?.value ?? '0';
                    const currency = this.utilsService.normalizeCurrencyCode(obj.Balance?.currency);

                    // Determine if this account is the issuer or holder
                    const issuer = obj.HighLimit?.issuer === classicAddress ? obj.LowLimit?.issuer : obj.HighLimit?.issuer;

                    return {
                         LedgerEntryType: 'RippleState',
                         Balance: {
                              currency,
                              value: balance,
                         },
                         HighLimit: {
                              issuer,
                         },
                    };
               })
               // Sort alphabetically by issuer or currency if available
               .sort((a, b) => a.HighLimit.issuer.localeCompare(b.HighLimit.issuer));

          this.utilsService.logObjects('existingIOUs', this.existingIOUs);
          return this.existingIOUs;
     }

     // private async getExpiredOrFulfilledEscrows(client: xrpl.Client, escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
     //      const currentLedger = await client.request({ command: 'ledger', ledger_index: 'validated' });
     //      const ledgerTime = xrpl.rippleTimeToUnixTime(currentLedger.result.ledger.close_time);

     //      const filteredEscrows = (escrowObjects.result.account_objects ?? []).filter((obj: any) => {
     //           if (obj.LedgerEntryType !== 'Escrow') return false;

     //           const isCancelMode = this.activeTab === 'cancel';
     //           const isOwner = obj.Account === classicAddress;
     //           const isRecipient = obj.Destination === classicAddress;

     //           // Basic ownership filtering
     //           if (isCancelMode && !isOwner) return false;
     //           if (!isCancelMode && !isRecipient) return false;

     //           // Check expiration / fulfillment conditions
     //           const cancelAfter = obj.CancelAfter ? xrpl.rippleTimeToUnixTime(obj.CancelAfter) : null;
     //           const finishAfter = obj.FinishAfter ? xrpl.rippleTimeToUnixTime(obj.FinishAfter) : null;

     //           // For cancel: can cancel if escrow is expired (CancelAfter < now)
     //           if (isCancelMode && cancelAfter && cancelAfter > ledgerTime) return false;

     //           // For finish: can finish if still active (CancelAfter not passed)
     //           if (!isCancelMode && cancelAfter && cancelAfter <= ledgerTime) return false;

     //           // If FinishAfter is set and not yet reached, can't finish yet
     //           if (!isCancelMode && finishAfter && finishAfter > ledgerTime) return false;

     //           return true;
     //      });

     //      // Process remaining escrows in parallel
     //      const processedEscrows = await Promise.all(
     //           filteredEscrows.map(async (obj: any) => {
     //                const sendMax = obj.Amount;
     //                let amount = '0';

     //                if (typeof sendMax === 'string') {
     //                     amount = String(xrpl.dropsToXrp(sendMax));
     //                } else if (sendMax?.value) {
     //                     amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
     //                }

     //                let EscrowSequence: number | null = null;
     //                if (obj.PreviousTxnID) {
     //                     try {
     //                          const sequenceTx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
     //                          EscrowSequence = sequenceTx?.result?.tx_json?.Sequence ?? null;
     //                     } catch (error) {
     //                          console.warn(`Failed to fetch escrow sequence for ${obj.PreviousTxnID}:`, error);
     //                     }
     //                }

     //                return {
     //                     Amount: amount,
     //                     Sender: obj.Account,
     //                     Destination: obj.Destination,
     //                     EscrowSequence,
     //                };
     //           })
     //      );

     //      this.expiredOrFulfilledEscrows = processedEscrows.sort((a, b) => a.Sender.localeCompare(b.Sender));

     //      this.utilsService.logObjects('expiredOrFulfilledEscrows', this.expiredOrFulfilledEscrows);
     // }

     private async getExpiredOrFulfilledEscrows(client: xrpl.Client, escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const filteredEscrows = (escrowObjects.result.account_objects ?? []).filter(
               (obj: any) =>
                    obj.LedgerEntryType === 'Escrow' &&
                    (this.activeTab === 'cancel'
                         ? obj.Account === classicAddress // owner can cancel
                         : obj.Destination === classicAddress) // receiver can finish
          );

          const processedEscrows = await Promise.all(
               filteredEscrows.map(async (obj: any) => {
                    const sendMax = obj.Amount;
                    let amount = '0';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }

                    let EscrowSequence: number | null = null;
                    if (obj.PreviousTxnID) {
                         try {
                              const sequenceTx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
                              EscrowSequence = sequenceTx?.result?.tx_json?.Sequence ?? null;
                         } catch (error) {
                              console.warn(`Failed to fetch escrow sequence for ${obj.PreviousTxnID}:`, error);
                         }
                    }

                    return {
                         Amount: amount,
                         Sender: obj.Account,
                         Destination: obj.Destination,
                         EscrowSequence,
                    };
               })
          );

          this.expiredOrFulfilledEscrows = processedEscrows.sort((a, b) => a.Sender.localeCompare(b.Sender));

          this.utilsService.logObjects('expiredOrFulfilledEscrows', this.expiredOrFulfilledEscrows);
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

     // Only used in Trustlines template
     // get availableCurrencies(): string[] {
     //      const all = Object.keys(this.knownTrustLinesIssuers);
     //      // Remove XRP only on Trustlines page
     //      return all.filter(currency => currency !== '');
     // }

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

     private async setTxOptionalFields(client: xrpl.Client, escrowTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (this.selectedSingleTicket) {
               const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!ticketExists) {
                    throw new Error(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
               }
               this.utilsService.setTicketSequence(escrowTx, this.selectedSingleTicket, true);
          } else {
               if (this.multiSelectMode && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(escrowTx, accountInfo.result.account_data.Sequence, false);
               }
          }

          if (this.destinationTagField && parseInt(this.destinationTagField) > 0) {
               this.utilsService.setDestinationTag(escrowTx, this.destinationTagField);
          }
          if (this.memoField) {
               this.utilsService.setMemoField(escrowTx, this.memoField);
          }

          if (txType === 'create') {
               if (this.currencyFieldDropDownValue === 'MPT') {
                    const isShortForm = this.destinationField.includes('...');
                    const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;
                    const accountObjects = await this.xrplService.getAccountObjects(client, resolvedDestination, 'validated', '');
                    const mptTokens = accountObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'MPToken');
                    console.debug(`Destination MPT Tokens:`, mptTokens);
                    console.debug('MPT Issuance ID:', this.mptIssuanceIdField);
                    const authorized = mptTokens.some((obj: any) => obj.MPTokenIssuanceID === this.mptIssuanceIdField);

                    if (!authorized) {
                         throw new Error(`Destination ${resolvedDestination} is not authorized to receive this MPT (issuance ID ${this.mptIssuanceIdField}). Please ensure authorization has been completed.`);
                    }

                    const curr: xrpl.MPTAmount = {
                         mpt_issuance_id: this.mptIssuanceIdField,
                         value: this.amountField,
                    };
                    escrowTx.Amount = curr;
               } else if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
                    const curr: xrpl.IssuedCurrencyAmount = {
                         currency: this.currencyFieldDropDownValue.length > 3 ? this.utilsService.encodeCurrencyCode(this.currencyFieldDropDownValue) : this.currencyFieldDropDownValue,
                         issuer: this.issuerFields,
                         value: this.amountField,
                    };
                    escrowTx.Amount = curr;
               } else {
                    escrowTx.Amount = xrpl.xrpToDrops(this.amountField);
               }
          }
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);

          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     private checkForSignerAccounts(accountObjects: xrpl.AccountObjectsResponse): string[] {
          const accountObjectsArray = accountObjects.result?.account_objects;
          if (!Array.isArray(accountObjectsArray)) return [];

          const signerAccounts: string[] = [];

          for (const obj of accountObjectsArray) {
               if (obj.LedgerEntryType === 'SignerList' && Array.isArray(obj.SignerEntries)) {
                    // Set quorum once
                    if (obj.SignerQuorum !== undefined) {
                         this.signerQuorum = obj.SignerQuorum;
                    }

                    for (const entry of obj.SignerEntries) {
                         const account = entry.SignerEntry?.Account;
                         if (account) {
                              signerAccounts.push(`${account}~${entry.SignerEntry.SignerWeight ?? ''}`);
                         }
                    }
               }
          }

          return signerAccounts;
     }

     private getAccountTickets(accountObjects: xrpl.AccountObjectsResponse): string[] {
          const objects = accountObjects.result?.account_objects;
          if (!Array.isArray(objects)) return [];

          const tickets = objects.reduce((acc: number[], obj) => {
               if (obj.LedgerEntryType === 'Ticket' && typeof obj.TicketSequence === 'number') {
                    acc.push(obj.TicketSequence);
               }
               return acc;
          }, []);

          return tickets.sort((a, b) => a - b).map(String);
     }

     public cleanUpSingleSelection() {
          // Check if selected ticket still exists in available tickets
          if (this.selectedSingleTicket && !this.ticketArray.includes(this.selectedSingleTicket)) {
               this.selectedSingleTicket = ''; // Reset to "Select a ticket"
          }
     }

     public cleanUpMultiSelection() {
          // Filter out any selected tickets that no longer exist
          this.selectedTickets = this.selectedTickets.filter(ticket => this.ticketArray.includes(ticket));
     }

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          this.ticketArray = this.getAccountTickets(accountObjects);

          // Clean up selections based on current mode
          if (this.multiSelectMode) {
               this.cleanUpMultiSelection();
          } else {
               this.cleanUpSingleSelection();
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
                    this.cdr.detectChanges();
               }
          );
     }

     public refreshUiAccountObjects(accountObjects: xrpl.AccountObjectsResponse, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet): void {
          // Tickets
          this.ticketArray = this.getAccountTickets(accountObjects);
          this.selectedTicket = this.ticketArray[0] || this.selectedTicket;

          // Signer accounts
          const signerAccounts = this.checkForSignerAccounts(accountObjects);
          const hasSignerAccounts = signerAccounts?.length > 0;

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

          // Boolean flags
          this.multiSigningEnabled = hasSignerAccounts;
          this.useMultiSign = false;
          this.masterKeyDisabled = Boolean(accountInfo?.result?.account_flags?.disableMasterKey);

          this.clearFields(false);
     }

     public refreshUiAccountInfo(accountInfo: xrpl.AccountInfoResponse): void {
          const accountData = accountInfo?.result?.account_data;
          if (!accountData) return;

          const regularKey = accountData.RegularKey;
          const isMasterKeyDisabled = accountInfo?.result?.account_flags?.disableMasterKey ?? false;

          // Set regular key properties
          this.setRegularKeyProperties(regularKey, accountData.Account);

          // Set master key property
          this.masterKeyDisabled = isMasterKeyDisabled;

          // Set regular key signing enabled flag
          this.regularKeySigningEnabled = !!regularKey;
     }

     private setRegularKeyProperties(regularKey: string | undefined, account: string): void {
          if (regularKey) {
               this.regularKeyAddress = regularKey;
               this.regularKeySeed = this.storageService.get(`${account}regularKeySeed`) || '';
          } else {
               this.regularKeyAddress = 'No RegularKey configured for account';
               this.regularKeySeed = '';
               this.isRegularKeyAddress = false;
          }
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.storageService.set('destinations', this.destinations);
     }

     onEscrowSelect(selected: any) {
          if (selected) {
               this.escrowSequenceNumberField = selected.EscrowSequence;
               this.escrowOwnerField = selected.Sender; // or selected.Account depending on your data
          }
     }

     async getEscrowOwnerAddress() {
          console.log('Entering getEscrowOwnerAddress');
          const startTime = Date.now();

          try {
               const client = await this.xrplService.getClient();
               const accountInfo = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', '');
               // this.utilsService.logObjects('accountInfo', accountInfo);

               const inputs: ValidationInputs = { seed: this.currentWallet.seed, senderAddress: this.currentWallet.address, accountInfo: accountInfo };

               const errors = await this.validationService.validate('EscrowOwner', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const escrowObjects = accountInfo.result.account_objects;
               if (escrowObjects.length === 0) {
                    this.escrowOwnerField = this.currentWallet.address;
                    return;
               }

               const targetSequence = Number(this.escrowSequenceNumberField);
               if (isNaN(targetSequence)) {
                    this.escrowOwnerField = this.currentWallet.address;
                    return;
               }

               const txPromises = escrowObjects.map(async escrow => {
                    const previousTxnID = escrow.PreviousTxnID;
                    if (typeof previousTxnID !== 'string') {
                         return Promise.resolve({ escrow, sequence: null });
                    }
                    try {
                         const sequenceTx = await this.xrplService.getTxData(client, previousTxnID);
                         const offerSequence = sequenceTx.result.tx_json.Sequence;
                         return { escrow, sequence: offerSequence ?? null };
                    } catch (err: any) {
                         console.error(`Failed to fetch tx ${previousTxnID}:`, err.message || err);
                         return { escrow, sequence: null };
                    }
               });

               const results = await Promise.all(txPromises);

               const match = results.find(r => r.sequence === targetSequence);
               if (match && 'Account' in match.escrow) {
                    this.escrowOwnerField = match.escrow.Account;
               } else {
                    this.escrowOwnerField = this.currentWallet.address; // safe fallback
               }
          } catch (error: any) {
               console.error('Error in getEscrowOwnerAddress:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
               this.escrowOwnerField = this.currentWallet.address; // safe fallback
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getEscrowOwnerAddress in ${this.executionTime}ms`);
          }
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
          const wallet = await this.utilsService.getWallet(this.currentWallet.seed);
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     saveWallets() {
          this.storageService.set('wallets', JSON.stringify(this.wallets));
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

     copyEscrowTxHash(PreviousTxnID: string) {
          navigator.clipboard.writeText(PreviousTxnID).then(() => {
               this.ui.showToastMessage('Escrow Tx Hash copied!');
          });
     }

     copyMptIssuanceIdHash(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.ui.showToastMessage('MPT Issuance ID copied!');
          });
     }

     copyIOUIssuanceAddress(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.ui.showToastMessage('IOU Token Issuer copied!');
          });
     }

     // public get infoMessage(): string | null {
     //      // ------------------------------------------------------------------
     //      // 1. Decide which data belongs to the current tab
     //      // ------------------------------------------------------------------
     //      let escrows: any[] = [];
     //      let description = '';
     //      let showEscrowLink = false;

     //      if (this.activeTab === 'create') {
     //           escrows = this.existingEscrow; // escrows I own
     //           description = 'on the ledger';
     //           showEscrowLink = escrows.length > 0;
     //      } else if (this.activeTab === 'cancel') {
     //           escrows = this.expiredOrFulfilledEscrows.filter(
     //                (e: { Sender: string }) =>
     //                     // On Cancel tab we are the Owner → only show escrows we created
     //                     e.Sender === this.currentWallet.address
     //           );
     //           description = 'that can be cancelled';
     //           showEscrowLink = escrows.length > 0;
     //      } else if (this.activeTab === 'finish') {
     //           escrows = this.expiredOrFulfilledEscrows.filter(
     //                (e: { Destination: string }) =>
     //                     // On Finish tab we are the Destination → only show escrows sent to us
     //                     e.Destination === this.currentWallet.address
     //           );
     //           description = 'that can be finished';
     //           showEscrowLink = escrows.length > 0;
     //      }

     //      const walletName = this.currentWallet.name || 'selected';
     //      const escrowCount = escrows.length;

     //      // ------------------------------------------------------------------
     //      // 2. Build the message – **never mention IOUs/MPTs on Cancel/Finish**
     //      // ------------------------------------------------------------------
     //      if (escrowCount === 0) {
     //           return `The <code>${walletName}</code> wallet has no escrows ${description}.`;
     //      }

     //      const escrowWord = escrowCount === 1 ? 'escrow' : 'escrows';
     //      let message = `The <code>${walletName}</code> wallet has ${escrowCount} ${escrowWord} ${description}.`;

     //      if (showEscrowLink) {
     //           message += `<br><a href="${this.url}account/${this.currentWallet.address}/escrows" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View Escrows on XRPL Win</a>`;
     //      }

     //      return message;
     // }

     public get infoMessage(): string | null {
          const walletName = this.currentWallet.name || 'selected';

          // ==================================================================
          // 1. CREATE TAB → show everything (escrows + IOUs + MPTs)
          // ==================================================================
          if (this.activeTab === 'create') {
               const escrowCount = this.existingEscrow.length;
               const iouCount = this.existingIOUs.length;
               const mptCount = this.exsitingMpt.length;

               const parts: string[] = [];
               if (escrowCount > 0) parts.push(`${escrowCount} escrow${escrowCount > 1 ? 's' : ''}`);
               if (iouCount > 0) parts.push(`${iouCount} IOU${iouCount > 1 ? 's' : ''}`);
               if (mptCount > 0) parts.push(`${mptCount} MPT${mptCount > 1 ? 's' : ''}`);

               if (parts.length === 0) {
                    return `The <code>${walletName}</code> wallet has no escrows, IOUs or MPTs yet.`;
               }

               let message = `The <code>${walletName}</code> wallet has ${this.formatParts(parts)} on the ledger.`;

               // Add links
               const links: string[] = [];
               if (escrowCount > 0) links.push(`<a href="${this.url}account/${this.currentWallet.address}/escrows" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View Escrows</a>`);
               if (mptCount > 0) links.push(`<a href="${this.url}account/${this.currentWallet.address}/mpts/owned" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View MPTs</a>`);
               if (iouCount > 0) links.push(`<a href="${this.url}account/${this.currentWallet.address}/tokens" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View IOUs</a>`);

               if (links.length > 0) {
                    message += `<br>${links.join(' | ')} on XRPL Win`;
               }

               return message;
          }

          // ==================================================================
          // 2. CANCEL & FINISH TABS → show ONLY real cancellable/finishable escrows
          // ==================================================================
          let relevantEscrows: any[] = [];
          let action: string = '';

          if (this.activeTab === 'cancel') {
               // Only escrows where WE are the owner AND CancelAfter has passed
               relevantEscrows = this.expiredOrFulfilledEscrows.filter((e: { Sender: string }) => e.Sender === this.currentWallet.address);
               action = 'cancelled';
          } else if (this.activeTab === 'finish') {
               // Only escrows where WE are the destination (and either FinishAfter passed or no CancelAfter)
               relevantEscrows = this.expiredOrFulfilledEscrows.filter((e: { Destination: string }) => e.Destination === this.currentWallet.address);
               action = 'finished';
          }

          const count = relevantEscrows.length;

          if (count === 0) {
               return `The <code>${walletName}</code> wallet has no escrows that can be ${action}.`;
          }

          const escrowWord = count === 1 ? 'escrow' : 'escrows';
          let message = `The <code>${walletName}</code> wallet has ${count} ${escrowWord} that can be ${action}.`;

          message += `<br><a href="${this.url}account/${this.currentWallet.address}/escrows" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View Escrows on XRPL Win</a>`;

          return message;
     }

     // Helper to nicely join parts like "1 escrow", "2 IOUs", and "1 MPT"
     private formatParts(parts: string[]): string {
          if (parts.length === 1) return parts[0];
          if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
          return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
     }

     // public get infoMessage(): string | null {
     //      const tabConfig = {
     //           create: {
     //                escrows: this.existingEscrow,
     //                mpts: this.exsitingMpt,
     //                ious: this.existingIOUs,
     //                description: 'on the ledger',
     //                dynamicText: '', // Empty for no additional text
     //                showLink: false,
     //           },
     //           finish: {
     //                escrows: this.expiredOrFulfilledEscrows,
     //                mpts: this.exsitingMpt,
     //                ious: this.existingIOUs,
     //                description: 'that can be finished',
     //                dynamicText: '',
     //                showLink: false,
     //           },
     //           cancel: {
     //                escrows: this.expiredOrFulfilledEscrows,
     //                mpts: this.exsitingMpt,
     //                ious: this.existingIOUs,
     //                description: 'that can be cancelled',
     //                dynamicText: '',
     //                showLink: false,
     //           },
     //      };

     //      const config = tabConfig[this.activeTab as keyof typeof tabConfig];
     //      if (!config) return null;

     //      const walletName = this.currentWallet.name || 'selected';
     //      const escrowCount = config.escrows.length;
     //      const mptCount = config.mpts.length;
     //      const iouCount = config.ious.length;
     //      const totalCount = escrowCount + mptCount + iouCount;

     //      // Build the dynamic text part (with space if text exists)
     //      const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

     //      // Build the item list
     //      const itemParts = [];
     //      if (escrowCount > 0) {
     //           const escrowText = escrowCount === 1 ? 'escrow' : 'escrows';
     //           itemParts.push(`${escrowCount} ${escrowText}`);
     //      }
     //      if (mptCount > 0) {
     //           const mptText = mptCount === 1 ? 'MPT' : 'MPTs';
     //           itemParts.push(`${mptCount} ${mptText}`);
     //      }
     //      if (iouCount > 0) {
     //           const iouText = iouCount === 1 ? 'IOU' : 'IOUs';
     //           itemParts.push(`${iouCount} ${iouText}`);
     //      }

     //      // Format the item list
     //      let itemList = '';
     //      if (itemParts.length === 1) {
     //           itemList = itemParts[0];
     //      } else if (itemParts.length === 2) {
     //           itemList = itemParts.join(' and ');
     //      } else if (itemParts.length === 3) {
     //           itemList = `${itemParts[0]}, ${itemParts[1]}, and ${itemParts[2]}`;
     //      }

     //      let message = `The <code>${walletName}</code> wallet has ${dynamicText}${itemList} ${config.description}.`;

     //      if (totalCount > 0) {
     //           const links = [];
     //           if (escrowCount > 0) {
     //                links.push(`<a href="${this.url}account/${this.currentWallet.address}/escrows" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View Escrows on XRPL Win</a>`);
     //           }
     //           if (mptCount > 0) {
     //                links.push(`<a href="${this.url}account/${this.currentWallet.address}/mpts/owned" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View MPTs on XRPL Win</a>`);
     //           }
     //           if (iouCount > 0) {
     //                links.push(`<a href="${this.url}account/${this.currentWallet.address}/tokens" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View IOUs on XRPL Win</a>`);
     //           }

     //           if (links.length === 1) {
     //                message += `<br>${links[0]}`;
     //           } else {
     //                message += `<br>${links.join(' | ')}`;
     //           }
     //      } else {
     //           message = `The <code>${walletName}</code> wallet has no Escrows, IOU's or MPT's.`;
     //      }

     //      return message;
     // }

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
               this.escrowConditionField = '';
               this.escrowFulfillmentField = '';
               this.escrowCancelTimeField = '';
               this.escrowFinishTimeField = '';
          }

          this.escrowSequenceNumberField = '';
          this.escrowOwnerField = '';
          this.amountField = '';
          this.destinationTagField = '';
          this.isMemoEnabled = false;
          this.memoField = '';
          this.ticketSequence = '';
          this.isTicket = false;
          this.cdr.detectChanges();
     }

     private resetEscrowSelection() {
          this.selectedEscrow = null;
          this.escrowSequenceNumberField = '';
          this.escrowOwnerField = '';
     }

     private updateCurrencies() {
          // Get all currencies except XRP
          const allCurrencies = Object.keys(this.knownTrustLinesIssuers);
          const filtered = allCurrencies.filter(c => c !== 'XRP');
          allCurrencies.push('MPT');

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

     getCondition() {
          const { condition, fulfillment } = this.generateCondition();
          this.escrowConditionField = condition;
          this.escrowFulfillmentField = fulfillment;
     }

     generateCondition(): { condition: string; fulfillment: string } {
          console.log('Generating a cryptographic condition and fulfillment for XRPL escrow');

          // Use Web Crypto API to generate 32 random bytes
          const preimage = new Uint8Array(32);
          globalThis.crypto.getRandomValues(preimage); // Browser-compatible random bytes

          // Create a PREIMAGE-SHA-256 condition
          const fulfillment = new cc.PreimageSha256();
          fulfillment.setPreimage(Buffer.from(preimage)); // Convert Uint8Array to Buffer

          // Get the condition (hash of the preimage) in hexadecimal
          const condition = fulfillment.getConditionBinary().toString('hex').toUpperCase();

          // Get the fulfillment (preimage) in hexadecimal, to be kept secret
          const fulfillment_hex = fulfillment.serializeBinary().toString('hex').toUpperCase();

          console.log('Condition:', condition);
          console.log('Fulfillment (keep secret until ready to finish escrow):', fulfillment_hex);

          return { condition, fulfillment: fulfillment_hex };
     }

     populateDefaultDateTime() {
          if (!this.escrowCancelDateTimeField) {
               const now = new Date();

               const year = now.getFullYear();
               const month = String(now.getMonth() + 1).padStart(2, '0');
               const day = String(now.getDate()).padStart(2, '0');
               const hours = String(now.getHours()).padStart(2, '0');
               const minutes = String(now.getMinutes()).padStart(2, '0');
               const seconds = String(now.getSeconds()).padStart(2, '0');

               this.escrowCancelDateTimeField = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
          }
     }

     displayAmount(amount: any): string {
          let displayAmount;
          if (typeof amount === 'string') {
               // Native XRP escrow
               displayAmount = `${xrpl.dropsToXrp(amount)} XRP`;
          } else if (typeof amount === 'object' && amount.currency) {
               // IOU or MPT
               let currency = amount.currency;

               // Detect hex MPT currency code
               if (/^[0-9A-F]{40}$/i.test(currency)) {
                    try {
                         currency = this.utilsService.normalizeCurrencyCode(currency);
                    } catch (e) {
                         // fallback: leave as hex if decode fails
                    }
               }

               displayAmount = `${amount.value} ${currency} Issuer: <code>${amount.issuer}</code>`;
          } else {
               displayAmount = 'N/A';
          }
          return displayAmount;
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
