import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef, EventEmitter, Output, ViewChildren, QueryList, NgZone, inject, afterRenderEffect, runInInjectionContext, Injector } from '@angular/core';
import { trigger, state, style, transition, animate, group, query } from '@angular/animations';
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
declare var Prism: any;

interface ValidationInputs {
     seed?: string;
     account_info?: any;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeySeed?: string;
     useMultiSign?: boolean;
     multiSignSeeds?: string;
     multiSignAddresses?: string;
     isTicket?: boolean;
     ticketCount?: string;
     deleteTicketSequence?: string;
     selectedSingleTicket?: string;
     selectedTicket?: string;
     signerQuorum?: number;
     signers?: { account: string; weight: number }[];
}

@Component({
     selector: 'app-tickets',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './tickets.component.html',
     styleUrl: './tickets.component.css',
})
export class CreateTicketsComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     @ViewChild('accountForm') accountForm!: NgForm;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('signers') signersRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChild('seeds') seedsRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChildren('signers, seeds') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;
     private readonly injector = inject(Injector);
     result: string = '';
     isError: boolean = false;
     isSuccess: boolean = false;
     isEditable: boolean = false;
     ticketCountField: string = '';
     deleteTicketSequence: string = '';
     isTicket: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     checkIdField: string = '';
     ownerCount: string = '';
     totalXrpReserves: string = '';
     executionTime: string = '';
     destinationField: string = '';
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
     spinner: boolean = false;
     issuers: string[] = [];
     selectedIssuer: string = '';
     isSimulateEnabled: boolean = false;
     masterKeyDisabled: boolean = false;
     spinnerMessage: string = '';
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
     showSecret: boolean = false;
     totalTickets: number = 0;
     createdTicketss: number = 0;
     environment: string = '';
     encryptionType: string = '';
     paymentTx: any[] = [];
     txResult: any[] = [];
     txHash: string = '';
     txHashes: string[] = [];
     successMessage: string = '';
     activeTab: string = 'create';
     private cachedReserves: any = null;
     hasWallets: boolean = true;
     walletTicketCount = 0;
     showToast: boolean = false;
     toastMessage: string = '';
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     warningMessage: string | null = null;

     constructor(private readonly xrplService: XrplService, private readonly utilsService: UtilsService, private readonly cdr: ChangeDetectorRef, private readonly storageService: StorageService, private readonly xrplTransactions: XrplTransactionService, private ngZone: NgZone, private walletGenerator: WalletGeneratorService, private walletManagerService: WalletManagerService) {}

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
          if (this.activeTab === 'delete') {
               this.deleteTicket();
          } else if (this.activeTab === 'create') {
               this.createTicket();
          }
     }

     setTab(tab: string) {
          this.activeTab = tab;
          if (this.activeTab === 'create') {
               this.multiSelectMode = false;
          }

          this.clearMessages();
          this.clearFields(true);
          this.clearWarning();
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
          this.walletManagerService.saveEdit(this.tempName); // ← PASS IT!
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
               this.refreshBalance(0);
          } else {
               (async () => {
                    const client = await this.xrplService.getClient();
                    await this.refreshWallets(client, [this.wallets[this.selectedWalletIndex].address, this.destinationField ? this.destinationField : '']);
               })();
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
          this.cdr.detectChanges();
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          try {
               const client = await this.xrplService.getClient();
               const walletAddress = wallet.classicAddress ? wallet.classicAddress : wallet.address;
               await this.refreshWallets(client, [walletAddress]);
               this.cdr.detectChanges();
          } catch (err) {
               this.setError('Failed to refresh balance');
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
          this.updateSpinnerMessage(``);
          this.showSpinnerWithDelay('Generating new wallet', 5000);
          const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment, this.encryptionType);
          const client = await this.xrplService.getClient();
          this.refreshWallets(client, faucetWallet.address);
          this.spinner = false;
          this.clearWarning();
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
               await this.getTickets();
          } else if (this.currentWallet.address) {
               this.setError('Invalid XRP address');
          }
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

     onTicketToggle(event: any, ticket: string) {
          if (event.target.checked) {
               this.selectedTickets = [...this.selectedTickets, ticket];
          } else {
               this.selectedTickets = this.selectedTickets.filter(t => t !== ticket);
          }
     }

     async getTickets() {
          console.log('Entering getTickets');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet.seed,
                    account_info: accountInfo,
               };

               const ticketObjects = this.xrplService.filterAccountObjectsByTypes(accountObjects, ['Ticket']);
               this.utilsService.logObjects('ticketObjects', ticketObjects);

               const errors = await this.validateInputs(inputs, 'getTickets');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               this.walletTicketCount = ticketObjects.result.account_objects.length;
               this.refreshUIData(wallet, accountInfo, accountObjects);

               await this.refreshWallets(client, [wallet.classicAddress]);

               setTimeout(async () => {
                    try {
                         this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                         this.clearFields(false);
                         this.updateTickets(accountObjects);
                    } catch (err) {
                         console.error('Error in deferred UI updates:', err);
                    }
               }, 0);
          } catch (error: any) {
               console.error('Error in getTickets:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getTickets in ${this.executionTime}ms`);
          }
     }

     async createTicket() {
          console.log('Entering createTicket');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               ticketCount: this.ticketCountField,
               isRegularKeyAddress: this.isRegularKeyAddress,
               regularKeyAddress: this.isRegularKeyAddress ? this.regularKeyAddress : undefined,
               regularKeySeed: this.isRegularKeyAddress ? this.regularKeySeed : undefined,
               useMultiSign: this.useMultiSign,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               deleteTicketSequence: this.isTicket ? this.deleteTicketSequence : undefined,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'createTicket');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               let ticketCreateTx: xrpl.TicketCreate = {
                    TransactionType: 'TicketCreate',
                    Account: wallet.classicAddress,
                    TicketCount: parseInt(this.ticketCountField),
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, ticketCreateTx, wallet, '');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, ticketCreateTx, fee)) {
                    return this.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.showSpinnerWithDelay(this.isSimulateEnabled ? 'Simulating Ticket Creation (no funds will be moved)...' : 'Submitting Ticket Creation to Ledger...', 200);

               this.paymentTx.push(ticketCreateTx);
               this.updatePaymentTx();

               let response: any;

               if (this.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, ticketCreateTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, ticketCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.setError('ERROR: Failed to sign Payment transaction.');
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

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.setError(userMessage);
               } else {
                    this.setSuccess(this.result);
               }

               this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.isSimulateEnabled) {
                    this.successMessage = 'Tickets created successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.walletTicketCount = this.getAccountTickets(updatedAccountObjects).length;

                    await this.refreshWallets(client, [wallet.classicAddress]);

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
                    this.successMessage = 'Simulated Ticket creation successfully!';
               }
          } catch (error: any) {
               console.error('Error in createTicket:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving createTicket in ${this.executionTime}ms`);
          }
     }

     async deleteTicket() {
          console.log('Entering deleteTicket');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               deleteTicketSequence: this.deleteTicketSequence,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, ticketObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), await this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'ticket'), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logObjects('ticketObjects', ticketObjects);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'deleteTicket');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const ticketsToDelete = this.multiSelectMode ? this.selectedTickets.map(t => Number(t)) : [Number(this.deleteTicketSequence)];

               if (!ticketsToDelete.length || this.walletTicketCount === 0) {
                    this.setWarning(`Ticket <code>${this.deleteTicketSequence}</code> does not exist on this account.`);
                    return;
               }

               let ticketsSuccessfullyDeleted = 0;
               const invalidTickets: number[] = [];

               for (const ticketSeq of ticketsToDelete) {
                    const ticketExists = ticketObjects.result.account_objects.some((ticket: any) => ticket.TicketSequence === ticketSeq);

                    if (!ticketExists) {
                         console.warn(`Ticket ${ticketSeq} does not exist for account ${wallet.classicAddress}`);
                         invalidTickets.push(ticketSeq);
                         // this.setWarning(`Ticket <code>${ticketSeq}</code> does not exist on this account.`);
                         continue; // skip non-existing ticket
                    }

                    let accountSetTx: xrpl.AccountSet = {
                         TransactionType: 'AccountSet',
                         Account: wallet.classicAddress,
                         TicketSequence: Number(ticketSeq),
                         Sequence: 0,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, accountSetTx, wallet, ticketSeq);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
                         console.warn(`Insufficient XRP for ticket ${ticketSeq}, skipping.`);
                         continue;
                    }

                    this.showSpinnerWithDelay(this.isSimulateEnabled ? `Simulating delete for ticket ${ticketSeq}...` : `Submitting delete for ticket ${ticketSeq}...`, 200);

                    // STORE IT FOR DISPLAY
                    this.paymentTx.push(accountSetTx);
                    this.updatePaymentTx();

                    let response: any;
                    if (this.isSimulateEnabled) {
                         response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
                    } else {
                         const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         if (!signedTx) {
                              console.error(`Failed to sign transaction for ticket ${ticketSeq}`);
                              continue;
                         }

                         response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    }

                    this.utilsService.logObjects('response', response);
                    this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    this.txResult.push(response.result);
                    this.updateTxResult(this.txResult);

                    this.utilsService.logObjects('response', response);
                    const isSuccess = this.utilsService.isTxSuccessful(response);
                    if (!isSuccess) {
                         console.warn(`Ticket ${ticketSeq} deletion failed:`, response);
                    } else {
                         ticketsSuccessfullyDeleted += 1;
                         const hash = response.result.hash ?? response.result.tx_json.hash;
                         this.txHashes.push(hash); // ← push to array
                         console.log(`Ticket ${ticketSeq} deleted successfully. TxHash:`, response.result.hash ? response.result.hash : response.result.tx_json.hash);
                    }
               }

               this.setSuccess(this.result);

               // Show one warning that contains *all* missing tickets
               if (invalidTickets.length) {
                    const listHtml = invalidTickets.map(n => `<code>${n}</code>`).join(', ');
                    const plural = invalidTickets.length > 1 ? 's' : '';
                    this.setWarning(`Ticket${plural} ${listHtml} do${plural ? '' : 'es'} not exist on this account.`);
               } else {
                    this.clearWarning(); // nothing missing → hide the panel
               }

               if (!this.isSimulateEnabled) {
                    this.successMessage = `${ticketsSuccessfullyDeleted} Ticket(s) deleted successfully!`;

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.walletTicketCount = this.getAccountTickets(updatedAccountObjects).length;

                    await this.refreshWallets(client, [wallet.classicAddress]);

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
                    this.successMessage = 'Simulated Ticket creation successfully!';
               }
          } catch (error: any) {
               console.error('Error in deleteTicket:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deleteTicket in ${this.executionTime}ms`);
          }
     }

     private async setTxOptionalFields(client: xrpl.Client, ticketTx: any, wallet: xrpl.Wallet, ticketSeq: any) {
          if (this.isTicket) {
               const singleTicket = this.selectedSingleTicket || ticketSeq;

               if (!(await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(singleTicket)))) {
                    return this.setError(`ERROR: Ticket Sequence ${singleTicket} not found for account ${wallet.classicAddress}`);
               }

               this.utilsService.setTicketSequence(ticketTx, singleTicket, true);
          }

          if (this.memoField) {
               this.utilsService.setMemoField(ticketTx, this.memoField);
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

     updateDeleteTicketSequence(): void {
          if (this.multiSelectMode) {
               // Join all selected tickets into a comma-separated string
               this.deleteTicketSequence = this.selectedTickets.join(',');
          } else {
               // Just one ticket selected
               this.deleteTicketSequence = this.selectedSingleTicket || '';
          }
     }

     clearDeleteTicketSequence() {
          if (!this.multiSelectMode) {
               this.deleteTicketSequence = '';
               this.selectedSingleTicket = '';
          }
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
                    if (fieldName === 'TicketCount') {
                         return `Number of tickets cannot be empty.`;
                    }
                    if (fieldName === 'DeleteTicketSequence') {
                         return `Ticket Sequence cannot be empty.`;
                    }
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

          const isTicketCountLessThan250 = (value: any, fieldName: string): string | null => {
               if (parseInt(value) + this.walletTicketCount > 250) {
                    return `An account cannot have more 250 total tickets.`;
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

          // const isValidSeed = (value: string | undefined): string | null => {
          //      if (value) {
          //           const { value: detectedValue } = this.utilsService.detectXrpInputType(value);
          //           if (detectedValue === 'unknown') {
          //                return 'Account seed is invalid';
          //           }
          //      }
          //      return null;
          // };

          // const isValidInvoiceId = (value: string | undefined): string | null => {
          //      if (value && !this.utilsService.validateInput(value)) {
          //           return 'Invoice ID is invalid';
          //      }
          //      return null;
          // };

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
          // const checkDestinationTagRequirement = async (): Promise<string | null> => {
          //      if (!inputs.destination) return null; // Skip if no destination provided
          //      try {
          //           const client = await this.xrplService.getClient();
          //           const accountInfo = await this.xrplService.getAccountInfo(client, inputs.destination, 'validated', '');
          //           if (accountInfo.result.account_flags.requireDestinationTag && (!inputs.destinationTag || inputs.destinationTag.trim() === '')) {
          //                return `Receiver requires a Destination Tag for payment`;
          //           }
          //      } catch (err) {
          //           console.error('Failed to check destination tag requirement:', err);
          //           return `Could not validate destination account`;
          //      }
          //      return null;
          // };

          // --- Action-specific config ---
          const actionConfig: Record<
               string,
               {
                    required: (keyof ValidationInputs)[];
                    customValidators?: (() => string | null)[];
                    asyncValidators?: (() => Promise<string | null>)[];
               }
          > = {
               getTickets: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null)],
                    asyncValidators: [],
               },
               createTicket: {
                    required: ['seed', 'ticketCount'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isValidNumber(inputs.ticketCount, 'Ticket count', 0), () => isTicketCountLessThan250(inputs.ticketCount, 'Ticket count')],
               },
               deleteTicket: {
                    required: ['seed', 'deleteTicketSequence'],
                    customValidators: [() => isValidSeed(inputs.seed), () => isValidNumber(inputs.deleteTicketSequence, 'Ticket sequence', 0)],
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
               },
               { injector: this.injector }
          );
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
                    ticketCount: this.walletTicketCount,
                    message: 'available Tickets for use.',
                    dynamicText: '', // Add dynamic text here
                    showLink: true,
               },
               delete: {
                    ticketCount: this.walletTicketCount,
                    message: 'Tickets that can be deleted.',
                    dynamicText: '', // Empty for no additional text
                    showLink: true,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          return `The <code>${walletName}</code> wallet has ${dynamicText}${config.ticketCount} ${config.message}`;
     }

     // set a warning
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
               this.isSimulateEnabled = false;
               this.useMultiSign = false;
               this.isRegularKeyAddress = false;
               this.deleteTicketSequence = '';
               this.clearMessages();
               this.clearWarning();
          }

          this.deleteTicketSequence = '';
          this.selectedTicket = '';
          this.selectedSingleTicket = '';
          this.isTicket = false;
          this.selectedTicket = '';
          this.ticketCountField = '';
          this.isMemoEnabled = false;
          this.memoField = '';
          this.cdr.detectChanges();
     }

     private clearMessages() {
          const fadeDuration = 400; // ms
          this.result = '';
          this.isError = false;
          this.isSuccess = false;
          this.txHash = '';
          this.txHashes = [];
          this.txResult = [];
          this.paymentTx = [];
          this.successMessage = '';
          this.cdr.detectChanges();
     }

     async showSpinnerWithDelay(message: string, delayMs: number = 200) {
          this.spinner = true;
          this.updateSpinnerMessage(message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
     }

     private updateSpinnerMessage(message: string) {
          this.spinnerMessage = message;
          this.cdr.detectChanges();
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
