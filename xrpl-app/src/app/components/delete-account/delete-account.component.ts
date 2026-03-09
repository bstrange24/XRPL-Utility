import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import * as xrpl from 'xrpl';
import { AppConstants, BLOCKER_MAP } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { ToastService } from '../../services/toast/toast.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { DeleteAccountOrchestratorService } from '../../services/delete-account/delete-account-orchestrator/delete-account-orchestrator.service';
import { DeleteAccountRequirementsInfoComponent } from './delete-account-requirements-info/delete-account-requirements-info/delete-account-requirements-info.component';
import { DeleteAccountUtilService } from '../../services/delete-account/delete-account-util/delete-account-util.service';
import { RouterModule } from '@angular/router';

type Blocker = {
     label: string;
     count: number;
     route: string;
     tab?: string;
};

@Component({
     selector: 'app-delete-account',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, SelectSearchDropdownComponent, DeleteAccountRequirementsInfoComponent, RouterModule],
     templateUrl: './delete-account.component.html',
     styleUrl: './delete-account.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAccountComponent extends PerformanceBaseComponent implements OnInit {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly acccountDataService = inject(AcccountDataService);
     private readonly walletManager = inject(WalletManagerService);
     private readonly deleteAccountOrchestratorService = inject(DeleteAccountOrchestratorService);
     public readonly deleteAccountUtilService = inject(DeleteAccountUtilService);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     activeTab = signal<'deleteAccount'>('deleteAccount');
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal<boolean>(false);
     wallets = signal<Wallet[]>([]);
     selectedWalletIndex = signal<number>(0);
     savedTxJson = signal<any[]>([]);
     savedTxResult = signal<any[]>([]);

     // Delete account State
     accountInfo = signal<any>(null);
     serverInfo = signal<any>(null);
     accountObjects = signal<any>(null);
     blockingObjects = signal<any>(null);

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');
     readonly canSubmit = computed(() => this.isIdle() && this.hasWallets());
     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     // Has wallets → warning handling
     private readonly _hasWalletsEffect = effect(() => {
          console.log('_hasWalletsEffect');
          if (this.walletManager.hasWallets()) {
               this.txUiService.clearWarning?.();
          } else {
               this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
               this.txUiService.setError('');
               this.txUiService.setInfoMessage('');
          }
     });

     // Effect 2: Wallets list sync
     private readonly _walletsSyncEffect = effect(() => {
          console.log('_walletsSyncEffect');
          this.wallets.set(this.walletManager.wallets());
     });

     // Effect 3: Selected index change → clear + refresh checks
     private readonly _selectedIndexEffect = effect(() => {
          console.log('_selectedIndexEffect');
          // Reading the signal is enough to trigger the effect
          this.walletManager.selectedIndex();

          this.txUiService.clearAllOptionsAndMessages();

          // Fire-and-forget refresh
          void this.getAccountDetails(true);

          // Restore previous transaction info
          this.txUiService.setTxResultSignal(this.savedTxJson());
          this.txUiService.setTxResultSignal(this.savedTxResult());
     });

     readonly accountObjectCounts = computed(() => {
          const blockingObjects = this.blockingObjects()?.result?.account_objects ?? [];
          const counts: Record<string, number> = {};
          for (const obj of blockingObjects) {
               const type = obj.LedgerEntryType;
               counts[type] = (counts[type] || 0) + 1;
          }
          return counts;
     });

     readonly blockersFromObjects = computed(() => {
          const counts = this.accountObjectCounts();
          const arr: { label: string; count: number; route: string; tab?: string }[] = [];
          for (const [type, count] of Object.entries(counts)) {
               const meta = BLOCKER_MAP[type] || { label: type, route: '#' };
               arr.push({ label: meta.label, count, route: meta.route, tab: meta.tab });
          }
          return arr;
     });

     readonly blockersFromAccountData = computed(() => {
          const acc = this.accountInfo()?.result?.account_data;
          if (!acc) return [];
          const arr: { label: string; count: number; route: string; tab?: string }[] = [];

          if (acc.RegularKey) {
               arr.push({ label: 'Regular Key', count: 1, route: '/account-configurator', tab: 'modifyRegularKey' });
          }
          if (acc.SignerList) {
               arr.push({ label: 'Signer List', count: 1, route: '/account-configurator', tab: 'modifySignerList' });
          }
          return arr;
     });

     readonly ledgerWaitBlocker = computed(() => {
          const acc = this.accountInfo()?.result?.account_data;
          const srv = this.serverInfo()?.result?.info?.validated_ledger;
          if (!acc || !srv) return [];
          const lastTxLedger = Number(acc.PreviousTxnLgrSeq ?? 0);
          const currentLedger = Number(srv?.seq ?? 0);
          if (lastTxLedger <= 0 || currentLedger <= 0) return [];
          const ledgersSince = currentLedger - lastTxLedger;
          const remaining = 256 - ledgersSince;
          if (remaining <= 0) return [];
          return [
               {
                    label: `Wait ${remaining} more ledgers (~${Math.ceil((remaining * 4) / 60)} min)`,
                    count: 1,
                    route: '#',
               },
          ];
     });

     readonly blockersList = computed<Blocker[]>(() => [...this.blockersFromObjects(), ...this.blockersFromAccountData(), ...this.ledgerWaitBlocker()]);

     readonly balanceWarning = computed(() => {
          const acc = this.accountInfo()?.result?.account_data;
          const srv = this.serverInfo()?.result?.info?.validated_ledger;
          if (!acc || !srv) return null;

          const balanceXrp = Number(xrpl.dropsToXrp(String(acc.Balance)));
          const reserveBase = Number(srv.reserve_base_xrp ?? 10);
          const reserveInc = Number(srv.reserve_inc_xrp ?? 2);
          const ownerCount = Number(acc.OwnerCount ?? 0);
          const deleteFee = 2;
          const reserveRequired = reserveBase + ownerCount * reserveInc;

          if (balanceXrp < reserveRequired + deleteFee) {
               return `Balance too low. Minimum ${(reserveRequired + deleteFee).toFixed(6)} XRP required.`;
          }
          return null;
     });

     readonly canDelete = computed(() => this.blockersList().length === 0 && !this.balanceWarning());

     readonly infoData = computed(() => ({
          walletName: this.currentWallet().name || 'Selected wallet',
          canDelete: this.canDelete(),
          blockers: this.blockersList() as Blocker[], // cast for template safety
          balanceWarning: this.balanceWarning(),
     }));

     readonly deleteBlockers = computed(() => this.blockersList());

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
          const idx = this.wallets().findIndex(w => w.address === wallet.address);
          if (idx !== -1) {
               this.selectedWalletIndex.set(idx);
          }
     }

     private selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     private ensureWalletSelected(): boolean {
          if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
               console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
               return false;
          }
          return true;
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     async setTab(tab: 'deleteAccount'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) {
               await this.getAccountDetails(true);
          }
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.measure('getAccountDetails', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeServerInfo: true,
                         includeBlockingObjects: true,
                         forceRefresh: false,
                    });

                    this.accountInfo.set(env.accountInfo);
                    this.accountObjects.set(env.accountObjects);
                    this.serverInfo.set(env.serverInfo);
                    this.blockingObjects.set(env.blockingObjects);

                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getting account details:', error);
                    this.toastService.error(error.message || 'Error getting account detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async deleteAccount(): Promise<void> {
          await this.withPerf('deleteAccount', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.savedTxJson.set([]);
               this.savedTxResult.set([]);

               if (!this.ensureWalletSelected()) return;

               const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

               if (!destination) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         destinationAddress: destination,
                    });

                    const result = await this.deleteAccountOrchestratorService.executeDeleteAccount({
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.deleteAccountUtilService.deleteAccountSpecificKeys)),
                              destinationAddress: destination,
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

                    await this.handleTxResult(result, env.client, env.wallet, destination, 'Failed Delete Account');
               } catch (error: any) {
                    console.error('Error in deleteAccount:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, errorMessage: string): Promise<boolean> {
          if (!result.success) {
               this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
               return false;
          }

          this.deleteWalletAfterDeleteTx(this.selectedWalletIndex());
          await this.refreshAfterTx(client, wallet, destination);

          this.clearInputFields();
          return true;
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null): Promise<void> {
          const env = await this.txEnvironmentService.prepareTxEnvironment({
               includeAccountInfo: true,
               includeAccountObject: true,
               forceRefresh: true,
          });

          const addresses = [wallet.classicAddress];
          if (destination) addresses.push(destination);

          await this.refreshWallets(client, addresses);

          this.addCustomDestination(destination);
          this.acccountDataService.refreshUiState(wallet, env.accountInfo!, env.accountObjects);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(
               client,
               addresses, // only the addresses to target
               (_updatedList, newCurrent) => {
                    this.currentWallet.set({ ...newCurrent });
               }
          );
     }

     private addCustomDestination(destination: string | null): void {
          if (!destination) return;
          const addr = destination.trim();
          if (xrpl.isValidAddress(addr) && !this.destinationMap().has(addr)) {
               this.transactionDropdownService.addCustomIfNewAndSelect(destination, this.destinationMap, this.selectedDestinationAddress, this.destinationSearchQuery);
          }
     }

     deleteWalletAfterDeleteTx(index: number) {
          this.savedTxJson.set(this.txUiService.txResultSignal());
          this.savedTxResult.set(this.txUiService.txResultSignal());
          this.walletManagerService.deleteWallet(index);
          if (this.selectedWalletIndex() >= this.wallets().length) {
               this.selectedWalletIndex.set(Math.max(0, this.wallets().length - 1));
               const wallet = this.wallets()[this.selectedWalletIndex()];
               this.currentWallet.set(wallet ? { ...wallet } : ({} as Wallet));
          }
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     clearFields() {
          this.txUiService.clearOptionalInputFields();
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearInputFields() {
          this.selectedDestinationAddress.set('');
          this.txUiService.destinationTagField.set('');
     }
}
