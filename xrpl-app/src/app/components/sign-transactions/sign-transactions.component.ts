import { Component, OnInit, ChangeDetectorRef, ViewChild, inject, ViewContainerRef, computed, ChangeDetectionStrategy } from '@angular/core';
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
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { SelectItem } from '../../services/destination-dropdown/destination-dropdown.service';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { SignTransactionUtilService } from '../../services/sign-transactions/sign-transactions-util/sign-transaction-util.service';
import { SignTransactionsOrchestratorService } from '../../services/sign-transactions/sign-transactions-orchestrator/sign-transactions-orchestrator.service';
import { JsonEditorComponent } from '../json-editor/json-editor.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { ActivatedRoute } from '@angular/router';
import { StorageService } from '../../services/local-storage/storage.service';
import { SignTransactionRequirementsInfoComponent } from './ui-components/sign-transaction-requirements-info/sign-transaction-requirements-info.component';
import { SignTransationStoreService } from '../../services/sign-transactions/sign-transaction-store/sign-transation-store.service';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { ConnectionGuardService } from '../../services/connection-guard/connection-guard.service';

@Component({
     selector: 'app-sign-transactions',
     standalone: true,
     imports: [CommonModule, FormsModule, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule, MatAutocompleteModule, MatTableModule, MatSortModule, MatPaginatorModule, MatInputModule, MatFormFieldModule, WalletPanelComponent, SelectSearchDropdownComponent, TransactionPreviewComponent, JsonEditorComponent, SignTransactionRequirementsInfoComponent, WarningMessageComponent, TransactionOptionsComponent],
     templateUrl: './sign-transactions.component.html',
     styleUrl: './sign-transactions.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignTransactionsComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly signTransactionUtilService = inject(SignTransactionUtilService);
     public readonly viewContainerRef = inject(ViewContainerRef);
     public readonly overlay = inject(Overlay);
     private readonly cdr = inject(ChangeDetectorRef);
     public readonly signTransactionsOrchestratorService = inject(SignTransactionsOrchestratorService);
     public readonly signTransationStoreService = inject(SignTransationStoreService);

     @ViewChild('jsonEditor') jsonEditor!: JsonEditorComponent;

     infoData = computed(() => {
          return null;
     });

     selectedTransactionItem = computed(() => {
          const id = this.signTransationStoreService.selectedTransaction();
          if (!id) return null;
          return this.signTransactionUtilService.transactionTypeItems().find(i => i.id === id) || null;
     });

     async onTransactionSelected(item: SelectItem | null) {
          const tx = item?.id || '';
          this.signTransationStoreService.setField('selectedTransaction', tx);
          await this.onTransactionChange();
     }

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.signTransationStoreService.setField('selectedTransaction', 'sendXrp');
          this.clearMessages();
          this.txUiService.clearAllOptionsAndMessages();
          this.clearFields();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getAccountDetails();
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          // this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     async onTransactionChange(): Promise<void> {
          this.signTransationStoreService.setField('txJson', '');
          this.signTransationStoreService.setField('outputField', '');
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
               // Reset all fields and options
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.txUiService.resetCurrentStepToIdle();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.signTransationStoreService.setField('accountInfo', env.accountInfo);
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
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         getJson: true,
                    }));

                    const wallet = this.currentWallet();

                    let env: any = null;
                    try {
                         env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                              includeAccountInfo: true,
                              includeAccountObject: true,
                              includeFee: true,
                              includeLedgerInfo: true,
                              includeServerInfo: true,
                         });
                    } catch (err: any) {
                         console.error('prepareTxEnvironment failed:', err);
                         this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
                         return;
                    }

                    if (!env) throw new Error('Unable to get environment.');

                    const jsonStr = await this.signTransactionUtilService.buildTransactionText({
                         client: env.client,
                         wallet: env.wallet,
                         accountInfo: env.accountInfo!,
                         fee: env.fee,
                         currentLedger: env.currentLedger,
                         selectedTransaction: this.signTransationStoreService.selectedTransaction() as any,
                         isTicketEnabled: this.xrplTxOptionsStore.isTicket(),
                         isMemoEnable: this.xrplTxOptionsStore.isMemoEnabled(),
                         ticketSequence: this.xrplTxOptionsStore.selectedSingleTicket(),
                    });

                    this.signTransationStoreService.setField('txJson', jsonStr);
                    console.log('Generated JSON:', this.signTransationStoreService.txJson());
                    this.cdr.detectChanges();
               } catch (err: any) {
                    if (err.message === 'No wallets exist. Create a new wallet before continuing.') {
                         this.txUiService.setWarning(err.message);
                         this.toastService.error('');
                         return;
                    }
                    this.toastService.error(err.message, AppConstants.TOAST.ERROR);
               } finally {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         getJson: false,
                    }));
               }
          });
     }

     async unsignedTransaction() {
          await this.withPerf('unsignedTransaction', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    if (!this.signTransationStoreService.txJson().trim()) return this.toastService.error('Transaction cannot be empty', AppConstants.TOAST.ERROR);

                    const editedString = this.signTransationStoreService.txJson().trim();
                    let editedJson = JSON.parse(editedString);
                    let cleanedJson = this.cleanTx(editedJson);
                    console.log('Edited JSON:', editedJson);
                    console.log('Cleaned JSON:', cleanedJson);

                    const serialized = xrpl.encode(cleanedJson);
                    const unsignedHash = xrpl.hashes.hashTx(serialized);
                    console.log('Unsigned Transaction hash (hex):', unsignedHash);

                    this.signTransationStoreService.setField('outputField', unsignedHash);
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

               try {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         signed: true,
                    }));

                    let txToSign: any;

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeLedgerIndex: true,
                    });

                    if (!this.signTransationStoreService.txJson().trim()) {
                         return this.toastService.error('Transaction cannot be empty', AppConstants.TOAST.ERROR);
                    }

                    const editedString = this.signTransationStoreService.txJson().trim();
                    let editedJson = JSON.parse(editedString);
                    txToSign = this.cleanTx(editedJson);
                    console.log('Pre txToSign', txToSign);

                    console.log('currentLedger: ', env.currentLedger);
                    txToSign.LastLedgerSequence = env.currentLedger! + AppConstants.SIGN_TX_LAST_LEDGER_ADD_TIME;

                    console.log('Post txToSign', txToSign);

                    const signed = env.wallet.sign(txToSign);
                    // Use tx_blob instead of signedTransaction
                    this.signTransationStoreService.setField('outputField', signed.tx_blob);
                    this.signTransactionUtilService.setSigned(this.signTransationStoreService.outputField());

                    console.log('Signed TX blob:', signed.tx_blob);
                    console.log('Transaction ID (hash):', signed.hash);

                    // decode blob to JSON
                    const decodedTx = xrpl.decode(signed.tx_blob);
                    console.log(decodedTx);
               } catch (error: any) {
                    console.error('Error in signedTransaction:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         signed: false,
                    }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async submitTransaction() {
          await this.withPerf('submitTransaction', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         submit: true,
                    }));
                    const wallet = this.currentWallet();

                    let env: any = null;
                    try {
                         env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                              includeAccountInfo: true,
                              includeAccountObject: true,
                              includeFee: true,
                              includeLedgerInfo: true,
                              includeServerInfo: true,
                         });
                    } catch (err: any) {
                         console.error('prepareTxEnvironment failed:', err);
                         this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
                         return;
                    }

                    if (!env) throw new Error('Unable to get environment.');

                    if (!this.signTransationStoreService.outputField().trim()) {
                         return this.toastService.error('Signed tx blob can not be empty', AppConstants.TOAST.ERROR);
                    }

                    const signedTxBlob = this.signTransationStoreService.outputField().trim();
                    const txType = this.getTransactionLabel(this.signTransationStoreService.selectedTransaction() ?? '');

                    let response: any;

                    if (this.xrplTxOptionsStore.isSimulateEnabled()) {
                         const txToSign = this.cleanTx(JSON.parse(this.signTransationStoreService.txJson().trim()));
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
                    this.signTransationStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         submit: false,
                    }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async submitMultiSignedTransaction() {
          await this.withPerf('submitMultiSignedTransaction', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         multiSign: true,
                    }));

                    if (!this.signTransationStoreService.outputField().trim()) {
                         return this.toastService.error('Signed tx blob can not be empty', AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeLedgerIndex: true,
                    });

                    const multiSignedTxBlob = this.signTransationStoreService.outputField().trim();
                    console.log('multiSignedTxBlob', multiSignedTxBlob);

                    const txType = this.getTransactionLabel(this.signTransationStoreService.selectedTransaction() ?? '');

                    let response: any;

                    if (this.xrplTxOptionsStore.isSimulateEnabled()) {
                         const txToSign = this.cleanTx(JSON.parse(this.signTransationStoreService.txJson().trim()));
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
                    this.signTransationStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         multiSign: false,
                    }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async signForMultiSign() {
          await this.withPerf('signForMultiSign', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         multiSign: true,
                    }));

                    let txToSign: any;

                    if (!this.signTransationStoreService.txJson().trim()) {
                         return this.toastService.error('Transaction cannot be empty', AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeLedgerIndex: true,
                    });

                    const editedString = this.signTransationStoreService.txJson().trim();
                    let editedJson = JSON.parse(editedString);
                    txToSign = this.cleanTx(editedJson);
                    console.log('Pre txToSign', txToSign);

                    console.log('currentLedger: ', env.currentLedger);
                    txToSign.LastLedgerSequence = env.currentLedger! + AppConstants.SIGN_TX_LAST_LEDGER_ADD_TIME;

                    console.log('Post txToSign', txToSign);

                    // Get selected signer wallets
                    const selectedSigners = this.signTransationStoreService.availableSigners().filter((w: { isSelectedSigner: any }) => w.isSelectedSigner);

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
                    this.signTransationStoreService.setField('outputField', result.signedTx?.tx_blob ? result.signedTx?.tx_blob : 'Error');
               } catch (error: any) {
                    console.error('Error in signForMultiSign:', error);
                    this.toastService.error(error.message || 'Error in signForMultiSign', AppConstants.TOAST.ERROR);
               } finally {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         multiSign: false,
                    }));
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

          if (typeof editedJson.Amount === 'string' && this.signTransationStoreService.selectedTransaction() === 'sendXrp') {
               editedJson.Amount = xrpl.xrpToDrops(editedJson.Amount);
          }

          if (this.xrplTxOptionsStore.isSimulateEnabled()) {
               delete editedJson.Sequence;
          }

          return editedJson;
     }

     populateTxDetails() {
          if (!this.signTransationStoreService.outputField().trim()) return;
          const decodedTx = xrpl.decode(this.signTransationStoreService.outputField().trim());
          console.log(decodedTx);

          this.signTransationStoreService.setField('txJson', JSON.stringify(decodedTx, null, 3));
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

     protected refreshAccountObject(_env: any): void {
          return;
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          // this.credentialStore.setField('credentialIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          // this.credentialStore.setField('subject', addr);
     }

     clearFields() {
          if (this.xrplTxOptionsStore.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
          this.cdr.markForCheck();
     }

     private clearMessages() {
          this.txUiService.result.set('');
          this.txUiService.isError.set(false);
          this.txUiService.isSuccess.set(false);
          this.cdr.markForCheck();
     }

     resetSigners() {
          this.signTransationStoreService.availableSigners().forEach((w: { isSelectedSigner: boolean }) => (w.isSelectedSigner = false));
          this.signTransationStoreService.setField('selectedQuorum', 0);
     }

     getTransactionLabel(key: string): string {
          return (AppConstants.SIGN_TRANSACTION_LABEL_MAP as Record<string, string>)[key] || key;
     }

     protected clearInputFields(): void {
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }
}
