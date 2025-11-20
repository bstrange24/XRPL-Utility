import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
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
     selector: 'app-time-escrow',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './time-escrow.component.html',
     styleUrl: './time-escrow.component.css',
})
export class CreateTimeEscrowComponent implements OnInit, AfterViewInit {
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
     currencyFieldDropDownValue: string = 'XRP';
     ticketSequence: string = '';
     isTicket: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     executionTime: string = '';
     amountField: string = '';
     destinationField: string = '';
     destinationTagField: string = '';
     escrowFinishTimeField: string = '';
     escrowFinishTimeUnit: string = 'seconds';
     escrowCancelTimeUnit: string = 'seconds';
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
     issuers: { name?: string; address: string }[] = [];
     masterKeyDisabled: boolean = false;
     tokenBalance: string = '0';
     gatewayBalance: string = '0';
     knownTrustLinesIssuers: { [key: string]: string[] } = { XRP: [] };
     issuerToRemove: string = '';
     currencies: string[] = [];
     newCurrency: string = '';
     newIssuer: string = '';
     tokenToRemove: string = '';
     selectedIssuer: string = '';
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
     currencyIssuers: { name?: string; address: string }[] = [];
     private lastCurrency: string = '';
     private lastIssuer: string = '';
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
     customDestinations: { name?: string; address: string }[] = [];
     showDropdown: boolean = false;
     dropdownOpen: boolean = false;
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;

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
          const storedIssuers = this.storageService.getKnownIssuers('knownIssuers');
          if (storedIssuers) {
               this.knownTrustLinesIssuers = storedIssuers;
          }
          this.updateCurrencies();
          this.currencyFieldDropDownValue = 'XRP'; // Set default to XRP
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
          if (this.activeTab === 'create') {
               this.createTimeBasedEscrow();
          } else if (this.activeTab === 'finish') {
               this.finishTimeBasedEscrow();
          } else if (this.activeTab === 'cancel') {
               this.cancelEscrow();
          }
     }

     async setTab(tab: string) {
          this.activeTab = tab;
          if (this.activeTab === 'cancel' || this.activeTab === 'finish') {
               const client = await this.xrplService.getClient();
               const escrowObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'escrow');
               this.getExpiredOrFulfilledEscrows(client, escrowObjects, this.currentWallet.address);
          }

          if (this.activeTab === 'create') {
               const client = await this.xrplService.getClient();
               const accountObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', '');
               const escrowObjects = this.xrplService.filterAccountObjectsByTypes(accountObjects, ['Escrow']);
               this.getExistingEscrows(escrowObjects, this.currentWallet.address);
               const mptObjects = this.xrplService.filterAccountObjectsByTypes(accountObjects, ['MPToken']);
               this.utilsService.logObjects('mptObjects', mptObjects);
               this.getExistingMpts(mptObjects, this.currentWallet.address);
               const trustlineObjects = this.xrplService.filterAccountObjectsByTypes(accountObjects, ['RippleState']);
               this.utilsService.logObjects('trustlineObjects', trustlineObjects);
               this.getExistingIOUs(trustlineObjects, this.currentWallet.address);
          }

          if (this.currencyFieldDropDownValue !== 'XRP') {
               this.toggleIssuerField();
          }

          this.clearFields(true);
          this.resetEscrowSelection();
          this.ui.clearMessages();
          this.ui.clearWarning();
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
          this.walletManagerService.saveEdit(this.tempName); // ← PASS IT!
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

     // copyAddress(address: string) {
     //      navigator.clipboard.writeText(address).then(() => {
     //           this.ui.showToastMessage('Address copied to clipboard!');
     //      });
     // }

     // private showToastMessage(message: string, duration: number = 2000) {
     //      this.toastMessage = message;
     //      this.showToast = true;
     //      setTimeout(() => {
     //           this.showToast = false;
     //      }, duration);
     // }

     // copySeed(seed: string) {
     //      navigator.clipboard
     //           .writeText(seed)
     //           .then(() => {
     //                this.ui.showToastMessage('Seed copied to clipboard!');
     //           })
     //           .catch(err => {
     //                console.error('Failed to copy seed:', err);
     //                this.ui.showToastMessage('Failed to copy. Please select and copy manually.');
     //           });
     // }

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
               this.ensureDefaultNotSelected();
               await this.getEscrows();
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
               console.log(`ERROR getting wallet in toggleMultiSign' ${error.message}`);
               this.ui.setError('ERROR getting wallet in toggleMultiSign');
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

               // Get account info and account objects
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

               if (this.currencyFieldDropDownValue !== 'XRP' && this.selectedIssuer !== '') {
                    const tokenBalance = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');
                    console.debug('Token Balance:', tokenBalance.result);

                    console.debug(`parseAllGatewayBalances:`, this.parseAllGatewayBalances(tokenBalance, wallet));
                    const parsedBalances = this.parseAllGatewayBalances(tokenBalance, wallet);
                    if (parsedBalances && Object.keys(parsedBalances).length > 0) {
                         this.tokenBalance = parsedBalances?.[this.currencyFieldDropDownValue]?.[this.selectedIssuer] ?? '0';
                    } else {
                         this.tokenBalance = '0';
                    }
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

     async createTimeBasedEscrow() {
          console.log('Entering createTimeBasedEscrow');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               senderAddress: this.currentWallet.address,
               amount: this.amountField,
               destination: this.destinationField,
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

               const errors = await this.validateInputs(inputs, 'create');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const finishAfterTime = this.utilsService.addTime(this.escrowFinishTimeField, this.escrowFinishTimeUnit as 'seconds' | 'minutes' | 'hours' | 'days');
               const cancelAfterTime = this.utilsService.addTime(this.escrowCancelTimeField, this.escrowCancelTimeUnit as 'seconds' | 'minutes' | 'hours' | 'days');
               console.log(`finishUnit: ${this.escrowFinishTimeUnit} cancelUnit: ${this.escrowCancelTimeUnit}`);
               console.log(`finishTime: ${this.utilsService.convertXRPLTime(finishAfterTime)} cancelTime: ${this.utilsService.convertXRPLTime(cancelAfterTime)}`);

               let escrowCreateTx: xrpl.EscrowCreate = {
                    TransactionType: 'EscrowCreate',
                    Account: wallet.address,
                    Amount: xrpl.xrpToDrops(this.amountField),
                    Destination: resolvedDestination,
                    FinishAfter: finishAfterTime,
                    CancelAfter: cancelAfterTime,
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
                    if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, escrowCreateTx, this.destinationField)) {
                         return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
                    }
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Create Time Based Escrow (no changes will be made)...' : 'Submitting Create Time Based Escrow to Ledger...', 200);

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
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Created escrow successfully!';
                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    // Filter specific types using the helper
                    // const escrowObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['Escrow']);
                    // this.utilsService.logObjects('escrowObjects', escrowObjects);
                    // const mptObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['MPToken']);
                    // this.utilsService.logObjects('mptObjects', mptObjects);
                    // const trustlineObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['RippleState']);
                    // this.utilsService.logObjects('trustlineObjects', trustlineObjects);

                    this.getExistingEscrows(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);

                    this.addNewDestinationFromUser();

                    if (this.currencyFieldDropDownValue !== 'XRP') {
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
               console.error('Error in createTimeBasedEscrow:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving createTimeBasedEscrow in ${this.executionTime}ms`);
          }
     }

     async finishTimeBasedEscrow() {
          console.log('Entering finishTimeBasedEscrow');
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

               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;
               inputs.accountInfo = accountInfo;
               inputs.escrow_objects = escrowObjects;

               const errors = await this.validateInputs(inputs, 'finish');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               // Check if the escrow can be canceled based on the CancelAfter time
               const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
               const escrowStatus = this.utilsService.checkTimeBasedEscrowStatus({ FinishAfter: escrow.FinishAfter, CancelAfter: escrow.CancelAfter, owner: escrow.Account }, currentRippleTime, wallet.classicAddress, 'finishEscrow');

               if (!escrowStatus.canFinish && !escrowStatus.canCancel) {
                    return this.ui.setError(`ERROR:\n${escrowStatus.reasonCancel}\n${escrowStatus.reasonFinish}`);
               }

               if (!escrowStatus.canFinish) {
                    return this.ui.setError(`ERROR: ${escrowStatus.reasonFinish}`);
               }

               let escrowFinishTx: xrpl.EscrowFinish = {
                    TransactionType: 'EscrowFinish',
                    Account: wallet.classicAddress,
                    Owner: this.escrowOwnerField,
                    OfferSequence: parseInt(this.escrowSequenceNumberField),
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
                    if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, escrowFinishTx, this.destinationField)) {
                         return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
                    }
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Finishing Time Based Escrow (no changes will be made)...' : 'Submitting Finish Time Based Escrow to Ledger...', 200);

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
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Finished escrow successfully!';

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    // Filter specific types using the helper
                    // const escrowObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['Escrow']);
                    // this.utilsService.logObjects('escrowObjects', escrowObjects);
                    // const mptObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['MPToken']);
                    // this.utilsService.logObjects('mptObjects', mptObjects);
                    // const trustlineObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['RippleState']);
                    // this.utilsService.logObjects('trustlineObjects', trustlineObjects);

                    this.getExistingEscrows(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    this.addNewDestinationFromUser();

                    if (this.currencyFieldDropDownValue !== 'XRP') {
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
               console.error('Error in finishTimeBasedEscrow:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving finishTimeBasedEscrow in ${this.executionTime}ms`);
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

               const errors = await this.validateInputs(inputs, 'cancel');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
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
                    return this.ui.setError(`ERROR: ${escrowStatus.reasonCancel}`);
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

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Cancelling Time Based Escrow (no changes will be made)...' : 'Submitting Cancel Time Based Escrow to Ledger...', 200);

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
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Cancelled escrow successfully!';

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    // Filter specific types using the helper
                    // const escrowObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['Escrow']);
                    // this.utilsService.logObjects('escrowObjects', escrowObjects);
                    // const mptObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['MPToken']);
                    // this.utilsService.logObjects('mptObjects', mptObjects);
                    // const trustlineObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['RippleState']);
                    // this.utilsService.logObjects('trustlineObjects', trustlineObjects);

                    this.getExistingEscrows(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination, escrowOwner]).catch(console.error);

                    this.addNewDestinationFromUser();

                    if (this.currencyFieldDropDownValue !== 'XRP') {
                         await this.updateCurrencyBalance(gatewayBalances, wallet);
                         await this.toggleIssuerField();
                    }

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
                         // Only time-based escrows:
                         (obj.FinishAfter || obj.CancelAfter) &&
                         !obj.Condition
               )
               // .filter((obj: any) => obj.LedgerEntryType === 'Escrow' && obj.Account === classicAddress)
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
               .filter((obj: any) => obj.LedgerEntryType === 'MPToken' && obj.Account === classicAddress)
               .map((obj: any): MPToken => {
                    return {
                         MPTAmount: obj.MPTAmount,
                         mpt_issuance_id: obj.MPTokenIssuanceID,
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

     async toggleIssuerField() {
          console.log('Entering onCurrencyChange');
          const startTime = Date.now();

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [gatewayBalances] = await Promise.all([this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

               // Calculate total balance for selected currency
               let balanceTotal: number = 0;

               if (gatewayBalances.result.assets && Object.keys(gatewayBalances.result.assets).length > 0) {
                    for (const [issuer, currencies] of Object.entries(gatewayBalances.result.assets)) {
                         for (const { currency, value } of currencies) {
                              if (this.utilsService.formatCurrencyForDisplay(currency) === this.currencyFieldDropDownValue) {
                                   balanceTotal += Number(value);
                              }
                         }
                    }
                    this.gatewayBalance = this.utilsService.formatTokenBalance(balanceTotal.toString(), 18);
               } else {
                    this.gatewayBalance = '0';
               }

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

               if (!this.selectedIssuer || !this.issuers.some(iss => iss.address === this.selectedIssuer)) {
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

                    this.selectedIssuer = newIssuer;
               }

               if (this.issuers.length === 0) {
                    console.warn(`No issuers found among wallets for currency: ${this.currencyFieldDropDownValue}`);
               }

               if (this.currencyFieldDropDownValue === 'XRP') {
                    this.destinationField = this.wallets[1]?.address || ''; // Default to first wallet address for XRP
               } else {
                    const currencyChanged = this.lastCurrency !== this.currencyFieldDropDownValue;
                    const issuerChanged = this.lastIssuer !== this.selectedIssuer;
                    if (currencyChanged || issuerChanged) {
                         this.lastCurrency = this.currencyFieldDropDownValue;
                         this.lastIssuer = this.selectedIssuer;
                    }
                    await this.updateCurrencyBalance(gatewayBalances, wallet);
               }
               this.ensureDefaultNotSelected();
          } catch (error: any) {
               this.tokenBalance = '0';
               this.gatewayBalance = '0';
               console.error('Error in onCurrencyChange:', error);
               this.ui.setError(`ERROR: Failed to fetch balance - ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving onCurrencyChange in ${this.executionTime}ms`);
          }
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

     private async setTxOptionalFields(client: xrpl.Client, escrowTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          try {
               if (this.selectedSingleTicket) {
                    const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
                    if (!ticketExists) {
                         return this.ui.setError(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
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
                         const accountObjects = await this.xrplService.getAccountObjects(client, this.destinationField, 'validated', '');
                         const mptTokens = accountObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'MPToken');
                         console.debug(`Destination MPT Tokens:`, mptTokens);
                         console.debug('MPT Issuance ID:', this.mptIssuanceIdField);
                         const authorized = mptTokens.some((obj: any) => obj.MPTokenIssuanceID === this.mptIssuanceIdField);

                         if (!authorized) {
                              throw new Error(`Destination ${this.destinationField} is not authorized to receive this MPT (issuance ID ${this.mptIssuanceIdField}). Please ensure authorization has been completed.`);
                         }

                         const curr: xrpl.MPTAmount = {
                              mpt_issuance_id: this.mptIssuanceIdField,
                              value: this.amountField,
                         };
                         escrowTx.Amount = curr;
                    } else if (this.currencyFieldDropDownValue !== 'XRP') {
                         const curr: xrpl.IssuedCurrencyAmount = {
                              currency: this.currencyFieldDropDownValue.length > 3 ? this.utilsService.encodeCurrencyCode(this.currencyFieldDropDownValue) : this.currencyFieldDropDownValue,
                              issuer: this.selectedIssuer,
                              value: this.amountField,
                         };
                         escrowTx.Amount = curr;
                    } else {
                         escrowTx.Amount = xrpl.xrpToDrops(this.amountField);
                    }
               }
          } catch (error: any) {
               throw new Error(error.message);
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

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          if (this.destinations.length > 0 && !this.destinationField) {
               // this.destinationField = this.destinations[0].address;
          }
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
          if (currentAddress && this.currencyIssuers.length > 0) {
               if (!this.selectedIssuer || this.selectedIssuer === currentAddress) {
                    const nonSelectedIss = this.currencyIssuers.find(i => i.address !== currentAddress);
                    // this.selectedIssuer = nonSelectedIss ? nonSelectedIss.address : this.currencyIssuers[0].address;
               }
          }
          this.cdr.detectChanges();
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
                    return `${fieldName} must be a valid number.`;
               }
               if (minValue !== undefined && num <= minValue) {
                    return `${fieldName} must be greater than ${minValue}.`;
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
                    return 'At least one signer address is required for multi-signing.';
               }
               if (addresses.length !== seeds.length) {
                    return 'Number of signer addresses must match number of signer seeds.';
               }
               const invalidAddr = addresses.find((addr: string) => !xrpl.isValidAddress(addr));
               if (invalidAddr) {
                    return `Invalid signer address: ${invalidAddr}.`;
               }
               const invalidSeed = seeds.find((seed: string) => !xrpl.isValidSecret(seed));
               if (invalidSeed) {
                    return 'One or more signer seeds are invalid.';
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
                    return `Could not validate destination account.`;
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
               getEscrowOwnerAddress: {
                    required: ['senderAddress'],
                    customValidators: [() => isValidXrpAddress(inputs.senderAddress, 'Account not found'), () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null)],
                    asyncValidators: [],
               },
               toggleIssuerField: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null)],
                    asyncValidators: [],
               },
               get: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null)],
                    asyncValidators: [],
               },
               create: {
                    required: ['seed', 'amount', 'destination', 'finishTime', 'cancelTime'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'XRP Amount', 0),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => isValidNumber(inputs.finishTime, 'Escrow finish time', 0),
                         () => isValidNumber(inputs.cancelTime, 'Escrow cancel time', 0),
                         () => isValidNumber(inputs.destinationTag, 'Destination Tag', 0, true),
                         () => isNotSelfPayment(inputs.senderAddress, inputs.destination),
                         () => (inputs.currency !== 'XRP' && inputs.currency !== 'MPT' && !inputs.selectedIssuer ? 'Issuer is required for non-XRP currencies' : null),
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
               finish: {
                    required: ['seed', 'escrowSequence'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(String(inputs.escrowSequence), 'Escrow sequence number', 0),
                         () => (inputs.escrow_objects === undefined || inputs.escrow_objects === null ? `No escrows found for account` : null),
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
               cancel: {
                    required: ['seed', 'escrowSequence'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(String(inputs.escrowSequence), 'Escrow sequence number', 0),
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
               default: { required: [], customValidators: [], asyncValidators: [] },
          };

          const config = actionConfig[action] || actionConfig['default'];

          // --- Run required checks ---
          config.required.forEach((field: keyof ValidationInputs) => {
               const err = isRequired(inputs[field], field.charAt(0).toUpperCase() + field.slice(1));
               if (err) errors.push(err);
          });

          // --- Run sync custom validators ---
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

     onEscrowSelect(selected: any) {
          if (selected) {
               this.escrowSequenceNumberField = selected.EscrowSequence;
               this.escrowOwnerField = selected.Sender; // or selected.Account depending on your data
          }
     }

     async getEscrowOwnerAddress() {
          const inputs: ValidationInputs = {
               senderAddress: this.currentWallet.address,
          };

          const senderAddress = inputs.senderAddress || '';
          if (!senderAddress) {
               this.escrowOwnerField = '';
               return;
          }

          try {
               const client = await this.xrplService.getClient();
               const escrowsTx = await this.xrplService.getAccountObjects(client, senderAddress, 'validated', 'escrow');

               // Optional: Simplify debug log — avoid expensive stringify
               this.utilsService.logObjects('escrowsTx', escrowsTx);

               inputs.accountInfo = escrowsTx;

               const errors = await this.validateInputs(inputs, 'getEscrowOwnerAddress');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const escrowObjects = escrowsTx.result.account_objects;
               if (escrowObjects.length === 0) {
                    this.escrowOwnerField = senderAddress;
                    return;
               }

               const targetSequence = Number(this.escrowSequenceNumberField);
               if (isNaN(targetSequence)) {
                    this.escrowOwnerField = senderAddress;
                    return;
               }

               const txPromises = escrowObjects.map(escrow => {
                    const previousTxnID = escrow.PreviousTxnID;
                    if (typeof previousTxnID !== 'string') {
                         return Promise.resolve({ escrow, sequence: null });
                    }
                    return this.xrplService
                         .getTxData(client, previousTxnID)
                         .then(sequenceTx => {
                              const offerSequence = sequenceTx.result.tx_json.Sequence;
                              return { escrow, sequence: offerSequence ?? null };
                         })
                         .catch(err => {
                              console.error(`Failed to fetch tx ${previousTxnID}:`, err.message || err);
                              return { escrow, sequence: null };
                         });
               });

               const results = await Promise.all(txPromises);

               const match = results.find(r => r.sequence === targetSequence);
               if (match && 'Account' in match.escrow) {
                    this.escrowOwnerField = match.escrow.Account;
               } else {
                    this.escrowOwnerField = senderAddress; // safe fallback
               }
          } catch (error: any) {
               console.error('Error in getEscrowOwnerAddress:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
               this.escrowOwnerField = senderAddress; // safe fallback
          }
     }

     private async updateCurrencyBalance(gatewayBalance: xrpl.GatewayBalancesResponse, wallet: xrpl.Wallet) {
          const parsedBalances = this.parseAllGatewayBalances(gatewayBalance, wallet);
          if (parsedBalances && Object.keys(parsedBalances).length > 0) {
               this.tokenBalance = parsedBalances[this.currencyFieldDropDownValue]?.[wallet.classicAddress] ?? parsedBalances[this.currencyFieldDropDownValue]?.[this.selectedIssuer] ?? '0';
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
          // Use the captured injector to run afterRenderEffect  safely
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

     public get infoMessage(): string | null {
          const tabConfig = {
               create: {
                    escrows: this.existingEscrow,
                    mpts: this.exsitingMpt,
                    ious: this.existingIOUs,
                    description: 'on the ledger',
                    dynamicText: '', // Empty for no additional text
                    showLink: false,
               },
               finish: {
                    escrows: this.expiredOrFulfilledEscrows,
                    mpts: [], // Add appropriate MPT array if needed
                    ious: [], // Add appropriate IOU array if needed
                    description: 'that can be finished',
                    dynamicText: '', // Empty for no additional text
                    showLink: false,
               },
               cancel: {
                    escrows: this.expiredOrFulfilledEscrows,
                    mpts: [], // Add appropriate MPT array if needed
                    ious: [], // Add appropriate IOU array if needed
                    description: 'that can be cancelled',
                    dynamicText: '', // Empty for no additional text
                    showLink: false,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';
          const escrowCount = config.escrows.length;
          const mptCount = config.mpts.length;
          const iouCount = config.ious.length;
          const totalCount = escrowCount + mptCount + iouCount;

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          // Build the item list
          const itemParts = [];
          if (escrowCount > 0) {
               const escrowText = escrowCount === 1 ? 'escrow' : 'escrows';
               itemParts.push(`${escrowCount} ${escrowText}`);
          }
          if (mptCount > 0) {
               const mptText = mptCount === 1 ? 'MPT' : 'MPTs';
               itemParts.push(`${mptCount} ${mptText}`);
          }
          if (iouCount > 0) {
               const iouText = iouCount === 1 ? 'IOU' : 'IOUs';
               itemParts.push(`${iouCount} ${iouText}`);
          }

          // Format the item list
          let itemList = '';
          if (itemParts.length === 1) {
               itemList = itemParts[0];
          } else if (itemParts.length === 2) {
               itemList = itemParts.join(' and ');
          } else if (itemParts.length === 3) {
               itemList = `${itemParts[0]}, ${itemParts[1]}, and ${itemParts[2]}`;
          }

          let message = `The <code>${walletName}</code> wallet has ${dynamicText}${itemList} ${config.description}.`;

          if (totalCount > 0) {
               const links = [];
               if (escrowCount > 0) {
                    links.push(`<a href="${this.url}account/${this.currentWallet.address}/escrows" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View Escrows</a>`);
               }
               if (mptCount > 0) {
                    links.push(`<a href="${this.url}account/${this.currentWallet.address}/mpts/owned" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View MPTs</a>`);
               }
               if (iouCount > 0) {
                    links.push(`<a href="${this.url}account/${this.currentWallet.address}/tokens" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View IOUs</a>`);
               }

               if (links.length === 1) {
                    message += `<br>${links[0]} on XRPL Win`;
               } else {
                    message += `<br>${links.join(' | ')} on XRPL Win`;
               }
          }

          return message;
     }

     // public get infoMessage(): string | null {
     //      const tabConfig = {
     //           create: {
     //                escrows: this.existingEscrow,
     //                description: 'on the ledger',
     //                dynamicText: '', // Empty for no additional text
     //                showLink: false,
     //           },
     //           finish: {
     //                escrows: this.expiredOrFulfilledEscrows,
     //                description: 'that can be finished',
     //                dynamicText: '', // Empty for no additional text
     //                showLink: false,
     //           },
     //           cancel: {
     //                escrows: this.expiredOrFulfilledEscrows,
     //                description: 'that can be cancelled',
     //                dynamicText: '', // Empty for no additional text
     //                showLink: false,
     //           },
     //      };

     //      const config = tabConfig[this.activeTab as keyof typeof tabConfig];
     //      if (!config) return null;

     //      const walletName = this.currentWallet.name || 'selected';
     //      const count = config.escrows.length;

     //      // Build the dynamic text part (with space if text exists)
     //      const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

     //      const escrowText = count === 1 ? 'escrow' : 'escrows';

     //      let message = `The <code>${walletName}</code> wallet has ${dynamicText}${count} ${escrowText} ${config.description}.`;

     //      if (count > 0) {
     //           const link = `${this.url}account/${this.currentWallet.address}/escrows`;
     //           message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View escrows on XRPL Win</a>`;
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

     // private setWarning(msg: string | null) {
     //      this.warningMessage = msg;
     //      this.cdr.detectChanges();
     // }

     // clearWarning() {
     //      this.setWarning(null);
     // }

     autoResize(textarea: HTMLTextAreaElement) {
          if (!textarea) return;
          textarea.style.height = 'auto'; // reset
          textarea.style.height = textarea.scrollHeight + 'px'; // expand
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.escrowFinishTimeField = '';
               this.escrowCancelTimeField = '';
               this.escrowOwnerField = '';
          }

          this.amountField = '';
          this.destinationTagField = '';
          this.escrowSequenceNumberField = '';
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
          this.currencies = [...Object.keys(this.knownTrustLinesIssuers)];
          this.currencies.push('MPT');
          this.currencies.sort((a, b) => a.localeCompare(b));
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

     addToken() {
          if (this.newCurrency && this.newCurrency.trim() && this.newIssuer && this.newIssuer.trim()) {
               const currency = this.newCurrency.trim();
               const issuer = this.newIssuer.trim();

               // Validate currency code
               if (!this.utilsService.isValidCurrencyCode(currency)) {
                    this.ui.setError('Invalid currency code: Must be 3-20 characters or valid hex');
                    return;
               }

               // Validate XRPL address
               if (!xrpl.isValidAddress(issuer)) {
                    this.ui.setError('Invalid issuer address');
                    return;
               }

               // Initialize array if not present
               if (!this.knownTrustLinesIssuers[currency]) {
                    this.knownTrustLinesIssuers[currency] = [];
               }

               // Check for duplicates
               if (this.knownTrustLinesIssuers[currency].includes(issuer)) {
                    this.ui.setError(`Issuer ${issuer} already exists for ${currency}`);
                    return;
               }

               // Add new issuer
               this.knownTrustLinesIssuers[currency].push(issuer);

               // Persist and update
               this.storageService.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers);
               this.updateCurrencies();

               this.newCurrency = '';
               this.newIssuer = '';
               this.ui.setSuccess(`Added issuer ${issuer} for ${currency}`);
               this.cdr.detectChanges();
          } else {
               this.ui.setError('Currency code and issuer address are required');
          }

          this.ui.spinner = false;
     }

     removeToken() {
          if (this.tokenToRemove && this.issuerToRemove) {
               const currency = this.tokenToRemove;
               const issuer = this.issuerToRemove;

               if (this.knownTrustLinesIssuers[currency]) {
                    this.knownTrustLinesIssuers[currency] = this.knownTrustLinesIssuers[currency].filter(addr => addr !== issuer);

                    // Remove the currency entirely if no issuers remain
                    if (this.knownTrustLinesIssuers[currency].length === 0) {
                         delete this.knownTrustLinesIssuers[currency];
                    }

                    this.storageService.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers);
                    this.updateCurrencies();
                    this.ui.setSuccess(`Removed issuer ${issuer} from ${currency}`);
                    this.cdr.detectChanges();
               } else {
                    this.ui.setError(`Currency ${currency} not found`);
               }
          } else if (this.tokenToRemove) {
               // Remove entire token and all issuers
               delete this.knownTrustLinesIssuers[this.tokenToRemove];
               this.storageService.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers);
               this.updateCurrencies();
               this.ui.setSuccess(`Removed all issuers for ${this.tokenToRemove}`);
               this.tokenToRemove = '';
               this.cdr.detectChanges();
          } else {
               this.ui.setError('Select a token to remove');
          }

          this.ui.spinner = false;
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
