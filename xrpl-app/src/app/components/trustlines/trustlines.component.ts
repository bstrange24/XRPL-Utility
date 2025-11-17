import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef, EventEmitter, Output, ViewChildren, QueryList, NgZone, inject, afterRenderEffect, runInInjectionContext, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
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
import { InfoMessageConstants } from '../../core/info-message.constants';
import { LucideAngularModule } from 'lucide-angular';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { Subject, takeUntil } from 'rxjs';
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
     private readonly injector = inject(Injector);
     result: string = '';
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
     knownTrustLinesIssuers: { [key: string]: string[] } = { XRP: [] };
     issuerToRemove: string = '';
     currencies: string[] = [];
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
     filteredDestinations: { name?: string; address: string }[] = [];
     highlightedIndex = -1;
     private lastCurrency: string = '';
     private lastIssuer: string = '';
     trustlineFlags: Record<string, boolean> = { ...AppConstants.TRUSTLINE.FLAGS };
     trustlineFlagList = AppConstants.TRUSTLINE.FLAG_LIST;
     flagMap = AppConstants.TRUSTLINE.FLAG_MAP;
     ledgerFlagMap = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;
     showManageTokens = false;
     environment: string = '';
     paymentTx: any[] = [];
     txResult: any[] = [];
     txHash: string = '';
     txHashes: string[] = [];
     activeTab: string = 'setTrustline'; // default
     encryptionType: string = '';
     hasWallets: boolean = true;
     showToast: boolean = false;
     toastMessage: string = '';
     accountTrustlines: any = [];
     existingMpts: any = [];
     existingIOUs: any = [];
     existingMptsCollapsed: boolean = true;
     outstandingIOUCollapsed: boolean = true;
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     warningMessage: string | null = null;
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
          private ngZone: NgZone,
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
          const storedIssuers = this.storageService.getKnownIssuers('knownIssuers');
          if (storedIssuers) {
               this.knownTrustLinesIssuers = storedIssuers;
          }
          this.updateCurrencies();
          this.currencyFieldDropDownValue = 'CTZ';
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
                    this.addToken(this.newCurrency, this.newIssuer);
               }
          }
     }

     async setTab(tab: string) {
          this.activeTab = tab;
          if (this.activeTab !== 'addNewIssuers') {
               const client = await this.xrplService.getClient();
               const accountObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', '');
               this.getExistingMpts(accountObjects, this.currentWallet.address);
               this.getExistingIOUs(accountObjects, this.currentWallet.address);
               this.toggleIssuerField();
               this.clearFlagsValue();
               this.ui.clearMessages();
               this.clearFields(true);
          }

          if (this.activeTab !== 'addNewIssuers' && this.activeTab === 'removeTrustline') {
               this.amountField = '0';
          }

          if (this.activeTab === 'addNewIssuers') {
               if (this.newCurrency && this.newIssuer) {
                    this.addToken(this.newCurrency, this.newIssuer);
               }
          }

          // if (this.activeTab === 'issueCurrency') {
          // const client = await this.xrplService.getClient();
          // const checkObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'check');
          // this.getCashableChecks(checkObjects, this.currentWallet.address);
          // }

          // if (this.activeTab === 'clawbackTokens') {
          // }

          // if (this.activeTab === 'addNewIssuers') {
          // }

          // this.toggleIssuerField();
          // this.clearFlagsValue();
          // this.ui.clearMessages();
          // this.clearFields(true);
     }

     async onIssuerChange(index: number, event: Event) {
          const checked = (event.target as HTMLInputElement).checked;
          if (!this.wallets[index].isIssuer) {
               this.removeToken(this.currencyFieldDropDownValue, this.wallets[index]);
          } else {
               this.wallets[index].isIssuer = checked;
               const updates = {
                    isIssuer: checked,
               };
               this.walletManagerService.updateWalletByAddress(this.wallets[index].address, updates);
               this.addToken(this.currencyFieldDropDownValue, this.wallets[index]);
               // this.toggleIssuerField();
               // any extra logic, e.g. save to localStorage, emit event, etc.
          }
     }

     selectWallet(index: number) {
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
               this.refreshBalance(0);
          } else {
               (async () => {
                    const client = await this.xrplService.getClient();
                    await this.refreshWallets(client, [this.wallets[this.selectedWalletIndex].address, this.destinationField ? this.destinationField : '']);
               })();
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
               await this.refreshWallets(client, [walletAddress]);
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
          this.refreshWallets(client, faucetWallet.address);
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
               this.ui.clearWarning();
               this.updateDestinations();
               await this.toggleIssuerField();
          } else if (this.currentWallet.address) {
               this.ui.setError('Failed to refresh balance');
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
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet.seed,
                    accountInfo: accountInfo,
               };

               const errors = await this.validateInputs(inputs, 'getTrustlinesForAccount');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Errors:\n${errors.join('\n')}`);
               }

               this.getExistingMpts(accountObjects, this.currentWallet.address);
               this.getExistingIOUs(accountObjects, this.currentWallet.address);

               // --- Defer: Fetch additional data and enhance UI ---
               setTimeout(async () => {
                    try {
                         const tokenBalance = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');

                         // Update balance field
                         const parsedBalances = this.parseAllGatewayBalances(tokenBalance, wallet);
                         this.currencyBalanceField = parsedBalances?.[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';

                         // Final UI sync
                         this.refreshUIData(wallet, accountInfo, accountObjects);
                         this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                         this.clearFields(false);
                         this.clearFlagsValue();
                         this.updateTrustLineFlagsInUI(accountObjects, wallet);
                         this.updateTickets(accountObjects);
                    } catch (err) {
                         console.error('Error in deferred UI updates:', err);
                    }
               }, 0);
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
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, fee, currentLedger, accountLines, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               this.utilsService.logObjects(`accountLines`, accountLines);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'setTrustLine');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
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
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, trustSetTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, trustSetTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Setting Trustline (no changes will be made)...' : 'Submitting to Ledger...', 200);

               this.paymentTx.push(trustSetTx);
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
                    const mptObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['MPToken']);
                    this.utilsService.logObjects('mptObjects', mptObjects);
                    const trustlineObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['RippleState']);
                    this.utilsService.logObjects('trustlineObjects', trustlineObjects);
                    this.getExistingMpts(mptObjects, wallet.classicAddress);
                    this.getExistingIOUs(trustlineObjects, wallet.classicAddress);
                    await this.refreshWallets(client, [wallet.classicAddress, this.destinationField]);

                    // Add new destination if valid and not already present
                    if (xrpl.isValidAddress(this.destinationField) && !this.destinations.some(d => d.address === this.destinationField)) {
                         this.customDestinations.push({
                              name: `Custom ${this.customDestinations.length + 1}`,
                              address: this.destinationField,
                         });
                         this.storageService.set('customDestinations', JSON.stringify(this.customDestinations));
                         this.updateDestinations();
                    }

                    setTimeout(async () => {
                         try {
                              this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                              this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
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

               const [accountInfo, serverInfo, fee, currentLedger] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client)]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'removeTrustline');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
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
                    // this.resultField.nativeElement.innerHTML = `No trust line found for ${this.currencyFieldDropDownValue} to issuer ${this.destinationField}`;
                    // this.resultField.nativeElement.classList.add('error');
                    this.ui.setError(`No trust line found for ${this.currencyFieldDropDownValue} to issuer ${this.destinationField}`);
                    return;
               }

               // Validate all trustlines are removable
               for (const line of trustLines.result.lines) {
                    const check = this.canRemoveTrustline(line);
                    if (!check.canRemove) {
                         return this.ui.setError(`Cannot remove trustline ${line.currency}/${line.account}: ${check.reasons}`);
                    }
               }

               let currencyFieldTemp = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               // let flags = 0;
               // Object.entries(this.trustlineFlags).forEach(([key, value]) => {
               //      if (value) {
               //           flags |= AppConstants.TRUSTLINE.FLAG_MAP[key as keyof typeof AppConstants.TRUSTLINE.FLAG_MAP];
               //      }
               // });

               const trustSetTx: xrpl.TrustSet = {
                    TransactionType: 'TrustSet',
                    Account: wallet.classicAddress,
                    LimitAmount: {
                         currency: currencyFieldTemp,
                         issuer: this.issuerFields,
                         value: '0',
                    },
                    // Flags: 0,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               // trustSetTx.Flags = xrpl.TrustSetFlags.tfClearNoRipple | xrpl.TrustSetFlags.tfClearFreeze;
               // trustSetTx.Flags = flags;
               // delete trustSetTx.Flags; // Removing trustline — no flags needed

               await this.setTxOptionalFields(client, trustSetTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, trustSetTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Removing Trustline (no changes will be made)...' : 'Submitting to Ledger...', 200);

               // STORE IT FOR DISPLAY
               this.paymentTx.push(trustSetTx);
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

               this.txResult.push(response.result);
               this.updateTxResult(this.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.result);
               }

               this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Trustline removed successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    // Filter specific types using the helper
                    const checkObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['Check']);
                    this.utilsService.logObjects('checkObjects', checkObjects);
                    const mptObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['MPToken']);
                    this.utilsService.logObjects('mptObjects', mptObjects);
                    const trustlineObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['RippleState']);
                    this.utilsService.logObjects('trustlineObjects', trustlineObjects);

                    // this.getCashableChecks(checkObjects, wallet.classicAddress ?? wallet.address);
                    this.getExistingMpts(mptObjects, wallet.classicAddress);
                    this.getExistingIOUs(trustlineObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress, this.destinationField]);

                    setTimeout(async () => {
                         try {
                              this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
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

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'issueCurrency');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

               const accountFlags = accountInfo.result.account_data.Flags;
               const asfDefaultRipple = 0x00800000;
               let data: { sections: any[] } = { sections: [] };

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

                    let response: any;

                    if (this.ui.isSimulateEnabled) {
                         response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
                    } else {
                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         if (!signedTx) {
                              return this.ui.setError('ERROR: Failed to sign AccountSet transaction.');
                         }

                         const response = await this.xrplTransactions.submitTransaction(client, signedTx);

                         const isSuccess = this.utilsService.isTxSuccessful(response);
                         if (!isSuccess) {
                              const resultMsg = this.utilsService.getTransactionResultMessage(response);
                              const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                              console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                              (response.result as any).errorMessage = userMessage;
                         }

                         data.sections.push({
                              title: 'DefaultRipple Enabled',
                              openByDefault: true,
                              content: [{ key: 'Status', value: `Enabled via AccountSet transaction for <code>${wallet.classicAddress}</code>` }],
                         });
                    }
                    // Update lastLedgerIndex for next transaction
                    lastLedgerIndex = await this.xrplService.getLastLedgerIndex(client);
               }

               // PHASE 4: Prepare Payment transaction for currency issuance
               const curr = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               const paymentTx: xrpl.Payment = {
                    TransactionType: 'Payment',
                    Account: wallet.classicAddress,
                    Destination: this.destinationField,
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

               // if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, paymentTx, this.destinationField)) {
               //      return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
               // }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Currency Issuance (no changes will be made)...' : 'Submitting Currency Issuance to Ledger...', 200);

               // STORE IT FOR DISPLAY
               this.paymentTx.push(paymentTx);
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

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txResult.push(response.result);
               this.updateTxResult(this.txResult);
               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.result);
               }

               this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    // // Fetch updated trust lines and gateway balances in parallel
                    // const [updatedTrustLines, gatewayBalances, newBalance] = await Promise.all([this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', ''), client.getXrpBalance(wallet.classicAddress)]);

                    // // Add New Balance section
                    // const decodedCurrency = this.utilsService.decodeIfNeeded(this.currencyFieldDropDownValue);
                    // const newTrustLine = updatedTrustLines.result.lines.find((line: any) => line.currency === decodedCurrency && (line.account === this.destinationField || line.account === this.destinationField));

                    // // Optional: Avoid heavy stringify in logs
                    // console.debug(`updatedTrustLines :`, updatedTrustLines.result);
                    // console.debug(`newTrustLine :`, newTrustLine);
                    // console.debug(`gatewayBalances :`, gatewayBalances.result);

                    // data.sections.push({
                    //      title: 'New Balance',
                    //      openByDefault: true,
                    //      content: [
                    //           { key: 'Destination', value: `<code>${this.destinationField}</code>` },
                    //           { key: 'Currency', value: this.currencyFieldDropDownValue },
                    //           { key: 'Balance', value: newTrustLine ? this.utilsService.formatTokenBalance(newTrustLine.balance.toString(), 2) : 'Unknown' },
                    //      ],
                    // });

                    // Add Issuer Obligations section
                    // if (gatewayBalances.result.obligations && Object.keys(gatewayBalances.result.obligations).length > 0) {
                    //      data.sections.push({
                    //           title: `Issuer Obligations (${Object.keys(gatewayBalances.result.obligations).length})`,
                    //           openByDefault: true,
                    //           subItems: Object.entries(gatewayBalances.result.obligations).map(([oblCurrency, amount], index) => ({
                    //                key: `Obligation ${index + 1} (${oblCurrency})`,
                    //                openByDefault: false,
                    //                content: [
                    //                     { key: 'Currency', value: oblCurrency },
                    //                     { key: 'Amount', value: this.utilsService.formatTokenBalance(amount.toString(), 2) },
                    //                ],
                    //           })),
                    //      });
                    // } else {
                    //      data.sections.push({
                    //           title: 'Issuer Obligations',
                    //           openByDefault: true,
                    //           content: [{ key: 'Status', value: 'No obligations issued' }],
                    //      });
                    // }

                    // Add Account Details section
                    // data.sections.push({
                    //      title: 'Account Details',
                    //      openByDefault: true,
                    //      content: [
                    //           { key: 'Issuer Address', value: `<code>${wallet.classicAddress}</code>` },
                    //           { key: 'Destination Address', value: `<code>${this.destinationField}</code>` },
                    //           { key: 'XRP Balance (Issuer)', value: this.utilsService.formatTokenBalance(newBalance.toString(), 2) },
                    //           { key: 'XRP Balance (Issuer)', value: (await client.getXrpBalance(wallet.classicAddress)).toString() },
                    //      ],
                    // });

                    (response.result as any).clearInnerHtml = false;
                    this.ui.setSuccess(this.result);

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    // Filter specific types using the helper
                    const checkObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['Check']);
                    this.utilsService.logObjects('checkObjects', checkObjects);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    // this.getCancelableChecks(checkObjects, wallet.classicAddress ?? wallet.address);
                    // this.getExistingChecks(checkObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress ?? wallet.address]);

                    setTimeout(async () => {
                         try {
                              await this.updateCurrencyBalance(gatewayBalances, wallet);
                              // this.updateGatewayBalance(gatewayBalances, wallet);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
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
          this.ui.setSuccessProperties();
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

               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               this.utilsService.logObjects('trustLines', trustLines);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'clawbackTokens');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
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
                         issuer: this.destinationField,
                         value: this.amountField,
                    },
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, clawbackTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, clawbackTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, clawbackTx, this.destinationField)) {
                    return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Token Clawback (no tokens will be moved)...' : 'Submitting Clawback to Ledger...', 200);
               // STORE IT FOR DISPLAY
               this.paymentTx.push(clawbackTx);
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

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txResult.push(response.result);
               this.updateTxResult(this.txResult);
               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.result);
               }

               this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Cancelled escrow successfully!';
                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalancePromise] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    const mptObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['MPToken']);
                    this.utilsService.logObjects('mptObjects', mptObjects);
                    const trustlineObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['RippleState']);
                    this.utilsService.logObjects('trustlineObjects', trustlineObjects);
                    this.getExistingMpts(mptObjects, wallet.classicAddress);
                    this.getExistingIOUs(trustlineObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress, this.destinationField]);
                    setTimeout(async () => {
                         try {
                              await this.updateCurrencyBalance(gatewayBalancePromise, wallet);
                              // this.updateGatewayBalance(gatewayBalancePromise, wallet);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
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
               .filter((obj: any) => (obj.LedgerEntryType === 'MPTokenIssuance' || obj.LedgerEntryType === 'MPToken') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
               .map((obj: any) => {
                    // ...(flags !== undefined ? [{ key: 'Flags', value: this.utilsService.getMptFlagsReadable(Number(flags)) }] : []),
                    // ...((mpt as any)['MPTAmount'] ? [{ key: 'MPTAmount', value: String((mpt as any)['MPTAmount']) }] : []),
                    // ...((mpt as any)['MPTokenMetadata'] ? [{ key: 'MPTokenMetadata', value: xrpl.convertHexToString((mpt as any)['MPTokenMetadata']) }] : []),
                    // ...((mpt as any)['MaximumAmount'] ? [{ key: 'MaximumAmount', value: String((mpt as any)['MaximumAmount']) }] : []),
                    // ...((mpt as any)['OutstandingAmount'] ? [{ key: 'OutstandingAmount', value: String((mpt as any)['OutstandingAmount']) }] : []),
                    // ...((mpt as any)['TransferFee'] ? [{ key: 'TransferFee', value: (Number((mpt as any)['TransferFee']) / 1000).toFixed(3) + ' %' }] : []),
                    // ...((mpt as any)['MPTIssuanceID'] ? [{ key: 'MPTIssuanceID', value: String((mpt as any)['MPTIssuanceID']) }] : []),
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
          // .sort((a, b) => a.Issuer.localeCompare(b.Issuer));
          this.utilsService.logObjects('existingMpts', this.existingMpts);
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

     async toggleIssuerField(): Promise<void> {
          console.log('Entering toggleIssuerField');
          const startTime = Date.now();

          try {
               if (Object.keys(this.knownTrustLinesIssuers).length <= 1) {
                    this.ui.setWarning(`No issuers found. Check the issuer checkbox in the wallet section or add an issuer in the Add Issuer tab.`);
                    this.ensureDefaultNotSelected();
                    return;
               }

               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [gatewayBalances] = await Promise.all([this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

               let balanceTotal = 0;
               const currency = this.utilsService.formatCurrencyForDisplay(this.currencyFieldDropDownValue);

               if (gatewayBalances.result.assets) {
                    for (const [issuer, currencies] of Object.entries(gatewayBalances.result.assets)) {
                         for (const { currency: cur, value } of currencies) {
                              if (this.utilsService.formatCurrencyForDisplay(cur) === currency) {
                                   balanceTotal += Number(value);
                              }
                         }
                    }
               }

               this.gatewayBalance = this.utilsService.formatTokenBalance(balanceTotal.toString(), 18);

               const encodedCurr = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               const issuerPromises = this.wallets
                    .filter(w => xrpl.isValidAddress(w.address))
                    .map(async w => {
                         try {
                              const tokenBalance = await this.xrplService.getTokenBalance(client, w.address, 'validated', '');
                              const hasObligation = tokenBalance.result.obligations?.[encodedCurr];

                              if (hasObligation && hasObligation !== '0') {
                                   return { name: w.name, address: w.address };
                              } else if (w.isIssuer === true) {
                                   return { name: w.name, address: w.address };
                              }
                              // else {
                              // return { name: w.name, address: w.address };
                              // }
                         } catch (err) {
                              console.warn(`Issuer check failed for ${w.address}:`, err);
                         }
                         return null;
                    });

               const issuerResults = await Promise.all(issuerPromises);

               // Step 1: filter out nulls
               const nonNullIssuers = issuerResults.filter((i): i is { name: string; address: string } => {
                    const isValid = i !== null;
                    console.debug('Filtering null:', i, '->', isValid);
                    return isValid;
               });

               // Step 2: remove duplicates by address
               const uniqueIssuers = nonNullIssuers.filter((candidate, index, self) => {
                    const firstIndex = self.findIndex(c => c.address === candidate.address);
                    const isUnique = index === firstIndex;
                    console.debug('Checking uniqueness:', candidate, 'Index:', index, 'First index:', firstIndex, 'Unique?', isUnique);
                    return isUnique;
               });

               console.debug('Unique issuers:', uniqueIssuers);

               this.issuers = uniqueIssuers;

               const knownIssuers = this.knownTrustLinesIssuers[this.currencyFieldDropDownValue] || [];

               if (!this.issuerFields || !this.issuers.some(iss => iss.address === this.issuerFields)) {
                    let newIssuer = '';

                    // Find the first matching known issuer that exists in available issuers
                    const matchedKnownIssuer = knownIssuers.find(known => this.issuers.some(iss => iss.address === known));

                    if (matchedKnownIssuer) {
                         newIssuer = matchedKnownIssuer;
                    } else if (this.issuers.length > 0) {
                         newIssuer = this.issuers[0].address;
                    } else {
                         newIssuer = '';
                    }

                    this.issuerFields = newIssuer;
               }

               if (this.issuers.length === 0) {
                    this.ui.setWarning(`No issuers found. Check the issuer checkbox in the wallet section or add an issuer in the Add Issuer tab.`);
               }

               this.ensureDefaultNotSelected();

               await this.updateCurrencyBalance(gatewayBalances, wallet);

               const currencyChanged = this.lastCurrency !== this.currencyFieldDropDownValue;
               const issuerChanged = this.lastIssuer !== this.issuerFields;
               if (currencyChanged || issuerChanged) {
                    this.lastCurrency = this.currencyFieldDropDownValue;
                    this.lastIssuer = this.issuerFields;
               }

               // Only call getTrustlinesForAccount after the first load
               // if (!this.isInitialLoad) {
               await this.getTrustlinesForAccount();
               // } else {
               // this.isInitialLoad = false; // mark that we've completed the first load
               // await this.getTrustlinesForAccount(); // Explicitly call for initial load
               // }
          } catch (error: any) {
               this.currencyBalanceField = '0';
               this.gatewayBalance = '0';
               console.error('Error in toggleIssuerField:', error);
               this.ui.setError(`ERROR: Failed to fetch balance - ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               console.log(`Leaving toggleIssuerField in ${(Date.now() - startTime).toString()}ms`);
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
                    this.cdr.markForCheck();
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
          const currency = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue ? this.currencyFieldDropDownValue : '');

          const rippleState = accountObjects.result.account_objects.find(obj => obj.LedgerEntryType === 'RippleState' && obj.Balance && obj.Balance.currency === currency) as xrpl.LedgerEntry.RippleState | undefined;

          if (rippleState) {
               this.debugTrustlineFlags(rippleState, wallet);
               const flagsNumber: number = rippleState.Flags ?? 0;

               // Correct way: check if your wallet is the low side
               const isLowAddress = wallet.classicAddress === rippleState.LowLimit.issuer;

               // tfSetfAuth: false,
               // tfSetNoRipple: false,
               // tfClearNoRipple: false,
               // tfSetFreeze: false,
               // tfClearFreeze: false,
               // tfSetDeepFreeze: false,
               // tfClearDeepFreeze: false,
               if (isLowAddress) {
                    this.flags.tfSetfAuth = true;
                    this.flags.tfSetNoRipple = true;
                    this.flags.tfSetFreeze = true;
                    // this.flags.tfClearNoRipple = false;
                    // this.flags.tfClearFreeze = false;
                    // this.flags.tfSetDeepFreeze = false;
                    // this.flags.tfClearDeepFreeze = false;
                    // this.trustlineFlags['tfSetfAuth'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfLowAuth);
                    // this.trustlineFlags['tfSetNoRipple'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfNoRipple); // Adjusted key
                    // this.trustlineFlags['tfSetFreeze'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfLowFreeze);
               } else {
                    this.flags.tfSetfAuth = false;
                    this.flags.tfSetNoRipple = false;
                    this.flags.tfSetFreeze = false;
                    // this.trustlineFlags['tfSetfAuth'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfHighAuth);
                    // this.trustlineFlags['tfSetNoRipple'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfNoRipple); // Adjusted for high (note: constants may need lsfHighNoRipple: 0x00200000)
                    // this.trustlineFlags['tfSetFreeze'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfHighFreeze);
               }

               // Clear flags are just inverses
               // this.trustlineFlags['tfClearNoRipple'] = !this.trustlineFlags['tfSetNoRipple'];
               // this.trustlineFlags['tfClearFreeze'] = !this.trustlineFlags['tfSetFreeze'];

               // Not applicable for trustlines
               // this.trustlineFlags['tfPartialPayment'] = false;
               // this.trustlineFlags['tfNoDirectRipple'] = false;
               // this.trustlineFlags['tfLimitQuality'] = false;

               // this.showTrustlineOptions = true;
          } else {
               // No trustline → reset UI
               this.trustlineFlags = { ...AppConstants.TRUSTLINE.FLAGS };
               this.showTrustlineOptions = false;
          }
     }

     private debugTrustlineFlags(rippleState: xrpl.LedgerEntry.RippleState, wallet: xrpl.Wallet) {
          const flagsNumber: number = rippleState.Flags ?? 0;
          const isLowAddress = wallet.classicAddress === rippleState.LowLimit.issuer;
          const ledgerMap = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

          console.debug('Trustline Debug\n -----------------------------------------');
          console.debug('Currency:', rippleState.Balance.currency);
          console.debug('You are the', isLowAddress ? 'LOW side' : 'HIGH side');
          console.debug('Flags (decimal):', flagsNumber, ' hex:', '0x' + flagsNumber.toString(16));

          if (isLowAddress) {
               console.debug('LowAuth:', !!(flagsNumber & ledgerMap.lsfLowAuth));
               console.debug('LowNoRipple:', !!(flagsNumber & ledgerMap.lsfNoRipple)); // Adjusted
               console.debug('LowFreeze:', !!(flagsNumber & ledgerMap.lsfLowFreeze));
          } else {
               console.debug('HighAuth:', !!(flagsNumber & ledgerMap.lsfHighAuth));
               console.debug('HighNoRipple:', !!(flagsNumber & ledgerMap.lsfNoRipple)); // Adjusted
               console.debug('HighFreeze:', !!(flagsNumber & ledgerMap.lsfHighFreeze));
          }
          console.debug('-----------------------------------------');
     }

     private decodeRippleStateFlags(flags: number): string[] {
          return Object.entries(AppConstants.TRUSTLINE.LEDGER_FLAG_MAP)
               .filter(([_, bit]) => (flags & bit) !== 0)
               .map(([name]) => name);
     }

     toggleFlag(key: 'tfSetfAuth' | 'tfSetNoRipple' | 'tfClearNoRipple' | 'tfSetFreeze' | 'tfClearFreeze' | 'tfSetDeepFreeze' | 'tfClearDeepFreeze') {
          // if (key === 'close') {
          // Do nothing – tfClose is locked
          // return;
          // }
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

     private async validateInputs(inputs: ValidationInputs, action: string): Promise<string[]> {
          const errors: string[] = [];

          // Early return for empty inputs
          if (!inputs || Object.keys(inputs).length === 0) {
               return ['No inputs provided.'];
          }

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

          const isValidSeed = (value: string | undefined): string | null => {
               if (value) {
                    const { type } = this.utilsService.detectXrpInputType(value);
                    if (type === 'unknown') {
                         return 'Account seed or mnemonic is invalid.';
                    }
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

          // Action-specific config: required fields and custom rules
          const checkDestinationTagRequirement = async (): Promise<string | null> => {
               if (!inputs.destination) return null; // Skip if no destination provided
               try {
                    const client = await this.xrplService.getClient();
                    const accountInfo = await this.xrplService.getAccountInfo(client, inputs.destination, 'validated', '');
                    if (accountInfo.result.account_flags.requireDestinationTag && (!inputs.destinationTag || inputs.destinationTag.trim() === '')) {
                         return `Receiver requires a Destination Tag for payment.`;
                    }
               } catch (err) {
                    console.error('Failed to check destination tag requirement:', err);
                    return `Could not validate destination account`;
               }
               return null;
          };

          // --- Action-specific config ---
          const actionConfig: Record<
               string,
               {
                    required: (keyof ValidationInputs)[];
                    customValidators?: (() => string | null)[];
                    asyncValidators?: (() => Promise<string | null>)[];
               }
          > = {
               getTrustlinesForAccount: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null)],
                    asyncValidators: [],
               },
               setTrustLine: {
                    required: ['seed', 'amount'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
                    asyncValidators: [],
               },
               removeTrustline: {
                    required: ['seed', 'destination'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => isValidNumber(inputs.destinationTag, 'Destination Tag', 0),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
                    asyncValidators: [],
               },
               issueCurrency: {
                    required: ['seed', 'amount', 'destination'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => isValidNumber(inputs.destinationTag, 'Destination Tag', 0, true), // Allow empty
                         () => isNotSelfPayment(this.currentWallet.address, inputs.destination),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
                    asyncValidators: [checkDestinationTagRequirement],
               },
               toggleIssuerField: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null)],
                    asyncValidators: [],
               },
               clawbackTokens: {
                    required: ['seed', 'amount', 'destination'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => isValidNumber(inputs.destinationTag, 'Destination Tag', 0, true), // Allow empty
                         () => isNotSelfPayment(this.currentWallet.address, inputs.destination),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
                    asyncValidators: [checkDestinationTagRequirement],
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

          // --- Run async validators ---
          if (config.asyncValidators) {
               for (const validator of config.asyncValidators) {
                    const err = await validator();
                    if (err) errors.push(err);
               }
          }

          // --- Always validate optional fields ---
          const multiErr = validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds);
          if (multiErr) errors.push(multiErr);

          if (errors.length === 0 && inputs.useMultiSign && (inputs.multiSignAddresses === 'No Multi-Sign address configured for account' || inputs.multiSignSeeds === '')) {
               errors.push('At least one signer address is required for multi-signing');
          }

          const regAddrErr = isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address');
          if (regAddrErr && inputs.regularKeyAddress !== 'No RegularKey configured for account') errors.push(regAddrErr);

          const regSeedErr = isValidSecret(inputs.regularKeySeed, 'Regular Key Seed');
          if (regSeedErr) errors.push(regSeedErr);

          return errors;
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          // this.issuers = this.wallets.map(w => ({ name: w.name, address: w.address }));
          if (this.destinations.length > 0 && !this.destinationField) {
               // this.destinationField = this.destinations[0].address;
          }
          this.storageService.set('destinations', this.destinations);
          this.ensureDefaultNotSelected();
     }

     ensureDefaultNotSelected() {
          const currentAddress = this.currentWallet.address;
          if (currentAddress && this.destinations.length > 0) {
               if (!this.destinationField || this.destinationField === currentAddress) {
                    const nonSelectedDest = this.destinations.find(d => d.address !== currentAddress);
                    // this.destinationField = nonSelectedDest ? nonSelectedDest.address : this.destinations[0].address;
               }
          }
          if (currentAddress && this.issuers.length > 0) {
               if (!this.issuerFields) {
                    const nonSelectedIss = this.issuers.find(i => i.address !== currentAddress);
                    this.issuerFields = nonSelectedIss ? nonSelectedIss.address : this.issuers[0].address;
               }
          }
          this.cdr.detectChanges();
     }

     onTokenChange(): void {
          const issuers = this.knownTrustLinesIssuers[this.tokenToRemove] || [];

          if (issuers.length > 0) {
               // Auto-select the first issuer
               this.issuerToRemove = issuers[0];
          } else {
               // No issuers found
               this.issuerToRemove = '';
          }
     }

     get currencyOptions(): string[] {
          return Object.values(this.currencies).filter(key => key !== 'XRP');
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

     private updateGatewayBalance(gatewayBalances: xrpl.GatewayBalancesResponse, wallet: xrpl.Wallet, issuer?: string) {
          const result = gatewayBalances.result;
          const displayCurrency = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
          let balance = '0';

          // --- Case 1: This account is the gateway (it issues IOUs)
          if (result.obligations && Object.keys(result.obligations).length > 0) {
               if (result.obligations[displayCurrency]) {
                    // Obligations do NOT have an issuer field (they’re from this gateway)
                    balance = this.utilsService.formatTokenBalance(result.obligations[displayCurrency], 18);
               }
          }

          // --- Case 2: This account holds assets issued BY someone else
          else if (result.assets && Object.keys(result.assets).length > 0) {
               let foundBalance: string | null = null;

               // result.assets looks like: { [issuer]: [{ currency, value }, ...] }
               for (const [issuerAddress, assetArray] of Object.entries(result.assets)) {
                    assetArray.forEach(asset => {
                         if (asset.currency === displayCurrency) {
                              // If an issuer filter is provided, match it
                              if (!issuer || issuerAddress === issuer) {
                                   foundBalance = asset.value;
                              }
                         }
                    });
               }

               if (foundBalance !== null) {
                    balance = this.utilsService.formatTokenBalance(foundBalance, 18);
               }
          }

          this.gatewayBalance = balance;
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
          if (this.activeTab === 'setTrustline') {
          } else if (this.activeTab === 'removeTrustline') {
          } else if (this.activeTab === 'issueCurrency') {
          } else if (this.activeTab === 'clawbackTokens') {
          }

          const tabConfig = {
               setTrustline: {
                    checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
               removeTrustline: {
                    checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
               issueCurrency: {
                    checks: this.existingIOUs,
                    getDescription: (count: number) => (count === 1 ? 'trustline' : 'trustlines'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
               clawbackTokens: {
                    checks: this.existingIOUs,
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
               const link = `${this.url}account/${this.currentWallet.address}/checks`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View checks on XRPL Win</a>`;
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

     addToken(newToken: string, newIssuerAddress: any) {
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
               this.updateCurrencies();

               this.ui.setSuccess(`Added issuer ${issuer} for ${currency}`);
          } else {
               this.ui.setError('Currency code and issuer address are required');
               newIssuerAddress.isIssuer = false;
          }
     }

     removeToken(tokenToRemove: string, removeIssuerAddress: any) {
          if (tokenToRemove && removeIssuerAddress.address.trim()) {
               const currency = tokenToRemove;
               const issuer = removeIssuerAddress.address.trim();

               if (this.knownTrustLinesIssuers[currency]) {
                    this.knownTrustLinesIssuers[currency] = this.knownTrustLinesIssuers[currency].filter(addr => addr !== issuer);

                    // Remove the currency entirely if no issuers remain
                    if (this.knownTrustLinesIssuers[currency].length === 0) {
                         delete this.knownTrustLinesIssuers[currency];
                    }

                    this.storageService.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers);
                    this.updateCurrencies();
                    this.ui.setSuccess(`Removed issuer ${issuer} from ${currency}`);
               } else {
                    this.ui.setError(`Currency ${currency} not found`);
               }
          } else if (tokenToRemove) {
               // Remove entire token and all issuers
               delete this.knownTrustLinesIssuers[tokenToRemove];
               this.storageService.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers);
               this.updateCurrencies();
               this.ui.setSuccess(`Removed all issuers for ${tokenToRemove}`);
          } else {
               this.ui.setError('Select a token to remove');
          }
     }

     private updateCurrencies() {
          this.currencies = [...Object.keys(this.knownTrustLinesIssuers)];
          this.currencies.sort((a, b) => a.localeCompare(b));
          this.currencyFieldDropDownValue = 'CTZ';
     }

     private canRemoveTrustline(line: any): { canRemove: boolean; reasons: string[] } {
          const reasons: string[] = [];

          if (parseFloat(line.balance) !== 0) {
               reasons.push(`Balance is ${line.balance} (must be 0)`);
          }

          if (line.no_ripple && !this.trustlineFlags['tfClearNoRipple']) {
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
