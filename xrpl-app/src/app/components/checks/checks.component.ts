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
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
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

interface MPToken {
     LedgerEntryType: 'MPToken';
     index?: string;
     mpt_issuance_id?: string;
     MPTokenIssuanceID?: string;
     PreviousTxnID?: string;
     Flags?: number;
     MPTAmount?: string | number;
     MaximumAmount?: string | number;
     OutstandingAmount?: string | number;
     TransferFee?: string | number;
     MPTokenMetadata?: string;
}

interface IssuerItem {
     name: string;
     address: string;
}

interface CheckItem {
     id: string;
     display: string;
     isCurrentAccount: boolean;
     secondary: string;
     currency: string;
     issuer: string;
}

interface RippleState {
     LedgerEntryType: 'RippleState';
     Balance: { currency: string; value: string };
     HighLimit: { issuer: string };
}

@Component({
     selector: 'app-checks',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './checks.component.html',
     styleUrl: './checks.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendChecksComponent extends PerformanceBaseComponent implements OnInit {
     private readonly destroyRef = inject(DestroyRef);
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly dropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);

     // Destination Dropdown
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     checkIdSearchQuery = signal<string>('');

     // Reactive State (Signals)
     private walletCache = new Map<string, xrpl.Wallet>();
     private readonly knownTrustLinesIssuers = signal<{ [key: string]: string[] }>({ XRP: [] });
     private readonly cashCheckItems = computed(() => this.cashableChecks().map(check => this.mapCheckItem(check, 'cash')));
     private readonly cancelCheckItems = computed(() => this.cancellableChecks().map(check => this.mapCheckItem(check, 'cancel')));
     activeTab = signal<'create' | 'cash' | 'cancel'>('create');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     destinationField = signal<string>('');
     currencyFieldDropDownValue = signal<string>('XRP');
     checkExpirationTime = signal<string>('seconds');
     issuerFields = signal<string>('');
     expirationTimeField = signal<string>('');
     ticketSequence = signal<string>('');
     // checkIdField = signal<string>('');
     outstandingChecks = signal<string>('');
     mptIssuanceIdField = signal<string>('');
     isMptEnabled = signal(false);
     currencyBalanceField = signal<string>('0');
     gatewayBalance = signal<string>('0');
     issuerToRemove = signal<string>('');
     currencies = signal<string[]>([]);
     userAddedCurrencyFieldDropDownValue = signal<string[]>([]);
     userAddedissuerFields = signal<string>('');
     allKnownIssuers = signal<string[]>([]);
     storedIssuers = signal<IssuerItem[]>([]);
     selectedIssuer = signal<string>('');
     newCurrency = signal<string>('');
     newIssuer = signal<string>('');
     tokenToRemove = signal<string>('');
     selectedWalletIndex = signal<number>(0);
     issuers = signal<{ name?: string; address: string }[]>([]);
     lastCurrency = signal<string>('');
     lastIssuer = signal<string>('');
     cancellableChecks = signal<any[]>([]);
     cashableChecks = signal<any[]>([]);
     existingChecks = signal<any[]>([]);
     outstandingChecksCollapsed = signal(true);
     existingIOUs = signal<any[]>([]);
     existingMpts = signal<any[]>([]);
     currencyChangeTrigger = signal(0);
     wantsExpiration = signal<boolean>(false);
     wantsOptions = signal<boolean>(false);
     isCheckReadonly = signal(true);

     selectedCheckItem = computed<CheckItem | null>(() => {
          const id = this.txUiService.checkIdField();
          if (!id) return null;

          const items = this.checkItems();
          if (!items) return null;

          return items.find(item => item.id === id) ?? null;
     });

     checkItems = computed(() => (this.activeTab() === 'cash' ? this.cashCheckItems() : this.cancelCheckItems()));

     private mapCheckItem(check: any, mode: 'cash' | 'cancel') {
          const addr = mode === 'cash' ? check.sender : check.destination;
          const short = `${addr?.slice(0, 8)}...${addr?.slice(-6)}`;
          const currency = check.sendMax.currency || 'XRP';

          return {
               id: check.id,
               display: `${this.formatIOUXrpAmountOutstanding(check.sendMax)} ${mode === 'cash' ? '←' : '→'} ${short}`,
               secondary: check.id,
               isCurrentAccount: false,
               currency,
               issuer: check.sendMax.issuer ?? '',
          };
     }

     onCheckSelected(item: SelectItem | null) {
          this.txUiService.checkIdField.set(item?.id || '');
     }

     selectedDestinationItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;
          return this.destinationItems().find(d => d.id === addr) || null;
     });

     destinationItems = computed(() => {
          const currentAddr = this.currentWallet().address;

          return this.allDestinations().map(d => ({
               id: d.address,
               display: d.name ?? 'Unknown Wallet',
               secondary: d.address,
               isCurrentAccount: d.address === currentAddr,
          }));
     });

     currencyItems = computed(() => {
          const currentCode = this.currencyFieldDropDownValue();
          return this.availableCurrencies.map(curr => ({
               id: curr,
               display: curr === 'XRP' ? 'XRP' : curr,
               // secondary: curr === 'XRP' ? 'Native XRPL currency' : 'Issued token',
               // secondary: curr === 'XRP' ? 'Native currency' : `${this.trustlineCurrency.getIssuersForCurrency(curr).length} issuer(s)`,
               secondary:
                    curr === 'XRP'
                         ? 'Native currency'
                         : (() => {
                                const count = this.trustlineCurrency.getIssuersForCurrency(curr).length;
                                return count === 0 ? 'No issuers' : `${count} issuer${count !== 1 ? 's' : ''}`;
                           })(),
               isCurrentAccount: false,
               isCurrentCode: curr === currentCode,
               isCurrentToken: false,
          }));
     });

     selectedCurrencyItem = computed(() => {
          const code = this.currencyFieldDropDownValue();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     });

     onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id || 'XRP';
          this.currencyFieldDropDownValue.set(currency);
          this.onCurrencyChange(currency); // triggers issuer reload + balance update
     }

     destinations = computed(() => [
          ...this.wallets().map((w: DropdownItem) => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
          })),
          ...this.customDestinations(),
     ]);

     private readonly destinationMap = computed(() => {
          return new Map(this.allDestinations().map(d => [d.address, d]));
     });

     destinationDisplay = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return this.destinationSearchQuery();
          return this.dropdownService.formatDisplay(this.destinationMap().get(addr) ?? { address: addr });
     });

     filteredDestinations = computed(() => {
          const q = this.destinationSearchQuery().trim().toLowerCase();
          if (!q) return this.allDestinations();

          const current = this.currentWallet().address;
          return this.allDestinations().filter(d => d.address !== current && (d.address.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q)));
     });

     checkIdDisplay = computed(() => {
          const id = this.txUiService.checkIdField();
          if (!id) return this.checkIdSearchQuery() || '';

          const check = this.getCheckById(id);
          if (!check) return id.slice(0, 20) + '...';

          const amount = this.formatIOUXrpAmountOutstanding(check.sendMax);
          const addr = this.activeTab() === 'cash' ? check.sender || 'Unknown' : check.destination || 'Unknown';

          const shortAddr = addr.slice(0, 8) + '...' + addr.slice(-6);
          const arrow = this.activeTab() === 'cash' ? '←' : '→';

          return `${amount} ${arrow} ${shortAddr}`;
     });

     checkIdInputDisplay = computed(() => {
          // If user is typing (search query has content), show what they're typing
          if (this.checkIdSearchQuery()) {
               return this.checkIdSearchQuery();
          }
          // Otherwise show formatted version of selected Check ID
          return this.checkIdDisplay();
     });

     filteredCheckIds = computed(() => {
          const q = this.checkIdSearchQuery().trim().toLowerCase();
          const list = this.activeTab() === 'cash' ? this.cashableChecks() : this.cancellableChecks();

          if (q === '') return list;

          return list.filter(check => {
               const indexMatch = check.id.toLowerCase().includes(q);
               const amountMatch = this.formatIOUXrpAmountOutstanding(check.sendMax).toLowerCase().includes(q);
               const addrMatch = (check.sender || check.destination || '').toLowerCase().includes(q);
               return indexMatch || amountMatch || addrMatch;
          });
     });

     issuerItems = computed(() => {
          const currentIssuer = this.trustlineCurrency.getSelectedIssuer();
          return this.issuers().map((iss, i) => ({
               id: iss.address,
               display: iss.name || `Issuer ${i + 1}`,
               secondary: iss.address.slice(0, 7) + '...' + iss.address.slice(-7),
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: iss.address === currentIssuer, // This one!
          }));
     });

     selectedIssuerAddress = computed(() => this.trustlineCurrency.getSelectedIssuer());

     selectedIssuerItem = computed(() => {
          const addr = this.trustlineCurrency.getSelectedIssuer(); // ← read directly from service
          if (!addr) return null;
          return this.issuerItems().find((item: { id: string }) => item.id === addr) || null;
     });

     onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrency.selectIssuer(address);
          this.onIssuerChange(address); // your existing logic runs
     }

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
                         amount: this.formatIOUXrpAmountOutstanding(c.sendMax),
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
               // if (hasMPTs) links.push(`<a href="${explorerBase}account/${address}/mpts/owned" target="_blank" rel="noopener" class="xrpl-win-link">View MPTs</a>`);
          } else {
               // links.push(`<a href="${explorerBase}account/${address}/escrows" target="_blank" rel="noopener" class="xrpl-win-link">View All Escrows</a>`);
          }

          return {
               walletName,
               checkCount,
               checksToShow,
               links: links.length > 0 ? links.join(' | ') : null,
          };
     });

     timeUnitItems = computed(() => [
          { id: 'seconds', display: 'Seconds' },
          { id: 'minutes', display: 'Minutes' },
          { id: 'hours', display: 'Hours' },
          { id: 'days', display: 'Days' },
     ]);

     selectedTimeUnitItem = computed(() => {
          const unit = this.checkExpirationTime();
          return this.timeUnitItems().find(i => i.id === unit) || null;
     });

     hasWallets = computed(() => this.wallets().length > 0);

     constructor() {
          super();
          effect(() => {
               const item = this.selectedCheckItem();
               if (item) {
                    const amountStr = item.display.split(' ')[0];
                    this.txUiService.amountField.set(amountStr);
               }
          });

          // Auto-select typed address if it's valid and not already selected
          effect(() => {
               const typed = this.destinationSearchQuery().trim();
               const current = this.selectedDestinationAddress();

               if (typed && typed !== current && xrpl.isValidAddress(typed)) {
                    // Only auto-set if it's not already in the list (prevents loop)
                    if (!this.allDestinations().some(d => d.address === typed)) {
                         this.selectedDestinationAddress.set(typed);
                    }
               }
          });
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.loadKnownIssuers();
          this.refreshStoredIssuers();
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.currencyFieldDropDownValue.set('XRP');
          this.populateDefaultDateTime();

          // Subscribe once
          this.trustlineCurrency.currencies$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(currencies => {
               this.currencies.set(currencies);
               if (currencies.length > 0 && !this.currencyFieldDropDownValue()) {
                    this.currencyFieldDropDownValue.set(currencies[0]);
                    this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue(), this.currentWallet().address);
               }
          });

          this.trustlineCurrency.issuers$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(issuers => {
               this.issuers.set(issuers);
          });

          this.trustlineCurrency.selectedIssuer$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(issuer => {
               this.issuerFields.set(issuer);
          });

          this.trustlineCurrency.balance$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(balance => {
               this.currencyBalanceField.set(balance); // ← This is your live balance!
          });

          this.txUiService.clearAllOptions();
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
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
               if (this.hasWallets() && !this.currentWallet().address) {
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
                         // this.xrplCache.invalidateAccountCache(wallet.address);
                         this.txUiService.clearAllOptions();
                         this.clearFields();
                         return from(this.getChecks(false));
                    })
               )
               .subscribe();
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          // this.xrplCache.invalidateAccountCache(wallet.address);

          // Prevent self as destination
          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }

          this.currencyFieldDropDownValue.set(this.currencyFieldDropDownValue() || 'XRP');
          this.onCurrencyChange(this.issuerFields()); // triggers issuer reload + balance update
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

     async setTab(tab: 'create' | 'cash' | 'cancel'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          if (Object.keys(this.knownTrustLinesIssuers()).length > 0 && this.issuerFields() === '') {
               this.currencyFieldDropDownValue.set(Object.keys(this.knownTrustLinesIssuers())[0]);
          }

          this.clearFields();
          if (this.hasWallets()) {
               await this.getChecks(false);
               this.populateDefaultDateTime();
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getChecks(forceRefresh = false): Promise<void> {
          await this.withPerf('getChecks', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) {
                    throw new Error('Please select a wallet.');
               }

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.getExistingChecks(accountObjects, wallet.classicAddress);
                    this.getCashableChecks(accountObjects, wallet.classicAddress);
                    this.getCancelableChecks(accountObjects, wallet.classicAddress);
                    this.getExistingMpts(accountObjects, wallet.classicAddress);
                    this.getExistingIOUs(accountObjects, wallet.classicAddress);

                    if (this.currencyFieldDropDownValue() !== 'XRP' && this.currencyFieldDropDownValue() !== 'MPT' && this.issuerFields() !== '') {
                         this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue(), this.currentWallet().address);
                    }

                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getChecks:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createCheck() {
          await this.withPerf('createCheck', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    let destinationAddress = this.selectedDestinationAddress().trim();
                    if (!destinationAddress) {
                         // Fallback: allow manual typing from search query if valid
                         const typed = this.destinationSearchQuery().trim();
                         if (typed && xrpl.isValidAddress(typed)) {
                              destinationAddress = typed;
                         }
                    }

                    if (!destinationAddress || !xrpl.isValidAddress(destinationAddress)) {
                         return this.txUiService.setError('Please enter a valid destination address or select one from the dropdown.');
                    }

                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, fee, currentLedger, destinationAccountInfo] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client), this.xrplCache.getAccountInfo(destinationAddress, false)]);

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: { accountInfo, accountObjects, fee, currentLedger },
                         createCheck: { amount: this.txUiService.amountField(), destination: destinationAddress },
                         regularKey: { isRegularKey: this.txUiService.isRegularKeyAddress(), address: this.txUiService.regularKeyAddress(), seed: this.txUiService.regularKeySeed() },
                    });

                    const errors = await this.validationService.validate('CreateCheck', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    if (destinationAccountInfo?.result?.account_flags?.disallowIncomingCheck) {
                         return this.txUiService.setError(`Error:\nDestination ${destinationAddress} has disallowIncomingCheck enabled. This wallet can not recieve checks.`);
                    }

                    // Build SendMax amount
                    const curr: xrpl.MPTAmount = {
                         mpt_issuance_id: this.mptIssuanceIdField(),
                         value: this.txUiService.amountField(),
                    };

                    let sendMax;
                    let paymentType;
                    if (this.currencyFieldDropDownValue() === AppConstants.XRP_CURRENCY) {
                         // if (this.isMptEnabled) {
                         // sendMax = curr;
                         // paymentType = 'MPT';
                         // } else {
                         sendMax = xrpl.xrpToDrops(this.txUiService.amountField());
                         paymentType = 'XRP';
                         // }
                    } else {
                         sendMax = {
                              currency: this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue()),
                              value: this.txUiService.amountField(),
                              issuer: this.issuerFields(),
                         };
                         paymentType = 'IOU';
                    }

                    let checkCreateTx: CheckCreate = {
                         TransactionType: 'CheckCreate',
                         Account: wallet.classicAddress,
                         SendMax: sendMax,
                         Destination: destinationAddress,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, checkCreateTx, wallet, accountInfo, 'create');

                    const result = await this.txExecutor.checkCreate(checkCreateTx, wallet, client, {
                         destination: destinationAddress,
                         paymentType: paymentType,
                         amount: this.txUiService.amountField(),
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeyAddress: this.txUiService.regularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    if (this.currencyFieldDropDownValue() !== 'XRP' && this.currencyFieldDropDownValue() !== 'MPT') {
                         this.onCurrencyChange(this.currencyFieldDropDownValue());
                    }

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Create check successfully!' : 'Check created successfully!';
                    await this.refreshAfterTx(client, wallet, destinationAddress, true);
               } catch (error: any) {
                    console.error('Error in createCheck:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async cashCheck() {
          await this.withPerf('cashCheck', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [accountInfo, checkObjects, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplCache.getAccountObjectsWithType(this.currentWallet().address, true, 'check'), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: { accountInfo, fee, currentLedger },
                         cashCheck: { amount: this.txUiService.amountField(), checkIdField: this.txUiService.checkIdField() },
                         regularKey: { isRegularKey: this.txUiService.isRegularKeyAddress(), address: this.txUiService.regularKeyAddress(), seed: this.txUiService.regularKeySeed() },
                    });

                    const errors = await this.validationService.validate('CashCheck', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    const checkObject = await this.xrplService.getCheckByCheckId(client, this.txUiService.checkIdField(), 'validated');
                    if (checkObject) {
                         console.log('checkObject: ', checkObject);
                         if (checkObject.Expiration) {
                              const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
                              if (currentRippleTime >= checkObject.Expiration) {
                                   return this.txUiService.setError(`Transaction or object has expired.`);
                              }
                         }
                    } else {
                         return this.txUiService.setError(`No check found with Check ID ${this.txUiService.checkIdField()}`);
                    }

                    if (this.currencyFieldDropDownValue() !== AppConstants.XRP_CURRENCY) {
                         console.debug(`checkObjects for ${wallet.classicAddress}:`, checkObjects.result);
                         const issuer = this.getIssuerForCheck(checkObjects.result.account_objects, this.txUiService.checkIdField());
                         console.log('Issuer:', issuer);
                         if (issuer) {
                              this.selectedIssuer.set(issuer);
                         }
                    }

                    // Build amount object depending on currency
                    const amountToCash =
                         this.currencyFieldDropDownValue() === AppConstants.XRP_CURRENCY
                              ? xrpl.xrpToDrops(this.txUiService.amountField())
                              : {
                                     value: this.txUiService.amountField(),
                                     currency: this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue()),
                                     issuer: this.selectedIssuer(),
                                };

                    let checkCashTx: CheckCash = {
                         TransactionType: 'CheckCash',
                         Account: wallet.classicAddress,
                         Amount: amountToCash,
                         CheckID: this.txUiService.checkIdField(),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, checkCashTx, wallet, accountInfo, 'cash');

                    const result = await this.txExecutor.checkCash(checkCashTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeyAddress: this.txUiService.regularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    if (this.currencyFieldDropDownValue() !== 'XRP' && this.currencyFieldDropDownValue() !== 'MPT') {
                         this.onCurrencyChange(this.currencyFieldDropDownValue());
                    }

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Create cash successfully!' : 'Check cashed successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in createCheck:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async cancelCheck() {
          await this.withPerf('cancelCheck', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [accountInfo, currentLedger, fee] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplService.getLastLedgerIndex(client), this.xrplCache.getFee(this.xrplService, false)]);
                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: { accountInfo, fee, currentLedger },
                         cashCheck: { checkIdField: this.txUiService.checkIdField() },
                         regularKey: { isRegularKey: this.txUiService.isRegularKeyAddress(), address: this.txUiService.regularKeyAddress(), seed: this.txUiService.regularKeySeed() },
                    });

                    const errors = await this.validationService.validate('CancelCheck', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    let checkCancelTx: CheckCancel = {
                         TransactionType: 'CheckCancel',
                         Account: wallet.classicAddress,
                         CheckID: this.txUiService.checkIdField(),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, checkCancelTx, wallet, accountInfo, 'cancelCheck');

                    const result = await this.txExecutor.checkCancel(checkCancelTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeyAddress: this.txUiService.regularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    if (this.currencyFieldDropDownValue() !== 'XRP' && this.currencyFieldDropDownValue() !== 'MPT') {
                         this.onCurrencyChange(this.currencyFieldDropDownValue());
                    }

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Cancel check successfully!' : 'Check cancelled successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in cancelCheck:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private getExistingChecks(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Account === classicAddress)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';
                    let currency = '';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = sendMax.value;
                         currency = this.utilsService.normalizeCurrencyCode(sendMax.currency);
                    }

                    return {
                         id: obj.index,
                         index: obj.index,
                         amount: `${amount} ${currency}`,
                         destination: obj.Destination,
                         sendMax,
                         expiration: obj.Expiration,
                         destinationTag: obj.DestinationTag,
                         sourceTag: obj.SourceTag,
                         invoiceId: obj.InvoiceID,
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));
          this.existingChecks.set(mapped);
          this.utilsService.logObjects('existingChecks', mapped);
     }

     private getCashableChecks(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Destination === classicAddress)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';
                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }
                    return {
                         id: obj.index,
                         index: obj.index,
                         amount,
                         sender: obj.Account,
                         sendMax,
                    };
               })
               .sort((a, b) => a.sender.localeCompare(b.sender));
          this.cashableChecks.set(mapped);
          this.utilsService.logObjects('cashableChecks', mapped);
     }

     private getCancelableChecks(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Account === sender)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';

                    if (typeof sendMax === 'string') {
                         // XRP (drops)
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         // IOU
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }

                    return {
                         id: obj.index, // <-- CheckID
                         index: obj.index,
                         amount,
                         destination: obj.Destination,
                         sendMax,
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));
          this.cancellableChecks.set(mapped);
          this.utilsService.logObjects('cancellableChecks', mapped);
     }

     private getExistingMpts(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (escrowObjects.result.account_objects ?? [])
               .filter((obj: any) => (obj.LedgerEntryType === 'MPToken' || obj.LedgerEntryType === 'MPTokenIssuance') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
               .map((obj: any): MPToken => {
                    return {
                         LedgerEntryType: obj.LedgerEntryType,
                         MPTAmount: obj.MaximumAmount ? obj.MaximumAmount : obj.MPTAmount,
                         mpt_issuance_id: obj.mpt_issuance_id ? obj.mpt_issuance_id : obj.MPTokenIssuanceID,
                    };
               })
               .sort((a, b) => {
                    const ai = a.mpt_issuance_id ?? '';
                    const bi = b.mpt_issuance_id ?? '';
                    return ai.localeCompare(bi);
               });

          this.existingMpts.set(mapped);
          this.utilsService.logObjects('existingMpts', mapped);
     }

     private getExistingIOUs(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (accountObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'RippleState')
               .map((obj: any): RippleState => {
                    const balance = obj.Balance?.value ?? '0';
                    const currency = this.utilsService.normalizeCurrencyCode(obj.Balance?.currency);

                    // Determine if this account is the issuer or holder
                    const issuer = obj.HighLimit?.issuer === classicAddress ? obj.LowLimit?.issuer : obj.HighLimit?.issuer;

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

     get availableCurrencies(): string[] {
          return [
               'XRP',
               ...Object.keys(this.knownTrustLinesIssuers())
                    .filter(c => c && c !== 'XRP' && c !== 'MPT')
                    .sort((a, b) => a.localeCompare(b)),
          ];
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const key = `${this.currentWallet().seed}:${this.currentWallet().encryptionAlgorithm}`;
          if (this.walletCache.has(key)) {
               console.log('Using cached wallet for seed with key', key);
               return this.walletCache.get(key)!;
          }

          console.log('Creating wallet for seed with encryption algorithm', this.currentWallet().encryptionAlgorithm);
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');

          if (!wallet) throw new Error('Wallet could not be created');

          this.walletCache.set(key, wallet);
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, checkTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'create') {
               const expValue = this.expirationTimeField();
               if (expValue && expValue != '' && this.wantsExpiration()) {
                    if (expValue?.trim()) {
                         const checkExpiration = this.utilsService.toRippleTime(expValue);
                         // const checkExpiration = this.utilsService.addTime(Number.parseInt(this.expirationTimeField()), this.checkExpirationTime() as 'seconds' | 'minutes' | 'hours' | 'days').toString();
                         this.utilsService.setExpiration(checkTx, Number(checkExpiration));
                    }
               }

               if (this.txUiService.invoiceIdField()) {
                    this.utilsService.setInvoiceIdField(checkTx, this.txUiService.invoiceIdField());
               }

               if (this.txUiService.sourceTagField()) {
                    this.utilsService.setSourceTagField(checkTx, this.txUiService.sourceTagField());
               }

               if (this.txUiService.destinationTagField()) {
                    this.utilsService.setDestinationTag(checkTx, this.txUiService.destinationTagField());
               }
          }

          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(checkTx, ticket, true);
               }
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(checkTx, this.txUiService.memoField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          this.getExistingChecks(accountObjects, wallet.classicAddress);
          this.getCashableChecks(accountObjects, wallet.classicAddress);
          this.getCancelableChecks(accountObjects, wallet.classicAddress);
          this.getExistingMpts(accountObjects, wallet.classicAddress);
          this.getExistingIOUs(accountObjects, wallet.classicAddress);
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          this.addCustomDestination(addDest, destination);
          this.refreshUiState(wallet, accountInfo, accountObjects);
          this.txUiService.clearAllOptions();
     }

     private addCustomDestination(addDest: boolean, destination: string | null) {
          if (addDest && destination) {
               const addr = destination.trim();

               if (xrpl.isValidAddress(addr)) {
                    // Add to custom list if not already present
                    const exists = this.allDestinations().some(d => d.address === addr);
                    if (!exists) {
                         this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: addr }]);
                         this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
                         this.updateDestinations();
                    }

                    // Force select it (so next send starts with it pre-selected)
                    this.selectedDestinationAddress.set(addr);

                    // Clear typing state so display shows nice formatted name
                    this.destinationSearchQuery.set('');
               }
          }
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
          this.ensureDefaultNotSelected();
     }

     private readonly allDestinations = computed(() => {
          const wallets = this.wallets().map(w => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
               source: 'wallet' as const,
          }));

          return [...wallets, ...this.customDestinations()];
     });

     ensureDefaultNotSelected() {
          const currentAddress = this.currentWallet().address;
          if (currentAddress && this.destinations().length > 0) {
               if (!this.destinations() || this.destinationField() === currentAddress) {
                    const nonSelectedDest = this.destinations().find((d: { address: string }) => d.address !== currentAddress);
                    this.selectedDestinationAddress.set(nonSelectedDest ? nonSelectedDest.address : this.destinations()[0].address);
               }
          }
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.allDestinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
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
          this.wantsOptions.set(enabled);
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

     formatIOUXrpAmountUI(amount: any): string {
          if (!amount) return 'Unknown';

          if (typeof amount === 'string' && amount.split(' ').length === 1) {
               // XRP in drops
               return `${amount} XRP`;
          } else if (amount.split(' ').length === 2) {
               const splitAmount = amount.split(' ');
               return `${splitAmount[0]} ${splitAmount[1]}`;
          }

          if (typeof amount === 'object') {
               // Issued currency
               const { currency, issuer, value } = amount;
               return `${value} ${currency} (issuer: ${issuer})`;
          }

          return 'Unknown';
     }

     formatIOUXrpAmountOutstanding(amount: any): string {
          if (!amount) return 'Unknown';

          if (typeof amount === 'string' && /^[0-9]+$/.test(amount)) {
               return `${xrpl.dropsToXrp(amount)} XRP`;
          }

          if (typeof amount === 'object') {
               // Issued currency
               const { currency, value } = amount;
               return `${value} ${this.utilsService.decodeIfNeeded(currency)}`;
          }

          return `${amount} XRP`;
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

     private loadKnownIssuers() {
          const data = this.storageService.getKnownIssuers('knownIssuers');
          if (data) {
               this.knownTrustLinesIssuers.set(data);
               this.updateCurrencies();
          }
     }

     updateAmount(value: string | number) {
          let num = typeof value === 'string' ? Number.parseFloat(value) : value;

          if (Number.isNaN(num) || num < 0) {
               this.txUiService.amountField.set('');
               return;
          }

          // Round to 6 decimal places (XRP precision)
          const rounded = Number(num.toFixed(6));
          this.txUiService.amountField.set(rounded.toString());
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
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
          this.expirationTimeField.set('');
          this.checkExpirationTime.set('seconds');
          this.currencyFieldDropDownValue.set('XRP');
          this.selectedIssuer.set('');
          this.checkIdSearchQuery.set('');
          this.selectedDestinationAddress.set('');
          this.clearOptionalFields();
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearOptionalFields() {
          this.wantsOptions.set(false);
          this.wantsExpiration.set(false);
          this.txUiService.checkIdField.set('');
          this.txUiService.amountField.set('');
          this.txUiService.destinationTagField.set('');
          this.txUiService.invoiceIdField.set('');
          this.txUiService.sourceTagField.set('');
     }

     onCurrencyChange(currency: string) {
          this.trustlineCurrency.selectCurrency(currency, this.currentWallet().address);
          this.currencyChangeTrigger.update(n => n + 1); // ← forces dropdown reset
     }

     onIssuerChange(issuer: string) {
          this.trustlineCurrency.selectIssuer(issuer);
     }

     private refreshStoredIssuers() {
          const issuers: IssuerItem[] = [];
          const knownIssuers = this.knownTrustLinesIssuers();

          for (const currency in knownIssuers) {
               if (currency === 'XRP') continue;
               for (const address of knownIssuers[currency]) {
                    issuers.push({
                         name: currency,
                         address: address,
                    });
               }
          }
          // Optional: sort by currency
          issuers.sort((a: IssuerItem, b: IssuerItem) => a.name.localeCompare(b.name));
          this.storedIssuers.set(issuers);
     }

     private updateCurrencies() {
          // Get all currencies except XRP
          const allCurrencies = Object.keys(this.knownTrustLinesIssuers());
          const filtered = allCurrencies.filter(c => c !== 'XRP');
          // allCurrencies.push('MPT');

          // Sort alphabetically
          const sorted = filtered.sort((a, b) => a.localeCompare(b));
          this.currencies.set(sorted);

          // AUTO-SELECT FIRST CURRENCY — SAFE WAY
          if (sorted.length > 0) {
               // Only set if nothing is selected OR current selection is invalid/removed
               const shouldSelectFirst = !this.currencyFieldDropDownValue() || !sorted.includes(this.currencyFieldDropDownValue());

               if (shouldSelectFirst) {
                    this.currencyFieldDropDownValue.set(sorted[0]);
                    // Trigger issuer load — but do it in next tick so binding is ready
                    Promise.resolve().then(() => {
                         if (this.currencyFieldDropDownValue()) {
                              this.onCurrencyChange(this.currencyFieldDropDownValue());
                         }
                    });
               }
          } else {
               // No currencies left
               this.currencyFieldDropDownValue.set('');
               this.issuerFields.set('');
               this.issuers.set([]);
          }
     }

     getIssuerForCheck(checks: any[], checkIndex: string): string | null {
          const check = checks.find(c => c.index === checkIndex);
          return check?.SendMax?.issuer || null;
     }
}
