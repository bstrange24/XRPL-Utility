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
import { LucideAngularModule } from 'lucide-angular';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { Subject, takeUntil } from 'rxjs';
import { pairwise, startWith } from 'rxjs/operators';
import { NgIcon } from '@ng-icons/core';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
declare var Prism: any;

interface ValidationInputs {
     accountInfo?: any;
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
     useMultiSign: boolean = false;
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     isRegularKeyAddress: boolean = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     masterKeyDisabled: boolean = false;
     memoField: string = '';
     isMemoEnabled: boolean = false;
     isSimulateEnabled: boolean = false;
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
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
     activeTab = 'getAccountDetails'; // default
     private cachedReserves: any = null;
     encryptionType: string = '';
     hasWallets: boolean = true;
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     userEmail: string = '';
     flagResults: any;
     private highlightTimeout: any;
     destinations: { name?: string; address: string }[] = [];
     issuers: { name?: string; address: string }[] = [];
     customDestinations: { name?: string; address: string }[] = [];
     buttonLoading = {
          getJson: false,
          signed: false,
          submit: false,
          multiSign: false,
     };

     constructor(
          private readonly xrplService: XrplService,
          private readonly utilsService: UtilsService,
          private readonly cdr: ChangeDetectorRef,
          private readonly storageService: StorageService,
          private readonly xrplTransactions: XrplTransactionService,
          private walletGenerator: WalletGeneratorService,
          private walletManagerService: WalletManagerService,
          private signTransactionUtilService: SignTransactionUtilService,
          public ui: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private validationService: ValidationService
     ) {}

