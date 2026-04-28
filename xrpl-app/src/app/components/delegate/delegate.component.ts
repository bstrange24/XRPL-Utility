import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import * as xrpl from 'xrpl';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { ToastService } from '../../services/utils/toast/toast.service';
import { SelectSearchDropdownComponent } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { ActivatedRoute } from '@angular/router';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { DelegateAction, DelegateActionTypes, DelegateTxConfig } from './constants/delegate.types';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { DelegateTransactionViewModelService } from '../../services/delegate/delegate-transaction-view-model/delegate-transaction-view-model.service';
import { DelegateRequirementInfoComponent } from './ui-components/delegate-requirement-info/delegate-requirement-info.component';
import { DELEGATE_TAB_META, DELEGATE_TABS } from './constants/delegate.ui';
import { DELEGATE_TAB } from './constants/delegate.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { DelegateStoreService } from '../../services/delegate/delegate-store/delegate-store.service';
import { DelegateUtilService } from '../../services/delegate/delegate-util/delegate-util.service';
import { DelegateTransactionOrchestratorService } from '../../services/delegate/delegate-transaction-orchestrator/delegate-transaction-orchestrator.service';
import { LogServiceService } from '../../services/shared/log-service/log-service.service';
import { DelegateSummaryComponent } from './ui-components/delegate-summary/delegate-summary.component';

