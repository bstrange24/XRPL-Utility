import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef, ViewEncapsulation, EventEmitter, Output, ViewChildren, QueryList } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { TransactionMetadataBase, TicketCreate } from 'xrpl';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { RenderUiComponentsService } from '../../services/render-ui-components/render-ui-components.service';
import { ClickToCopyService } from '../../services/click-to-copy/click-to-copy.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { AppWalletDynamicInputComponent } from '../app-wallet-dynamic-input/app-wallet-dynamic-input.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { InfoMessageConstants } from '../../core/info-message.constants';

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

declare var Prism: any;

@Component({
     selector: 'app-create-tickets',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent],
     // animations: [trigger('fadeInOut', [transition(':enter', [style({ opacity: 0, transform: 'translateY(6px)' }), animate('1400ms cubic-bezier(0.16, 1, 0.3, 1)')]), transition(':leave', [animate('1000ms cubic-bezier(0.6, 0, 1, 0.4)', style({ opacity: 0, transform: 'translateY(6px)' }))])])],
     // animations: [
     //      trigger('fadeInFromBottom', [
     //           transition(':enter', [
     //                style({ opacity: 0, transform: 'translateY(20px)' }), // start below
     //                animate(
     //                     '1080ms cubic-bezier(0.16, 1, 0.3, 1)', // smooth & fast
     //                     style({ opacity: 1, transform: 'translateY(0)' })
     //                ), // end in place
     //           ]),
     //           transition(':leave', [
     //                animate('1200ms cubic-bezier(0.6, 0, 1, 0.4)', style({ opacity: 0, transform: 'translateY(20px)' })), // slide down while fading out
     //           ]),
     //      ]),
     // ],
     templateUrl: './create-tickets.component.html',
     styleUrl: './create-tickets.component.css',
})
export class CreateTicketsComponent implements AfterViewChecked, OnInit, AfterViewInit, AfterViewChecked {
     @Output() walletListChange = new EventEmitter<any[]>();
     @ViewChild('resultField') resultField!: ElementRef<HTMLDivElement>;
     @ViewChild('accountForm') accountForm!: NgForm;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('signers') signersRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChild('seeds') seedsRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChildren('signers, seeds') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;
     lastResult: string = '';
     result: string = '';
     isError: boolean = false;
     isSuccess: boolean = false;
     isEditable: boolean = false;
     ticketCountField: string = '';
     deleteTicketSequence: string = '';
     isTicket: boolean = false;
     isTicketEnabled: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     xrpBalance1Field: string = '';
     checkIdField: string = '';
     ownerCount: string = '';
     totalXrpReserves: string = '';
     executionTime: string = '';
     destinationField: string = '';
     memoField: string = '';
     isMemoEnabled: boolean = false;
     isMultiSignTransaction: boolean = false;
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
     tokenBalance: string = '';
     isSimulateEnabled: boolean = false;
     masterKeyDisabled: boolean = false;
     spinnerMessage: string = '';
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     wallets: any[] = [];
     selectedWalletIndex: number = 0;
     currentWallet = { name: '', address: '', seed: '', balance: '', ownerCount: '', xrpReserves: '', spendableXrp: '' };
     showSecret = false; // toggle for secret key
     mpTokens = 0; // placeholder – fill from XRPL if you have it
     createdMPTs = 0; // placeholder – fill from XRPL if you have it
     environment: string = '';
     paymentTx: any = null; // Will hold the transaction object
     txResult: any = null; // Will hold the transaction object
     private needsHighlight = false;
     txHash: string = '';
     activeTab = 'create'; // default
     successMessage: string = '';

     constructor(private readonly xrplService: XrplService, private readonly utilsService: UtilsService, private readonly cdr: ChangeDetectorRef, private readonly storageService: StorageService, private readonly xrplTransactions: XrplTransactionService, private readonly renderUiComponentsService: RenderUiComponentsService, private readonly clickToCopyService: ClickToCopyService) {}

     ngOnInit() {
          this.environment = this.xrplService.getNet().environment;
     }

