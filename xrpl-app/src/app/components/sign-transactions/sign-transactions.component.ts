import { Component, OnInit, ChangeDetectorRef, ViewChild, inject, ViewContainerRef, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core';
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
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { SelectItem } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { SignTransactionUtilService } from '../../services/sign-transactions/sign-transactions-util/sign-transaction-util.service';
import { SignTransactionsOrchestratorService } from '../../services/sign-transactions/sign-transactions-orchestrator/sign-transactions-orchestrator.service';
import { JsonEditorComponent } from '../json-editor/json-editor.component';
import { XrplTxOptionsStore } from '../shared/stores/xrpl-tx-options.store';

@Component({
     selector: 'app-sign-transactions',
     standalone: true,
     imports: [CommonModule, FormsModule, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule, MatAutocompleteModule, MatTableModule, MatSortModule, MatPaginatorModule, MatInputModule, MatFormFieldModule, WalletPanelComponent, SelectSearchDropdownComponent, TransactionPreviewComponent, TransactionOptionsComponent, JsonEditorComponent],
     animations: [
          trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])]),
          trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(-20px)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))])]),
     ],
     templateUrl: './sign-transactions.component.html',
     styleUrl: './sign-transactions.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignTransactionsComponent extends PerformanceBaseComponent implements OnInit {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly signTransactionUtilService = inject(SignTransactionUtilService);
     public readonly viewContainerRef = inject(ViewContainerRef);
     public readonly overlay = inject(Overlay);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly acccountDataService = inject(AcccountDataService);
     private readonly walletManager = inject(WalletManagerService);
     private readonly cdr = inject(ChangeDetectorRef);
     public readonly signTransactionsOrchestratorService = inject(SignTransactionsOrchestratorService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     @ViewChild('jsonEditor') jsonEditor!: JsonEditorComponent;
     readonly jsonEditorError = signal<string>('');

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal<boolean>(false);
     accountInfo = signal<any>(null);
     wallets = signal<Wallet[]>([]);

     txJson = signal<string>('');
     outputField = signal<string>('');
     selectedTransaction = signal<string | null>(null);
     editedTxJson = signal<any>({});
     multiSignedTxBlob = signal<string>(''); // Final combined tx blob
     availableSigners = signal<any[]>([]);
     requiredQuorum = signal<number>(0);
     selectedQuorum = signal<number>(0);
     flagResults = signal<any>('');
     buttonLoading = signal({
          getJson: false,
          signed: false,
          submit: false,
          multiSign: false,
     });

     // allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     // destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     // destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     // selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     // filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     // destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     // private readonly signTransactionSpecificKeys = ['amountField', 'amountField', 'destinationTagField', 'sourceTagField', 'invoiceIdField'] as const;
     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');

     // Has wallets → warning handling
     private readonly _hasWalletsEffect = effect(() => {
          if (this.walletManager.hasWallets()) {
               this.txUiService.clearWarning?.();
          } else {
               this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
               this.txUiService.setError('');
               this.txUiService.setInfoMessage('');
          }
     });

     // Effect 2: Wallets list sync
     private readonly _walletsSyncEffect = effect(() => {
          this.wallets.set(this.walletManager.wallets());
     });

     // Effect 3: Selected index change → clear + refresh checks
     private readonly _selectedIndexEffect = effect(() => {
          // Reading the signal is enough to trigger the effect
          this.walletManager.selectedIndex();

          // this.txUiService.clearAllOptionsAndMessages();

          // Fire-and-forget refresh
          void this.getAccountDetails(true);
     });

     infoData = computed(() => {
          return null;
     });

     // Transaction Type Dropdown Items
     transactionTypeItems = computed(() => {
          const current = this.selectedTransaction();

          return [
               // Basic
               // { id: 'batch', display: 'Batch', group: 'Basic' },
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

     readonly getTransactionJsonButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle' || !this.buttonLoading().getJson) return 'Get Transaction JSON';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly signTransactionButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle' || !this.buttonLoading().signed) return 'Signed Transaction';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly submitTransactionButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle' || !this.buttonLoading().submit) return 'Submit Transation';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly signMultiSignButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle' || !this.buttonLoading().multiSign) return 'Sign for Multi-Sign';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     selectedTransactionItem = computed(() => {
          const id = this.selectedTransaction();
          if (!id) return null;
          return this.transactionTypeItems().find(i => i.id === id) || null;
     });

     async onTransactionSelected(item: SelectItem | null) {
          const tx = item?.id || '';
          this.selectedTransaction.set(tx);
          await this.onTransactionChange();
     }

     constructor() {
          super();
     }

     ngOnInit(): void {
          this.selectedTransaction.set('sendXrp');
          this.clearMessages();
          this.txUiService.clearAllOptionsAndMessages();
          this.clearFields();
     }

     private selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     private ensureWalletSelected(): boolean {
          if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
               console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
               return false;
          }
          return true;
     }

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     get isAnyButtonLoading(): boolean {
          return Object.values(this.buttonLoading).includes(true);
     }

     async onTransactionChange(): Promise<void> {
          this.txJson.set('');
          this.outputField.set('');
          this.txUiService.isError.set(false);
          // this.txUiService.errorMessage = null;
          this.clearMessages();
          await this.generateTransactionJson();
          this.cdr.detectChanges();
     }

     async getTransactionJSON(): Promise<void> {
          await this.onTransactionChange();
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.measure('getAccountDetails', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               // this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         forceRefresh: forceRefresh,
                    });

                    if (!env.accountInfo || !env.accountObjects) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    this.accountInfo.set(env.accountInfo);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    await this.generateTransactionJson();
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async generateTransactionJson(): Promise<void> {
          await this.withPerf('generateTransactionJson', async () => {
               this.buttonLoading.update(l => ({ ...l, getJson: true }));
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const jsonStr = await this.signTransactionUtilService.buildTransactionText({
                         client: env.client,
                         wallet: env.wallet,
                         accountInfo: env.accountInfo!,
                         fee: env.fee,
                         currentLedger: env.currentLedger,
                         selectedTransaction: this.selectedTransaction() as any,
                         isTicketEnabled: this.xrplTxOptionsStore.isTicket(),
                         isMemoEnable: this.txUiService.isMemoEnabled(),
                         ticketSequence: this.xrplTxOptionsStore.selectedSingleTicket(),
                    });

                    this.txJson.set(jsonStr);
                    console.log('Generated JSON:', this.txJson());
                    this.cdr.detectChanges();
               } catch (err: any) {
                    if (err.message === 'No wallets exist. Create a new wallet before continuing.') {
                         this.txUiService.setWarning(err.message);
                         this.toastService.error('');
                         return;
                    }
                    this.toastService.error(err.message, AppConstants.TOAST.ERROR);
               } finally {
                    this.buttonLoading.update(l => ({ ...l, getJson: false }));
               }
          });
     }

     async unsignedTransaction() {
          await this.withPerf('unsignedTransaction', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    if (!this.txJson().trim()) return this.toastService.error('Transaction cannot be empty', AppConstants.TOAST.ERROR);

                    const editedString = this.txJson().trim();
                    let editedJson = JSON.parse(editedString);
                    let cleanedJson = this.cleanTx(editedJson);
                    console.log('Edited JSON:', editedJson);
                    console.log('Cleaned JSON:', cleanedJson);

                    const serialized = xrpl.encode(cleanedJson);
                    const unsignedHash = xrpl.hashes.hashTx(serialized);
                    console.log('Unsigned Transaction hash (hex):', unsignedHash);

                    this.outputField.set(unsignedHash); // Set property
                    this.txUiService.isError.set(false);
               } catch (error: any) {
                    console.error('Error in unsignedTransaction:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async signedTransaction() {
          await this.withPerf('signedTransaction', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.buttonLoading.update(l => ({ ...l, signed: true }));

               let txToSign: any;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeLedgerIndex: true,
                    });

                    if (!this.txJson().trim()) {
                         return this.toastService.error('Transaction cannot be empty', AppConstants.TOAST.ERROR);
                    }

                    const editedString = this.txJson().trim();
                    let editedJson = JSON.parse(editedString);
                    txToSign = this.cleanTx(editedJson);
                    console.log('Pre txToSign', txToSign);

                    console.log('currentLedger: ', env.currentLedger);
                    txToSign.LastLedgerSequence = env.currentLedger! + AppConstants.SIGN_TX_LAST_LEDGER_ADD_TIME;

                    console.log('Post txToSign', txToSign);

                    const signed = env.wallet.sign(txToSign);
                    // Use tx_blob instead of signedTransaction
                    this.outputField.set(signed.tx_blob);
                    this.setSigned(this.outputField());

                    console.log('Signed TX blob:', signed.tx_blob);
                    console.log('Transaction ID (hash):', signed.hash);

                    // decode blob to JSON
                    const decodedTx = xrpl.decode(signed.tx_blob);
                    console.log(decodedTx);
               } catch (error: any) {
                    console.error('Error in signedTransaction:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.buttonLoading.update(l => ({ ...l, signed: false }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async submitTransaction() {
          await this.withPerf('submitTransaction', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.buttonLoading.update(l => ({ ...l, submit: true }));

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeLedgerIndex: true,
                    });

                    if (!this.outputField().trim()) {
                         return this.toastService.error('Signed tx blob can not be empty', AppConstants.TOAST.ERROR);
                    }

                    const signedTxBlob = this.outputField().trim();
                    const txType = this.getTransactionLabel(this.selectedTransaction() ?? '');

                    let response: any;

                    if (this.xrplTxOptionsStore.isSimulateEnabled()) {
                         const txToSign = this.cleanTx(JSON.parse(this.txJson().trim()));
                         console.log('Pre txToSign', txToSign);
                         console.log('currentLedger: ', env.currentLedger);
                         txToSign.LastLedgerSequence = env.currentLedger! + 5;
                         response = await this.xrplTransactionService.simulateTransaction(env.client, txToSign);
                    } else {
                         this.txUiService.currentStep.set('waiting_validation');
                         response = await env.client.submitAndWait(signedTxBlob);
                    }

                    this.txUiService.setTxResultSignal(response.result);

                    const isSuccess = this.utilsService.isTxSuccessful(response);
                    if (!isSuccess) {
                         const resultMsg = this.utilsService.getTransactionResultMessage(response);
                         // const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);
                         const userMessage = '\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                         console.error(`Transaction ${this.xrplTxOptionsStore.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                         if (response.result) {
                              response.result.errorMessage = userMessage;
                         }
                         this.txUiService.addTxResultSignal(response.result);
                         this.txUiService.setError(userMessage);
                         return this.toastService.error(userMessage, AppConstants.TOAST.ERROR);
                    }

                    const hash = response.result.hash ?? response.result.tx_json?.hash ?? 'unknown';

                    this.txUiService.addTxHashSignal(hash);
                    this.txUiService.setSuccess(this.txUiService.result()); // ← Only for single tx

                    if (this.xrplTxOptionsStore.isSimulateEnabled()) {
                         // this.txUiService.successMessage = 'Simulated transaction successfully!';
                    } else {
                         this.txUiService.currentStep.set('success');
                         // this.txUiService.successMessage = 'Transaction completed successfully!';

                         await this.refreshAfterTx(env.client, env.wallet, null);
                         // this.resetSigners();
                         this.clearFields();
                         this.cdr.detectChanges();
                    }
               } catch (error: any) {
                    console.error('Error in submitTransaction:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.buttonLoading.update(l => ({ ...l, submit: false }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async submitMultiSignedTransaction() {
          await this.withPerf('submitMultiSignedTransaction', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.buttonLoading.update(l => ({ ...l, submit: true }));

               try {
                    if (!this.outputField().trim()) {
                         return this.toastService.error('Signed tx blob can not be empty', AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeLedgerIndex: true,
                    });

                    const multiSignedTxBlob = this.outputField().trim();
                    console.log('multiSignedTxBlob', multiSignedTxBlob);

                    const txType = this.getTransactionLabel(this.selectedTransaction() ?? '');

                    let response: any;

                    if (this.xrplTxOptionsStore.isSimulateEnabled()) {
                         const txToSign = this.cleanTx(JSON.parse(this.txJson().trim()));
                         console.log('Pre txToSign', txToSign);
                         console.log('currentLedger: ', env.currentLedger);
                         txToSign.LastLedgerSequence = env.currentLedger! + 5;
                         response = await this.xrplTransactionService.simulateTransaction(env.client, txToSign);
                    } else {
                         response = await env.client.submitAndWait(multiSignedTxBlob);
                    }

                    this.txUiService.setTxResultSignal(response.result);

                    const isSuccess = this.utilsService.isTxSuccessful(response);
                    if (!isSuccess) {
                         const resultMsg = this.utilsService.getTransactionResultMessage(response);
                         // const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);
                         const userMessage = '\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                         console.error(`Transaction ${this.xrplTxOptionsStore.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                         (response.result as any).errorMessage = userMessage;
                         this.toastService.error(userMessage, AppConstants.TOAST.ERROR);
                    } else {
                         this.txUiService.setSuccess(this.txUiService.result());
                    }

                    this.txUiService.addTxHashSignal(response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    if (!this.xrplTxOptionsStore.isSimulateEnabled()) {
                         // this.txUiService.successMessage = 'Transaction completed successfully!';

                         await this.refreshAfterTx(env.client, env.wallet, null);
                         this.clearFields();
                         this.cdr.detectChanges();
                    } else {
                         // this.txUiService.successMessage = 'Simulated transaction successfully!';
                    }
               } catch (error: any) {
                    console.error('Error in submitMultiSignedTransaction:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.buttonLoading.update(l => ({ ...l, multiSign: false }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async signForMultiSign() {
          await this.withPerf('signForMultiSign', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.buttonLoading.update(l => ({ ...l, submit: true }));

               let txToSign: any;

               try {
                    if (!this.txJson().trim()) {
                         return this.toastService.error('Transaction cannot be empty', AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeLedgerIndex: true,
                    });

                    const editedString = this.txJson().trim();
                    let editedJson = JSON.parse(editedString);
                    txToSign = this.cleanTx(editedJson);
                    console.log('Pre txToSign', txToSign);

                    console.log('currentLedger: ', env.currentLedger);
                    txToSign.LastLedgerSequence = env.currentLedger! + AppConstants.SIGN_TX_LAST_LEDGER_ADD_TIME;

                    console.log('Post txToSign', txToSign);

                    // Get selected signer wallets
                    const selectedSigners = this.availableSigners().filter((w: { isSelectedSigner: any }) => w.isSelectedSigner);

                    if (!selectedSigners.length) {
                         return this.toastService.error('Select at least one signer.', AppConstants.TOAST.ERROR);
                    }

                    const addresses = selectedSigners.map((acc: { address: any }) => acc.address).join(',');
                    const seeds = selectedSigners.map((acc: { seed: any }) => acc.seed).join(',');
                    console.log('Addresses:', addresses);
                    console.log('Seeds:', seeds);

                    const fee = await this.xrplService.calculateTransactionFee(env.client);
                    const signerAddresses = this.utilsService.getMultiSignAddress(addresses);
                    const signerSeeds = this.utilsService.getMultiSignSeeds(seeds);
                    const result = await this.utilsService.handleMultiSignTransaction({ client: env.client, wallet: env.wallet, tx: txToSign, signerAddresses, signerSeeds, fee });
                    console.info(`result`, result);
                    this.outputField.set(result.signedTx?.tx_blob ? result.signedTx?.tx_blob : 'Error');
               } catch (error: any) {
                    console.error('Error in signForMultiSign:', error);
                    this.toastService.error(error.message || 'Error in signForMultiSign', AppConstants.TOAST.ERROR);
               } finally {
                    this.buttonLoading.update(l => ({ ...l, multiSign: false }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
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

          if (this.xrplTxOptionsStore.isSimulateEnabled()) {
               delete editedJson.Sequence;
          }

          return editedJson;
     }

     populateTxDetails() {
          if (!this.outputField().trim()) return;
          const decodedTx = xrpl.decode(this.outputField().trim());
          console.log(decodedTx);

          this.txJson.set(JSON.stringify(decodedTx, null, 3)); // Update txJson with decoded
     }

     encodeMemo(editedJson: any) {
          editedJson.Memos = editedJson.Memos.map((memoObj: any) => {
               // Ensure the structure is correct
               if (!memoObj?.Memo) {
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

     private async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, errorMessage: string): Promise<boolean> {
          if (!result.success) {
               this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
               return false;
          }

          await this.refreshAfterTx(client, wallet, destination);

          this.cdr.markForCheck();
          return true;
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

          this.updateLocalAccountState(accountInfo);

          await this.refreshWallets(client, destination ? [wallet.classicAddress, destination] : [wallet.classicAddress]);

          // this.addCustomDestination(destination);
          this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
     }

     private updateLocalAccountState(accountInfo: any): void {
          this.accountInfo.set(accountInfo);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(
               client,
               addresses, // only the addresses to target
               (updatedList, newCurrent) => {
                    this.currentWallet.set({ ...newCurrent });
               }
          );
     }

     // private addCustomDestination(destination: string | null): void {
     //      if (!destination) return;
     //      const addr = destination.trim();
     //      if (xrpl.isValidAddress(addr) && !this.destinationMap().has(addr)) {
     //           this.transactionDropdownService.addCustomIfNewAndSelect(destination, this.destinationMap, this.selectedDestinationAddress, this.destinationSearchQuery);
     //      }
     // }

     onTxJsonChange(value: string) {
          this.txJson.set(value);

          try {
               JSON.parse(value);
               this.jsonEditorError.set('');
          } catch (e: any) {
               this.jsonEditorError.set(e.message || 'Invalid JSON');
          }
     }

     setTxJson(json: string) {
          this.txJson.set(json);
     }

     setSigned(blob: string) {
          this.outputField.set(blob);
     }

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Check ID copied!');
          });
     }

     clearFields() {
          if (this.xrplTxOptionsStore.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.cdr.markForCheck();
     }

     private clearMessages() {
          this.txUiService.result.set('');
          this.txUiService.isError.set(false);
          this.txUiService.isSuccess.set(false);
          // this.txUiService.successMessage = '';
          // this.txUiService.errorMessage = '';
          this.cdr.markForCheck();
     }

     resetSigners() {
          this.availableSigners().forEach((w: { isSelectedSigner: boolean }) => (w.isSelectedSigner = false));
          this.selectedQuorum.set(0);
     }

     getTransactionLabel(key: string): string {
          return (AppConstants.SIGN_TRANSACTION_LABEL_MAP as Record<string, string>)[key] || key;
     }
}
