import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { SendXrpTransactionOrchestratorService } from '../../services/send-xrp/send-xrp-orchestrator/send-xrp-transaction-orchestrator.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { TransactionOptionsSectionComponent } from '../shared/transaction-options-section/transaction-options-section.component';
import { CredentialStore } from '../../services/credentials/credential-store/credential-store.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { SendXrpRequirementsInfoComponent } from './ui-components/send-xrp-requirements-info/send-xrp-requirements-info.component';
import { SendXrpFormComponent } from './tab/send-xrp-form/send-xrp-form.component';
import { ActivatedRoute } from '@angular/router';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { SendXrpViewModelService } from '../../services/send-xrp/send-xrp-view-model/send-xrp-view-model.service';
import { SendXrpUtilService } from '../../services/send-xrp/send-xrp-util/send-xrp-util.service';
import { StorageService } from '../../services/local-storage/storage.service';

@Component({
     selector: 'app-send-xrp',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, SendXrpRequirementsInfoComponent, SendXrpFormComponent, TabMenuWithInfoComponent, WarningMessageComponent, ExecutionTimeDisplayComponent, SendXrpRequirementsInfoComponent],
     templateUrl: './send-xrp.component.html',
     styleUrl: './send-xrp.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendXrpComponent extends WalletDestinationBase implements OnInit {
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly sendXrpTransactionOrchestratorService = inject(SendXrpTransactionOrchestratorService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly sendXrpViewModelService = inject(SendXrpViewModelService);
     public readonly sendXrpUtilService = inject(SendXrpUtilService);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ['sendXrp'] as const, tab => this.setTab(tab));
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.onAccountChange();
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     // selectedDestinationAddress = signal<string>('');
     // destinationSearchQuery = signal<string>('');
     // activeTab = signal<'sendXrp'>('sendXrp');
     // currentWallet = signal<Wallet>({} as Wallet);
     // infoPanelExpanded = signal<boolean>(false);
     // accountInfo = signal<any>(null);
     // wallets = signal<Wallet[]>([]);

     // allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     // destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     // destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     // selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     // filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     // destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     // private readonly sendXrpSpecificKeys = ['amountField', 'amountField', 'destinationTagField', 'sourceTagField', 'invoiceIdField'] as const;
     // readonly currentAddress = computed(() => this.currentWallet().address);
     // readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     // readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');
     // readonly canSubmit = computed(() => this.isIdle() && this.hasWallets());

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
     //      void this.onAccountChange(false);
     // });

     // readonly infoData = computed(() => {
     //      const currentAddr = this.currentWallet()?.address;
     //      if (!currentAddr) return null;

     //      const wallet = this.walletManager.wallets().find(w => w.address === currentAddr);
     //      if (!wallet?.address) return null;

     //      const walletName = wallet.name || 'Selected wallet';

     //      if (!wallet.balance) {
     //           return `<code>${walletName}</code> wallet is ready to send XRP.`;
     //      }

     //      return `<code>${walletName}</code> wallet has <strong class="object-count">${wallet.balance} XRP</strong> available for sending.`;
     // });

     // readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     // constructor() {
     //      super();
     //      this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
     //      this.txUiService.clearAllOptionsAndMessages();
     // }

     // ngOnInit(): void {
     //      this.trustlineCurrencyService.setPreferXrpAsDefault(false);
     //      this.trustlineCurrencyService.setAddMptInDropdown(false);
     //      this.transactionDropdownService.loadCustomDestinations();
     // }

     // private selectWallet(wallet: Wallet): void {
     //      if (wallet?.address === this.currentWallet()?.address) return;

     //      this.currentWallet.set(wallet);
     //      this.txUiService.currentWallet.set(wallet);

     //      if (this.selectedDestinationAddress() === wallet.address) {
     //           this.selectedDestinationAddress.set('');
     //      }
     // }

     // private ensureWalletSelected(): boolean {
     //      if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
     //           console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
     //           return false;
     //      }
     //      return true;
     // }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: string): Promise<void> {
          const validTabs = ['sendXrp'] as const;
          if (validTabs.includes(tab as any)) {
               this.sendXrpViewModelService.activeTab.set(tab as 'sendXrp');
               this.destinationSearchQuery.set('');

               this.txUiService.clearAllOptionsAndMessages();

               if (this.hasWallets()) await this.onAccountChange(true);
          }
     }

     // toggleOptions(enabled: boolean): void {
     //      this.txUiService.wantsOptions.set(enabled);
     //      if (!enabled) {
     //           this.txUiService.clearOptionalInputFields();
     //      }
     // }

     async onAccountChange(forceRefresh = false): Promise<void> {
          await this.measure('onAccountChange', true, async () => {
               // Reset all fields and options
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeServerInfo: true,
                         includeBlockingObjects: true,
                         forceRefresh: forceRefresh,
                    });
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.clearFields();
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.toastService.error(error.message || 'Failed to load account', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async sendXrp(): Promise<void> {
          await this.withPerf('sendXrp', async () => {
               // this.txUiService.resetCurrentStepToIdle();
               // this.txUiService.clearAllOptionsAndMessages();
               // // if (!this.ensureWalletSelected()) return;
               // const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
               // if (!destination) {
               //      this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
               //      return;
               // }
               // try {
               //      const env = await this.txEnvironmentService.prepareTxEnvironment({
               //           includeAccountInfo: true,
               //           includeAccountObject: true,
               //           includeFee: true,
               //           includeLedgerIndex: true,
               //           destinationAddress: destination,
               //      });
               //      const result = await this.sendXrpTransactionOrchestratorService.executeXrpPayment({
               //           wallet: this.currentWallet(),
               //           formValues: {
               //                ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.sendXrpSpecificKeys)),
               //                destinationAddress: destination,
               //           },
               //           preFetchedEnv: {
               //                client: env.client,
               //                accountInfo: env.accountInfo,
               //                accountObjects: env.accountObjects,
               //                fee: env.fee!,
               //                currentLedger: env.currentLedger!,
               //                wallet: env.wallet,
               //           },
               //      });
               //      await this.handleTxResult(result, env.client, env.wallet, destination, 'Failed to send XRP');
               // } catch (error: any) {
               //      console.error('Error sending XRP:', error);
               //      this.toastService.error(error.message || 'Error sending XRP', AppConstants.TOAST.ERROR);
               // } finally {
               //      this.txUiService.resetCurrentStepToIdle();
               // }
          });
     }

     // private async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, errorMessage: string): Promise<boolean> {
     //      if (!result.success) {
     //           this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
     //           return false;
     //      }

     //      await this.refreshAfterTx(client, wallet, destination);

     //      this.clearInputFields();
     //      this.cdr.markForCheck();
     //      return true;
     // }

     // private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null): Promise<void> {
     //      const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

     //      this.updateLocalAccountState(accountInfo);

     //      await this.refreshWallets(client, destination ? [wallet.classicAddress, destination] : [wallet.classicAddress]);

     //      this.addCustomDestination(destination);
     //      this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
     // }

     // private updateLocalAccountState(accountInfo: any): void {
     //      this.accountInfo.set(accountInfo);
     // }

     // private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
     //      await this.walletDataService.refreshWallets(
     //           client,
     //           addresses, // only the addresses to target
     //           (_updatedList, newCurrent) => {
     //                this.currentWallet.set({ ...newCurrent });
     //           }
     //      );
     // }

     // private addCustomDestination(destination: string | null): void {
     //      if (!destination) return;
     //      const addr = destination.trim();
     //      if (xrpl.isValidAddress(addr) && !this.destinationMap().has(addr)) {
     //           this.transactionDropdownService.addCustomIfNewAndSelect(destination, this.destinationMap, this.selectedDestinationAddress, this.destinationSearchQuery);
     //      }
     // }

     // onFocus(event: FocusEvent): void {
     //      const input = event.target as HTMLInputElement;
     //      if (input.value) {
     //           const num = Number.parseFloat(input.value);
     //           if (!Number.isNaN(num)) input.value = num.toFixed(6);
     //      }
     // }

     protected refreshAccountObject(env: any): void {
          // this.deleteAccountStoreService.setField('accountInfo', env.accountInfo);
          // this.deleteAccountStoreService.setField('accountObjects', env.accountObjects);
          // this.deleteAccountStoreService.setField('serverInfo', env.serverInfo);
          // this.deleteAccountStoreService.setField('blockingObjects', env.blockingObjects);
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
     }

     clearFields(): void {
          this.txUiService.clearAllOptions();
          this.txUiService.clearOptionalInputFields();
          this.txUiService.wantsOptions.set(false);
          this.txUiService.amountField.set('');
     }

     protected clearInputFields(): void {
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
          if (this.xrplTxOptionsStore.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.credentialStore.setField('credentialIDs', []);
     }
}
