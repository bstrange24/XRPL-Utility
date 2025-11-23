import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, NgZone, inject, afterRenderEffect, Injector, ViewContainerRef } from '@angular/core';
import { trigger, state, style, transition, animate, group, query } from '@angular/animations';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { NavbarComponent } from '../navbar/navbar.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { AppWalletDynamicInputComponent } from '../app-wallet-dynamic-input/app-wallet-dynamic-input.component';
import { SignTransactionUtilService } from '../../services/sign-transactions-util/sign-transaction-util.service';
import { AppConstants } from '../../core/app.constants';
import SignerList from 'xrpl/dist/npm/models/ledger/SignerList';
import { InfoMessageConstants } from '../../core/info-message.constants';
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
     account_info?: any;
     seed?: string;
}

@Component({
     selector: 'app-sign-transactions',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule, MatAutocompleteModule, MatTableModule, MatSortModule, MatPaginatorModule, MatInputModule, MatFormFieldModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './sign-transactions.component.html',
     styleUrl: './sign-transactions.component.css',
})
export class SignTransactionsComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     @ViewChild('resultFieldError') resultFieldError!: ElementRef<HTMLDivElement>;
     @ViewChild('accountForm') accountForm!: NgForm;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('signers') signersRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChild('seeds') seedsRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChildren('signers, seeds') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;
     @ViewChild('txJsonPre') txJsonPre!: ElementRef<HTMLPreElement>;
     @ViewChild('txJsonCode') txJsonCode!: ElementRef<HTMLElement>;
     @ViewChild('signedPre') signedPre!: ElementRef<HTMLPreElement>;
     @ViewChild('signedCode') signedCode!: ElementRef<HTMLElement>;
     private readonly injector = inject(Injector);
     txJson: string = ''; // Dedicated for transaction JSON (untouched on error)
     outputField: string = ''; // Dedicated for hash/blob in "Signed" field (empty on error)
     isError: boolean = false;
     isSuccess: boolean = false;
     isEditable: boolean = false;
     ticketSequence: string = '';
     isTicket: boolean = false;
     isTicketEnabled: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     defaultTicketSequence: string | null = null; // store defaulted ticket
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     ownerCount: string = '';
     totalXrpReserves: string = '';
     executionTime: string = '';
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
     signerQuorum: number = 0;
     spinner: boolean = false;
     useMultiSign: boolean = false;
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     isRegularKeyAddress: boolean = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     spinnerMessage: string = '';
     masterKeyDisabled: boolean = false;
     memoField: string = '';
     isMemoEnabled: boolean = false;
     isSimulateEnabled: boolean = false;
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     errorMessage: string | null = null;
     selectedTransaction: string | null = null;
     editedTxJson: any = {};
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
     multiSignedTxBlob: string = ''; // Final combined tx blob
     availableSigners: any[] = [];
     requiredQuorum: number = 0;
     selectedQuorum: number = 0;

     environment: string = '';
     paymentTx: any[] = [];
     txResult: any[] = [];
     txHash: string = '';
     txHashes: string[] = [];
     txErrorHashes: string[] = [];
     activeTab = 'getAccountDetails'; // default
     private cachedReserves: any = null;
     successMessage: string = '';
     encryptionType: string = '';
     hasWallets: boolean = true;
     showToast: boolean = false;
     toastMessage: string = '';
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     warningMessage: string | null = null;
     userEmail: string = '';
     flagResults: any;
     result: string = '';
     private highlightTimeout: any;
     destinations: { name?: string; address: string }[] = [];
     issuers: { name?: string; address: string }[] = [];
     customDestinations: { name?: string; address: string }[] = [];

     constructor(
          private readonly xrplService: XrplService,
          private readonly utilsService: UtilsService,
          private readonly cdr: ChangeDetectorRef,
          private readonly storageService: StorageService,
          private readonly xrplTransactions: XrplTransactionService,
          private ngZone: NgZone,
          private walletGenerator: WalletGeneratorService,
          private walletManagerService: WalletManagerService,
          private signTransactionUtilService: SignTransactionUtilService,
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

          if (this.ticketArray && this.ticketArray.length > 0) {
               this.defaultTicketSequence = this.ticketArray[0];
               this.selectedSingleTicket = this.defaultTicketSequence;
          }

          this.selectedTransaction = 'sendXrp';
          this.clearMessages();
          this.enableTransaction();
          this.cdr.detectChanges();
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

     onSubmit() {
          if (this.activeTab === 'getAccountDetails') {
               this.getAccountDetails();
          }
     }

     async setTab(tab: string) {
          this.activeTab = tab;
          this.clearMessages();
          this.clearFields(true);
          this.getAccountDetails();
     }

     async onIssuerChange(index: number, event: Event) {
          const checked = (event.target as HTMLInputElement).checked;
          if (!this.wallets[index].isIssuer) {
          } else {
               this.wallets[index].isIssuer = checked;
               const updates = {
                    isIssuer: checked,
               };
               this.walletManagerService.updateWalletByAddress(this.wallets[index].address, updates);
          }
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

     handleTransactionResult(event: { result: string; isError: boolean; isSuccess: boolean }) {
          this.result = event.result;
          this.isError = event.isError;
          this.isSuccess = event.isSuccess;
          this.isEditable = !this.isSuccess;
          this.cdr.detectChanges();
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

     copyAddress(address: string) {
          navigator.clipboard.writeText(address).then(() => {
               this.showToastMessage('Address copied to clipboard!');
          });
     }

     private showToastMessage(message: string, duration: number = 2000) {
          this.toastMessage = message;
          this.showToast = true;
          setTimeout(() => {
               this.showToast = false;
          }, duration);
     }

     copySeed(seed: string) {
          navigator.clipboard
               .writeText(seed)
               .then(() => {
                    this.showToastMessage('Seed copied to clipboard!');
               })
               .catch(err => {
                    console.error('Failed to copy seed:', err);
                    this.showToastMessage('Failed to copy. Please select and copy manually.');
               });
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
               this.clearWarning();
               await this.getAccountDetails();
               this.resetSigners();
          } else if (this.currentWallet.address) {
               this.setError('Invalid XRP address');
          }
     }

     onTransactionChange(): void {
          this.txJson = '';
          this.outputField = '';
          this.isError = false;
          this.errorMessage = null;
          this.clearMessages();
          // Enable the newly selected transaction (fills the JSON pane)
          this.enableTransaction();
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
               this.setError('ERROR getting wallet in toggleMultiSign');
          }
     }

     async toggleUseMultiSign() {
          if (this.multiSignAddress === 'No Multi-Sign address configured for account') {
               this.multiSignSeeds = '';
          }
     }

     onTicketChange(newValue: any) {
          // Check if user changed from default
          if (Array.isArray(newValue)) {
               // multi-select mode
               if (!newValue.includes(this.defaultTicketSequence)) {
                    this.toggleTicketSequence();
               }
          } else if (newValue !== this.defaultTicketSequence) {
               // single-select mode
               this.toggleTicketSequence();
          }
     }

     toggleTicketSequence() {
          this.clearMessages();
          this.enableTransaction();
          this.cdr.markForCheck();
     }

     onTicketToggle(event: any, ticket: string) {
          if (event.target.checked) {
               this.selectedTickets = [...this.selectedTickets, ticket];
          } else {
               this.selectedTickets = this.selectedTickets.filter(t => t !== ticket);
          }
     }

     setMemoField() {
          this.enableTransaction();
     }

     setTicketField() {
          this.enableTransaction();
     }

     getTransactionJSON() {
          this.onTransactionChange();
     }

     get currentQuorumSelected(): number {
          return this.availableSigners.filter(w => w.isSelectedSigner).reduce((sum, w) => sum + (w.quorum || 0), 0);
     }

     updateSelectedQuorum() {
          // Sum the weights (SignerWeight) of all checked signers
          this.selectedQuorum = this.availableSigners.filter(w => w.isSelectedSigner).reduce((sum, w) => sum + (w.quorum || 0), 0);
     }

     async getAccountDetails() {
          console.log('Entering getAccountDetails');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet.seed,
                    account_info: accountInfo,
               };

               const errors = await this.validateInputs(inputs, 'getAccountDetails');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               this.getSignerAccountsList(accountObjects);

               await this.refreshWallets(client, [wallet.classicAddress]);

               setTimeout(async () => {
                    try {
                         this.refreshUIData(wallet, accountInfo, accountObjects);
                         this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                         this.updateTickets(accountObjects);
                         this.clearFields(false);
                         this.getTransactionJSON();
                    } catch (err) {
                         console.error('Error in deferred UI updates:', err);
                    }
               }, 0);

               this.clearMessages();
               this.enableTransaction();
          } catch (error: any) {
               console.error('Error in getAccountDetails:', error);
               this.setError(error.message || 'Unknown error');
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getAccountDetails in ${this.executionTime}ms`);
          }
     }

     async enableTransaction() {
          const client = await this.xrplService.getClient();
          const wallet = await this.getWallet();

          switch (this.selectedTransaction) {
               case 'batch':
                    this.txJson = await this.signTransactionUtilService.createBatchpRequestText({ client, wallet });
                    this.setTxJson(this.txJson);
                    break;
               case 'sendXrp':
                    this.txJson = await this.signTransactionUtilService.createSendXrpRequestText({ client, wallet, isTicketEnabled: this.isTicket, isMemoEnable: this.isMemoEnabled, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'setTrustline':
                    this.txJson = await this.signTransactionUtilService.modifyTrustlineRequestText({ client, wallet, selectedTransaction: 'setTrustline', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'removeTrustline':
                    this.txJson = await this.signTransactionUtilService.modifyTrustlineRequestText({ client, wallet, selectedTransaction: 'removeTrustline', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'issueCurrency':
                    this.txJson = await this.signTransactionUtilService.issueCurrencyRequestText({ client, wallet, selectedTransaction: 'issueCurrency', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'accountFlagSet':
                    this.txJson = await this.signTransactionUtilService.modifyAccountFlagsRequestText({ client, wallet, selectedTransaction: 'accountFlagSet', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'accountFlagClear':
                    this.txJson = await this.signTransactionUtilService.modifyAccountFlagsRequestText({ client, wallet, selectedTransaction: 'accountFlagSet', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'createTimeEscrow':
                    this.txJson = await this.signTransactionUtilService.createTimeEscrowRequestText({ client, wallet, selectedTransaction: 'createTimeEscrow', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'finishTimeEscrow':
                    this.txJson = await this.signTransactionUtilService.finshTimeEscrowRequestText({ client, wallet, selectedTransaction: 'finishTimeEscrow', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'createTimeEscrowToken':
                    this.txJson = await this.signTransactionUtilService.createTimeEscrowRequestText({ client, wallet, selectedTransaction: 'createTimeEscrowToken', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'finishTimeEscrowToken':
                    this.txJson = await this.signTransactionUtilService.finshTimeEscrowRequestText({ client, wallet, selectedTransaction: 'finishTimeEscrowToken', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'createConditionEscrow':
                    this.txJson = await this.signTransactionUtilService.createConditionalEscrowRequestText({ client, wallet, selectedTransaction: 'createConditionEscrow', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'finishConditionEscrow':
                    this.txJson = await this.signTransactionUtilService.finsishConditionalEscrowRequestText({ client, wallet, selectedTransaction: 'finishConditionEscrow', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'createConditionEscrowToken':
                    this.txJson = await this.signTransactionUtilService.createConditionalEscrowRequestText({ client, wallet, selectedTransaction: 'createConditionEscrowToken', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'finishConditionEscrowToken':
                    this.txJson = await this.signTransactionUtilService.finsishConditionalEscrowRequestText({ client, wallet, selectedTransaction: 'finishConditionEscrowToken', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'cancelEscrow':
                    this.txJson = await this.signTransactionUtilService.cancelEscrowRequestText({ client, wallet, selectedTransaction: 'cancelEscrow', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'createCheck':
                    this.txJson = await this.signTransactionUtilService.createCheckRequestText({ client, wallet, selectedTransaction: 'createCheck', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'createCheckToken':
                    this.txJson = await this.signTransactionUtilService.createCheckRequestText({ client, wallet, selectedTransaction: 'createCheckToken', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'cashCheck':
                    this.txJson = await this.signTransactionUtilService.cashCheckRequestText({ client, wallet, selectedTransaction: 'cashCheck', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'cashCheckToken':
                    this.txJson = await this.signTransactionUtilService.cashCheckRequestText({ client, wallet, selectedTransaction: 'cashCheckToken', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'cancelCheck':
                    this.txJson = await this.signTransactionUtilService.cancelCheckRequestText({ client, wallet, selectedTransaction: 'cancelCheck', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'createMPT':
                    this.txJson = await this.signTransactionUtilService.createMPTRequestText({ client, wallet, selectedTransaction: 'createMPT', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'authorizeMPT':
                    this.txJson = await this.signTransactionUtilService.authorizeMPTRequestText({ client, wallet, selectedTransaction: 'authorizeMPT', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'unauthorizeMPT':
                    this.txJson = await this.signTransactionUtilService.unauthorizeMPTRequestText({ client, wallet, selectedTransaction: 'unauthorizeMPT', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'sendMPT':
                    this.txJson = await this.signTransactionUtilService.sendMPTRequestText({ client, wallet, selectedTransaction: 'sendMPT', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'lockMPT':
                    this.txJson = await this.signTransactionUtilService.lockMPTRequestText({ client, wallet, selectedTransaction: 'lockMPT', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'unlockMPT':
                    this.txJson = await this.signTransactionUtilService.unlockMPTRequestText({ client, wallet, selectedTransaction: 'unlockMPT', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               case 'destroyMPT':
                    this.txJson = await this.signTransactionUtilService.destroyMPTRequestText({ client, wallet, selectedTransaction: 'destroyMPT', isMemoEnable: this.isMemoEnabled, isTicketEnabled: this.isTicket, ticketSequence: this.selectedSingleTicket });
                    this.setTxJson(this.txJson);
                    break;
               // add others as needed
               default:
                    console.warn(`Unknown transaction type: ${this.selectedTransaction}`);
          }

          this.cdr.markForCheck();
     }

     async unsignedTransaction() {
          console.log('Entering unsignedTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          try {
               this.errorMessage = ''; // Clear any prior error

               if (!this.txJson.trim()) return this.setError('Transaction cannot be empty');

               const editedString = this.txJson.trim();
               let editedJson = JSON.parse(editedString);
               let cleanedJson = this.cleanTx(editedJson);
               console.log('Edited JSON:', editedJson);
               console.log('Cleaned JSON:', cleanedJson);

               const serialized = xrpl.encode(cleanedJson);
               const unsignedHash = xrpl.hashes.hashTx(serialized);
               console.log('Unsigned Transaction hash (hex):', unsignedHash);

               this.outputField = unsignedHash; // Set property
               this.isError = false;
          } catch (error: any) {
               console.error('Error in unsignedTransaction:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving unsignedTransaction in ${this.executionTime}ms`);
          }
     }

     async signedTransaction() {
          console.log('Entering signedTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          let txToSign: any;

          try {
               const wallet = await this.getWallet();

               if (!this.txJson.trim()) {
                    return this.setError('Transaction cannot be empty');
               }

               const editedString = this.txJson.trim();
               let editedJson = JSON.parse(editedString);
               txToSign = this.cleanTx(editedJson);
               console.log('Pre txToSign', txToSign);

               const client = await this.xrplService.getClient();
               const currentLedger = await client.getLedgerIndex();
               console.log('currentLedger: ', currentLedger);
               txToSign.LastLedgerSequence = currentLedger + 1000; // adjust to new ledger

               console.log('Post txToSign', txToSign);

               const signed = wallet.sign(txToSign);
               // Use tx_blob instead of signedTransaction
               this.outputField = signed.tx_blob; // Set property
               this.setSigned(this.outputField);

               console.log('Signed TX blob:', signed.tx_blob);
               console.log('Transaction ID (hash):', signed.hash);

               // decode blob to JSON
               const decodedTx = xrpl.decode(signed.tx_blob);
               console.log(decodedTx);
          } catch (error: any) {
               console.error('Error in signedTransaction:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving signedTransaction in ${this.executionTime}ms`);
          }
     }

     async submitTransaction() {
          console.log('Entering submitTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               if (!this.outputField.trim()) {
                    return this.setError('Signed tx blob can not be empty');
               }

               const signedTxBlob = this.outputField.trim();

               const txType = this.getTransactionLabel(this.selectedTransaction ?? '');
               this.showSpinnerWithDelay(this.isSimulateEnabled ? `Simulating ${txType} (no funds will be moved)...` : `Submitting ${txType} to Ledger...`, 200);

               let response: any;

               if (this.isSimulateEnabled) {
                    const txToSign = this.cleanTx(JSON.parse(this.txJson.trim()));
                    console.log('Pre txToSign', txToSign);
                    const currentLedger = await client.getLedgerIndex();
                    console.log('currentLedger: ', currentLedger);
                    txToSign.LastLedgerSequence = currentLedger + 5;
                    response = await this.xrplTransactions.simulateTransaction(client, txToSign);
               } else {
                    response = await client.submitAndWait(signedTxBlob);
               }

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txResult.push(response.result);
               this.updateTxResult(this.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.setError(userMessage);
               } else {
                    this.setSuccess(this.result);
               }

               this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.isSimulateEnabled) {
                    this.successMessage = 'Transaction completed successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]);

                    setTimeout(async () => {
                         try {
                              this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                              // Reset selected checkboxes
                              this.resetSigners();
                              this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.successMessage = 'Simulated transaction successfully!';
               }
          } catch (error: any) {
               console.error('Error in submitTransaction:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving submitTransaction in ${this.executionTime}ms`);
          }
     }

     async submitMultiSignedTransaction() {
          console.log('Entering submitMultiSignedTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          try {
               if (!this.outputField.trim()) {
                    return this.setError('Signed tx blob can not be empty');
               }

               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const multiSignedTxBlob = this.outputField.trim();
               console.log('multiSignedTxBlob', multiSignedTxBlob);

               const txType = this.getTransactionLabel(this.selectedTransaction ?? '');
               this.showSpinnerWithDelay(this.isSimulateEnabled ? `Simulating ${txType} (no funds will be moved)...` : `Submitting ${txType} to Ledger...`, 200);

               let response: any;

               if (this.isSimulateEnabled) {
                    const txToSign = this.cleanTx(JSON.parse(this.txJson.trim()));
                    console.log('Pre txToSign', txToSign);
                    const currentLedger = await client.getLedgerIndex();
                    console.log('currentLedger: ', currentLedger);
                    txToSign.LastLedgerSequence = currentLedger + 5;
                    response = await this.xrplTransactions.simulateTransaction(client, txToSign);
               } else {
                    response = await client.submitAndWait(multiSignedTxBlob);
               }

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txResult.push(response.result);
               this.updateTxResult(this.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.setError(userMessage);
               } else {
                    this.setSuccess(this.result);
               }

               this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.isSimulateEnabled) {
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]);

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
               }
          } catch (error: any) {
               console.error('Error in submitMultiSignedTransaction:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving submitMultiSignedTransaction in ${this.executionTime}ms`);
          }
     }

     async signForMultiSign() {
          console.log('Entering signForMultiSign');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          let txToSign: any;

          try {
               if (!this.txJson.trim()) {
                    return this.setError('Transaction cannot be empty');
               }

               const editedString = this.txJson.trim();
               let editedJson = JSON.parse(editedString);
               txToSign = this.cleanTx(editedJson);
               console.log('Pre txToSign', txToSign);

               const client = await this.xrplService.getClient();
               const currentLedger = await client.getLedgerIndex();
               console.log('currentLedger: ', currentLedger);
               txToSign.LastLedgerSequence = currentLedger + 1000; // adjust to new ledger

               console.log('Post txToSign', txToSign);

               // Get selected signer wallets
               const selectedSigners = this.availableSigners.filter(w => w.isSelectedSigner);

               if (!selectedSigners.length) {
                    return this.setError('Select at least one signer.');
               }

               const addresses = selectedSigners.map(acc => acc.address).join(',');
               const seeds = selectedSigners.map(acc => acc.seed).join(',');
               console.log('Addresses:', addresses);
               console.log('Seeds:', seeds);

               const fee = await this.xrplService.calculateTransactionFee(client);
               const wallet = await this.getWallet();
               const signerAddresses = this.utilsService.getMultiSignAddress(addresses);
               const signerSeeds = this.utilsService.getMultiSignSeeds(seeds);
               const result = await this.utilsService.handleMultiSignTransaction({ client, wallet, tx: txToSign, signerAddresses, signerSeeds, fee });
               console.info(`result`, result);
               this.outputField = result.signedTx?.tx_blob ? result.signedTx?.tx_blob : 'Error';
          } catch (error: any) {
               console.error('Error in signForMultiSign:', error);
               this.setError(`Error: ${error.message || error}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving signForMultiSign in ${this.executionTime}ms`);
          }
     }

     cleanTx(editedJson: any) {
          const defaults: Record<string, any[]> = {
               DestinationTag: [0],
               SourceTag: [0],
               InvoiceID: [0, ''],
          };

          for (const field in defaults) {
               if (editedJson.hasOwnProperty(field) && defaults[field].includes(editedJson[field])) {
                    delete editedJson[field];
               }
          }

          if (Array.isArray(editedJson.Memos)) {
               editedJson.Memos = editedJson.Memos.filter((memoObj: any) => {
                    const memo = memoObj?.Memo;
                    if (!memo) return false;

                    // Check if both fields are effectively empty
                    const memoDataEmpty = !memo.MemoData || memo.MemoData === '' || memo.MemoData === 0;
                    const memoTypeEmpty = !memo.MemoType || memo.MemoType === '' || memo.MemoType === 0;

                    // Remove if both are empty
                    return !(memoDataEmpty || memoTypeEmpty);
               });

               if (editedJson.Memos.length === 0) {
                    delete editedJson.Memos;
               } else {
                    this.encodeMemo(editedJson);
               }
          }

          if (typeof editedJson.Amount === 'string' && this.selectedTransaction === 'sendXrp') {
               editedJson.Amount = xrpl.xrpToDrops(editedJson.Amount);
          }

          if (this.isSimulateEnabled) {
               delete editedJson.Sequence;
          }

          return editedJson;
     }

     populateTxDetails() {
          if (!this.outputField.trim()) return;
          const decodedTx = xrpl.decode(this.outputField.trim());
          console.log(decodedTx);

          this.txJson = JSON.stringify(decodedTx, null, 3); // Update txJson with decoded
     }

     encodeMemo(editedJson: any) {
          editedJson.Memos = editedJson.Memos.map((memoObj: any) => {
               // Ensure the structure is correct
               if (!memoObj || !memoObj.Memo) {
                    return memoObj; // Return as-is if structure is unexpected
               }

               const { MemoData, MemoType, MemoFormat, ...rest } = memoObj.Memo;

               return {
                    Memo: {
                         ...rest,
                         ...(MemoData && { MemoData: xrpl.convertStringToHex(MemoData) }),
                         ...(MemoType && { MemoType: xrpl.convertStringToHex(MemoType) }),
                         ...(MemoFormat && { MemoFormat: xrpl.convertStringToHex(MemoFormat) }),
                    },
               };
          });
     }

     private async refreshWallets(client: xrpl.Client, addressesToRefresh?: string[]) {
          console.log('Entering refreshWallets');
          const REFRESH_THRESHOLD_MS = 3000;
          const now = Date.now();

          try {
               // Determine which wallets to refresh
               const walletsToUpdate = this.wallets.filter(w => {
                    const needsUpdate = !w.lastUpdated || now - w.lastUpdated > REFRESH_THRESHOLD_MS;
                    const inFilter = addressesToRefresh ? addressesToRefresh.includes(w.classicAddress ?? w.address) : true;
                    return needsUpdate && inFilter;
               });

               if (!walletsToUpdate.length) {
                    console.debug('No wallets need updating.');
                    return;
               }

               console.debug(`Refreshing ${walletsToUpdate.length} wallet(s)...`);

               //Fetch all accountInfo data in parallel (faster, single request per wallet)
               const accountInfos = await Promise.all(walletsToUpdate.map(w => this.xrplService.getAccountInfo(client, w.classicAddress ?? w.address, 'validated', '')));

               //Cache reserves (only once per session)
               if (!this.cachedReserves) {
                    this.cachedReserves = await this.utilsService.getXrplReserve(client);
                    console.debug('Cached XRPL reserve data:', this.cachedReserves);
               }

               // Heavy computation outside Angular (no UI reflows)
               this.ngZone.runOutsideAngular(async () => {
                    const updatedWallets = await Promise.all(
                         walletsToUpdate.map(async (wallet, i) => {
                              try {
                                   const accountInfo = accountInfos[i];
                                   const address = wallet.classicAddress ?? wallet.address;

                                   // --- Derive balance directly from accountInfo to avoid extra ledger call ---
                                   const balanceInDrops = String(accountInfo.result.account_data.Balance);
                                   const balanceXrp = xrpl.dropsToXrp(balanceInDrops); // returns string

                                   // --- Get ownerCount + total reserve ---
                                   const { ownerCount, totalXrpReserves } = await this.utilsService.updateOwnerCountAndReserves(client, accountInfo, address);

                                   const spendable = parseFloat(String(balanceXrp)) - parseFloat(String(totalXrpReserves || '0'));

                                   return {
                                        ...wallet,
                                        ownerCount,
                                        xrpReserves: totalXrpReserves,
                                        balance: spendable.toFixed(6),
                                        spendableXrp: spendable.toFixed(6),
                                        lastUpdated: now,
                                   };
                              } catch (err) {
                                   console.error(`Error updating wallet ${wallet.address}:`, err);
                                   return wallet;
                              }
                         })
                    );

                    console.log('updatedWallets', updatedWallets);
                    // Apply updates inside Angular (UI updates + service sync)
                    this.ngZone.run(() => {
                         updatedWallets.forEach(updated => {
                              const idx = this.wallets.findIndex(existing => (existing.classicAddress ?? existing.address) === (updated.classicAddress ?? updated.address));
                              if (idx !== -1) {
                                   this.walletManagerService.updateWallet(idx, updated);
                              }
                         });
                         // Ensure Selected Account Summary refreshes
                         if (this.selectedWalletIndex !== null && this.wallets[this.selectedWalletIndex]) {
                              this.currentWallet = { ...this.wallets[this.selectedWalletIndex] };
                         }
                    });
               });
          } catch (error: any) {
               console.error('Error in refreshWallets:', error);
          } finally {
               this.executionTime = (Date.now() - now).toString();
               console.log(`Leaving refreshWallets in ${this.executionTime}ms`);
          }
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);

          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     private checkForSignerAccounts(accountObjects: xrpl.AccountObjectsResponse) {
          const signerAccounts: string[] = [];
          if (accountObjects.result && Array.isArray(accountObjects.result.account_objects)) {
               accountObjects.result.account_objects.forEach(obj => {
                    if (obj.LedgerEntryType === 'SignerList' && Array.isArray(obj.SignerEntries)) {
                         obj.SignerEntries.forEach((entry: any) => {
                              if (entry.SignerEntry?.Account) {
                                   signerAccounts.push(entry.SignerEntry.Account + '~' + entry.SignerEntry.SignerWeight);
                                   this.signerQuorum = obj.SignerQuorum;
                              }
                         });
                    }
               });
          }
          return signerAccounts;
     }

     private getSignerAccountsList(accountObjects: xrpl.AccountObjectsResponse) {
          const signerList = accountObjects.result.account_objects?.find((obj: any): obj is SignerList => obj.LedgerEntryType === 'SignerList');
          this.requiredQuorum = signerList?.SignerQuorum || 0;

          const signerData = this.checkForSignerAccounts(accountObjects).map(s => {
               const [address, weight] = s.split('~');
               return { address, weight: parseInt(weight, 10) };
          });
          this.availableSigners = this.wallets
               .filter(w => w.address !== this.currentWallet.address)
               .filter(w => signerData.some(s => s.address === w.address))
               .map(w => {
                    const match = signerData.find(s => s.address === w.address);
                    return {
                         ...w,
                         quorum: match ? match.weight : null,
                         isSelectedSigner: false,
                    };
               });
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

     private async validateInputs(inputs: ValidationInputs, action: string): Promise<string[]> {
          const errors: string[] = [];

          // --- Common validators ---
          const isRequired = (value: string | null | undefined, fieldName: string): string | null => {
               if (value == null || !this.utilsService.validateInput(value)) {
                    return `${fieldName} cannot be empty.`;
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

          // --- Action-specific config ---
          const actionConfig: Record<
               string,
               {
                    required: (keyof ValidationInputs)[];
                    customValidators?: (() => string | null)[];
                    asyncValidators?: (() => Promise<string | null>)[];
               }
          > = {
               getAccountDetails: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null)],
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
          config.customValidators?.forEach(validator => {
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

          return errors;
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
          this.txResult = tx;
          this.scheduleHighlight();
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.storageService.set('destinations', this.destinations);
     }

     onTxJsonBlur() {
          clearTimeout(this.highlightTimeout);
          try {
               // Ensure latest edits are captured
               const text = this.txJsonPre.nativeElement.innerText.trim();
               this.txJson = text;

               // Force an immediate highlight when leaving field
               this.scheduleHighlight();
          } catch (e) {
               console.error('Invalid JSON:', e);
          }
     }

     // onTxJsonBlur() {
     //      const text = this.txJsonPre.nativeElement.innerText.trim();
     //      this.txJson = text;
     //      this.scheduleHighlight();
     // }

     onTxJsonInput() {
          this.txJson = this.txJsonPre.nativeElement.innerText;

          // Cancel any pending re-highlighting
          clearTimeout(this.highlightTimeout);

          // Re-highlight only after user stops typing for 500ms
          this.highlightTimeout = setTimeout(() => {
               this.scheduleHighlight();
          }, 5000);
     }

     private updateJsonDisplay() {
          this.scheduleHighlight();
          this.cdr.markForCheck();
     }

     setTxJson(json: string) {
          this.txJson = json;
          // if (this.txJsonPre) {
          //      this.txJsonPre.nativeElement.innerText = json;
          // }
          this.scheduleHighlight();
     }

     setSigned(blob: string) {
          this.outputField = blob;
          this.updateJsonDisplay();
     }

     private scheduleHighlight() {
          // Use the captured injector to run afterRenderEffect  safely
          afterRenderEffect(
               () => {
                    if (this.paymentTx && this.paymentJson?.nativeElement) {
                         const json = JSON.stringify(this.paymentTx, null, 2);
                         this.paymentJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                    }
                    if (this.txResult && this.txResultJson?.nativeElement) {
                         const json = JSON.stringify(this.txResult, null, 2);
                         this.txResultJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                    }

                    if (this.txJson && this.txJsonCode?.nativeElement) {
                         const pretty = JSON.stringify(JSON.parse(this.txJson), null, 2);
                         this.txJsonCode.nativeElement.textContent = pretty;
                         Prism.highlightElement(this.txJsonCode.nativeElement);
                    }

                    /* ---- Signed blob (hex string) ---- */
                    if (this.outputField && this.signedCode?.nativeElement) {
                         this.signedCode.nativeElement.textContent = this.outputField;
                         Prism.highlightElement(this.signedCode.nativeElement);
                    }

                    /* ---- Error message (plain text) ---- */
                    if (this.isError && this.errorMessage && this.txJsonCode?.nativeElement) {
                         this.txJsonCode.nativeElement.textContent = `ERROR: ${this.errorMessage}`;
                         // optional: give it a red background
                         this.txJsonPre.nativeElement.classList.add('error');
                    } else {
                         this.txJsonPre.nativeElement.classList.remove('error');
                    }
               },

               { injector: this.injector }
          );
     }

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.showToastMessage('Check ID copied!');
          });
     }

     copyTxJson() {
          this.copyToClipboard(this.txJson);
     }
     copySigned() {
          this.copyToClipboard(this.outputField);
     }

     private copyToClipboard(text: string) {
          navigator.clipboard.writeText(text).then(() => {
               this.showToast = true;
               this.toastMessage = 'Copied to clipboard!';
               setTimeout(() => (this.showToast = false), 2000);
          });
     }

     downloadSigned() {
          const blob = new Blob([this.outputField], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `signed-tx-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
     }

     downloadTxJson() {
          const blob = new Blob([this.txJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `signed-tx-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
     }

     copyTx() {
          const json = JSON.stringify(this.paymentTx, null, 2);
          navigator.clipboard.writeText(json).then(() => {
               this.showToastMessage('Transaction JSON copied!');
          });
     }

     downloadTx() {
          const json = JSON.stringify(this.paymentTx, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `payment-tx-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
     }

     copyTxResult() {
          const json = JSON.stringify(this.txResult, null, 2);
          navigator.clipboard.writeText(json).then(() => {
               this.showToastMessage('Transaction Result JSON copied!');
          });
     }

     downloadTxResult() {
          const json = JSON.stringify(this.txResult, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tx-result-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
     }

     public get infoMessage(): string | null {
          const tabConfig = {
               create: {
                    // checks: this.existingChecks,
                    getDescription: (count: number) => (count === 1 ? 'check' : 'checks'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
               cash: {
                    // checks: this.cashableChecks,
                    getDescription: (count: number) => (count === 1 ? 'check that can be cashed' : 'checks that can be cashed'),
                    dynamicText: '', // Empty for no additional text
                    showLink: true,
               },
               cancel: {
                    // checks: this.cancellableChecks,
                    getDescription: (count: number) => (count === 1 ? 'check that can be cancelled' : 'checks that can be cancelled'),
                    dynamicText: '', // Dynamic text before the count
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

     private setWarning(msg: string | null) {
          this.warningMessage = msg;
          this.cdr.detectChanges();
     }

     clearWarning() {
          this.setWarning(null);
     }

     autoResize(textarea: HTMLTextAreaElement) {
          if (!textarea) return;
          textarea.style.height = 'auto'; // reset
          textarea.style.height = textarea.scrollHeight + 'px'; // expand
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
          }
          this.isSimulateEnabled = false;
          this.selectedSingleTicket = '';
          this.isTicket = false;
          this.useMultiSign = false;
          this.resetSigners();
          this.cdr.markForCheck();
     }

     private clearMessages() {
          const fadeDuration = 400; // ms
          this.result = '';
          this.isError = false;
          this.isSuccess = false;
          this.txHash = '';
          this.txHashes = [];
          this.txErrorHashes = [];
          this.txResult = [];
          this.paymentTx = [];
          this.successMessage = '';
          this.errorMessage = '';
          this.cdr.detectChanges();
     }

     resetSigners() {
          this.availableSigners.forEach(w => (w.isSelectedSigner = false));
          this.selectedQuorum = 0;
     }

     getTransactionLabel(key: string): string {
          return (AppConstants.SIGN_TRANSACTION_LABEL_MAP as Record<string, string>)[key] || key;
     }

     private updateSpinnerMessage(message: string) {
          this.spinnerMessage = message;
          this.cdr.detectChanges();
     }

     private async showSpinnerWithDelay(message: string, delayMs: number = 200) {
          this.spinner = true;
          this.updateSpinnerMessage(message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
     }

     private setErrorProperties() {
          this.isSuccess = false;
          this.isError = true;
          this.spinner = false;
     }

     private setError(message: string) {
          this.setErrorProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError,
               isSuccess: this.isSuccess,
          });
     }

     private setSuccessProperties() {
          this.isSuccess = true;
          this.isError = false;
          this.spinner = false;
          this.result = '';
     }

     private setSuccess(message: string) {
          this.setSuccessProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError,
               isSuccess: this.isSuccess,
          });
          this.cdr.detectChanges();
     }
}
