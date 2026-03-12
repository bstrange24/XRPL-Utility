import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { RequirementsInfoComponent } from './ui-components/requirements-info/requirements-info.component';
import { PermissionedDomainUtilService } from '../../services/permissioned-domain/permissioned-domain-util/permissioned-domain-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { ToastService } from '../../services/toast/toast.service';
import { PermissionedDomainOrchestratorService } from '../../services/permissioned-domain/permissioned-domain-orchestrator/permissioned-domain-orchestrator.service';
import { ActivatedRoute } from '@angular/router';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { CredentialStore } from '../../services/credentials/credential-store/credential-store.service';

@Component({
     selector: 'app-permissioned-domain',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent, RequirementsInfoComponent],
     templateUrl: './permissioned-domain.component.html',
     styleUrl: './permissioned-domain.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionedDomainComponent extends WalletDestinationBase implements OnInit {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
     public readonly permissionedDomainOrchestratorService = inject(PermissionedDomainOrchestratorService);
     public readonly credentialStore = inject(CredentialStore);

     activeTab = signal<'set' | 'delete'>('set');

     readonly infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const tab = this.activeTab();

          const domains = this.permissionedDomainUtilService.createdPermissionedDomains() || [];

          return {
               walletName: wallet.name || 'Selected wallet',
               mode: tab,
               permissionedDomainCount: domains.length,
               permissionedDomainsToShow: domains,
               actionButtonLabel: this.permissionedDomainUtilService.actionButtonLabel(tab),
               actionButtonClass: this.permissionedDomainUtilService.actionButtonClass(tab),
          };
     });

     readonly summaryMessage = computed(() => {
          const info = this.infoData();
          if (!info) return '';
          const { permissionedDomainCount } = info;
          if (permissionedDomainCount === 0) return 'has no permissioned domains.';
          return `has issued <strong class="object-count">${info.permissionedDomainCount}</strong> permissioned domain${info.permissionedDomainCount === 1 ? '' : 's'}. `;
     });

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ['set', 'delete'] as const, tab => this.setTab(tab));
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getPermissionedDomainForAccount();
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     toggleCreatedDomains() {
          this.permissionedDomainUtilService.createdDomains.update(val => !val);
     }

     // trackByWalletAddress(_index: number, wallet: any) {
     //      return wallet.address;
     // }

     // toggleInfoPanel() {
     //      this.infoPanelExpanded.update(expanded => !expanded);
     // }

     async setTab(tab: 'set' | 'delete'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.permissionedDomainUtilService.resetDomainDropDown();
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) {
               await this.getPermissionedDomainForAccount();
          }
     }

     async getPermissionedDomainForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getPermissionedDomainForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) return;

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.permissionedDomainUtilService.clearFields();
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

          if (!this.walletManagerService.ensureWalletSelected()) return;

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
                         this.credentialStore.set('subject', credentialIssuer);
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
                    this.permissionedDomainUtilService.resetDomainDropDown();
               }
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     protected refreshAccountObject(env: any): void {
          this.permissionedDomainUtilService.getCreatedPermissionedDomains(env.accountObjects, env.wallet.classicAddress);
     }

     protected clearInputFields(): void {
          this.permissionedDomainUtilService.clearInputFields();
     }

     selectPermissionedDomainFromList(domain: any) {
          // Same logic as credentials
          this.permissionedDomainUtilService.onDomainSelected({
               id: domain.index,
               display: domain.index.slice(0, 10) + '...' + domain.index.slice(-8),
               secondary: domain.AcceptedCredentials ? `Credentials: ${domain.AcceptedCredentials.length}` : 'No credentials',
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
          });

          // Optional: close the expanded panel after selection (good UX)
          this.infoPanelExpanded.set(false);
     }
}
