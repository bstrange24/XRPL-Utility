import { Component, OnInit, inject, computed, DestroyRef, signal, ChangeDetectionStrategy, Signal, WritableSignal, effect } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { UtilsService } from '../../services/util-service/utils.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TooltipLinkComponent } from '../shared/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { EMPTY, from, switchMap } from 'rxjs';
import { EscrowObject } from '../../models/interface-items.model';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { CheckUtilService } from '../../services/checks/check-util/check-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { MptUtilService } from '../../services/mpt-service/mpt-util/mpt-util.service';
import { EscrowUtilService } from '../../services/escrow/escrow-util/escrow-util.service';
import { TimeBasedEscrowOrchestrator } from '../../services/escrow/escrow-orchestrator/escrow-orchestrator.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';

@Component({
     selector: 'app-time-escrow',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     templateUrl: './time-escrow.component.html',
     styleUrl: './time-escrow.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTimeEscrowComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly timeBasedEscrowOrchestrator = inject(TimeBasedEscrowOrchestrator);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');

     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     activeTab = signal<'create' | 'finish' | 'cancel'>('create');
     currencyFieldDropDownValue = signal<string>('XRP');
     isMptEnabled = signal(false);
     escrowFinishTimeField = signal<string>('');
     escrowCancelTimeField = signal<string>('');
     escrowOwnerField = signal<string>('');
     escrowSequenceNumberField = signal<string>('');
     selectedEscrow = signal<any>(null);
     expiredOrFulfilledEscrows = signal<any[]>([]);
     allEscrowsRaw = signal<any[]>([]); // holds raw escrow objects from ledger
     finishEscrow = signal<any[]>([]);
     existingEscrow = signal<any[]>([]);
     existingIOUs = signal<any[]>([]);
     existingMpts = signal<any[]>([]);
     outstandingEscrowCollapsed = signal<boolean>(true);
     outstandingMptCollapsed = signal<boolean>(true);
     outstandingIOUCollapsed = signal<boolean>(true);

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     readonly currentAddress = computed(() => this.currentWallet().address);
     private readonly hasWallets = computed(() => this.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');
     readonly hasWalletsSignal = toSignal(this.walletManagerService.hasWallets$, { initialValue: false });

     escrowItems = computed(() => this.escrowUtilService.escrowItems(this.allEscrowsRaw(), this.currentWallet().address, this.activeTab() === 'cancel'));

     selectedEscrowItem = computed(() => this.escrowUtilService.selectedEscrowItem(this.escrowItems(), this.escrowSequenceNumberField()));

     selectedIssuerAddress = computed(() => this.trustlineCurrencyService.getSelectedIssuer());

     // Currency dropdown → use service
     currencyItems = this.trustlineCurrencyService.getCurrencyItems();

     // Selected currency
     selectedCurrencyItem = computed(() => {
          const code = this.currencyFieldDropDownValue();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     });

     // Issuer dropdown → use service
     issuerItems = this.trustlineCurrencyService.getIssuerItems();

     // Selected issuer
     selectedIssuerItem = computed(() => {
          const addr = this.trustlineCurrencyService.selectedIssuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     });

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const explorerBase = this.txUiService.explorerUrl();
          const address = wallet.address;

          let escrowCount = 0;
          let escrowsToShow: any[] = [];

          switch (this.activeTab()) {
               case 'create': {
                    // On create tab → show escrows YOU created (outgoing)
                    const outgoing = this.allEscrowsRaw().filter(e => e.Sender === address);
                    escrowCount = outgoing.length;
                    escrowsToShow = outgoing.map(e => ({
                         index: e.EscrowSequence?.toString() || 'Unknown',
                         amount: this.escrowUtilService.formatEscrowAmount(e.Amount),
                         destination: e.Destination,
                         finishAfter: e.FinishAfter,
                         cancelAfter: e.CancelAfter,
                         isExpired: this.escrowUtilService.isEscrowExpired(e.CancelAfter, e.FinishAfter, this.activeTab()),
                    }));
                    break;
               }
               case 'finish': {
                    // On finish tab → show escrows sent TO you that are finishable
                    const incoming = this.allEscrowsRaw().filter(e => e.Destination === address);
                    escrowCount = incoming.length;
                    escrowsToShow = incoming.map(e => ({
                         index: e.EscrowSequence?.toString() || 'Unknown',
                         amount: this.escrowUtilService.formatEscrowAmount(e.Amount),
                         sender: e.Sender,
                         finishAfter: e.FinishAfter,
                         isExpired: this.escrowUtilService.isEscrowExpired(e.CancelAfter, e.FinishAfter),
                    }));
                    break;
               }
               case 'cancel': {
                    // On cancel tab → show escrows YOU created that are cancellable (past CancelAfter)
                    const cancellable = this.allEscrowsRaw().filter(e => e.Sender === address);
                    escrowCount = cancellable.length;
                    escrowsToShow = cancellable.map(e => ({
                         index: e.EscrowSequence?.toString() || 'Unknown',
                         amount: this.escrowUtilService.formatEscrowAmount(e.Amount),
                         destination: e.Destination,
                         cancelAfter: e.CancelAfter,
                         isExpired: this.escrowUtilService.isEscrowExpired(e.CancelAfter, e.FinishAfter),
                    }));
                    break;
               }
          }

          // Build the links (only on create tab we show all 3)
          const links: string[] = [];
          if (this.activeTab() === 'create') {
               const hasEscrows = this.existingEscrow().length > 0;
               const hasIOUs = this.existingIOUs().length > 0;
               const hasMPTs = this.existingMpts().length > 0;

               if (hasEscrows) links.push(`<a href="${explorerBase}account/${address}/escrows" target="_blank" rel="noopener" class="xrpl-win-link">View Escrows</a>`);
               if (hasIOUs) links.push(`<a href="${explorerBase}account/${address}/tokens" target="_blank" rel="noopener" class="xrpl-win-link">View IOUs</a>`);
               if (hasMPTs) links.push(`<a href="${explorerBase}account/${address}/mpts/owned" target="_blank" rel="noopener" class="xrpl-win-link">View MPTs</a>`);
          }

          return {
               walletName,
               escrowCount,
               escrowsToShow,
               links: links.length > 0 ? links.join(' | ') : null,
               activeTab: this.activeTab(),
          };
     });

     selectedEscrowIsExpired = computed(() => {
          const selected = this.selectedEscrowItem();
          if (!selected) return false;

          // Look up full escrow by sequence
          const fullEscrow = this.allEscrowsRaw().find(e => e.EscrowSequence?.toString() === selected.id);

          return !!fullEscrow && this.escrowUtilService.isEscrowExpired(fullEscrow.CancelAfter, fullEscrow.FinishAfter, 'finish');
     });

     // MPT Dropdown Items
     mptItems = computed(() => this.mptUtilService.computeMptItems(this.existingMpts()));

     selectedMptItem = computed(() => this.mptUtilService.computeSelectedMptItem(this.mptItems(), this.txUiService.mptIssuanceIdField()));

     onMptSelected(item: SelectItem | null) {
          this.txUiService.mptIssuanceIdField.set(item?.id || '');
     }

     currencyBalanceField = this.trustlineCurrencyService.balance;

     constructor() {
          super();
          // Auto-select typed address if it's valid and not already selected
          effect(() => {
               if (this.trustlineCurrencyService.currencies().length > 0 && !this.currencyFieldDropDownValue()) {
                    this.currencyFieldDropDownValue.set(this.trustlineCurrencyService.currencies()[0]);
                    this.trustlineCurrencyService.selectCurrency(this.trustlineCurrencyService.currencies()[0], '');
               }
          });

          effect(() => {
               const typed = this.destinationSearchQuery().trim();
               const current = this.selectedDestinationAddress();

               if (typed && typed !== current && xrpl.isValidAddress(typed)) {
                    if (!this.allDestinations().some(d => d.address === typed)) {
                         this.selectedDestinationAddress.set(typed);
                    }
               }
          });

          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.trustlineCurrencyService.setPreferXrpAsDefault(true);
          this.trustlineCurrencyService.setXrpInDropdown(true);
          this.trustlineCurrencyService.setAddMptInDropdown(true);

          this.transactionDropdownService.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.setExpirationToNow();

          if (this.trustlineCurrencyService.currencies().length > 0) {
               this.trustlineCurrencyService.selectCurrency(this.trustlineCurrencyService.currencies()[0], '');
          }

          this.txUiService.clearAllOptions();
     }

     onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id || 'XRP';
          this.currencyFieldDropDownValue.set(currency);
          this.trustlineCurrencyService.selectCurrency(currency, '');
          this.txUiService.clearAllOptionsAndMessages();
     }

     onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);
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
                         return from(this.getEscrows(false));
                    })
               )
               .subscribe();
     }

     private selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
          this.setExpirationToNow();

          const currencyValue = this.currencyFieldDropDownValue();
          this.currencyFieldDropDownValue.set(currencyValue || 'XRP');
          this.onCurrencyChange(currencyValue); // triggers issuer reload + balance update
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

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     onEscrowSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.escrowSequenceNumberField.set('');
               this.escrowOwnerField.set('');
               return;
          }

          const escrow = this.expiredOrFulfilledEscrows().find((e: any) => e.EscrowSequence?.toString() === item.id);

          if (escrow) {
               this.escrowSequenceNumberField.set(escrow.EscrowSequence);
               this.escrowOwnerField.set(escrow.Sender); // owner is the sender
          }
     }

     async setTab(tab: 'create' | 'finish' | 'cancel'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          this.clearFields();
          if (this.hasWallets()) {
               await this.getEscrows(false);
               this.setExpirationToNow();
          }
     }

     async getEscrows(forceRefresh = false): Promise<void> {
          await this.measure('getEscrows', true, async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.resetCurrentStepToIdle();

               if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) {
                    return this.toastService.error('Please select a wallet.');
               }

               try {
                    const { wallet, accountInfo, accountObjects } = await this.measure('getEscrows:prepareTxEnvironment', false, async () =>
                         this.txEnvironmentService.prepareTxEnvironment({
                              includeAccountInfo: true,
                              includeAccountObject: true,
                              forceRefresh: forceRefresh,
                         })
                    );

                    if (!accountInfo || !accountObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    await this.measure('getEscrows:processAndUpdate', false, async () => {
                         this.existingEscrow.set(this.escrowUtilService.getExistingEscrows(accountObjects, wallet.classicAddress));
                         this.expiredOrFulfilledEscrows.set(await this.escrowUtilService.getExpiredOrFulfilledEscrows(accountObjects, wallet.classicAddress, this.activeTab()));
                         this.existingMpts.set(this.mptUtilService.getExistingMpts(accountObjects, wallet.classicAddress));
                         this.existingIOUs.set(this.trustlineCurrencyService.getExistingIOUs(accountObjects, wallet.classicAddress));
                         const escrows = await this.escrowUtilService.loadAllEscrows(accountObjects);
                         this.allEscrowsRaw.set(escrows);

                         const currencyValue = this.currencyFieldDropDownValue();
                         if (currencyValue !== 'XRP' && currencyValue !== 'MPT' && this.trustlineCurrencyService.selectedIssuer()) {
                              this.trustlineCurrencyService.selectCurrency(currencyValue, '');
                         }

                         this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
                    });
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async createTimeBasedEscrow() {
          await this.withPerf('createTimeBasedEscrow', async () => {
               try {
                    const destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

                    if (!destinationAddress) {
                         return this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeDestinationAccountInfo: true,
                         destinationAddress,
                    });

                    if (!env.accountInfo || !env.accountObjects || !env.destinationAccountInfo) {
                         throw new Error('Failed to fetch account information');
                    }

                    const result = await this.timeBasedEscrowOrchestrator.executeEscrowTx('create', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.getTransactionValues(),
                              destinationAddress,
                              currencyValue: this.currencyFieldDropDownValue?.() || 'XRP',
                              issuer: this.trustlineCurrencyService?.selectedIssuer?.() || '',
                         },
                         extra: {},
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              destinationAccountInfo: env.destinationAccountInfo,
                              wallet: env.wallet,
                         },
                    });

                    if (!result.success) {
                         this.toastService.error(result.error || 'Failed to create time-based escrow');
                         return;
                    }

                    await this.refreshAfterTx(env.client, env.wallet, destinationAddress, true);

                    const currency = this.currencyFieldDropDownValue?.() || 'XRP';
                    if (currency !== 'XRP' && currency !== 'MPT') {
                         this.onCurrencyChange?.(currency);
                    }

                    this.clearFields();
               } catch (error: any) {
                    console.error(`Error creating escrow: ${error.message}`);
                    this.toastService.error(`Error creating escrow: ${error.message}`);
               }
          });
     }

     async finishTimeBasedEscrow() {
          await this.withPerf('finishTimeBasedEscrow', async () => {
               try {
                    const { escrowSequenceNumberField, escrowOwner } = this.getTransactionValues();

                    if (!escrowSequenceNumberField) {
                         return this.toastService.error('Sequence ID is required.', AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeEscrowBySequenceId: true,
                         escrowSequenceNumberField: escrowSequenceNumberField,
                    });

                    const currentRippleTime = await this.xrplService.getCurrentRippleTime(env.client);
                    const finishAfterNum = env.escrowObjectsBySequenceId.FinishAfter ? Number(env.escrowObjectsBySequenceId.FinishAfter) : undefined;
                    const cancelAfterNum = env.escrowObjectsBySequenceId.CancelAfter ? Number(env.escrowObjectsBySequenceId.CancelAfter) : undefined;
                    if (!finishAfterNum || !cancelAfterNum) {
                         throw new Error('Invalid escrow cancel after or finish after time');
                    }
                    const escrowStatus = this.escrowUtilService.checkEscrowStatus(
                         {
                              FinishAfter: Number(finishAfterNum),
                              CancelAfter: Number(cancelAfterNum),
                              owner: escrowOwner,
                         },
                         currentRippleTime,
                         env.wallet.classicAddress
                    );

                    if (!escrowStatus.canFinish && !escrowStatus.canCancel) {
                         return this.toastService.error(`${escrowStatus.reasonCancel} ${escrowStatus.reasonFinish}`);
                    }

                    if (!escrowStatus.canFinish) {
                         return this.toastService.error(`${escrowStatus.reasonFinish}`);
                    }

                    if (!escrowStatus.canFinish) {
                         return this.toastService.error(escrowStatus.reasonFinish || 'Cannot finish escrow yet');
                    }

                    const result = await this.timeBasedEscrowOrchestrator.executeEscrowTx('finish', {
                         wallet: this.currentWallet(),
                         formValues: { ...this.getTransactionValues(), escrowSequenceNumberField, escrowOwner },
                         extra: {},
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (!result.success) {
                         this.toastService.error(result.error || 'Failed to finish escrow');
                         return;
                    }

                    await this.refreshAfterTx(env.client, env.wallet, null, true);

                    const currency = this.currencyFieldDropDownValue?.() || 'XRP';
                    if (currency !== 'XRP' && currency !== 'MPT') {
                         this.onCurrencyChange?.(currency);
                    }

                    this.clearFields();
               } catch (error: any) {
                    console.error(`Error finishing escrow: ${error.message}`);
                    this.toastService.error(`Error finishing escrow: ${error.message}`);
               }
          });
     }

     async cancelEscrow() {
          await this.withPerf('cancelEscrow', async () => {
               try {
                    const { isSimulate, currencyValue, escrowSequenceNumberField } = this.getTransactionValues();

                    if (!escrowSequenceNumberField) {
                         return this.toastService.error('Escrow Sequence ID is required', AppConstants.TOAST.ERROR);
                    }

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeEscrows: true,
                    });

                    if (!env.accountInfo || !env.escrowObjects) {
                         throw new Error('Failed to fetch account information or escrows');
                    }

                    let { escrow, escrowOwner }: { escrow: EscrowObject | undefined; escrowOwner: string } = await this.escrowUtilService.findEscrowAndOwner(env.escrowObjects, escrowSequenceNumberField);
                    if (!escrow) {
                         return this.toastService.error(`No escrow found for sequence ${escrowSequenceNumberField}`, AppConstants.TOAST.ERROR);
                    }

                    const currentRippleTime = await this.xrplService.getCurrentRippleTime(env.client);
                    const finishAfterNum = escrow.FinishAfter ? Number(escrow.FinishAfter) : undefined;
                    const cancelAfterNum = escrow.CancelAfter ? Number(escrow.CancelAfter) : undefined;
                    if (!finishAfterNum || !cancelAfterNum) {
                         throw new Error('Invalid escrow cancel after or finish after time');
                    }
                    const escrowStatus = this.escrowUtilService.checkEscrowStatus(
                         {
                              FinishAfter: Number(finishAfterNum),
                              CancelAfter: Number(cancelAfterNum),
                              owner: escrowOwner,
                         },
                         currentRippleTime,
                         env.wallet.classicAddress
                    );

                    if (!escrowStatus.canCancel) {
                         return this.toastService.error(escrowStatus.reasonCancel || 'Cannot cancel this escrow yet', AppConstants.TOAST.ERROR);
                    }

                    const result = await this.timeBasedEscrowOrchestrator.executeEscrowTx('cancel', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.getTransactionValues(),
                              escrowSequenceNumberField,
                              escrowOwner, // pass the resolved owner
                         },
                         extra: {},
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              wallet: env.wallet,
                         },
                    });

                    if (!result.success) {
                         this.toastService.error(result.error || 'Failed to cancel escrow');
                         return;
                    }

                    await this.refreshAfterTx(env.client, env.wallet, null, true);

                    if (currencyValue !== 'XRP' && currencyValue !== 'MPT') {
                         this.onCurrencyChange(currencyValue);
                    }

                    if (!isSimulate) this.resetEscrowSelection();
                    this.clearFields();
               } catch (error: any) {
                    console.error(`Error cancelling escrow: ${error.message}`);
                    this.toastService.error(`Error cancelling escrow: ${error.message}`);
               }
          });
     }

     private getTransactionValues() {
          const amount = this.txUiService.amountField();
          const isSimulate = this.txUiService.isSimulateEnabled();
          const useMultiSign = this.txUiService.useMultiSign();
          const isRegularKeyAddress = this.txUiService.isRegularKeyAddress();
          const regularKeyAddress = this.txUiService.regularKeyAddress();
          const regularKeySeed = this.txUiService.regularKeySeed();
          const multiSignAddress = this.txUiService.multiSignAddress();
          const multiSignSeeds = this.txUiService.multiSignSeeds();
          const currencyValue = this.utilsService.encodeIfNeeded(this.trustlineCurrencyService.currentCurrency());
          const escrowSequenceNumberField = this.escrowSequenceNumberField();
          let escrowOwner = this.escrowOwnerField();
          const issuer = this.trustlineCurrencyService.selectedIssuer();
          const finishAfter = this.escrowFinishTimeField();
          const cancelAfter = this.escrowCancelTimeField();
          return { amount, isSimulate, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds, currencyValue, escrowSequenceNumberField, escrowOwner, issuer, finishAfter, cancelAfter };
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          this.existingEscrow.set(this.escrowUtilService.getExistingEscrows(accountObjects, wallet.classicAddress));
          this.existingMpts.set(this.mptUtilService.getExistingMpts(accountObjects, wallet.classicAddress));
          this.existingIOUs.set(this.trustlineCurrencyService.getExistingIOUs(accountObjects, wallet.classicAddress));
          this.expiredOrFulfilledEscrows.set(await this.escrowUtilService.getExpiredOrFulfilledEscrows(accountObjects, wallet.classicAddress, this.activeTab()));
          const escrows = await this.escrowUtilService.loadAllEscrows(accountObjects);
          this.allEscrowsRaw.set(escrows);

          await this.refreshWallets(client, destination ? [wallet.classicAddress, destination] : [wallet.classicAddress]);
          this.addCustomDestination(addDest, destination);
          this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
          this.txUiService.clearAllOptions();
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     private addCustomDestination(addDest: boolean, destination: string | null) {
          if (addDest && destination) {
               const addr = destination.trim();
               if (xrpl.isValidAddress(addr)) {
                    const added = this.transactionDropdownService.addCustomIfNewAndSelect(destination, this.destinationMap, this.selectedDestinationAddress, this.destinationSearchQuery);
                    if (added) {
                         console.log('Custom added via service');
                    }
               }
          }
     }

     onCurrencyChange(currency: string) {
          this.trustlineCurrencyService.selectCurrency(currency, '');
     }

     onIssuerChange(issuer: string) {
          this.trustlineCurrencyService.selectIssuer(issuer);
     }

     setExpirationToNow() {
          this.escrowCancelTimeField.set(this.utilsService.formatDateTimeLocal(new Date()));
          this.escrowFinishTimeField.set(this.utilsService.formatDateTimeLocal(new Date()));
     }

     addEscrowFinishToExpiration(seconds: number): void {
          this.escrowUtilService.addToDateTimeField(this.escrowFinishTimeField, this.escrowFinishTimeField, seconds);
     }

     addEscrowCancelToExpiration(seconds: number): void {
          this.escrowUtilService.addToDateTimeField(this.escrowCancelTimeField, this.escrowCancelTimeField, seconds);
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     onFocus(event: FocusEvent) {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) {
                    input.value = num.toFixed(6); // show full precision on focus
               }
          }
     }

     clearFields() {
          this.escrowFinishTimeField.set('');
          this.escrowCancelTimeField.set('');
          this.escrowSequenceNumberField.set('');
          this.escrowOwnerField.set('');
          this.selectedDestinationAddress.set('');
     }

     private resetEscrowSelection() {
          this.selectedEscrow.set(null);
          this.escrowSequenceNumberField.set('');
          this.escrowOwnerField.set('');
     }
}
