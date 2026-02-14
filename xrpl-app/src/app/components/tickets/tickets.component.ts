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
import { TxEnvironmentServiceService } from '../../services/transaction-environment/tx-environment-service.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { TemplatePortal } from '@angular/cdk/portal';
import { EMPTY, from, switchMap } from 'rxjs';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';

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
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentServiceService = inject(TxEnvironmentServiceService);

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
     ticketArray = signal<string[]>([]);
     ticketCountField = signal<string>('');
     walletTicketCount = signal<number>(0);

     readonly currentAddress = computed(() => this.currentWallet().address);

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || 'Selected wallet';
          const count = this.walletTicketCount();

          const label = this.activeTab() === 'create' ? 'available Tickets for use.' : 'Tickets that can be deleted.';

          return `<code>${walletName}</code> wallet has <strong class="object-count">${count}</strong> ${label}`;
     });

     private readonly hasWallets = computed(() => this.wallets().length > 0);

     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');

     readonly createTicketLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create Ticket';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly deleteTicketLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Delete Ticket';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly hasWalletsSignal = toSignal(this.walletManagerService.hasWallets$, { initialValue: false });

     filteredTickets = computed(() => {
          const tickets = this.txUiService.ticketArray();
          const q = this.ticketSearchQuery().trim();
          if (!q) return tickets;
          return tickets.filter(t => t.includes(q));
     });

     convertToString(ticket: any) {
          return ticket.toString();
     }

     allTicketsSelected = computed(() => {
          const tickets = this.txUiService.ticketArray();
          const selected = this.selectedTicketSequences();
          return tickets.length > 0 && selected.length === tickets.length;
     });

     hasSelectedTickets = computed(() => this.selectedTicketSequences().length > 0);

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
          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'create' | 'delete'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllOptions();
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) {
               await this.getTickets(false);
          }
     }

     async getTickets(forceRefresh = false): Promise<void> {
          await this.withPerf('getTickets', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.resetCurrentStepToIdle();

               if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) {
                    throw new Error('Please select a wallet.');
               }

               try {
                    const { wallet, accountInfo, accountObjects } = await this.txEnvironmentServiceService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         forceRefresh: forceRefresh,
                    });

                    const ticketObjects = accountObjects ? this.xrplService.filterAccountObjectsByTypes(accountObjects, ['Ticket']) : { result: { account_objects: [] } };
                    this.walletTicketCount.set(ticketObjects?.result.account_objects ? ticketObjects?.result.account_objects.length : 0);
                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getTickets:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async createTicket() {
          await this.withPerf('createTicket', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.resetCurrentStepToIdle();

               try {
                    const isSimulate = this.txUiService.isSimulateEnabled();
                    const useMultiSign = this.txUiService.useMultiSign();
                    const isRegularKeyAddress = this.txUiService.isRegularKeyAddress();
                    const regularKeyAddress = this.txUiService.regularKeyAddress();
                    const regularKeySeed = this.txUiService.regularKeySeed();
                    const multiSignAddress = this.txUiService.multiSignAddress();
                    const multiSignSeeds = this.txUiService.multiSignSeeds();

                    const { client, wallet, fee, currentLedger, accountInfo, accountObjects } = await this.txEnvironmentServiceService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (!accountInfo || !accountObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    const inputs = this.getValidationCreatTicketInputs(accountInfo, accountObjects, fee!, currentLedger!);

                    const errors = await this.validationService.validate('CreateTicket', { inputs, client, accountInfo });
                    if (errors.length) {
                         this.toastService.error(errors.join('\n• '), AppConstants.TOAST.ERROR);
                         return;
                    }

                    let ticketCreateTx: xrpl.TicketCreate = this.xrplTransactionService.buildTicketCreateTransaction(wallet, this.ticketCountField(), fee!, currentLedger!);

                    await this.setTxOptionalFields(client, ticketCreateTx, wallet);

                    const result = await this.ticketCreate(ticketCreateTx, wallet, client, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds);
                    if (!result.success) {
                         return this.toastService.error(result.error || `Failed to submit transaction`, AppConstants.TOAST.ERROR);
                    }

                    if (isSimulate) {
                         this.txUiService.resetCurrentStepToIdle();
                         this.toastService.success(`Simulated Creating ${this.ticketCountField()} tickets`, AppConstants.TOAST.SUCCESS, false, result.hash, this.txUiService.explorerUrl() + 'tx/');
                         return;
                    }

                    try {
                         const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, result.hash || '', ticketCreateTx.LastLedgerSequence!);
                         this.txUiService.setTxResultSignal(finalResult);
                         this.xrplTransactionService.processTxFinalResult(finalResult, `Successfully created ${this.ticketCountField()} tickets`, result);
                    } catch (waitError: any) {
                         this.xrplTransactionService.processTxError(waitError);
                    }

                    await this.refreshAfterTx(client, wallet);
                    this.clearAllSelections();
               } catch (error: any) {
                    console.error('Error in createTicket:', error);
                    this.toastService.error(error.message || 'Unexpected error occurred', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async deleteTicket() {
          await this.withPerf('deleteTicket', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.resetCurrentStepToIdle();

               try {
                    const isSimulate = this.txUiService.isSimulateEnabled();
                    const useMultiSign = this.txUiService.useMultiSign();
                    const isRegularKeyAddress = this.txUiService.isRegularKeyAddress();
                    const regularKeyAddress = this.txUiService.regularKeyAddress();
                    const regularKeySeed = this.txUiService.regularKeySeed();
                    const multiSignAddress = this.txUiService.multiSignAddress();
                    const multiSignSeeds = this.txUiService.multiSignSeeds();

                    const { client, wallet, fee, currentLedger, ticketObjects } = await this.txEnvironmentServiceService.prepareTxEnvironment({
                         includeTickets: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const ticketsToDelete = this.selectedTicketSequences();
                    if (ticketsToDelete.length === 0) {
                         return this.toastService.error('No tickets selected to delete.', AppConstants.TOAST.ERROR);
                    }

                    if (!ticketObjects) {
                         return this.toastService.error('Failed to fetch ticket data.', AppConstants.TOAST.ERROR);
                    }

                    this.txUiService.suppressSuccessMessage.set(true);

                    const { existingTickets, validTickets, invalidTickets }: { existingTickets: Set<string>; validTickets: string[]; invalidTickets: string[] } = this.getValidAndInvalidTickets(ticketObjects);
                    this.filterTickets(ticketsToDelete, existingTickets, validTickets, invalidTickets);
                    if (validTickets.length === 0) {
                         this.showInvalidTicketsError(invalidTickets);
                    }

                    const { successCount, deletedResults } = await this.processTicketDeletions(validTickets, wallet, client, fee!, currentLedger!, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds, isSimulate);
                    if (successCount > 0) {
                         await this.confirmDeletions(client, deletedResults, currentLedger!);
                         this.showSuccessMessage(isSimulate, successCount, deletedResults);
                         this.txUiService.currentStep.set('success');
                    } else {
                         this.txUiService.currentStep.set('failed');
                    }

                    this.showSkippedTicketsInfo(invalidTickets);
                    await this.refreshAfterTx(client, wallet);
                    this.clearAllSelections();
               } catch (error: any) {
                    console.error('Critical error in deleteTicket:', error);
                    this.toastService.error(error.message || 'Unexpected error occurred', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     private async ticketCreate(ticketCreateTx: xrpl.TicketCreate, wallet: xrpl.Wallet, client: xrpl.Client, useMultiSign: boolean, isRegularKeyAddress: boolean, regularKeyAddress: string, regularKeySeed: string, multiSignAddress: string, multiSignSeeds: string) {
          return await this.txExecutor.ticketCreate(ticketCreateTx, wallet, client, {
               useMultiSign: useMultiSign,
               isRegularKeyAddress: isRegularKeyAddress,
               regularKeyAddress: regularKeyAddress,
               regularKeySeed: regularKeySeed,
               multiSignAddress: multiSignAddress,
               multiSignSeeds: multiSignSeeds,
          });
     }

     private async ticketDelete(accountSetTx: xrpl.AccountSet, wallet: xrpl.Wallet, client: xrpl.Client, useMultiSign: boolean, isRegularKeyAddress: boolean, regularKeyAddress: string, regularKeySeed: string, multiSignAddress: string, multiSignSeeds: string, progressMsg: string) {
          return await this.txExecutor.ticketDelete(accountSetTx, wallet, client, {
               useMultiSign: useMultiSign,
               isRegularKeyAddress: isRegularKeyAddress,
               regularKeyAddress: regularKeyAddress,
               regularKeySeed: regularKeySeed,
               multiSignAddress: multiSignAddress,
               multiSignSeeds: multiSignSeeds,
               suppressIndividualFeedback: true, // we handle feedback ourselves
               customSpinnerMessage: progressMsg,
          });
     }

     private async processTicketDeletions(validTickets: string[], wallet: xrpl.Wallet, client: xrpl.Client, fee: string, currentLedger: number, useMultiSign: boolean, isRegularKeyAddress: boolean, regularKeyAddress: string, regularKeySeed: string, multiSignAddress: string, multiSignSeeds: string, isSimulate: boolean) {
          let successCount = 0;
          const deletedResults: { ticketSeq: string; hash: string }[] = [];

          for (const ticketSeq of validTickets) {
               const tx = this.xrplTransactionService.buildTicketDeleteTransaction(wallet, ticketSeq, fee, currentLedger);

               await this.setTxOptionalFields(client, tx, wallet);

               const result = await this.ticketDelete(tx, wallet, client, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds, '');

               if (!result.success) {
                    this.toastService.error(`Failed to delete ticket ${ticketSeq}: ${result.error || 'Unknown'}`);
                    continue;
               }

               successCount++;
               if (result.hash) {
                    deletedResults.push({ ticketSeq, hash: result.hash });
               }
          }

          return { successCount, deletedResults };
     }

     private getValidAndInvalidTickets(ticketObjects: xrpl.AccountObjectsResponse) {
          const existingTickets = new Set(ticketObjects.result.account_objects.map((t: any) => String(t.TicketSequence)));
          const invalidTickets: string[] = [];
          const validTickets: string[] = [];
          return { existingTickets, validTickets, invalidTickets };
     }

     private filterTickets(ticketsToDelete: string[], existingTickets: Set<string>, validTickets: string[], invalidTickets: string[]) {
          for (const seq of ticketsToDelete) {
               if (existingTickets.has(seq)) {
                    validTickets.push(seq);
               } else {
                    invalidTickets.push(seq);
               }
          }
     }

     private showInvalidTicketsError(invalidTickets: string[]) {
          const list = invalidTickets.map(n => `<code>${n}</code>`).join(', ');
          this.toastService.error(`None of the selected tickets exist. Invalid: ${list}`, AppConstants.TOAST.ERROR);
     }

     private showStartingToast(isSimulate: boolean, count: number) {
          if (!isSimulate) {
               this.txUiService.currentStep.set('preparing');
               const verb = isSimulate ? 'Simulating deletion of' : 'Deleting';
               this.toastService.info(`${verb} ${count} ticket(s)...`, AppConstants.TOAST.INFO);
          }
     }

     private async confirmDeletions(client: xrpl.Client, deletedResults: { ticketSeq: string; hash: string }[], currentLedger: number) {
          const lastLedger = currentLedger + AppConstants.LAST_LEDGER_ADD_TIME;

          for (const { hash } of deletedResults) {
               try {
                    const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, hash, lastLedger);
                    this.txUiService.addTxResultSignal(finalResult);
               } catch (err: any) {
                    console.error(`Confirmation failed for hash ${hash.slice(0, 8)}...:`, err);
                    // Don't fail whole operation
               }
          }
     }

     private showSuccessMessage(isSimulate: boolean, successCount: number, deletedResults: any[]) {
          const msg = isSimulate ? `Simulated deletion of ${successCount} ticket(s) successfully!` : `${successCount} ticket(s) deleted successfully!`;
          this.toastService.successMultipleHashesWithTickets(msg, AppConstants.TOAST.SUCCESS, deletedResults, this.txUiService.explorerUrl() + 'tx/');
     }

     private showSkippedTicketsInfo(invalidTickets: string[]) {
          if (invalidTickets.length > 0) {
               const list = invalidTickets.map(n => `<code>${n}</code>`).join(', ');
               this.toastService.info(`Some tickets not found and skipped: ${list}`, AppConstants.TOAST.INFO);
          }
     }

     private getValidationCreatTicketInputs(accountInfo: xrpl.AccountInfoResponse, accountObjects: xrpl.AccountObjectsResponse, fee: string, currentLedger: number) {
          return this.txUiService.getValidationInputs({
               wallet: this.currentWallet(),
               network: { accountInfo, accountObjects, fee, currentLedger },
               createTicket: { ticketCountField: this.txUiService.ticketCountField.set(this.ticketCountField()) },
               regularKey: { isRegularKey: this.txUiService.isRegularKeyAddress(), address: this.txUiService.regularKeyAddress(), seed: this.txUiService.regularKeySeed() },
          });
     }

     private async setTxOptionalFields(client: xrpl.Client, ticketTx: any, wallet: xrpl.Wallet) {
          const isTicket = this.txUiService.isTicket();
          if (isTicket) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(ticketTx, ticket, true);
               }
          }
          const memoField = this.txUiService.memoField();
          if (this.txUiService.isMemoEnabled() && memoField) {
               this.utilsService.setMemoField(ticketTx, memoField);
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

          const ticketObjects = this.xrplService.filterAccountObjectsByTypes(accountObjects, ['Ticket']);
          this.walletTicketCount.set(ticketObjects.result.account_objects.length);

          await this.refreshWallets(client, [wallet.classicAddress]);
          this.refreshUiState(wallet, accountInfo, accountObjects);
          this.txUiService.clearAllOptions();
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
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

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields() {
          this.clearAllSelections();
          this.txUiService.clearAllOptionsAndMessages();
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

     toggleTicketSelection(ticket: string): void {
          this.selectedTicketSequences.update(list => (list.includes(ticket) ? list.filter(t => t !== ticket) : [...list, ticket]));
          this.txUiService.clearAllOptionsAndMessages();
     }

     toggleSelectAll(): void {
          if (this.allTicketsSelected()) {
               this.selectedTicketSequences.set([]);
          } else {
               this.selectedTicketSequences.set([...this.txUiService.ticketArray()]); // already strings
          }
     }

     clearAllSelections(): void {
          if (this.selectedTicketSequences().length) {
               this.selectedTicketSequences.set([]);
          }
          this.ticketCountField.set('');
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
          requestAnimationFrame(() => {
               const el = this.ticketOverlayRef?.overlayElement.querySelector('.ticket-item.highlighted') as HTMLElement;
               el?.scrollIntoView({ block: 'nearest' });
          });
     }
}
