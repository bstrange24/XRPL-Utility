import { Component, OnInit, inject, computed, DestroyRef, signal, ChangeDetectionStrategy, effect } from '@angular/core';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TooltipLinkComponent } from '../shared/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { from, switchMap } from 'rxjs';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { CheckUtilService } from '../../services/checks/check-util/check-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { MptUtilService } from '../../services/mpt-service/mpt-util/mpt-util.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { TrustlineOrchestratorService } from '../../services/trustline-currency/trustline-orchestrator/trustline-orchestrator.service';
import { RippleState } from '../../models/interface-items.model';
import { CurrencyFormSectionComponent } from '../shared/currency-form-section/currency-form-section.component';

@Component({
     selector: 'app-trustlines',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent, CurrencyFormSectionComponent],
     templateUrl: './trustlines.component.html',
     styleUrl: './trustlines.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlinesComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly trustlineOrchestratorService = inject(TrustlineOrchestratorService);

     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     activeTab = signal<'setTrustline' | 'removeTrustline' | 'issueCurrency' | 'clawbackTokens' | 'addNewIssuers'>('setTrustline');

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.trustlineCurrencyService.currencyBalance;

     userAddedCurrencyFieldDropDownValue = signal<string[]>([]);
     selectedWalletIndex = signal<number>(0);

     showTrustlineOptions = signal<boolean>(false);
     outstandingIOUCollapsed = signal<boolean>(true);
     existingIOUs = signal<any[]>([]);

     allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     destinationMap = this.transactionDropdownService.destinationMap(this.allDestinations);
     destinationItems = this.transactionDropdownService.destinationItems(this.allDestinations);
     selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this.destinationMap, this.destinationItems);
     filteredDestinations = this.transactionDropdownService.filteredDestinations(this.allDestinations, this.destinationSearchQuery);
     destinationDisplay = this.transactionDropdownService.destinationDisplay(this.selectedDestinationAddress, this.destinationSearchQuery, this.destinationMap);

     private readonly setTrustlineSpecificKeys = ['trustlineLimitField', 'currencyCode', 'currencyIssuer'] as const;
     private readonly removeTrustlineSpecificKeys = ['amountField', 'currencyCode', 'currencyIssuer'] as const;
     private readonly issueCurrencySpecificKeys = ['amountField', 'destinationTagField', 'sourceTagField', 'invoiceIdField', 'currencyCode', 'currencyIssuer'] as const;
     private readonly clawbackSpecificKeys = ['checkIdField'] as const;
     readonly currentAddress = computed(() => this.currentWallet().address);
     readonly hasWallets = computed(() => this.wallets().length > 0);
     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');

     selectedIssuerAddress = computed(() => this.trustlineCurrencyService.getSelectedIssuer());

     selectedCurrencyItem = computed(() => this.currencyItems().find(i => i.id === this.trustlineCurrencyService.currentCurrency()) ?? null);

     selectedIssuerItem = computed(() => this.issuerItems().find(i => i.id === this.trustlineCurrencyService.selectedIssuer()) ?? null);

     readonly infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const explorerBase = this.txUiService.explorerUrl();
          const address = wallet.address;

          const allTrustlines = this.existingIOUs();
          const count = allTrustlines.length;

          // Super lightweight links
          const links = count > 0 ? `<a href="${explorerBase}account/${address}/tokens" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View tokens</a>` : '';

          // Only build list when panel is expanded — this is the key!
          const trustlinesToShow = this.infoPanelExpanded()
               ? allTrustlines.map(tl => {
                      const balance = tl.Balance.value;
                      const limit = tl.HighLimit?.issuer === address ? tl.HighLimit.value : tl.LowLimit?.value;
                      const issuer = tl.HighLimit?.issuer === address ? tl.LowLimit.issuer : tl.HighLimit?.issuer;

                      const flags = Object.entries(AppConstants.TRUSTLINE.LEDGER_FLAG_MAP)
                           .filter(([_, v]) => tl.Flags & v)
                           .map(([k]) =>
                                k
                                     .replace('lsf', '')
                                     .replaceAll(/([A-Z])/g, ' $1')
                                     .trim()
                           );

                      return {
                           currency: tl.Balance.currency,
                           issuer,
                           balance,
                           limit,
                           flags,
                      };
                 })
               : [];

          return {
               walletName,
               activeTab: this.activeTab(),
               trustlineCount: count,
               trustlinesToShow,
               links,
          };
     });

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     readonly isSplitLayout = computed(() => this.activeTab() === 'setTrustline' || this.activeTab() === 'removeTrustline');

     readonly isPairedLayout = computed(() => this.activeTab() === 'issueCurrency' || this.activeTab() === 'clawbackTokens');

     readonly currencyLayout = computed<'split' | 'paired'>(() => {
          const tab = this.activeTab();

          if (tab === 'setTrustline' || tab === 'removeTrustline') {
               return 'split';
          }

          if (tab === 'issueCurrency' || tab === 'clawbackTokens') {
               return 'paired';
          }

          return 'paired';
     });

     constructor() {
          super();
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.trustlineCurrencyService.setPreferXrpAsDefault(false);
          this.trustlineCurrencyService.setAddMptInDropdown(false);
          this.transactionDropdownService.loadCustomDestinations();
          this.setupWalletSubscriptions();
          // Force initial default + balance refresh
          // this.trustlineCurrencyService.resetToDefault();
     }

     onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency, '');
          this.txUiService.clearAllOptionsAndMessages();
     }

     onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);
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
                         this.clearFields();
                         return from(this.getTrustlinesForAccount(false));
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

     private ensureWalletSelected(): boolean {
          if (!this.hasWallets() || this.walletManagerService.getSelectedIndex() < 0) {
               console.warn('No wallets have been selected. Possibly no wallets are in the app right now.');
               return false;
          }
          return true;
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     toggleOutstandingIOU() {
          this.outstandingIOUCollapsed.set(!this.outstandingIOUCollapsed());
     }

     onFlagChange(flag: string) {
          if (this.trustlineCurrencyService.trustlineFlags[flag]) {
               AppConstants.TRUSTLINE.CONFLICTS[flag]?.forEach((conflict: string | number) => {
                    this.trustlineCurrencyService.trustlineFlags[conflict] = false;
               });
          }
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

     async setTab(tab: 'setTrustline' | 'removeTrustline' | 'issueCurrency' | 'clawbackTokens' | 'addNewIssuers'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          // === 1. Handle flag state FIRST ===
          if (this.activeTab() === 'removeTrustline') {
               // Smart detection: only enable what's needed
               if (this.currentWallet().address) {
                    try {
                         const [client] = await Promise.all([this.getClient()]);
                         const accountObjects = await this.xrplService.getAccountObjects(client, this.currentWallet().address, 'validated', '');
                         this.setRemoveFlagsBasedOnExistingTrustline(accountObjects);
                    } catch (error: any) {
                         console.warn(`Error setting remove flags based on existing trustline: ${error.message}`);
                         this.trustlineCurrencyService.flags.tfClearNoRipple = true;
                         this.trustlineCurrencyService.flags.tfClearFreeze = true;
                         this.trustlineCurrencyService.flags.tfClearDeepFreeze = false;
                         this.trustlineCurrencyService.updateFlagTotal();
                    }
               }
          } else {
               // Leaving remove tab → reset remove-specific flags
               this.trustlineCurrencyService.flags.tfClearNoRipple = false;
               this.trustlineCurrencyService.flags.tfClearFreeze = false;
               this.trustlineCurrencyService.flags.tfClearDeepFreeze = false;
               this.trustlineCurrencyService.updateFlagTotal();
          }

          if (this.activeTab() === 'removeTrustline') {
               this.txUiService.amountField.set('0');
          }

          this.clearFields();
          if (this.hasWallets()) {
               await this.getTrustlinesForAccount(false);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getTrustlinesForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getChecks', true, async () => {
               this.txUiService.resetCurrentStepToIdle();

               if (!this.ensureWalletSelected()) return;

               try {
                    const { wallet, accountInfo, accountObjects } = await this.measure('getTrustlinesForAccount:prepareTxEnvironment', false, async () =>
                         this.txEnvironmentService.prepareTxEnvironment({
                              includeAccountInfo: true,
                              includeAccountObject: true,
                              forceRefresh: forceRefresh,
                         })
                    );

                    if (!accountInfo || !accountObjects) {
                         this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                         return;
                    }

                    this.updateLocalAccountState(accountObjects, wallet.classicAddress);

                    const currency = this.trustlineCurrencyService.currentCurrency();
                    const issuer = this.trustlineCurrencyService.selectedIssuer();
                    this.trustlineCurrencyService.selectCurrency(currency, '');

                    this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getTrustlinesForAccount:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async setTrustLine() {
          await this.withPerf('setTrustLine', async () => {
               this.txUiService.resetCurrentStepToIdle();

               if (!this.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (this.trustlineCurrencyService.trustlineFlags['tfSetNoRipple'] && this.trustlineCurrencyService.trustlineFlags['tfClearNoRipple']) {
                         return this.txUiService.setError('Cannot set both tfSetNoRipple and tfClearNoRipple');
                    }
                    if (this.trustlineCurrencyService.trustlineFlags['tfSetFreeze'] && this.trustlineCurrencyService.trustlineFlags['tfClearFreeze']) {
                         return this.txUiService.setError('Cannot set both tfSetFreeze and tfClearFreeze');
                    }

                    const currency = this.trustlineCurrencyService.getSelectedCurrency();
                    this.txUiService.currencyCode.set(currency);
                    const issuer = this.trustlineCurrencyService.selectedIssuer();
                    this.txUiService.currencyIssuer.set(issuer);

                    let currencyFieldTemp = this.utilsService.encodeIfNeeded(currency);
                    if (!/^[A-Z0-9]{3}$|^[0-9A-Fa-f]{40}$/.test(currencyFieldTemp)) {
                         throw new Error('Invalid currency code. Must be a 3-character code (e.g., USDC) or 40-character hex.');
                    }

                    const result = await this.trustlineOrchestratorService.executeTrustlineTx('setTrustline', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.setTrustlineSpecificKeys)),
                              // destinationAddress: destination,
                         },
                         extra: {},
                         preFetchedEnv: {
                              client: env.client,
                              accountInfo: env.accountInfo,
                              accountObjects: env.accountObjects,
                              fee: env.fee!,
                              currentLedger: env.currentLedger!,
                              // destinationAddress: destination,
                              wallet: env.wallet,
                         },
                    });

                    await this.handleTxResult(result, env.client, env.wallet, '', 'Failed to create check');

                    // Calculate flags
                    // let flags = 0;
                    // Object.entries(this.trustlineFlags).forEach(([key, value]) => {
                    //      if (value) {
                    //           flags |= AppConstants.TRUSTLINE.FLAG_MAP[key as keyof typeof AppConstants.TRUSTLINE.FLAG_MAP];
                    //      }
                    // });

                    // let trustSetTx: xrpl.TrustSet = {
                    //      TransactionType: 'TrustSet',
                    //      Account: wallet.classicAddress,
                    //      LimitAmount: {
                    //           currency: currencyFieldTemp,
                    //           issuer: issuer,
                    //           value: this.txUiService.amountField(),
                    //      },
                    //      // Flags: flags,
                    //      Flags: this.trustlineCurrencyService.totalFlagsValue(),
                    //      Fee: fee,
                    //      LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    // };

                    // await this.setTxOptionalFields(client, trustSetTx, wallet, accountInfo);

                    // const result = await this.txExecutor.setTrustline(trustSetTx, wallet, client, {
                    //      useMultiSign: this.txUiService.useMultiSign(),
                    //      isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                    //      regularKeyAddress: this.txUiService.regularKeyAddress(),
                    //      regularKeySeed: this.txUiService.regularKeySeed(),
                    //      multiSignAddress: this.txUiService.multiSignAddress(),
                    //      multiSignSeeds: this.txUiService.multiSignSeeds(),
                    // });
                    // if (!result.success) return this.txUiService.setError(`${result.error}`);

                    // this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Trustline set successfully!' : 'Trustline set successfully!';
                    // this.onCurrencyChange(currency);
                    // await this.refreshAfterTx(client, wallet, null);
               } catch (error: any) {
                    console.error('Error in setTrustLine:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async removeTrustline() {
          await this.withPerf('removeTrustline', async () => {
               this.txUiService.resetCurrentStepToIdle();

               if (!this.ensureWalletSelected()) return;

 try {
                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    if (this.trustlineCurrencyService.trustlineFlags['tfSetNoRipple'] && this.trustlineCurrencyService.trustlineFlags['tfClearNoRipple']) {
                         this.toastService.error(`Cannot set both tfSetNoRipple and tfClearNoRipple`, AppConstants.TOAST.ERROR);
                         return;
                    }
                    if (this.trustlineCurrencyService.trustlineFlags['tfSetFreeze'] && this.trustlineCurrencyService.trustlineFlags['tfClearFreeze']) {
                         this.toastService.error(`Cannot set both tfSetFreeze and tfClearFreeze`, AppConstants.TOAST.ERROR);
                         return;
                    }

                    const currency = this.trustlineCurrencyService.getSelectedCurrency();
                    this.txUiService.currencyCode.set(currency);
                    const issuer = this.trustlineCurrencyService.selectedIssuer();
                    this.txUiService.currencyIssuer.set(issuer);
                    const trustLine = env.trustlines?.result.lines.find((line: any) => {
                         const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
                         return line.account === issuer && lineCurrency === currency;
                    });

                    if (!trustLine) {
                         this.toastService.error(`No trust line found for ${currency} to issuer ${issuer}`, AppConstants.TOAST.ERROR);
                         return;
                    }

                    const check = this.canRemoveTrustline(trustLine);
                    if (!check.canRemove) {
                         this.toastService.error(`Cannot remove trustline ${trustLine.currency}/${trustLine.account}: ${check.reasons}`, AppConstants.TOAST.ERROR);
                         return;
                    }

                     const result = await this.trustlineOrchestratorService.executeTrustlineTx('removeTrustline', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.txUiService.getValues(this.txUiService.buildTxKeys(...this.removeTrustlineSpecificKeys)),
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

                    await this.handleTxResult(result, env.client, env.wallet, '', 'Failed to remove trustline');
              
                    } catch (error: any) {
                    console.error('Error removing trustline:', error);
                    this.toastService.error(error.message || 'Error removing trustline', AppConstants.TOAST.ERROR);
               }
          });
     }

     async issueCurrency() {
          await this.withPerf('issueCurrency', async () => {
               this.txUiService.resetCurrentStepToIdle();

               if (!this.ensureWalletSelected()) return;

               const destination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

               if (!destination) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }
               
               try {

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeTrustlines: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });
          //           const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
          //           let [accountInfo, fee, lastLedgerIndex, trustLines, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', '')]);
          //           // const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();
          //           // this.utilsService.logAccountInfoObjects(accountInfo, null);
          //           // this.utilsService.logLedgerObjects(fee, lastLedgerIndex, serverInfo);
          //           // this.utilsService.logObjects('trustLines', trustLines);
          //           // const errors = await this.validationService.validate('IssueCurrency', { inputs, client, accountInfo });
          //           // if (errors.length > 0) {
          //           //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
          //           // }
          //           // const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);
          //           // const accountFlags = accountInfo.result.account_data.Flags;
          //           // const asfDefaultRipple = 0x00800000;
          //           // if ((accountFlags & asfDefaultRipple) === 0) {
          //           //      // Need to enable DefaultRipple first
          //           //      const accountSetTx: xrpl.AccountSet = {
          //           //           TransactionType: 'AccountSet',
          //           //           Account: wallet.classicAddress,
          //           //           SetFlag: 8, // asfDefaultRipple
          //           //           Fee: fee,
          //           //           LastLedgerSequence: lastLedgerIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          //           //      };
          //           //      await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);
          //           //      if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
          //           //           return this.txUiService.setError('Insufficient XRP to complete transaction');
          //           //      }
          //           //      // this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? 'Simulating Set Default Ripple (no changes will be made)...' : 'Submitting Set Default Ripple to Ledger...', 200);
          //           //      // this.txUiService.paymentTx.push(accountSetTx);
          //           //      // this.updatePaymentTx();
          //           //      let response: any;
          //           //      if (this.txUiService.isSimulateEnabled()) {
          //           //           response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
          //           //      } else {
          //           //           const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);
          //           //           if (!signedTx) {
          //           //                return this.txUiService.setError('Failed to sign AccountSet transaction.');
          //           //           }
          //           //           const response = await this.xrplTransactions.submitTransaction(client, signedTx);
          //           //           // this.utilsService.logObjects('response', response);
          //           //           // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);
          //           //            this.txUiService.setTxResult(response.result);
          //           // this.updateTxResult();
          //           //           const isSuccess = this.utilsService.isTxSuccessful(response);
          //           //           if (!isSuccess) {
          //           //                const resultMsg = this.utilsService.getTransactionResultMessage(response);
          //           //                const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);
          //           //                console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
          //           //                (response.result as any).errorMessage = userMessage;
          //           //                return this.txUiService.setError(userMessage);
          //           //                return;
          //           //           }
          //           //      }
          //           //      // Update lastLedgerIndex for next transaction
          //           //      lastLedgerIndex = await this.xrplService.getLastLedgerIndex(client);
          //           // }
          //           const currency = this.trustlineCurrencyService.getSelectedCurrency();
          // //           this.txUiService.currencyCode.set(currency);
          //           const issuer = this.trustlineCurrencyService.selectedIssuer();
          //           // this.txUiService.currencyIssuer.set(issuer);
          //           // PHASE 4: Prepare Payment transaction for currency issuance
          //           const curr = this.utilsService.encodeIfNeeded(currency);
          //           const paymentTx: xrpl.Payment = {
          //                TransactionType: 'Payment',
          //                Account: wallet.classicAddress,
          //                Destination: destinationAddress,
          //                Amount: {
          //                     currency: curr,
          //                     value: this.txUiService.amountField(),
          //                     issuer: issuer,
          //                },
          //                Fee: fee,
          //                LastLedgerSequence: lastLedgerIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          //           };
          //           await this.setTxOptionalFields(client, paymentTx, wallet, accountInfo);
          //           const result = await this.txExecutor.issueCurrency(paymentTx, wallet, client, {
          //                useMultiSign: this.txUiService.useMultiSign(),
          //                isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
          //                regularKeyAddress: this.txUiService.regularKeyAddress(),
          //                regularKeySeed: this.txUiService.regularKeySeed(),
          //                multiSignAddress: this.txUiService.multiSignAddress(),
          //                multiSignSeeds: this.txUiService.multiSignSeeds(),
          //           });
          //           if (!result.success) return this.txUiService.setError(`${result.error}`);
          //           this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Issued currency successfully!' : 'Simulated Issued currency successfully!';
          //           this.onCurrencyChange(currency);
          //           await this.refreshAfterTx(client, wallet, null);
          //      } catch (error: any) {
          //           console.error('Error in issueCurrency:', error);
          //           this.txUiService.setError(`${error.message || 'Transaction failed'}`);
          //      } finally {
          //           this.txUiService.spinner.set(false);
               }catch (error: any) {
                    console.error('Error issuing currency:', error);
                    this.toastService.error(error.message || 'Error issuing currency', AppConstants.TOAST.ERROR);
               }
          });
     }

     async clawbackTokens() {
          // await this.withPerf('clawbackTokens', async () => {
          //      this.txUiService.clearAllOptionsAndMessages();
          //      try {
          //           let destinationAddress = this.selectedDestinationAddress().trim();
          //           if (!destinationAddress) {
          //                // Fallback: allow manual typing from search query if valid
          //                const typed = this.destinationSearchQuery().trim();
          //                if (typed && xrpl.isValidAddress(typed)) {
          //                     destinationAddress = typed;
          //                }
          //           }
          //           if (!destinationAddress || !xrpl.isValidAddress(destinationAddress)) {
          //                return this.txUiService.setError('Please enter a valid destination address or select one from the dropdown.');
          //           }
          //           const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
          //           const [accountInfo, accountObjects, trustLines, serverInfo, fee, currentLedger] = await Promise.all([
          //                this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
          //                this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
          //                this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''),
          //                this.xrplService.getXrplServerInfo(client, 'current', ''),
          //                this.xrplService.calculateTransactionFee(client),
          //                this.xrplService.getLastLedgerIndex(client),
          //           ]);
          //           // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
          //           // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
          //           // this.utilsService.logObjects('trustLines', trustLines);
          //           // const errors = await this.validationService.validate('ClawbackTokens', { inputs, client, accountInfo });
          //           // if (errors.length > 0) {
          //           //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
          //           // }
          //           const currency = this.trustlineCurrencyService.getSelectedCurrency();
          // //           this.txUiService.currencyCode.set(currency);
          //           const issuer = this.trustlineCurrencyService.selectedIssuer();
          //           // this.txUiService.currencyIssuer.set(issuer);
          //           const currencyFieldTemp = this.utilsService.encodeIfNeeded(currency);
          //           if (!/^[A-Z0-9]{3}$|^[0-9A-Fa-f]{40}$/.test(currencyFieldTemp)) {
          //                throw new Error('Invalid currency code. Must be a 3-character code (e.g., USDC) or 40-character hex.');
          //           }
          //           let clawbackTx: xrpl.Clawback = {
          //                TransactionType: 'Clawback',
          //                Account: wallet.classicAddress,
          //                Amount: {
          //                     currency: currencyFieldTemp,
          //                     issuer: destinationAddress,
          //                     value: this.txUiService.amountField(),
          //                },
          //                Fee: fee,
          //                LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
          //           };
          //           await this.setTxOptionalFields(client, clawbackTx, wallet, accountInfo);
          //           const result = await this.txExecutor.clawbackTokens(clawbackTx, wallet, client, {
          //                useMultiSign: this.txUiService.useMultiSign(),
          //                isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
          //                regularKeyAddress: this.txUiService.regularKeyAddress(),
          //                regularKeySeed: this.txUiService.regularKeySeed(),
          //                multiSignAddress: this.txUiService.multiSignAddress(),
          //                multiSignSeeds: this.txUiService.multiSignSeeds(),
          //           });
          //           if (!result.success) return this.txUiService.setError(`${result.error}`);
          //           this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Clawback tokens successfully!' : 'Simulated Escrow cancel successfully!';
          //           this.onCurrencyChange(currency);
          //           await this.refreshAfterTx(client, wallet, null);
          //           // if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, clawbackTx, fee)) {
          //           //      return this.txUiService.setError('Insufficient XRP to complete transaction');
          //           // }
          //           // if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, clawbackTx, resolvedDestination)) {
          //           //      return this.txUiService.setError('Not enough IOU balance for this transaction');
          //           // }
          //      } catch (error: any) {
          //           console.error('Error in clawbackTokens:', error);
          //           this.txUiService.setError(`${error.message || 'Transaction failed'}`);
          //      } finally {
          //           this.txUiService.spinner.set(false);
          //      }
          // });
     }

     // private getExistingMpts(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
     //      // this.existingMpts
     //      const mapped = (checkObjects.result.account_objects ?? [])
     //           .filter((obj: any) => {
     //                if (obj.LedgerEntryType !== 'MPToken') return true;
     //                const amount = obj.MPTAmount || obj.OutstandingAmount || '0';
     //                return Number.parseFloat(amount) > 0;
     //           })
     //           .filter((obj: any) => (obj.LedgerEntryType === 'MPTokenIssuance' || obj.LedgerEntryType === 'MPToken') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
     //           .map((obj: any) => {
     //                return {
     //                     LedgerEntryType: obj.LedgerEntryType,
     //                     id: obj.index,
     //                     mpt_issuance_id: obj.mpt_issuance_id,
     //                     TransferFee: obj.TransferFee,
     //                     OutstandingAmount: obj.OutstandingAmount,
     //                     MaximumAmount: obj.MaximumAmount,
     //                     MPTokenMetadata: obj.MPTokenMetadata,
     //                     Issuer: obj.Issuer,
     //                     Flags: obj.Flags,
     //                     AssetScale: obj.AssetScale,
     //                };
     //           })
     //           .sort((a, b) => {
     //                const seqA = (a as any).Sequence ?? Number.MAX_SAFE_INTEGER;
     //                const seqB = (b as any).Sequence ?? Number.MAX_SAFE_INTEGER;
     //                return seqA - seqB;
     //           });
     //      this.existingIOUs.set(mapped);
     //      this.utilsService.logObjects('existingMpts - filtered', mapped);
     // }

     private getExistingIOUs(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (accountObjects.result.account_objects ?? [])
               .filter((obj: any): obj is xrpl.LedgerEntry.RippleState => {
                    if (obj.LedgerEntryType !== 'RippleState') return false;

                    const balanceValue = obj.Balance?.value ?? '0';
                    const myLimit = obj.LowLimit?.issuer === classicAddress ? obj.LowLimit?.value : obj.HighLimit?.value;

                    const peerLimit = obj.LowLimit?.issuer === classicAddress ? obj.HighLimit?.value : obj.LowLimit?.value;

                    // Hide if:
                    // 1. Balance is exactly zero
                    // 2. AND both sides have zero limit (i.e. user "removed" it)
                    const balanceIsZero = Number.parseFloat(balanceValue) === 0;
                    const myLimitIsZero = myLimit === '0' || myLimit === 0;
                    const peerLimitIsZero = peerLimit === '0' || peerLimit === 0;

                    return !(balanceIsZero && myLimitIsZero && peerLimitIsZero);
               })
               .map((obj: xrpl.LedgerEntry.RippleState): RippleState => {
                    const balance = obj.Balance?.value ?? '0';
                    const currency = this.utilsService.normalizeCurrencyCode(obj.Balance?.currency);

                    const isHighSide = obj.HighLimit.issuer === classicAddress;
                    const issuer = isHighSide ? obj.LowLimit.issuer : obj.HighLimit.issuer;

                    return {
                         LedgerEntryType: 'RippleState',
                         Balance: {
                              currency,
                              value: balance,
                         },
                         HighLimit: {
                              issuer,
                         },
                    };
               })
               // Sort alphabetically by issuer or currency if available
               .sort((a, b) => a.HighLimit.issuer.localeCompare(b.HighLimit.issuer));

          this.existingIOUs.set(mapped);
          this.utilsService.logObjects('existingIOUs', mapped);
     }

     // get availableCurrencies(): string[] {
     //      return this.trustlineCurrencyService.getCurrencies(); // or subscribe to currencies$
     // }

     // private readonly walletKey = computed(() => `${this.currentWallet().seed}:${this.currentWallet().encryptionAlgorithm}`);

     // private async getWallet(): Promise<xrpl.Wallet> {
     //      const key = this.walletKey();
     //      if (this.walletCache.has(key)) {
     //           console.log('Using cached wallet for seed with key', key);
     //           return this.walletCache.get(key)!;
     //      }

     //      console.log('Creating wallet for seed with encryption algorithm', this.currentWallet().encryptionAlgorithm);
     //      const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');

     //      if (!wallet) throw new Error('Wallet could not be created');

     //      this.walletCache.set(key, wallet);
     //      return wallet;
     // }

     private async setTxOptionalFields(client: xrpl.Client, trustSetTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(trustSetTx, ticket, true);
               }
          }

          // if (this.destinationTagField() && Number.parseInt(this.destinationTagField()) > 0) {
          //      this.utilsService.setDestinationTag(trustSetTx, this.destinationTagField());
          // }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(trustSetTx, this.txUiService.memoField());
          }
     }

     private async handleTxResult(result: { success: boolean; error?: string }, client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, errorMessage: string): Promise<boolean> {
          if (!result.success) {
               this.toastService.error(result.error || errorMessage, AppConstants.TOAST.ERROR);
               return false;
          }

          await this.refreshAfterTx(client, wallet, destination);

          this.trustlineCurrencyService.refreshNonNativeCurrency();

          this.clearFields();
          return true;
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);

          this.updateLocalAccountState(accountObjects, wallet.classicAddress);

          await this.refreshWallets(client, destination ? [wallet.classicAddress, destination] : [wallet.classicAddress]);

          this.addCustomDestination(destination);
          this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
     }

     private updateLocalAccountState(accountObjects: any, address: string): void {
          // this.getExistingIOUs(accountObjects, wallet.classicAddress);
          // this.getExistingMpts(accountObjects, wallet.classicAddress);
          // this.existingMpts.set(this.mptUtilService.getExistingMpts(accountObjects, address));
          this.existingIOUs.set(this.trustlineCurrencyService.getExistingIOUs(accountObjects, address));
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

     // private refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
     //      // Update multi-sign & regular key flags
     //      const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
     //      this.txUiService.regularKeySigningEnabled.set(hasRegularKey);

     //      // Update service state
     //      this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

     //      const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
     //      const hasSignerList = signerAccounts?.length > 0;
     //      this.txUiService.signerQuorum.set(signerQuorum);
     //      const checkForMultiSigner = signerAccounts?.length > 0;
     //      checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

     //      this.txUiService.multiSigningEnabled.set(hasSignerList);
     //      if (hasSignerList) {
     //           const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
     //           this.txUiService.signers.set(entries);
     //      }

     //      const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };

     //      this.txUiService.regularKeyAddress.set(rkProps.regularKeyAddress);
     //      this.txUiService.regularKeySeed.set(rkProps.regularKeySeed);
     // }

     // private setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
     //      const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
     //      this.txUiService.signers.set(signerEntries);
     //      this.txUiService.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
     //      this.txUiService.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     // }

     // private clearMultiSignersConfiguration(): void {
     //      this.txUiService.signerQuorum.set(0);
     //      this.txUiService.multiSignAddress.set('No Multi-Sign address configured for account');
     //      this.txUiService.multiSignSeeds.set('');
     //      this.storageService.removeValue('signerEntries');
     // }

     private updateTrustLineFlagsInUI(accountObjects: xrpl.AccountObjectsResponse, wallet: xrpl.Wallet) {
          const currency = this.trustlineCurrencyService.getSelectedCurrency();
          // //           this.txUiService.currencyCode.set(currency);
          const issuer = this.trustlineCurrencyService.selectedIssuer();
          // this.txUiService.currencyIssuer.set(issuer);
          const activeTab = this.activeTab();

          // Start clean
          Object.keys(this.trustlineCurrencyService.flags).forEach(k => (this.trustlineCurrencyService.flags[k as keyof typeof this.trustlineCurrencyService.flags] = false));

          const encoded = this.utilsService.encodeIfNeeded(currency);
          const walletAddr = wallet.classicAddress || wallet.address;

          const state = accountObjects.result.account_objects.find((obj): obj is xrpl.LedgerEntry.RippleState => {
               return obj.LedgerEntryType === 'RippleState' && obj.Balance?.currency === encoded && (obj.LowLimit?.issuer === walletAddr || obj.HighLimit?.issuer === walletAddr) && (obj.LowLimit?.issuer === issuer || obj.HighLimit?.issuer === issuer);
          });

          if (!state) {
               if (activeTab !== 'removeTrustline') this.trustlineCurrencyService.clearFlagsValue(activeTab);
               return;
          }

          const flags = state.Flags ?? 0;
          const isLowSide = state.LowLimit?.issuer === walletAddr;
          const map = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

          if (activeTab === 'removeTrustline') {
               // ONLY enable the flags that are actually blocking removal
               if (flags & map.lsfNoRipple) this.trustlineCurrencyService.flags.tfClearNoRipple = true;
               if (isLowSide ? flags & map.lsfLowFreeze : flags & map.lsfHighFreeze) this.trustlineCurrencyService.flags.tfClearFreeze = true;
               // tfSetfAuth is almost never required for removal → keep false
          } else {
               // Normal "Set Trustline" tab → show current state
               this.trustlineCurrencyService.flags.tfSetfAuth = isLowSide ? !!(flags & map.lsfLowAuth) : !!(flags & map.lsfHighAuth);
               this.trustlineCurrencyService.flags.tfSetNoRipple = !!(flags & map.lsfNoRipple);
               this.trustlineCurrencyService.flags.tfSetFreeze = isLowSide ? !!(flags & map.lsfLowFreeze) : !!(flags & map.lsfHighFreeze);
          }

          this.trustlineCurrencyService.updateFlagTotal();
     }

     private setRemoveFlagsBasedOnExistingTrustline(accountObjects: xrpl.AccountObjectsResponse) {
          const currency = this.trustlineCurrencyService.getSelectedCurrency();
          //           this.txUiService.currencyCode.set(currency);
          const issuer = this.trustlineCurrencyService.selectedIssuer();
          // this.txUiService.currencyIssuer.set(issuer);

          // Reset everything that can block removal
          this.trustlineCurrencyService.flags.tfClearNoRipple = false;
          this.trustlineCurrencyService.flags.tfClearFreeze = false;
          this.trustlineCurrencyService.flags.tfClearDeepFreeze = false;
          this.trustlineCurrencyService.flags.tfSetfAuth = false; // ← This was your bug!

          if (!currency || !issuer || !this.currentWallet().address) return;

          const encoded = this.utilsService.encodeIfNeeded(currency);
          const walletAddr = this.currentWallet().classicAddress || this.currentWallet().address;

          const state = accountObjects.result.account_objects.find((obj): obj is xrpl.LedgerEntry.RippleState => {
               return obj.LedgerEntryType === 'RippleState' && obj.Balance?.currency === encoded && (obj.LowLimit?.issuer === walletAddr || obj.HighLimit?.issuer === walletAddr) && (obj.LowLimit?.issuer === issuer || obj.HighLimit?.issuer === issuer);
          });

          if (!state) return;

          const flags = state.Flags ?? 0;
          const isLowSide = state.LowLimit?.issuer === walletAddr;
          const map = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

          // Only turn on the clear flags if they are actually set
          if (flags & map.lsfNoRipple) this.trustlineCurrencyService.flags.tfClearNoRipple = true;
          if (isLowSide ? flags & map.lsfLowFreeze : flags & map.lsfHighFreeze) this.trustlineCurrencyService.flags.tfClearFreeze = true;

          // tfSetfAuth is almost never needed for removal — only if the *other* side authorized you
          // In 99.9% of cases (including yours) it should stay OFF
          // → So we deliberately DO NOT touch it here
          this.trustlineCurrencyService.updateFlagTotal();
     }

     // toggleFlag(key: 'tfSetfAuth' | 'tfSetNoRipple' | 'tfClearNoRipple' | 'tfSetFreeze' | 'tfClearFreeze' | 'tfSetDeepFreeze' | 'tfClearDeepFreeze') {
     //      this.flags[key] = !this.flags[key];
     //      this.updateFlagTotal();
     // }

     // private updateFlagTotal() {
     //      let sum = 0;
     //      if (this.flags.tfSetfAuth) sum |= this.flagValues.tfSetfAuth;
     //      if (this.flags.tfSetNoRipple) sum |= this.flagValues.tfSetNoRipple;
     //      if (this.flags.tfClearNoRipple) sum |= this.flagValues.tfClearNoRipple;
     //      if (this.flags.tfSetFreeze) sum |= this.flagValues.tfSetFreeze;
     //      if (this.flags.tfClearFreeze) sum |= this.flagValues.tfClearFreeze;
     //      if (this.flags.tfSetDeepFreeze) sum |= this.flagValues.tfSetDeepFreeze;
     //      if (this.flags.tfClearDeepFreeze) sum |= this.flagValues.tfClearDeepFreeze;

     //      this.totalFlagsValue.set(sum);
     //      this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     // }

     // clearFlagsValue() {
     //      if (this.activeTab() !== 'removeTrustline') {
     //           this.flags = {
     //                tfSetfAuth: false,
     //                tfSetNoRipple: false,
     //                tfClearNoRipple: false,
     //                tfSetFreeze: false,
     //                tfClearFreeze: false,
     //                tfSetDeepFreeze: false,
     //                tfClearDeepFreeze: false,
     //           };
     //           this.totalFlagsValue.set(0);
     //           this.totalFlagsHex.set('0x0');
     //      }
     // }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }

     clearFields() {
          this.txUiService.newCurrency.set('');
          this.txUiService.newIssuer.set('');
          this.trustlineCurrencyService.clearFlagsValue(this.activeTab());
          this.selectedDestinationAddress.set('');
     }

     copyIOUIssuanceAddress(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.txUiService.showToastMessage('IOU Token Issuer copied!');
          });
     }

     // private updateInfoMessage() {
     //      const tabDescriptions: Record<string, string> = {
     //           setTrustline: 'trustline that can be set',
     //           removeTrustline: 'trustline that can be removed',
     //           issueCurrency: 'trustline that can be used to issue currencies',
     //           clawbackTokens: 'trustline that supports clawback',
     //      };

     //      const count = this.existingIOUs.length;
     //      const description = tabDescriptions[this.activeTab()] || 'trustline';

     //      const walletName = this.currentWallet.name || 'selected';

     //      let message: string;

     //      if (count === 0) {
     //           message = `<code>${walletName}</code> wallet has no ${description}.`;
     //      } else {
     //           const trustlineWord = count === 1 ? 'trustline' : 'trustlines';
     //           message = `<code>${walletName}</code> wallet has <strong>${count}</strong> ${trustlineWord}${description.includes('trustline') ? '' : ` ${description}`}.`;

     //           // Add link to view tokens
     //           const link = `${this.txUiService.explorerUrl}account/${this.currentWallet().address}/tokens`;
     //           message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View IOUs on XRPL Win</a>`;
     //      }

     //      this.txUiService.setInfoMessage(message);
     // }

     decodeMptFlagsForUi(flags: number): string {
          const flagDefinitions = [
               { value: 2, name: 'canLock' },
               { value: 4, name: 'isRequireAuth' },
               { value: 8, name: 'canEscrow' },
               { value: 10, name: 'canTrade' },
               { value: 20, name: 'canTransfer' },
               { value: 40, name: 'canClawback' },
          ];

          const activeFlags: string[] = [];

          for (const flag of flagDefinitions) {
               if ((flags & flag.value) === flag.value) {
                    activeFlags.push(flag.name);
               }
          }

          return activeFlags.length > 0 ? activeFlags.join(', ') : 'None';
     }

     // formatIOUXrpAmountUI(amount: any): string {
     //      if (!amount) return 'Unknown';

     //      if (typeof amount === 'string' && amount.split(' ').length === 1) {
     //           // XRP in drops
     //           return `${amount} XRP`;
     //      } else if (amount.split(' ').length === 2) {
     //           const splitAmount = amount.split(' ');
     //           return `${splitAmount[0]} ${splitAmount[1]}`;
     //      }

     //      if (typeof amount === 'object') {
     //           // Issued currency
     //           const { currency, issuer, value } = amount;
     //           return `${value} ${currency} (issuer: ${issuer})`;
     //      }

     //      return 'Unknown';
     // }

     // formatIOUXrpAmountOutstanding(amount: any): string {
     //      if (!amount) return 'Unknown';

     //      if (typeof amount === 'string' && /^[0-9]+$/.test(amount)) {
     //           return `${xrpl.dropsToXrp(amount)} XRP`;
     //      }

     //      if (typeof amount === 'object') {
     //           // Issued currency
     //           const { currency, value } = amount;
     //           return `${value} ${this.utilsService.decodeIfNeeded(currency)}`;
     //      }

     //      return `${amount} XRP`;
     // }

     // formatInvoiceId(invoiceId: any): string {
     //      return this.utilsService.formatInvoiceId(invoiceId || '');
     // }

     // formatXrplTimestamp(timestamp: number): string {
     //      return this.utilsService.convertXRPLTime(timestamp);
     // }

     onCurrencyChange(currency: string) {
          this.trustlineCurrencyService.selectCurrency(currency, this.currentWallet().address);
     }

     onIssuerChange(issuer: string) {
          this.trustlineCurrencyService.selectIssuer(issuer);
     }

     // Validate inputs before adding
     public isAddValid(): boolean {
          const currency = this.txUiService.newCurrency()?.trim();
          const issuer = this.txUiService.newIssuer()?.trim();

          if (!currency || !issuer) return false;
          if (!this.utilsService.isValidCurrencyCode(currency)) return false;
          if (!xrpl.isValidAddress(issuer)) return false;

          // Optional: prevent duplicates
          const existing = this.trustlineCurrencyService.getIssuersForCurrency(currency);
          return !existing.includes(issuer);
     }

     // Validate before removing
     public isRemoveValid(): boolean {
          const currency = this.trustlineCurrencyService.getSelectedCurrency();
          //           this.txUiService.currencyCode.set(currency);
          const issuer = this.trustlineCurrencyService.selectedIssuer();
          // this.txUiService.currencyIssuer.set(issuer);

          return !!currency && currency !== 'XRP' && !!issuer;
     }

     // Wrapper methods with proper feedback
     addNewCurrencyIssuer(): void {
          const currency = this.txUiService.newCurrency();
          const issuer = this.txUiService.newIssuer();

          if (!this.isAddValid()) {
               this.txUiService.setError('Invalid currency code or issuer address, or already exists');
               return;
          }

          this.trustlineCurrencyService.addToken(currency, issuer);

          this.onCurrencyChange(currency);

          // Clear inputs
          this.txUiService.newCurrency.set('');
          this.txUiService.newIssuer.set('');

          this.toastService.success('Currency/Issuer added successfully');
     }

     removeCurrentCurrencyIssuer(): void {
          const currency = this.trustlineCurrencyService.getSelectedCurrency();
          //           this.txUiService.currencyCode.set(currency);
          const issuer = this.trustlineCurrencyService.selectedIssuer();
          // this.txUiService.currencyIssuer.set(issuer);

          if (!this.isRemoveValid()) {
               this.txUiService.setError('No valid currency or issuer selected to remove');
               return;
          }

          this.trustlineCurrencyService.removeToken(currency, issuer);

          this.toastService.success('Currency/Issuer removed successfully');

          // If we removed the last issuer for this currency, switch to next available
          const remainingIssuers = this.trustlineCurrencyService.getIssuersForCurrency(currency);
          if (remainingIssuers.length === 0) {
               const available = this.trustlineCurrencyService.getCurrencies();
               if (available.length > 0) {
                    // this.currencyFieldDropDownValue.set(available[0]);
                    this.onCurrencyChange(available[0]);
               } else {
                    // this.currencyFieldDropDownValue.set('');
               }
          }
     }

     private canRemoveTrustline(line: any): { canRemove: boolean; reasons: string[] } {
          const reasons: string[] = [];

          if (Number.parseFloat(line.balance) !== 0) {
               reasons.push(`Balance is ${line.balance} (must be 0)`);
          }

          // if (line.no_ripple && !this.trustlineFlags['tfClearNoRipple']) {
          if (line.no_ripple && !this.trustlineCurrencyService.flags.tfClearNoRipple) {
               reasons.push(`NoRipple flag is set`);
          }
          if (line.freeze) {
               reasons.push(`Freeze flag is set`);
          }
          if (line.authorized) {
               reasons.push(`Authorized flag is set (issuer must unauthorize before deletion)`);
          }

          if (line.peer_authorized) {
               reasons.push(`Peer authorized is still enabled`);
          }

          return {
               canRemove: reasons.length === 0,
               reasons,
          };
     }
}
