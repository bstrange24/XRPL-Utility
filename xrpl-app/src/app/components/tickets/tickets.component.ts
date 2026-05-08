import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants } from '../../core/app.constants';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TicketsOrchestratorService } from '../../services/tickets/tickets-orchestrator/tickets-orchestrator.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TicketsUtilService } from '../../services/tickets/tickets-util/tickets-util.service';
import { ActivatedRoute } from '@angular/router';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TICKET_TAB_META, TICKET_TABS } from './constants/tickets.ui';
import { TICKET_TAB } from './constants/tickets.constants';
import { TicketsViewModelService } from '../../services/tickets/tickets-view-model/tickets-view-model.service';
import { TicketActionTypes, TicketTxConfig } from './constants/tickets.types';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TicketStore } from '../../services/tickets/tickets-store/tickets-store.service';
import { TicketsRequirementsInfoComponent } from './ui-components/tickets-requirements-info/tickets-requirements-info.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { TicketsCreateComponent } from './tabs/tickets-create/tickets-create.component';
import { TicketsDeleteComponent } from './tabs/tickets-delete/tickets-delete.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { TicketsSummaryComponent } from './ui-components/tickets-summary/tickets-summary.component';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';

@Component({
     selector: 'app-tickets',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TransactionPreviewComponent, TabMenuWithInfoComponent, WarningMessageComponent, ExecutionTimeDisplayComponent, TransactionOptionsComponent, TicketsCreateComponent, TicketsDeleteComponent],
     templateUrl: './tickets.component.html',
     styleUrl: './tickets.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTicketsComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly ticketsOrchestratorService = inject(TicketsOrchestratorService);
     public readonly ticketsUtilService = inject(TicketsUtilService);
     public readonly ticketsViewModelService = inject(TicketsViewModelService);
     public readonly ticketStore = inject(TicketStore);
     private readonly rightPanelService = inject(RightPanelService);
     public readonly cdr = inject(ChangeDetectorRef);
     public readonly tabs = TICKET_TABS;
     public readonly tabMeta = TICKET_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     activeTabForRequirements = computed(() => this.ticketsViewModelService.activeTab());
     readonly summaryExpanded = signal<boolean>(false);

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, TICKET_TAB, tab => this.setTab(tab));

          // Initial setup
          this.setRightPanel();

          // Force load credentials
          if (this.hasWallets()) {
               this.getTickets(true);
          }
     }

     ngOnDestroy(): void {
          this.rightPanelService.clearPanel();
     }

     private readonly updateRightPanelEffect = effect(() => {
          const wallet = this.currentWallet();
          if (wallet?.address) {
               this.setRightPanel();
          }
     });

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getTickets(false);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: string): Promise<void> {
          if (!TICKET_TAB.includes(tab as any)) return;
          this.ticketsViewModelService.activeTab.set(tab as TicketActionTypes);
          this.clearInputFields();
          if (this.hasWallets()) await this.getTickets(false);
     }

     async getTickets(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);
          await this.measure('getTickets', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    const ticketObjects = env.accountObjects ? this.ticketsUtilService.filterAccountObjectsByTypes(env.accountObjects, ['Ticket']) : { result: { account_objects: [] } };

                    // Extract sequences
                    const allTicketsForWallet: string[] = (ticketObjects?.result?.account_objects ?? []).map((ticket: any) => String(ticket.TicketSequence)).sort((a, b) => Number(a) - Number(b)); // keeps them in ascending order

                    this.xrplTxOptionsStore.setField('allTicketsForWallet', allTicketsForWallet);
                    this.xrplTxOptionsStore.setField('walletTicketCount', allTicketsForWallet.length);

                    this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
               } catch (error: any) {
                    console.error('Error in getTickets:', error);
                    this.toastService.error(error.message || 'Failed to get tickets account', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.ticketsViewModelService.activeTab();
          const wallet = this.currentWallet();

          if (currentTab === 'createTicket') {
               const ticketCount = this.xrplTxOptionsStore.ticketCountField();
               if (this.xrplTxOptionsStore.walletTicketCount() + Number(ticketCount) > 250) {
                    this.toastService.error(`An XRPL account can not hold more than 250 Tickets at one time. This account already has ${this.xrplTxOptionsStore.walletTicketCount()}`, AppConstants.TOAST.ERROR);
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
                    includeTickets: true,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment.', AppConstants.TOAST.ERROR);
               return;
          }

          if (currentTab === 'deleteTicket') {
               const ticketsToDelete = this.xrplTxOptionsStore.selectedTicketSequences();
               if (ticketsToDelete.length === 0) {
                    this.toastService.error('No tickets selected to delete.', AppConstants.TOAST.ERROR);
                    return;
               }
          }

          const ticketState = this.ticketStore.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: TicketTxConfig = {
               ticket: ticketState,
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
                         case 'createTicket':
                              txResult = await this.ticketsOrchestratorService.executeTicketTx('createTicket', config);
                              break;
                         case 'deleteTicket':
                              txResult = await this.ticketsOrchestratorService.executeTicketTx('deleteTicket', config);
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

     protected async refreshAccountObject(env: any): Promise<void> {
          this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);

          // NEW: Always refresh ticket count from the fresh account_objects
          const ticketObjects = env.accountObjects ? this.ticketsUtilService.filterAccountObjectsByTypes(env.accountObjects, ['Ticket']) : { result: { account_objects: [] } };
          const newCount = ticketObjects?.result?.account_objects?.length ?? 0;
          this.xrplTxOptionsStore.setField('walletTicketCount', newCount);
          const allTicketsForWallet: string[] = (ticketObjects?.result?.account_objects ?? []).map((ticket: any) => String(ticket.TicketSequence)).sort((a, b) => Number(a) - Number(b)); // keeps them in ascending order
          this.xrplTxOptionsStore.setField('allTicketsForWallet', allTicketsForWallet);
     }

     private setRightPanel(): void {
          this.rightPanelService.setPanel({
               summaryComponent: TicketsSummaryComponent,
               summaryInputs: {
                    infoData: this.ticketsViewModelService.infoData(),
                    tab: this.ticketsViewModelService.activeTab(),
                    walletName: this.walletName(),
                    ticketCount: this.xrplTxOptionsStore.walletTicketCount(),
               },

               mainComponent: TicketsRequirementsInfoComponent,
               mainInputs: {
                    activeTab: this.activeTabForRequirements,
               },
          });
     }

     protected clearInputFields(): void {
          this.destinationSearchQuery.set('');
          this.selectedDestinationAddress.set('');
          this.txUiService.clearAllFields();
          this.xrplTxOptionsStore.setField('selectedTicketSequences', []);
          this.xrplTxOptionsStore.setField('ticketCountField', '');
     }
}
