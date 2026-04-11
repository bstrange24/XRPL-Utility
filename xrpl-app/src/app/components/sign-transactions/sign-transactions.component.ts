import { Component, OnInit, ChangeDetectorRef, ViewChild, inject, computed, effect, untracked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { SelectItem } from '../../services/shared/destination-dropdown/destination-dropdown.service';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
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

@Component({
     selector: 'app-sign-transactions',
     standalone: true,
     imports: [CommonModule, FormsModule, NavbarComponent, LucideAngularModule, NgIcon, WalletPanelComponent, SelectSearchDropdownComponent, TransactionPreviewComponent, JsonEditorComponent, SignTransactionRequirementsInfoComponent, WarningMessageComponent, ExecutionTimeDisplayComponent, TransactionOptionsComponent],
     templateUrl: './sign-transactions.component.html',
     styleUrl: './sign-transactions.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignTransactionsComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly signTransactionUtilService = inject(SignTransactionUtilService);
     private readonly cdr = inject(ChangeDetectorRef);
     public readonly signTransactionsOrchestratorService = inject(SignTransactionsOrchestratorService);
     public readonly signTransationStoreService = inject(SignTransationStoreService);

     @ViewChild('jsonEditor') jsonEditor!: JsonEditorComponent;

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
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     async onTransactionChange(): Promise<void> {
          this.signTransationStoreService.setField('txJson', '');
          this.signTransationStoreService.setField('outputField', '');
          this.txUiService.isError.set(false);
          this.clearMessages();
          await this.generateTransactionJson();
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
               } catch (error: any) {
                    console.error('Error in signedTransaction:', error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               } finally {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, signed: false }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async submitTransaction(): Promise<void> {
          await this.withPerf('submitTransaction', async () => {
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
                         this.txUiService.currentStep.set('success');
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
               } catch (error: any) {
                    console.error('Error in signForMultiSign:', error);
                    this.toastService.error(error.message || 'Error in signForMultiSign', AppConstants.TOAST.ERROR);
               } finally {
                    this.signTransationStoreService.updateField('buttonLoading', s => ({ ...s, multiSign: false }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     populateTxDetails(): void {
          const output = this.signTransationStoreService.outputField().trim();
          if (!output) return;
          try {
               const decodedTx = xrpl.decode(output);
               this.signTransationStoreService.setField('txJson', JSON.stringify(decodedTx, null, 3));
               this.cdr.markForCheck();
          } catch (e) {
               // ignore decode errors
          }
     }

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
}