     ngOnInit() {
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

     async setTab(tab: string) {
          this.activeTab = tab;
          this.clearMessages();
          this.clearFields(true);
          this.getAccountDetails();
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

     get isAnyButtonLoading(): boolean {
          return Object.values(this.buttonLoading).some(v => v === true);
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
               this.ui.setError('Invalid XRP address');
          }
     }

     onTransactionChange(): void {
          this.txJson = '';
          this.outputField = '';
          this.ui.isError = false;
          this.ui.errorMessage = null;
          this.clearMessages();
          // Enable the newly selected transaction (fills the JSON pane)
          this.enableTransaction();
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

     setMemoField() {
          this.enableTransaction();
     }

     setTicketField() {
          this.enableTransaction();
     }

     getTransactionJSON() {
          this.buttonLoading.getJson = true;
          this.onTransactionChange();
          this.buttonLoading.getJson = false;
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
          this.ui.updateSpinnerMessage(``);

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet.seed,
                    accountInfo: accountInfo,
               };

               const errors = await this.validationService.validate('AccountInfo', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
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
               this.ui.setError(error.message || 'Unknown error');
          } finally {
               this.ui.spinner = false;
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
          this.ui.updateSpinnerMessage(``);

          try {
               this.ui.errorMessage = ''; // Clear any prior error

               if (!this.txJson.trim()) return this.ui.setError('Transaction cannot be empty');

               const editedString = this.txJson.trim();
               let editedJson = JSON.parse(editedString);
               let cleanedJson = this.cleanTx(editedJson);
               console.log('Edited JSON:', editedJson);
               console.log('Cleaned JSON:', cleanedJson);

               const serialized = xrpl.encode(cleanedJson);
               const unsignedHash = xrpl.hashes.hashTx(serialized);
               console.log('Unsigned Transaction hash (hex):', unsignedHash);

               this.outputField = unsignedHash; // Set property
               this.ui.isError = false;
          } catch (error: any) {
               console.error('Error in unsignedTransaction:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving unsignedTransaction in ${this.executionTime}ms`);
          }
     }

     async signedTransaction() {
          console.log('Entering signedTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.ui.updateSpinnerMessage(``);
          this.buttonLoading.signed = true;

          let txToSign: any;

          try {
               const wallet = await this.getWallet();

               if (!this.txJson.trim()) {
                    return this.ui.setError('Transaction cannot be empty');
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
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.buttonLoading.signed = false;
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving signedTransaction in ${this.executionTime}ms`);
          }
     }

     async submitTransaction() {
          console.log('Entering submitTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.ui.updateSpinnerMessage(``);
          this.buttonLoading.submit = true;

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               if (!this.outputField.trim()) {
                    return this.ui.setError('Signed tx blob can not be empty');
               }

               const signedTxBlob = this.outputField.trim();

               const txType = this.getTransactionLabel(this.selectedTransaction ?? '');
               this.ui.showSpinnerWithDelay(this.isSimulateEnabled ? `Simulating ${txType} (no funds will be moved)...` : `Submitting ${txType} to Ledger...`, 200);

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

               this.ui.txResult.push(response.result);
               this.updateTxResult(this.ui.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.isSimulateEnabled) {
                    this.ui.successMessage = 'Transaction completed successfully!';

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
                    this.ui.successMessage = 'Simulated transaction successfully!';
               }
          } catch (error: any) {
               console.error('Error in submitTransaction:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.buttonLoading.submit = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving submitTransaction in ${this.executionTime}ms`);
          }
     }

     async submitMultiSignedTransaction() {
          console.log('Entering submitMultiSignedTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.ui.updateSpinnerMessage(``);

          try {
               if (!this.outputField.trim()) {
                    return this.ui.setError('Signed tx blob can not be empty');
               }

               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const multiSignedTxBlob = this.outputField.trim();
               console.log('multiSignedTxBlob', multiSignedTxBlob);

               const txType = this.getTransactionLabel(this.selectedTransaction ?? '');
               this.ui.showSpinnerWithDelay(this.isSimulateEnabled ? `Simulating ${txType} (no funds will be moved)...` : `Submitting ${txType} to Ledger...`, 200);

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

               this.ui.txResult.push(response.result);
               this.updateTxResult(this.ui.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

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
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving submitMultiSignedTransaction in ${this.executionTime}ms`);
          }
     }

     async signForMultiSign() {
          console.log('Entering signForMultiSign');
          const startTime = Date.now();
          this.clearMessages();
          this.ui.updateSpinnerMessage(``);
          this.buttonLoading.multiSign = true;

          let txToSign: any;

          try {
               if (!this.txJson.trim()) {
                    return this.ui.setError('Transaction cannot be empty');
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
                    return this.ui.setError('Select at least one signer.');
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
               this.ui.setError(`Error: ${error.message || error}`);
          } finally {
               this.ui.spinner = false;
               this.buttonLoading.multiSign = false;
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

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);

          // Clean up selections based on current mode
          if (this.multiSelectMode) {
               this.selectedSingleTicket = this.utilsService.cleanUpMultiSelection(this.selectedTickets, this.ticketArray);
          } else {
               this.selectedSingleTicket = this.utilsService.cleanUpSingleSelection(this.selectedTickets, this.ticketArray);
          }
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
                    if (this.ui.isError && this.ui.errorMessage && this.txJsonCode?.nativeElement) {
                         this.txJsonCode.nativeElement.textContent = `ERROR: ${this.ui.errorMessage}`;
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
               this.ui.showToastMessage('Check ID copied!');
          });
     }

     private setWarning(msg: string | null) {
          this.ui.warningMessage = msg;
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
          this.ui.result = '';
          this.ui.isError = false;
          this.ui.isSuccess = false;
          this.ui.successMessage = '';
          this.ui.errorMessage = '';
          this.cdr.detectChanges();
     }

     resetSigners() {
          this.availableSigners.forEach(w => (w.isSelectedSigner = false));
          this.selectedQuorum = 0;
     }

     getTransactionLabel(key: string): string {
          return (AppConstants.SIGN_TRANSACTION_LABEL_MAP as Record<string, string>)[key] || key;
     }
}
