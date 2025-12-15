import { OnInit, Component, inject, computed, DestroyRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
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
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DestinationDropdownService, SelectItem } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

interface RippleState {
     LedgerEntryType: 'RippleState';
     Balance: { currency: string; value: string };
     HighLimit: { issuer: string };
}

interface MPToken {
     LedgerEntryType?: string;
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

@Component({
     selector: 'app-trustlines',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './trustlines.component.html',
     styleUrl: './trustlines.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlinesComponent extends PerformanceBaseComponent implements OnInit {
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
     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     checkIdSearchQuery = signal<string>('');

     // Reactive State (Signals)
     activeTab = signal<'setTrustline' | 'removeTrustline' | 'issueCurrency' | 'clawbackTokens' | 'addNewIssuers'>('setTrustline');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     amountField = signal<string>('');
     destinationField = signal<string>('');
     destinationTagField = signal<string>('');
     sourceTagField = signal<string>('');
     invoiceIdField = signal<string>('');
     currencyFieldDropDownValue = signal<string>('XRP');
     checkExpirationTime = signal<string>('seconds');
     issuerFields = signal<string>('');
     expirationTimeField = signal<string>('');
     ticketSequence = signal<string>('');
     checkIdField = signal<string>('');
     outstandingChecks = signal<string>('');
     mptIssuanceIdField = signal<string>('');
     isMptEnabled = signal(false);
     currencyBalanceField = signal<string>('0');
     gatewayBalance = signal<string>('0');
     issuerToRemove = signal<string>('');
     currencies = signal<string[]>([]);
     userAddedCurrencyFieldDropDownValue = signal<string[]>([]);
     userAddedissuerFields = signal<string>('');
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
     outstandingChecksCollapsed = signal<boolean>(true);
     currencyChangeTrigger = signal(0);

     showTrustlineOptions = signal<boolean>(false);
     existingMptsCollapsed = signal<boolean>(true);
     outstandingIOUCollapsed = signal<boolean>(true);

     trustlineFlags: Record<string, boolean> = { ...AppConstants.TRUSTLINE.FLAGS };
     trustlineFlagList = AppConstants.TRUSTLINE.FLAG_LIST;
     flagMap = AppConstants.TRUSTLINE.FLAG_MAP;
     ledgerFlagMap = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;
     accountTrustlines = signal<any[]>([]);
     existingMpts = signal<any[]>([]);
     existingIOUs = signal<any[]>([]);

     flags = {
          tfSetfAuth: false,
          tfSetNoRipple: false,
          tfClearNoRipple: false,
          tfSetFreeze: false,
          tfClearFreeze: false,
          tfSetDeepFreeze: false,
          tfClearDeepFreeze: false,
     };
     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');

     private flagValues = {
          tfSetfAuth: 0x00010000,
          tfSetNoRipple: 0x00020000,
          tfClearNoRipple: 0x00040000,
          tfSetFreeze: 0x00100000,
          tfClearFreeze: 0x00200000,
          tfSetDeepFreeze: 0x00400000,
          tfClearDeepFreeze: 0x00800000,
     };

     selectedDestinationItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;
          return this.destinationItems().find(d => d.id === addr) || null;
     });

