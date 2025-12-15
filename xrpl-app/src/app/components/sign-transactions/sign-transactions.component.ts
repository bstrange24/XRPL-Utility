import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ElementRef, ViewChild, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, computed, signal, DestroyRef } from '@angular/core';
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
import { OverlayModule, Overlay } from '@angular/cdk/overlay';
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
import { DestinationDropdownService, SelectItem } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { Subject } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { SignTransactionUtilService } from '../../services/sign-transactions-util/sign-transaction-util.service';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
declare var Prism: any;

@Component({
     selector: 'app-sign-transactions',
     standalone: true,
     imports: [CommonModule, FormsModule, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule, MatAutocompleteModule, MatTableModule, MatSortModule, MatPaginatorModule, MatInputModule, MatFormFieldModule, WalletPanelComponent, SelectSearchDropdownComponent, TransactionPreviewComponent, TransactionOptionsComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './sign-transactions.component.html',
     styleUrl: './sign-transactions.component.css',
})
export class SignTransactionsComponent extends PerformanceBaseComponent implements OnInit, AfterViewInit {
     private readonly injector = inject(Injector);
     public destinationSearch$ = new Subject<string>();
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('resultFieldError') resultFieldError!: ElementRef<HTMLDivElement>;
     @ViewChild('txJsonPre') txJsonPre!: ElementRef<HTMLPreElement>;
     @ViewChild('txJsonCode') txJsonCode!: ElementRef<HTMLElement>;
     @ViewChild('signedPre') signedPre!: ElementRef<HTMLPreElement>;
     @ViewChild('signedCode') signedCode!: ElementRef<HTMLElement>;

     private readonly destroyRef = inject(DestroyRef);
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly dropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactions = inject(XrplTransactionService);
     public readonly signTransactionUtilService = inject(SignTransactionUtilService);
     public readonly viewContainerRef = inject(ViewContainerRef);
     public readonly overlay = inject(Overlay);
     public readonly cdr = inject(ChangeDetectorRef);

     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     activeTab = signal<'getAccountDetails'>('getAccountDetails');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     amountField = signal<string>('');
     destinationField = signal<string>('');
     destinationTagField = signal<string>('');
     sourceTagField = signal<string>('');
     invoiceIdField = signal<string>('');
     memoField = signal<string>('');
     isMemoEnabled = signal(false);
     useMultiSign = signal(false);
     isRegularKeyAddress = signal(false);
     isTicket = signal(false);
     selectedSingleTicket = signal<string>('');
     selectedTickets = signal<string[]>([]);
     multiSelectMode = signal(false);
     selectedTicket = signal<string>('');
     txJson = '';
     outputField = signal<string>('');
     selectedTransaction = signal<string | null>(null);
     editedTxJson = signal<any>({});
     multiSignedTxBlob = signal<string>(''); // Final combined tx blob
     availableSigners = signal<any[]>([]);
     requiredQuorum = signal<number>(0);
     selectedQuorum = signal<number>(0);
     flagResults = signal<any>('');
     accountInfo = signal<any>(null);
     private highlightTimeout = signal<any>('');
     buttonLoading = signal({
          getJson: false,
          signed: false,
          submit: false,
          multiSign: false,
     });

     selectedDestinationItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;
          return this.destinationItems().find(d => d.id === addr) || null;
     });

     destinationItems = computed(() => {
          const currentAddr = this.currentWallet().address;

          return this.destinations().map(d => ({
               id: d.address,
               display: d.name || 'Unknown Wallet',
               secondary: d.address,
               isCurrentAccount: d.address === currentAddr,
          }));
     });

     destinations = computed(() => [
          ...this.wallets().map((w: DropdownItem) => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
          })),
          ...this.customDestinations(),
     ]);

     destinationDisplay = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return this.destinationSearchQuery(); // while typing → show typed text

          const dest = this.destinations().find(d => d.address === addr);
          if (!dest) return addr;

          return this.dropdownService.formatDisplay(dest);
     });

     filteredDestinations = computed(() => {
          const q = this.destinationSearchQuery().trim().toLowerCase();
          const list = this.destinations();

          if (q === '') {
               return list;
          }

          return this.destinations()
               .filter(d => d.address !== this.currentWallet().address)
               .filter(d => d.address.toLowerCase().includes(q) || (d.name ?? '').toLowerCase().includes(q));
     });

     infoData = computed(() => {
          return null;
     });

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

     hasWallets = computed(() => this.wallets().length > 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit() {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.selectedTransaction.set('sendXrp');
          this.clearMessages();
          // this.enableTransaction();
          this.generateTransactionJson();
          this.cdr.detectChanges();
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.(); // or just clear messages when appropriate
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
               }
          });

          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) this.selectWallet(wallet);
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearAllOptionsAndMessages();
                    this.clearInputFields();
                    await this.getAccountDetails(false);
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          // Prevent self as destination
          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     ngAfterViewInit() {
          this.scheduleHighlight();
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     async setTab(tab: 'getAccountDetails'): Promise<void> {
          this.activeTab.set(tab);
          this.clearMessages();
          this.clearFields(true);
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     get isAnyButtonLoading(): boolean {
          return Object.values(this.buttonLoading).some(v => v === true);
     }

     onTransactionChange(): void {
          this.txJson = '';
          this.outputField.set('');
          this.txUiService.isError = false;
          this.txUiService.errorMessage = null;
          this.clearMessages();
          this.generateTransactionJson();
     }

     setMemoField() {
          this.generateTransactionJson();
     }

     setTicketField() {
          this.generateTransactionJson();
     }

     getTransactionJSON() {
          this.buttonLoading.update(l => ({ ...l, getJson: true }));
          this.onTransactionChange();
          this.buttonLoading.update(l => ({ ...l, getJson: false }));
     }

     get currentQuorumSelected(): number {
          return this.availableSigners()
               .filter(w => w.isSelectedSigner)
               .reduce((sum: any, w: { quorum: any }) => sum + (w.quorum || 0), 0);
     }

     updateSelectedQuorum() {
          // Sum the weights (SignerWeight) of all checked signers
          this.selectedQuorum = this.availableSigners()
               .filter(w => w.isSelectedSigner)
               .reduce((sum: any, w: { quorum: any }) => sum + (w.quorum || 0), 0);
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.withPerf('getAccountDetails', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.currentWallet()?.address || !xrpl.isValidAddress(this.currentWallet().address)) {
                    this.txUiService.setError('Invalid or missing wallet address');
                    return;
               }

               this.txUiService.clearMessages();
               this.txUiService.clearWarning();

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    // Just set the signal — infoMessage() recomputes automatically!
                    this.accountInfo.set(accountInfo);
                    this.refreshUiState(wallet, accountInfo, accountObjects);
                    this.clearFields(false);
                    this.getTransactionJSON();
                    this.cdr.detectChanges();
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async generateTransactionJson() {
          this.buttonLoading.update(l => ({ ...l, getJson: true }));
          this.txUiService.clearAllOptionsAndMessages();

          try {
               const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

               const jsonStr = await this.signTransactionUtilService.buildTransactionText({
                    client,
                    wallet,
                    selectedTransaction: this.selectedTransaction() as any,
                    isTicketEnabled: this.isTicket(),
                    isMemoEnable: this.isMemoEnabled(),
                    ticketSequence: this.selectedSingleTicket(),
               });

               this.txJson = jsonStr;
               this.scheduleHighlight();
          } catch (err: any) {
               if (err.message === 'No wallets exist. Create a new wallet before continuing.') {
                    this.txUiService.setWarning(err.message);
                    this.txUiService.setError('');
                    return;
               }
               this.txUiService.setError(err.message);
          } finally {
               this.buttonLoading.update(l => ({ ...l, getJson: false }));
          }
     }

     async unsignedTransaction() {
          await this.withPerf('unsignedTransaction', async () => {
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

                    this.outputField.set(unsignedHash); // Set property
                    this.txUiService.isError = false;
               } catch (error: any) {
                    console.error('Error in unsignedTransaction:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async signedTransaction() {
          await this.withPerf('signedTransaction', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.clearMessages();
               this.txUiService.updateSpinnerMessage(``);
               this.buttonLoading.update(l => ({ ...l, signed: true }));

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
                    this.outputField.set(signed.tx_blob); // Set property
                    this.setSigned(this.outputField());

                    console.log('Signed TX blob:', signed.tx_blob);
                    console.log('Transaction ID (hash):', signed.hash);

                    // decode blob to JSON
                    const decodedTx = xrpl.decode(signed.tx_blob);
                    console.log(decodedTx);
               } catch (error: any) {
                    console.error('Error in signedTransaction:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.buttonLoading.update(l => ({ ...l, signed: false }));
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async submitTransaction() {
          await this.withPerf('submitTransaction', async () => {
               this.clearMessages();
               this.txUiService.updateSpinnerMessage(``);
               this.buttonLoading.update(l => ({ ...l, submit: true }));

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    if (!this.outputField().trim()) {
                         return this.txUiService.setError('Signed tx blob can not be empty');
                    }

                    const signedTxBlob = this.outputField().trim();

                    const txType = this.getTransactionLabel(this.selectedTransaction() ?? '');
                    this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? `Simulating ${txType} (no funds will be moved)...` : `Submitting ${txType} to Ledger...`, 200);

                    let response: any;

                    if (this.txUiService.isSimulateEnabled()) {
                         const txToSign = this.cleanTx(JSON.parse(this.txJson.trim()));
                         console.log('Pre txToSign', txToSign);
                         const currentLedger = await client.getLedgerIndex();
                         console.log('currentLedger: ', currentLedger);
                         txToSign.LastLedgerSequence = currentLedger + 5;
                         response = await this.xrplTransactions.simulateTransaction(client, txToSign);
                    } else {
                         response = await client.submitAndWait(signedTxBlob);
                    }

                    // this.txUiService.addTxResultSignal(response.result);
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

                    this.txUiService.addTxHashSignal(response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    if (!this.txUiService.isSimulateEnabled()) {
                         this.txUiService.successMessage = 'Transaction completed successfully!';

                         await this.refreshAfterTx(client, wallet, '', true);
                         this.resetSigners();
                         this.clearFields(false);
                         this.cdr.detectChanges();
                    } else {
                         this.txUiService.successMessage = 'Simulated transaction successfully!';
                    }
               } catch (error: any) {
                    console.error('Error in submitTransaction:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.buttonLoading.update(l => ({ ...l, submit: false }));
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async submitMultiSignedTransaction() {
          console.log('Entering submitMultiSignedTransaction');
          const startTime = Date.now();
          this.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          try {
               if (!this.outputField().trim()) {
                    return this.txUiService.setError('Signed tx blob can not be empty');
               }

               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const multiSignedTxBlob = this.outputField().trim();
               console.log('multiSignedTxBlob', multiSignedTxBlob);

               const txType = this.getTransactionLabel(this.selectedTransaction() ?? '');
               this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? `Simulating ${txType} (no funds will be moved)...` : `Submitting ${txType} to Ledger...`, 200);

               let response: any;

               if (this.txUiService.isSimulateEnabled()) {
                    const txToSign = this.cleanTx(JSON.parse(this.txJson.trim()));
                    console.log('Pre txToSign', txToSign);
                    const currentLedger = await client.getLedgerIndex();
                    console.log('currentLedger: ', currentLedger);
                    txToSign.LastLedgerSequence = currentLedger + 5;
                    response = await this.xrplTransactions.simulateTransaction(client, txToSign);
               } else {
                    response = await client.submitAndWait(multiSignedTxBlob);
               }

               // this.txUiService.addTxResultSignal(response.result);
               this.txUiService.setTxResult(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.txUiService.setError(userMessage);
               } else {
                    this.txUiService.setSuccess(this.txUiService.result);
               }

               this.txUiService.addTxHashSignal(response.result.hash ? response.result.hash : response.result.tx_json.hash);

               if (!this.txUiService.isSimulateEnabled()) {
                    this.txUiService.successMessage = 'Transaction completed successfully!';

                    await this.refreshAfterTx(client, wallet, '', true);
                    this.resetSigners();
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.txUiService.successMessage = 'Simulated transaction successfully!';
               }
          } catch (error: any) {
               console.error('Error in submitMultiSignedTransaction:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner.set(false);
               // this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving submitMultiSignedTransaction in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async signForMultiSign() {
          console.log('Entering signForMultiSign');
          const startTime = Date.now();
          this.clearMessages();
          this.txUiService.updateSpinnerMessage(``);
          this.buttonLoading.update(l => ({ ...l, multiSign: true }));

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
               const selectedSigners = this.availableSigners().filter((w: { isSelectedSigner: any }) => w.isSelectedSigner);

               if (!selectedSigners.length) {
                    return this.txUiService.setError('Select at least one signer.');
               }

               const addresses = selectedSigners.map((acc: { address: any }) => acc.address).join(',');
               const seeds = selectedSigners.map((acc: { seed: any }) => acc.seed).join(',');
               console.log('Addresses:', addresses);
               console.log('Seeds:', seeds);

               const fee = await this.xrplService.calculateTransactionFee(client);
               const wallet = await this.getWallet();
               const signerAddresses = this.utilsService.getMultiSignAddress(addresses);
               const signerSeeds = this.utilsService.getMultiSignSeeds(seeds);
               const result = await this.utilsService.handleMultiSignTransaction({ client, wallet, tx: txToSign, signerAddresses, signerSeeds, fee });
               console.info(`result`, result);
               this.outputField.set(result.signedTx?.tx_blob ? result.signedTx?.tx_blob : 'Error');
          } catch (error: any) {
               console.error('Error in signForMultiSign:', error);
               this.txUiService.setError(`Error: ${error.message || error}`);
          } finally {
               this.txUiService.spinner.set(false);
               this.buttonLoading.update(l => ({ ...l, multiSign: false }));
               // this.executionTime = (Date.now() - startTime).toString();
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

          if (this.txUiService.isSimulateEnabled()) {
               delete editedJson.Sequence;
          }

          return editedJson;
     }

     populateTxDetails() {
          if (!this.outputField().trim()) return;
          const decodedTx = xrpl.decode(this.outputField().trim());
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

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

          // This triggers infoMessage() to update automatically
          // this.accountInfo.set(accountInfo);

          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest && destination) this.addNewDestinationFromUser(destination);
          this.refreshUiState(wallet, accountInfo, accountObjects);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     private refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          // Update multi-sign & regular key flags
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          this.txUiService.regularKeySigningEnabled.set(hasRegularKey);

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.txUiService.signerQuorum.set(signerQuorum);
          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

          this.txUiService.multiSigningEnabled.set(hasSignerList);
          if (hasSignerList) {
               const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.txUiService.signers.set(entries);
          }

          const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };

          this.txUiService.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.txUiService.regularKeySeed.set(rkProps.regularKeySeed);
     }

     private setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
          const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
          this.txUiService.signers.set(signerEntries);
          this.txUiService.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
          this.txUiService.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     }

     private clearMultiSignersConfiguration(): void {
          this.txUiService.signerQuorum.set(0);
          this.txUiService.multiSignAddress.set('No Multi-Sign address configured for account');
          this.txUiService.multiSignSeeds.set('');
          this.storageService.removeValue('signerEntries');
     }

     updateDestinations() {
          // Optional: persist destinations
          const allItems = [
               ...this.wallets().map(wallet => ({
                    name: wallet.name ?? this.truncateAddress(wallet.address),
                    address: wallet.address,
               })),
               ...this.customDestinations(),
          ];
          this.storageService.set('destinations', allItems);
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const walletEntries = Object.entries(this.currentWallet());
          console.log('this.currentWallet entries', walletEntries.length > 0);
          if (walletEntries.length <= 0) {
               throw new Error('No wallets exist. Create a new wallet before continuing.');
          }

          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     onTxJsonBlur() {
          clearTimeout(this.highlightTimeout());
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
          clearTimeout(this.highlightTimeout());

          // Re-highlight only after user stops typing for 500ms
          this.highlightTimeout.set(
               setTimeout(() => {
                    this.scheduleHighlight();
               }, 5000)
          );
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
          this.outputField.set(blob);
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
          this.selectedSingleTicket.set('');
          this.isTicket.set(false);
          this.useMultiSign.set(false);
          this.resetSigners();
          this.clearInputFields();
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

     clearInputFields() {
          this.txUiService.amountField.set('');
          this.txUiService.destinationTagField.set('');
          this.txUiService.invoiceIdField.set('');
          this.txUiService.sourceTagField.set('');
     }

     resetSigners() {
          this.availableSigners().forEach((w: { isSelectedSigner: boolean }) => (w.isSelectedSigner = false));
          this.selectedQuorum.set(0);
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
                         this.signedCode.nativeElement.textContent = this.outputField();
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
