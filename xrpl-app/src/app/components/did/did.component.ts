import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { JsonEditorComponent } from '../json-editor/json-editor.component';
import { DidUtilService } from '../../services/did/did-util/did-util.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { DidTransactionOrchestratorService } from '../../services/did/did-transaction-orchestrator/did-transaction-orchestrator.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { RequirementsInfoComponent } from './ui-components/requirements-info/requirements-info.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { ActivatedRoute } from '@angular/router';
import { DidStoreService } from '../../services/did/did-store/did-store.service';
import { DidViewModelService } from '../../services/did/did-view-model/did-view-model.service';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { DidSummaryComponent } from './ui-components/summary/did-summary.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { DID_TAB_META, DID_TABS } from './constants/did.ui';
import { DidTxConfig, DidTxType } from './constants/did.types';
import { DidDeleteComponent } from './tab/did-delete/did-delete.component';
import { DidSetComponent } from './tab/did-set/did-set.component';

@Component({
     selector: 'app-did',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, RequirementsInfoComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, DidSummaryComponent, DidDeleteComponent, DidSetComponent],
     templateUrl: './did.component.html',
     styleUrl: './did.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidComponent extends WalletDestinationBase implements OnInit, AfterViewInit {
     @ViewChild('didDocumentEditor') didDocumentEditor!: JsonEditorComponent;
     @ViewChild('uriEditor') uriEditor!: JsonEditorComponent;
     @ViewChild('didDataEditor') didDataEditor!: JsonEditorComponent;

     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly didTransactionOrchestratorService = inject(DidTransactionOrchestratorService);
     public readonly didUtilService = inject(DidUtilService);
     public readonly didStoreService = inject(DidStoreService);
     public readonly didViewModelService = inject(DidViewModelService);
     readonly menuTabs: TabConfig[] = DID_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = DID_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.didViewModelService.activeTab.set('set');
          this.applyTabFromQueryParam(this.route, ['set', 'delete'] as const, tab => this.setTab(tab));
          this.didUtilService.populateDidDefaultData();
          this.txUiService.clearAllOptions();
     }

     ngAfterViewInit() {
          this.didViewModelService.setDidDataEditor(this.didDataEditor);
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getDidForAccount(false);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
          this.didUtilService.populateDidDefaultData();
     }

     copyDidIndex(didIndex: string) {
          navigator.clipboard.writeText(didIndex).then(() => {
               this.txUiService.showToastMessage('DID Index copied!');
          });
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     async setTab(tab: string): Promise<void> {
          const validTabs = ['set', 'delete'] as const;
          if (validTabs.includes(tab as any)) {
               this.didViewModelService.activeTab.set(tab as 'set' | 'delete');
               this.didUtilService.populateDidDefaultData();
               this.txUiService.clearAllOptionsAndMessages();
               if (this.hasWallets()) await this.getDidForAccount();
          }
     }

     async getDidForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getDidForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) return;

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getDidForAccount:', error);
                    this.toastService.error(error.message || 'Error getting did detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const tab = this.didViewModelService.activeTab();
          let txResult: { success: boolean; hash?: string; error?: string; validationError?: boolean } | null = null;

          if (!this.walletManagerService.ensureWalletSelected()) return;

          const walletVm = this.walletManager.walletVm();
          if (!walletVm?.wallet) return;

          // 2. Map tab to action
          const actionMap: Record<'set' | 'delete', DidTxType> = {
               set: 'setDid',
               delete: 'deleteDid',
          };

          const txType = actionMap[tab];
          if (!txType) {
               this.toastService.error('Unknown action', AppConstants.TOAST.ERROR);
               return;
          }

          // 3. Prepare environment once
          let envRef: any = null;
          try {
               envRef = await this.txEnvironmentService.prepareTxEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          // 4. Build the orchestrator config
          await this.withPerf('performAction', async () => {
               const config: DidTxConfig = {
                    wallet: walletVm.wallet,
                    simulate: this.txUiService.isSimulateEnabled(),
                    multiSign: this.txUiService.useMultiSign(),
                    preFetchedEnv: envRef,
                    didData: this.didStoreService.get('didData'),
                    uriData: this.didStoreService.get('uriData'),
                    didDocumentData: this.didStoreService.get('didDocumentData'),
                    extra: {},
               };

               // 5. Execute via orchestrator
               try {
                    txResult = await this.didTransactionOrchestratorService.executeDidTx(txType, config);
               } catch (err: any) {
                    console.error(`[${tab}] execution failed:`, err);
                    this.toastService.error(err.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) return;

          // 6. Handle result + side effects
          await this.handleTxResult(txResult, envRef.client, envRef.wallet, '');

          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          this.didUtilService.getExistingDid(env.accountObjects);
     }

     protected clearInputFields(): void {
          this.didStoreService.clearDidFields();
     }
}
