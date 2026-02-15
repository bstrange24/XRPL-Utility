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
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { EMPTY, from, switchMap } from 'rxjs';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';

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
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly acccountDataService = inject(AcccountDataService);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     accountInfo = signal<any>(null);
     credentialIDs = signal<string>('');

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

     infoData = computed(() => {
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

     toggleOptions(enabled: boolean): void {
          this.txUiService.wantsOptions.set(enabled);
          if (!enabled) {
               this.clearInputFields();
          }
     }

     constructor() {
          super();
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.transactionDropdownService.loadCustomDestinations();
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
                         return from(this.onAccountChange(false));
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

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(): Promise<void> {
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) {
               await this.onAccountChange(false);
          }
     }

     async onAccountChange(forceRefresh = false): Promise<void> {
          await this.withPerf('onAccountChange', async () => {
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

                    this.accountInfo.set(accountInfo);
                    this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async sendXrp() {
          await this.withPerf('sendXrp', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.resetCurrentStepToIdle();

               try {
                    const amount = Number(this.txUiService.amountField());
                    const isSimulate = this.txUiService.isSimulateEnabled();
                    const useMultiSign = this.txUiService.useMultiSign();
                    const isRegularKeyAddress = this.txUiService.isRegularKeyAddress();
                    const regularKeyAddress = this.txUiService.regularKeyAddress();
                    const regularKeySeed = this.txUiService.regularKeySeed();
                    const multiSignAddress = this.txUiService.multiSignAddress();
                    const multiSignSeeds = this.txUiService.multiSignSeeds();

                    const destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
                    if (!destinationAddress) {
                         return this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    }

                    const { client, wallet, fee, currentLedger, accountInfo, accountObjects } = await this.txEnvironmentServiceService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (!accountInfo || !accountObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    const inputs = this.getValidationInputs(accountInfo, accountObjects, fee, currentLedger, destinationAddress);

                    const errors = await this.validationService.validate('PaymentXrp', { inputs, client, accountInfo });
                    if (errors.length) {
                         return this.toastService.error(errors.join('\n• '), AppConstants.TOAST.ERROR);
                    }

                    let paymentTx: xrpl.Payment = this.xrplTransactionService.buildSendXrpTransaction(wallet, destinationAddress, amount, fee!, currentLedger!);

                    await this.setTxOptionalFields(client, paymentTx, wallet, accountInfo);

                    const result = await this.sendXrpPayment(paymentTx, wallet, client, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds);
                    if (!result.success) {
                         return this.toastService.error(result.error || `Failed to submit transaction`, AppConstants.TOAST.ERROR);
                    }

                    const shortDest = destinationAddress.slice(0, 7) + '…' + destinationAddress.slice(-7);
                    if (isSimulate) {
                         this.txUiService.resetCurrentStepToIdle();
                         return this.toastService.success(`Simulated Sending ${amount} XRP to ${shortDest}`, AppConstants.TOAST.SUCCESS, false, result.hash, this.txUiService.explorerUrl() + 'tx/');
                    }

                    try {
                         const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, result.hash || '', paymentTx.LastLedgerSequence!);
                         this.txUiService.setTxResultSignal(finalResult);
                         this.xrplTransactionService.processTxFinalResult(finalResult, `Successfully Sent ${amount} XRP to ${shortDest}`, result);
                    } catch (waitError: any) {
                         this.xrplTransactionService.processTxError(waitError);
                    }

                    await this.refreshAfterTx(client, wallet, destinationAddress, true);
                    this.clearInputFields();
               } catch (error: any) {
                    console.error('Critical error in sendXrp:', error);
                    this.toastService.error(error.message || 'Unexpected error occurred', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     private async sendXrpPayment(paymentTx: xrpl.Payment, wallet: xrpl.Wallet, client: xrpl.Client, useMultiSign: boolean, isRegularKeyAddress: boolean, regularKeyAddress: string, regularKeySeed: string, multiSignAddress: string, multiSignSeeds: string) {
          return await this.txExecutor.sendXrpPayment(paymentTx, wallet, client, {
               useMultiSign: useMultiSign,
               isRegularKeyAddress: isRegularKeyAddress,
               regularKeyAddress: regularKeyAddress,
               regularKeySeed: regularKeySeed,
               multiSignAddress: multiSignAddress,
               multiSignSeeds: multiSignSeeds,
          });
     }

     private getValidationInputs(accountInfo: xrpl.AccountInfoResponse | undefined, accountObjects: xrpl.AccountObjectsResponse | undefined, fee: string | undefined, currentLedger: number | undefined, destinationAddress: string) {
          return this.txUiService.getValidationInputs({
               wallet: this.currentWallet(),
               network: { accountInfo, accountObjects, fee, currentLedger },
               paymentXrp: { amount: this.txUiService.amountField(), destination: destinationAddress },
               regularKey: { isRegularKey: this.txUiService.isRegularKeyAddress(), address: this.txUiService.regularKeyAddress(), seed: this.txUiService.regularKeySeed() },
          });
     }

     private async setTxOptionalFields(client: xrpl.Client, tx: xrpl.Payment, wallet: xrpl.Wallet, accountInfo: any) {
          const isTicket = this.txUiService.isTicket();
          if (isTicket) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(tx, ticket, true);
               }
          }

          const destinationTag = this.txUiService.destinationTagField();
          if (destinationTag) {
               this.utilsService.setDestinationTag(tx, destinationTag);
          }

          const memoField = this.txUiService.memoField();
          if (this.txUiService.isMemoEnabled() && memoField) {
               this.utilsService.setMemoField(tx, memoField);
          }

          const invoiceIdField = this.txUiService.invoiceIdField();
          if (invoiceIdField) {
               this.utilsService.setInvoiceIdField(tx, invoiceIdField);
          }

          const sourceTagField = this.txUiService.sourceTagField();
          if (sourceTagField) {
               this.utilsService.setSourceTagField(tx, sourceTagField);
          }

          const domainId = this.txUiService.domainId();
          if (domainId) {
               this.utilsService.setDomainId(tx, domainId);
          }

          if (this.credentialIDs().length > 0) {
               const jsonArray: string[] = this.credentialIDs()
                    .split(',')
                    .map(id => id.trim())
                    .filter(id => id.length > 0);
               this.txUiService.credentialIDs.set(jsonArray);
               this.utilsService.setCredentialIDsField(tx, this.txUiService.credentialIDs());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

          // This triggers infoMessage() to update automatically
          this.accountInfo.set(accountInfo);

          await this.refreshWallets(client, destination ? [wallet.classicAddress, destination] : [wallet.classicAddress]);
          this.addCustomDestination(addDest, destination);
          this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
          this.clearInputFields();
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
          this.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearInputFields() {
          this.transactionDropdownService.resetDestinationInputs(this.destinationSearchQuery, this.selectedDestinationAddress);
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.credentialIDs.set('');
     }
}
