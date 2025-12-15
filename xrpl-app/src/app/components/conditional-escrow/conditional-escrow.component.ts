import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ElementRef, ViewChild, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, ChangeDetectionStrategy, DestroyRef, signal, computed } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import * as cc from 'five-bells-condition';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService, ValidationInputs } from '../../services/transaction-ui/transaction-ui.service';
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
import { TemplatePortal } from '@angular/cdk/portal';
import { Subject, takeUntil, map, distinctUntilChanged, filter, debounceTime } from 'rxjs';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';

interface EscrowObject {
     Account: string;
     index: string;
     Expiration?: number;
     Destination: string;
     Condition: string;
     CancelAfter: string;
     FinshAfter: string;
     Amount: string;
     DestinationTag: string;
     Balance: string;
     SourceTag: number;
     PreviousTxnID: string;
     Memo: string | null | undefined;
     Sequence: number | null | undefined;
     TicketSequence: number | null | undefined;
}

interface EscrowDataForUI {
     Account: string;
     Amount?: string | { currency: string; value: string } | { mpt_issuance_id: string; value: string };
     CancelAfter?: number;
     Destination: string;
     DestinationNode?: string;
     FinishAfter?: number;
     Condition?: string;
     Fulfillment?: string;
     DestinationTag?: number;
     Sequence?: number | null;
     EscrowSequence?: string | null;
     TxHash?: number | null;
}

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
     selector: 'app-conditional-escrow',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './conditional-escrow.component.html',
     styleUrl: './conditional-escrow.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateConditionalEscrowComponent extends PerformanceBaseComponent implements OnInit {
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
     activeTab = signal<'create' | 'finish' | 'cancel'>('create');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     amountField = signal<string>('');
     destinationField = signal<string>('');
     destinationTagField = signal<string>('');
     currencyFieldDropDownValue = signal<string>('XRP');
     issuerFields = signal<string>('');
     mptIssuanceIdField = signal<string>('');
     isMptEnabled = signal(false);
     currencyBalanceField = signal<string>('0');
     private readonly knownTrustLinesIssuers = signal<{ [key: string]: string[] }>({ XRP: [] });
     currencies = signal<string[]>([]);
     storedIssuers = signal<IssuerItem[]>([]);
     selectedIssuer = signal<string>('');
     issuers = signal<{ name?: string; address: string }[]>([]);
     currencyChangeTrigger = signal(0);
     escrowFinishTimeField = signal<string>('');
     escrowFinishTimeUnit = signal<string>('seconds');
     escrowCancelTimeUnit = signal<string>('seconds');
     escrowCancelTimeField = signal<string>('');
     escrowOwnerField = signal<string>('');
     escrowSequenceNumberField = signal<string>('');
     selectedEscrow = signal<any>(null);
     tokenBalance = signal<string>('0');
     escrowCancelDateTimeField = signal<string>('');
     escrowFinishDateTimeField = signal<string>('');
     expiredOrFulfilledEscrows = signal<any[]>([]);
     allEscrowsRaw = signal<any[]>([]); // holds raw escrow objects from ledger
     finishEscrow = signal<any[]>([]);
     existingEscrow = signal<any[]>([]);
     exsitingMpt = signal<any[]>([]);
     existingIOUs = signal<any[]>([]);
     outstandingEscrowCollapsed = signal<boolean>(true);
     outstandingMptCollapsed = signal<boolean>(true);
     outstandingIOUCollapsed = signal<boolean>(true);
     escrowConditionField = signal<string>('');
     escrowFulfillmentField = signal<string>('');

     selectedDestinationItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;
          return this.destinationItems().find(d => d.id === addr) || null;
     });

     destinationItems = computed(() => {
          const currentAddr = this.currentWallet().address;

          const all = [
               ...this.wallets().map(w => ({
                    address: w.address,
                    name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               })),
               ...this.customDestinations(),
          ];

          return all.map(d => ({
               id: d.address,
               display: d.name || 'Unknown Wallet',
               secondary: d.address,
               isCurrentAccount: d.address === currentAddr,
               isCurrentCode: false,
               isCurrentToken: false,
          }));
     });

     currencyItems = computed(() => {
          const currentCode = this.currencyFieldDropDownValue();

          return this.availableCurrencies.map(curr => {
               if (curr === 'MPT') {
                    return {
                         id: 'MPT',
                         display: 'MPT',
                         secondary: 'Multi-Purpose Token',
                         isCurrentAccount: false,
                         isCurrentCode: currentCode === 'MPT',
                         isCurrentToken: false,
                    };
               }

               return {
                    id: curr,
                    display: curr === 'XRP' ? 'XRP' : curr,
                    secondary: curr === 'XRP' ? 'Native currency' : `${this.trustlineCurrency.getIssuersForCurrency(curr).length} issuer${this.trustlineCurrency.getIssuersForCurrency(curr).length !== 1 ? 's' : ''}`,
                    isCurrentAccount: false,
                    isCurrentCode: curr === currentCode,
                    isCurrentToken: false,
               };
          });
     });

     selectedCurrencyItem = computed(() => {
          const code = this.currencyFieldDropDownValue();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     });

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

     escrowItems = computed(() => {
          const escrows = this.allEscrowsRaw();
          const walletAddr = this.currentWallet().address;
          const isCancelTab = this.activeTab() === 'cancel';

          return escrows
               .filter(
                    e =>
                         isCancelTab
                              ? e.Sender === walletAddr // You created → can cancel
                              : e.Destination === walletAddr // Sent to you → can finish
               )
               .map(e => {
                    const amountStr = typeof e.Amount === 'string' ? `${xrpl.dropsToXrp(e.Amount)} XRP` : `${e.Amount.value} ${this.utilsService.normalizeCurrencyCode(e.Amount.currency)}`;
                    const sequenceStr = e.EscrowSequence?.toString() || 'unknown';
                    return {
                         id: sequenceStr,
                         display: `${amountStr} → ${isCancelTab ? e.Destination : e.Sender}`,
                         secondary: `Seq: ${e.EscrowSequence} • ${isCancelTab ? 'You created' : 'Sent to you'}`,
                         isCurrentAccount: false,
                         isCurrentCode: false,
                         isCurrentToken: false,
                    };
               });
     });

     selectedEscrowItem = computed(() => {
          const seq = this.escrowSequenceNumberField();
          if (!seq) return null;
          console.log('seq', seq);
          console.log('escrowItems', this.escrowItems());
          const seqStr = seq.toString();
          return this.escrowItems().find(i => i.id === seqStr) || null;
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

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const address = wallet.address;
          const explorerBase = this.txUiService.explorerUrl();

          let escrowCount = 0;
          let escrowsToShow: any[] = [];

          switch (this.activeTab()) {
               case 'create': {
                    // On create tab → show escrows YOU created (outgoing)
                    const outgoing = this.allEscrowsRaw().filter(e => e.Sender === address);
                    escrowCount = outgoing.length;
                    escrowsToShow = outgoing.map(e => ({
                         index: e.EscrowSequence?.toString() || 'Unknown',
                         amount: typeof e.Amount === 'string' ? `${xrpl.dropsToXrp(e.Amount)} XRP` : `${e.Amount.value} ${this.utilsService.normalizeCurrencyCode(e.Amount.currency)}`,
                         destination: e.Destination,
                         finishAfter: e.FinishAfter,
                         cancelAfter: e.CancelAfter,
                    }));
                    break;
               }
               case 'finish': {
                    // On finish tab → show escrows sent TO you that are finishable
                    const incoming = this.allEscrowsRaw().filter(e => e.Destination === address);
                    escrowCount = incoming.length;
                    escrowsToShow = incoming.map(e => ({
                         index: e.EscrowSequence?.toString() || 'Unknown',
                         amount: typeof e.Amount === 'string' ? `${xrpl.dropsToXrp(e.Amount)} XRP` : `${e.Amount.value} ${this.utilsService.normalizeCurrencyCode(e.Amount.currency)}`,
                         sender: e.Sender,
                         finishAfter: e.FinishAfter,
                    }));
                    break;
               }
               case 'cancel': {
                    // On cancel tab → show escrows YOU created that are cancellable (past CancelAfter)
                    const cancellable = this.allEscrowsRaw().filter(e => e.Sender === address);
                    escrowCount = cancellable.length;
                    escrowsToShow = cancellable.map(e => ({
                         index: e.EscrowSequence?.toString() || 'Unknown',
                         amount: typeof e.Amount === 'string' ? `${xrpl.dropsToXrp(e.Amount)} XRP` : `${e.Amount.value} ${this.utilsService.normalizeCurrencyCode(e.Amount.currency)}`,
                         destination: e.Destination,
                         cancelAfter: e.CancelAfter,
                    }));
                    break;
               }
          }

          // Build the links (only on create tab we show all 3)
          const links: string[] = [];
          if (this.activeTab() === 'create') {
               const hasEscrows = this.existingEscrow().length > 0;
               const hasIOUs = this.existingIOUs().length > 0;
               const hasMPTs = this.exsitingMpt().length > 0;

               if (hasEscrows) links.push(`<a href="${explorerBase}account/${address}/escrows" target="_blank" rel="noopener" class="xrpl-win-link">View Escrows</a>`);
               if (hasIOUs) links.push(`<a href="${explorerBase}account/${address}/tokens" target="_blank" rel="noopener" class="xrpl-win-link">View IOUs</a>`);
               if (hasMPTs) links.push(`<a href="${explorerBase}account/${address}/mpts/owned" target="_blank" rel="noopener" class="xrpl-win-link">View MPTs</a>`);
          } else {
               // links.push(`<a href="${explorerBase}account/${address}/escrows" target="_blank" rel="noopener" class="xrpl-win-link">View All Escrows</a>`);
          }

          return {
               walletName,
               escrowCount,
               escrowsToShow,
               links: links.length > 0 ? links.join(' | ') : null,
               activeTab: this.activeTab(),
          };
     });

     timeUnitItems = computed(() => [
          { id: 'seconds', display: 'Seconds' },
          { id: 'minutes', display: 'Minutes' },
          { id: 'hours', display: 'Hours' },
          { id: 'days', display: 'Days' },
     ]);

     selectedEscrowFinishTimeUnit = computed(() => {
          const unit = this.escrowFinishTimeUnit();
          return this.timeUnitItems().find(i => i.id === unit) || null;
     });

     selectedEscrowCancelTimeUnit = computed(() => {
          const unit = this.escrowCancelTimeUnit();
          return this.timeUnitItems().find(i => i.id === unit) || null;
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

          this.currencyFieldDropDownValue.set('XRP');
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
                    await this.getEscrows(false);
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

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id || 'XRP';
          this.currencyFieldDropDownValue.set(currency);
          this.onCurrencyChange(currency); // triggers issuer reload + balance update
     }

     onDestinationSelected(item: SelectItem | null) {
          this.selectedDestinationAddress.set(item?.id || '');
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

     onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrency.selectIssuer(address);
          this.onIssuerChange(address); // your existing logic runs
     }

     async setTab(tab: 'create' | 'finish' | 'cancel'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          if (Object.keys(this.knownTrustLinesIssuers).length > 0 && this.issuerFields() === '' && this.currencyFieldDropDownValue() !== 'XRP') {
               this.currencyFieldDropDownValue.set(Object.keys(this.knownTrustLinesIssuers)[0]);
          }

          this.clearFields(true);
          if (this.hasWallets()) {
               await this.getEscrows(true);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getEscrows(forceRefresh = false): Promise<void> {
          await this.withPerf('getEscrows', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.getExistingEscrows(accountObjects, wallet.classicAddress);
                    this.getExistingMpts(accountObjects, wallet.classicAddress);
                    this.getExistingIOUs(accountObjects, wallet.classicAddress);
                    this.getExpiredOrFulfilledEscrows(client, accountObjects, wallet.classicAddress);
                    this.loadAllEscrows(accountObjects, wallet.classicAddress);

                    if (this.currencyFieldDropDownValue() !== 'XRP' && this.currencyFieldDropDownValue() !== 'MPT' && this.issuerFields() !== '') {
                         this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue(), this.currentWallet().address);
                    }

                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getEscrows:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createConditionalEscrow() {
          await this.withPerf('createConditionalEscrow', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, trustLines, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();
                    // const [accountInfo, trustLines, fee, currentLedger, serverInfo] = await Promise.all([
                    //      this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    //      this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''),
                    //      this.xrplService.calculateTransactionFee(client),
                    //      this.xrplService.getLastLedgerIndex(client),
                    //      this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, null);
                    // this.utilsService.logObjects('trustLines', trustLines);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.destination = resolvedDestination;
                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validationService.validate('CreateTimeBasedEscrow', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.utilsService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    const finishAfterTime = this.utilsService.addTime(this.escrowFinishTimeField, this.escrowFinishTimeUnit() as 'seconds' | 'minutes' | 'hours' | 'days');
                    const cancelAfterTime = this.utilsService.addTime(this.escrowCancelTimeField, this.escrowCancelTimeUnit() as 'seconds' | 'minutes' | 'hours' | 'days');
                    console.log(`finishUnit: ${this.escrowFinishTimeUnit} cancelUnit: ${this.escrowCancelTimeUnit}`);
                    console.log(`finishTime: ${this.utilsService.convertXRPLTime(finishAfterTime)} cancelTime: ${this.utilsService.convertXRPLTime(cancelAfterTime)}`);

                    // Build amount object depending on currency
                    const amountToCash =
                         this.currencyFieldDropDownValue() === AppConstants.XRP_CURRENCY
                              ? xrpl.xrpToDrops(this.amountField())
                              : {
                                     value: this.amountField(),
                                     currency: this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue()),
                                     issuer: this.issuerFields(),
                                };

                    let escrowCreateTx: xrpl.EscrowCreate = {
                         TransactionType: 'EscrowCreate',
                         Account: wallet.address,
                         Amount: amountToCash,
                         Destination: destinationAddress,
                         FinishAfter: finishAfterTime,
                         CancelAfter: cancelAfterTime,
                         Condition: this.escrowConditionField(),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, escrowCreateTx, wallet, accountInfo, 'create');

                    const result = await this.txExecutor.createEscrow(escrowCreateTx, wallet, client, {
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

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Escrow cancel successfully!' : 'Cancelled escrow successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in createTimeBasedEscrow:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async finishConditionalEscrow() {
          await this.withPerf('finishConditionalEscrow', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               // If condition is provided, fulfillment is required
               if (this.escrowConditionField() && !this.utilsService.validateInput(this.escrowFulfillmentField())) {
                    return this.txUiService.setError('ERROR: Fulfillment is required when a condition is provided');
               }

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, trustLines, escrowObjects, escrow, fee, currentLedger] = await Promise.all([
                         this.xrplCache.getAccountData(wallet.classicAddress, false),
                         this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''),
                         this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'escrow'),
                         this.xrplService.getEscrowBySequence(client, wallet.classicAddress, Number(this.escrowSequenceNumberField())),
                         this.xrplCache.getFee(this.xrplService, false),
                         this.xrplService.getLastLedgerIndex(client),
                    ]);
                    //  const errors = await this.validationService.validate('FinishTimeBasedEscrow', { inputs, client, accountInfo });
                    //  if (errors.length > 0) {
                    //       return this.utilsService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    //  }

                    // String(4 * Number(this.xrplCache.getFee(this.xrplService, false))),
                    // Check if the escrow can be canceled based on the CancelAfter time
                    const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
                    const escrowStatus = this.utilsService.checkEscrowStatus({ FinishAfter: escrow.FinshAfter ? Number(escrow.FinshAfter) : undefined, CancelAfter: escrow.CancelAfter ? Number(escrow.CancelAfter) : undefined, Condition: this.escrowConditionField(), owner: this.escrowOwnerField() }, currentRippleTime, wallet.classicAddress, 'finishEscrow', this.escrowFulfillmentField());

                    if (!escrowStatus.canFinish && !escrowStatus.canCancel) {
                         return this.txUiService.setError(`\n${escrowStatus.reasonCancel}\n${escrowStatus.reasonFinish}`);
                    }

                    if (!escrowStatus.canFinish) {
                         return this.txUiService.setError(`${escrowStatus.reasonFinish}`);
                    }

                    let escrowFinishTx: xrpl.EscrowFinish = {
                         TransactionType: 'EscrowFinish',
                         Account: wallet.classicAddress,
                         Owner: this.escrowOwnerField(),
                         OfferSequence: Number.parseInt(this.escrowSequenceNumberField()),
                         Condition: this.escrowConditionField(),
                         Fulfillment: this.escrowFulfillmentField(),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, escrowFinishTx, wallet, accountInfo, 'finish');

                    // if (this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY) {
                    //      if (this.amountField || this.amountField === '') {
                    //           if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, escrowFinishTx, fee)) {
                    //                return this.txUiService.setError('Insufficient XRP to complete transaction');
                    //           }
                    //      } else {
                    //           if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, escrowFinishTx, fee)) {
                    //                return this.txUiService.setError('Insufficient XRP to complete transaction');
                    //           }
                    //      }
                    // } else if (this.currencyFieldDropDownValue !== 'MPT') {
                    // if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, escrowFinishTx, resolvedDestination)) {
                    //      return this.txUiService.setError('ERROR: Not enough IOU balance for this transaction');
                    // }

                    const result = await this.txExecutor.finishEscrow(escrowFinishTx, wallet, client, {
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

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Escrow finished successfully!' : 'Finished escrow successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in finishConditionalEscrow:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async cancelEscrow() {
          await this.withPerf('cancelEscrow', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();

                    const [accountInfo, escrowObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'escrow'), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    // const errors = await this.validationService.validate('CancelTimeBasedEscrow', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.utilsService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    let foundSequenceNumber = false;
                    let escrowOwner = this.currentWallet().address;
                    let escrow: EscrowObject | undefined = undefined;
                    for (const [ignore, obj] of escrowObjects.result.account_objects.entries()) {
                         if (obj.PreviousTxnID) {
                              const sequenceTx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
                              if (sequenceTx.result.tx_json.Sequence === Number(this.escrowSequenceNumberField())) {
                                   foundSequenceNumber = true;
                                   escrow = obj as unknown as EscrowObject;
                                   escrowOwner = escrow.Account;
                                   break;
                              } else if (sequenceTx.result.tx_json.TicketSequence != undefined && sequenceTx.result.tx_json.TicketSequence === Number(this.escrowSequenceNumberField())) {
                                   foundSequenceNumber = true;
                                   escrow = obj as unknown as EscrowObject;
                                   escrowOwner = escrow.Account;
                                   break;
                              }
                         }
                    }

                    if (!escrow) {
                         return this.txUiService.setError(`No escrow found for sequence ${this.escrowSequenceNumberField()}`);
                    }

                    // Check if the escrow can be canceled based on the CancelAfter time
                    const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
                    // Ensure FinishAfter and CancelAfter are numbers
                    const finishAfterNum = escrow.FinshAfter !== undefined ? Number(escrow.FinshAfter) : undefined;
                    const cancelAfterNum = escrow.CancelAfter !== undefined ? Number(escrow.CancelAfter) : undefined;
                    const escrowStatus = this.utilsService.checkTimeBasedEscrowStatus({ FinishAfter: finishAfterNum, CancelAfter: cancelAfterNum, owner: escrowOwner }, currentRippleTime, wallet.classicAddress, 'cancelEscrow');

                    if (!escrowStatus.canCancel) {
                         return this.txUiService.setError(`${escrowStatus.reasonCancel}`);
                    }

                    let escrowCancelTx: xrpl.EscrowCancel = {
                         TransactionType: 'EscrowCancel',
                         Account: wallet.classicAddress,
                         Owner: escrowOwner,
                         OfferSequence: Number.parseInt(this.escrowSequenceNumberField()),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, escrowCancelTx, wallet, accountInfo, 'cancel');

                    const result = await this.txExecutor.cancelEscrow(escrowCancelTx, wallet, client, {
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

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Escrow cancel successfully!' : 'Cancelled escrow successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in cancelEscrow:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     // This runs once when account data loads
     private loadAllEscrows(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const rawEscrows = (accountObjects.result.account_objects ?? [])
               .filter(obj => obj.LedgerEntryType === 'Escrow' && (obj.FinishAfter || obj.CancelAfter) && !obj.Condition)
               .map(async (obj: any) => {
                    let EscrowSequence: number | null = null;
                    if (obj.PreviousTxnID) {
                         try {
                              const client = await this.getClient();
                              const tx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
                              EscrowSequence = tx.result.tx_json.Sequence ?? null;
                         } catch (e) {
                              console.warn('Failed to fetch sequence for escrow', obj.PreviousTxnID);
                         }
                    }

                    const amount = typeof obj.Amount === 'string' ? xrpl.dropsToXrp(obj.Amount) : obj.Amount.value + ' ' + this.utilsService.normalizeCurrencyCode(obj.Amount.currency);

                    return {
                         Sender: obj.Account,
                         Destination: obj.Destination,
                         Amount: obj.Amount,
                         EscrowSequence,
                         CancelAfter: obj.CancelAfter,
                         FinishAfter: obj.FinishAfter,
                    };
               });

          // Resolve all async sequences
          Promise.all(rawEscrows).then(resolved => {
               this.allEscrowsRaw.set(resolved);
          });
     }

     private getExistingEscrows(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          // this.existingEscrow
          const mapped = (escrowObjects.result.account_objects ?? [])
               .filter(
                    (obj: any) =>
                         obj.LedgerEntryType === 'Escrow' &&
                         obj.Account === classicAddress &&
                         // Only condition-based escrows:
                         (obj.FinishAfter || obj.CancelAfter) &&
                         !!obj.Condition
               )
               .map((obj: any): EscrowDataForUI => {
                    const sendMax = obj.Amount;
                    let amount = '0';
                    let currency = '';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                         currency = '';
                    } else if (sendMax?.value) {
                         amount = sendMax.value;
                         currency = this.utilsService.normalizeCurrencyCode(sendMax.currency);
                    }

                    return {
                         Account: obj.Account,
                         Amount: `${amount} ${currency}`,
                         Destination: obj.Destination,
                         DestinationTag: obj.DestinationTag,
                         CancelAfter: obj.CancelAfter,
                         FinishAfter: obj.FinishAfter,
                         TxHash: obj.PreviousTxnID,
                         Sequence: obj.PreviousTxnID,
                    };
               })
               .sort((a, b) => a.Destination.localeCompare(b.Destination));

          this.existingEscrow.set(mapped);
          this.utilsService.logObjects('existingEscrow', mapped);
          // return this.existingEscrow;
     }

     private getExistingMpts(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          // this.exsitingMpt
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

          this.exsitingMpt.set(mapped);
          this.utilsService.logObjects('exsitingMpt', mapped);
          // return this.exsitingMpt;
     }

     private getExistingIOUs(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          // this.existingIOUs
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
          // return this.existingIOUs;
     }

     private async getExpiredOrFulfilledEscrows(client: xrpl.Client, escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const filteredEscrows = (escrowObjects.result.account_objects ?? []).filter(
               (obj: any) =>
                    obj.LedgerEntryType === 'Escrow' &&
                    (this.activeTab() === 'cancel'
                         ? obj.Account === classicAddress // owner can cancel
                         : obj.Destination === classicAddress) // receiver can finish
          );

          const processedEscrows = await Promise.all(
               filteredEscrows.map(async (obj: any) => {
                    const sendMax = obj.Amount;
                    let amount = '0';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }

                    let EscrowSequence: number | null = null;
                    if (obj.PreviousTxnID) {
                         try {
                              const sequenceTx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
                              EscrowSequence = sequenceTx?.result?.tx_json?.Sequence ?? null;
                         } catch (error) {
                              console.warn(`Failed to fetch escrow sequence for ${obj.PreviousTxnID}:`, error);
                         }
                    }

                    return {
                         Amount: amount,
                         Sender: obj.Account,
                         Destination: obj.Destination,
                         EscrowSequence,
                    };
               })
          );

          this.expiredOrFulfilledEscrows.set(processedEscrows.sort((a, b) => a.Sender.localeCompare(b.Sender)));
          this.utilsService.logObjects('expiredOrFulfilledEscrows', this.expiredOrFulfilledEscrows);
     }

     get availableCurrencies(): string[] {
          return [
               'XRP',
               'MPT',
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

     private async setTxOptionalFields(client: xrpl.Client, escrowTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(escrowTx, ticket, true);
               }
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(escrowTx, this.txUiService.memoField());
          }

          if (this.txUiService.destinationTagField()) {
               this.utilsService.setDestinationTag(escrowTx, this.txUiService.destinationTagField());
          }

          if (txType === 'create') {
               if (this.currencyFieldDropDownValue() === 'MPT') {
                    const accountObjects = await this.xrplService.getAccountObjects(client, this.selectedDestinationAddress(), 'validated', '');
                    const mptTokens = accountObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'MPToken');
                    console.debug(`Destination MPT Tokens:`, mptTokens);
                    console.debug('MPT Issuance ID:', this.mptIssuanceIdField);
                    const authorized = mptTokens.some((obj: any) => obj.MPTokenIssuanceID === this.mptIssuanceIdField);

                    if (!authorized) {
                         throw new Error(`Destination ${this.selectedDestinationAddress()} is not authorized to receive this MPT (issuance ID ${this.mptIssuanceIdField}). Please ensure authorization has been completed.`);
                    }

                    const curr: xrpl.MPTAmount = {
                         mpt_issuance_id: this.mptIssuanceIdField(),
                         value: this.amountField(),
                    };
                    escrowTx.Amount = curr;
               } else if (this.currencyFieldDropDownValue() !== 'XRP' && this.currencyFieldDropDownValue() !== 'MPT') {
                    const curr: xrpl.IssuedCurrencyAmount = {
                         currency: this.currencyFieldDropDownValue.length > 3 ? this.utilsService.encodeCurrencyCode(this.currencyFieldDropDownValue()) : this.currencyFieldDropDownValue(),
                         issuer: this.issuerFields(),
                         value: this.amountField(),
                    };
                    escrowTx.Amount = curr;
               } else {
                    escrowTx.Amount = xrpl.xrpToDrops(this.amountField());
               }
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          this.getExistingEscrows(accountObjects, wallet.classicAddress);
          this.getExistingMpts(accountObjects, wallet.classicAddress);
          this.getExistingIOUs(accountObjects, wallet.classicAddress);
          this.getExpiredOrFulfilledEscrows(client, accountObjects, wallet.classicAddress);
          this.loadAllEscrows(accountObjects, wallet.classicAddress);

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

     // async getEscrowOwnerAddress() {
     //      console.log('Entering getEscrowOwnerAddress');
     //      const startTime = Date.now();

     //      try {
     //           const client = await this.xrplService.getClient();
     //           const accountInfo = await this.xrplService.getAccountObjects(client, this.currentWallet().address, 'validated', '');

     //           const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
     //           if (errors.length > 0) {
     //                return this.txUiService.setError(errors.join('\n• '));
     //           }

     //           const escrowObjects = accountInfo.result.account_objects;
     //           if (escrowObjects.length === 0) {
     //                this.escrowOwnerField.set(this.currentWallet().address);
     //                return;
     //           }

     //           const targetSequence = Number(this.escrowSequenceNumberField);
     //           if (Number.isNaN(targetSequence)) {
     //                this.escrowOwnerField.set(this.currentWallet().address);
     //                return;
     //           }

     //           const txPromises = escrowObjects.map(async escrow => {
     //                const previousTxnID = escrow.PreviousTxnID;
     //                if (typeof previousTxnID !== 'string') {
     //                     return Promise.resolve({ escrow, sequence: null });
     //                }
     //                try {
     //                     const sequenceTx = await this.xrplService.getTxData(client, previousTxnID);
     //                     const offerSequence = sequenceTx.result.tx_json.Sequence;
     //                     return { escrow, sequence: offerSequence ?? null };
     //                } catch (err: any) {
     //                     console.error(`Failed to fetch tx ${previousTxnID}:`, err.message || err);
     //                     return { escrow, sequence: null };
     //                }
     //           });

     //           const results = await Promise.all(txPromises);

     //           const match = results.find(r => r.sequence === targetSequence);
     //           if (match && 'Account' in match.escrow) {
     //                this.escrowOwnerField.set(match.escrow.Account);
     //           } else {
     //                this.escrowOwnerField.set(this.currentWallet().address); // safe fallback
     //           }
     //      } catch (error: any) {
     //           console.error('Error in getEscrowOwnerAddress:', error);
     //           this.txUiService.setError(`${error.message || 'Transaction failed'}`);
     //      } finally {
     //           this.txUiService.spinner.set(false);
     //      }
     // }

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

     copyEscrowTxHash(PreviousTxnID: string) {
          navigator.clipboard.writeText(PreviousTxnID).then(() => {
               this.txUiService.showToastMessage('Escrow Tx Hash copied!');
          });
     }

     copyMptIssuanceIdHash(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.txUiService.showToastMessage('MPT Issuance ID copied!');
          });
     }

     copyIOUIssuanceAddress(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.txUiService.showToastMessage('IOU Token Issuer copied!');
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

     clearFields(all = true) {
          this.escrowConditionField.set('');
          this.escrowFulfillmentField.set('');
          this.escrowFinishTimeField.set('');
          this.escrowCancelTimeField.set('');
          this.escrowSequenceNumberField.set('');
          this.escrowOwnerField.set('');
          this.amountField.set('');
          this.destinationTagField.set('');
     }

     private resetEscrowSelection() {
          this.selectedEscrow.set(null);
          this.escrowSequenceNumberField.set('');
          this.escrowOwnerField.set('');
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
               this.issuers.set([]);
          }
     }

     getCondition() {
          const { condition, fulfillment } = this.generateCondition();
          this.escrowConditionField.set(condition);
          this.escrowFulfillmentField.set(fulfillment);
     }

     generateCondition(): { condition: string; fulfillment: string } {
          console.log('Generating a cryptographic condition and fulfillment for XRPL escrow');

          // Use Web Crypto API to generate 32 random bytes
          const preimage = new Uint8Array(32);
          globalThis.crypto.getRandomValues(preimage); // Browser-compatible random bytes

          // Create a PREIMAGE-SHA-256 condition
          const fulfillment = new cc.PreimageSha256();
          fulfillment.setPreimage(Buffer.from(preimage)); // Convert Uint8Array to Buffer

          // Get the condition (hash of the preimage) in hexadecimal
          const condition = fulfillment.getConditionBinary().toString('hex').toUpperCase();

          // Get the fulfillment (preimage) in hexadecimal, to be kept secret
          const fulfillment_hex = fulfillment.serializeBinary().toString('hex').toUpperCase();

          console.log('Condition:', condition);
          console.log('Fulfillment (keep secret until ready to finish escrow):', fulfillment_hex);

          return { condition, fulfillment: fulfillment_hex };
     }

     populateDefaultDateTime() {
          if (!this.escrowCancelDateTimeField()) {
               const now = new Date();

               const year = now.getFullYear();
               const month = String(now.getMonth() + 1).padStart(2, '0');
               const day = String(now.getDate()).padStart(2, '0');
               const hours = String(now.getHours()).padStart(2, '0');
               const minutes = String(now.getMinutes()).padStart(2, '0');
               const seconds = String(now.getSeconds()).padStart(2, '0');

               this.escrowCancelDateTimeField.set(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
          }
     }

     displayAmount(amount: any): string {
          let displayAmount;
          if (typeof amount === 'string') {
               // Native XRP escrow
               displayAmount = `${xrpl.dropsToXrp(amount)} XRP`;
          } else if (typeof amount === 'object' && amount.currency) {
               // IOU or MPT
               let currency = amount.currency;

               // Detect hex MPT currency code
               if (/^[0-9A-F]{40}$/i.test(currency)) {
                    try {
                         currency = this.utilsService.normalizeCurrencyCode(currency);
                    } catch (e) {
                         // fallback: leave as hex if decode fails
                    }
               }

               displayAmount = `${amount.value} ${currency} Issuer: <code>${amount.issuer}</code>`;
          } else {
               displayAmount = 'N/A';
          }
          return displayAmount;
     }
}