     destinationItems = computed(() => {
          const currentAddr = this.currentWallet().address;

          return this.destinations().map(d => ({
               id: d.address,
               display: d.name || 'Unknown Wallet',
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
               isCurrentCode: curr === currentCode, // This one!
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

     destinationDisplay = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return this.destinationSearchQuery(); // while typing → show typed text

          const dest = this.destinations().find(d => d.address === addr);
          if (!dest) return addr;

          return this.dropdownService.formatDisplay(dest);
     });

     filteredDestinations = computed(() => {
          const q = this.destinationSearchQuery().trim().toLowerCase();
          const list = this.destinations();

          if (q === '') {
               return list;
          }

          return this.destinations()
               .filter(d => d.address !== this.currentWallet().address)
               .filter(d => d.address.toLowerCase().includes(q) || (d.name ?? '').toLowerCase().includes(q));
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
          const baseUrl = this.txUiService.explorerUrl();
          const address = wallet.address;

          // Just count — NO heavy mapping!
          const allTrustlines = this.existingIOUs();
          const count = allTrustlines.length;

          // Super lightweight links
          const links = count > 0 ? `<a href="${baseUrl}account/${address}/tokens" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View tokens</a>` : '';

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
                                     .replace(/([A-Z])/g, ' $1')
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

     hasWallets = computed(() => this.wallets().length > 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.currencyFieldDropDownValue.set('XRP');

          // Subscribe once
          this.trustlineCurrency.currencies$.subscribe(currencies => {
               this.currencies.set(currencies);
               if (currencies.length > 0 && !this.currencyFieldDropDownValue()) {
                    this.currencyFieldDropDownValue.set(currencies[0]);
                    this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue(), this.currentWallet().address);
               }
          });

          this.trustlineCurrency.issuers$.subscribe(issuers => {
               this.issuers.set(issuers);
          });

          this.trustlineCurrency.selectedIssuer$.subscribe(issuer => {
               this.issuerFields.set(issuer);
          });

          this.trustlineCurrency.balance$.subscribe(balance => {
               this.currencyBalanceField.set(balance); // ← This is your live balance!
          });
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
                    if (wallet) {
                         this.clearFields(true);
                         this.selectWallet(wallet);
                    }
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.clearFields(true);
                    await this.getTrustlinesForAccount(false);
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

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     toggleExistingMpts() {
          this.existingMptsCollapsed.set(!this.existingMptsCollapsed());
     }

     toggleOutstandingIOU() {
          this.outstandingIOUCollapsed.set(!this.outstandingIOUCollapsed());
     }

     onFlagChange(flag: string) {
          if (this.trustlineFlags[flag]) {
               AppConstants.TRUSTLINE.CONFLICTS[flag]?.forEach((conflict: string | number) => {
                    this.trustlineFlags[conflict] = false;
               });
          }
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(v => !v);
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
                         const client = await this.xrplService.getClient();
                         const accountObjects = await this.xrplService.getAccountObjects(client, this.currentWallet().address, 'validated', '');
                         this.setRemoveFlagsBasedOnExistingTrustline(accountObjects);
                    } catch (err) {
                         // Fallback: enable both (safe default)
                         this.flags.tfClearNoRipple = true;
                         this.flags.tfClearFreeze = true;
                         this.flags.tfClearDeepFreeze = false;
                         this.updateFlagTotal();
                    }
               }
          } else {
               // Leaving remove tab → reset remove-specific flags
               this.flags.tfClearNoRipple = false;
               this.flags.tfClearFreeze = false;
               this.flags.tfClearDeepFreeze = false;
               this.updateFlagTotal();
          }

          if (this.activeTab() === 'removeTrustline') {
               this.amountField.set('0');
          }

          this.clearFields(true);
          if (this.hasWallets()) {
               await this.getTrustlinesForAccount(true);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getTrustlinesForAccount(forceRefresh = false): Promise<void> {
          await this.withPerf('getChecks', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.getExistingMpts(accountObjects, wallet.classicAddress);
                    this.getExistingIOUs(accountObjects, wallet.classicAddress);

                    if (this.currencyFieldDropDownValue() !== 'XRP' && this.currencyFieldDropDownValue() !== 'MPT' && this.issuerFields() !== '') {
                         this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue(), this.currentWallet().address);
                    }

                    this.refreshUiState(wallet, accountInfo, accountObjects);
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
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, accountLines, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, null);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
                    // this.utilsService.logObjects(`accountLines`, accountLines);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validationService.validate('TrustSet', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    if (this.trustlineFlags['tfSetNoRipple'] && this.trustlineFlags['tfClearNoRipple']) {
                         return this.txUiService.setError('ERROR: Cannot set both tfSetNoRipple and tfClearNoRipple');
                    }
                    if (this.trustlineFlags['tfSetFreeze'] && this.trustlineFlags['tfClearFreeze']) {
                         return this.txUiService.setError('ERROR: Cannot set both tfSetFreeze and tfClearFreeze');
                    }

                    let currencyFieldTemp = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue());
                    if (!/^[A-Z0-9]{3}$|^[0-9A-Fa-f]{40}$/.test(currencyFieldTemp)) {
                         throw new Error('Invalid currency code. Must be a 3-character code (e.g., USDC) or 40-character hex.');
                    }

                    // Calculate flags
                    // let flags = 0;
                    // Object.entries(this.trustlineFlags).forEach(([key, value]) => {
                    //      if (value) {
                    //           flags |= AppConstants.TRUSTLINE.FLAG_MAP[key as keyof typeof AppConstants.TRUSTLINE.FLAG_MAP];
                    //      }
                    // });

                    let trustSetTx: xrpl.TrustSet = {
                         TransactionType: 'TrustSet',
                         Account: wallet.classicAddress,
                         LimitAmount: {
                              currency: currencyFieldTemp,
                              issuer: this.issuerFields(),
                              value: this.amountField(),
                         },
                         // Flags: flags,
                         Flags: this.totalFlagsValue(),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, trustSetTx, wallet, accountInfo);

                    const result = await this.txExecutor.setTrustline(trustSetTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Trustline set successfully!' : 'Trustline set successfully!';
                    this.onCurrencyChange(this.currencyFieldDropDownValue());
                    await this.refreshAfterTx(client, wallet, null, false);
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
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, serverInfo, fee, currentLedger] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client)]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, null);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validationService.validate('RemoveTrustline', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    if (this.trustlineFlags['tfSetNoRipple'] && this.trustlineFlags['tfClearNoRipple']) {
                         return this.txUiService.setError('ERROR: Cannot set both tfSetNoRipple and tfClearNoRipple');
                    }
                    if (this.trustlineFlags['tfSetFreeze'] && this.trustlineFlags['tfClearFreeze']) {
                         return this.txUiService.setError('ERROR: Cannot set both tfSetFreeze and tfClearFreeze');
                    }

                    const trustLines = await this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', '');
                    this.utilsService.logObjects('trustLines', trustLines);

                    const trustLine = trustLines.result.lines.find((line: any) => {
                         const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
                         return line.account === this.issuerFields && lineCurrency === this.currencyFieldDropDownValue();
                    });

                    if (!trustLine) {
                         this.txUiService.setError(`No trust line found for ${this.currencyFieldDropDownValue()} to issuer ${this.issuerFields}`);
                         return;
                    }

                    const check = this.canRemoveTrustline(trustLine);
                    if (!check.canRemove) {
                         return this.txUiService.setError(`Cannot remove trustline ${trustLine.currency}/${trustLine.account}: ${check.reasons}`);
                    }

                    let currencyFieldTemp = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue());

                    const trustSetTx: xrpl.TrustSet = {
                         TransactionType: 'TrustSet',
                         Account: wallet.classicAddress,
                         LimitAmount: {
                              currency: currencyFieldTemp,
                              issuer: this.issuerFields(),
                              value: '0',
                         },
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    // trustSetTx.Flags = xrpl.TrustSetFlags.tfClearNoRipple | xrpl.TrustSetFlags.tfClearFreeze;
                    trustSetTx.Flags = this.totalFlagsValue();

                    await this.setTxOptionalFields(client, trustSetTx, wallet, accountInfo);

                    const result = await this.txExecutor.removeTrustline(trustSetTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Trustline removal successfully!' : 'Trustline removed successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in removeTrustline:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async issueCurrency() {
          await this.withPerf('issueCurrency', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    let [accountInfo, fee, lastLedgerIndex, trustLines, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    // const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();
                    const destinationAddress = this.selectedDestinationAddress() || this.typedDestination();

                    // this.utilsService.logAccountInfoObjects(accountInfo, null);
                    // this.utilsService.logLedgerObjects(fee, lastLedgerIndex, serverInfo);
                    // this.utilsService.logObjects('trustLines', trustLines);

                    // const errors = await this.validationService.validate('IssueCurrency', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    // const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    // const accountFlags = accountInfo.result.account_data.Flags;
                    // const asfDefaultRipple = 0x00800000;

                    // if ((accountFlags & asfDefaultRipple) === 0) {
                    //      // Need to enable DefaultRipple first
                    //      const accountSetTx: xrpl.AccountSet = {
                    //           TransactionType: 'AccountSet',
                    //           Account: wallet.classicAddress,
                    //           SetFlag: 8, // asfDefaultRipple
                    //           Fee: fee,
                    //           LastLedgerSequence: lastLedgerIndex + AppConstants.LAST_LEDGER_ADD_TIME,
                    //      };

                    //      await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);

                    //      if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
                    //           return this.txUiService.setError('Insufficient XRP to complete transaction');
                    //      }

                    //      // this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? 'Simulating Set Default Ripple (no changes will be made)...' : 'Submitting Set Default Ripple to Ledger...', 200);

                    //      // this.txUiService.paymentTx.push(accountSetTx);
                    //      // this.updatePaymentTx();

                    //      let response: any;

                    //      if (this.txUiService.isSimulateEnabled()) {
                    //           response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
                    //      } else {
                    //           const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    //           if (!signedTx) {
                    //                return this.txUiService.setError('ERROR: Failed to sign AccountSet transaction.');
                    //           }

                    //           const response = await this.xrplTransactions.submitTransaction(client, signedTx);

                    //           // this.utilsService.logObjects('response', response);
                    //           // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    //            this.txUiService.setTxResult(response.result);
                    // this.updateTxResult();

                    //           const isSuccess = this.utilsService.isTxSuccessful(response);
                    //           if (!isSuccess) {
                    //                const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    //                const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    //                console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    //                (response.result as any).errorMessage = userMessage;
                    //                return this.txUiService.setError(userMessage);
                    //                return;
                    //           }
                    //      }
                    //      // Update lastLedgerIndex for next transaction
                    //      lastLedgerIndex = await this.xrplService.getLastLedgerIndex(client);
                    // }

                    // PHASE 4: Prepare Payment transaction for currency issuance
                    const curr = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue());
                    const paymentTx: xrpl.Payment = {
                         TransactionType: 'Payment',
                         Account: wallet.classicAddress,
                         Destination: destinationAddress,
                         Amount: {
                              currency: curr,
                              value: this.amountField(),
                              issuer: this.issuerFields(),
                         },
                         Fee: fee,
                         LastLedgerSequence: lastLedgerIndex + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, paymentTx, wallet, accountInfo);

                    const result = await this.txExecutor.issueCurrency(paymentTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Issued currency successfully!' : 'Simulated Issued currency successfully!';
                    this.onCurrencyChange(this.currencyFieldDropDownValue());
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in issueCurrency:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async clawbackTokens() {
          await this.withPerf('clawbackTokens', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    // const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();
                    const destinationAddress = this.selectedDestinationAddress() || this.typedDestination();
                    const [accountInfo, accountObjects, trustLines, serverInfo, fee, currentLedger] = await Promise.all([
                         this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                         this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
                         this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''),
                         this.xrplService.getXrplServerInfo(client, 'current', ''),
                         this.xrplService.calculateTransactionFee(client),
                         this.xrplService.getLastLedgerIndex(client),
                    ]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
                    // this.utilsService.logObjects('trustLines', trustLines);

                    // const errors = await this.validationService.validate('ClawbackTokens', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    const currencyFieldTemp = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue());
                    if (!/^[A-Z0-9]{3}$|^[0-9A-Fa-f]{40}$/.test(currencyFieldTemp)) {
                         throw new Error('Invalid currency code. Must be a 3-character code (e.g., USDC) or 40-character hex.');
                    }

                    let clawbackTx: xrpl.Clawback = {
                         TransactionType: 'Clawback',
                         Account: wallet.classicAddress,
                         Amount: {
                              currency: currencyFieldTemp,
                              issuer: destinationAddress,
                              value: this.amountField(),
                         },
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, clawbackTx, wallet, accountInfo);

                    const result = await this.txExecutor.clawbackTokens(clawbackTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Clawback tokens successfully!' : 'Simulated Escrow cancel successfully!';
                    this.onCurrencyChange(this.currencyFieldDropDownValue());
                    await this.refreshAfterTx(client, wallet, null, false);

                    // if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, clawbackTx, fee)) {
                    //      return this.txUiService.setError('Insufficient XRP to complete transaction');
                    // }

                    // if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, clawbackTx, resolvedDestination)) {
                    //      return this.txUiService.setError('ERROR: Not enough IOU balance for this transaction');
                    // }
               } catch (error: any) {
                    console.error('Error in clawbackTokens:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private getExistingMpts(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          // this.existingMpts
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => {
                    if (obj.LedgerEntryType !== 'MPToken') return true;
                    const amount = obj.MPTAmount || obj.OutstandingAmount || '0';
                    return parseFloat(amount) > 0;
               })
               .filter((obj: any) => (obj.LedgerEntryType === 'MPTokenIssuance' || obj.LedgerEntryType === 'MPToken') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
               .map((obj: any) => {
                    return {
                         LedgerEntryType: obj.LedgerEntryType,
                         id: obj.index,
                         mpt_issuance_id: obj.mpt_issuance_id,
                         TransferFee: obj.TransferFee,
                         OutstandingAmount: obj.OutstandingAmount,
                         MaximumAmount: obj.MaximumAmount,
                         MPTokenMetadata: obj.MPTokenMetadata,
                         Issuer: obj.Issuer,
                         Flags: obj.Flags,
                         AssetScale: obj.AssetScale,
                    };
               })
               .sort((a, b) => {
                    const seqA = (a as any).Sequence ?? Number.MAX_SAFE_INTEGER;
                    const seqB = (b as any).Sequence ?? Number.MAX_SAFE_INTEGER;
                    return seqA - seqB;
               });
          this.existingIOUs.set(mapped);
          this.utilsService.logObjects('existingMpts - filtered', mapped);
     }

     private getExistingIOUs(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          // this.existingIOUs
          const mapped = (accountObjects.result.account_objects ?? [])
               .filter((obj: any): obj is xrpl.LedgerEntry.RippleState => {
                    if (obj.LedgerEntryType !== 'RippleState') return false;

                    const balanceValue = obj.Balance?.value ?? '0';
                    const myLimit = obj.LowLimit?.issuer === classicAddress ? obj.LowLimit?.value : obj.HighLimit?.value;

                    const peerLimit = obj.LowLimit?.issuer === classicAddress ? obj.HighLimit?.value : obj.LowLimit?.value;

                    // Hide if:
                    // 1. Balance is exactly zero
                    // 2. AND both sides have zero limit (i.e. user "removed" it)
                    const balanceIsZero = parseFloat(balanceValue) === 0;
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
               .sort((a, b) => a.HighLimit.issuer.localeCompare(b.HighLimit.issuer));
          this.existingIOUs.set(mapped);
          this.utilsService.logObjects('existingIOUs - filtered', mapped);
     }

     get availableCurrencies(): string[] {
          return this.trustlineCurrency.getCurrencies(); // or subscribe to currencies$
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, trustSetTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(trustSetTx, ticket, true);
               }
          }

          if (this.destinationTagField() && Number.parseInt(this.destinationTagField()) > 0) {
               this.utilsService.setDestinationTag(trustSetTx, this.destinationTagField());
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(trustSetTx, this.txUiService.memoField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          this.getExistingIOUs(accountObjects, wallet.classicAddress);
          this.getExistingMpts(accountObjects, wallet.classicAddress);
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest) this.addNewDestinationFromUser(destination || '');
          this.refreshUiState(wallet, accountInfo, accountObjects);
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

     private updateTrustLineFlagsInUI(accountObjects: xrpl.AccountObjectsResponse, wallet: xrpl.Wallet) {
          // Start clean
          Object.keys(this.flags).forEach(k => (this.flags[k as keyof typeof this.flags] = false));

          const encoded = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue());
          const walletAddr = wallet.classicAddress || wallet.address;

          const state = accountObjects.result.account_objects.find((obj): obj is xrpl.LedgerEntry.RippleState => {
               return obj.LedgerEntryType === 'RippleState' && obj.Balance?.currency === encoded && (obj.LowLimit?.issuer === walletAddr || obj.HighLimit?.issuer === walletAddr) && (obj.LowLimit?.issuer === this.issuerFields() || obj.HighLimit?.issuer === this.issuerFields());
          });

          if (!state) {
               if (this.activeTab() !== 'removeTrustline') this.clearFlagsValue();
               return;
          }

          const flags = state.Flags ?? 0;
          const isLowSide = state.LowLimit?.issuer === walletAddr;
          const map = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

          if (this.activeTab() === 'removeTrustline') {
               // ONLY enable the flags that are actually blocking removal
               if (flags & map.lsfNoRipple) this.flags.tfClearNoRipple = true;
               if (isLowSide ? flags & map.lsfLowFreeze : flags & map.lsfHighFreeze) this.flags.tfClearFreeze = true;
               // tfSetfAuth is almost never required for removal → keep false
          } else {
               // Normal "Set Trustline" tab → show current state
               this.flags.tfSetfAuth = isLowSide ? !!(flags & map.lsfLowAuth) : !!(flags & map.lsfHighAuth);
               this.flags.tfSetNoRipple = !!(flags & map.lsfNoRipple);
               this.flags.tfSetFreeze = isLowSide ? !!(flags & map.lsfLowFreeze) : !!(flags & map.lsfHighFreeze);
          }

          this.updateFlagTotal();
     }

     private setRemoveFlagsBasedOnExistingTrustline(accountObjects: xrpl.AccountObjectsResponse) {
          // Reset everything that can block removal
          this.flags.tfClearNoRipple = false;
          this.flags.tfClearFreeze = false;
          this.flags.tfClearDeepFreeze = false;
          this.flags.tfSetfAuth = false; // ← This was your bug!

          if (!this.currencyFieldDropDownValue() || !this.issuerFields || !this.currentWallet().address) return;

          const encoded = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue());
          const walletAddr = this.currentWallet().classicAddress || this.currentWallet().address;

          const state = accountObjects.result.account_objects.find((obj): obj is xrpl.LedgerEntry.RippleState => {
               return obj.LedgerEntryType === 'RippleState' && obj.Balance?.currency === encoded && (obj.LowLimit?.issuer === walletAddr || obj.HighLimit?.issuer === walletAddr) && (obj.LowLimit?.issuer === this.issuerFields() || obj.HighLimit?.issuer === this.issuerFields());
          });

          if (!state) return;

          const flags = state.Flags ?? 0;
          const isLowSide = state.LowLimit?.issuer === walletAddr;
          const map = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

          // Only turn on the clear flags if they are actually set
          if (flags & map.lsfNoRipple) this.flags.tfClearNoRipple = true;
          if (isLowSide ? flags & map.lsfLowFreeze : flags & map.lsfHighFreeze) this.flags.tfClearFreeze = true;

          // tfSetfAuth is almost never needed for removal — only if the *other* side authorized you
          // In 99.9% of cases (including yours) it should stay OFF
          // → So we deliberately DO NOT touch it here
          this.updateFlagTotal();
     }

     toggleFlag(key: 'tfSetfAuth' | 'tfSetNoRipple' | 'tfClearNoRipple' | 'tfSetFreeze' | 'tfClearFreeze' | 'tfSetDeepFreeze' | 'tfClearDeepFreeze') {
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          if (this.flags.tfSetfAuth) sum |= this.flagValues.tfSetfAuth;
          if (this.flags.tfSetNoRipple) sum |= this.flagValues.tfSetNoRipple;
          if (this.flags.tfClearNoRipple) sum |= this.flagValues.tfClearNoRipple;
          if (this.flags.tfSetFreeze) sum |= this.flagValues.tfSetFreeze;
          if (this.flags.tfClearFreeze) sum |= this.flagValues.tfClearFreeze;
          if (this.flags.tfSetDeepFreeze) sum |= this.flagValues.tfSetDeepFreeze;
          if (this.flags.tfClearDeepFreeze) sum |= this.flagValues.tfClearDeepFreeze;

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     clearFlagsValue() {
          if (this.activeTab() !== 'removeTrustline') {
               this.flags = {
                    tfSetfAuth: false,
                    tfSetNoRipple: false,
                    tfClearNoRipple: false,
                    tfSetFreeze: false,
                    tfClearFreeze: false,
                    tfSetDeepFreeze: false,
                    tfClearDeepFreeze: false,
               };
               this.totalFlagsValue.set(0);
               this.totalFlagsHex.set('0x0');
          }
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.amountField.set('');
               this.destinationTagField.set('');
               this.newCurrency.set('');
               this.newIssuer.set('');
               this.clearFlagsValue();
          }
          this.typedDestination.set('');
          this.selectedDestinationAddress.set('');
          this.ticketSequence.set('');
     }

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
     }

     copyMptId(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.txUiService.showToastMessage('MPT Issuance ID copied!');
          });
     }

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Check ID copied!');
          });
     }

     copyIOUIssuanceAddress(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.txUiService.showToastMessage('IOU Token Issuer copied!');
          });
     }

     private updateInfoMessage() {
          const tabDescriptions: Record<string, string> = {
               setTrustline: 'trustline that can be set',
               removeTrustline: 'trustline that can be removed',
               issueCurrency: 'trustline that can be used to issue currencies',
               clawbackTokens: 'trustline that supports clawback',
          };

          const count = this.existingIOUs.length;
          const description = tabDescriptions[this.activeTab()] || 'trustline';

          const walletName = this.currentWallet.name || 'selected';

          let message: string;

          if (count === 0) {
               message = `<code>${walletName}</code> wallet has no ${description}.`;
          } else {
               const trustlineWord = count === 1 ? 'trustline' : 'trustlines';
               message = `<code>${walletName}</code> wallet has <strong>${count}</strong> ${trustlineWord}${description.includes('trustline') ? '' : ` ${description}`}.`;

               // Add link to view tokens
               const link = `${this.txUiService.explorerUrl}account/${this.currentWallet().address}/tokens`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View tokens on XRPL Win</a>`;
          }

          this.txUiService.setInfoMessage(message);
     }

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

     onCurrencyChange(currency: string) {
          this.trustlineCurrency.selectCurrency(currency, this.currentWallet().address);
          this.currencyChangeTrigger.update(n => n + 1); // ← forces dropdown reset
     }

     onIssuerChange(issuer: string) {
          this.trustlineCurrency.selectIssuer(issuer);
     }

     // Validate inputs before adding
     public isAddValid(): boolean {
          const currency = this.newCurrency()?.trim();
          const issuer = this.newIssuer()?.trim();

          if (!currency || !issuer) return false;
          if (!this.utilsService.isValidCurrencyCode(currency)) return false;
          if (!xrpl.isValidAddress(issuer)) return false;

          // Optional: prevent duplicates
          const existing = this.trustlineCurrency.getIssuersForCurrency(currency);
          return !existing.includes(issuer);
     }

     // Validate before removing
     public isRemoveValid(): boolean {
          const currency = this.currencyFieldDropDownValue();
          const issuer = this.trustlineCurrency.getSelectedIssuer(); // or this.selectedIssuerAddress()

          return !!currency && currency !== 'XRP' && !!issuer;
     }

     // Wrapper methods with proper feedback
     addNewCurrencyIssuer(): void {
          const currency = this.newCurrency()?.trim();
          const issuer = this.newIssuer()?.trim();

          if (!this.isAddValid()) {
               this.txUiService.setError('Invalid currency code or issuer address, or already exists');
               return;
          }

          this.trustlineCurrency.addToken(currency, issuer);

          // Optional: auto-select the newly added currency
          this.currencyFieldDropDownValue.set(currency);
          this.onCurrencyChange(currency);

          // Clear inputs
          this.newCurrency.set('');
          this.newIssuer.set('');

          this.toastService.success('Currency/Issuer added successfully');
     }

     removeCurrentCurrencyIssuer(): void {
          const currency = this.currencyFieldDropDownValue();
          const issuer = this.trustlineCurrency.getSelectedIssuer();

          if (!this.isRemoveValid()) {
               this.txUiService.setError('No valid currency or issuer selected to remove');
               return;
          }

          this.trustlineCurrency.removeToken(currency, issuer);

          this.toastService.success('Currency/Issuer removed successfully');

          // If we removed the last issuer for this currency, switch to next available
          const remainingIssuers = this.trustlineCurrency.getIssuersForCurrency(currency);
          if (remainingIssuers.length === 0) {
               const available = this.trustlineCurrency.getCurrencies();
               if (available.length > 0) {
                    this.currencyFieldDropDownValue.set(available[0]);
                    this.onCurrencyChange(available[0]);
               } else {
                    this.currencyFieldDropDownValue.set('');
               }
          }
     }

     private canRemoveTrustline(line: any): { canRemove: boolean; reasons: string[] } {
          const reasons: string[] = [];

          if (parseFloat(line.balance) !== 0) {
               reasons.push(`Balance is ${line.balance} (must be 0)`);
          }

          // if (line.no_ripple && !this.trustlineFlags['tfClearNoRipple']) {
          if (line.no_ripple && !this.flags.tfClearNoRipple) {
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
