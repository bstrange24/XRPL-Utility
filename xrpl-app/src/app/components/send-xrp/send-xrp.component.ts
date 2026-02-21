import { Component, OnInit, inject, ChangeDetectionStrategy, DestroyRef, signal, computed } from '@angular/core';
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
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { from, switchMap } from 'rxjs';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { SendXrpTransactionOrchestratorService } from '../../services/send-xrp/send-xrp-orchestrator/send-xrp-transaction-orchestrator.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';

@Component({
     selector: 'app-send-xrp',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, SelectSearchDropdownComponent],
     animations: [
          trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])]),
          trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(-20px)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))])]),
     ],
     templateUrl: './send-xrp.component.html',
     styleUrl: './send-xrp.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendXrpModernComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly sendXrpTransactionOrchestratorService = inject(SendXrpTransactionOrchestratorService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     accountInfo = signal<any>(null);

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     private readonly sendXrpSpecificKeys = ['amountField', 'amountField', 'destinationTagField', 'sourceTagField', 'invoiceIdField'] as const;
     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');
     readonly hasWalletsSignal = toSignal(this.walletManagerService.hasWallets$, { initialValue: false });

     readonly infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || 'Selected wallet';
          const acc = this.accountInfo()?.result?.account_data;

          if (!acc?.Balance) {
               return `<code>${walletName}</code> wallet is ready to send XRP.`;
          }

          return `<code>${walletName}</code> wallet has <strong class="object-count">${wallet.balance} XRP</strong> available for sending.`;
     });

     readonly sendButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Send XRP';
          if (step === 'waiting_validation') return 'Waiting for confirmation...';
          return this.txUiService.stepMessage();
     });

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     constructor() {
          super();
          this.trustlineCurrencyService.setPreferXrpAsDefault(false);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.transactionDropdownService.loadCustomDestinations();
          this.setupWalletSubscriptions();
     }

     private setupWalletSubscriptions(): void {
          // Has wallets → clear warning
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.();
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
                    this.txUiService.setInfoMessage('');
               }
          });

          // Wallets list changes
          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
          });

          // Selected wallet index changes
          this.walletManagerService.selectedIndex$
               .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    switchMap(() => {
                         this.txUiService.clearAllOptionsAndMessages();
                         this.clearInputFields();
                         return from(this.onAccountChange(false));
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
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     trackByWalletAddress(_: number, wallet: Wallet): string {
          return wallet.address;
     }

     toggleOptions(enabled: boolean): void {
          this.txUiService.wantsOptions.set(enabled);
          if (!enabled) {
               this.clearInputFields();
          }
     }

     async setTab(): Promise<void> {
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) {
               await this.onAccountChange(false);
          }
     }

     async onAccountChange(forceRefresh = false): Promise<void> {
          await this.measure('onAccountChange', true, async () => {
               this.txUiService.resetCurrentStepToIdle();

               if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
                    return this.toastService.error('Please select a wallet.', AppConstants.TOAST.ERROR);
               }

               try {
                    const { wallet, accountInfo, accountObjects } = await this.measure('onAccountChange:prepareTxEnvironment', true, async () =>
                         this.txEnvironmentService.prepareTxEnvironment({
                              includeAccountInfo: true,
                              includeAccountObject: true,
                              forceRefresh: forceRefresh,
                         })
                    );

                    if (!accountInfo || !accountObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    await this.measure('onAccountChange:processAndUpdate', true, async () => {
                         this.accountInfo.set(accountInfo);
                         this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
                    });
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
               this.txUiService.resetCurrentStepToIdle();

               if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
                    return this.toastService.error('Please select a wallet.', AppConstants.TOAST.ERROR);
               }

               const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

               if (!destination) {
                    return this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
               }

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         destinationAddress: destination,
                    });

                    const result = await this.sendXrpTransactionOrchestratorService.executeXrpPayment({
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.sendXrpSpecificKeys)),
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

                    if (!result.success) {
                         this.toastService.error(result.error || 'Failed to send XRP');
                         return;
                    }

                    await this.refreshAfterTx(env.client, env.wallet, destination);
                    this.clearInputFields();
               } catch (error: any) {
                    console.error('Error sending XRP:', error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               }
          });
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

          this.accountInfo.set(accountInfo);
          await this.refreshWallets(client, destination ? [wallet.classicAddress, destination] : [wallet.classicAddress]);

          this.addCustomDestination(destination);
          this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]): Promise<void> {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (_, newCurrent) => this.currentWallet.set({ ...newCurrent }));
     }

     private addCustomDestination(destination: string | null): void {
          if (!destination) return;
          const addr = destination.trim();
          if (xrpl.isValidAddress(addr) && !this.destinationMap().has(addr)) {
               this.transactionDropdownService.addCustomIfNewAndSelect(destination, this.destinationMap, this.selectedDestinationAddress, this.destinationSearchQuery);
          }
     }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }

     clearInputFields(): void {
          if (this.txUiService.isSimulateEnabled()) return;

          this.transactionDropdownService.resetDestinationInputs(this.destinationSearchQuery, this.selectedDestinationAddress);
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.txUiService.credentialIDs.set([]);
     }
}
