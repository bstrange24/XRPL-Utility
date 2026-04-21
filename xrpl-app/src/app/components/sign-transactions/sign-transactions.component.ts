import { Component, OnInit, ChangeDetectorRef, ViewChild, inject, computed, effect, untracked, ChangeDetectionStrategy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { SelectItem } from '../../services/shared/destination-dropdown/destination-dropdown.service';
import { SelectSearchDropdownComponent } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { SignTransactionUtilService } from '../../services/sign-transactions/sign-transactions-util/sign-transaction-util.service';
import { SignTransactionsOrchestratorService } from '../../services/sign-transactions/sign-transactions-orchestrator/sign-transactions-orchestrator.service';
import { JsonEditorComponent } from '../shared/json-editor/json-editor.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { ActivatedRoute } from '@angular/router';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { SignTransactionRequirementsInfoComponent } from './ui-components/sign-transaction-requirements-info/sign-transaction-requirements-info.component';
import { SignTransationStoreService } from '../../services/sign-transactions/sign-transaction-store/sign-transation-store.service';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { RightPanelService } from '../../services/right-panel/right-panel.service';
import { SIGN_TRANSACTION_TAB_META, SIGN_TRANSACTION_TABS } from './constants/sign-transaction.ui';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { SIGN_TRANSACTION_TAB } from './constants/sign-transaction.constants';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-sign-transactions',
     standalone: true,
     imports: [CommonModule, FormsModule, TabMenuWithInfoComponent, NgIcon, LucideAngularModule, SelectSearchDropdownComponent, TransactionPreviewComponent, JsonEditorComponent, WarningMessageComponent, ExecutionTimeDisplayComponent, TransactionOptionsComponent],
     templateUrl: './sign-transactions.component.html',
     styleUrl: './sign-transactions.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignTransactionsComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly signTransactionUtilService = inject(SignTransactionUtilService);
     public readonly signTransactionsOrchestratorService = inject(SignTransactionsOrchestratorService);
     public readonly signTransationStoreService = inject(SignTransationStoreService);
     private readonly rightPanelService = inject(RightPanelService);
     private readonly cdr = inject(ChangeDetectorRef);
     public readonly signTxTabs = SIGN_TRANSACTION_TABS;
     public readonly tabMeta = SIGN_TRANSACTION_TAB_META;

     @ViewChild('jsonEditor') jsonEditor!: JsonEditorComponent;
     @ViewChild('signedEditable') signedEditable!: ElementRef<HTMLDivElement>;

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

          // Reactively update TX JSON when ticket is toggled on/off or ticket selection changes
          effect(() => {
               const isTicket = this.xrplTxOptionsStore.isTicket();
               const selectedTicket = this.xrplTxOptionsStore.selectedSingleTicket();

               const txJson = untracked(() => this.signTransationStoreService.txJson());
               if (!txJson.trim()) return;

               let updated: string;
               if (isTicket && selectedTicket) {
                    updated = this.signTransactionsOrchestratorService.applyTicketToJson(txJson, selectedTicket);
               } else if (!isTicket) {
                    const accountInfo = untracked(() => this.signTransationStoreService.accountInfo());
                    const originalSeq: number = accountInfo?.result?.account_data?.Sequence ?? 0;
                    updated = this.signTransactionsOrchestratorService.removeTicketFromJson(txJson, originalSeq);
               } else {
                    return;
               }

               this.signTransationStoreService.setField('txJson', updated);
               this.cdr.markForCheck();
          });

          // Reactively update TX JSON when memo is toggled on/off or memo content changes
          effect(() => {
               const isMemo = this.xrplTxOptionsStore.isMemoEnabled();
               const memos: string[] = this.xrplTxOptionsStore.memos();

               const txJson = untracked(() => this.signTransationStoreService.txJson());
               if (!txJson.trim()) return;

               let updated: string;
               if (isMemo && memos.length > 0) {
                    updated = this.signTransactionsOrchestratorService.applyMemoToJson(txJson, memos);
               } else if (!isMemo) {
                    updated = this.signTransactionsOrchestratorService.removeMemoFromJson(txJson);
               } else {
                    return;
               }

               this.signTransationStoreService.setField('txJson', updated);
               this.cdr.markForCheck();
          });

          // Sync signed field display when outputField changes externally
          effect(() => {
               const output = this.signTransationStoreService.outputField();
               untracked(() => this.updateSignedDisplay());
          });

          this.rightPanelService.setPanel(SignTransactionRequirementsInfoComponent, {
               activeTab: 'sendXrp',
          });
     }

     isExternallySignedTx = computed(() => {
          const output = this.signTransationStoreService.outputField().trim();
          const isAppSigned = this.signTransationStoreService.isAppSigned(); // new

          if (!output) return false;

          try {
               const decoded: any = xrpl.decode(output);
               const hasSignature = decoded['TxnSignature'] != null || (Array.isArray(decoded['Signers']) && decoded['Signers'].length > 0);

               // Show "external" only if it has signature AND was NOT signed by this app
               return hasSignature && !isAppSigned;
          } catch {
               return false;
          }
     });

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, SIGN_TRANSACTION_TAB, tab => this.setTab(tab));
          this.signTransationStoreService.setField('selectedTransaction', 'sendXrp');
          this.clearMessages();
          this.txUiService.clearAllOptionsAndMessages();
          this.clearFields();
     }

     async setTab(tab: string): Promise<void> {
          if (!SIGN_TRANSACTION_TABS.includes(tab as any)) return;
          // this.sendXrpViewModelService.activeTab.set(tab as SendXrpActionTypes);
          this.clearInputFields();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getAccountDetails();
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     async onTransactionChange(): Promise<void> {
          this.signTransationStoreService.setField('txJson', '');
          this.signTransationStoreService.setField('outputField', '');
          this.txUiService.isError.set(false);
          this.clearMessages();
          await this.generateTransactionJson();
          this.signTransationStoreService.setAppSigned(false);
          this.cdr.detectChanges();
     }

     async getTransactionJSON(): Promise<void> {
          await this.onTransactionChange();
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);
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
                    this.updateSharedObjectsStore(env);
                    this.signTransationStoreService.setField('accountInfo', env.accountInfo);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    await this.generateTransactionJson();
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async generateTransactionJson(): Promise<void> {
          await this.withPerf('generateTransactionJson', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, getJson: true }));
                    this.signTransationStoreService.setAppSigned(false);
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

                    const jsonStr = await this.signTransactionsOrchestratorService.generateTransactionJson({
                         wallet,
                         env,
                         selectedTransaction: this.signTransationStoreService.selectedTransaction(),
                         isTicketEnabled: this.xrplTxOptionsStore.isTicket(),
                         ticketSequence: this.xrplTxOptionsStore.selectedSingleTicket(),
                         isMemoEnabled: this.xrplTxOptionsStore.isMemoEnabled(),
                    });

                    this.signTransationStoreService.setField('txJson', jsonStr);
                    this.cdr.detectChanges();
               } catch (err: any) {
                    if (err.message === 'No wallets exist. Create a new wallet before continuing.') {
                         this.txUiService.setWarning(err.message);
                         this.toastService.error('');
                         return;
                    }
                    this.toastService.error(err.message, AppConstants.TOAST.ERROR);
               } finally {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, getJson: false }));
               }
          });
     }

     async signedTransaction(): Promise<void> {
          await this.withPerf('signedTransaction', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, signed: true }));

                    if (!this.signTransationStoreService.txJson().trim()) {
                         return this.toastService.error('Transaction cannot be empty', AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({ includeLedgerIndex: true });

                    const txBlob = await this.signTransactionsOrchestratorService.signTransaction({
                         txJson: this.signTransationStoreService.txJson(),
                         env,
                         isRegularKeyAddress: this.xrplTxOptionsStore.isRegularKeyAddress(),
                         regularKeyAddress: this.accountConfiguratorStoreService.regularKeyAddress(),
                         regularKeySeed: this.accountConfiguratorStoreService.regularKeySeed(),
                    });

                    if (!txBlob) throw new Error('Signing failed.');

                    this.signTransationStoreService.setField('outputField', txBlob);
                    this.signTransactionUtilService.setSigned(txBlob);
                    this.signTransationStoreService.setAppSigned(true); // Mark as signed by this app
               } catch (error: any) {
                    console.error('Error in signedTransaction:', error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               } finally {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, signed: false }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async signForMultiSign(): Promise<void> {
          await this.withPerf('signForMultiSign', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, multiSign: true }));

                    if (!this.signTransationStoreService.txJson().trim()) {
                         return this.toastService.error('Transaction cannot be empty', AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({ includeLedgerIndex: true });

                    const txBlob = await this.signTransactionsOrchestratorService.signForMultiSign({
                         txJson: this.signTransationStoreService.txJson(),
                         env,
                         signers: this.accountConfiguratorStoreService.signers(),
                    });

                    this.signTransationStoreService.setField('outputField', txBlob ?? 'Error');
                    this.signTransationStoreService.setAppSigned(true);
               } catch (error: any) {
                    console.error('Error in signForMultiSign:', error);
                    this.toastService.error(error.message || 'Error in signForMultiSign', AppConstants.TOAST.ERROR);
               } finally {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, multiSign: false }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async signWithRegularKey(): Promise<void> {
          await this.withPerf('signWithRegularKey', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, regularKeySign: true }));

                    if (!this.signTransationStoreService.txJson().trim()) {
                         return this.toastService.error('Transaction cannot be empty', AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({ includeLedgerIndex: true });

                    const txBlob = await this.signTransactionsOrchestratorService.signTransaction({
                         txJson: this.signTransationStoreService.txJson(),
                         env,
                         isRegularKeyAddress: true,
                         regularKeyAddress: this.accountConfiguratorStoreService.regularKeyAddress(),
                         regularKeySeed: this.accountConfiguratorStoreService.regularKeySeed(),
                    });

                    if (!txBlob) throw new Error('Signing failed.');

                    this.signTransationStoreService.setField('outputField', txBlob);
                    this.signTransactionUtilService.setSigned(txBlob);
                    this.signTransationStoreService.setAppSigned(true);
               } catch (error: any) {
                    console.error('Error in signWithRegularKey:', error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               } finally {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, regularKeySign: false }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async submitTransaction(): Promise<void> {
          await this.withPerf('submitTransaction', async () => {
               this.txUiService.isSignedTx.set(true);
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, submit: true }));

                    if (!this.signTransationStoreService.outputField().trim()) {
                         return this.toastService.error('Signed tx blob can not be empty', AppConstants.TOAST.ERROR);
                    }

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

                    const txType = this.getTransactionLabel(this.signTransationStoreService.selectedTransaction() ?? '');
                    const result = await this.signTransactionsOrchestratorService.submitTransaction({
                         txJson: this.signTransationStoreService.txJson(),
                         outputField: this.signTransationStoreService.outputField(),
                         env,
                         isSimulateEnabled: this.xrplTxOptionsStore.isSimulateEnabled(),
                         txType,
                    });

                    if (!result.success) {
                         const response = (result as any).response;
                         if (response?.result) {
                              this.txUiService.setTxResultSignal(response.result);
                              this.txUiService.addTxResultSignal(response.result);
                         }
                         this.txUiService.setError(result.error ?? 'Transaction failed');
                         return this.toastService.error(result.error ?? 'Transaction failed', AppConstants.TOAST.ERROR);
                    }

                    const response = (result as any).response;
                    if (response?.result) this.txUiService.setTxResultSignal(response.result);
                    if (result.hash) this.txUiService.addTxHashSignal(result.hash);

                    if (!this.xrplTxOptionsStore.isSimulateEnabled()) {
                         await this.refreshAfterTx(env.client, env.wallet, null);
                         this.clearFields();
                         this.cdr.detectChanges();
                    }
               } catch (error: any) {
                    console.error('Error in submitTransaction:', error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               } finally {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, submit: false }));
                    this.txUiService.resetCurrentStepToIdle();
                    this.txUiService.isSignedTx.set(false);
               }
          });
     }

     populateTxDetails(): void {
          const output = this.signTransationStoreService.outputField().trim();
          if (!output) {
               this.toastService.error('Signed transaction field is empty');
               return;
          }

          try {
               const decoded: any = xrpl.decode(output);

               // Create clean copy without signature fields
               const cleanTx = { ...decoded };

               delete cleanTx['TxnSignature'];
               delete cleanTx['Signers'];
               delete cleanTx['SigningPubKey']; // optional

               const formattedJson = JSON.stringify(cleanTx, null, 3);

               this.signTransationStoreService.setField('txJson', formattedJson);
               this.signTransactionUtilService.onTxJsonChange(formattedJson);

               this.cdr.markForCheck();
               this.toastService.success('Signed TX decoded and cleaned for re-signing');
          } catch (e) {
               console.error(e);
               this.toastService.error('Failed to decode signed transaction. Invalid blob.', AppConstants.TOAST.ERROR);
          }
     }

     populateTxDetails1(): void {
          const output = this.signTransationStoreService.outputField().trim();
          if (!output) {
               this.toastService.error('Signed transaction field is empty');
               return;
          }

          try {
               const decodedTx = xrpl.decode(output);
               const formattedJson = JSON.stringify(decodedTx, null, 3);

               // Update the store (this will flow to the JSON editor via the [value] binding)
               this.signTransationStoreService.setField('txJson', formattedJson);

               // Also trigger the valueChange handler to clear any error state
               this.signTransactionUtilService.onTxJsonChange(formattedJson);

               this.cdr.markForCheck();
               this.toastService.success('Signed TX successfully decoded to JSON editor');
          } catch (e) {
               console.error(e);
               this.toastService.error('Failed to decode signed transaction. Invalid blob.', AppConstants.TOAST.ERROR);
          }
     }

     // populateTxDetails(): void {
     //      const output = this.signTransationStoreService.outputField().trim();
     //      if (!output) return;
     //      try {
     //           const decodedTx = xrpl.decode(output);
     //           this.signTransationStoreService.setField('txJson', JSON.stringify(decodedTx, null, 3));
     //           this.cdr.markForCheck();
     //      } catch (e) {
     //           // ignore decode errors
     //      }
     // }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
     }

     protected clearInputFields(): void {
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
          this.signTransationStoreService.setField('outputField', '');
          this.signTransationStoreService.setAppSigned(false);
          this.txUiService.isSignedTx.set(false);
          this.txUiService.clearAllOptionsAndMessages();
          this.cdr.markForCheck();
     }

     private clearFields() {
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

     private getTransactionLabel(key: string): string {
          return (AppConstants.SIGN_TRANSACTION_LABEL_MAP as Record<string, string>)[key] || key;
     }

     protected refreshAccountObject(_env: any): void {
          return;
     }

     // Update the display when the store value changes (from signing, etc.)
     private updateSignedDisplay() {
          if (!this.signedEditable) return;
          const value = this.signTransationStoreService.outputField();
          this.signedEditable.nativeElement.textContent = value || '';
     }

     // Called when user types/pastes
     onSignedTxInput(event: Event) {
          const target = event.target as HTMLDivElement;
          const value = target.textContent?.trim() || '';

          this.signTransationStoreService.setField('outputField', value);
          this.signTransationStoreService.setAppSigned(false); // ← Important: User edited/pasted
     }

     // Final sync on blur (recommended for performance)
     onSignedTxBlur() {
          const target = this.signedEditable.nativeElement;
          const value = target.textContent?.trim() || '';
          this.signTransationStoreService.setField('outputField', value);
     }

     private hasProperty(obj: any, prop: string): boolean {
          return obj && obj[prop] != null;
     }
}