@Component({
     selector: 'app-delegate',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, SelectSearchDropdownComponent, TabMenuWithInfoComponent, WarningMessageComponent, ExecutionTimeDisplayComponent, TransactionOptionsComponent, DelegateRequirementInfoComponent, DelegateSummaryComponent],
     templateUrl: './delegate.component.html',
     styleUrl: './delegate.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDelegateComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly delegateTransactionOrchestratorService = inject(DelegateTransactionOrchestratorService);
     public readonly delegateUtilService = inject(DelegateUtilService);
     public readonly delegateTransactionViewModelService = inject(DelegateTransactionViewModelService);
     public readonly delegateStore = inject(DelegateStoreService);
     public readonly logService = inject(LogServiceService);
     public readonly cdr = inject(ChangeDetectorRef);

     readonly menuTabs: TabConfig[] = DELEGATE_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = DELEGATE_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, DELEGATE_TAB, tab => this.setTab(tab));
          this.delegateStore.setField('leftActions', this.delegateStore.actions().slice(0, Math.ceil(this.delegateStore.actions().length / 2)));
          this.delegateStore.setField('rightActions', this.delegateStore.actions().slice(Math.ceil(this.delegateStore.actions().length / 2)));
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getAccountDetails(true);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     toggleCreatedDelegations() {
          this.delegateStore.updateField('createdDelegations', val => !val);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: string): Promise<void> {
          if (!DELEGATE_TAB.includes(tab as any)) return;
          this.delegateTransactionViewModelService.activeTab.set(tab as DelegateActionTypes);
          this.clearInputFields();
          if (this.hasWallets()) await this.getAccountDetails(false);
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     toggleSelection(id: number, event?: Event) {
          if (event) event.stopPropagation();

          const currentSelected = this.delegateStore.selected(); // ← call the signal

          if (currentSelected.has(id)) {
               currentSelected.delete(id);
          } else {
               currentSelected.add(id);
          }

          // Update the store (important: create new Set or use updateField)
          this.delegateStore.setField('selected', new Set(currentSelected));
     }

     getSelectedActions(): DelegateAction[] {
          return this.delegateStore.actions().filter(a => this.delegateStore.selected().has(a.id));
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);
          await this.withPerf('getAccountDetails', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.delegateUtilService.getExistingDelegations(env.accountObjects);

                    // this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.toastService.error(error.message || 'Failed to get delegated actions', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.delegateTransactionViewModelService.activeTab();
          const wallet = this.currentWallet();

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeTickets: true,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          const delegateState = this.delegateStore.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: DelegateTxConfig = {
               delegate: delegateState,
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
                         case 'delegateCreate':
                              txResult = await this.delegateTransactionOrchestratorService.executeDelegateTx('delegateCreate', config);
                              break;
                         case 'delegateClear':
                              txResult = await this.delegateTransactionOrchestratorService.executeDelegateTx('delegateClear', config);
                              break;
                    }
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

          await this.handleTxResult(txResult, env.client, env.wallet, '', '', '', { includeTicketObjects: true });
          this.txUiService.resetCurrentStepToIdle();
     }

     async delegateActions(delegate: 'delegateCreate' | 'delegateClear') {
          await this.withPerf('delegateActions', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    let permissions: { Permission: { PermissionValue: string } }[] = [];
                    if (delegate === 'delegateClear') {
                         console.log(`Clearing all delegate objects`);
                    } else {
                         const selectedActions = this.getSelectedActions();
                         console.log(`Selected Actions: `, selectedActions);

                         if (selectedActions.length == 0) {
                              return this.txUiService.setError(`Select a delegate objects to set.`);
                         }

                         if (selectedActions.length > 10) {
                              return this.txUiService.setError(`The max delegate objects must be less than 10.`);
                         }

                         permissions = selectedActions.map(a => ({
                              Permission: {
                                   PermissionValue: a.key,
                              },
                         }));
                         console.log(`permissions: `, permissions);
                    }

                    const delegateSetTx: xrpl.DelegateSet = {
                         TransactionType: 'DelegateSet',
                         Account: wallet.classicAddress,
                         Authorize: '',
                         Permissions: permissions,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, delegateSetTx, wallet, accountInfo, 'delegateActions');

                    // const result = await this.txExecutor.delegateActions(delegateSetTx, wallet, client, {
                    //      useMultiSign: this.xrplTxOptionsStore.useMultiSign(),
                    //      isRegularKeyAddress: this.accountConfiguratorStoreService.isRegularKeyAddress(),
                    //      // isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                    //      // regularKeyAddress: this.txUiService.regularKeyAddress(),
                    //      // regularKeySeed: this.txUiService.regularKeySeed(),
                    //      // multiSignAddress: this.txUiService.multiSignAddress(),
                    //      // multiSignSeeds: this.txUiService.multiSignSeeds(),
                    // });
                    // if (!result.success) return this.txUiService.setError(`${result.error}`);

                    // // this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Delegate action successfully!' : 'Delegate action successfully!';
                    // await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in delegateAction:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
               }
          });
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, delegateSetTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (this.xrplTxOptionsStore.isTicket()) {
               // const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               const ticket = false;
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(delegateSetTx, ticket, true);
               }
          }

          // if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
          //      this.utilsService.setMemoField(delegateSetTx, this.txUiService.memoField());
          // }
     }

     // private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
     //      const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
     //      this.getExistingDelegations(accountObjects, wallet.classicAddress);
     //      destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
     //      if (addDest && destination) this.addNewDestinationFromUser(destination);
     //      // this.refreshUiState(wallet, accountInfo, accountObjects);
     // }

     // private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
     //      await this.walletDataService.refreshWallets(
     //           client,
     //           addresses, // only the addresses to target
     //           (updatedList, newCurrent) => {
     //                this.currentWallet.set({ ...newCurrent });
     //           }
     //      );
     // }

     // private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
     //      await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
     //           this.currentWallet.set({ ...newCurrent });
     //      });
     // }

     // private refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
     //      // Update multi-sign & regular key flags
     //      const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
     //      this.txUiService.regularKeySigningEnabled.set(hasRegularKey);

     //      // Update service state
     //      // this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

     //      const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
     //      const hasSignerList = signerAccounts?.length > 0;
     //      this.txUiService.signerQuorum.set(signerQuorum);
     //      const checkForMultiSigner = signerAccounts?.length > 0;
     //      checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

     //      this.txUiService.multiSigningEnabled.set(hasSignerList);
     //      if (hasSignerList) {
     //           const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
     //           this.txUiService.signers.set(entries);
     //      }

     //      const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };

     //      this.txUiService.regularKeyAddress.set(rkProps.regularKeyAddress);
     //      this.txUiService.regularKeySeed.set(rkProps.regularKeySeed);
     // }

     // private setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
     //      const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
     //      this.txUiService.signers.set(signerEntries);
     //      this.txUiService.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
     //      this.txUiService.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     // }

     // private clearMultiSignersConfiguration(): void {
     //      this.txUiService.signerQuorum.set(0);
     //      this.txUiService.multiSignAddress.set('No Multi-Sign address configured for account');
     //      this.txUiService.multiSignSeeds.set('');
     //      this.storageService.removeValue('signerEntries');
     // }

     // copyDelegateId(checkId: string) {
     //      navigator.clipboard.writeText(checkId).then(() => {
     //           this.txUiService.showToastMessage('Delegate Id copied!');
     //      });
     // }

     clearFields() {
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearDelegateActions() {
          this.delegateStore.setField('selected', new Set<number>());
     }

     protected refreshAccountObject(env: any): void {
          this.updateSharedObjectsStore(env);
          this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);

          // NEW: Always refresh ticket count from the fresh account_objects
          // const ticketObjects = env.accountObjects ? this.ticketsUtilService.filterAccountObjectsByTypes(env.accountObjects, ['Ticket']) : { result: { account_objects: [] } };
          // const newCount = ticketObjects?.result?.account_objects?.length ?? 0;
          // this.xrplTxOptionsStore.setField('walletTicketCount', newCount);
     }

     protected clearInputFields(): void {
          this.destinationSearchQuery.set('');
          this.selectedDestinationAddress.set('');
          this.txUiService.clearAllFields();
          this.xrplTxOptionsStore.setField('selectedTicketSequences', []);
          this.xrplTxOptionsStore.setField('ticketCountField', '');
     }
}
