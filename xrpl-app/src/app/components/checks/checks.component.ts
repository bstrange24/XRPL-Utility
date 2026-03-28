import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { CheckUtilService } from '../../services/checks/checks-util/check-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { TransactionOptionsSectionComponent } from '../shared/transaction-options-section/transaction-options-section.component';
import { CheckCancelItemComponent } from './tab/check-cancel-item/check-cancel-item.component';
import { CheckCreateItemComponent } from './tab/check-create-item/check-create-item.component';
import { CheckCashItemComponent } from './tab/check-cash-item/check-cash-item.component';
import { ActivatedRoute } from '@angular/router';
import { XrplDateService } from '../../core/xrpl-date.service';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { StorageService } from '../../services/local-storage/storage.service';
import { CHECK_TAB } from './constants/checks.constants';
import { CheckActionTypes, CheckTxConfig } from './constants/checks.types';
import { ChecksTransactionViewModelService } from '../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { ChecksStoreService } from '../../services/checks/checks-store/checks-store.service';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { ChecksRequirementInfoComponent } from './ui-components/checks-requirement-info/checks-requirement-info.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { CHECK_TAB_META, CHECK_TABS } from './constants/checks.ui';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../services/util-service/utils.service';
import { ChecksCancelComponent } from './tab/checks-cancel/checks-cancel.component';
import { ChecksCashComponent } from './tab/checks-cash/checks-cash.component';
import { ChecksCreateComponent } from './tab/checks-create/checks-create.component';

