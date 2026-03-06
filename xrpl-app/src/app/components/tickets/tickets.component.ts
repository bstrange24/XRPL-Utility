import { Component, OnInit, inject, ChangeDetectionStrategy, signal, computed, DestroyRef, ViewContainerRef, ElementRef, TemplateRef, ViewChild, effect, ChangeDetectorRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { UtilsService } from '../../services/util-service/utils.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TicketsOrchestratorService } from '../../services/tickets/tickets-orchestrator/tickets-orchestrator.service';
import { TemplatePortal } from '@angular/cdk/portal';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TicketsUtilService } from '../../services/tickets/tickets-util/tickets-util.service';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';

@Component({
     selector: 'app-tickets',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent],
     animations: [
          trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])]),
          trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(-20px)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))])]),
     ],
     templateUrl: './tickets.component.html',
     styleUrl: './tickets.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTicketsComponent extends PerformanceBaseComponent implements OnInit {
     private ticketOverlayRef: OverlayRef | null = null;
     private readonly overlay = inject(Overlay);
     private readonly viewContainerRef = inject(ViewContainerRef);
     private readonly destroyRef = inject(DestroyRef);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly ticketsOrchestratorService = inject(TicketsOrchestratorService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly ticketsUtilService = inject(TicketsUtilService);
     private readonly walletManager = inject(WalletManagerService);
     private readonly cdr = inject(ChangeDetectorRef);

     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('ticketDropdownInput') ticketDropdownInput!: ElementRef<HTMLInputElement>;
     @ViewChild('ticketDropdownTemplate') ticketDropdownTemplate!: TemplateRef<any>;

     activeTab = signal<'create' | 'delete'>('create');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     ticketSearchQuery = signal<string>('');
     isTicketDropdownOpen = signal<boolean>(false);
     highlightedTicketIndex = signal<number>(-1);
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);

     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');

     // Has wallets → warning handling
     private readonly _hasWalletsEffect = effect(() => {
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
          this.wallets.set(this.walletManager.wallets());
     });

     // Effect 3: Selected index change → clear + refresh checks
     private readonly _selectedIndexEffect = effect(() => {
          // Reading the signal is enough to trigger the effect
          this.walletManager.selectedIndex();

          this.txUiService.clearAllOptionsAndMessages();

          // Fire-and-forget refresh
          void this.getTickets(true);
     });

     readonly infoData = computed(() => {
          const currentAddr = this.currentWallet()?.address;
          if (!currentAddr) return null;

          const wallet = this.walletManager.wallets().find(w => w.address === currentAddr);
          if (!wallet?.address) return null;

          const name = wallet.name || 'Selected wallet';
          const count = this.txUiService.walletTicketCount();
          const label = this.activeTab() === 'create' ? 'available Tickets for use.' : 'Tickets that can be deleted.';

          return `<code>${name}</code> wallet has <strong class="object-count">${count}</strong> ${label}`;
     });

     readonly hasWalletsSignal = this.walletManagerService.hasWallets;

     readonly allTicketsSelected = this.ticketsUtilService.getAllTicketsSelected(this.txUiService.ticketArray(), this.txUiService.selectedTicketSequences());

     readonly hasSelectedTickets = computed(() => this.txUiService.selectedTicketSequences().length > 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.txUiService.clearAllOptions();
     }

     private selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
     }

     private ensureWalletSelected(): boolean {
          if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
               console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
               return false;
          }
          return true;
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'create' | 'delete'): Promise<void> {
          this.activeTab.set(tab);
          this.txUiService.clearAllOptions();
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) {
               await this.getTickets(false);
          }
     }

     async getTickets(forceRefresh = false): Promise<void> {
          await this.measure('getTickets', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

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

                    const ticketObjects = env.accountObjects ? this.xrplService.filterAccountObjectsByTypes(env.accountObjects, ['Ticket']) : { result: { account_objects: [] } };
                    this.txUiService.walletTicketCount.set(ticketObjects?.result?.account_objects?.length ?? 0);

                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getTickets:', error);
                    this.toastService.error(error.message || 'Failed to get tickets account', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async createTickets(): Promise<void> {
          await this.withPerf('createTickets', async () => {
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
                         throw new Error('Failed to fetch account information');
                    }

                    const ticketCount = this.txUiService.ticketCountField();
                    if (this.txUiService.walletTicketCount() + Number(ticketCount) > 250) {
                         throw new Error(`An XRPL can not hold more than 250 Tickets at one time. This account already has ${this.txUiService.walletTicketCount()}`);
                    }

                    const result = await this.ticketsOrchestratorService.executeCreateTickets({
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.ticketsUtilService.getTransactionValues(),
                              ticketCountField: ticketCount,
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

                    await this.handleTxResult(result, env.client, env.wallet, '', 'Failed to create tickets');
               } catch (error: any) {
                    console.error('Error in createTicket:', error);
                    this.toastService.error(error.message || 'Error creating tickets', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async deleteSelectedTickets(): Promise<void> {
          await this.withPerf('createTickets', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.ensureWalletSelected()) return;

               try {
                    const ticketsToDelete = this.txUiService.selectedTicketSequences();
                    if (ticketsToDelete.length === 0) {
                         return this.toastService.error('No tickets selected to delete.', AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeTickets: true,
                    });

                    if (!env.accountInfo || !env.accountObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    if (!env.ticketObjects) {
                         return this.toastService.error('Failed to fetch ticket data.', AppConstants.TOAST.ERROR);
                    }

                    const result = await this.ticketsOrchestratorService.deleteTickets({
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.ticketsUtilService.getTransactionValues(),
                              ticketSequences: this.txUiService.selectedTicketSequences(),
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

                    await this.handleTxResult(result, env.client, env.wallet, '', 'Failed to delete tickets');
               } catch (err: any) {
                    console.error('Erorr deleting tickets failed', err);
                    this.toastService.error(err.message || 'Failed to delete tickets', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     private async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, errorMessage: string): Promise<boolean> {
          if (!result.success) {
               this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
               return false;
          }

          await this.refreshAfterTx(client, wallet);

          this.clearFields();
          this.cdr.markForCheck();
          return true;
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

          const ticketObjects = this.xrplService.filterAccountObjectsByTypes(accountObjects, ['Ticket']);
          this.txUiService.walletTicketCount.set(ticketObjects.result.account_objects.length);

          await this.refreshWallets(client, [wallet.classicAddress]);
          this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
          this.txUiService.clearAllOptions();
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(
               client,
               addresses, // only the addresses to target
               (updatedList, newCurrent) => {
                    this.currentWallet.set({ ...newCurrent });
               }
          );
     }

     toggleSelectAllTickets(): void {
          if (this.allTicketsSelected()) {
               this.txUiService.selectedTicketSequences.set([]);
          } else {
               this.txUiService.selectedTicketSequences.set([...this.txUiService.ticketArray()]);
          }
     }

     toggleTicketSelection(seq: string): void {
          this.txUiService.selectedTicketSequences.update(list => (list.includes(seq) ? list.filter(t => t !== seq) : [...list, seq]));
     }

     clearAllSelections(): void {
          this.txUiService.selectedTicketSequences.set([]);
          this.txUiService.ticketCountField.set('');
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearFields(): void {
          this.txUiService.selectedTicketSequences.set([]);
          this.txUiService.ticketCountField.set('');
     }

     get safeWarningMessage(): string {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '';
     }

     openTicketDropdown(): void {
          if (!this.ticketOverlayRef) {
               this.ticketOverlayRef = this.overlay.create({
                    hasBackdrop: true,
                    backdropClass: 'cdk-overlay-transparent-backdrop',
                    positionStrategy: this.overlay
                         .position()
                         .flexibleConnectedTo(this.ticketDropdownInput)
                         .withPositions([
                              {
                                   originX: 'start',
                                   originY: 'bottom',
                                   overlayX: 'start',
                                   overlayY: 'top',
                                   offsetY: 4,
                              },
                              {
                                   originX: 'start',
                                   originY: 'top',
                                   overlayX: 'start',
                                   overlayY: 'bottom',
                                   offsetY: -4,
                              },
                         ]),

                    scrollStrategy: this.overlay.scrollStrategies.reposition(),
                    width: this.ticketDropdownInput.nativeElement.offsetWidth,
               });

               this.ticketOverlayRef
                    .backdropClick()
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(() => this.closeTicketDropdown());
          }

          if (!this.ticketOverlayRef.hasAttached()) {
               this.ticketOverlayRef.attach(new TemplatePortal(this.ticketDropdownTemplate, this.viewContainerRef));
          }

          this.highlightedTicketIndex.set(-1);
     }

     closeTicketDropdown(): void {
          this.ticketOverlayRef?.dispose();
          this.ticketOverlayRef = null;
          this.isTicketDropdownOpen.set(false);
     }

     toggleTicketDropdown(): void {
          this.ticketOverlayRef?.hasAttached() ? this.closeTicketDropdown() : this.openTicketDropdown();
     }

     onTicketSearchInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.ticketSearchQuery.set(value);
     }

     filteredTickets = computed(() => {
          const tickets = this.txUiService.ticketArray();
          const q = this.ticketSearchQuery().trim();
          if (!q) return tickets;
          return tickets.filter(t => t.includes(q));
     });

     onTicketKeyDown(event: KeyboardEvent): void {
          const items = this.filteredTickets();
          if (items.length === 0) return;

          let index = this.highlightedTicketIndex();

          if (event.key === 'ArrowDown') {
               event.preventDefault();
               index = index < items.length - 1 ? index + 1 : index;
          } else if (event.key === 'ArrowUp') {
               event.preventDefault();
               index = index >= 0 ? index - 1 : items.length - 1;
          } else if (event.key === 'Enter' && index >= 0) {
               event.preventDefault();
               this.toggleTicketSelection(items[index]);
               return;
          } else if (event.key === 'Escape') {
               this.closeTicketDropdown();
               return;
          } else {
               return; // Allow typing in search
          }

          this.highlightedTicketIndex.set(index);

          // CRITICAL: Scroll the highlighted item into view
          requestAnimationFrame(() => {
               const el = this.ticketOverlayRef?.overlayElement.querySelector('.ticket-item.highlighted') as HTMLElement;
               el?.scrollIntoView({ block: 'nearest' });
          });
     }
}
