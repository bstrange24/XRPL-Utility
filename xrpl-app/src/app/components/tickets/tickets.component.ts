import { Component, OnInit, ElementRef, ViewChild, inject, TemplateRef, ViewContainerRef, ChangeDetectionStrategy, signal, computed, DestroyRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { TemplatePortal } from '@angular/cdk/portal';

@Component({
     selector: 'app-tickets',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './tickets.component.html',
     styleUrl: './tickets.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTicketsComponent extends PerformanceBaseComponent implements OnInit {
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('ticketDropdownInput') ticketDropdownInput!: ElementRef<HTMLInputElement>;
     @ViewChild('ticketDropdownTemplate') ticketDropdownTemplate!: TemplateRef<any>;

     private ticketOverlayRef: OverlayRef | null = null;
     private readonly overlay = inject(Overlay);
     private readonly viewContainerRef = inject(ViewContainerRef);

     private readonly destroyRef = inject(DestroyRef);
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);

     // Destination Dropdown
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     // Ticket dropdown state
     ticketSearchQuery = signal<string>('');
     selectedTicketSequences = signal<string[]>([]); // ← string[]
     isTicketDropdownOpen = signal(false);
     highlightedTicketIndex = signal<number>(-1);

     // Reactive State (Signals)
     activeTab = signal<'create' | 'delete'>('create');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     selectedSingleTicket = signal<string>('');
     selectedTickets = signal<string[]>([]);
     multiSelectMode = signal(false);
     selectedTicket = signal<string>('');
     ticketArray = signal<string[]>([]);
     ticketCountField = signal<string>('');
     deleteTicketSequence = signal<string>('');
     walletTicketCount = signal<number>(0);

     destinations = computed(() => [
          ...this.wallets().map((w: DropdownItem) => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
          })),
          ...this.customDestinations(),
     ]);

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) {
               return null;
          }

          const walletName = wallet.name || 'Selected wallet';
          const count = this.walletTicketCount();

          const label = this.activeTab() === 'create' ? 'available Tickets for use.' : 'Tickets that can be deleted.';

          return `<code>${walletName}</code> wallet has <strong>${count}</strong> ${label}`;
     });

     hasWallets = computed(() => this.wallets().length > 0);

     filteredTickets = computed(() => {
          const query = this.ticketSearchQuery().trim();
          const all = this.txUiService.ticketArray(); // ← should be string[]

          if (!query) return all;

          return all.filter(t => t.includes(query));
     });

     convertToString(ticket: any) {
          return ticket.toString();
     }

     allTicketsSelected = computed(() => {
          const selected = this.selectedTicketSequences();
          const total = this.txUiService.ticketArray().length;
          return selected.length === total && total > 0;
     });

     hasSelectedTickets = computed(() => this.selectedTicketSequences().length > 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.(); // or just clear messages when appropriate
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
               }
          });

          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) this.selectWallet(wallet);
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearAllOptionsAndMessages();
                    this.clearFields();
                    await this.getTickets(false);
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          // Prevent self as destination
          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     trackByWalletAddress(index: number, wallet: any) {
          return wallet.address;
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'create' | 'delete'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) {
               await this.getTickets();
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getTickets(forceRefresh = false): Promise<void> {
          await this.withPerf('getTickets', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const ticketObjects = this.xrplService.filterAccountObjectsByTypes(accountObjects, ['Ticket']);
                    this.utilsService.logObjects('ticketObjects', ticketObjects);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.walletTicketCount.set(ticketObjects.result.account_objects.length);
                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getTickets:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createTicket() {
          await this.withPerf('createTicket', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    // const inputs = this.txUiService.getValidationInputs({
                    //      wallet: this.currentWallet(),
                    //      paymentXrp: { amount: this.txUiService.amountField() },
                    // });

                    // const errors = await this.validationService.validate('CreateTicket', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.join('\n• '));
                    // }

                    let ticketCreateTx: xrpl.TicketCreate = {
                         TransactionType: 'TicketCreate',
                         Account: wallet.classicAddress,
                         TicketCount: parseInt(this.ticketCountField()),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, ticketCreateTx, wallet, '');

                    const result = await this.txExecutor.ticketCreate(ticketCreateTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Ticket creation successfully!' : 'Created ticket successfully!';
                    await this.refreshAfterTx(client, wallet, null, true);
               } catch (error: any) {
                    console.error('Error in createTicket:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async deleteTicket() {
          await this.withPerf('deleteTicket', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    // const inputs = this.txUiService.getValidationInputs({
                    //      wallet: this.currentWallet(),
                    //      paymentXrp: { amount: this.txUiService.amountField() },
                    // });

                    // const errors = await this.validationService.validate('DeleteTicket', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.join('\n• '));
                    // }

                    const [ticketObjects] = await Promise.all([await this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'ticket')]);
                    const ticketsToDelete = this.selectedTicketSequences();
                    if (!ticketsToDelete.length || this.walletTicketCount() === 0) {
                         this.txUiService.setWarning(`Ticket <code>${this.deleteTicketSequence}</code> does not exist on this account.`);
                         return;
                    }

                    // === SHOW ONE SPINNER FOR THE ENTIRE BATCH ===
                    const total = ticketsToDelete.length;
                    const isSimulate = this.txUiService.isSimulateEnabled();
                    this.txUiService.showSpinnerWithDelay(isSimulate ? `Simulating deletion of ${total} ticket(s)...` : `Deleting ${total} ticket(s)...`, 200);

                    let ticketsSuccessfullyDeleted = 0;
                    const invalidTickets: string[] = [];
                    const deletedHashes: string[] = [];

                    for (let i = 0; i < ticketsToDelete.length; i++) {
                         const ticketSeq = ticketsToDelete[i];

                         // Update spinner with progress BEFORE calling executor
                         const progressMsg = isSimulate ? `Simulating ticket ${i + 1}/${total}...` : `Deleting ticket ${i + 1}/${total}...`;
                         this.txUiService.updateSpinnerMessage(progressMsg);

                         const ticketExists = ticketObjects.result.account_objects.some((ticket: any) => ticket.TicketSequence === Number(ticketSeq));
                         let currentLedger = await this.xrplService.getLastLedgerIndex(client);

                         if (!ticketExists) {
                              console.warn(`Ticket ${ticketSeq} does not exist for account ${wallet.classicAddress}`);
                              invalidTickets.push(ticketSeq);
                              continue; // skip non-existing ticket
                         }

                         let accountSetTx: xrpl.AccountSet = {
                              TransactionType: 'AccountSet',
                              Account: wallet.classicAddress,
                              TicketSequence: Number(ticketSeq),
                              Sequence: 0,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };

                         await this.setTxOptionalFields(client, accountSetTx, wallet, ticketSeq);

                         const result = await this.txExecutor.ticketDelete(accountSetTx, wallet, client, {
                              useMultiSign: this.txUiService.useMultiSign(),
                              isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                              regularKeySeed: this.txUiService.regularKeySeed(),
                              multiSignAddress: this.txUiService.multiSignAddress(),
                              multiSignSeeds: this.txUiService.multiSignSeeds(),
                              suppressIndividualFeedback: true,
                              customSpinnerMessage: progressMsg, // ← This preserves your message
                         });

                         if (result.success) {
                              ticketsSuccessfullyDeleted++;
                              deletedHashes.push(result.hash!);
                         } else {
                              this.txUiService.setError(`${result.error}`);
                              return;
                         }
                    }

                    // === FINAL SUCCESS - ONLY ONCE ===
                    if (ticketsSuccessfullyDeleted > 0) {
                         // Push all collected hashes ONCE
                         deletedHashes.forEach(hash => this.txUiService.addTxHashSignal(hash));

                         this.utilsService.setSuccess(this.utilsService.result);
                         this.txUiService.successMessage = isSimulate ? `Simulated deletion of ${ticketsSuccessfullyDeleted} ticket(s) successfully!` : `${ticketsSuccessfullyDeleted} ticket(s) deleted successfully!`;
                    }

                    // Show one warning that contains *all* missing tickets
                    if (invalidTickets.length) {
                         const listHtml = invalidTickets.map(n => `<code>${n}</code>`).join(', ');
                         const plural = invalidTickets.length > 1 ? 's' : '';
                         this.txUiService.setWarning(`Ticket${plural} ${listHtml} do${plural ? '' : 'es'} not exist on this account.`);
                    } else {
                         this.txUiService.clearWarning(); // nothing missing → hide the panel
                    }

                    // this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Ticket deletion successfully!' : `${ticketsSuccessfullyDeleted} Ticket(s) deleted successfully!`;
                    await this.refreshAfterTx(client, wallet, null, true);
                    this.clearAllSelections();
               } catch (error: any) {
                    console.error('Error in deleteTicket:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, ticketTx: any, wallet: xrpl.Wallet, ticketSeq: any) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(ticketTx, ticket, true);
               }
          }
          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(ticketTx, this.txUiService.memoField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

          const ticketObjects = this.xrplService.filterAccountObjectsByTypes(accountObjects, ['Ticket']);
          this.walletTicketCount.set(ticketObjects.result.account_objects.length);

          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest && destination) this.addNewDestinationFromUser(destination);
          this.refreshUiState(wallet, accountInfo, accountObjects);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     updateDeleteTicketSequence(): void {
          if (this.multiSelectMode()) {
               // Join all selected tickets into a comma-separated string
               this.deleteTicketSequence.set(this.selectedTickets().join(','));
          } else {
               // Just one ticket selected
               this.deleteTicketSequence = this.selectedSingleTicket || '';
          }
     }

     clearDeleteTicketSequence() {
          if (!this.multiSelectMode) {
               this.deleteTicketSequence.set('');
               this.selectedSingleTicket.set('');
          }
     }

     private refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          // Update multi-sign & regular key flags
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          this.txUiService.regularKeySigningEnabled.set(hasRegularKey);

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.txUiService.signerQuorum.set(signerQuorum);
          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

          this.txUiService.multiSigningEnabled.set(hasSignerList);
          if (hasSignerList) {
               const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.txUiService.signers.set(entries);
          }

          const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };

          this.txUiService.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.txUiService.regularKeySeed.set(rkProps.regularKeySeed);
     }

     private setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
          const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
          this.txUiService.signers.set(signerEntries);
          this.txUiService.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
          this.txUiService.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     }

     private clearMultiSignersConfiguration(): void {
          this.txUiService.signerQuorum.set(0);
          this.txUiService.multiSignAddress.set('No Multi-Sign address configured for account');
          this.txUiService.multiSignSeeds.set('');
          this.storageService.removeValue('signerEntries');
     }

     updateDestinations() {
          // Optional: persist destinations
          const allItems = [
               ...this.wallets().map(wallet => ({
                    name: wallet.name ?? this.truncateAddress(wallet.address),
                    address: wallet.address,
               })),
               ...this.customDestinations(),
          ];
          this.storageService.set('destinations', allItems);
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields() {
          this.clearAllSelections();
          this.txUiService.clearAllOptionsAndMessages();
     }

     openTicketDropdown(): void {
          if (this.ticketOverlayRef?.hasAttached()) return;

          const positionStrategy = this.overlay
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
               ]);

          this.ticketOverlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.reposition(),
               width: this.ticketDropdownInput.nativeElement.getBoundingClientRect().width,
          });

          if (this.ticketOverlayRef) {
               this.ticketOverlayRef.attach(new TemplatePortal(this.ticketDropdownTemplate, this.viewContainerRef));
               this.ticketOverlayRef.backdropClick().subscribe(() => this.closeTicketDropdown());
          }

          this.highlightedTicketIndex.set(-1); // reset

          // this.ticketOverlayRef.attach(new TemplatePortal(this.ticketDropdownTemplate, this.viewContainerRef));
          // this.highlightedTicketIndex.set(-1);
          // this.ticketOverlayRef.backdropClick().subscribe(() => this.closeTicketDropdown());
     }

     closeTicketDropdown(): void {
          this.ticketOverlayRef?.dispose();
          this.ticketOverlayRef = null;
          this.isTicketDropdownOpen.set(false);
     }

     toggleTicketDropdown(): void {
          this.ticketOverlayRef?.hasAttached() ? this.closeTicketDropdown() : this.openTicketDropdown();
     }

     toggleTicketSelection(ticket: string): void {
          this.selectedTicketSequences.update(list => (list.includes(ticket) ? list.filter(t => t !== ticket) : [...list, ticket]));
     }

     toggleSelectAll(): void {
          if (this.allTicketsSelected()) {
               this.selectedTicketSequences.set([]);
          } else {
               this.selectedTicketSequences.set([...this.txUiService.ticketArray()]); // already strings
          }
     }

     clearAllSelections(): void {
          this.selectedTicketSequences.set([]);
     }

     onTicketSearchInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.ticketSearchQuery.set(value);
     }

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
          setTimeout(() => {
               const highlightedEl = document.querySelector('.ticket-item.highlighted') as HTMLElement;
               highlightedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
     }
}
