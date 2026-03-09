import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TooltipLinkComponent } from '../shared/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { RequirementsInfoComponent } from './ui-components/requirements-info/requirements-info.component';
import { PermissionedDomainUtilService } from '../../services/permissioned-domain/permissioned-domain-util/permissioned-domain-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { ToastService } from '../../services/toast/toast.service';
import { PermissionedDomainOrchestratorService } from '../../services/permissioned-domain/permissioned-domain-orchestrator/permissioned-domain-orchestrator.service';

@Component({
     selector: 'app-permissioned-domain',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent, RequirementsInfoComponent],
     templateUrl: './permissioned-domain.component.html',
     styleUrl: './permissioned-domain.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionedDomainComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
     public readonly permissionedDomainOrchestratorService = inject(PermissionedDomainOrchestratorService);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     activeTab = signal<'set' | 'delete'>('set');
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal<boolean>(false);
     wallets = signal<Wallet[]>([]);

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
          void this.getPermissionedDomainForAccount(true);
     });

     readonly actionButtonLabel = computed(() => {
          switch (this.activeTab()) {
               case 'set':
                    return this.permissionedDomainUtilService.setPermissionedDomainButtonLabel();
               case 'delete':
                    return this.permissionedDomainUtilService.deletePermissionedDomainButtonLabel();
          }
     });

     readonly actionButtonClass = computed(() => {
          switch (this.activeTab()) {
               case 'set':
                    return 'btn-primary-blue';
               case 'delete':
                    return 'btn-primary-red';
          }
     });

     readonly summaryMessage = computed(() => {
          const info = this.infoData();
          if (!info) return '';
          const { permissionedDomainCount } = info;
          if (permissionedDomainCount === 0) return 'has no permissioned domains.';
          return `has issued <strong class="object-count">${info.permissionedDomainCount}</strong> permissioned domain${info.permissionedDomainCount === 1 ? '' : 's'}. `;
     });

     readonly infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const tab = this.activeTab();

          const domains = this.permissionedDomainUtilService.createdPermissionedDomains();
          return {
               walletName: this.currentWallet().name || 'Selected wallet',
               mode: tab,
               permissionedDomainCount: domains.length,
               permissionedDomainsToShow: domains,
          };
     });

     constructor() {
          super();
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     resetDomainDropDown() {
          this.permissionedDomainUtilService.selectedDomainId.set(null);
          this.txUiService.domainId.set('');
     }

     toggleCreatedDomains() {
          this.permissionedDomainUtilService.createdDomains.update(val => !val);
     }

     trackByWalletAddress(index: number, wallet: any) {
          return wallet.address;
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
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

     async setTab(tab: 'set' | 'delete'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.resetDomainDropDown();
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) {
               await this.getPermissionedDomainForAccount();
          }
     }

     async getPermissionedDomainForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getPermissionedDomainForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) return;

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.clearFields();
               } catch (error: any) {
                    console.error('Error in getPermissionedDomainForAccount:', error);
                    this.toastService.error(error.message || 'Error getting permissioned domain detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          // Declare variables we need after the timed block
          let txResult: { success: boolean; error?: string } | null = null;
          let envRef: any = null; // we'll store env here
          let credentialIssuer: string | null = null;
          let currentTab = this.activeTab();

          // 1. Common reset & guard clauses (not timed)
          this.txUiService.resetCurrentStepToIdle();
          this.txUiService.clearAllOptionsAndMessages();

          if (!this.ensureWalletSelected()) return;

          // 2. Early credentialIssuer resolution (not timed)
          credentialIssuer = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

          // Only time the real work (validation → execution)
          await this.withPerf('performAction', async () => {
               let action: 'set' | 'delete';
               let extra: any = {};
               let errorPrefix = '';

               // Map tab → action config
               switch (currentTab) {
                    case 'set':
                         action = 'set';
                         this.txUiService.subject.set(credentialIssuer);
                         break;
                    case 'delete':
                         action = 'delete';
                         break;
                    default:
                         this.toastService.error('Unknown action', AppConstants.TOAST.ERROR);
                         return;
               }

               // Early validation / guard
               if (currentTab === 'set') {
                    if (!credentialIssuer || !xrpl.isValidAddress(credentialIssuer)) {
                         this.toastService.error('Please enter a valid issuer address.', AppConstants.TOAST.ERROR);
                         return;
                    }
               }

               // Prepare environment
               let env;
               try {
                    env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    envRef = env; // save reference for later

                    if (currentTab === 'delete') {
                         const permissionDomainFound = envRef.accountObjects.result.account_objects.find((line: any) => {
                              return line.LedgerEntryType === 'PermissionedDomain' && line.index === this.txUiService.domainId();
                         });

                         // If not found, exit early
                         if (!permissionDomainFound) {
                              this.toastService.error(`No Permission Domain found for ${envRef.wallet.classicAddress} with ID ${this.txUiService.domainId()}`, AppConstants.TOAST.ERROR);
                              return;
                         }
                    }
               } catch (err: any) {
                    this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
                    console.error(err);
                    return;
               }

               // Execute via orchestrator
               try {
                    const formValues = {
                         ...this.txUiService.getValues(this.txUiService.buildTxKeys(...(currentTab === 'set' ? this.permissionedDomainUtilService.setPermissionDomainKeySpecificKeys : []), ...(currentTab === 'delete' ? this.permissionedDomainUtilService.deletePermissionDomainSpecificKeys : []))),
                    };

                    txResult = await this.permissionedDomainOrchestratorService.executePermissionDomainTx(action, {
                         wallet: this.currentWallet(),
                         formValues,
                         extra,
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });
               } catch (error: any) {
                    console.error(`Error in ${action}:`, error);
                    this.toastService.error(error.message || errorPrefix, AppConstants.TOAST.ERROR);
               }
          });

          // UI refresh & side-effects — after timing ends
          if (!this.txUiService.isSimulateEnabled() && txResult) {
               await this.handleTxResult(txResult, envRef.client, envRef.wallet, credentialIssuer, '');
               if (currentTab === 'delete') {
                    this.resetDomainDropDown();
               }
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     private async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, credentialIssuer: string | null, errorMessage: string): Promise<boolean> {
          if (!result.success) {
               this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
               return false;
          }

          await this.refreshAfterTx(client, wallet, credentialIssuer);

          this.clearInputFields();
          return true;
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, credentialIssuer: string | null): Promise<void> {
          const env = await this.txEnvironmentService.prepareTxEnvironment({
               includeAccountInfo: true,
               includeAccountObject: true,
               forceRefresh: true,
          });

          this.refreshAccountObject(env);

          const addresses = [wallet.classicAddress];
          if (credentialIssuer) addresses.push(credentialIssuer);

          await this.refreshWallets(client, addresses);

          this.addCustomDestination(credentialIssuer);
          this.acccountDataService.refreshUiState(wallet, env.accountInfo!, env.accountObjects);
     }

     private refreshAccountObject(env: any): void {
          this.permissionedDomainUtilService.getCreatedPermissionedDomains(env.accountObjects, env.wallet.classicAddress);
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

     copyPermissionedDomainId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Permissioned Domain ID copied!');
          });
     }

     onDestinationSelected(item: SelectItem | null) {
          this.selectedDestinationAddress.set(item?.id || '');
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     clearFields() {
          this.txUiService.clearAllOptions();
          this.txUiService.clearOptionalInputFields();
          this.txUiService.clearAllOptionsAndMessages();
          this.resetCredentialIdDropDown();
     }

     clearInputFields() {
          if (this.txUiService.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.txUiService.credentialType.set('');
          this.txUiService.domainId.set('');
          this.permissionedDomainUtilService.selectedDomainId.set(null);
     }

     resetCredentialIdDropDown() {
          this.txUiService.credentialType.set('');
          this.txUiService.domainId.set('');
          this.permissionedDomainUtilService.selectedDomainId.set(null);
     }
}
