import { Component, OnInit, inject, ChangeDetectionStrategy, signal, computed, DestroyRef, ViewContainerRef, ElementRef, TemplateRef, ViewChild } from '@angular/core';
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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { EMPTY, from, switchMap } from 'rxjs';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TicketsOrchestratorService } from '../../services/tickets/tickets-orchestrator/tickets-orchestrator.service';
import { TemplatePortal } from '@angular/cdk/portal';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TicketsUtilService } from '../../services/tickets/tickets-util/tickets-util.service';

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

     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('ticketDropdownInput') ticketDropdownInput!: ElementRef<HTMLInputElement>;
     @ViewChild('ticketDropdownTemplate') ticketDropdownTemplate!: TemplateRef<any>;

     activeTab = signal<'create' | 'delete'>('create');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     ticketSearchQuery = signal<string>('');
     isTicketDropdownOpen = signal(false);
     highlightedTicketIndex = signal<number>(-1);
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);

     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');

     readonly infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const name = wallet.name || 'Selected wallet';
          const count = this.txUiService.walletTicketCount();
          const label = this.activeTab() === 'create' ? 'available Tickets for use.' : 'Tickets that can be deleted.';

          return `<code>${name}</code> wallet has <strong class="object-count">${count}</strong> ${label}`;
     });

     readonly hasWalletsSignal = toSignal(this.walletManagerService.hasWallets$, { initialValue: false });

     readonly allTicketsSelected = this.ticketsUtilService.getAllTicketsSelected(this.txUiService.ticketArray(), this.txUiService.selectedTicketSequences());

     readonly hasSelectedTickets = computed(() => this.txUiService.selectedTicketSequences().length > 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.setupWalletSubscriptions();
          this.txUiService.clearAllOptions();
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.();
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
                    this.txUiService.setInfoMessage('');
               }
          });

          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
               if (this.hasWallets() && !this.currentAddress()) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) this.selectWallet(wallet);
               }
          });

          this.walletManagerService.selectedIndex$
               .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    switchMap(index => {
                         const wallet = this.wallets()[index];
                         if (!wallet) return EMPTY;

                         this.selectWallet(wallet);
                         this.txUiService.clearAllOptions();
                         this.clearFields();
                         return from(this.getTickets(false));
                    })
               )
               .subscribe();
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
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

     async getTickets(force = false): Promise<void> {
          await this.measure('getTickets', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) {
                    return this.toastService.error('Please select a wallet.');
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         forceRefresh: force,
                    });

                    const { wallet, accountInfo, accountObjects } = env;

                    const ticketObjects = accountObjects ? this.xrplService.filterAccountObjectsByTypes(accountObjects, ['Ticket']) : { result: { account_objects: [] } };
                    this.txUiService.walletTicketCount.set(ticketObjects?.result?.account_objects?.length ?? 0);

                    this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getTickets:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async createTickets() {
          await this.withPerf('createTickets', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) {
                    return this.toastService.error('Please select a wallet.');
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const { client, accountInfo, accountObjects, wallet } = env;

                    if (!accountInfo || !accountObjects) {
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
                              client,
                              accountInfo,
                              accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (!result.success) {
                         this.toastService.error(result.error || 'Failed to send XRP');
                         return;
                    }

                    await this.refreshAfterTx(client, wallet);
                    this.txUiService.ticketCountField.set('');
               } catch (error: any) {
                    console.error('Error in createTicket:', error);
                    this.toastService.error(error.message || 'Unexpected error occurred', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async deleteSelectedTickets(): Promise<void> {
          await this.withPerf('createTickets', async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) {
                    return this.toastService.error('Please select a wallet.');
               }

               try {
                    const tickets = this.txUiService.selectedTicketSequences();
                    if (tickets.length === 0) {
                         this.toastService.error('No tickets selected.', AppConstants.TOAST.ERROR);
                         return;
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeTickets: true,
                    });

                    const { client, accountInfo, accountObjects, ticketObjects, wallet } = env;

                    if (!accountInfo || !accountObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    const ticketsToDelete = this.txUiService.selectedTicketSequences();
                    if (ticketsToDelete.length === 0) {
                         return this.toastService.error('No tickets selected to delete.', AppConstants.TOAST.ERROR);
                    }

                    if (!ticketObjects) {
                         return this.toastService.error('Failed to fetch ticket data.', AppConstants.TOAST.ERROR);
                    }

                    const result = await this.ticketsOrchestratorService.deleteTickets({
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.ticketsUtilService.getTransactionValues(),
                              ticketSequences: this.txUiService.selectedTicketSequences(),
                         },
                         preFetchedEnv: {
                              client,
                              accountInfo,
                              accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (!result.success) {
                         this.toastService.error(result.error || 'Failed to delete tickets');
                         return;
                    }

                    await this.refreshAfterTx(client, wallet);
                    this.clearFields();
               } catch (err: any) {
                    console.error('Erorr deleting tickets failed', err);
                    this.toastService.error(err.message || 'Failed to delete tickets', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
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
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
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

     toggleSelectAll(): void {
          if (this.allTicketsSelected()) {
               this.txUiService.selectedTicketSequences.set([]);
          } else {
               this.txUiService.selectedTicketSequences.set([...this.txUiService.ticketArray()]); // already strings
          }
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
