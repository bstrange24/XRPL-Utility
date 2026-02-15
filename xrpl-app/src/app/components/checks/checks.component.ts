import { Component, OnInit, inject, computed, DestroyRef, signal, ChangeDetectionStrategy, Signal, WritableSignal, effect } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { CheckCreate, CheckCash, CheckCancel } from 'xrpl';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { UtilsService } from '../../services/util-service/utils.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentServiceService } from '../../services/transaction-environment/tx-environment-service.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { EMPTY, from, switchMap } from 'rxjs';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { MPToken, RippleState } from '../../models/interface-items.model';
import { CheckUtilService } from '../../services/checks/check-util/check-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { CheckTransactionService } from '../../services/checks/checks-transaction/checks-transaction.service';
import { MptUtilService } from '../../services/mpt-service/mpt-util/mpt-util.service';

@Component({
     selector: 'app-checks',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [
          trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])]),
          trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(-20px)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))])]),
     ],
     templateUrl: './checks.component.html',
     styleUrl: './checks.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendChecksComponent extends PerformanceBaseComponent implements OnInit {
     private readonly destroyRef = inject(DestroyRef);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentServiceService = inject(TxEnvironmentServiceService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly checkTransactionService = inject(CheckTransactionService);
     public readonly mptUtilService = inject(MptUtilService);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     accountInfo = signal<any>(null);
     checkIdSearchQuery = signal<string>('');
     activeTab = signal<'create' | 'cash' | 'cancel'>('create');
     currencyFieldDropDownValue = signal<string>('XRP');
     expirationTimeField = signal<string>('');
     outstandingChecks = signal<string>('');
     mptIssuanceIdField = signal<string>('');
     isMptEnabled = signal(false);
     cancellableChecks = signal<any[]>([]);
     cashableChecks = signal<any[]>([]);
     existingChecks = signal<any[]>([]);
     outstandingChecksCollapsed = signal(true);
     existingIOUs = signal<any[]>([]);
     existingMpts = signal<any[]>([]);
     currencyChangeTrigger = signal(0);
     wantsExpiration = signal<boolean>(false);
     checkCreator = signal<string>('');
     checkCurrencyCode = signal<string>('');
     currencyIssuer = signal<string>('');

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     readonly currentAddress = computed(() => this.currentWallet().address);

     selectedCheckItem = computed<SelectItem | null>(() => {
          const id = this.txUiService.checkIdField();
          if (!id) return null;

          const items = this.checkItems();
          if (!items) return null;

          return items.find(item => item.id === id) ?? null;
     });

     checkItems = computed(() => {
          const mode = this.activeTab();
          const checks = mode === 'cash' ? this.cashableChecks : this.cancellableChecks;
          const modeSignal = this.activeTab;
          return this.checkUtilService.mapCheckItems(checks, modeSignal, amt => this.utilsService.formatIOUXrpAmountOutstanding(amt))();
     });

     checkIdDisplay = this.checkUtilService.checkIdDisplay(this.txUiService.checkIdField, this.checkItems, this.checkIdSearchQuery);

     checkIdInputDisplay = computed(() => {
          if (this.checkIdSearchQuery()) {
               return this.checkIdSearchQuery();
          }
          return this.checkIdDisplay();
     });

     filteredCheckIds = this.checkUtilService.filteredCheckItems(this.checkItems, this.checkIdSearchQuery);

     selectedIssuerAddress = computed(() => this.trustlineCurrency.getSelectedIssuer());

     // Currency dropdown → use service
     currencyItems = this.trustlineCurrency.getCurrencyItems();

     // Selected currency
     selectedCurrencyItem = computed(() => {
          const code = this.currencyFieldDropDownValue();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     });

     // Issuer dropdown → use service
     issuerItems = this.trustlineCurrency.getIssuerItems();

     // Selected issuer
     selectedIssuerItem = computed(() => {
          const addr = this.trustlineCurrency.selectedIssuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     });

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const explorerBase = this.txUiService.explorerUrl();
          const address = wallet.address;
          let checkCount = 0;
          let checksToShow: any[] = [];

          switch (this.activeTab()) {
               case 'create':
                    checkCount = this.existingChecks().length;
                    checksToShow = this.existingChecks().map(c => ({
                         index: c.id,
                         amount: this.utilsService.formatIOUXrpAmountOutstanding(c.sendMax),
                         destination: c.destination,
                         destinationTag: c.destinationTag,
                         expiration: c.expiration,
                         invoiceId: c.invoiceId,
                    }));
                    break;
               case 'cash':
                    checkCount = this.cashableChecks().length;
                    checksToShow = this.cashableChecks().map(c => ({
                         index: c.id,
                         amount: c.amount,
                         sender: c.sender,
                    }));
                    break;
               case 'cancel':
                    checkCount = this.cancellableChecks().length;
                    checksToShow = this.cancellableChecks().map(c => ({
                         index: c.id,
                         amount: c.amount,
                         destination: c.destination,
                    }));
                    break;
          }

          // Build the links (only on create tab we show all 3)
          const links: string[] = [];
          if (this.activeTab() === 'create') {
               const hasChecks = this.existingChecks().length > 0;
               const hasIOUs = this.existingIOUs().length > 0;
               const hasMPTs = this.existingMpts().length > 0;

               if (hasChecks) links.push(`<a href="${explorerBase}account/${address}/checks" target="_blank" rel="noopener" class="xrpl-win-link">View Checks</a>`);
               if (hasIOUs) links.push(`<a href="${explorerBase}account/${address}/tokens" target="_blank" rel="noopener" class="xrpl-win-link">View IOUs</a>`);
               if (hasMPTs) links.push(`<a href="${explorerBase}account/${address}/mpts/owned" target="_blank" rel="noopener" class="xrpl-win-link">View MPTs</a>`);
          }

          return {
               walletName,
               checkCount,
               checksToShow,
               links: links.length > 0 ? links.join(' | ') : null,
          };
     });

     hasWallets = computed(() => this.wallets().length > 0);

     currencyBalanceField = this.trustlineCurrency.balance;

     constructor() {
          super();
          effect(() => {
               const item = this.selectedCheckItem();
               if (item) {
                    const amountStr = item.display.split(' ')[0];
                    this.txUiService.amountField.set(amountStr);
               }
          });

          effect(() => {
               if (this.trustlineCurrency.currencies().length > 0 && !this.currencyFieldDropDownValue()) {
                    this.currencyFieldDropDownValue.set(this.trustlineCurrency.currencies()[0]);
                    this.trustlineCurrency.selectCurrency(this.trustlineCurrency.currencies()[0], '');
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
          this.trustlineCurrency.setPreferXrpAsDefault(true); // ← this page wants XRP default
          this.transactionDropdownService.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.populateDefaultDateTime();

          if (this.trustlineCurrency.currencies().length > 0) {
               this.trustlineCurrency.selectCurrency(this.trustlineCurrency.currencies()[0], '');
          }

          this.txUiService.clearAllOptions();
     }

     onCheckSelected(item: SelectItem | null) {
          this.checkUtilService.onCheckSelected(item, this.txUiService.checkIdField, this.checkCreator, this.checkCurrencyCode, this.currencyIssuer);
     }

     // Handlers → delegate to service
     onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id || 'XRP';
          this.currencyFieldDropDownValue.set(currency);
          this.trustlineCurrency.selectCurrency(currency, '');
          this.txUiService.clearAllOptionsAndMessages();
     }

     onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrency.selectIssuer(address);
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
                         return from(this.getChecks(false));
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

     toggleOutstandingChecks() {
          this.outstandingChecksCollapsed.set(!this.outstandingChecksCollapsed());
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

     getCheckById(id: string) {
          return [...this.cashableChecks(), ...this.cancellableChecks()].find(c => c.id === id);
     }

     onCurrencyChange(currency: string) {
          this.trustlineCurrency.selectCurrency(currency, '');
     }

     getIssuerForCheck(checks: any[], checkIndex: string): string | null {
          const check = checks.find(c => c.index === checkIndex);
          return check?.SendMax?.issuer || null;
     }

     async setTab(tab: 'create' | 'cash' | 'cancel'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          this.clearFields();
          if (this.hasWallets()) {
               await this.getChecks(false);
               this.populateDefaultDateTime();
          }
     }

     async getChecks(forceRefresh = false): Promise<void> {
          await this.withPerf('getChecks', async () => {
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

                    if (!accountInfo || !accountObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    this.existingChecks.set(this.checkUtilService.getExistingChecks(accountObjects, wallet.classicAddress));
                    this.cashableChecks.set(this.checkUtilService.getCashableChecks(accountObjects, wallet.classicAddress));
                    this.cancellableChecks.set(this.checkUtilService.getCancelableChecks(accountObjects, wallet.classicAddress));
                    this.existingMpts.set(this.mptUtilService.getExistingMpts(accountObjects, wallet.classicAddress));
                    this.existingIOUs.set(this.trustlineCurrency.getExistingIOUs(accountObjects, wallet.classicAddress));

                    const currencyValue = this.currencyFieldDropDownValue();
                    if (currencyValue !== 'XRP' && currencyValue !== 'MPT' && this.trustlineCurrency.selectedIssuer()) {
                         this.trustlineCurrency.selectCurrency(currencyValue, '');
                    }

                    this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async createCheck1() {
          await this.withPerf('createCheck', async () => {
               try {
                    await this.checkTransactionService.createCheck({
                         wallet: this.currentWallet(),
                         destination: this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery),
                         amount: this.txUiService.amountField(),
                         currencyValue: this.currencyFieldDropDownValue(),
                         issuer: this.trustlineCurrency.selectedIssuer(),
                         isSimulate: this.txUiService.isSimulateEnabled(),
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKey: this.txUiService.isRegularKeyAddress(),
                         regularKeyAddress: this.txUiService.regularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
               } catch (error: any) {
                    console.error('Critical error in createCheck:', error);
                    this.toastService.error(error.message || 'Unexpected error occurred', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async createCheck() {
          await this.withPerf('createCheck', async () => {
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
                    const currencyValue = this.currencyFieldDropDownValue();

                    const destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
                    if (!destinationAddress) {
                         return this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    }

                    const { client, wallet, fee, currentLedger, accountInfo, accountObjects, destinationAccountInfo } = await this.txEnvironmentServiceService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeDestinationAccountInfo: true,
                         destinationAddress: destinationAddress,
                    });

                    if (!accountInfo || !accountObjects || !destinationAccountInfo) {
                         throw new Error('Failed to fetch account information');
                    }

                    if (destinationAccountInfo?.result?.account_flags?.disallowIncomingCheck) {
                         return this.toastService.error(`Destination ${destinationAddress} has disallowIncomingCheck enabled. This wallet can not recieve checks.`, AppConstants.TOAST.ERROR);
                    }

                    const inputs = this.getCreateCheckValidationInputs(accountInfo, accountObjects, fee, currentLedger, destinationAddress, amount, isRegularKeyAddress, regularKeyAddress, regularKeySeed);

                    const errors = await this.validationService.validate('CreateCheck', { inputs, client, accountInfo });
                    if (errors.length) {
                         return this.toastService.error(errors.join('\n• '), AppConstants.TOAST.ERROR);
                    }

                    let { sendMax, paymentType, currency } = this.xrplTransactionService.buildSendMaxAmount(currencyValue, this.trustlineCurrency.selectedIssuer(), false);

                    let checkCreateTx: xrpl.CheckCreate = this.xrplTransactionService.buildCreateCheckTransaction(wallet, sendMax, destinationAddress, fee, currentLedger);

                    await this.setTxOptionalFields(client, checkCreateTx, wallet, accountInfo, 'create');

                    const result = await this.checkCreateExecutor(checkCreateTx, wallet, client, destinationAddress, paymentType, amount, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds);
                    if (!result.success) {
                         return this.toastService.error(result.error || `Failed to submit transaction`, AppConstants.TOAST.ERROR);
                    }

                    const shortDest = destinationAddress.slice(0, 7) + '…' + destinationAddress.slice(-7);
                    if (isSimulate) {
                         this.txUiService.resetCurrentStepToIdle();
                         return this.toastService.success(`Simulated Sending Check of ${this.txUiService.amountField()} ${currency} to ${shortDest}`, AppConstants.TOAST.SUCCESS, false, result.hash, this.txUiService.explorerUrl() + 'tx/');
                    }

                    try {
                         const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, result.hash || '', checkCreateTx.LastLedgerSequence!);
                         this.txUiService.setTxResultSignal(finalResult);
                         this.xrplTransactionService.processTxFinalResult(finalResult, `Successfully Sent Check of ${this.txUiService.amountField()} ${currency} to ${shortDest}`, result);
                    } catch (waitError: any) {
                         this.xrplTransactionService.processTxError(waitError);
                    }

                    await this.refreshAfterTx(client, wallet, destinationAddress, true);

                    if (currencyValue !== 'XRP' && currencyValue !== 'MPT') {
                         this.onCurrencyChange(currencyValue);
                    }

                    this.clearInputFields();
               } catch (error: any) {
                    console.error('Critical error in createCheck:', error);
                    this.toastService.error(error.message || 'Unexpected error occurred', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async cashCheck() {
          await this.withPerf('cashCheck', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.resetCurrentStepToIdle();

               try {
                    const amount = this.txUiService.amountField();
                    const isSimulate = this.txUiService.isSimulateEnabled();
                    const useMultiSign = this.txUiService.useMultiSign();
                    const isRegularKeyAddress = this.txUiService.isRegularKeyAddress();
                    const regularKeyAddress = this.txUiService.regularKeyAddress();
                    const regularKeySeed = this.txUiService.regularKeySeed();
                    const multiSignAddress = this.txUiService.multiSignAddress();
                    const multiSignSeeds = this.txUiService.multiSignSeeds();
                    const checkId = this.txUiService.checkIdField();
                    const currencyCode = this.checkCurrencyCode();
                    const currencyIssuer = this.currencyIssuer();

                    const { client, wallet, fee, currentLedger, accountInfo, checkObjects } = await this.txEnvironmentServiceService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeChecks: true,
                    });

                    if (!accountInfo || !checkObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    const inputs = this.getCashCheckValidationInputs(accountInfo, fee, currentLedger, checkId, amount, isRegularKeyAddress, regularKeyAddress, regularKeySeed);

                    const errors = await this.validationService.validate('CashCheck', { inputs, client, accountInfo });
                    if (errors.length) {
                         return this.toastService.error(errors.join('\n• '), AppConstants.TOAST.ERROR);
                    }

                    const checkObject = await this.xrplService.getCheckByCheckId(client, checkId, 'validated');
                    if (checkObject) {
                         if (checkObject.Expiration) {
                              const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
                              if (currentRippleTime >= checkObject.Expiration) {
                                   return this.toastService.error(`Transaction or object has expired.`);
                              }
                         }
                    } else {
                         return this.toastService.error(`No check found with Check ID ${checkId}`);
                    }

                    if (currencyCode !== AppConstants.XRP_CURRENCY) {
                         const accountObjects = checkObjects.result.account_objects;
                         const issuer = this.getIssuerForCheck(accountObjects, checkId);
                         if (issuer && currencyIssuer !== issuer) {
                              return this.toastService.error(`Invalid issuer ${issuer} for check`);
                         }
                    }

                    let { amountToCash, paymentType, currency }: { amountToCash: any; paymentType: string; currency: string } = this.xrplTransactionService.buildAmount(currencyCode, amount, currencyIssuer);

                    let checkCashTx: xrpl.CheckCash = this.xrplTransactionService.buildCashCheckTransaction(wallet, amountToCash, checkId, fee, currentLedger);

                    await this.setTxOptionalFields(client, checkCashTx, wallet, accountInfo, 'cash');

                    const result = await this.cashCheckExecutor(checkCashTx, wallet, client, paymentType, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds);
                    if (!result.success) {
                         return this.toastService.error(result.error || `Failed to submit transaction`, AppConstants.TOAST.ERROR);
                    }

                    if (isSimulate) {
                         this.txUiService.resetCurrentStepToIdle();
                         return this.toastService.success(`Simulated Cashing Check of ${amount} ${currency} to ${this.checkCreator()}`, AppConstants.TOAST.SUCCESS, false, result.hash, this.txUiService.explorerUrl() + 'tx/');
                    }

                    try {
                         const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, result.hash || '', checkCashTx.LastLedgerSequence!);
                         this.txUiService.setTxResultSignal(finalResult);
                         this.xrplTransactionService.processTxFinalResult(finalResult, `Successfully Cashed Check of ${amount} ${currency} from ${this.checkCreator()}`, result);
                    } catch (waitError: any) {
                         this.xrplTransactionService.processTxError(waitError);
                    }

                    await this.refreshAfterTx(client, wallet, null, false);

                    if (currencyCode !== 'XRP' && currencyCode !== 'MPT') {
                         this.onCurrencyChange(currencyCode);
                    }

                    this.clearInputFields();
               } catch (error: any) {
                    console.error('Error in cashCheck:', error);
                    this.toastService.error(error.message || 'Unexpected error occurred', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async cancelCheck() {
          await this.withPerf('cancelCheck', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.resetCurrentStepToIdle();

               try {
                    const amount = this.txUiService.amountField();
                    const isSimulate = this.txUiService.isSimulateEnabled();
                    const useMultiSign = this.txUiService.useMultiSign();
                    const isRegularKeyAddress = this.txUiService.isRegularKeyAddress();
                    const regularKeyAddress = this.txUiService.regularKeyAddress();
                    const regularKeySeed = this.txUiService.regularKeySeed();
                    const multiSignAddress = this.txUiService.multiSignAddress();
                    const multiSignSeeds = this.txUiService.multiSignSeeds();
                    const checkId = this.txUiService.checkIdField();
                    const checkCreator = this.checkCreator();
                    const currencyCode = this.checkCurrencyCode();

                    const { client, wallet, fee, currentLedger, accountInfo, checkObjects } = await this.txEnvironmentServiceService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeChecks: true,
                    });

                    if (!accountInfo || !checkObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    const inputs = this.getCancelCheckValidationInputs(accountInfo, fee, currentLedger, checkId, isRegularKeyAddress, regularKeyAddress, regularKeySeed);

                    const errors = await this.validationService.validate('CancelCheck', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    let checkCancelTx: CheckCancel = this.xrplTransactionService.buildCheckCancelTransaction(wallet, fee, currentLedger, checkId);

                    await this.setTxOptionalFields(client, checkCancelTx, wallet, accountInfo, 'cancelCheck');

                    const result = await this.cancelCheckExecutor(checkCancelTx, wallet, client, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds);
                    if (!result.success) {
                         return this.toastService.error(result.error || `Failed to submit transaction ${result.error}`, AppConstants.TOAST.ERROR);
                    }

                    if (isSimulate) {
                         this.txUiService.resetCurrentStepToIdle();
                         return this.toastService.success(`Simulated Cancelling Check of ${amount} ${currencyCode} to ${checkCreator}`, AppConstants.TOAST.SUCCESS, false, result.hash, this.txUiService.explorerUrl() + 'tx/');
                    }

                    try {
                         const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, result.hash || '', checkCancelTx.LastLedgerSequence!);
                         this.txUiService.setTxResultSignal(finalResult);
                         this.xrplTransactionService.processTxFinalResult(finalResult, `Simulated Cancelling Check of ${amount} ${currencyCode} to ${checkCreator}`, result);
                    } catch (waitError: any) {
                         this.xrplTransactionService.processTxError(waitError);
                    }

                    await this.refreshAfterTx(client, wallet, null, false);

                    if (currencyCode !== 'XRP' && currencyCode !== 'MPT') {
                         this.onCurrencyChange(currencyCode);
                    }

                    this.clearInputFields();
               } catch (error: any) {
                    console.error('Error in cancelCheck:', error);
                    this.toastService.error(error.message || 'Unexpected error occurred', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     private async checkCreateExecutor(checkCreateTx: CheckCreate, wallet: xrpl.Wallet, client: xrpl.Client, destinationAddress: string, paymentType: string, amount: number, useMultiSign: boolean, isRegularKeyAddress: boolean, regularKeyAddress: string, regularKeySeed: string, multiSignAddress: string, multiSignSeeds: string) {
          return await this.txExecutor.checkCreate(checkCreateTx, wallet, client, {
               destination: destinationAddress,
               paymentType: paymentType,
               amount: amount,
               useMultiSign: useMultiSign,
               isRegularKeyAddress: isRegularKeyAddress,
               regularKeyAddress: regularKeyAddress,
               regularKeySeed: regularKeySeed,
               multiSignAddress: multiSignAddress,
               multiSignSeeds: multiSignSeeds,
          });
     }

     private async cashCheckExecutor(checkCashTx: CheckCash, wallet: xrpl.Wallet, client: xrpl.Client, paymentType: string, useMultiSign: boolean, isRegularKeyAddress: boolean, regularKeyAddress: string, regularKeySeed: string, multiSignAddress: string, multiSignSeeds: string) {
          return await this.txExecutor.checkCash(checkCashTx, wallet, client, {
               useMultiSign: useMultiSign,
               isRegularKeyAddress: isRegularKeyAddress,
               regularKeyAddress: regularKeyAddress,
               regularKeySeed: regularKeySeed,
               multiSignAddress: multiSignAddress,
               multiSignSeeds: multiSignSeeds,
               paymentType: paymentType,
          });
     }

     private async cancelCheckExecutor(checkCancelTx: CheckCancel, wallet: xrpl.Wallet, client: xrpl.Client, useMultiSign: boolean, isRegularKeyAddress: boolean, regularKeyAddress: string, regularKeySeed: string, multiSignAddress: string, multiSignSeeds: string) {
          return await this.txExecutor.checkCancel(checkCancelTx, wallet, client, {
               useMultiSign: useMultiSign,
               isRegularKeyAddress: isRegularKeyAddress,
               regularKeyAddress: regularKeyAddress,
               regularKeySeed: regularKeySeed,
               multiSignAddress: multiSignAddress,
               multiSignSeeds: multiSignSeeds,
          });
     }

     private getCreateCheckValidationInputs(accountInfo: xrpl.AccountInfoResponse | undefined, accountObjects: xrpl.AccountObjectsResponse | undefined, fee: string | undefined, currentLedger: number | undefined, destinationAddress: string, amount: any, isRegularKeyAddress: boolean, regularKeyAddress: string, regularKeySeed: string) {
          return this.txUiService.getValidationInputs({
               wallet: this.currentWallet(),
               network: { accountInfo, accountObjects, fee, currentLedger },
               createCheck: { amount: amount, destination: destinationAddress },
               regularKey: { isRegularKey: isRegularKeyAddress, address: regularKeyAddress, seed: regularKeySeed },
          });
     }

     private getCashCheckValidationInputs(accountInfo: xrpl.AccountInfoResponse | undefined, fee: string | undefined, currentLedger: number | undefined, checkIdField: string, amount: string, isRegularKeyAddress: boolean, regularKeyAddress: string, regularKeySeed: string) {
          return this.txUiService.getValidationInputs({
               wallet: this.currentWallet(),
               network: { accountInfo, fee, currentLedger },
               cashCheck: { amount: amount, checkIdField: checkIdField },
               regularKey: { isRegularKey: isRegularKeyAddress, address: regularKeyAddress, seed: regularKeySeed },
          });
     }

     private getCancelCheckValidationInputs(accountInfo: xrpl.AccountInfoResponse | undefined, fee: string | undefined, currentLedger: number | undefined, checkIdField: string, isRegularKeyAddress: boolean, regularKeyAddress: string, regularKeySeed: string) {
          return this.txUiService.getValidationInputs({
               wallet: this.currentWallet(),
               network: { accountInfo, fee, currentLedger },
               cashCheck: { checkIdField: checkIdField },
               regularKey: { isRegularKey: isRegularKeyAddress, address: regularKeyAddress, seed: regularKeySeed },
          });
     }

     // private getExistingMpts(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
     //      const mapped = (escrowObjects.result.account_objects ?? [])
     //           .filter((obj: any) => (obj.LedgerEntryType === 'MPToken' || obj.LedgerEntryType === 'MPTokenIssuance') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
     //           .map((obj: any): MPToken => {
     //                return {
     //                     LedgerEntryType: obj.LedgerEntryType,
     //                     MPTAmount: obj.MaximumAmount ? obj.MaximumAmount : obj.MPTAmount,
     //                     mpt_issuance_id: obj.mpt_issuance_id ? obj.mpt_issuance_id : obj.MPTokenIssuanceID,
     //                };
     //           })
     //           .sort((a, b) => {
     //                const ai = a.mpt_issuance_id ?? '';
     //                const bi = b.mpt_issuance_id ?? '';
     //                return ai.localeCompare(bi);
     //           });

     //      this.existingMpts.set(mapped);
     //      this.utilsService.logObjects('existingMpts', mapped);
     // }

     // private getExistingIOUs(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
     //      const mapped = (accountObjects.result.account_objects ?? [])
     //           .filter((obj: any) => obj.LedgerEntryType === 'RippleState')
     //           .map((obj: any): RippleState => {
     //                const balance = obj.Balance?.value ?? '0';
     //                const currency = this.utilsService.normalizeCurrencyCode(obj.Balance?.currency);

     //                // Determine if this account is the issuer or holder
     //                const issuer = obj.HighLimit?.issuer === classicAddress ? obj.LowLimit?.issuer : obj.HighLimit?.issuer;

     //                return {
     //                     LedgerEntryType: 'RippleState',
     //                     Balance: {
     //                          currency,
     //                          value: balance,
     //                     },
     //                     HighLimit: {
     //                          issuer,
     //                     },
     //                };
     //           })
     //           // Sort alphabetically by issuer or currency if available
     //           .sort((a, b) => a.HighLimit.issuer.localeCompare(b.HighLimit.issuer));

     //      this.existingIOUs.set(mapped);
     //      this.utilsService.logObjects('existingIOUs', mapped);
     // }

     private async setTxOptionalFields(client: xrpl.Client, checkTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'create') {
               const expValue = this.expirationTimeField();
               if (expValue && expValue != '' && this.wantsExpiration()) {
                    if (expValue?.trim()) {
                         const checkExpiration = this.utilsService.toRippleTime(expValue);
                         this.utilsService.setExpiration(checkTx, Number(checkExpiration));
                    }
               }

               const invoiceIdField = this.txUiService.invoiceIdField();
               if (invoiceIdField) {
                    this.utilsService.setInvoiceIdField(checkTx, invoiceIdField);
               }

               const sourceTagField = this.txUiService.sourceTagField();
               if (sourceTagField) {
                    this.utilsService.setSourceTagField(checkTx, sourceTagField);
               }

               const destinationTagField = this.txUiService.destinationTagField();
               if (destinationTagField) {
                    this.utilsService.setDestinationTag(checkTx, destinationTagField);
               }
          }

          const isTicket = this.txUiService.isTicket();
          if (isTicket) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(checkTx, ticket, true);
               }
          }

          const memoField = this.txUiService.memoField();
          if (this.txUiService.isMemoEnabled() && memoField) {
               this.utilsService.setMemoField(checkTx, memoField);
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          this.existingChecks.set(this.checkUtilService.getExistingChecks(accountObjects, wallet.classicAddress));
          this.cashableChecks.set(this.checkUtilService.getCashableChecks(accountObjects, wallet.classicAddress));
          this.cancellableChecks.set(this.checkUtilService.getCancelableChecks(accountObjects, wallet.classicAddress));
          this.existingMpts.set(this.mptUtilService.getExistingMpts(accountObjects, wallet.classicAddress));
          this.existingIOUs.set(this.trustlineCurrency.getExistingIOUs(accountObjects, wallet.classicAddress));
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

     private addToDateTimeField(fieldSignal: Signal<string>, writableSignal: WritableSignal<string>, seconds: number): void {
          let currentValue = fieldSignal();

          // If field is empty, start from now
          if (!currentValue) {
               const now = new Date();
               currentValue = this.formatDateTimeLocal(now);
          }

          const date = new Date(currentValue);
          date.setSeconds(date.getSeconds() + seconds);

          const newDateTime = this.formatDateTimeLocal(date);

          writableSignal.set(newDateTime);
     }

     // Helper to avoid duplicating formatting code
     private formatDateTimeLocal(date: Date): string {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const secs = String(date.getSeconds()).padStart(2, '0');

          return `${year}-${month}-${day}T${hours}:${minutes}:${secs}`;
     }

     // Now update your public methods
     addCheckToExpiration(seconds: number): void {
          this.addToDateTimeField(this.expirationTimeField, this.expirationTimeField, seconds);
     }

     setCheckExpirationToNow() {
          const now = new Date();

          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');

          this.expirationTimeField.set(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
     }

     populateDefaultDateTime() {
          this.setCheckExpirationToNow();
     }

     toggleOptions(enabled: boolean): void {
          this.txUiService.wantsOptions.set(enabled);
          if (!enabled) {
               this.clearInputFields();
          }
     }

     toggleExpiration(enabled: boolean): void {
          this.wantsExpiration.set(enabled);

          if (!enabled) {
               this.expirationTimeField.set('');
          } else if (!this.expirationTimeField()) {
               this.setCheckExpirationToNow();
          }
     }

     clearExpiration(): void {
          this.expirationTimeField.set('');
          this.wantsExpiration.set(false);
     }

     isValidExpiration(): boolean {
          if (!this.expirationTimeField()) return true;
          const selected = new Date(this.expirationTimeField());
          return selected > new Date();
     }

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Check ID copied!');
          });
     }

     formatInvoiceId(invoiceId: any): string {
          return this.utilsService.formatInvoiceId(invoiceId || '');
     }

     formatXrplTimestamp(timestamp: number): string {
          return this.utilsService.convertXRPLTime(timestamp);
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
          this.expirationTimeField.set('');
          this.currencyFieldDropDownValue.set('XRP');
          this.checkIdSearchQuery.set('');
          this.selectedDestinationAddress.set('');
          this.checkCreator.set('');
          this.checkCurrencyCode.set('');
          this.currencyIssuer.set('');
          this.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearInputFields() {
          this.wantsExpiration.set(false);
          this.transactionDropdownService.resetDestinationInputs(this.destinationSearchQuery, this.selectedDestinationAddress);
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.trustlineCurrency.selectCurrency('XRP', ''); // reset currency
          this.trustlineCurrency.selectIssuer(''); // reset issuer
          this.currencyFieldDropDownValue.set('XRP');
     }
}