@Component({
     selector: 'app-checks',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, TransactionOptionsComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, CheckCreateItemComponent, CheckCancelItemComponent, CheckCashItemComponent, ChecksRequirementInfoComponent,ChecksCreateComponent, ChecksCashComponent,ChecksCancelComponent],
     templateUrl: './checks.component.html',
     styleUrl: './checks.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendChecksComponent extends WalletDestinationBase implements OnInit {
     public readonly walletManagerService = inject(WalletManagerService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly checkTransactionOrchestrator = inject(CheckTransactionOrchestrator);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     public readonly checksStoreService = inject(ChecksStoreService);
     readonly menuTabs: TabConfig[] = CHECK_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = CHECK_TAB_META;

     private readonly createCheckSpecificKeys = ['amountField', 'destinationTagField', 'sourceTagField', 'invoiceIdField', 'currencyCode', 'currencyIssuer'] as const;
     private readonly cashCheckSpecificKeys = ['amountField', 'checkIdField', 'currencyCode', 'currencyIssuer', 'checkCreator', 'suppressIndividualFeedback'] as const;
     private readonly setTrustlineSpecificKeys = ['trustlineLimitField', 'currencyCode', 'currencyIssuer', 'submitAndWait', 'suppressIndividualFeedback'] as const;
     private readonly cancelCheckSpecificKeys = ['checkIdField'] as const;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, CHECK_TAB, tab => this.setTab(tab));
          this.trustlineCurrencyService.preferXrpAsDefault.set(true);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(true);
          this.trustlineCurrencyService.addMptInCurrencyDropdown.set(false);
          this.transactionDropdownService.loadCustomDestinations();
          this.setExpirationToNow();
          // this.trustlineCurrencyService.resetToDefault();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getChecks(false);
     }

     async onCurrencyChange(item: any) {
          const currency = item?.id ?? item ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          await this.syncAfterSelection();
     }

     async onIssuerChange(item: any) {
          const issuer = item?.id ?? item ?? 'XRP';
          this.trustlineCurrencyService.selectIssuer(issuer);
          await this.syncAfterSelection();
     }

     async onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          await this.trustlineUtilService.loadTrustlines(false);
          await this.trustlineCurrencyService.refreshCurrentBalance();
     }

     async onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);

          // Add this: If both currency and issuer are set, fetch env and update flags
          if (this.currencyStoreService.currency() && address) {
               await this.trustlineUtilService.loadTrustlines(false);
          }
     }

     onCheckSelected(item: SelectItem | null) {
          if (item) {
               const [amount] = item.display.split(' ');
               this.txUiService.amountField.set(amount);
          }
          this.checkUtilService.onCheckSelected(item);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
          this.xrplTxOptionsStore.setField('showEnableTrustline', false);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');

          this.trustlineCurrencyService.refreshCurrentBalance();
          this.populateDefaultDateTime();
     }

     private ensureWalletSelected(): boolean {
          if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
               console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
               return false;
          }
          return true;
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     toggleOutstandingIOU() {
          this.trustlineStoreService.setField('outstandingIOUCollapsed', !this.trustlineStoreService.outstandingIOUCollapsed());
     }

     toggleOutstandingChecks() {
          this.checksStoreService.setField('outstandingChecksCollapsed', !this.checksStoreService.outstandingChecksCollapsed());
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     async setTab(tab: string): Promise<void> {
          if (CHECK_TAB.includes(tab as any)) {
               this.checksTransactionViewModelService.activeTab.set(tab as CheckActionTypes);
               this.destinationSearchQuery.set('');
               this.checksStoreService.setField('checkIdSearchQuery', '');

               if (this.hasWallets()) {
                    await this.getChecks();
                    this.setExpirationToNow();
               }
          }
     }

     async getChecks(forceRefresh = false): Promise<void> {
          await this.measure('getChecks', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

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

                    this.refreshAccountObject(env);

                    const currencyValue = this.currencyStoreService.currency() ?? 'XRP';
                    if (currencyValue !== 'XRP' && currencyValue !== 'MPT' && this.currencyStoreService.issuer()) {
                         await this.trustlineUtilService.loadTrustlines(forceRefresh);
                         this.trustlineCurrencyService.selectCurrency(currencyValue);
                    }

                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Failed to load checks:', error);
                    this.toastService.error(error.message || 'Failed to load checks', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction() {
          const currentTab = this.checksTransactionViewModelService.activeTab();
          const wallet = this.currentWallet();

          let destinationAddress = '';
          if (currentTab === 'createCheck') {
               destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
               if (!destinationAddress || !xrpl.isValidAddress(destinationAddress)) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }
               this.selectedDestinationAddress.set(destinationAddress);
               this.checksStoreService.setField('destination', destinationAddress);
          }

          // if (currentTab !== 'createPaymentChannel' && !this.paymentChannelStoreService.channelIDField()) {
          //      this.toastService.error('No channel ID selected.', AppConstants.TOAST.ERROR);
          //      return;
          // }

          // if (currentTab === 'renewPaymentChannel') {
          //      if (!this.paymentChannelViewModelService.isValidRenewTab()) {
          //           this.toastService.error('Invalid renew setup. Ensure you are the source/creator and a channel is selected.');
          //           return;
          //      }

          //      if (!this.paymentChannelViewModelService.isCurrentWalletSource()) {
          //           this.toastService.error('You can only renew a payment channel if you are the creator (source) of the channel.');
          //           return;
          //      }
          // }

          // if (currentTab === 'claimPaymentChannel') {
          //      if (!this.paymentChannelViewModelService.isValidClaimTab()) {
          //           this.toastService.error('Invalid claim setup. Ensure you are the destination and a channel is selected.');
          //           return;
          //      }

          //      if (!this.paymentChannelViewModelService.isCurrentWalletDestination()) {
          //           this.toastService.error('You can only claim from a payment channel if you are the destination account.');
          //           return;
          //      }
          // }

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeDestinationAccountInfo: true,
                    includeChecks: true,
                    destinationAddress,
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (!env) throw new Error('Unable to get environment.');

          // if (currentTab === 'claimPaymentChannel') {
          //      const signatureVerified = await this.xrplService.getChannelVerifiy(env.client, this.paymentChannelStoreService.channelIDField(), this.paymentChannelStoreService.amount(), this.paymentChannelStoreService.publicKeyField(), this.paymentChannelStoreService.channelClaimSignatureField());
          //      if (!signatureVerified.result.signature_verified) {
          //           this.toastService.error('Invalid signature');
          //           return;
          //      }
          // }

          const checkState = this.checksStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: CheckTxConfig = {
               check: checkState,
               account: accountState,
               txOptions: txOptionsState,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'createCheck':
                              txResult = await this.checkTransactionOrchestrator.executeCredentialTx1('createCheck', config);
                              break;
                         case 'cashCheck':
                              txResult = await this.checkTransactionOrchestrator.executeCredentialTx1('cashCheck', config);
                              break;
                         case 'cancelCheck':
                              txResult = await this.checkTransactionOrchestrator.executeCredentialTx1('cancelCheck', config);
                              break;
                    }
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) throw new Error('Unable error when submitting transaction.');

          await this.handleTxResult(txResult, env.client, env.wallet, destinationAddress, this.checksStoreService.destination(), '', { includePaymentChannelObjects: true });
          this.txUiService.resetCurrentStepToIdle();
     }

     // async createCheck(): Promise<void> {
     //      await this.withPerf('createCheck', async () => {
     //           this.txUiService.resetCurrentStepToIdle();
     //           this.txUiService.clearAllOptionsAndMessages();

     //           if (!this.walletManagerService.ensureWalletSelected()) return;

     //           const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

     //           if (!destination) {
     //                this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
     //                return;
     //           }

     //           try {
     //                // this.currencyStoreService.setField('currencyCode', this.trustlineCurrencyService.getSelectedCurrency());
     //                // this.currencyStoreService.setField('currencyIssuer', this.trustlineCurrencyService.selectedIssuer());
     //                // this.txUiService.currencyCode.set(this.trustlineCurrencyService.getSelectedCurrency());
     //                // this.txUiService.currencyIssuer.set(this.trustlineCurrencyService.selectedIssuer());
     //                const env = await this.txEnvironmentService.prepareTxEnvironment({
     //                     includeAccountInfo: true,
     //                     includeAccountObject: true,
     //                     includeFee: true,
     //                     includeLedgerIndex: true,
     //                     includeDestinationAccountInfo: true,
     //                     destinationAddress: destination,
     //                });

     //                if (env.destinationAccountInfo?.result?.account_flags?.disallowIncomingCheck) {
     //                     this.toastService.error(`Destination ${destination} has disallowIncomingCheck enabled. This wallet cannot receive checks.`, AppConstants.TOAST.ERROR);
     //                     return;
     //                }

     //                const result = await this.checkTransactionOrchestrator.executeCheckTx('createCheck', {
     //                     wallet: this.currentWallet(),
     //                     formValues: {
     //                          ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.createCheckSpecificKeys)),
     //                          destinationAddress: destination,
     //                     },
     //                     extra: {
     //                          expiration: this.txUiService.expirationTimeField(),
     //                          enableExpirationDate: this.txUiService.enableExpirationDate(),
     //                     },
     //                     preFetchedEnv: {
     //                          client: env.client,
     //                          accountInfo: env.accountInfo,
     //                          accountObjects: env.accountObjects,
     //                          fee: env.fee!,
     //                          currentLedger: env.currentLedger!,
     //                          destinationAddress: destination,
     //                          wallet: env.wallet,
     //                     },
     //                });

     //                await this.handleTxResult(result, env.client, env.wallet, destination, 'Failed to create check');
     //           } catch (error: any) {
     //                console.error('Error creating check:', error);
     //                this.toastService.error(error.message || 'Error creating check', AppConstants.TOAST.ERROR);
     //           } finally {
     //                this.txUiService.resetCurrentStepToIdle();
     //           }
     //      });
     // }

     // async cashCheck(): Promise<void> {
     //      await this.withPerf('cashCheck', async () => {
     //           this.txUiService.resetCurrentStepToIdle();
     //           this.txUiService.clearAllOptionsAndMessages();

     //           if (!this.walletManagerService.ensureWalletSelected()) return;

     //           const checkId = this.txUiService.checkIdField();
     //           if (!checkId) {
     //                this.toastService.error('Please select a valid Check ID', AppConstants.TOAST.ERROR);
     //                return;
     //           }

     //           try {
     //                const env = await this.txEnvironmentService.prepareTxEnvironment({
     //                     includeAccountInfo: true,
     //                     includeAccountObject: true,
     //                     includeTrustlines: true,
     //                     includeFee: true,
     //                     includeLedgerIndex: true,
     //                     includeChecks: true,
     //                });

     //                const checkObject = await this.xrplService.getCheckByCheckId(env.client, checkId, 'validated');
     //                // Fail fast if not found
     //                if (!checkObject) {
     //                     return this.toastService.error(`No check found with Check ID ${checkId}`, AppConstants.TOAST.ERROR);
     //                }

     //                // Expiration check (only if present)
     //                if (checkObject.Expiration) {
     //                     const currentRippleTime = await this.xrplService.getCurrentRippleTime(env.client);
     //                     if (currentRippleTime >= checkObject.Expiration) {
     //                          return this.toastService.error('This check has expired.', AppConstants.TOAST.ERROR);
     //                     }
     //                }

     //                // Issuer validation (only for IOU checks)
     //                let checkIssuer;

     //                const currencyCode = this.currencyStoreService.currencyCode();
     //                const accountObjects = env.checkObjects?.result.account_objects;
     //                if (accountObjects) {
     //                     if (currencyCode === AppConstants.XRP_CURRENCY) {
     //                          checkIssuer = this.checkUtilService.getIssuerForCheck(accountObjects, checkId, 'XRP');
     //                     } else {
     //                          checkIssuer = this.checkUtilService.getIssuerForCheck(accountObjects, checkId, 'Token');
     //                          if (checkIssuer && this.currencyStoreService.currencyIssuer() !== checkIssuer) {
     //                               return this.toastService.error(`Invalid issuer ${checkIssuer} for this check`, AppConstants.TOAST.ERROR);
     //                          }
     //                     }
     //                }

     //                let trustlinesToCheck: any = env.trustlines;
     //                if (this.xrplTxOptionsStore.showEnableTrustline()) {
     //                     const currencyCode = this.trustlineStoreService.missingTrustlineInfo.currencyCode();
     //                     const currencyIssuer = this.trustlineStoreService.missingTrustlineInfo.issuer();
     //                     if (!currencyCode || !currencyIssuer) return;

     //                     this.txUiService.submitAndWait.set(true);
     //                     this.txUiService.suppressIndividualFeedback.set(true);

     //                     // const resetTrustlinesult = await this.trustlineOrchestratorService.executeTrustlineTx('setTrustline', {
     //                     //      wallet: this.currentWallet(),
     //                     //      formValues: {
     //                     //           ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.setTrustlineSpecificKeys)),
     //                     //      },
     //                     //      extra: {},
     //                     //      preFetchedEnv: {
     //                     //           client: env.client,
     //                     //           accountInfo: env.accountInfo,
     //                     //           checkObjects: env.checkObjects,
     //                     //           fee: env.fee!,
     //                     //           currentLedger: env.currentLedger!,
     //                     //           wallet: env.wallet,
     //                     //      },
     //                     // });

     //                     // if (!resetTrustlinesult.success) {
     //                     //      this.toastService.error(resetTrustlinesult.error || 'Failed to create trustline');
     //                     //      return;
     //                     // }

     //                     // const updatedEnv = await this.txEnvironmentService.prepareTxEnvironment({
     //                     //      includeTrustlines: true,
     //                     //      forceRefresh: true,
     //                     // });

     //                     // trustlinesToCheck = updatedEnv.trustlines ?? [];
     //                }

     //                console.log('trustlinesToCheck:', trustlinesToCheck);

     //                if (currencyCode !== AppConstants.XRP_CURRENCY) {
     //                     const issuer = this.currencyStoreService.currencyIssuer();
     //                     const hasTrustline = await this.trustlineCurrencyService.hasTrustline(trustlinesToCheck, currencyCode, issuer);

     //                     console.log('hasTrustline for', currencyCode, issuer, ':', hasTrustline);

     //                     if (hasTrustline) {
     //                          this.xrplTxOptionsStore.setField('showEnableTrustline', false);
     //                     } else {
     //                          // Fix: show the slider / section when MISSING
     //                          this.xrplTxOptionsStore.setField('showEnableTrustline', true);
     //                          // this.txUiService.missingTrustlineInfo.currencyCode.set(currencyCode);
     //                          // this.txUiService.missingTrustlineInfo.issuer.set(issuer);
     //                          // this.txUiService.trustlineLimitField.set(10000000);

     //                          // Optional: better user message
     //                          this.toastService.error(`No trustline found for ${currencyCode} (${issuer}).\nCashing this check will create a trustline to ${issuer}.`, AppConstants.TOAST.ERROR);
     //                          return;
     //                     }
     //                }

     //                const result = await this.checkTransactionOrchestrator.executeCheckTx('cashCheck', {
     //                     wallet: this.currentWallet(),
     //                     formValues: {
     //                          ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.cashCheckSpecificKeys)),
     //                     },
     //                     extra: {},
     //                     preFetchedEnv: {
     //                          client: env.client,
     //                          accountInfo: env.accountInfo,
     //                          checkObjects: env.checkObjects,
     //                          fee: env.fee!,
     //                          currentLedger: env.currentLedger!,
     //                          wallet: env.wallet,
     //                     },
     //                });

     //                await this.handleTxResult(result, env.client, env.wallet, checkIssuer || '', 'Failed to cash check');
     //           } catch (error: any) {
     //                console.error('Error cashing check:', error);
     //                this.toastService.error(error.message || 'Error cashing check', AppConstants.TOAST.ERROR);
     //           } finally {
     //                this.txUiService.resetCurrentStepToIdle();
     //           }
     //      });
     // }

     // async cancelCheck() {
     //      await this.withPerf('cancelCheck', async () => {
     //           this.txUiService.resetCurrentStepToIdle();
     //           this.txUiService.clearAllOptionsAndMessages();

     //           if (!this.walletManagerService.ensureWalletSelected()) return;

     //           const checkId = this.txUiService.checkIdField();
     //           if (!checkId) {
     //                this.toastService.error('Please select a valid Check ID', AppConstants.TOAST.ERROR);
     //                return;
     //           }

     //           try {
     //                const env = await this.txEnvironmentService.prepareTxEnvironment({
     //                     includeAccountInfo: true,
     //                     includeAccountObject: true,
     //                     includeFee: true,
     //                     includeLedgerIndex: true,
     //                     includeChecks: true,
     //                });

     //                const result = await this.checkTransactionOrchestrator.executeCheckTx('cancelCheck', {
     //                     wallet: this.currentWallet(),
     //                     formValues: {
     //                          ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.cancelCheckSpecificKeys)),
     //                     },
     //                     extra: {},
     //                     preFetchedEnv: {
     //                          client: env.client,
     //                          accountInfo: env.accountInfo,
     //                          accountObjects: env.accountObjects,
     //                          fee: env.fee!,
     //                          currentLedger: env.currentLedger!,
     //                          wallet: env.wallet,
     //                     },
     //                });

     //                await this.handleTxResult(result, env.client, env.wallet, null, 'Failed to cancel check');
     //           } catch (error: any) {
     //                console.error('Error cancelling check:', error);
     //                this.toastService.error(error.message || 'Error cancelling check', AppConstants.TOAST.ERROR);
     //           } finally {
     //                this.txUiService.resetCurrentStepToIdle();
     //           }
     //      });
     // }

     protected refreshAccountObject(env: any): void {
          this.checksStoreService.setField('existingChecks', this.checkUtilService.getExistingChecks(env.accountObjects, env.wallet.classicAddress));
          this.checksStoreService.setField('cashableChecks', this.checkUtilService.getCashableChecks(env.accountObjects, env.wallet.classicAddress));
          this.checksStoreService.setField('cancellableChecks', this.checkUtilService.getCancelableChecks(env.accountObjects, env.wallet.classicAddress));
          // this.existingMpts.set(this.mptUtilService.getExistingMpts(accountObjects, address));
          this.checksStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, env.wallet.classicAddress));
     }

     toggleOptions(enabled: boolean): void {
          this.txUiService.wantsOptions.set(enabled);
          if (!enabled) this.txUiService.clearOptionalInputFields();
     }

     addCheckToExpiration(seconds: number): void {
          this.checkUtilService.addToDateTimeField(this.txUiService.expirationTimeField, this.txUiService.expirationTimeField, seconds);
     }

     setExpirationToNow(): void {
          this.txUiService.expirationTimeField.set(this.xrplDateService.toLocalDateTimeString(new Date()));
     }

     toggleExpiration(enabled: boolean): void {
          this.txUiService.enableExpirationDate.set(enabled);
          if (enabled && !this.txUiService.expirationTimeField()) {
               this.setExpirationToNow();
          } else if (!enabled) {
               this.txUiService.expirationTimeField.set('');
          }
     }

     clearExpiration(): void {
          this.txUiService.expirationTimeField.set('');
     }

     isValidExpiration(): boolean {
          if (!this.txUiService.expirationTimeField()) return true;
          const selected = new Date(this.txUiService.expirationTimeField());
          return selected > new Date();
     }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }

     private async syncAfterSelection(load = true) {
          if (load) await this.trustlineUtilService.loadTrustlines();
          await this.trustlineCurrencyService.refreshCurrentBalance();
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          this.checksStoreService.setField('checkIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.checksStoreService.setField('destination', addr);
     }

     populateDefaultDateTime() {
          this.checksStoreService.setField('checkExpirationDate', '');
     }

     protected clearInputFields(): void {
          this.selectedDestinationAddress.set('');
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.setExpirationToNow();
     }
}
