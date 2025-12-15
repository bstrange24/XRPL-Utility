import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ElementRef, ViewChild, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, computed, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { MPTokenIssuanceCreate } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
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
import { Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface AccountFlags {
     isClawback: boolean;
     isLock: boolean;
     isRequireAuth: boolean;
     isTransferable: boolean;
     isTradable: boolean;
     isEscrow: boolean;
}

interface IssuerItem {
     name: string;
     address: string;
}

@Component({
     selector: 'app-firewall',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './firewall.component.html',
     styleUrl: './firewall.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirewallComponent extends PerformanceBaseComponent implements OnInit {
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
     activeTab = signal<'create' | 'modify' | 'authorize' | 'unauthorize' | 'delete'>('create');
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

     private destroy$ = new Subject<void>();
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef; // We'll add this to the input
     private overlayRef: OverlayRef | null = null;
     private readonly injector = inject(Injector);
     selectedFirewall: string | null = null; // stores NFTokenID
     tempNameFirewallId: string | null = null; // stores NFTokenID
     isTicket: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     useMultiSign: boolean = false;
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
     signerQuorum: number = 0;
     cancelTimePeriodField = signal<string>('');
     cancelTimePeriodUnit = signal<string>('seconds');
     finishTimePeriodField = signal<string>('');
     finishTimePeriodUnit = signal<string>('seconds');
     backupAccountField: string = '';
     totalOutField: string = '';
     isMptFlagModeEnabled: boolean = false;
     memoField: string = '';
     isMemoEnabled: boolean = false;
     isRegularKeyAddress: boolean = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     masterKeyDisabled: boolean = false;
     private knownDestinations: { [key: string]: string } = {};
     private whitelistAddress: { [key: string]: string } = {};
     showDropdown = false;
     dropdownOpen = false;
     highlightedIndex = -1;
     whitelistAddresses: string[] = [];
     newWhitelistAddress: string = '';
     whitelistAddressToRemove: string = '';
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     selectedWalletIndex: number = 0;
     showManageTokens: boolean = false;
     showSecret: boolean = false;
     encryptionType: string = '';
     existingFirewalls: any = [];
     existingFirewallsCollapsed: boolean = true;
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     filterQuery: string = '';
     sourceTagField = '';
     invoiceIdField = '';
     private lastPaymentTx = '';
     private lastTxResult = '';
     private issuerFieldSubject = new Subject<void>();
     private destinationInputSubject = new Subject<string>();
     checkExpirationTime: string = 'seconds';
     expirationTimeField: string = '';
     ticketSequence: string = '';
     checkIdField: string = '';
     outstandingChecks: string = '';
     gatewayBalance: string = '0';
     issuerToRemove: string = '';
     userAddedCurrencyFieldDropDownValue: string[] = [];
     userAddedissuerFields: string = '';
     allKnownIssuers: string[] = [];
     newCurrency: string = '';
     newIssuer: string = '';
     tokenToRemove: string = '';
     lastCurrency: string = '';
     lastIssuer: string = '';
     cancellableChecks: any = [];
     cashableChecks: any = [];
     existingChecks: any = [];
     outstandingChecksCollapsed = true;

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

     timeUnitItems = computed(() => [
          { id: 'seconds', display: 'Seconds' },
          { id: 'minutes', display: 'Minutes' },
          { id: 'hours', display: 'Hours' },
          { id: 'days', display: 'Days' },
     ]);

     finishTimeUnit = computed(() => {
          const unit = this.finishTimePeriodUnit();
          return this.timeUnitItems().find(i => i.id === unit) || null;
     });

     cancelTimeUnit = computed(() => {
          const unit = this.cancelTimePeriodUnit();
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
                    await this.getFirewallDetails(false);
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

     onSelectPermissionedDomain(firewallId: string | null) {
          this.selectedFirewall = firewallId;
          this.tempNameFirewallId = firewallId ?? '';
     }

     toggleExistingFirewalls() {
          this.existingFirewallsCollapsed = !this.existingFirewallsCollapsed;
     }

     async setTab(tab: 'create' | 'modify' | 'authorize' | 'unauthorize' | 'delete'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          if (Object.keys(this.knownTrustLinesIssuers).length > 0 && this.issuerFields() === '' && this.currencyFieldDropDownValue() !== 'XRP') {
               this.currencyFieldDropDownValue.set(Object.keys(this.knownTrustLinesIssuers)[0]);
          }

          this.clearFields(true);
          if (this.hasWallets()) {
               await this.getFirewallDetails(true);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getFirewallDetails(forceRefresh = false): Promise<void> {
          await this.withPerf('getFirewallDetails', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    // const firewallTx: Firewall = {
                    //      TransactionType: 'Firewall',
                    //      Account: wallet.classicAddress,
                    //      PublicKey: '',
                    //      BackupAccount: this.destinationField,
                    //      TimePeriod: '',
                    //      TimePeriodStart: '',
                    //      Amount: '',
                    //      TotalOut: '',
                    //      Fee: fee,
                    //      Flags: v_flags,
                    //      LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    // };

                    // const firewallWhitelistTx: FirewallWhitelist = {
                    //      TransactionType: 'FirewallWhitelist',
                    //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
                    //      OwnerNode: '',
                    //      PreviousTxnID: '',
                    //      PreviousTxnLgrSeq: '',
                    // };

                    // Prepare data structure
                    // const data = {
                    //      sections: [{}],
                    // };

                    // // Filter MPT-related objects
                    // const mptObjects = accountObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'MPTokenIssuance' || obj.LedgerEntryType === 'MPToken');
                    // if (mptObjects.length <= 0) {
                    //      data.sections.push({
                    //           title: 'Firewall Details',
                    //           openByDefault: true,
                    //           content: [{ key: 'Status', value: `No Firewall found for <code>${wallet.classicAddress}</code>` }],
                    //      });
                    // } else {
                    //      // Sort by Sequence (oldest first)
                    //      const sortedMPT = [...mptObjects].sort((a, b) => {
                    //           const seqA = (a as any).Sequence ?? Number.MAX_SAFE_INTEGER;
                    //           const seqB = (b as any).Sequence ?? Number.MAX_SAFE_INTEGER;
                    //           return seqA - seqB;
                    //      });

                    //      data.sections.push({
                    //           title: `Firewall (${mptObjects.length})`,
                    //           openByDefault: true,
                    //           subItems: sortedMPT.map((mpt, counter) => {
                    //                const { LedgerEntryType, PreviousTxnID, index } = mpt;
                    //                // TicketSequence and Flags may not exist on all AccountObject types
                    //                const ticketSequence = (mpt as any).TicketSequence;
                    //                const flags = (mpt as any).Flags;
                    //                const mptIssuanceId = (mpt as any).mpt_issuance_id || (mpt as any).MPTokenIssuanceID;
                    //                return {
                    //                     key: `MPT ${counter + 1} (ID: ${index.slice(0, 8)}...)`,
                    //                     openByDefault: false,
                    //                     content: [
                    //                          { key: 'MPT Issuance ID', value: `<code>${mptIssuanceId}</code>` },
                    //                          { key: 'Ledger Entry Type', value: LedgerEntryType },
                    //                          { key: 'Previous Txn ID', value: `<code>${PreviousTxnID}</code>` },
                    //                          ...(ticketSequence ? [{ key: 'Ticket Sequence', value: String(ticketSequence) }] : []),
                    //                          ...(flags !== undefined ? [{ key: 'Flags', value: this.utilsService.getMptFlagsReadable(Number(flags)) }] : []),
                    //                          // Optionally display custom fields if present
                    //                          ...((mpt as any)['MPTAmount'] ? [{ key: 'MPTAmount', value: String((mpt as any)['MPTAmount']) }] : []),
                    //                          ...((mpt as any)['MPTokenMetadata'] ? [{ key: 'MPTokenMetadata', value: xrpl.convertHexToString((mpt as any)['MPTokenMetadata']) }] : []),
                    //                          ...((mpt as any)['MaximumAmount'] ? [{ key: 'MaximumAmount', value: String((mpt as any)['MaximumAmount']) }] : []),
                    //                          ...((mpt as any)['OutstandingAmount'] ? [{ key: 'OutstandingAmount', value: String((mpt as any)['OutstandingAmount']) }] : []),
                    //                          ...((mpt as any)['TransferFee'] ? [{ key: 'TransferFee', value: String((mpt as any)['TransferFee']) }] : []),
                    //                          ...((mpt as any)['MPTIssuanceID'] ? [{ key: 'MPTIssuanceID', value: String((mpt as any)['MPTIssuanceID']) }] : []),
                    //                     ],
                    //                };
                    //           }),
                    //      });
                    // }

                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getFirewallDetails:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createFirewall() {
          await this.withPerf('createFirewall', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, trustLines, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();

                    // const errors = await this.validateInputs(inputs, 'createFirewall');
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    const timePeriod = this.utilsService.addTime(this.finishTimePeriodField(), this.finishTimePeriodField() as 'seconds' | 'minutes' | 'hours' | 'days');
                    const timePeriodStart = this.utilsService.addTime(this.cancelTimePeriodField(), this.cancelTimePeriodField() as 'seconds' | 'minutes' | 'hours' | 'days');
                    console.log(`timePeriodUnit: ${this.finishTimePeriodUnit()} timePeriodStartUnit: ${this.cancelTimePeriodUnit()}`);
                    console.log(`timePeriod: ${this.utilsService.convertXRPLTime(timePeriod)} timePeriodStart: ${this.utilsService.convertXRPLTime(timePeriodStart)}`);
                    console.log(`Total Out: `, this.totalOutField);
                    console.log(`Amount: `, this.amountField);
                    console.log(`Backup account: `, this.backupAccountField);
                    console.log(`Wallet pubkey: `, wallet.publicKey);

                    if (1 == 1) {
                         return this.txUiService.setError('Poopy');
                    }

                    let v_flags = 0;

                    const mPTokenIssuanceCreateTx: MPTokenIssuanceCreate = {
                         TransactionType: 'MPTokenIssuanceCreate',
                         Account: wallet.classicAddress,
                         // AssetClass: 'CTZMPT',
                         MaximumAmount: '0',
                         Fee: fee,
                         Flags: v_flags,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    // const firewallSetTx: FirewallSet = {
                    //      TransactionType: 'FirewallSet',
                    //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
                    //      PublicKey: 'EDPUBLICKEY',
                    //      BackupAccount: 'rY6CEmcZiJXp5L4LDJq3gZFujU6Wwn7xH3',
                    //      TimePeriod: 86400,
                    //      Amount: '1000000000',
                    // };

                    // Optional fields
                    await this.setTxOptionalFields(client, mPTokenIssuanceCreateTx, wallet, accountInfo);

                    const result = await this.txExecutor.createFirewall(mPTokenIssuanceCreateTx, wallet, client, {
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
                    console.error('Error in createFirewall:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async modifyFirewall() {
          await this.withPerf('modifyFirewall', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, trustLines, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();

                    // const errors = await this.validateInputs(inputs, 'modifyFirewall');
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    const mPTokenAuthorizeTx: xrpl.MPTokenAuthorize = {
                         TransactionType: 'MPTokenAuthorize',
                         Account: wallet.address,
                         MPTokenIssuanceID: '',
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         Fee: fee,
                    };

                    // const firewallSetUpdateTx: FirewallSet = {
                    //      TransactionType: 'FirewallSet',
                    //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
                    //      TimePeriod: 86400,
                    //      Amount: '1000000000',
                    //      Signature: '',
                    // };

                    // Optional fields
                    await this.setTxOptionalFields(client, mPTokenAuthorizeTx, wallet, accountInfo);

                    const result = await this.txExecutor.modifyFirewall(mPTokenAuthorizeTx, wallet, client, {
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
                    console.error('Error in modifyFirewall:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async authorizeFirewall(authorizeFlag: 'Y' | 'N') {
          await this.withPerf('authorizeFirewall', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, trustLines, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();

                    // const errors = await this.validateInputs(inputs, 'authorizeFirewall');
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    // Check if destination can hold the MPT
                    // if (!destObjects || !destObjects.result || !destObjects.result.account_objects) {
                    //      return this.txUiService.setError(`ERROR: Unable to fetch account objects for destination ${this.destinationField()}`);
                    // }
                    // const mptTokens = destObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'MPToken');
                    // console.debug(`Destination MPT Tokens:`, mptTokens);

                    // const authorized = mptTokens.some((obj: any) => obj.MPTokenIssuanceID === '');

                    // if (!authorized) {
                    //      return this.txUiService.setError(`ERROR: Destination ${this.destinationField()} is not authorized to receive this MPT (issuance ID ${''}).`);
                    // }

                    const sendMptPaymentTx: xrpl.Payment = {
                         TransactionType: 'Payment',
                         Account: wallet.classicAddress,
                         Amount: {
                              mpt_issuance_id: '',
                              value: this.amountField(),
                         },
                         Destination: this.destinationField(),
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         Fee: fee,
                    };

                    // let firewallWhitelistSetAuthorizeTx:FirewallWhitelistSet;
                    if (authorizeFlag === 'Y') {
                         // firewallWhitelistSetAuthorizeTx = {
                         //      TransactionType: 'FirewallWhitelistSet',
                         //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
                         //      Authorize: '',
                         //      Signature: '',
                         // };
                    } else {
                         // firewallWhitelistSetAuthorizeTx = {
                         //      TransactionType: 'FirewallWhitelistSet',
                         //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
                         //      Unauthorize: '',
                         //      Signature: '',
                         // };
                    }

                    // Optional fields
                    await this.setTxOptionalFields(client, sendMptPaymentTx, wallet, accountInfo);

                    const result = await this.txExecutor.authorizeFlag(sendMptPaymentTx, wallet, client, {
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
                    console.error('Error in authorizeFirewall:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async deleteFirewall() {
          await this.withPerf('deleteFirewall', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, trustLines, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();

                    // const errors = await this.validateInputs(inputs, 'deleteFirewall');
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    const mPTokenIssuanceDestroyTx: xrpl.MPTokenIssuanceDestroy = {
                         TransactionType: 'MPTokenIssuanceDestroy',
                         Account: wallet.classicAddress,
                         MPTokenIssuanceID: '',
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         Fee: fee,
                    };

                    // const firewallDeleteTx: FirewallDelete = {
                    //      TransactionType: 'FirewallDelete',
                    //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
                    //      Signature: '',
                    // };

                    // Optional fields
                    await this.setTxOptionalFields(client, mPTokenIssuanceDestroyTx, wallet, accountInfo);

                    const result = await this.txExecutor.deleteFirewall(mPTokenIssuanceDestroyTx, wallet, client, {
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
                    console.error('Error in createTimeBasedEscrow:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private getExistingNfts(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const nftPages = (checkObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'NFTokenPage');

          // Flatten all NFTokens from all pages
          const allNfts = nftPages.flatMap((page: any) => {
               return page.NFTokens.map((entry: any) => {
                    const nft = entry.NFToken;

                    return {
                         LedgerEntryType: page.LedgerEntryType,
                         PageIndex: page.index,
                         NFTokenID: nft.NFTokenID,
                         Flags: nft.Flags ?? 0,
                         Issuer: nft.Issuer,
                         Taxon: nft.NFTaxon,
                         TransferFee: nft.TransferFee,
                         Sequence: nft.Sequence,
                         URI_hex: nft.URI,
                         URI: nft.URI ? this.utilsService.decodeHex(nft.URI) : null,
                    };
               });
          });

          this.existingFirewalls = allNfts;

          this.utilsService.logObjects('existingFirewalls', this.existingFirewalls);

          return this.existingFirewalls;
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

     private async setTxOptionalFields(client: xrpl.Client, firewallTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(firewallTx, ticket, true);
               }
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(firewallTx, this.txUiService.memoField());
          }

          if (this.txUiService.destinationTagField()) {
               this.utilsService.setDestinationTag(firewallTx, this.txUiService.destinationTagField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          // this.getExistingEscrows(accountObjects, wallet.classicAddress);
          // this.getExistingMpts(accountObjects, wallet.classicAddress);
          // this.getExistingIOUs(accountObjects, wallet.classicAddress);
          // this.getExpiredOrFulfilledEscrows(client, accountObjects, wallet.classicAddress);
          // this.loadAllEscrows(accountObjects, wallet.classicAddress);

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

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
     }

     addWhitelistAddress() {
          if (this.newWhitelistAddress && this.newWhitelistAddress.trim()) {
               const knownWhitelistAddress = this.storageService.getKnownWhitelistAddress('knownWhitelistAddress') || {};
               if (knownWhitelistAddress[this.newWhitelistAddress]) {
                    this.txUiService.setError(`Whitelist Address ${this.newWhitelistAddress} already exists`);
                    return;
               }

               if (!xrpl.isValidAddress(this.newWhitelistAddress.trim())) {
                    this.txUiService.setError('Invalid issuer address');
                    return;
               }

               knownWhitelistAddress[this.newWhitelistAddress] = this.newWhitelistAddress;
               this.storageService.setKnownWhitelistAddress('knownWhitelistAddress', knownWhitelistAddress);

               // this.updateWhitelistAddress();
               this.txUiService.setSuccess(`Added ${this.newWhitelistAddress} to Whitelist accounts`);
               this.newWhitelistAddress = '';
          } else {
               this.txUiService.setError('Currency code and issuer address are required');
          }
          this.txUiService.spinner.set(false);
     }

     removeWhitelistAddress() {
          if (this.whitelistAddressToRemove) {
               const knownWhitelistAddress = this.storageService.getKnownWhitelistAddress('knownWhitelistAddress') || {};

               if (knownWhitelistAddress && knownWhitelistAddress[this.whitelistAddressToRemove]) {
                    delete knownWhitelistAddress[this.whitelistAddressToRemove];
                    this.storageService.setKnownWhitelistAddress('knownWhitelistAddress', knownWhitelistAddress);
               }
               this.txUiService.setSuccess(`Removed ${this.whitelistAddressToRemove} from the Whitelist accounts`);
               // this.updateWhitelistAddress();
               this.whitelistAddressToRemove = '';
          } else {
               this.txUiService.setError('Select a whitelist address to remove');
          }
          this.txUiService.spinner.set(false);
     }

     // private updateWhitelistAddress() {
     //      const t = this.storageService.getKnownWhitelistAddress('knownWhitelistAddress') || {};
     //      this.whitelistAddresses = t ? Object.keys(t) : [];
     //      this.txUiService.setSuccess(`whitelistAddresses ${this.whitelistAddresses}`);

     //      // merge whitelist into destinations
     //      this.destinations = [...new Set([...Object.values(this.knownDestinations), ...this.whitelistAddresses])].map(address => ({ address }));
     // }

     private comineWhiteListDestiationAddresses(storedDestinations: { [key: string]: string }, knownWhitelistAddress: { [key: string]: string }) {
          const convertedDestinations = Object.entries(storedDestinations)
               .filter(([_, value]) => value && value.trim() !== '') // Remove "XRP": ""
               .reduce((acc, [_, value]) => {
                    acc[value] = value;
                    return acc;
               }, {} as { [key: string]: string });

          // Merge both objects
          const combined = {
               ...convertedDestinations,
               ...knownWhitelistAddress,
          };
          return combined;
     }

     copyFirewallID(id: string) {
          navigator.clipboard.writeText(id).then(() => {
               this.txUiService.showToastMessage('MPT Issuance ID copied!');
          });
     }

     updateInfoMessage(): void {
          if (!this.currentWallet()?.address) {
               this.txUiService.setInfoMessage('No wallet is currently selected.');
               return;
          }

          const walletName = this.currentWallet.name || 'selected';
          const firewallCount = this.existingFirewalls.length;

          let message: string;

          if (firewallCount === 0) {
               message = `<code>${walletName}</code> wallet has no firewalls.`;
          } else {
               const firewallDescription = firewallCount === 1 ? 'firewall' : 'firewalls';
               message = `<code>${walletName}</code> wallet has ${firewallCount} ${firewallDescription}.`;
          }

          this.txUiService.setInfoMessage(message);
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
          if (all) {
               this.useMultiSign = false;
               this.isRegularKeyAddress = false;
               this.isMptFlagModeEnabled = false;
               this.amountField.set('');
               this.destinationTagField.set('');
          }

          this.isMemoEnabled = false;
          this.memoField = '';
          this.useMultiSign = false;

          this.selectedTicket = '';
          this.selectedSingleTicket = '';
          this.isTicket = false;
          // this.isTicketEnabled = false;
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
}
