import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ElementRef, ViewChild, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';

declare var Prism: any;

interface ValidationInputs {
     seed?: string;
     accountInfo?: any;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeySeed?: string;
     useMultiSign?: boolean;
     multiSignSeeds?: string;
     multiSignAddresses?: string;
     isTicket?: boolean;
     amount?: string;
     deleteTicketSequence?: string;
     selectedSingleTicket?: string;
     selectedTickets?: string[];
     selectedTicket?: string;
     signerQuorum?: number;
     signers?: { account: string; weight: number }[];
}

@Component({
     selector: 'app-tickets',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './tickets.component.html',
     styleUrl: './tickets.component.css',
})
export class CreateTicketsComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     private readonly injector = inject(Injector);
     public destinationSearch$ = new Subject<string>();
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;

     // Form fields
     activeTab: string = 'create';
     amountField = '';
     destinationField: string = '';
     destinationTagField = '';
     sourceTagField = '';
     invoiceIdField = '';
     memoField: string = '';
     isMemoEnabled: boolean = false;
     useMultiSign: boolean = false;
     isRegularKeyAddress: boolean = false;
     isTicket: boolean = false;
     selectedSingleTicket: string = '';
     selectedTickets: string[] = [];
     multiSelectMode: boolean = false;
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     selectedTicket: string = '';

     // Wallet state (now driven by WalletPanelComponent via service)
     currentWallet: Wallet = {} as Wallet;
     wallets: Wallet[] = [];
     hasWallets: boolean = true;
     environment = '';
     url = '';
     showDropdown: boolean = false;
     dropdownOpen: boolean = false;

     // Multi-sign & Regular Key
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
     signerQuorum: number = 0;
     regularKeyAddress: string = '';
     regularKeySeed: string = '';
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     ticketArray: string[] = [];
     masterKeyDisabled: boolean = false;

     // Dropdown
     private overlayRef: OverlayRef | null = null;
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;
     destinations: DropdownItem[] = [];
     customDestinations: { name?: string; address: string }[] = [];

     // Code preview
     private lastPaymentTx = '';
     private lastTxResult = '';
     executionTime = '';

     // Ticket Specific fields
     ticketCountField: string = '';
     deleteTicketSequence: string = '';
     checkIdField: string = '';
     walletTicketCount = 0;
     totalTickets: number = 0;

     constructor(
          private xrplService: XrplService,
          private utilsService: UtilsService,
          private storageService: StorageService,
          private xrplTransactions: XrplTransactionService,
          private walletManagerService: WalletManagerService,
          public ui: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private validationService: ValidationService,
          private overlay: Overlay,
          private viewContainerRef: ViewContainerRef,
          private destinationDropdownService: DestinationDropdownService,
          private cdr: ChangeDetectorRef
     ) {}

     ngOnInit() {
          this.environment = this.xrplService.getNet().environment;
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url = AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET;

          // === 1. Listen to wallet list changes (wallets$.valueChanges) ===
          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               this.hasWallets = wallets.length > 0;

               // Rebuild destination dropdown whenever wallets change
               this.updateDestinations();

               // Only set currentWallet on first load if nothing is selected yet
               if (this.hasWallets && !this.currentWallet?.address) {
                    const selectedIndex = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const selectedWallet = wallets[selectedIndex];
                    if (selectedWallet) {
                         this.currentWallet = { ...selectedWallet };
                         this.getTickets();
                    }
               }
          });

          // === 2. Listen to selected wallet index changes (ONLY update if address actually changes) ===
          this.walletManagerService.selectedIndex$
               .pipe(
                    map(index => this.wallets[index]?.address),
                    distinctUntilChanged(), // ← Prevents unnecessary emissions
                    filter(address => !!address), // ← Ignore invalid/undefined
                    takeUntil(this.destroy$)
               )
               .subscribe(selectedAddress => {
                    const wallet = this.wallets.find(w => w.address === selectedAddress);
                    if (wallet && this.currentWallet.address !== wallet.address) {
                         console.log('Wallet switched via panel →', wallet.name, wallet.address);
                         this.currentWallet = { ...wallet };
                         this.getTickets(); // Refresh UI for new wallet
                    }
               });

          // === 3. Load custom destinations from storage ===
          const stored = this.storageService.get('customDestinations');
          this.customDestinations = stored ? JSON.parse(stored) : [];
          this.updateDestinations();

          // === 4. Dropdown search integration (unchanged) ===
          this.destinationSearch$.pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(query => this.destinationDropdownService.filter(query));

          this.destinationDropdownService.setItems(this.destinations);

          this.destinationDropdownService.filtered$.pipe(takeUntil(this.destroy$)).subscribe(list => {
               this.filteredDestinations = list;
               this.highlightedIndex = list.length > 0 ? 0 : -1;
               this.cdr.detectChanges();
          });

          this.destinationDropdownService.isOpen$.pipe(takeUntil(this.destroy$)).subscribe(open => {
               open ? this.openDropdownInternal() : this.closeDropdownInternal();
          });
     }

     ngAfterViewInit() {
          this.scheduleHighlight();
     }

     ngOnDestroy() {
          this.destroy$.next();
          this.destroy$.complete();
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign, this.signers, (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.ui.setError(`${error.message}`);
          }
     }

     onWalletSelected(wallet: Wallet) {
          this.currentWallet = { ...wallet };

          // This triggers refresh balance, signer list, etc.
          this.getTickets();
     }

     setTab(tab: string) {
          const previousTab = this.activeTab;
          this.activeTab = tab;

          // Only clear messages when actually changing tabs
          if (previousTab !== tab) {
               this.updateInfoMessage();
               this.ui.clearMessages();
               this.ui.clearWarning();
          }
     }

     async getTickets() {
          console.log('Entering getTickets');
          const startTime = Date.now();

          if (!this.currentWallet?.address || !xrpl.isValidAddress(this.currentWallet.address)) {
               this.ui.setError('Invalid or missing wallet address');
               return;
          }

          this.clearFields(true);
          this.ui.clearMessages();
          this.ui.clearWarning();

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const ticketObjects = this.xrplService.filterAccountObjectsByTypes(accountObjects, ['Ticket']);
               this.utilsService.logObjects('ticketObjects', ticketObjects);

               const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               this.walletTicketCount = ticketObjects.result.account_objects.length;
               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.updateInfoMessage();
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getTickets:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getTickets in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async createTicket() {
          console.log('Entering createTicket');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               amount: this.ticketCountField,
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
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('CreateTicket', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
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
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Ticket Creation (no funds will be moved)...' : 'Submitting Ticket Creation to Ledger...', 200);

               this.ui.setPaymentTx(ticketCreateTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, ticketCreateTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, ticketCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

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
                    this.ui.successMessage = 'Tickets created successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.walletTicketCount = this.utilsService.getAccountTickets(updatedAccountObjects).length;

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Ticket creation successfully!';
               }
          } catch (error: any) {
               console.error('Error in createTicket:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving createTicket in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async deleteTicket() {
          console.log('Entering deleteTicket');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               deleteTicketSequence: this.deleteTicketSequence,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);

               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('DeleteTicket', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const [ticketObjects, fee, currentLedger, serverInfo] = await Promise.all([await this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'ticket'), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logObjects('ticketObjects', ticketObjects);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               const ticketsToDelete = this.multiSelectMode ? this.selectedTickets.map(t => Number(t)) : [Number(this.deleteTicketSequence)];

               if (!ticketsToDelete.length || this.walletTicketCount === 0) {
                    this.ui.setWarning(`Ticket <code>${this.deleteTicketSequence}</code> does not exist on this account.`);
                    return;
               }

               let ticketsSuccessfullyDeleted = 0;
               const invalidTickets: number[] = [];

               for (const ticketSeq of ticketsToDelete) {
                    const ticketExists = ticketObjects.result.account_objects.some((ticket: any) => ticket.TicketSequence === ticketSeq);
                    let currentLedger = await this.xrplService.getLastLedgerIndex(client);

                    if (!ticketExists) {
                         console.warn(`Ticket ${ticketSeq} does not exist for account ${wallet.classicAddress}`);
                         invalidTickets.push(ticketSeq);
                         // this.ui.setWarning(`Ticket <code>${ticketSeq}</code> does not exist on this account.`);
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

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? `Simulating Ticket Delete ${ticketSeq}...` : `Submitting Ticket Delete for ticket ${ticketSeq}...`, 200);

                    this.ui.setPaymentTx(accountSetTx);
                    this.updatePaymentTx();

                    let response: any;
                    if (this.ui.isSimulateEnabled) {
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

                    // this.utilsService.logObjects('response', response);
                    // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    this.ui.setTxResult(response.result);
                    this.updateTxResult();

                    this.utilsService.logObjects('response', response);
                    const isSuccess = this.utilsService.isTxSuccessful(response);
                    if (!isSuccess) {
                         console.warn(`Ticket ${ticketSeq} deletion failed:`, response);
                    } else {
                         ticketsSuccessfullyDeleted += 1;
                         const hash = response.result.hash ?? response.result.tx_json.hash;
                         this.ui.txHashes.push(hash); // ← push to array
                         console.log(`Ticket ${ticketSeq} deleted successfully. TxHash:`, response.result.hash ? response.result.hash : response.result.tx_json.hash);
                    }
               }

               this.ui.setSuccess(this.ui.result);

               // Show one warning that contains *all* missing tickets
               if (invalidTickets.length) {
                    const listHtml = invalidTickets.map(n => `<code>${n}</code>`).join(', ');
                    const plural = invalidTickets.length > 1 ? 's' : '';
                    this.ui.setWarning(`Ticket${plural} ${listHtml} do${plural ? '' : 'es'} not exist on this account.`);
               } else {
                    this.ui.clearWarning(); // nothing missing → hide the panel
               }

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = `${ticketsSuccessfullyDeleted} Ticket(s) deleted successfully!`;

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
                    this.walletTicketCount = this.utilsService.getAccountTickets(updatedAccountObjects).length;

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Ticket creation successfully!';
               }
          } catch (error: any) {
               console.error('Error in deleteTicket:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving deleteTicket in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     private async setTxOptionalFields(client: xrpl.Client, ticketTx: any, wallet: xrpl.Wallet, ticketSeq: any) {
          if (this.selectedSingleTicket) {
               const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!exists) throw new Error(`Ticket ${this.selectedSingleTicket} not found`);
               this.utilsService.setTicketSequence(ticketTx, this.selectedSingleTicket, true);
          }

          if (this.memoField) this.utilsService.setMemoField(ticketTx, this.memoField);
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);
          if (this.multiSelectMode) {
               this.selectedSingleTicket = this.utilsService.cleanUpMultiSelection(this.selectedTickets, this.ticketArray);
          } else {
               this.selectedSingleTicket = this.utilsService.cleanUpSingleSelection(this.selectedTickets, this.ticketArray);
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

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets, this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet = { ...newCurrent };
          });
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
          this.destinationDropdownService.setItems(this.destinations);
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet.encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet.seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     private updateInfoMessage() {
          const walletName = this.currentWallet.name || 'selected';
          const count = this.walletTicketCount;

          const label = this.activeTab === 'create' ? 'available Tickets for use.' : 'Tickets that can be deleted.';

          this.ui.setInfoMessage(`<code>${walletName}</code> wallet has <strong>${count}</strong> ${label}`);
     }

     clearFields(all = true) {
          if (all) {
               this.ui.isSimulateEnabled = false;
               this.ui.clearMessages();
               this.ui.clearWarning();
          }

          this.useMultiSign = false;
          this.deleteTicketSequence = '';
          this.isRegularKeyAddress = false;
          this.selectedTicket = '';
          this.selectedSingleTicket = '';
          this.isTicket = false;
          this.selectedTicket = '';
          this.ticketCountField = '';
          this.isMemoEnabled = false;
          this.memoField = '';
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

     // Dropdown controls
     openDropdown() {
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.filter(this.destinationField || '');
          this.destinationDropdownService.openDropdown();
     }

     closeDropdown() {
          this.destinationDropdownService.closeDropdown();
     }

     toggleDropdown() {
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.toggleDropdown();
     }

     onDestinationInput() {
          this.destinationDropdownService.filter(this.destinationField || '');
          this.destinationDropdownService.openDropdown();
     }

     selectDestination(address: string) {
          if (address === this.currentWallet.address) return;
          const dest = this.destinations.find(d => d.address === address);
          this.destinationField = dest ? this.destinationDropdownService.formatDisplay(dest) : `${address.slice(0, 6)}...${address.slice(-6)}`;
          this.closeDropdown();
     }

     private openDropdownInternal() {
          if (this.overlayRef?.hasAttached()) return;

          const strategy = this.overlay
               .position()
               .flexibleConnectedTo(this.dropdownOrigin)
               .withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 }]);

          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy: strategy,
               scrollStrategy: this.overlay.scrollStrategies.close(),
          });

          this.overlayRef.attach(new TemplatePortal(this.dropdownTemplate, this.viewContainerRef));
          this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());
     }

     private closeDropdownInternal() {
          this.overlayRef?.detach();
          this.overlayRef = null;
     }

     updatePaymentTx() {
          this.scheduleHighlight();
     }

     updateTxResult() {
          this.scheduleHighlight();
     }

     private scheduleHighlight() {
          afterRenderEffect(
               () => {
                    const paymentStr = JSON.stringify(this.ui.paymentTx, null, 2);
                    const resultStr = JSON.stringify(this.ui.txResult, null, 2);

                    if (this.paymentJson?.nativeElement && paymentStr !== this.lastPaymentTx) {
                         this.paymentJson.nativeElement.textContent = paymentStr;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                         this.lastPaymentTx = paymentStr;
                    }

                    if (this.txResultJson?.nativeElement && resultStr !== this.lastTxResult) {
                         this.txResultJson.nativeElement.textContent = resultStr;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                         this.lastTxResult = resultStr;
                    }

                    this.cdr.detectChanges();
               },
               { injector: this.injector }
          );
     }
}
