import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { AppConstants } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TooltipLinkComponent } from '../shared/tooltip-link/tooltip-link.component';
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
import { DID_TAB_META, DID_TABS, DidTxConfig, DidTxType } from './constants/did.constants';

@Component({
     selector: 'app-did',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, JsonEditorComponent, RequirementsInfoComponent],
     templateUrl: './did.component.html',
     styleUrl: './did.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidComponent extends WalletDestinationBase implements OnInit {
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
     readonly tabMeta = DID_TAB_META;
     readonly menuTabs = DID_TABS;

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

     async setTab(tab: 'set' | 'delete'): Promise<void> {
          this.didViewModelService.activeTab.set(tab);
          this.didUtilService.populateDidDefaultData();
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) await this.getDidForAccount();
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
          // Declare variables we need after the timed block
          let txResult: { success: boolean; error?: string } | null = null;
          let envRef: any = null;
          let currentTab = this.didViewModelService.activeTab();

          // 1. Common reset & guard clauses
          this.txUiService.resetCurrentStepToIdle();
          this.txUiService.clearAllOptionsAndMessages();

          if (!this.walletManagerService.ensureWalletSelected()) return;

          // 2. Map tab → action type
          let action: 'setDid' | 'deleteDid';
          switch (currentTab) {
               case 'set':
                    action = 'setDid';
                    break;
               case 'delete':
                    action = 'deleteDid';
                    break;
               default:
                    this.toastService.error('Unknown action', AppConstants.TOAST.ERROR);
                    return;
          }

          // 3. Fetch environment once for this transaction
          try {
               envRef = await this.txEnvironmentService.prepareTxEnvironment({
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
               });

               if (currentTab === 'delete') {
                    const didFound = envRef.accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'DID';
                    });

                    if (!didFound) {
                         this.toastService.error('Account has no DID set.', AppConstants.TOAST.ERROR);
                         return;
                    }
               }
          } catch (err: any) {
               console.error(err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          await this.withPerf('performAction', async () => {
               // 4. Build the orchestrator config
               const config: DidTxConfig = {
                    wallet: this.currentWallet(),
                    simulate: this.txUiService.isSimulateEnabled(),
                    multiSign: this.txUiService.useMultiSign(),
                    didData: this.didStoreService.get('didData'),
                    uriData: this.didStoreService.get('uriData'),
                    didDocumentData: this.didStoreService.get('didDocumentData'),
                    preFetchedEnv: envRef,
               };

               // 5. Execute
               try {
                    txResult = await this.didTransactionOrchestratorService.executeDidTx(action as DidTxType, config);
               } catch (err: any) {
                    console.error(`Error in ${action}:`, err);
                    this.toastService.error(err.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               }
          });

          // 7. Handle result & side effects
          if (txResult) {
               await this.handleTxResult(txResult, envRef.client, envRef.wallet, '');
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          this.didUtilService.getExistingDid(env.accountObjects);
     }

     protected clearInputFields(): void {
          this.didStoreService.clearDidFields();
     }
}