     ngAfterViewInit() {
          setTimeout(() => {
               this.textareas.forEach(ta => this.autoResize(ta.nativeElement));
          });
     }

     ngAfterViewChecked() {
          if (this.needsHighlight) {
               if (this.paymentTx && this.paymentJson) {
                    const json = JSON.stringify(this.paymentTx, null, 2);
                    this.paymentJson.nativeElement.textContent = json;
                    Prism.highlightElement(this.paymentJson.nativeElement);
               }

               if (this.txResult && this.txResultJson) {
                    const json = JSON.stringify(this.txResult, null, 2);
                    this.txResultJson.nativeElement.textContent = json;
                    Prism.highlightElement(this.txResultJson.nativeElement);
               }

               this.needsHighlight = false;
          }
     }

     // Wallet selection
     selectWallet(index: number) {
          this.selectedWalletIndex = index;
          this.onAccountChange();
     }

     async onWalletListChange(event: any[]) {
          this.wallets = event;
          if (this.wallets.length > 0 && this.selectedWalletIndex >= this.wallets.length) {
               this.selectedWalletIndex = 0;
               await this.refreshBalance(0);
          } else {
               const client = await this.xrplService.getClient();

               const now = Date.now();
               await Promise.all(
                    this.wallets.map(async (wallet, index) => {
                         try {
                              // --- skip wallets updated recently ---
                              if (wallet.lastUpdated && now - wallet.lastUpdated < AppConstants.SKIP_THRESHOLD_MS) {
                                   console.log(`⏭️ Skipping ${wallet.name} (updated ${Math.round((now - wallet.lastUpdated) / 1000)}s ago)`);
                                   return;
                              }

                              // --- skip inactive wallets (optional) ---
                              if (wallet.isInactive) {
                                   console.log(`💤 Skipping inactive wallet ${wallet.name}`);
                                   return;
                              }

                              // --- fetch and update ---
                              console.log(`🔄 Updating ${wallet.name}...`);
                              const accountInfo = await this.xrplService.getAccountInfo(client, wallet.address, 'validated', '');
                              await this.updateXrpBalance(client, accountInfo, wallet, index);

                              // --- mark last update time ---
                              wallet.lastUpdated = now;
                         } catch (err) {
                              console.error(`❌ Failed to update ${wallet.name}`, err);
                         }
                    })
               );
               this.saveWallets();
               this.emitChange();
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

     // Toggle secret per wallet
     toggleSecret(index: number) {
          this.wallets[index].showSecret = !this.wallets[index].showSecret;
          this.cdr.detectChanges();
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          try {
               const client = await this.xrplService.getClient();
               // const balance = await client.getXrpBalance(wallet.address);
               // this.wallets[index].balance = balance.toString();
               // if (this.selectedWalletIndex === index) {
               //      this.currentWallet.balance = balance.toString();
               // }
               const walletAddress = wallet.classicAddress ? wallet.classicAddress : wallet.address;
               const accountInfo = await this.xrplService.getAccountInfo(client, walletAddress, 'validated', '');
               await this.updateXrpBalance(client, accountInfo, wallet, index);

               this.cdr.detectChanges();
          } catch (err) {
               this.setError('Failed to refresh balance');
          }
     }

     // Copy address
     copyAddress(address: string) {
          navigator.clipboard.writeText(address).then(() => {
               // optional toast
          });
     }

     copySeed(seed: string) {
          navigator.clipboard
               .writeText(seed)
               .then(() => {
                    // Optional: show toast
                    alert('Seed copied to clipboard!');
               })
               .catch(err => {
                    console.error('Failed to copy seed:', err);
                    alert('Failed to copy. Please select and copy manually.');
               });
     }

     // Delete wallet
     deleteWallet(index: number) {
          if (confirm('Delete this wallet? This cannot be undone.')) {
               this.wallets.splice(index, 1);
               if (this.selectedWalletIndex >= this.wallets.length) {
                    this.selectedWalletIndex = this.wallets.length - 1;
               }
               this.saveWallets();
               this.emitChange();
               this.onAccountChange();
          }
     }

     async generateNewAccount() {
          const index = this.wallets.length;
          let encryptionAlgorithm = AppConstants.ENCRYPTION.SECP256K1;
          // if (this.encryptionType) {
          // encryptionAlgorithm = AppConstants.ENCRYPTION.ED25519;
          // }
          const wallet = await this.xrplService.generateWalletFromFamilySeed(this.environment, encryptionAlgorithm);
          await this.utilsService.sleep(4000);
          console.log(`wallet`, wallet);
          this.wallets[index] = {
               ...this.wallets[index],
               address: wallet.address,
               seed: wallet.secret.familySeed || '',
               mnemonic: '',
               secretNumbers: '',
               encryptionAlgorithm: wallet.keypair.algorithm || '',
               // isIssuer: this.wallets[index].isIssuer ?? false,
          };
          this.saveWallets();
          this.emitChange();
     }

     onSubmit() {
          if (this.activeTab === 'delete') {
               this.deleteTicket();
          } else if (this.activeTab === 'create') {
               this.createTicket();
          }
          // add other tabs as needed
     }

     async onAccountChange() {
          if (this.wallets.length === 0) return;

          this.currentWallet = {
               ...this.wallets[this.selectedWalletIndex],
               balance: this.currentWallet.balance || '0',
          };

          if (this.currentWallet.address && xrpl.isValidAddress(this.currentWallet.address)) {
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
          this.cdr.detectChanges();
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
          } finally {
               this.cdr.detectChanges();
          }
     }

     async toggleUseMultiSign() {
          if (this.multiSignAddress === 'No Multi-Sign address configured for account') {
               this.multiSignSeeds = '';
          }
          this.cdr.detectChanges();
     }

     toggleTicketSequence() {
          this.cdr.detectChanges();
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
          // this.setSuccessProperties();
          // this.clearMessages();
          this.updateSpinnerMessage(``);

          try {
               this.updateSpinnerMessage('Getting Tickets ...');

               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, ticketObjects, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'ticket'), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logObjects('ticketObjects', ticketObjects);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet.seed,
                    account_info: accountInfo,
               };

               const errors = await this.validateInputs(inputs, 'getTickets');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               this.refreshUIData(wallet, accountInfo, accountObjects);

               // Defer non-critical UI updates. Let main render complete first
               setTimeout(async () => {
                    try {
                         this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                         this.clearFields(false);
                         this.updateTickets(accountObjects);
                         await this.updateXrpBalance(client, accountInfo, wallet, -1);
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

               await this.setTxOptionalFields(client, ticketCreateTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, ticketCreateTx, fee)) {
                    return this.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.showSpinnerWithDelay(this.isSimulateEnabled ? 'Simulating Ticket Creation (no funds will be moved)...' : 'Submitting Ticket Creation to Ledger...', 200);

               // STORE IT FOR DISPLAY
               this.paymentTx = ticketCreateTx;
               this.updatePaymentTx(this.paymentTx);

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

               this.txResult = response.result;
               this.updateTxResult(this.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
               }

               this.setSuccess(this.result);

               if (!this.isSimulateEnabled) {
                    this.successMessage = 'Tickets created successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    setTimeout(async () => {
                         try {
                              this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                              await this.updateXrpBalance(client, updatedAccountInfo, wallet, -1);

                              const now = Date.now();
                              await Promise.all(
                                   this.wallets.map(async (wallet, index) => {
                                        try {
                                             // --- skip wallets updated recently ---
                                             if (wallet.lastUpdated && now - wallet.lastUpdated < AppConstants.SKIP_THRESHOLD_MS) {
                                                  console.log(`⏭️ Skipping ${wallet.name} (updated ${Math.round((now - wallet.lastUpdated) / 1000)}s ago)`);
                                                  return;
                                             }

                                             // --- skip inactive wallets (optional) ---
                                             if (wallet.isInactive) {
                                                  console.log(`💤 Skipping inactive wallet ${wallet.name}`);
                                                  return;
                                             }

                                             // --- fetch and update ---
                                             console.log(`🔄 Updating ${wallet.name}...`);
                                             const accountInfo = await this.xrplService.getAccountInfo(client, wallet.address, 'validated', '');
                                             await this.updateXrpBalance(client, accountInfo, wallet, index);

                                             // --- mark last update time ---
                                             wallet.lastUpdated = now;
                                        } catch (err) {
                                             console.error(`❌ Failed to update ${wallet.name}`, err);
                                        }
                                   })
                              );
                              this.saveWallets();
                              this.emitChange();
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
          this.setSuccessProperties();
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

               const ticketExists = ticketObjects.result.account_objects.some((ticket: any) => ticket.TicketSequence === Number(this.deleteTicketSequence));
               if (!ticketExists) {
                    return this.setError(`Ticket ${this.deleteTicketSequence} does not exist for account ${wallet.classicAddress}`);
               }

               let accountSetTx: xrpl.AccountSet = {
                    TransactionType: 'AccountSet',
                    Account: wallet.classicAddress,
                    TicketSequence: Number(this.deleteTicketSequence),
                    Sequence: 0,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
                    return this.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.showSpinnerWithDelay(this.isSimulateEnabled ? 'Simulating Canceling ticket (no funds will be moved)...' : 'Submitting Cancel Ticket to Ledger...', 200);

               // STORE IT FOR DISPLAY
               this.paymentTx = accountSetTx;
               this.updatePaymentTx(this.paymentTx);

               let response: any;

               if (this.isSimulateEnabled) {
                    this.utilsService.logObjects('paymentTx', accountSetTx);
                    response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    this.utilsService.logObjects('paymentTx', accountSetTx);
                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txResult = response.result;
               this.updateTxResult(this.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
               } else {
                    this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;
               }

               this.setSuccess(this.result);

               if (!this.isSimulateEnabled) {
                    this.successMessage = 'XRP payment sent successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    setTimeout(async () => {
                         try {
                              this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                              await this.updateXrpBalance(client, updatedAccountInfo, wallet, -1);

                              const now = Date.now();
                              await Promise.all(
                                   this.wallets.map(async (wallet, index) => {
                                        try {
                                             // --- skip wallets updated recently ---
                                             if (wallet.lastUpdated && now - wallet.lastUpdated < AppConstants.SKIP_THRESHOLD_MS) {
                                                  console.log(`⏭️ Skipping ${wallet.name} (updated ${Math.round((now - wallet.lastUpdated) / 1000)}s ago)`);
                                                  return;
                                             }

                                             // --- skip inactive wallets (optional) ---
                                             if (wallet.isInactive) {
                                                  console.log(`💤 Skipping inactive wallet ${wallet.name}`);
                                                  return;
                                             }

                                             // --- fetch and update ---
                                             console.log(`🔄 Updating ${wallet.name}...`);
                                             const accountInfo = await this.xrplService.getAccountInfo(client, wallet.address, 'validated', '');
                                             await this.updateXrpBalance(client, accountInfo, wallet, index);

                                             // --- mark last update time ---
                                             wallet.lastUpdated = now;
                                        } catch (err) {
                                             console.error(`❌ Failed to update ${wallet.name}`, err);
                                        }
                                   })
                              );
                              this.saveWallets();
                              this.emitChange();
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

     private async setTxOptionalFields(client: xrpl.Client, ticketTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.selectedSingleTicket) {
               const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!ticketExists) {
                    return this.setError(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
               }
               this.utilsService.setTicketSequence(ticketTx, this.selectedSingleTicket, true);
          } else {
               if (this.multiSelectMode && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(ticketTx, accountInfo.result.account_data.Sequence, false);
               }
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

     private async updateXrpBalance(client: xrpl.Client, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet, index: number) {
          const address = wallet.classicAddress ? wallet.classicAddress : wallet.address;
          const { ownerCount, totalXrpReserves } = await this.utilsService.updateOwnerCountAndReserves(client, accountInfo, address);

          this.ownerCount = ownerCount;
          this.totalXrpReserves = totalXrpReserves;

          this.currentWallet.ownerCount = ownerCount;
          this.currentWallet.xrpReserves = totalXrpReserves;

          const balance = (await client.getXrpBalance(address)) - parseFloat(this.totalXrpReserves || '0');
          if (index != -1) {
               const wallet = this.wallets[index];
               wallet['ownerCount'] = ownerCount;
               wallet['xrpReserves'] = totalXrpReserves;
               wallet['spendableXrp'] = balance.toString();
               wallet['balance'] = balance.toString();
               this.wallets[index] = wallet;
          } else {
               if (index == -1) {
                    const walletMap = Object.fromEntries(this.wallets.map(w => [w.address, w]));
                    const wallet = walletMap[address];
                    wallet['ownerCount'] = ownerCount;
                    wallet['xrpReserves'] = totalXrpReserves;
                    wallet['spendableXrp'] = balance.toString();
                    wallet['balance'] = balance.toString();
                    this.wallets[index] = wallet;
               }
          }
          this.currentWallet.balance = balance.toString();
          this.saveWallets();
          this.emitChange();
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
               return ['No inputs provided'];
          }

          // --- Shared skip helper ---
          const shouldSkipNumericValidation = (value: string | undefined): boolean => {
               return value === undefined || value === null || value.trim() === '';
          };

          // --- Common validators ---
          const isRequired = (value: string | null | undefined, fieldName: string): string | null => {
               if (value == null || !this.utilsService.validateInput(value)) {
                    return `${fieldName} cannot be empty`;
               }
               return null;
          };

          const isValidXrpAddress = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidAddress(value)) {
                    return `${fieldName} is invalid`;
               }
               return null;
          };

          const isValidSecret = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidSecret(value)) {
                    return `${fieldName} is invalid`;
               }
               return null;
          };

          const isNotSelfPayment = (sender: string | undefined, receiver: string | undefined): string | null => {
               if (sender && receiver && sender === receiver) {
                    return `Sender and receiver cannot be the same`;
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
                         return 'Account seed or mnemonic is invalid';
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

          const isValidInvoiceId = (value: string | undefined): string | null => {
               if (value && !this.utilsService.validateInput(value)) {
                    return 'Invoice ID is invalid';
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
          // const checkDestinationTagRequirement = async (): Promise<string | null> => {
          //      if (!inputs.destination) return null; // Skip if no destination provided
          //      try {
          //           const client = await this.xrplService.getClient();
          //           const accountInfo = await this.xrplService.getAccountInfo(client, inputs.destination, 'validated', '');
          //           if (accountInfo.result.account_flags.requireDestinationTag && (!inputs.destinationTag || inputs.destinationTag.trim() === '')) {
          //                return `ERROR: Receiver requires a Destination Tag for payment`;
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
                    customValidators: [() => isValidSeed(inputs.seed), () => isValidNumber(inputs.ticketCount, 'Ticket count', 0)],
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

     private emitChange() {
          this.walletListChange.emit(this.wallets);
     }

     saveWallets() {
          this.storageService.set('wallets', JSON.stringify(this.wallets));
     }

     setTab(tab: string) {
          this.activeTab = tab;
          this.clearMessages();
          this.clearFields(true);
     }

     updatePaymentTx(tx: any) {
          this.paymentTx = tx;
          this.needsHighlight = true;
          this.cdr.detectChanges();
     }

     updateTxResult(tx: any) {
          this.txResult = tx;
          this.needsHighlight = true;
          this.cdr.detectChanges();
     }

     copyTx() {
          const json = JSON.stringify(this.paymentTx, null, 2);
          navigator.clipboard.writeText(json).then(() => {
               alert('Transaction JSON copied!');
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
               alert('Transaction JSON copied!');
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

     /** Message that is bound to the template */
     public get infoMessage(): string | null {
          if (this.activeTab === 'create') {
               return InfoMessageConstants.CREATE_TICKET_INFORMATION;
          }

          if (this.activeTab === 'delete') {
               return InfoMessageConstants.DELETE_TICKET_INFORMATION;
          }

          return null; // no message for other tabs (if you add more later)
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
          }

          this.selectedTicket = '';
          this.isTicketEnabled = false;
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
          this.txResult = null;
          this.paymentTx = null;
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
