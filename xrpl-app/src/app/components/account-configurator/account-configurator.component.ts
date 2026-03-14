import { OnInit, Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { AccountConfiguratorUtilService } from '../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AccountConfiguratorOrchestratorService } from '../../services/account-configurator/account-configurator-orchestrator/account-configurator-orchestrator.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { animation, toastAnimation } from '../../services/animations/animations.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { AccountConfiguratorRequirementsInfoComponent } from './ui-components/account-configurator-requirements-info/account-configurator-requirements-info.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
// import { AccountConfig, AccountConfigTxType, XrplAccountFlags } from './constants/account-configurator-constants';
import { SelectItem } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { AccountConfiguratorViewModelService } from '../../services/account-configurator/account-configurator-view-model/ccount-configurator-view-model.service';
import { AccountConfiguratorStoreService } from '../../services/account-configurator/account-configurator-store/Account-configurator-store.service';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { AccountConfig, AccountConfigAction, XrplAccountFlags } from './constants/account-configurator.types';

@Component({
     selector: 'app-account-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionOptionsComponent, TransactionPreviewComponent, AccountConfiguratorRequirementsInfoComponent, RouterModule, ExecutionTimeDisplayComponent, WarningMessageComponent, TabMenuWithInfoComponent],
     animations: [animation, toastAnimation],
     templateUrl: './account-configurator.component.html',
     styleUrl: './account-configurator.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountConfiguratorComponent extends WalletDestinationBase implements OnInit {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactions = inject(XrplTransactionService);
     public accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     public readonly accountConfiguratorOrchestratorService = inject(AccountConfiguratorOrchestratorService);
     public readonly storageService = inject(StorageService);
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ['modifyAccountFlags', 'modifyMetaData', 'modifyDepositAuth', 'modifyMultiSigners', 'modifyRegularKey'] as const, tab => this.setTab(tab));
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
          this.txUiService.clearAllOptions();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getAccountDetails(true);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     async setTab(tab: string): Promise<void> {
          const validTabs = ['modifyAccountFlags', 'modifyDepositAuth', 'modifyMetaData', 'modifyMultiSigners', 'modifyRegularKey'] as const;
          if (validTabs.includes(tab as any)) {
               this.accountConfiguratorViewModelService.activeTab.set(tab as 'modifyAccountFlags' | 'modifyDepositAuth' | 'modifyMetaData' | 'modifyMultiSigners' | 'modifyRegularKey');
               if (this.hasWallets()) await this.getAccountDetails(false);
          }
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.measure('getAccountDetails', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.accountConfiguratorStoreService.set('configurationType', null);

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) return;

                    const currentTab = this.accountConfiguratorViewModelService.activeTab();
                    this.accountConfiguratorStoreService.set('accountInfo', env.accountInfo);

                    if (currentTab === 'modifyAccountFlags') {
                         AppConstants.FLAGS.forEach(flag => {
                              const flagKey = AppConstants.FLAGMAP[flag.name as keyof typeof AppConstants.FLAGMAP];
                              if (flagKey) {
                                   if (env && env.accountInfo) {
                                        const isEnabled = !!this.accountConfiguratorStoreService.get('accountInfo').result.account_flags?.[flagKey as keyof typeof env.accountInfo.result.account_flags];
                                        const flagName = flag.name as keyof XrplAccountFlags;
                                        this.accountConfiguratorUtilService.flags[flagName] = isEnabled;
                                   }
                              }
                         });
                         this.accountConfiguratorUtilService.updateFlagTotal();
                    }

                    this.refreshAccountObject(env);
                    if (currentTab === 'modifyMultiSigners') this.txUiService.signerQuorum.set(1);
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.accountConfiguratorViewModelService.activeTab();
          let txResult: { success: boolean; error?: string } | null = null;
          let envRef: any = null;

          // 1. Common reset & guard clauses
          this.txUiService.resetCurrentStepToIdle();
          this.txUiService.clearAllOptionsAndMessages();

          if (!this.walletManagerService.ensureWalletSelected()) return;

          const walletVm = this.walletManager.walletVm();

          // 3. Map tab → action type
          let action: AccountConfigAction = currentTab;
          switch (currentTab) {
               case 'modifyAccountFlags':
                    action = 'modifyAccountFlags';
                    break;
               case 'modifyDepositAuth':
                    action = 'modifyDepositAuth';
                    return;
               case 'modifyMetaData':
                    action = 'modifyMetaData';
                    break;
               case 'modifyMultiSigners':
                    action = 'modifyMultiSigners';
                    return;
               case 'modifyRegularKey':
                    action = 'modifyRegularKey';
                    return;
               default:
                    this.toastService.error('Unknown action', AppConstants.TOAST.ERROR);
                    return;
          }

          // 4. Fetch environment once for this transaction
          await this.withPerf('performAction', async () => {
               try {
                    envRef = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                    });
               } catch (err: any) {
                    console.error(err);
                    this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
                    return;
               }

               // 5. Build the orchestrator config
               const config: AccountConfig = {
                    wallet: walletVm.wallet!,
                    simulate: this.txUiService.isSimulateEnabled(),
                    multiSign: this.txUiService.useMultiSign(),
                    amountField: '',
                    destinationAddress: '',
                    nfTokenMinterAddress: '',
                    setFlags: {},
                    clearFlags: {},
                    tickSize: 0,
                    transferRate: 0,
                    publicKey: '',
                    domain: '',
                    isMessageKey: true,
                    enableNftMinter: '',
                    preFetchedEnv: envRef,
               };

               // 6. Execute
               //  'modifyAccountSetFlags' | 'modifyAccountFlags' | 'updateMetaData' | 'modifyDepositAuth' | 'modifyMetaData' | 'modifyMultiSigners' | 'modifyRegularKey';
               try {
                    switch (currentTab) {
                         case 'modifyAccountFlags':
                              txResult = await this.accountConfiguratorOrchestratorService.executeAccountSetFlagsTx(action, config);
                              break;
                         //      case 'modifyDepositAuth':
                         //           txResult = await this.accountConfiguratorOrchestratorService.executeDepositAuthTx('modifyDepositAuth', config);
                         //           break;
                         //      case 'modifyMetaData':
                         //           txResult = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx(action as AccountConfigTxType, config);
                         //           break;
                         //      case 'modifyMultiSigners':
                         //           txResult = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx(action as AccountConfigTxType, config);
                         //           break;
                         //      case 'modifyRegularKey':
                         //           txResult = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx(action as AccountConfigTxType, config);
                         //           break;
                    }
               } catch (err: any) {
                    console.error(`Error in ${action}`, err);
                    this.toastService.error(err.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               }
          });

          // 7. Handle result & side effects
          if (txResult) {
               const successFullTx: boolean = await this.handleTxResult(txResult, envRef.client, envRef.wallet, '', '', '');
               // if (currentTab === 'delete' && successFullTx && !this.txUiService.isSimulateEnabled()) {
               // this.credentialStore.resetCredentialIdDropDown();
               // }
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     async modifyAccountFlags() {
          await this.withPerf('modifyAccountFlags', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeServerInfo: true,
                    });

                    if (!env.accountInfo) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    const { setFlags, clearFlags } = this.utilsService.getFlagUpdates(env.accountInfo.result.account_flags);

                    if (setFlags.length === 0 && clearFlags.length === 0) {
                         this.toastService.info('No flag changes detected', AppConstants.TOAST.INFO);
                         return;
                    }

                    const operations: Array<{ operation: 'SetFlag' | 'ClearFlag'; flagValue: string; flagName: string }> = [];

                    setFlags.forEach(f => {
                         operations.push({
                              operation: 'SetFlag',
                              flagValue: f,
                              flagName: this.utilsService.getFlagName(f),
                         });
                    });

                    clearFlags.forEach(f => {
                         operations.push({
                              operation: 'ClearFlag',
                              flagValue: f,
                              flagName: this.utilsService.getFlagName(f),
                         });
                    });

                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.accountConfiguratorUtilService.modifyAccountFlagsSpecificKeys)),
                    };

                    // const result = await this.accountConfiguratorOrchestratorService.executeAccountSetFlagsTx('modifyAccountSetFlags', {
                    //      wallet: this.currentWallet(),
                    //      formValues,
                    //      extra: {
                    //           operations,
                    //           setFlags,
                    //           clearFlags,
                    //      },
                    //      preFetchedEnv: {
                    //           client: env.client,
                    //           accountInfo: env.accountInfo,
                    //           fee: env.fee!,
                    //           currentLedger: env.currentLedger!,
                    //           wallet: env.wallet,
                    //      },
                    // });

                    // if (!this.txUiService.isSimulateEnabled()) {
                    //      await this.handleTxResult(result, env, 'Account Flag modification failed');
                    // }
               } catch (error: any) {
                    console.error('Error in modifyAccountFlags:', error);
                    this.toastService.error(error.message || 'Failed to update account flags', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async setDepositAuthAccounts(authorizeFlag: 'Y' | 'N'): Promise<void> {
          await this.withPerf('setDepositAuthAccounts', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               // Split and validate deposit auth addresses
               let depsositAuthEntries = this.accountConfiguratorUtilService.createDepsoitAuthEntries();
               const formattedDepsositAuthEntries = this.accountConfiguratorUtilService.formatDepositAuthEntries(depsositAuthEntries);
               if (!formattedDepsositAuthEntries.length) {
                    this.toastService.error('Deposit Auth address list is empty', AppConstants.TOAST.ERROR);
                    return;
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (!env.accountInfo || !env.accountObjects) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.accountConfiguratorUtilService.modifyDepositAuthSpecificKeys)),
                    };

                    // const result = await this.accountConfiguratorOrchestratorService.executeDepositAuthTx('modifyDepositAuth', {
                    //      wallet: this.currentWallet(),
                    //      formValues,
                    //      extra: {
                    //           depsositAuthEntries: depsositAuthEntries,
                    //           formattedDepsositAuthEntries: formattedDepsositAuthEntries,
                    //           authorizeFlag: authorizeFlag,
                    //      },
                    //      preFetchedEnv: {
                    //           client: env.client,
                    //           accountInfo: env.accountInfo,
                    //           accountObjects: env.accountObjects,
                    //           fee: env.fee!,
                    //           currentLedger: env.currentLedger!,
                    //           wallet: env.wallet,
                    //      },
                    // });

                    // if (!this.txUiService.isSimulateEnabled()) {
                    //      await this.handleTxResult(result, env, 'setDepositAuthAccounts');
                    // }
               } catch (error: any) {
                    console.error('Error in setDepositAuthAccounts:', error);
                    this.toastService.error(error.message || 'Failed to set deposit authorization', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async setMultiSign(enableMultiSignFlag: 'Y' | 'N') {
          await this.withPerf('enableMultiSignFlag', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    console.info(`enableMultiSignFlag:`, enableMultiSignFlag);
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (!env.accountInfo || !env.accountObjects) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    // Create array of signer accounts and their weights
                    let signerEntries = this.accountConfiguratorUtilService.createSignerEntries();

                    // Format SignerEntries for XRPL transaction
                    const formattedSignerEntries = this.accountConfiguratorUtilService.formatSignerEntries(signerEntries);
                    if (!formattedSignerEntries.length) {
                         this.toastService.error('Multi Signer list is empty', AppConstants.TOAST.ERROR);
                         return;
                    }

                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.accountConfiguratorUtilService.modifyMultiSignSpecificKeys)),
                    };

                    // const result = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('modifyMultiSigners', {
                    //      wallet: this.currentWallet(),
                    //      formValues,
                    //      extra: { formattedSignerEntries: formattedSignerEntries, enableMultiSignFlag: enableMultiSignFlag },
                    //      preFetchedEnv: {
                    //           client: env.client,
                    //           accountInfo: env.accountInfo,
                    //           accountObjects: env.accountObjects,
                    //           fee: env.fee!,
                    //           currentLedger: env.currentLedger!,
                    //           wallet: env.wallet,
                    //      },
                    // });

                    // if (enableMultiSignFlag === 'Y') {
                    //      this.storageService.set(env.wallet.classicAddress + 'signerEntries', signerEntries);
                    // } else {
                    //      this.storageService.removeValue(env.wallet.classicAddress + 'signerEntries');
                    //      this.txUiService.signerQuorum.set(0);
                    // }

                    // if (!this.txUiService.isSimulateEnabled()) {
                    //      await this.handleTxResult(result, env, 'Multi-sign failed');
                    // }
               } catch (error: any) {
                    console.error('Error in setMultiSign:', error);
                    this.toastService.error(error.message || 'Failed to set multi-sign', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async setRegularKey(enableRegularKeyFlag: 'Y' | 'N') {
          await this.withPerf('setRegularKey', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (!env.accountInfo || !env.accountObjects) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.accountConfiguratorUtilService.modifyRegularKeySpecificKeys)),
                    };

                    // const result = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('modifyRegularKey', {
                    //      wallet: this.currentWallet(),
                    //      formValues,
                    //      extra: { enableRegularKeyFlag: enableRegularKeyFlag },
                    //      preFetchedEnv: {
                    //           client: env.client,
                    //           accountInfo: env.accountInfo,
                    //           accountObjects: env.accountObjects,
                    //           fee: env.fee!,
                    //           currentLedger: env.currentLedger!,
                    //           wallet: env.wallet,
                    //      },
                    // });

                    // if (!this.txUiService.isSimulateEnabled()) {
                    //      const regularKeysAccount = env.wallet.classicAddress + 'regularKey';
                    //      const regularKeySeedAccount = env.wallet.classicAddress + 'regularKeySeed';
                    //      if (enableRegularKeyFlag === 'Y') {
                    //           this.storageService.set(regularKeysAccount, this.txUiService.regularKeyAddress());
                    //           this.storageService.set(regularKeySeedAccount, this.txUiService.regularKeySeed());
                    //      } else {
                    //           this.storageService.removeValue(regularKeysAccount);
                    //           this.storageService.removeValue(regularKeySeedAccount);
                    //      }
                    // }

                    // if (!this.txUiService.isSimulateEnabled()) {
                    //      await this.handleTxResult(result, env, 'Set Regular Key failed');
                    // }
               } catch (error: any) {
                    console.error('Error in setRegularKey:', error);
                    this.toastService.error(error.message || 'Failed to set regular key', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async updateMetaData() {
          await this.withPerf('updateMetaData', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (!env.accountInfo) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.accountConfiguratorUtilService.updateMetaDataSpecificKeys)),
                    };

                    if (!this.accountConfiguratorUtilService.hasFieldsToUpdate(env)) {
                         this.toastService.warn('No meta data fields selected for modification.');
                         return;
                    }

                    // const result = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('updateMetaData', {
                    //      wallet: this.currentWallet(),
                    //      formValues,
                    //      extra: {},
                    //      preFetchedEnv: {
                    //           client: env.client,
                    //           accountInfo: env.accountInfo,
                    //           accountObjects: env.accountObjects,
                    //           fee: env.fee!,
                    //           currentLedger: env.currentLedger!,
                    //           wallet: env.wallet,
                    //      },
                    // });

                    // if (!this.txUiService.isSimulateEnabled()) {
                    //      await this.handleTxResult(result, env, 'Failed update account meta data');
                    // }
               } catch (error: any) {
                    console.error('Error in updateMetaData:', error);
                    this.toastService.error(error.message || 'Failed to update meta data', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async setNftMinterAddress(enableNftMinter: 'Y' | 'N') {
          await this.withPerf('setNftMinterAddress', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (!env.accountInfo || !env.accountObjects) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.accountConfiguratorUtilService.modifyNftMinterSpecificKeys)),
                         nfTokenMinterAddress: this.txUiService.nfTokenMinterAddress(),
                    };

                    // const result = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('modifyMetaData', {
                    //      wallet: this.currentWallet(),
                    //      formValues,
                    //      extra: { enableNftMinter: enableNftMinter },
                    //      preFetchedEnv: {
                    //           client: env.client,
                    //           accountInfo: env.accountInfo,
                    //           accountObjects: env.accountObjects,
                    //           fee: env.fee!,
                    //           currentLedger: env.currentLedger!,
                    //           wallet: env.wallet,
                    //      },
                    // });

                    // if (!this.txUiService.isSimulateEnabled()) {
                    //      await this.handleTxResult(result, env, 'Failed modify NFT Minter address');
                    // }
               } catch (error: any) {
                    console.error('Error in setNftMinterAddress:', error);
                    this.toastService.error(error.message || 'Failed to update NFT minter address', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     protected refreshAccountObject(env: any): void {
          this.accountConfiguratorStoreService.set('accountInfo', env.accountInfo);
          this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
          this.acccountDataService.refreshUiStateAccountConfigure(env.wallet, env);
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
}
