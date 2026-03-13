import { OnInit, Component, inject, computed, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
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
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { AccountConfiguratorUtilService, XrplAccountFlags } from '../../services/account-configurator/account-configurator-util/account-configurator-util.service';
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

@Component({
     selector: 'app-account-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionOptionsComponent, TransactionPreviewComponent, AccountConfiguratorRequirementsInfoComponent, RouterModule, ExecutionTimeDisplayComponent, WarningMessageComponent],
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

     activeTab = signal<'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey'>('modifyAccountFlags');
     // currentWallet = signal<Wallet>({} as Wallet);
     // infoPanelExpanded = signal<boolean>(false);
     accountInfo = signal<any>(null);
     // wallets = signal<Wallet[]>([]);
     configurationType = signal<'holder' | 'exchanger' | 'issuer' | null>(null);

     // readonly currentAddress = computed(() => this.currentWallet().address);
     // readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     // readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');
     // readonly canSubmit = computed(() => this.isIdle() && this.hasWallets());
     // readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     // // Has wallets → warning handling
     // private readonly _hasWalletsEffect = effect(() => {
     //      console.log('_hasWalletsEffect');
     //      if (this.walletManager.hasWallets()) {
     //           this.txUiService.clearWarning?.();
     //      } else {
     //           this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
     //           this.txUiService.setError('');
     //           this.txUiService.setInfoMessage('');
     //      }
     // });

     // // Effect 2: Wallets list sync
     // private readonly _walletsSyncEffect = effect(() => {
     //      console.log('_walletsSyncEffect');
     //      this.wallets.set(this.walletManager.wallets());
     // });

     // // Effect 3: Selected index change → clear + refresh checks
     // private readonly _selectedIndexEffect = effect(() => {
     //      console.log('_selectedIndexEffect');
     //      // Reading the signal is enough to trigger the effect
     //      this.walletManager.selectedIndex();

     //      this.txUiService.clearAllOptionsAndMessages();

     //      // Fire-and-forget refresh
     //      void this.getAccountDetails(false);
     // });

     readonly infoData = computed(() => {
          if (!this.currentWallet().address) return null;
          if (!this.accountInfo()) return null;

          const walletName = this.currentWallet().name || 'selected';
          const accountFlags = this.accountInfo()?.result?.account_flags;

          // Base message parts
          const messageParts: string[] = [];

          // === Signing method detection ===
          const hasRegularKey = !!this.accountInfo()?.result?.account_data?.RegularKey;
          const masterKeyDisabled = accountFlags?.disableMasterKey;

          if (masterKeyDisabled) {
               if (this.accountConfiguratorUtilService.hasSignerList()) messageParts.push('Multi-signing enabled');
               if (hasRegularKey) messageParts.push('Regular Key configured');
               messageParts.push('Master key permanently disabled');
          } else {
               if (this.accountConfiguratorUtilService.hasSignerList()) messageParts.push('Multi-signing configured');
               if (hasRegularKey) messageParts.push('Regular Key configured');
               messageParts.push('Master key enabled');
          }

          // === Deposit Auth ===
          if (this.txUiService.depositAuthEnabled()) {
               const preauthCount = this.txUiService.depositAuthAddresses().filter(a => a.account).length;
               if (preauthCount > 0) {
                    messageParts.push(`Deposit Authorization enabled (${preauthCount} preauthorized account${preauthCount > 1 ? 's' : ''})`);
               } else {
                    messageParts.push('Deposit Authorization enabled');
               }
          }

          // === Irreversible flags ===
          const irreversible: string[] = [];
          if (accountFlags?.noFreeze) irreversible.push('No Freeze');
          if (accountFlags?.allowTrustLineClawback) irreversible.push('Clawback');

          return {
               walletName,
               hasSpecialConfig: messageParts.length > 0 || irreversible.length > 0,
               configItems: messageParts,
               irreversibleFlags: irreversible,
               hasIrreversible: irreversible.length > 0,
          };
     });

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

     private ensureWalletSelected(): boolean {
          if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
               console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
               return false;
          }
          return true;
     }

     async setTab(tab: 'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey'): Promise<void> {
          this.activeTab.set(tab);

          if (this.hasWallets()) {
               await this.getAccountDetails(false);
          }
     }

     onConfigurationChange() {
          this.accountConfiguratorUtilService.resetFlags();

          const type = this.configurationType() || '';
          const configActions: Record<string, () => void> = {
               holder: () => this.accountConfiguratorUtilService.setHolder(),
               exchanger: () => this.accountConfiguratorUtilService.setExchanger(),
               issuer: () => this.accountConfiguratorUtilService.setIssuer(),
          };

          configActions[type]?.();
          this.accountConfiguratorUtilService.updateFlagTotal();

          console.log('Configuration changed to:', this.configurationType());
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.measure('getAccountDetails', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.configurationType.set(null);

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) return;

                    this.accountInfo.set(env.accountInfo);
                    if (this.activeTab() === 'modifyAccountFlags') {
                         AppConstants.FLAGS.forEach(flag => {
                              const flagKey = AppConstants.FLAGMAP[flag.name as keyof typeof AppConstants.FLAGMAP];
                              if (flagKey) {
                                   if (env && env.accountInfo) {
                                        const isEnabled = !!this.accountInfo().result.account_flags?.[flagKey as keyof typeof env.accountInfo.result.account_flags];
                                        const flagName = flag.name as keyof XrplAccountFlags;
                                        this.accountConfiguratorUtilService.flags[flagName] = isEnabled;
                                   }
                              }
                         });
                         this.accountConfiguratorUtilService.updateFlagTotal();
                    }

                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.acccountDataService.refreshUiStateAccountConfigure(env.wallet, env);
                    if (this.activeTab() === 'modifyMultiSigners') this.txUiService.signerQuorum.set(1);
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async modifyAccountFlags() {
          await this.withPerf('modifyAccountFlags', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

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

                    const result = await this.accountConfiguratorOrchestratorService.executeAccountSetFlagsTx('modifyAccountSetFlags', {
                         wallet: this.currentWallet(),
                         formValues,
                         extra: {
                              operations,
                              setFlags,
                              clearFlags,
                         },
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (!this.txUiService.isSimulateEnabled()) {
                         await this.handleTxResult(result, env, 'Account Flag modification failed');
                    }
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

               if (!this.ensureWalletSelected()) return;

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

                    const result = await this.accountConfiguratorOrchestratorService.executeDepositAuthTx('modifyDepositAuth', {
                         wallet: this.currentWallet(),
                         formValues,
                         extra: {
                              depsositAuthEntries: depsositAuthEntries,
                              formattedDepsositAuthEntries: formattedDepsositAuthEntries,
                              authorizeFlag: authorizeFlag,
                         },
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (!this.txUiService.isSimulateEnabled()) {
                         await this.handleTxResult(result, env, 'setDepositAuthAccounts');
                    }
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

               if (!this.ensureWalletSelected()) return;

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

                    const result = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('modifyMultiSigners', {
                         wallet: this.currentWallet(),
                         formValues,
                         extra: { formattedSignerEntries: formattedSignerEntries, enableMultiSignFlag: enableMultiSignFlag },
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (enableMultiSignFlag === 'Y') {
                         this.storageService.set(env.wallet.classicAddress + 'signerEntries', signerEntries);
                    } else {
                         this.storageService.removeValue(env.wallet.classicAddress + 'signerEntries');
                         this.txUiService.signerQuorum.set(0);
                    }

                    if (!this.txUiService.isSimulateEnabled()) {
                         await this.handleTxResult(result, env, 'Multi-sign failed');
                    }
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

               if (!this.ensureWalletSelected()) return;

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

                    const result = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('modifyRegularKey', {
                         wallet: this.currentWallet(),
                         formValues,
                         extra: { enableRegularKeyFlag: enableRegularKeyFlag },
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (!this.txUiService.isSimulateEnabled()) {
                         const regularKeysAccount = env.wallet.classicAddress + 'regularKey';
                         const regularKeySeedAccount = env.wallet.classicAddress + 'regularKeySeed';
                         if (enableRegularKeyFlag === 'Y') {
                              this.storageService.set(regularKeysAccount, this.txUiService.regularKeyAddress());
                              this.storageService.set(regularKeySeedAccount, this.txUiService.regularKeySeed());
                         } else {
                              this.storageService.removeValue(regularKeysAccount);
                              this.storageService.removeValue(regularKeySeedAccount);
                         }
                    }

                    if (!this.txUiService.isSimulateEnabled()) {
                         await this.handleTxResult(result, env, 'Set Regular Key failed');
                    }
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

               if (!this.ensureWalletSelected()) return;

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

                    const result = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('updateMetaData', {
                         wallet: this.currentWallet(),
                         formValues,
                         extra: {},
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (!this.txUiService.isSimulateEnabled()) {
                         await this.handleTxResult(result, env, 'Failed update account meta data');
                    }
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

               if (!this.ensureWalletSelected()) return;

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

                    const result = await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('modifyMetaData', {
                         wallet: this.currentWallet(),
                         formValues,
                         extra: { enableNftMinter: enableNftMinter },
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (!this.txUiService.isSimulateEnabled()) {
                         await this.handleTxResult(result, env, 'Failed modify NFT Minter address');
                    }
               } catch (error: any) {
                    console.error('Error in setNftMinterAddress:', error);
                    this.toastService.error(error.message || 'Failed to update NFT minter address', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     // private async handleTxResult(result: { success: boolean; error?: string; validationError?: boolean }, env: any, errorMessage: string): Promise<boolean> {
     //      if (!result.success && result.validationError) {
     //           this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
     //           return false;
     //      }

     //      await this.refreshAfterTx(env.wallet);
     //      return true;
     // }

     // private async refreshAfterTx(wallet: xrpl.Wallet): Promise<void> {
     //      const env = await this.txEnvironmentService.prepareTxEnvironment({
     //           includeAccountInfo: true,
     //           includeAccountObject: true,
     //           forceRefresh: true,
     //      });
     //      this.accountInfo.set(env.accountInfo);
     //      this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
     //      this.acccountDataService.refreshUiStateAccountConfigure(wallet, env);
     //      this.txUiService.clearAllOptions();
     // }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }
}
