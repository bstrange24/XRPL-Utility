import { Component, OnInit, ElementRef, ViewChild, inject, TemplateRef, ViewContainerRef, computed, DestroyRef, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
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

@Component({
     selector: 'app-checks',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './checks.component.html',
     styleUrl: './checks.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendChecksComponent extends PerformanceBaseComponent implements OnInit {
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('unifiedCheckDropdownTemplate') unifiedCheckDropdownTemplate!: TemplateRef<any>;
     @ViewChild('checkInput') checkInput!: ElementRef<HTMLInputElement>;

     private readonly destroyRef = inject(DestroyRef);
     private readonly overlay = inject(Overlay);
     private readonly viewContainerRef = inject(ViewContainerRef);
     private overlayRef: OverlayRef | null = null;

     // Services
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     private readonly walletManagerService = inject(WalletManagerService);
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
     highlightedIndex = signal<number>(-1);
     highlightedCredentialIdIndex = signal<number>(-1);
     // Check ID Dropdown State
     checkIdSearchQuery = signal<string>('');
     highlightedCheckIdIndex = signal<number>(-1);
     private checkIdOverlayRef: OverlayRef | null = null;

     // Reactive State (Signals)
     activeTab = signal<'create' | 'cash' | 'cancel'>('create');
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
     private knownTrustLinesIssuers = signal<{ [key: string]: string[] }>({ XRP: [] });
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
     issuers: { name?: string; address: string }[] = [];
     lastCurrency = signal<string>('');
     lastIssuer = signal<string>('');
     cancellableChecks = signal<any[]>([]);
     cashableChecks = signal<any[]>([]);
     existingChecks = signal<any[]>([]);
     outstandingChecksCollapsed = signal(true);
     editingIndex!: (index: number) => boolean;
     tempName = signal<string>('');
     filterQuery = signal<string>('');
     // isLoadingChecks = signal(false);

     // Add these computed signals
     // isAmountValid = computed(() => {
     //      const val = this.amountField().trim();
     //      if (!val) return false;
     //      const num = parseFloat(val);
     //      return !isNaN(num) && num > 0;
     // });

     // isDestinationValid = computed(() => {
     //      const addr = this.selectedDestinationAddress() || this.destinationSearchQuery().trim();
     //      return xrpl.isValidAddress(addr);
     // });

     // isCheckIdValid = computed(() => {
     //      return this.checkIdField().length === 64 && /^[A-F0-9]{64}$/i.test(this.checkIdField());
     // });

     // canCreateCheck = computed(() => this.isAmountValid() && this.isDestinationValid() && this.currentWallet().address);

     // canCashCheck = computed(() => this.isAmountValid() && this.isCheckIdValid() && this.checkIdField());

     // canCancelCheck = computed(() => this.isCheckIdValid() && this.checkIdField());

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

     checkIdDisplay = computed(() => {
          const id = this.checkIdField();
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

     // Add this computed signal in your SendChecksComponent class
     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) {
               return null;
          }

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
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

          return {
               walletName,
               checkCount,
               checksToShow,
          };
     });

     hasWallets = computed(() => this.wallets().length > 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.loadKnownIssuers();
          this.refreshStoredIssuers();
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.setupDropdownSubscriptions();
          // this.populateDefaultDateTime();

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
               this.issuers = issuers;
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
                    await this.getChecks(false);
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          // Prevent self as destination
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.selectedDestinationAddress(), this.destinations())?.address || this.selectedDestinationAddress();
          if (currentDest === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     private setupDropdownSubscriptions(): void {
          this.dropdownService.isOpen$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(open => (open ? this.openDropdownInternal() : this.closeDropdownInternal()));
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

          if (Object.keys(this.knownTrustLinesIssuers).length > 0 && this.issuerFields() === '') {
               this.currencyFieldDropDownValue.set(Object.keys(this.knownTrustLinesIssuers)[0]);
          }

          this.clearFields(true);
          await this.getChecks(true);
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getChecks(forceRefresh = false): Promise<void> {
          await this.withPerf('getChecks', async () => {
               // this.isLoadingChecks.set(true);
               this.txUiService.clearAllOptionsAndMessages();
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

                    if (this.currencyFieldDropDownValue() !== 'XRP' && this.currencyFieldDropDownValue() !== 'MPT' && this.issuerFields() !== '') {
                         this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue(), this.currentWallet().address);
                    }

                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getChecks:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    // this.isLoadingChecks.set(false);
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createCheck() {
          await this.withPerf('createCheck', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, checkObjects, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getAccountObjectsWithType(this.currentWallet().address, true, 'check'), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();
                    const [destinationAccountInfo] = await Promise.all([this.xrplService.getAccountInfo(client, destinationAddress, 'validated', '')]);
                    // const errors = await this.validationService.validate('CreateCheck', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    if (destinationAccountInfo.result.account_flags.disallowIncomingCheck) {
                         return this.txUiService.setError(`Error:\nDestination ${destinationAddress} has disallowIncomingCheck enabled. This wallet can not recieve checks.`);
                    }

                    // Build SendMax amount
                    const curr: xrpl.MPTAmount = {
                         mpt_issuance_id: this.mptIssuanceIdField(),
                         value: this.amountField(),
                    };

                    let sendMax;
                    if (this.currencyFieldDropDownValue() === AppConstants.XRP_CURRENCY) {
                         // if (this.isMptEnabled) {
                         // sendMax = curr;
                         // } else {
                         sendMax = xrpl.xrpToDrops(this.amountField());
                         // }
                    } else {
                         sendMax = {
                              currency: this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue()),
                              value: this.amountField(),
                              issuer: this.issuerFields(),
                         };
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
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    // if (this.currencyFieldDropDownValue() === AppConstants.XRP_CURRENCY) {
                    //      if (this.amountField() || this.amountField() === '') {
                    //           if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, checkCreateTx, fee)) {
                    //                return this.txUiService.setError('Insufficient XRP to complete transaction');
                    //           }
                    //      } else {
                    //           if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField(), wallet.classicAddress, checkCreateTx, fee)) {
                    //                return this.txUiService.setError('Insufficient XRP to complete transaction');
                    //           }
                    //      }
                    // } else if (this.currencyFieldDropDownValue() !== 'MPT') {
                    //      if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, checkCreateTx, destinationAddress)) {
                    //           return this.txExecutor.setError('ERROR: Not enough IOU balance for this transaction');
                    //      }
                    // }

                    if (this.currencyFieldDropDownValue() !== 'XRP' && this.currencyFieldDropDownValue() !== 'MPT') {
                         // await this.updateCurrencyBalance(gatewayBalances, wallet);
                         this.onCurrencyChange(this.currencyFieldDropDownValue());
                    }

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Create check successfully!' : 'Check created successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
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
                    const [{ accountInfo, accountObjects }, trustLines, checkObjects, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplCache.getAccountObjectsWithType(this.currentWallet().address, true, 'check'), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    // const errors = await this.validationService.validate('CashCheck', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    const checkObject = await this.xrplService.getCheckByCheckId(client, this.checkIdField(), 'validated');
                    if (checkObject) {
                         console.log('checkObject: ', checkObject);
                         if (checkObject.Expiration) {
                              const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
                              if (currentRippleTime >= checkObject.Expiration) {
                                   return this.txUiService.setError(`Transaction or object has expired.`);
                              }
                         }
                    } else {
                         return this.txUiService.setError(`No check found with Check ID ${this.checkIdField}`);
                    }

                    if (this.currencyFieldDropDownValue() !== AppConstants.XRP_CURRENCY) {
                         console.debug(`checkObjects for ${wallet.classicAddress}:`, checkObjects.result);
                         const issuer = this.getIssuerForCheck(checkObjects.result.account_objects, this.checkIdField());
                         console.log('Issuer:', issuer);
                         if (issuer) {
                              this.selectedIssuer.set(issuer);
                         }
                    }

                    // Build amount object depending on currency
                    const amountToCash =
                         this.currencyFieldDropDownValue() === AppConstants.XRP_CURRENCY
                              ? xrpl.xrpToDrops(this.amountField())
                              : {
                                     value: this.amountField(),
                                     currency: this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue()),
                                     issuer: this.selectedIssuer(),
                                };

                    let checkCashTx: CheckCash = {
                         TransactionType: 'CheckCash',
                         Account: wallet.classicAddress,
                         Amount: amountToCash,
                         CheckID: this.checkIdField(),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    if (this.currencyFieldDropDownValue() !== 'MPT') {
                         if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, checkCashTx, this.issuerFields())) {
                              return this.txUiService.setError('ERROR: Not enough IOU balance for this transaction');
                         }
                    }

                    await this.setTxOptionalFields(client, checkCashTx, wallet, accountInfo, 'cash');

                    const result = await this.txExecutor.checkCash(checkCashTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
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
                    // this.resetCheckIdDropDown();
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
                    const [{ accountInfo, accountObjects }, currentLedger, fee] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getLastLedgerIndex(client), this.xrplCache.getFee(this.xrplService, false)]);
                    // const errors = await this.validationService.validate('CancelCheck', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    let checkCancelTx: CheckCancel = {
                         TransactionType: 'CheckCancel',
                         Account: wallet.classicAddress,
                         CheckID: this.checkIdField(),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, checkCancelTx, wallet, accountInfo, 'cancelCheck');

                    const result = await this.txExecutor.checkCancel(checkCancelTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
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
                    // this.resetCheckIdDropDown();
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

     get availableCurrencies(): string[] {
          return [
               'XRP',
               ...Object.keys(this.knownTrustLinesIssuers())
                    .filter(c => c && c !== 'XRP' && c !== 'MPT')
                    .sort((a, b) => a.localeCompare(b)),
          ];
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, checkTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'create') {
               if (this.expirationTimeField && this.expirationTimeField() != '') {
                    const checkExpiration = this.utilsService.addTime(parseInt(this.expirationTimeField()), this.checkExpirationTime() as 'seconds' | 'minutes' | 'hours' | 'days').toString();
                    this.utilsService.setExpiration(checkTx, Number(checkExpiration));
               }

               if (this.txUiService.invoiceIdField()) {
                    this.utilsService.setInvoiceIdField(checkTx, this.txUiService.invoiceIdField());
               }

               if (this.txUiService.sourceTagField()) {
                    this.utilsService.setSourceTagField(checkTx, this.txUiService.sourceTagField());
               }

               if (this.destinationTagField() && parseInt(this.destinationTagField()) > 0) {
                    this.utilsService.setDestinationTag(checkTx, this.destinationTagField());
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
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest) this.addNewDestinationFromUser(destination ? destination : '');
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

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
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
          return this.utilsService.formatInvoiceId(invoiceId ? invoiceId : '');
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

     clearFields(excludeCheckId = false) {
          this.amountField.set('');
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
          this.destinationTagField.set('');
          this.sourceTagField.set('');
          this.invoiceIdField.set('');
          this.expirationTimeField.set('');
          this.checkExpirationTime.set('seconds');
          this.currencyFieldDropDownValue.set('XRP');
          this.selectedIssuer.set('');
          this.checkIdField.set('');
          this.checkIdSearchQuery.set('');
          this.txUiService.clearAllOptionsAndMessages();
          // if (!excludeCheckId) {
          //      // this.resetCheckIdDropDown();
          // }
          // this.amountField.set('');
          // this.selectedIssuer.set('');
          // this.currencyFieldDropDownValue.set('XRP');
          // this.destinationTagField.set('');
          // this.sourceTagField.set('');
          // this.invoiceIdField.set('');
          // this.expirationTimeField.set('');
          // this.checkExpirationTime.set('seconds');
          // this.txUiService.clearAllOptionsAndMessages();
     }

     resetCheckIdDropDown() {
          this.checkIdField.set('');
          this.checkIdSearchQuery.set(''); // Clear search
     }

     onCurrencyChange(currency: string) {
          this.trustlineCurrency.selectCurrency(currency, this.currentWallet().address);
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
          const allCurrencies = Object.keys(this.knownTrustLinesIssuers);
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
               this.issuers = [];
          }
     }

     getIssuerForCheck(checks: any[], checkIndex: string): string | null {
          const check = checks.find(c => c.index === checkIndex);
          return check?.SendMax?.issuer || null;
     }

     onDestinationInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.destinationSearchQuery.set(value);
          this.selectedDestinationAddress.set(''); // clear selection when typing
          this.highlightedIndex.set(value ? 0 : -1); // highlight first when typing

          if (value) {
               this.dropdownService.openDropdown();
          }
     }

     selectDestination(address: string): void {
          if (address === this.currentWallet().address) return;

          this.selectedDestinationAddress.set(address); // ← Store raw address
          this.destinationSearchQuery.set(''); // ← Clear typing
          this.closeDropdown();
     }

     onKeyDown(event: KeyboardEvent): void {
          const isDestinationOpen = this.overlayRef?.hasAttached() ?? false;
          const isCredentialOpen = this.checkIdOverlayRef?.hasAttached() ?? false;

          if (!isDestinationOpen && !isCredentialOpen) return;

          // Get the correct list and index signal
          let items: any[] = [];
          let currentIndexSignal = -1;
          let selectCallback: ((item: any) => void) | null = null;

          if (isDestinationOpen) {
               items = this.filteredDestinations();
               currentIndexSignal = this.highlightedIndex();
               selectCallback = item => this.selectDestination(item.address);
          } else if (isCredentialOpen) {
               items = this.filteredCheckIds();
               currentIndexSignal = this.highlightedCheckIdIndex();
               selectCallback = item => this.selectCheckId(item);
          }

          if (items.length === 0) {
               this.highlightedIndex.set(-1);
               this.highlightedCredentialIdIndex.set(-1);
               return;
          }

          let index = currentIndexSignal;

          if (event.key === 'ArrowDown') {
               event.preventDefault();
               index = index < items.length - 1 ? index + 1 : 0;
          } else if (event.key === 'ArrowUp') {
               event.preventDefault();
               index = index <= 0 ? items.length - 1 : index - 1;
          } else if (event.key === 'Enter') {
               event.preventDefault();
               if (index >= 0 && index < items.length && selectCallback) {
                    selectCallback(items[index]);
               }
               return;
          } else if (event.key === 'Escape') {
               if (isDestinationOpen) this.closeDropdown();
               else this.closeCheckIdDropdown();
               return;
          } else {
               index = -1; // reset on any other key
          }

          // Update correct highlight index
          if (isDestinationOpen) {
               this.highlightedIndex.set(index);
          } else {
               this.highlightedCheckIdIndex.set(index);
          }

          // Scroll into view
          setTimeout(() => {
               const el = document.querySelector('.combobox-item.highlighted') as HTMLElement;
               el?.scrollIntoView({ block: 'nearest' });
          });
     }

     openDropdown(): void {
          this.dropdownService.setItems(this.destinations());

          // Always reset search when opening fresh
          this.destinationSearchQuery.set('');
          this.dropdownService.openDropdown();
     }

     closeDropdown(): void {
          this.dropdownService.closeDropdown();
          this.overlayRef?.dispose();
          this.overlayRef = null;
          this.highlightedIndex.set(-1);
     }

     toggleDropdown(): void {
          this.dropdownService.setItems(this.destinations());
          this.dropdownService.toggleDropdown();
     }

     @HostListener('document:focusin', ['$event'])
     onGlobalFocusIn(event: FocusEvent) {
          const target = event.target as Node;

          let shouldCloseDestination = false;
          let shouldCloseDomain = false;

          // Check destination dropdown
          if (this.overlayRef?.hasAttached()) {
               const destInside = this.dropdownOrigin.nativeElement.contains(target) || this.overlayRef.overlayElement.contains(target);

               if (!destInside) {
                    shouldCloseDestination = true;
               }
          }

          // Check domain dropdown
          if (this.checkIdOverlayRef?.hasAttached()) {
               const domainInside = this.checkInput.nativeElement.contains(target) || this.checkIdOverlayRef.overlayElement.contains(target);

               if (!domainInside) {
                    shouldCloseDomain = true;
               }
          }

          // Close only the ones that lost focus
          if (shouldCloseDestination) {
               this.closeDropdown(); // closes destination dropdown + disposes overlayRef
          }
          4;
          if (shouldCloseDomain) {
               this.closeCheckIdDropdown(); // closes domain dropdown + disposes domainOverlayRef
          }
     }

     private openDropdownInternal(): void {
          if (this.overlayRef?.hasAttached()) return;

          if (this.overlayRef) {
               this.overlayRef.dispose(); // CRITICAL
               this.overlayRef = null;
          }

          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(this.dropdownOrigin)
               .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
               ])
               .withPush(false)
               .withFlexibleDimensions(false)
               .withViewportMargin(8);

          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.reposition(), // Better than close()
               width: this.dropdownOrigin.nativeElement.getBoundingClientRect().width, // Match input width!
          });
          // Reset highlight when opening
          this.highlightedIndex.set(-1);

          this.overlayRef.attach(new TemplatePortal(this.dropdownTemplate, this.viewContainerRef));
          this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());
     }

     private closeDropdownInternal(): void {
          this.overlayRef?.detach();
          this.overlayRef = null;
     }

     openCheckIdDropdown(): void {
          if (this.checkIdOverlayRef?.hasAttached()) return;

          // Critical: Ensure checkInput is available
          if (!this.checkInput?.nativeElement) {
               console.warn('checkInput not ready yet');
               return;
          }

          this.checkIdOverlayRef?.dispose();

          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(this.checkInput)
               .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
               ])
               .withPush(false);

          this.checkIdOverlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.reposition(),
               width: this.checkInput.nativeElement.getBoundingClientRect().width,
          });

          this.highlightedCheckIdIndex.set(-1);
          this.checkIdOverlayRef.attach(new TemplatePortal(this.unifiedCheckDropdownTemplate, this.viewContainerRef));
          this.checkIdOverlayRef.backdropClick().subscribe(() => this.closeCheckIdDropdown());
     }

     closeCheckIdDropdown(): void {
          this.checkIdOverlayRef?.detach();
          this.checkIdOverlayRef = null;
          this.highlightedCheckIdIndex.set(-1);
     }

     selectCheckId(check: any): void {
          this.checkIdField.set(check.id); // This now works!
          this.checkIdSearchQuery.set(''); // Clear search
          this.closeCheckIdDropdown();
     }

     onCheckIdInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.checkIdSearchQuery.set(value);

          // THIS IS THE MISSING LINE:
          this.checkIdField.set(value); // Keep the actual model in sync!
     }
}
