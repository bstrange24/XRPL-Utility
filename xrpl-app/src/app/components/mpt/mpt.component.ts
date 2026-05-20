import { OnInit, Component, inject, ChangeDetectionStrategy, ViewChild, computed, signal, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { JsonEditorComponent } from '../shared/json-editor/json-editor.component';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { CheckUtilService } from '../../services/checks/checks-util/check-util.service';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { ActivatedRoute } from '@angular/router';
import { MptOrchestratorServiceService } from '../../services/mpt/mpt-orchestrator/mpt-orchestrator.service.service';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { MptRequirementsInfoComponent } from './ui-components/mpt-requirements-info/mpt-requirements-info.component';
import { MptTransactionViewModelService } from '../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MPT_TAB_META, MPT_TABS } from './constants/mpt.ui';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { MPT_TAB, MPT_FLAGS_CONFIG } from './constants/mpt.constants';
import { MptActionTypes, MptTxConfig, MptTxType } from './constants/mpt.types';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { MptStoreService } from '../../services/mpt/mpt-store/mpt-store.service';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { MptSummaryComponent } from './ui-components/mpt-summary/mpt-summary.component';
import { MptAuthorizeUnauthorizeComponent } from './tab/mpt-authorize-unauthorize/mpt-authorize-unauthorize.component';
import { MptLockUnlockComponent } from './tab/mpt-lock-unlock/mpt-lock-unlock.component';
import { MptSendComponent } from './tab/mpt-send/mpt-send.component';
import { MptClawbackComponent } from './tab/mpt-clawback/mpt-clawback.component';
import { MptDestroyComponent } from './tab/mpt-destroy/mpt-destroy.component';
import { MptCreateComponent } from './tab/mpt-create/mpt-create.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { FlagSelectorComponent } from '../shared/flag-selector/flag-selector.component';
import { DialogService } from '../../services/shared/dialog/dialog.service';
import { MptAuthorizedStorageService } from '../../services/mpt/mpt-authorized-storage/mpt-authorized-storage.service';

@Component({
     selector: 'app-mpt',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TransactionPreviewComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TransactionOptionsComponent, MptAuthorizeUnauthorizeComponent, MptLockUnlockComponent, MptSendComponent, MptDestroyComponent, MptClawbackComponent, MptCreateComponent, FlagSelectorComponent],
     templateUrl: './mpt.component.html',
     styleUrl: './mpt.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptComponent extends WalletDestinationBase implements OnInit {
     @ViewChild('jsonEditor') jsonEditor!: JsonEditorComponent;
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly checkTransactionOrchestrator = inject(CheckTransactionOrchestrator);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly mptOrchestratorServiceService = inject(MptOrchestratorServiceService);
     public readonly mptTransactionViewModelService = inject(MptTransactionViewModelService);
     public readonly mptStoreService = inject(MptStoreService);
     private readonly rightPanelService = inject(RightPanelService);
     private readonly dialogService = inject(DialogService);
     private readonly authorizedStorage = inject(MptAuthorizedStorageService);
     public readonly tabMeta = MPT_TAB_META;
     public readonly mptFlagsConfig = MPT_FLAGS_CONFIG;
     private _jsonEditor?: JsonEditorComponent;
     public canCreateMpt = signal(false);
     public canAuthorizeMpt = signal(false);
     public mptValidationErrors = signal<string[]>([]);
     public lastIntendedDestination = signal<string>('');
     public resetTrigger = input<number>(0);

     monacoOptions = {
          theme: 'vs',
          language: 'json',
          minimap: { enabled: false },
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          scrollBeyondLastLine: false,
     };

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();

          // Track intended destination for warning message
          effect(() => {
               const currentSelected = this.selectedDestinationAddress();
               if (currentSelected) {
                    this.lastIntendedDestination.set(currentSelected);
               }
          });

          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               // this.clearSearch();
          });
     }

     activeTabForRequirements = computed(() => this.mptTransactionViewModelService.activeTab());
     readonly summaryExpanded = signal<boolean>(false);

     ngOnInit(): void {
          // Load persisted authorized holders on component init
          this.mptStoreService.syncFromLocalStorage();

          this.applyTabFromQueryParam(this.route, MPT_TAB, tab => this.setTab(tab));
          this.transactionDropdownService.loadCustomDestinations();
          this.mptStoreService.setField('metaData', this.mptStoreService.XLS89_TEMPLATE());

          // Initial setup
          this.setRightPanel();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          this.rightPanelService.resetFilters();
          this.mptTransactionViewModelService.clearMetadataCache();
          this.clearInputFields();
          await this.getMptDetails(true);
     }

     @ViewChild('jsonEditor')
     set jsonEditorSetter(editor: JsonEditorComponent | undefined) {
          if (editor) {
               this._jsonEditor = editor;
               // Safe to call here
               queueMicrotask(() => editor.format());
          }
     }

     tabs = computed(() => {
          const authAction = this.mptStoreService.authAction();
          const lockAction = this.mptStoreService.lockAction();

          return MPT_TABS.map(tab => {
               if (tab.key === 'authorizeMpt') {
                    return {
                         ...tab,
                         label: authAction === 'authorize' ? 'Authorize' : 'Unauthorize',
                         icon: authAction === 'authorize' ? 'shield-check' : 'shield-off',
                         color: authAction === 'authorize' ? '#fbbf24' : '#ef4444',
                    };
               }

               if (tab.key === 'lockMpt') {
                    return {
                         ...tab,
                         label: lockAction === 'lock' ? 'Lock' : 'Unlock',
                         icon: lockAction === 'lock' ? 'heroLockClosed' : 'heroLockOpen',
                         color: lockAction === 'lock' ? '#ef4444' : '#a855f7',
                    };
               }

               return tab;
          });
     });

     onMptSelected(item: SelectItem | null) {
          if (!item) return;
          this.mptStoreService.setField('mptIssuanceId', item?.id || '');
     }

     onMptSelectedFromSummary(mpt: any): void {
          if (!mpt) return;
          this.mptStoreService.setField('mptIssuanceId', mpt.mpt_issuance_id || mpt.id || '');
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     toggleExistingMpts() {
          this.mptStoreService.setField('outstandingMptsCollapsed', !this.mptStoreService.outstandingMptsCollapsed());
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: string): Promise<void> {
          if (!MPT_TAB.includes(tab as any)) return;
          this.mptTransactionViewModelService.activeTab.set(tab as MptActionTypes);
          this.clearInputFields();
          if (this.hasWallets()) await this.getMptDetails(false);
     }

     async getMptDetails(forceRefresh = false): Promise<void> {
          const address = this.walletManager.getSelectedWallet()?.classicAddress ?? '';
          this.isSummaryLoading.set(true);
          if (!forceRefresh) this.tryPrePopulateFromCache(address);
          await this.measure('getMptDetails', true, async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.txUiService.resetCurrentStepToIdle();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
               } catch (error: any) {
                    console.error('Error in getMptDetails:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.mptTransactionViewModelService.activeTab();

          // Special handling for destroy with authorization warning
          if (currentTab === 'destroyMpt') {
               const warningMessage = this.mptUtilService.getDestroyWarningMessage();
               if (warningMessage) {
                    const confirmed = await this.dialogService.confirm(warningMessage + '\n\nDo you want to proceed with destruction anyway?', 'Warning: Authorized Holders Exist');

                    if (!confirmed) {
                         this.toastService.info('Destruction cancelled', AppConstants.TOAST.INFO);
                         return;
                    }
               }
          }

          const wallet = this.currentWallet();

          let destinationAddress = '';
          if (currentTab === 'sendMpt' || currentTab === 'clawbackMpt' || currentTab === 'authorizeMpt' || currentTab === 'unauthorizeMpt') {
               destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
               if (!destinationAddress || !xrpl.isValidAddress(destinationAddress)) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }
               this.selectedDestinationAddress.set(destinationAddress);
               this.mptStoreService.setField('destination', destinationAddress);
          }

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeDestinationAccountObject: true,
                    destinationAddress,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (currentTab === 'sendMpt') {
               if (!this.mptUtilService.isDestinationAuthorizedForMpt(env.accountObjects.result.account_objects, env.destinationAccountObject.result.account_objects, this.mptStoreService.mptIssuanceId())) {
                    this.toastService.error(`Destination ${destinationAddress} is not authorized to receive this MPT. Please ensure authorization has been completed.`, AppConstants.TOAST.ERROR);
                    return;
               }
          }

          if (currentTab === 'lockMpt' || currentTab === 'unlockMpt') {
               const mptIssuanceId = this.mptStoreService.mptIssuanceId();
               if (!mptIssuanceId) {
                    this.toastService.error('Please select an MPT to lock/unlock.', AppConstants.TOAST.ERROR);
                    return;
               }

               // Check if the MPT exists and was issued by this account
               const issuanceExists = this.mptUtilService.getMPTokenIssuance(env.accountObjects);
               if (!issuanceExists) {
                    this.toastService.error(`MPT issuance ID ${mptIssuanceId} was not issued by ${wallet.classicAddress}.`, AppConstants.TOAST.ERROR);
                    return;
               }

               // Additional validation for lock/unlock capabilities
               const mptIssuance = env.accountObjects.result.account_objects.find((obj: any) => obj.LedgerEntryType === 'MPTokenIssuance' && obj.mpt_issuance_id === mptIssuanceId);

               if (mptIssuance) {
                    const canLock = (mptIssuance.Flags & 0x00000002) !== 0; // tfMPTCanLock flag
                    if (!canLock && this.mptStoreService.lockAction() === 'lock') {
                         this.toastService.error('This MPT does not have the CanLock flag enabled and cannot be locked.', AppConstants.TOAST.ERROR);
                         return;
                    }
               }

               const accountIssuerToken = this.mptUtilService.getAllMptTokens(env.accountObjects);
               if (!accountIssuerToken) {
                    this.toastService.error(`MPT issuance ID ${this.mptStoreService.mptIssuanceId()} was not issued by ${wallet.classicAddress}.`, AppConstants.TOAST.ERROR);
                    return;
               }
          }

          const mptState = this.mptStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: MptTxConfig = {
               mpt: mptState,
               account: accountState,
               txOptions: txOptionsState,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;
          let txType: string;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'createMpt': {
                              txType = 'createMpt' as MptTxType;
                              break;
                         }

                         case 'authorizeMpt':
                         case 'unauthorizeMpt': {
                              const action = this.mptStoreService.authAction();
                              if (action === 'authorize' || action === 'unauthorize') {
                                   txType = `${action}Mpt` as MptTxType;
                              } else {
                                   throw new Error(`Invalid auth action: ${action}`);
                              }
                              break;
                         }

                         case 'lockMpt':
                         case 'unlockMpt': {
                              const lockAction = this.mptStoreService.lockAction();
                              if (lockAction === 'lock' || lockAction === 'unlock') {
                                   txType = `${lockAction}Mpt` as MptTxType;
                              } else {
                                   throw new Error(`Invalid lock action: ${lockAction}`);
                              }
                              break;
                         }

                         case 'sendMpt': {
                              txType = 'sendMpt' as MptTxType;
                              break;
                         }

                         case 'clawbackMpt': {
                              txType = 'clawbackMpt' as MptTxType;
                              break;
                         }

                         case 'destroyMpt': {
                              txType = 'destroyMpt' as MptTxType;
                              break;
                         }

                         default: {
                              throw new Error(`Unknown tab: ${currentTab}`);
                         }
                    }
                    txResult = await this.mptOrchestratorServiceService.executeMptTx(txType as MptTxType, config);
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) {
               this.toastService.error('Unexpected error when submitting transaction.', AppConstants.TOAST.ERROR);
               return;
          }

          if (currentTab === 'authorizeMpt' || currentTab === 'unauthorizeMpt') {
               await this.updateAuthorizedHolders(config.mpt.mptIssuanceId, config.mpt.destination, currentTab === 'authorizeMpt');
          }

          if (currentTab === 'destroyMpt') {
               // Remove from localStorage when MPT is destroyed
               this.authorizedStorage.removeIssuance(config.mpt.mptIssuanceId);
          }

          await this.handleTxResult(txResult, env.client, env.wallet, '', this.mptStoreService.destination(), '', {});
          this.txUiService.resetCurrentStepToIdle();
     }

     protected override handleCachedAccountObjects(accountObjects: any, address: string): void {
          this.mptStoreService.setField('existingMpts', this.mptUtilService.getMpts(accountObjects, address));
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          this.mptStoreService.setField('existingMpts', this.mptUtilService.getMpts(env.accountObjects, env.wallet.classicAddress));
          this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
     }

     onCanCreateMptChange(canCreate: boolean) {
          this.canCreateMpt.set(canCreate);
     }

     onCanAuthorizeMptChange(canAuthorize: boolean) {
          this.canAuthorizeMpt.set(canAuthorize);
     }

     onMptValidationErrorsChange(errors: string[]) {
          this.mptValidationErrors.set(errors);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.mptStoreService.setField('destination', addr);
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          // Important: update store even for typed (potentially invalid) values
          this.mptStoreService.setField('destination', query);
     }

     private async updateAuthorizedHolders(issuanceId: string, holderAddress: string, isAuthorizing: boolean): Promise<void> {
          const currentHolders = this.mptStoreService.getAuthorizedHolders(issuanceId);

          if (isAuthorizing) {
               // Add if not already present
               if (!currentHolders.includes(holderAddress)) {
                    const newHolders = [...currentHolders, holderAddress];
                    this.mptStoreService.setAuthorizedHolders(issuanceId, newHolders);
                    console.log(`✅ Added ${holderAddress} to authorized holders for ${issuanceId}`);
               }
          } else {
               // Remove holder
               const newHolders = currentHolders.filter(h => h !== holderAddress);
               this.mptStoreService.setAuthorizedHolders(issuanceId, newHolders);
               console.log(`❌ Removed ${holderAddress} from authorized holders for ${issuanceId}`);
          }
     }

     private setRightPanel(): void {
          this.rightPanelService.setPanel({
               summaryComponent: MptSummaryComponent,
               summaryInputs: {
                    info: this.mptTransactionViewModelService.infoData(),
                    tab: this.mptTransactionViewModelService.activeTab(),
                    resetTrigger: this.rightPanelService.resetTrigger(),
               },

               mainComponent: MptRequirementsInfoComponent,
               mainInputs: {
                    activeTab: this.activeTabForRequirements,
               },
          });
     }

     protected clearInputFields() {
          if (this.mptTransactionViewModelService.activeTab() !== 'createMpt') {
               this.mptUtilService.resetFlags();
          }
          this.selectedDestinationAddress.set('');
          this.mptStoreService.resetMptFields();
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.mptUtilService.resetFlags();
               this.mptStoreService.resetMptFields();
          }

          this.selectedDestinationAddress.set('');
          this.txUiService.clearAllOptionsAndMessages();
     }
}
