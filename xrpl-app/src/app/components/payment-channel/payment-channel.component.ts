import { Component, OnInit, inject, ChangeDetectionStrategy, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import { ToastService } from '../../services/utils/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { PaymentChannelUtilService } from '../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { PaymentChannelOrchestratorService } from '../../services/payment-channel/payment-channel-orchestrator/payment-channel-orchestrator.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { ActivatedRoute } from '@angular/router';
import { XrplDateService } from '../../core/xrpl-date.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { PaymentChannelRequirementsInfoComponent } from './ui-components/payment-channel-requirements-info/payment-channel-requirements-info.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { PaymentChannelViewModelService } from '../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PAYMENT_CHANNEL_TAB_META, PAYMENT_CHANNEL_TABS } from './constants/payment-channel.ui';
import { PAYMENT_CHANNEL_TAB } from './constants/payment-channel.constants';
import { PaymentChannelActionTypes, PaymentChannelObject, PaymentChannelTxConfig, UnifiedPaymentChannel } from './constants/payment-channel.types';
import { PaymentChannelStoreService } from '../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { PaymentChannelSummaryComponent } from './ui-components/payment-channel-summary/payment-channel-summary.component';
import { PaymentChannelCreateComponent } from './tab/payment-channel-create/payment-channel-create.component';
import { PaymentChannelFundComponent } from './tab/payment-channel-fund/payment-channel-fund.component';
import { PaymentChannelClaimComponent } from './tab/payment-channel-claim/payment-channel-claim.component';
import { PaymentChannelCloseComponent } from './tab/payment-channel-close/payment-channel-close.component';
import { PaymentChannelRenewComponent } from './tab/payment-channel-renew/payment-channel-renew.component';
import { PaymentChannelFlagsComponent } from './tab/payment-channel-flags/payment-channel-flags.component';
import { Subscription } from 'rxjs';
import { PaymentChannelSignatureContextService } from '../../services/payment-channel/payment-channel-signature-context/payment-channel-signature-context.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';

@Component({
     selector: 'app-account',
     standalone: true,
     imports: [
          CommonModule,
          FormsModule,
          LucideAngularModule,
          NavbarComponent,
          OverlayModule,
          TransactionPreviewComponent,
          TransactionOptionsComponent,
          PaymentChannelRequirementsInfoComponent,
          ExecutionTimeDisplayComponent,
          TabMenuWithInfoComponent,
          PaymentChannelSummaryComponent,
          PaymentChannelCreateComponent,
          PaymentChannelFundComponent,
          PaymentChannelRenewComponent,
          PaymentChannelClaimComponent,
          PaymentChannelCloseComponent,
          PaymentChannelFlagsComponent,
          WalletPanelComponent,
          WarningMessageComponent,
     ],
     templateUrl: './payment-channel.component.html',
     styleUrl: './payment-channel.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePaymentChannelComponent extends WalletDestinationBase implements OnInit, OnDestroy {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly paymentChannelOrchestratorService = inject(PaymentChannelOrchestratorService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly paymentChannelViewModelService = inject(PaymentChannelViewModelService);
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly paymentChannelSignatureContextService = inject(PaymentChannelSignatureContextService);
     private readonly signatureSubscription: Subscription = new Subscription();
     private readonly signatureEffect: any;
     readonly menuTabs: TabConfig[] = PAYMENT_CHANNEL_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = PAYMENT_CHANNEL_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();

          this.signatureEffect = effect(() => {
               const signature = this.paymentChannelStoreService.channelClaimSignatureField();
               if (signature) {
                    this.paymentChannelUtilService.loadFlagsFromSignature(signature);
               }
          });
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, PAYMENT_CHANNEL_TAB, tab => this.setTab(tab));
          this.transactionDropdownService.loadCustomDestinations();

          const signature = this.route.snapshot.queryParams['signature'];
          if (signature) {
               const context = this.paymentChannelSignatureContextService.getSignatureContext(signature);
               if (context) {
                    this.paymentChannelStoreService.setField('channelClaimSignatureField', signature);
                    this.paymentChannelStoreService.setField('channelIDField', context.channelId);
                    this.paymentChannelStoreService.setField('amount', context.amount);

                    // Load flags from context
                    if (context.flags) {
                         this.paymentChannelStoreService.updateField('flags', () => ({
                              renew: context.flags.renew ?? false,
                              close: context.flags.close ?? true,
                              claimAndClose: context.flags.claimAndClose ?? false,
                         }));
                         this.paymentChannelUtilService.updateFlagTotal();
                    }
               }
          }
     }

     ngOnDestroy() {
          // Clean up effect
          if (this.signatureEffect) {
               this.signatureEffect.destroy();
          }

          // Clean up subscription if using toObservable
          if (this.signatureSubscription) {
               this.signatureSubscription.unsubscribe();
          }
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getPaymentChannels(true);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
          this.populateDefaultDateTime();
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     async setTab(tab: string): Promise<void> {
          if (PAYMENT_CHANNEL_TAB.includes(tab as any)) {
               this.paymentChannelViewModelService.activeTab.set(tab as PaymentChannelActionTypes);
               this.destinationSearchQuery.set('');
               this.paymentChannelStoreService.setField('isCreatorMode', false);
               this.paymentChannelUtilService.clearFlagsValue();

               if (this.hasWallets()) {
                    await this.getPaymentChannels(false);
                    this.populateDefaultDateTime();
               }
          }
     }

     async getPaymentChannels(forceRefresh = false): Promise<void> {
          await this.measure('getPaymentChannels', true, async () => {
               // Reset all fields and options
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.txUiService.resetCurrentStepToIdle();
               this.paymentChannelStoreService.resetChannelIdSelection();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includePaymentChannelObjects: true,
                         forceRefresh: forceRefresh,
                    });

                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.paymentChannelUtilService.clearInputFields();
               } catch (error: any) {
                    console.error('Error in getPaymentChannels:', error);
                    this.toastService.error(error.message || 'Error getting payment channel detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async handlePaymentChannelAction() {
          const currentTab = this.paymentChannelViewModelService.activeTab();
          const wallet = this.currentWallet();

          let destinationAddress = '';
          if (currentTab === 'createPaymentChannel') {
               destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
               if (!destinationAddress || !xrpl.isValidAddress(destinationAddress)) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }
               this.selectedDestinationAddress.set(destinationAddress);
               this.paymentChannelStoreService.setField('destination', destinationAddress);
          }

          if (currentTab !== 'createPaymentChannel' && !this.paymentChannelStoreService.channelIDField()) {
               this.toastService.error('No channel ID selected.', AppConstants.TOAST.ERROR);
               return;
          }

          if (currentTab === 'renewPaymentChannel') {
               if (!this.paymentChannelViewModelService.isValidRenewTab()) {
                    this.toastService.error('Invalid renew setup. Ensure you are the source/creator and a channel is selected.');
                    return;
               }

               if (!this.paymentChannelViewModelService.isCurrentWalletSource()) {
                    this.toastService.error('You can only renew a payment channel if you are the creator (source) of the channel.');
                    return;
               }
          }

          if (currentTab === 'claimPaymentChannel') {
               if (!this.paymentChannelViewModelService.isValidClaimTab()) {
                    this.toastService.error('Invalid claim setup. Ensure you are the destination and a channel is selected.');
                    return;
               }

               if (!this.paymentChannelViewModelService.isCurrentWalletDestination()) {
                    this.toastService.error('You can only claim from a payment channel if you are the destination account.');
                    return;
               }
          }

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeDestinationAccountInfo: true,
                    includePaymentChannelObjects: true,
                    destinationAddress,
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (!env) throw new Error('Unable to get environment.');

          if (currentTab === 'claimPaymentChannel') {
               const signatureVerified = await this.xrplService.getChannelVerifiy(env.client, this.paymentChannelStoreService.channelIDField(), this.paymentChannelStoreService.amount(), this.paymentChannelStoreService.publicKeyField(), this.paymentChannelStoreService.channelClaimSignatureField());
               if (!signatureVerified.result.signature_verified) {
                    this.toastService.error('Invalid signature');
                    return;
               }
          }

          const paymentChannelState = this.paymentChannelStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: PaymentChannelTxConfig = {
               paymentChannel: paymentChannelState,
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
                         case 'createPaymentChannel':
                              txResult = await this.paymentChannelOrchestratorService.executePaymentChannelTx('createPaymentChannel', config);
                              break;
                         case 'fundPaymentChannel':
                              txResult = await this.paymentChannelOrchestratorService.executePaymentChannelTx('fundPaymentChannel', config);
                              break;
                         case 'claimPaymentChannel':
                              txResult = await this.paymentChannelOrchestratorService.executePaymentChannelTx('claimPaymentChannel', config);
                              break;
                         case 'renewPaymentChannel':
                              txResult = await this.paymentChannelOrchestratorService.executePaymentChannelTx('renewPaymentChannel', config);
                              break;
                         case 'closePaymentChannel':
                              txResult = await this.paymentChannelOrchestratorService.executePaymentChannelTx('closePaymentChannel', config);
                              break;
                    }
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) throw new Error('Unexpected error when submitting transaction.');

          await this.handleTxResult(txResult, env.client, env.wallet, destinationAddress, this.paymentChannelStoreService.destination(), '', { includePaymentChannelObjects: true });
          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          if (env.accountObjects?.result?.account_objects) {
               this.paymentChannelUtilService.processPaymentChannels(env.accountObjects?.result?.account_objects as PaymentChannelObject[], env.wallet.classicAddress);
               this.paymentChannelStoreService.setField('walletPaymentChannelCount', env.accountObjects?.result?.account_objects?.length);
          }
     }

     getClaimAndCloseTooltip(): string {
          if (this.paymentChannelStoreService.isCreatorMode()) {
               return 'Adding this flag allows the recipient to claim AND close the channel in one transaction. ' + 'The recipient must include this exact signature to close the channel.';
          } else {
               return 'If the creator included the tfClose flag in their signature, you can claim and close ' + 'the channel in one transaction. Check the signature hex to verify.';
          }
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          this.paymentChannelStoreService.setField('paymentChannelIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.paymentChannelStoreService.setField('destination', addr);
     }

     paymentChannelSelected(event: UnifiedPaymentChannel) {
          this.paymentChannelUtilService.selectPaymentChannelFromList(event, this.paymentChannelViewModelService.activeTab());
     }

     populateDefaultDateTime() {
          this.paymentChannelStoreService.setField('paymentChannelCancelAfterTimeField', '');
     }

     async generateCreatorClaimSignature() {
          this.paymentChannelUtilService.generateCreatorClaimSignature(this.currentWallet());
     }

     protected clearInputFields(): void {
          this.selectedDestinationAddress.set('');
          this.txUiService.clearAllOptionsAndMessages();
     }
}
