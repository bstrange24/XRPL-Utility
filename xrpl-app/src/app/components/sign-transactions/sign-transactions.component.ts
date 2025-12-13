import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ElementRef, ViewChild, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, computed, signal } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import SignerList from 'xrpl/dist/npm/models/ledger/SignerList';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DestinationDropdownService, SelectItem } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { SignTransactionUtilService } from '../../services/sign-transactions-util/sign-transaction-util.service';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
declare var Prism: any;

@Component({
     selector: 'app-sign-transactions',
     standalone: true,
     imports: [CommonModule, FormsModule, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule, MatAutocompleteModule, MatTableModule, MatSortModule, MatPaginatorModule, MatInputModule, MatFormFieldModule, WalletPanelComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './sign-transactions.component.html',
     styleUrl: './sign-transactions.component.css',
})
export class SignTransactionsComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     private readonly injector = inject(Injector);
     public destinationSearch$ = new Subject<string>();
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;

     // Form fields
     activeTab: string = 'getAccountDetails';
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

     // Sign Tx Specific
     executionTime = '';
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     @ViewChild('resultFieldError') resultFieldError!: ElementRef<HTMLDivElement>;
     @ViewChild('txJsonPre') txJsonPre!: ElementRef<HTMLPreElement>;
     @ViewChild('txJsonCode') txJsonCode!: ElementRef<HTMLElement>;
     @ViewChild('signedPre') signedPre!: ElementRef<HTMLPreElement>;
     @ViewChild('signedCode') signedCode!: ElementRef<HTMLElement>;
     txJson: string = ''; // Dedicated for transaction JSON (untouched on error)
     outputField: string = ''; // Dedicated for hash/blob in "Signed" field (empty on error)
     ticketSequence: string = '';
     isTicketEnabled: boolean = false;
     defaultTicketSequence: string | null = null; // store defaulted ticket
     ownerCount: string = '';
     totalXrpReserves: string = '';
     isSimulateEnabled: boolean = false;
     // selectedTransaction: string | null = null;
     selectedTransaction = signal<string | null>(null);
     editedTxJson: any = {};
     selectedWalletIndex: number = 0;
     multiSignedTxBlob: string = ''; // Final combined tx blob
     availableSigners: any[] = [];
     requiredQuorum: number = 0;
     selectedQuorum: number = 0;
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     userEmail: string = '';
     flagResults: any;
     private highlightTimeout: any;
     issuers: { name?: string; address: string }[] = [];
     buttonLoading = {
          getJson: false,
          signed: false,
          submit: false,
          multiSign: false,
     };

     constructor(
          private xrplService: XrplService,
          private utilsService: UtilsService,
          private storageService: StorageService,
          private xrplTransactions: XrplTransactionService,
          private walletManagerService: WalletManagerService,
          private signTransactionUtilService: SignTransactionUtilService,
          public txUiService: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private validationService: ValidationService,
          private overlay: Overlay,
          private viewContainerRef: ViewContainerRef,
          private destinationDropdownService: DestinationDropdownService,
          private cdr: ChangeDetectorRef
     ) {}

     // Transaction Type Dropdown Items
     transactionTypeItems = computed(() => {
          const current = this.selectedTransaction();

          return [
               // Basic
               { id: 'batch', display: 'Batch', group: 'Basic' },
               { id: 'sendXrp', display: 'Send XRP', group: 'Basic' },

               // Trustline
               { id: 'setTrustline', display: 'Set Trustline', group: 'Trustline' },
               { id: 'removeTrustline', display: 'Remove Trustline', group: 'Trustline' },
               { id: 'issueCurrency', display: 'Issue Currency', group: 'Trustline' },
               { id: 'clawback', display: 'Clawback Currency', group: 'Trustline' },

               // Account Flags
               { id: 'accountFlagSet', display: 'Account Flag Set', group: 'Account Flags' },
               { id: 'accountFlagClear', display: 'Account Flag Clear', group: 'Account Flags' },

               // Escrow
               { id: 'createTimeEscrow', display: 'Create Time Escrow', group: 'Escrow' },
               { id: 'finishTimeEscrow', display: 'Finish Time Escrow', group: 'Escrow' },
               { id: 'createConditionEscrow', display: 'Create Condition Escrow', group: 'Escrow' },
               { id: 'finishConditionEscrow', display: 'Finish Condition Escrow', group: 'Escrow' },
               { id: 'cancelEscrow', display: 'Cancel Escrow', group: 'Escrow' },

               // Token Escrow
               { id: 'createTimeEscrowToken', display: 'Create Token Time Escrow', group: 'Token Escrow' },
               { id: 'finishTimeEscrowToken', display: 'Finish Token Time Escrow', group: 'Token Escrow' },
               { id: 'createConditionEscrowToken', display: 'Create Token Condition Escrow', group: 'Token Escrow' },
               { id: 'finishConditionEscrowToken', display: 'Finish Token Condition Escrow', group: 'Token Escrow' },

               // Check
               { id: 'createCheck', display: 'Check Create', group: 'Check' },
               { id: 'cashCheck', display: 'Check Cash', group: 'Check' },
               { id: 'cancelCheck', display: 'Check Cancel', group: 'Check' },

               // Token Check
               { id: 'createCheckToken', display: 'Check Token Create', group: 'Token Check' },
               { id: 'cashCheckToken', display: 'Check Token Cash', group: 'Token Check' },

               // Payment Channel
               { id: 'createPaymentChannel', display: 'Create Payment Channel', group: 'Payment Channel' },
               { id: 'fundPaymentChannel', display: 'Fund Payment Channel', group: 'Payment Channel' },
               { id: 'claimPaymentChannel', display: 'Claim Payment Channel', group: 'Payment Channel' },
               { id: 'closePaymentChannel', display: 'Close Payment Channel', group: 'Payment Channel' },

               // MPT
               { id: 'createMPT', display: 'MPT Create', group: 'MPT' },
               { id: 'authorizeMPT', display: 'Authorize MPT', group: 'MPT' },
               { id: 'unauthorizeMPT', display: 'Unauthorize MPT', group: 'MPT' },
               { id: 'sendMPT', display: 'Send MPT', group: 'MPT' },
               { id: 'lockMPT', display: 'Lock MPT', group: 'MPT' },
               { id: 'unlockMPT', display: 'Unlock MPT', group: 'MPT' },
               { id: 'destroyMPT', display: 'Destroy MPT', group: 'MPT' },
          ].map(item => ({
               id: item.id,
               display: item.display,
               group: item.group,
               // secondary: item.group,
               secondary: undefined,
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: item.id === current,
               showSecondaryInInput: true,
          }));
     });

     selectedTransactionItem = computed(() => {
          const id = this.selectedTransaction();
          if (!id) return null;
          return this.transactionTypeItems().find(i => i.id === id) || null;
     });

     onTransactionSelected(item: SelectItem | null) {
          const tx = item?.id || '';
          this.selectedTransaction.set(tx);
          this.onTransactionChange(); // keep your existing logic
     }

     ngOnInit() {
          this.environment = this.xrplService.getNet().environment;
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url = AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET;

          // === 1. Listen to wallet list changes (wallets$.valueChanges) ===
          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               this.hasWallets = wallets.length > 0;

               // Only set currentWallet on first load if nothing is selected yet
               if (this.hasWallets && !this.currentWallet?.address) {
                    const selectedIndex = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const selectedWallet = wallets[selectedIndex];
                    if (selectedWallet) {
                         this.currentWallet = { ...selectedWallet };
                         this.getAccountDetails();
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
                         this.getAccountDetails(); // Refresh UI for new wallet
                    }
               });

          // === 3. Load custom destinations from storage ===
          const stored = this.storageService.get('customDestinations');
          this.customDestinations = stored ? JSON.parse(stored) : [];

          this.selectedTransaction.set('sendXrp');
          this.clearMessages();
          this.enableTransaction();
          this.cdr.detectChanges();
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

     async setTab(tab: string) {
          this.activeTab = tab;
          this.clearMessages();
          this.clearFields(true);
     }

     get isAnyButtonLoading(): boolean {
          return Object.values(this.buttonLoading).some(v => v === true);
     }

     onTransactionChange(): void {
          this.txJson = '';
          this.outputField = '';
          this.txUiService.isError = false;
          this.txUiService.errorMessage = null;
          this.clearMessages();
          // Enable the newly selected transaction (fills the JSON pane)
          this.enableTransaction();
     }

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign, this.signers, (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.txUiService.setError(`${error.message}`);
          }
     }

     async toggleUseMultiSign() {
          if (this.multiSignAddress === 'No Multi-Sign address configured for account') {
               this.multiSignSeeds = '';
          }
     }

     onWalletSelected(wallet: Wallet) {
          this.currentWallet = { ...wallet };

          // Prevent setting self as the destination after switching wallet
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address || this.destinationField;
          if (currentDest === wallet.address) {
               this.destinationField = '';
          }

          // This triggers refresh balance, signer list, etc.
          this.getAccountDetails();
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

          if (!this.currentWallet?.address || !xrpl.isValidAddress(this.currentWallet.address)) {
               this.txUiService.setError('Invalid or missing wallet address');
               return;
          }

          this.txUiService.clearMessages();
          this.txUiService.clearWarning();

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               this.getSignerAccountsList(accountObjects);

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.getTransactionJSON();

               this.cdr.detectChanges();
               this.enableTransaction();
          } catch (error: any) {
               console.error('Error in getAccountDetails:', error);
               this.txUiService.setError(error.message || 'Unknown error');
          } finally {
               this.txUiService.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getAccountDetails in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async enableTransaction() {
          const client = await this.xrplService.getClient();
          const wallet = await this.getWallet();

          switch (this.selectedTransaction()) {
               case 'batch':
                    this.txJson = await this.signTransactionUtilService.createBatchpRequestText({ client, wallet });
                    this.setTxJson(this.txJson);
                    break;
               case 'sendXrp':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'sendXrp',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'setTrustline':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'setTrustline',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'removeTrustline':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'removeTrustline',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'issueCurrency':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'issueCurrency',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'clawback':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'clawback',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'accountFlagSet':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'accountFlagSet',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'accountFlagClear':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'accountFlagClear',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'createTimeEscrow':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'createTimeEscrow',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'finishTimeEscrow':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'finishTimeEscrow',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'createTimeEscrowToken':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'createTimeEscrowToken',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'finishTimeEscrowToken':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'finishTimeEscrowToken',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'createConditionEscrow':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'createConditionEscrow',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'finishConditionEscrow':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'finishConditionEscrow',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'createConditionEscrowToken':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'createConditionEscrowToken',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'finishConditionEscrowToken':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'finishConditionEscrowToken',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'cancelEscrow':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'cancelEscrow',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'createCheck':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'createCheck',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'createCheckToken':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'createCheckToken',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'cashCheck':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'cashCheck',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'cashCheckToken':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'cashCheckToken',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'cancelCheck':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'cancelCheck',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'createMPT':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'createMPT',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'authorizeMPT':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'authorizeMPT',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'unauthorizeMPT':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'unauthorizeMPT',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'sendMPT':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'sendMPT',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'lockMPT':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'lockMPT',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'unlockMPT':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'unlockMPT',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               case 'destroyMPT':
                    this.txJson = await this.signTransactionUtilService.buildTransactionText({
                         client,
                         wallet,
                         selectedTransaction: 'destroyMPT',
                         isTicketEnabled: this.isTicket,
                         isMemoEnable: this.isMemoEnabled,
                         ticketSequence: this.selectedSingleTicket,
                    });
                    this.setTxJson(this.txJson);
                    break;
               default:
                    console.warn(`Unknown transaction type: ${this.selectedTransaction()}`);
          }

          this.cdr.markForCheck();
     }

     async unsignedTransaction() {
          console.log('Entering unsignedTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          try {
               this.txUiService.errorMessage = ''; // Clear any prior error

               if (!this.txJson.trim()) return this.txUiService.setError('Transaction cannot be empty');

               const editedString = this.txJson.trim();
               let editedJson = JSON.parse(editedString);
               let cleanedJson = this.cleanTx(editedJson);
               console.log('Edited JSON:', editedJson);
               console.log('Cleaned JSON:', cleanedJson);

               const serialized = xrpl.encode(cleanedJson);
               const unsignedHash = xrpl.hashes.hashTx(serialized);
               console.log('Unsigned Transaction hash (hex):', unsignedHash);

               this.outputField = unsignedHash; // Set property
               this.txUiService.isError = false;
          } catch (error: any) {
               console.error('Error in unsignedTransaction:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving unsignedTransaction in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async signedTransaction() {
          console.log('Entering signedTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.txUiService.updateSpinnerMessage(``);
          this.buttonLoading.signed = true;

          let txToSign: any;

          try {
               const wallet = await this.getWallet();

               if (!this.txJson.trim()) {
                    return this.txUiService.setError('Transaction cannot be empty');
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
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.buttonLoading.signed = false;
               this.txUiService.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving signedTransaction in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async submitTransaction() {
          console.log('Entering submitTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.txUiService.updateSpinnerMessage(``);
          this.buttonLoading.submit = true;

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               if (!this.outputField.trim()) {
                    return this.txUiService.setError('Signed tx blob can not be empty');
               }

               const signedTxBlob = this.outputField.trim();

               const txType = this.getTransactionLabel(this.selectedTransaction() ?? '');
               this.txUiService.showSpinnerWithDelay(this.isSimulateEnabled ? `Simulating ${txType} (no funds will be moved)...` : `Submitting ${txType} to Ledger...`, 200);

               // this.txUiService.setPaymentTx(paymentTx);
               // this.updatePaymentTx();

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

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txUiService.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.txUiService.setError(userMessage);
               } else {
                    this.txUiService.setSuccess(this.txUiService.result);
               }

               this.txUiService.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.txUiService.isSimulateEnabled()) {
                    this.txUiService.successMessage = 'Transaction completed successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    // Reset selected checkboxes
                    this.resetSigners();
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.txUiService.successMessage = 'Simulated transaction successfully!';
               }
          } catch (error: any) {
               console.error('Error in submitTransaction:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner.set(false);
               this.buttonLoading.submit = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving submitTransaction in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async submitMultiSignedTransaction() {
          console.log('Entering submitMultiSignedTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          try {
               if (!this.outputField.trim()) {
                    return this.txUiService.setError('Signed tx blob can not be empty');
               }

               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const multiSignedTxBlob = this.outputField.trim();
               console.log('multiSignedTxBlob', multiSignedTxBlob);

               const txType = this.getTransactionLabel(this.selectedTransaction() ?? '');
               this.txUiService.showSpinnerWithDelay(this.isSimulateEnabled ? `Simulating ${txType} (no funds will be moved)...` : `Submitting ${txType} to Ledger...`, 200);

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

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txUiService.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.txUiService.setError(userMessage);
               } else {
                    this.txUiService.setSuccess(this.txUiService.result);
               }

               this.txUiService.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

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
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving submitMultiSignedTransaction in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async signForMultiSign() {
          console.log('Entering signForMultiSign');
          const startTime = Date.now();
          this.clearMessages();
          this.txUiService.updateSpinnerMessage(``);
          this.buttonLoading.multiSign = true;

          let txToSign: any;

          try {
               if (!this.txJson.trim()) {
                    return this.txUiService.setError('Transaction cannot be empty');
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
                    return this.txUiService.setError('Select at least one signer.');
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
               this.txUiService.setError(`Error: ${error.message || error}`);
          } finally {
               this.txUiService.spinner.set(false);
               this.buttonLoading.multiSign = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving signForMultiSign in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
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

          if (typeof editedJson.Amount === 'string' && this.selectedTransaction() === 'sendXrp') {
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

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
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

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);
          if (this.multiSelectMode) {
               this.selectedSingleTicket = this.utilsService.cleanUpMultiSelection(this.selectedTickets, this.ticketArray);
          } else {
               this.selectedSingleTicket = this.utilsService.cleanUpSingleSelection(this.selectedTickets, this.ticketArray);
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

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet.encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet.seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
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

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Check ID copied!');
          });
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields(all = true) {
          if (all) {
          }
          this.isSimulateEnabled = false;
          this.selectedSingleTicket = '';
          this.isTicket = false;
          this.useMultiSign = false;
          this.resetSigners();
          this.cdr.markForCheck();
     }

     private clearMessages() {
          this.txUiService.result = '';
          this.txUiService.isError = false;
          this.txUiService.isSuccess = false;
          this.txUiService.successMessage = '';
          this.txUiService.errorMessage = '';
          this.cdr.detectChanges();
     }

     resetSigners() {
          this.availableSigners.forEach(w => (w.isSelectedSigner = false));
          this.selectedQuorum = 0;
     }

     getTransactionLabel(key: string): string {
          return (AppConstants.SIGN_TRANSACTION_LABEL_MAP as Record<string, string>)[key] || key;
     }

     updatePaymentTx() {
          this.scheduleHighlight();
     }

     updateTxResult() {
          this.scheduleHighlight();
     }

     private scheduleHighlight() {
          // Use the captured injector to run afterRenderEffect  safely
          afterRenderEffect(
               () => {
                    if (this.txUiService.paymentTx && this.paymentJson?.nativeElement) {
                         const json = JSON.stringify(this.txUiService.paymentTx, null, 2);
                         this.paymentJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                    }
                    if (this.txUiService.txResult && this.txResultJson?.nativeElement) {
                         const json = JSON.stringify(this.txUiService.txResult, null, 2);
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
                    if (this.txUiService.isError && this.txUiService.errorMessage && this.txJsonCode?.nativeElement) {
                         this.txJsonCode.nativeElement.textContent = `ERROR: ${this.txUiService.errorMessage}`;
                         // optional: give it a red background
                         this.txJsonPre.nativeElement.classList.add('error');
                    } else {
                         this.txJsonPre.nativeElement.classList.remove('error');
                    }
               },

               { injector: this.injector }
          );
     }
}
