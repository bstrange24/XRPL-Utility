import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
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
     accountInfo?: any;
     seed?: string;
     amount?: string;
     issuer?: string;
     currency?: string;
     accountObjects?: any;
     formattedDestination?: any;
     destination?: string;
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

interface RippleState {
     LedgerEntryType: 'RippleState';
     Balance: { currency: string; value: string };
     HighLimit: { issuer: string };
}

interface MPToken {
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
     selector: 'app-trustlines',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './trustlines.component.html',
     styleUrl: './trustlines.component.css',
})
export class TrustlinesComponent implements OnInit, AfterViewInit {
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
     currencyFieldDropDownValue: string = '';
     destinationField: string = '';
     issuerFields: string = '';
     currencyBalanceField: string = '';
     gatewayBalance: string = '';
     amountField: string = '';
     ticketSequence: string = '';
     isTicket: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     outstandingChecks: string = '';
     executionTime: string = '';
     destinationTagField: string = '';
     useMultiSign: boolean = false;
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
     signerQuorum: number = 0;
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     memoField: string = '';
     isMemoEnabled = false;
     isRegularKeyAddress = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     masterKeyDisabled: boolean = false;
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
     showTrustlineOptions: boolean = false; // default off
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
          isIssuer: false,
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
     trustlineFlags: Record<string, boolean> = { ...AppConstants.TRUSTLINE.FLAGS };
     trustlineFlagList = AppConstants.TRUSTLINE.FLAG_LIST;
     flagMap = AppConstants.TRUSTLINE.FLAG_MAP;
     ledgerFlagMap = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;
     showManageTokens = false;
     environment: string = '';
     activeTab: string = 'setTrustline'; // default
     encryptionType: string = '';
     hasWallets: boolean = true;
     accountTrustlines: any = [];
     existingMpts: any = [];
     existingIOUs: any = [];
     existingMptsCollapsed: boolean = true;
     outstandingIOUCollapsed: boolean = true;
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     flags = {
          tfSetfAuth: false,
          tfSetNoRipple: false,
          tfClearNoRipple: false,
          tfSetFreeze: false,
          tfClearFreeze: false,
          tfSetDeepFreeze: false,
          tfClearDeepFreeze: false,
     };
     totalFlagsValue = 0;
     totalFlagsHex = '0x0';
     filterQuery: string = '';
     private accountDataCache = new Map<
          string,
          {
               accountObjects?: xrpl.AccountObjectsResponse;
               tokenBalance?: xrpl.GatewayBalancesResponse;
               timestamp: number;
          }
     >();

     private flagValues = {
          tfSetfAuth: 0x00010000,
          tfSetNoRipple: 0x00020000,
          tfClearNoRipple: 0x00040000,
          tfSetFreeze: 0x00100000,
          tfClearFreeze: 0x00200000,
          tfSetDeepFreeze: 0x00400000,
          tfClearDeepFreeze: 0x00800000,
     };

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
          if (this.activeTab === 'setTrustline') {
               this.setTrustLine();
          } else if (this.activeTab === 'removeTrustline') {
               this.removeTrustline();
          } else if (this.activeTab === 'issueCurrency') {
               this.issueCurrency();
          } else if (this.activeTab === 'clawbackTokens') {
               this.clawbackTokens();
          } else if (this.activeTab === 'addNewIssuers') {
               if (this.newCurrency && this.newIssuer) {
                    this.addToken(this.newCurrency, this.newIssuer, true);
               }
          }
     }

     async setTab(tab: string) {
          console.log('Entering setTab');
          const startTime = Date.now();

          this.activeTab = tab;

          if (Object.keys(this.knownTrustLinesIssuers).length > 0 && this.issuerFields === '') {
               this.currencyFieldDropDownValue = Object.keys(this.knownTrustLinesIssuers)[0];
          }

          // === 1. Handle flag state FIRST ===
          if (this.activeTab === 'removeTrustline') {
               // Smart detection: only enable what's needed
               if (this.currentWallet.address) {
                    try {
                         const client = await this.xrplService.getClient();
                         const accountObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', '');
                         this.setRemoveFlagsBasedOnExistingTrustline(accountObjects);
                    } catch (err) {
                         // Fallback: enable both (safe default)
                         this.flags.tfClearNoRipple = true;
                         this.flags.tfClearFreeze = true;
                         this.flags.tfClearDeepFreeze = false;
                         this.updateFlagTotal();
                    }
               }
          } else {
               // Leaving remove tab → reset remove-specific flags
               this.flags.tfClearNoRipple = false;
               this.flags.tfClearFreeze = false;
               this.flags.tfClearDeepFreeze = false;
               this.updateFlagTotal();
          }

          // === 2. Normal tab logic ===
          if (this.activeTab !== 'addNewIssuers') {
               const client = await this.xrplService.getClient();
               const accountObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', '');

               this.getExistingMpts(accountObjects, this.currentWallet.address);
               this.getExistingIOUs(accountObjects, this.currentWallet.address);
               this.onCurrencyChange();
               // this.toggleIssuerField();

               // Only clear ALL flags when NOT in remove mode
               if (this.activeTab !== 'removeTrustline') {
                    this.clearFlagsValue();
               }

               this.ui.clearMessages();
               this.clearFields(true);
          }

          if (this.activeTab === 'removeTrustline') {
               this.amountField = '0';
          }

          this.executionTime = (Date.now() - startTime).toString();
          console.log(`Leaving setTab in ${this.executionTime}ms`);
     }

     async onIssuerChange(index: number, event: Event) {
          this.ui.warningMessage = '';
          const checked = (event.target as HTMLInputElement).checked;
          if (!this.wallets[index].isIssuer) {
               this.removeToken(this.currencyFieldDropDownValue, this.wallets[index]);
          } else {
               this.wallets[index].isIssuer = checked;
               const updates = {
                    isIssuer: checked,
               };
               this.walletManagerService.updateWalletByAddress(this.wallets[index].address, updates);
               this.addToken(this.currencyFieldDropDownValue, this.wallets[index], false);
          }
          this.onCurrencyChange();
     }

     selectWallet(index: number) {
          if (this.selectedWalletIndex === index) return; // ← Add this guard!
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
               await this.getTrustlinesForAccount();
               await this.onCurrencyChange();
          } else if (this.currentWallet.address) {
               this.ui.setError('Invalid XRP address');
          }
     }

     toggleExistingMpts() {
          this.existingMptsCollapsed = !this.existingMptsCollapsed;
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

     onFlagChange(flag: string) {
          if (this.trustlineFlags[flag]) {
               AppConstants.TRUSTLINE.CONFLICTS[flag]?.forEach((conflict: string | number) => {
                    this.trustlineFlags[conflict] = false;
               });
          }
     }

     async getTrustlinesForAccount() {
          console.log('Entering getTrustlinesForAccount');
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

               this.getExistingMpts(accountObjects, this.currentWallet.address);
               this.getExistingIOUs(accountObjects, this.currentWallet.address);

               const tokenBalance = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');
               const parsedBalances = this.parseAllGatewayBalances(tokenBalance, wallet);
               this.currencyBalanceField = parsedBalances?.[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';
               this.setCachedAccountData(this.currentWallet.address, { accountObjects, tokenBalance });

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.updateTrustLineFlagsInUI(accountObjects, wallet);
               this.updateTickets(accountObjects);
               this.clearFlagsValue();
               this.clearFields(false);
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getTrustlinesForAccount:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getTrustlinesForAccount in ${this.executionTime}ms`);
          }
     }

     async setTrustLine() {
          console.log('Entering setTrustLine');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               issuer: this.issuerFields,
               currency: this.currencyFieldDropDownValue,
               amount: this.amountField,
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

               const [accountInfo, fee, currentLedger, accountLines, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               // this.utilsService.logObjects(`accountLines`, accountLines);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('TrustSet', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               if (this.trustlineFlags['tfSetNoRipple'] && this.trustlineFlags['tfClearNoRipple']) {
                    return this.ui.setError('ERROR: Cannot set both tfSetNoRipple and tfClearNoRipple');
               }
               if (this.trustlineFlags['tfSetFreeze'] && this.trustlineFlags['tfClearFreeze']) {
                    return this.ui.setError('ERROR: Cannot set both tfSetFreeze and tfClearFreeze');
               }

               let currencyFieldTemp = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               if (!/^[A-Z0-9]{3}$|^[0-9A-Fa-f]{40}$/.test(currencyFieldTemp)) {
                    throw new Error('Invalid currency code. Must be a 3-character code (e.g., USDC) or 40-character hex.');
               }

               // Calculate flags
               // let flags = 0;
               // Object.entries(this.trustlineFlags).forEach(([key, value]) => {
               //      if (value) {
               //           flags |= AppConstants.TRUSTLINE.FLAG_MAP[key as keyof typeof AppConstants.TRUSTLINE.FLAG_MAP];
               //      }
               // });

               let trustSetTx: xrpl.TrustSet = {
                    TransactionType: 'TrustSet',
                    Account: wallet.classicAddress,
                    LimitAmount: {
                         currency: currencyFieldTemp,
                         issuer: this.issuerFields,
                         value: this.amountField,
                    },
                    // Flags: flags,
                    Flags: this.totalFlagsValue,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, trustSetTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, trustSetTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Setting Trustline (no changes will be made)...' : 'Submitting Trustset to Ledger...', 200);

               this.ui.paymentTx.push(trustSetTx);
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

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.txResult.push(response.result);
               this.updateTxResult(this.ui.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Trustline set successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    // Add new destination if valid and not already present
                    this.addNewDestinationFromUser();

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Trustline set successfully!';
               }
          } catch (error: any) {
               console.error('Error in setTrustLine:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving setTrustLine in ${this.executionTime}ms`);
          }
     }

     async removeTrustline() {
          console.log('Entering removeTrustline');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               issuer: this.issuerFields,
               currency: this.currencyFieldDropDownValue,
               destination: this.destinationField,
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

               const [accountInfo, serverInfo, fee, currentLedger] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client)]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('RemoveTrustline', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               if (this.trustlineFlags['tfSetNoRipple'] && this.trustlineFlags['tfClearNoRipple']) {
                    return this.ui.setError('ERROR: Cannot set both tfSetNoRipple and tfClearNoRipple');
               }
               if (this.trustlineFlags['tfSetFreeze'] && this.trustlineFlags['tfClearFreeze']) {
                    return this.ui.setError('ERROR: Cannot set both tfSetFreeze and tfClearFreeze');
               }

               const trustLines = await this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', '');
               this.utilsService.logObjects('trustLines', trustLines);

               const trustLine = trustLines.result.lines.find((line: any) => {
                    const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
                    return line.account === this.issuerFields && lineCurrency === this.currencyFieldDropDownValue;
               });

               if (!trustLine) {
                    this.ui.setError(`No trust line found for ${this.currencyFieldDropDownValue} to issuer ${this.issuerFields}`);
                    return;
               }

               const check = this.canRemoveTrustline(trustLine);
               if (!check.canRemove) {
                    return this.ui.setError(`Cannot remove trustline ${trustLine.currency}/${trustLine.account}: ${check.reasons}`);
               }

               let currencyFieldTemp = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);

               const trustSetTx: xrpl.TrustSet = {
                    TransactionType: 'TrustSet',
                    Account: wallet.classicAddress,
                    LimitAmount: {
                         currency: currencyFieldTemp,
                         issuer: this.issuerFields,
                         value: '0',
                    },
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               // trustSetTx.Flags = xrpl.TrustSetFlags.tfClearNoRipple | xrpl.TrustSetFlags.tfClearFreeze;
               trustSetTx.Flags = this.totalFlagsValue;

               await this.setTxOptionalFields(client, trustSetTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, trustSetTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Removing Trustline (no changes will be made)...' : 'Submitting to Ledger...', 200);

               // STORE IT FOR DISPLAY
               this.ui.paymentTx.push(trustSetTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, trustSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, trustSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.txResult.push(response.result);
               this.updateTxResult(this.ui.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Trustline removed successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Trustline removal successfully!';
               }
          } catch (error: any) {
               console.error('Error in removeTrustline:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving removeTrustline in ${this.executionTime}ms`);
          }
     }

     async issueCurrency() {
          console.log('Entering issueCurrency');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               currency: this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue),
               issuer: this.issuerFields,
               destinationTag: this.destinationTagField,
               amount: this.amountField,
               destination: this.destinationField,
               isRegularKeyAddress: this.isRegularKeyAddress,
               useMultiSign: this.useMultiSign,
               regularKeyAddress: this.isRegularKeyAddress ? this.regularKeyAddress : undefined,
               regularKeySeed: this.isRegularKeyAddress ? this.regularKeySeed : undefined,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               let [accountInfo, fee, lastLedgerIndex, trustLines, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, lastLedgerIndex, serverInfo);
               this.utilsService.logObjects('trustLines', trustLines);

               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;
               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('IssueCurrency', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

               const accountFlags = accountInfo.result.account_data.Flags;
               const asfDefaultRipple = 0x00800000;

               if ((accountFlags & asfDefaultRipple) === 0) {
                    // Need to enable DefaultRipple first
                    const accountSetTx: xrpl.AccountSet = {
                         TransactionType: 'AccountSet',
                         Account: wallet.classicAddress,
                         SetFlag: 8, // asfDefaultRipple
                         Fee: fee,
                         LastLedgerSequence: lastLedgerIndex + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
                         return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                    }

                    // this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Set Default Ripple (no changes will be made)...' : 'Submitting Set Default Ripple to Ledger...', 200);

                    // this.ui.paymentTx.push(accountSetTx);
                    // this.updatePaymentTx();

                    let response: any;

                    if (this.ui.isSimulateEnabled) {
                         response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
                    } else {
                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         if (!signedTx) {
                              return this.ui.setError('ERROR: Failed to sign AccountSet transaction.');
                         }

                         const response = await this.xrplTransactions.submitTransaction(client, signedTx);

                         // this.utilsService.logObjects('response', response);
                         // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                         // this.ui.txResult.push(response.result);
                         // this.updateTxResult(this.ui.txResult);

                         const isSuccess = this.utilsService.isTxSuccessful(response);
                         if (!isSuccess) {
                              const resultMsg = this.utilsService.getTransactionResultMessage(response);
                              const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                              console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                              (response.result as any).errorMessage = userMessage;
                              this.ui.setError(userMessage);
                              return;
                         }
                    }
                    // Update lastLedgerIndex for next transaction
                    lastLedgerIndex = await this.xrplService.getLastLedgerIndex(client);
               }

               // PHASE 4: Prepare Payment transaction for currency issuance
               const curr = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               const paymentTx: xrpl.Payment = {
                    TransactionType: 'Payment',
                    Account: wallet.classicAddress,
                    Destination: resolvedDestination,
                    Amount: {
                         currency: curr,
                         value: this.amountField,
                         issuer: this.issuerFields,
                    },
                    Fee: fee,
                    LastLedgerSequence: lastLedgerIndex + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, paymentTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, paymentTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               // if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, paymentTx, resolvedDestination)) {
               //      return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
               // }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Currency Issuance (no changes will be made)...' : 'Submitting Currency Issuance to Ledger...', 200);

               this.ui.paymentTx.push(paymentTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, paymentTx);
               } else {
                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, paymentTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Issued currency successfully!';

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    this.addNewDestinationFromUser();

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    await this.updateCurrencyBalance(gatewayBalances, wallet);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.clearFields(false);
                    this.updateTickets(updatedAccountObjects);
                    this.cdr.detectChanges();
                    // this.updateGatewayBalance(gatewayBalances, wallet);
               } else {
                    this.ui.successMessage = 'Simulated Issued currency successfully!';
               }
          } catch (error: any) {
               console.error('Error in issueCurrency:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving issueCurrency in ${this.executionTime}ms`);
          }
     }

     async clawbackTokens() {
          console.log('Entering clawbackTokens');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               amount: this.amountField,
               destination: this.destinationField,
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
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, accountObjects, trustLines, serverInfo, fee, currentLedger] = await Promise.all([
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getXrplServerInfo(client, 'current', ''),
                    this.xrplService.calculateTransactionFee(client),
                    this.xrplService.getLastLedgerIndex(client),
               ]);

               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               // this.utilsService.logObjects('trustLines', trustLines);

               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;
               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('ClawbackTokens', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const currencyFieldTemp = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               if (!/^[A-Z0-9]{3}$|^[0-9A-Fa-f]{40}$/.test(currencyFieldTemp)) {
                    throw new Error('Invalid currency code. Must be a 3-character code (e.g., USDC) or 40-character hex.');
               }

               let clawbackTx: xrpl.Clawback = {
                    TransactionType: 'Clawback',
                    Account: wallet.classicAddress,
                    Amount: {
                         currency: currencyFieldTemp,
                         issuer: resolvedDestination,
                         value: this.amountField,
                    },
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, clawbackTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, clawbackTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, clawbackTx, resolvedDestination)) {
                    return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Token Clawback (no tokens will be moved)...' : 'Submitting Clawback to Ledger...', 200);

               this.ui.paymentTx.push(clawbackTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, clawbackTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, clawbackTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign transaction.');
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
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Clawback tokens successfully!';

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalancePromise] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);

                    await this.updateCurrencyBalance(gatewayBalancePromise, wallet);
                    // this.updateGatewayBalance(gatewayBalancePromise, wallet);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Escrow cancel successfully!';
               }
          } catch (error: any) {
               console.error('Error in clawbackTokens:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving clawbackTokens in ${this.executionTime}ms`);
          }
     }

     private getExistingMpts(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          this.existingMpts = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => {
                    if (obj.LedgerEntryType !== 'MPToken') return true;
                    const amount = obj.MPTAmount || obj.OutstandingAmount || '0';
                    return parseFloat(amount) > 0;
               })
               .filter((obj: any) => (obj.LedgerEntryType === 'MPTokenIssuance' || obj.LedgerEntryType === 'MPToken') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
               .map((obj: any) => {
                    return {
                         LedgerEntryType: obj.LedgerEntryType,
                         id: obj.index,
                         mpt_issuance_id: obj.mpt_issuance_id,
                         TransferFee: obj.TransferFee,
                         OutstandingAmount: obj.OutstandingAmount,
                         MaximumAmount: obj.MaximumAmount,
                         MPTokenMetadata: obj.MPTokenMetadata,
                         Issuer: obj.Issuer,
                         Flags: obj.Flags,
                         AssetScale: obj.AssetScale,
                    };
               })
               .sort((a, b) => {
                    const seqA = (a as any).Sequence ?? Number.MAX_SAFE_INTEGER;
                    const seqB = (b as any).Sequence ?? Number.MAX_SAFE_INTEGER;
                    return seqA - seqB;
               });
          this.utilsService.logObjects('existingMpts', this.existingMpts);
     }

     private getExistingIOUs(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string): RippleState[] {
          this.existingIOUs = (accountObjects.result.account_objects ?? [])
               .filter((obj: any): obj is xrpl.LedgerEntry.RippleState => {
                    if (obj.LedgerEntryType !== 'RippleState') return false;

                    const balanceValue = obj.Balance?.value ?? '0';
                    const myLimit = obj.LowLimit?.issuer === classicAddress ? obj.LowLimit?.value : obj.HighLimit?.value;

                    const peerLimit = obj.LowLimit?.issuer === classicAddress ? obj.HighLimit?.value : obj.LowLimit?.value;

                    // Hide if:
                    // 1. Balance is exactly zero
                    // 2. AND both sides have zero limit (i.e. user "removed" it)
                    const balanceIsZero = parseFloat(balanceValue) === 0;
                    const myLimitIsZero = myLimit === '0' || myLimit === 0;
                    const peerLimitIsZero = peerLimit === '0' || peerLimit === 0;

                    return !(balanceIsZero && myLimitIsZero && peerLimitIsZero);
               })
               .map((obj: xrpl.LedgerEntry.RippleState): RippleState => {
                    const balance = obj.Balance?.value ?? '0';
                    const currency = this.utilsService.normalizeCurrencyCode(obj.Balance?.currency);

                    const isHighSide = obj.HighLimit.issuer === classicAddress;
                    const issuer = isHighSide ? obj.LowLimit.issuer : obj.HighLimit.issuer;

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
               .sort((a, b) => a.HighLimit.issuer.localeCompare(b.HighLimit.issuer));

          this.utilsService.logObjects('existingIOUs - filtered', this.existingIOUs);
          return this.existingIOUs;
     }

     async toggleIssuerField(): Promise<void> {
          console.log('toggleIssuerField → currency:', this.currencyFieldDropDownValue);
          this.ui.clearMessages();

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
                    if (currency !== 'XRP') {
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

                    // const gatewayBalances = cache?.tokenBalance || (await this.xrplService.getTokenBalance(await this.xrplService.getClient(), wallet.classicAddress, 'validated', ''));
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

     // Only used in Trustlines template
     get availableCurrencies(): string[] {
          const all = Object.keys(this.knownTrustLinesIssuers);
          // Remove XRP only on Trustlines page
          return all.filter(currency => currency !== 'XRP');
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

     private async setTxOptionalFields(client: xrpl.Client, trustSetTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.selectedSingleTicket) {
               const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!ticketExists) {
                    this.ui.setError(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
               }
               this.utilsService.setTicketSequence(trustSetTx, this.selectedSingleTicket, true);
          } else {
               if (this.multiSelectMode && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(trustSetTx, accountInfo.result.account_data.Sequence, false);
               }
          }

          if (this.destinationTagField && parseInt(this.destinationTagField) > 0) {
               this.utilsService.setDestinationTag(trustSetTx, this.destinationTagField);
          }
          if (this.memoField) {
               this.utilsService.setMemoField(trustSetTx, this.memoField);
          }
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);

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

     private updateTrustLineFlagsInUI(accountObjects: xrpl.AccountObjectsResponse, wallet: xrpl.Wallet) {
          // Start clean
          Object.keys(this.flags).forEach(k => (this.flags[k as keyof typeof this.flags] = false));

          const encoded = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
          const walletAddr = wallet.classicAddress || wallet.address;

          const state = accountObjects.result.account_objects.find((obj): obj is xrpl.LedgerEntry.RippleState => {
               return obj.LedgerEntryType === 'RippleState' && obj.Balance?.currency === encoded && (obj.LowLimit?.issuer === walletAddr || obj.HighLimit?.issuer === walletAddr) && (obj.LowLimit?.issuer === this.issuerFields || obj.HighLimit?.issuer === this.issuerFields);
          });

          if (!state) {
               if (this.activeTab !== 'removeTrustline') this.clearFlagsValue();
               return;
          }

          const flags = state.Flags ?? 0;
          const isLowSide = state.LowLimit?.issuer === walletAddr;
          const map = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

          if (this.activeTab === 'removeTrustline') {
               // ONLY enable the flags that are actually blocking removal
               if (flags & map.lsfNoRipple) this.flags.tfClearNoRipple = true;
               if (isLowSide ? flags & map.lsfLowFreeze : flags & map.lsfHighFreeze) this.flags.tfClearFreeze = true;
               // tfSetfAuth is almost never required for removal → keep false
          } else {
               // Normal "Set Trustline" tab → show current state
               this.flags.tfSetfAuth = isLowSide ? !!(flags & map.lsfLowAuth) : !!(flags & map.lsfHighAuth);
               this.flags.tfSetNoRipple = !!(flags & map.lsfNoRipple);
               this.flags.tfSetFreeze = isLowSide ? !!(flags & map.lsfLowFreeze) : !!(flags & map.lsfHighFreeze);
          }

          this.updateFlagTotal();
     }

     private setRemoveFlagsBasedOnExistingTrustline(accountObjects: xrpl.AccountObjectsResponse) {
          // Reset everything that can block removal
          this.flags.tfClearNoRipple = false;
          this.flags.tfClearFreeze = false;
          this.flags.tfClearDeepFreeze = false;
          this.flags.tfSetfAuth = false; // ← This was your bug!

          if (!this.currencyFieldDropDownValue || !this.issuerFields || !this.currentWallet.address) return;

          const encoded = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
          const walletAddr = this.currentWallet.classicAddress || this.currentWallet.address;

          const state = accountObjects.result.account_objects.find((obj): obj is xrpl.LedgerEntry.RippleState => {
               return obj.LedgerEntryType === 'RippleState' && obj.Balance?.currency === encoded && (obj.LowLimit?.issuer === walletAddr || obj.HighLimit?.issuer === walletAddr) && (obj.LowLimit?.issuer === this.issuerFields || obj.HighLimit?.issuer === this.issuerFields);
          });

          if (!state) return;

          const flags = state.Flags ?? 0;
          const isLowSide = state.LowLimit?.issuer === walletAddr;
          const map = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

          // Only turn on the clear flags if they are actually set
          if (flags & map.lsfNoRipple) this.flags.tfClearNoRipple = true;
          if (isLowSide ? flags & map.lsfLowFreeze : flags & map.lsfHighFreeze) this.flags.tfClearFreeze = true;

          // tfSetfAuth is almost never needed for removal — only if the *other* side authorized you
          // In 99.9% of cases (including yours) it should stay OFF
          // → So we deliberately DO NOT touch it here

          this.updateFlagTotal();
     }

     toggleFlag(key: 'tfSetfAuth' | 'tfSetNoRipple' | 'tfClearNoRipple' | 'tfSetFreeze' | 'tfClearFreeze' | 'tfSetDeepFreeze' | 'tfClearDeepFreeze') {
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          if (this.flags.tfSetfAuth) sum |= this.flagValues.tfSetfAuth;
          if (this.flags.tfSetNoRipple) sum |= this.flagValues.tfSetNoRipple;
          if (this.flags.tfClearNoRipple) sum |= this.flagValues.tfClearNoRipple;
          if (this.flags.tfSetFreeze) sum |= this.flagValues.tfSetFreeze;
          if (this.flags.tfClearFreeze) sum |= this.flagValues.tfClearFreeze;
          if (this.flags.tfSetDeepFreeze) sum |= this.flagValues.tfSetDeepFreeze;
          if (this.flags.tfClearDeepFreeze) sum |= this.flagValues.tfClearDeepFreeze;

          this.totalFlagsValue = sum;
          this.totalFlagsHex = '0x' + sum.toString(16).toUpperCase().padStart(8, '0');
     }

     clearFlagsValue() {
          if (this.activeTab !== 'removeTrustline') {
               this.flags = {
                    tfSetfAuth: false,
                    tfSetNoRipple: false,
                    tfClearNoRipple: false,
                    tfSetFreeze: false,
                    tfClearFreeze: false,
                    tfSetDeepFreeze: false,
                    tfClearDeepFreeze: false,
               };
               this.totalFlagsValue = 0;
               this.totalFlagsHex = '0x0';
          }
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.storageService.set('destinations', this.destinations);
     }

     onTokenChange(): void {
          const issuers = this.knownTrustLinesIssuers[this.tokenToRemove] || [];
          this.issuerToRemove = issuers.length > 0 ? issuers[0] : '';
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.amountField = '';
               this.destinationTagField = '';
               this.newCurrency = '';
               this.newIssuer = '';
               this.clearFlagsValue();
          }
          this.isMemoEnabled = false;
          this.memoField = '';
          this.ticketSequence = '';
          this.isTicket = false;
          this.cdr.detectChanges();
     }

     private async updateCurrencyBalance(gatewayBalance: xrpl.GatewayBalancesResponse, wallet: xrpl.Wallet) {
          const parsedBalances = this.parseAllGatewayBalances(gatewayBalance, wallet);
          if (parsedBalances && Object.keys(parsedBalances).length > 0) {
               this.currencyBalanceField = parsedBalances[this.currencyFieldDropDownValue]?.[wallet.classicAddress] ?? parsedBalances[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';
          } else {
               this.currencyBalanceField = '0';
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

     copyMptId(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.ui.showToastMessage('MPT Issuance ID copied!');
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
                    checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: '', // Add dynamic text here
                    showLink: true,
               },
               removeTrustline: {
                    checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: '', // Add dynamic text here
                    showLink: true,
               },
               issueCurrency: {
                    checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: '', // Add dynamic text here
                    showLink: true,
               },
               clawbackTokens: {
                    checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: '', // Add dynamic text here
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
               const link = `${this.url}account/${this.currentWallet.address}/tokens`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View tokens on XRPL Win</a>`;
          }

          return message;
     }

     decodeMptFlagsForUi(flags: number): string {
          const flagDefinitions = [
               { value: 2, name: 'canLock' },
               { value: 4, name: 'isRequireAuth' },
               { value: 8, name: 'canEscrow' },
               { value: 10, name: 'canTrade' },
               { value: 20, name: 'canTransfer' },
               { value: 40, name: 'canClawback' },
          ];

          const activeFlags: string[] = [];

          for (const flag of flagDefinitions) {
               if ((flags & flag.value) === flag.value) {
                    activeFlags.push(flag.name);
               }
          }

          return activeFlags.length > 0 ? activeFlags.join(', ') : 'None';
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

     addToken(newToken: string, newIssuerAddress: any, toggleCurrencyField: boolean) {
          // normalize to always get the address string
          const issuerAddress = typeof newIssuerAddress === 'string' ? newIssuerAddress : newIssuerAddress?.address;
          if (newToken?.trim() && issuerAddress?.trim()) {
               const currency = newToken.trim();
               const issuer = issuerAddress;

               // Validate currency code
               if (!this.utilsService.isValidCurrencyCode(currency)) {
                    this.ui.setError('Invalid currency code: Must be 3-20 characters or valid hex');
                    newIssuerAddress.isIssuer = false;
                    return;
               }

               // Validate XRPL address
               if (!xrpl.isValidAddress(issuer)) {
                    this.ui.setError('Invalid issuer address');
                    newIssuerAddress.isIssuer = false;
                    return;
               }

               // Initialize array if not present
               if (!this.knownTrustLinesIssuers[currency]) {
                    this.knownTrustLinesIssuers[currency] = [];
               }

               // Check for duplicates
               if (this.knownTrustLinesIssuers[currency].includes(issuer)) {
                    this.ui.setError(`Issuer ${issuer} already exists for ${currency}`);
                    newIssuerAddress.isIssuer = false;
                    return;
               }

               // Add new issuer
               this.knownTrustLinesIssuers[currency].push(issuer);

               // Persist and update
               this.storageService.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers);

               this.getKnownIssuersFromLocalStorage();
               this.updateCurrencies();

               if (toggleCurrencyField) {
                    this.onCurrencyChange();
               }

               this.ui.clearWarning();
               this.ui.setSuccess(`Added issuer ${issuer} for ${currency}`);
          } else {
               this.ui.setError('Currency code and issuer address are required');
               newIssuerAddress.isIssuer = false;
          }
     }

     removeToken(tokenToRemove: string, removeIssuerAddress?: any) {
          if (!tokenToRemove) {
               this.ui.setError('Select a token to remove');
               return;
          }

          const currency = tokenToRemove.trim();
          if (!this.knownTrustLinesIssuers[currency]) {
               this.ui.setError(`Currency ${currency} not found`);
               return;
          }

          if (!removeIssuerAddress) {
               // Remove entire currency (and all its issuers)
               delete this.knownTrustLinesIssuers[currency];
               this.ui.setSuccess(`Removed currency ${currency} and all its issuers`);
          } else {
               // Remove only one specific issuer
               let issuer: string;
               if (typeof removeIssuerAddress === 'string') {
                    issuer = removeIssuerAddress.trim();
               } else if (removeIssuerAddress?.address) {
                    issuer = removeIssuerAddress.address.trim();
               } else {
                    this.ui.setError('Invalid issuer');
                    return;
               }

               // Filter out only this issuer
               const beforeCount = this.knownTrustLinesIssuers[currency].length;
               this.knownTrustLinesIssuers[currency] = this.knownTrustLinesIssuers[currency].filter(addr => addr !== issuer);

               if (this.knownTrustLinesIssuers[currency].length === 0) {
                    // Only delete the currency if NO issuers remain
                    delete this.knownTrustLinesIssuers[currency];
                    this.ui.setSuccess(`Removed ${currency} (no issuers left)`);
               } else {
                    this.ui.setSuccess(`Removed issuer ${issuer.slice(0, 8)}... from ${currency}`);
               }
          }

          // === Critical: Save + Refresh UI ===
          this.storageService.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers);
          this.getKnownIssuersFromLocalStorage(); // ← reloads storedIssuers

          // === Force issuer dropdown to refresh ===
          this.currencyFieldDropDownValue = ''; // ← temporary reset
          this.issuerFields = '';
          this.issuers = [];

          // Re-select currency if it still exists
          if (this.knownTrustLinesIssuers[currency]) {
               this.currencyFieldDropDownValue = currency;
          }

          this.updateCurrencies();
          this.onCurrencyChange();

          this.cdr.detectChanges();
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

     private canRemoveTrustline(line: any): { canRemove: boolean; reasons: string[] } {
          const reasons: string[] = [];

          if (parseFloat(line.balance) !== 0) {
               reasons.push(`Balance is ${line.balance} (must be 0)`);
          }

          // if (line.no_ripple && !this.trustlineFlags['tfClearNoRipple']) {
          if (line.no_ripple && !this.flags.tfClearNoRipple) {
               reasons.push(`NoRipple flag is set`);
          }
          if (line.freeze) {
               reasons.push(`Freeze flag is set`);
          }
          if (line.authorized) {
               reasons.push(`Authorized flag is set (issuer must unauthorize before deletion)`);
          }

          if (line.peer_authorized) {
               reasons.push(`Peer authorized is still enabled`);
          }

          return {
               canRemove: reasons.length === 0,
               reasons,
          };
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
