import { OnInit, Component, inject, DestroyRef, signal, computed, ChangeDetectionStrategy, ViewChild, effect, AfterViewInit } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { UtilsService } from '../../services/util-service/utils.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { JsonEditorComponent } from '../json-editor/json-editor.component';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { CheckUtilService } from '../../services/checks/check-util/check-util.service';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { MptUtilService } from '../../services/mpt-service/mpt-util/mpt-util.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { switchMap, from } from 'rxjs';
import { MptOrchestratorServiceService } from '../../services/mpt-service/mpt-orchestrator/mpt-orchestrator.service.service';

@Component({
     selector: 'app-mpt',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent, JsonEditorComponent],
     animations: [
          trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])]),
          trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(-20px)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))])]),
     ],
     templateUrl: './mpt.component.html',
     styleUrl: './mpt.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptComponent extends PerformanceBaseComponent implements OnInit, AfterViewInit {
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
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly checkTransactionOrchestrator = inject(CheckTransactionOrchestrator);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly mptOrchestratorServiceService = inject(MptOrchestratorServiceService);

     @ViewChild('jsonEditor') jsonEditor!: JsonEditorComponent;
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');

     activeTab = signal<'create' | 'authorize' | 'unauthorize' | 'send' | 'lock' | 'unlock' | 'clawback' | 'destroy'>('create');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     selectedWalletIndex = signal<number>(0);
     existingMpts = signal<any[]>([]);
     existingMptsCollapsed = signal<boolean>(false);
     outstandingIOUCollapsed = signal<boolean>(false);
     XLS89_TEMPLATE = signal<string>(`{
  "t": "TBILL",
  "n": "T-Bill Yield Token",
  "d": "A yield-bearing stablecoin backed by short-term U.S. Treasuries and money market instruments.",
  "i": "example.org/tbill-icon.png",
  "ac": "rwa",
  "as": "treasury",
  "in": "Example Yield Co.",
  "us": [
    {
      "u": "exampleyield.co/tbill",
      "c": "website",
      "t": "Product Page"
    },
    {
      "u": "exampleyield.co/docs",
      "c": "docs",
      "t": "Yield Token Docs"
    }
  ],
  "ai": {
    "interest_rate": "5.00%",
    "interest_type": "variable",
    "yield_source": "U.S. Treasury Bills",
    "maturity_date": "2045-06-30",
    "cusip": "912796RX0"
  }
}`);
     monacoOptions = {
          theme: 'vs',
          language: 'json',
          minimap: { enabled: false },
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          scrollBeyondLastLine: false,
     };

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

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const explorerBase = this.txUiService.explorerUrl();
          const address = wallet.address;

          const mpts = this.existingMpts();
          const count = mpts.length;

          const links = count > 0 ? `<a href="${explorerBase}account/${address}/mpts/owned" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View MPTs</a>` : '';

          const mptsToShow = this.infoPanelExpanded()
               ? this.existingMpts().map(m => {
                      // Safely decode the metadata (handle cases where it's missing/invalid)
                      let decodedMetadata;

                      try {
                           if (m.MPTokenMetadata) {
                                decodedMetadata = xrpl.decodeMPTokenMetadata(m.MPTokenMetadata) as any; // ← quick & dirty
                           }
                      } catch (error) {
                           console.warn('Failed to decode MPTokenMetadata:', error);
                      }

                      console.log('decodedMetadata?.uris: ', decodedMetadata?.uris);

                      return {
                           mpt_issuance_id: m.mpt_issuance_id || 'We have issues',
                           id: m.id || 'We have big issues',
                           amount: m.amount,
                           isHolder: m.isHolder,
                           maxAmount: m.MaximumAmount,
                           outstanding: m.OutstandingAmount,
                           transferFee: m.TransferFee,
                           flags: this.mptUtilService.decodeMptFlagsForUi(m.Flags || 0),

                           // New clean fields - easy to use in template
                           ticker: decodedMetadata?.ticker ? decodedMetadata?.ticker : 'N/A',
                           usefulLinks: (decodedMetadata?.uris || []).map((link: { uri: any; u: any; title: any; t: any; c: any; category: any }) => ({
                                uri: link.uri || link.u || '',
                                title: link.title || link.t || link.c || 'Link',
                                category: link.category || '',
                           })),

                           // Optional: pre-formatted HTML string for displaying links nicely
                           linkHtml:
                                (decodedMetadata?.uris || []).length > 0
                                     ? (decodedMetadata?.uris || [])
                                            .map(
                                                 (link: { u: any; t: any; c: any }) => `
                <a href="${link.u}" target="_blank" rel="noopener noreferrer" class="mpt-link">${link.t || link.c || 'Link'}</a>`
                                            )
                                            .join(' • ')
                                     : 'No links provided',

                           // If you still want the full original JSON string (for debugging)
                           MPTokenMetadataFull: JSON.stringify(decodedMetadata, null, '\t'),
                      };
                 })
               : [];

          return {
               walletName,
               mptCount: count,
               mptsToShow,
               links,
          };
     });

     // MPT Dropdown Items
     mptItems = computed(() => {
          const t = this.existingMpts().map(m => {
               const type = m.LedgerEntryType === 'MPToken' ? 'MPToken' : 'MPTokenIssuance';
               let isHolder = false;
               if (type === 'MPToken') {
                    isHolder = true;
               }
               const amount = isHolder ? m.MPTAmount || '0' : m.OutstandingAmount || '0';

               const displayAmount = amount === '0' ? '0' : amount;

               return {
                    id: m.mpt_issuance_id ? m.mpt_issuance_id : m.id,
                    // display: `MPT • ${displayAmount} ${isHolder ? 'held' : 'issued'} • ${isHolder ? `${m.MaximumAmount} outstanding` : 'issued'}`,
                    display: `MPT • ${displayAmount} ${isHolder ? 'held' : 'issued'}`,
                    secondary: m.mpt_issuance_id ? m.mpt_issuance_id.slice(0, 15) + '...' + m.mpt_issuance_id.slice(-10) : m.id.slice(0, 12) + '...' + m.id.slice(-10),
                    isCurrentAccount: false,
                    isCurrentCode: false,
                    isCurrentToken: false,
               };
          });
          return t;
     });

     selectedMptItem = computed(() => {
          const id = this.txUiService.mptIssuanceIdField();
          if (!id) return null;
          return this.mptItems().find(i => i.id === id) || null;
     });

     metadataByteLength = computed(() => {
          const meta = this.txUiService.metaDataField().trim();
          if (!meta) return 0;

          try {
               // Convert to hex (same as xrpl.convertStringToHex does)
               const hex = xrpl.convertStringToHex(meta);
               return hex.length / 2; // hex string: 2 chars = 1 byte
          } catch {
               return 0;
          }
     });

     metadataIsValid = computed(() => {
          return this.metadataByteLength() <= 1024;
     });

     onMptSelected(item: SelectItem | null) {
          this.txUiService.mptIssuanceIdField.set(item?.id || '');
     }

     constructor() {
          super();

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
          this.transactionDropdownService.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.txUiService.metaDataField.set(this.XLS89_TEMPLATE());
          this.txUiService.clearAllOptions();
     }

     ngAfterViewInit(): void {
          // Small delay to ensure the editor is fully initialized
          setTimeout(() => {
               this.jsonEditor.format();
          }, 0);
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.();
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.toastService.error('');
                    this.txUiService.setInfoMessage('');
               }
          });

          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
          });

          this.walletManagerService.selectedIndex$
               .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    switchMap(() => {
                         this.txUiService.clearAllOptions();
                         this.clearFields(true);
                         return from(this.getMptDetails(false));
                    })
               )
               .subscribe();
     }

     private selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) {
               return; // prevent re-processing the same wallet
          }

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

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

     onMptSelect(selected: any) {
          if (selected) {
               this.txUiService.mptIssuanceIdField.set(selected.mpt_issuance_id);
          }
     }

     toggleExistingMpts() {
          this.existingMptsCollapsed.set(!this.existingMptsCollapsed);
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

     async setTab(tab: 'create' | 'authorize' | 'unauthorize' | 'send' | 'lock' | 'unlock' | 'clawback' | 'destroy'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          this.clearFields(true);
          if (this.hasWallets()) {
               await this.getMptDetails(true);
          }
     }

     async getMptDetails(forceRefresh = false): Promise<void> {
          await this.measure('getMptDetails', true, async () => {
               try {
                    this.txUiService.clearAllOptionsAndMessages();
                    this.txUiService.resetCurrentStepToIdle();

                    if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) return this.toastService.error('Please select a wallet.', AppConstants.TOAST.ERROR);

                    const { wallet, accountInfo, accountObjects } = await this.measure('getChecks:prepareTxEnvironment', false, async () =>
                         this.txEnvironmentService.prepareTxEnvironment({
                              includeAccountInfo: true,
                              includeAccountObject: true,
                              forceRefresh: forceRefresh,
                         })
                    );

                    if (!accountInfo || !accountObjects) {
                         throw new Error('Failed to fetch account information');
                    }

                    await this.measure('getChecks:processAndUpdate', false, async () => {
                         this.existingMpts.set(this.mptUtilService.getMpts(accountObjects, wallet.classicAddress));

                         this.acccountDataService.refreshUiState(wallet, accountInfo, accountObjects);
                    });
               } catch (error: any) {
                    console.error('Error in getMptDetails:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async createMpt() {
          await this.withPerf('createMpt', async () => {
               try {
                    this.txUiService.resetCurrentStepToIdle();
                    this.txUiService.clearAllOptionsAndMessages();

                    if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) return this.toastService.error('Please select a wallet.', AppConstants.TOAST.ERROR);

                    const byteLength = this.metadataByteLength();

                    if (byteLength > 1024) return this.toastService.error(`Token Metadata exceeds maximum size: ${byteLength} bytes (limit: 1024 bytes)`, AppConstants.TOAST.ERROR);

                    if (byteLength > 0 && !this.metadataIsValid()) return this.toastService.error('Invalid metadata encoding', AppConstants.TOAST.ERROR);

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const { client, accountInfo, accountObjects, fee, currentLedger, wallet } = env;

                    if (!accountInfo || !accountObjects) return this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);

                    const flags = this.mptUtilService.getFlagsValue(this.mptUtilService.flags);

                    const result = await this.mptOrchestratorServiceService.executeMptTx('create', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.getTransactionValues(),
                              flags: flags,
                         },
                         extra: {},
                         preFetchedEnv: {
                              client,
                              accountInfo,
                              accountObjects,
                              fee: fee!,
                              currentLedger: currentLedger!,
                              wallet: wallet,
                         },
                    });

                    if (!result.success) return this.toastService.error(result.error || 'Failed to create mpt', AppConstants.TOAST.ERROR);

                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in createMpt:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               }
          });
     }

     async authorizeMpt(authorizeFlag: 'Y' | 'N') {
          await this.withPerf('authorizeMpt', async () => {
               try {
                    this.txUiService.resetCurrentStepToIdle();
                    this.txUiService.clearAllOptionsAndMessages();

                    if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) return this.toastService.error('Please select a wallet.', AppConstants.TOAST.ERROR);

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const { client, accountInfo, accountObjects, fee, currentLedger, wallet } = env;

                    if (!accountInfo || !accountObjects) return this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);

                    const result = await this.mptOrchestratorServiceService.executeMptTx(authorizeFlag === 'N' ? 'unauthorize' : 'authorize', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.getTransactionValues(),
                              authorize: authorizeFlag,
                         },
                         extra: {},
                         preFetchedEnv: {
                              client,
                              accountInfo,
                              accountObjects,
                              fee: fee!,
                              currentLedger: currentLedger!,
                              wallet: wallet,
                         },
                    });

                    if (!result.success) return this.toastService.error(result.error || 'Failed to authorize mpt', AppConstants.TOAST.ERROR);

                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error(`Error creating authorizeMpt: ${error.message}`);
                    this.toastService.error(`Error authorizing Mpt: ${error.message}`, AppConstants.TOAST.ERROR);
               }
          });
     }

     async setMptLockUnlock(locked: 'Y' | 'N') {
          await this.withPerf('setMptLockUnlock', async () => {
               try {
                    this.txUiService.resetCurrentStepToIdle();
                    this.txUiService.clearAllOptionsAndMessages();

                    if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) return this.toastService.error('Please select a wallet.', AppConstants.TOAST.ERROR);

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const { client, accountInfo, accountObjects, fee, currentLedger, wallet } = env;

                    if (!accountInfo || !accountObjects) return this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);

                    const accountIssuerToken = this.mptUtilService.getAllMptTokens(accountObjects);

                    if (!accountIssuerToken) return this.toastService.error(`MPT issuance ID ${this.txUiService.mptIssuanceIdField()} was not issued by ${wallet.classicAddress}.`, AppConstants.TOAST.ERROR);

                    const result = await this.mptOrchestratorServiceService.executeMptTx(locked === 'N' ? 'unlock' : 'lock', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.getTransactionValues(),
                              locked: locked,
                         },
                         extra: {},
                         preFetchedEnv: {
                              client,
                              accountInfo,
                              accountObjects,
                              fee: fee!,
                              currentLedger: currentLedger!,
                              wallet: wallet,
                         },
                    });

                    if (!result.success) return this.toastService.error(result.error || 'Failed mpt locking', AppConstants.TOAST.ERROR);

                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in setMptLocked:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               }
          });
     }

     async sendMpt() {
          await this.withPerf('sendMpt', async () => {
               try {
                    this.txUiService.resetCurrentStepToIdle();
                    this.txUiService.clearAllOptionsAndMessages();

                    if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) return this.toastService.error('Please select a wallet.', AppConstants.TOAST.ERROR);

                    const destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

                    if (!destinationAddress) return this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeDestinationAccountInfo: true,
                         includeDestinationAccountObject: true,
                         destinationAddress,
                    });

                    const { client, accountInfo, accountObjects, destinationAccountObject, fee, currentLedger, wallet } = env;

                    if (!accountInfo || !accountObjects || !destinationAccountObject) return this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);

                    if (!this.mptUtilService.isDestinationAuthorizedForMpt(accountObjects.result.account_objects, destinationAccountObject.result.account_objects, this.txUiService.mptIssuanceIdField())) {
                         return this.toastService.error(`Destination ${destinationAddress} is not authorized to receive this MPT. Please ensure authorization has been completed.`, AppConstants.TOAST.ERROR);
                    }

                    const result = await this.mptOrchestratorServiceService.executeMptTx('send', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.getTransactionValues(),
                              destinationAddress,
                         },
                         extra: {},
                         preFetchedEnv: {
                              client,
                              accountInfo,
                              accountObjects,
                              fee: fee!,
                              currentLedger: currentLedger!,
                              wallet: wallet,
                         },
                    });

                    if (!result.success) return this.toastService.error(result.error || 'Failed to send mpt', AppConstants.TOAST.ERROR);

                    await this.refreshAfterTx(client, wallet, destinationAddress, false);
               } catch (error: any) {
                    console.error('Error in sendMpt:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               }
          });
     }

     async destroyMpt() {
          await this.withPerf('destroyMpt', async () => {
               try {
                    this.txUiService.clearAllOptionsAndMessages();
                    this.txUiService.resetCurrentStepToIdle();

                    if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) return this.toastService.error('Please select a wallet.', AppConstants.TOAST.ERROR);

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                    });

                    const { client, accountInfo, accountObjects, fee, currentLedger, wallet } = env;

                    if (!accountInfo || !accountObjects) return this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);

                    const result = await this.mptOrchestratorServiceService.executeMptTx('destroy', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.getTransactionValues(),
                         },
                         extra: {},
                         preFetchedEnv: {
                              client,
                              accountInfo,
                              accountObjects,
                              fee: fee!,
                              currentLedger: currentLedger!,
                              wallet: wallet,
                         },
                    });

                    if (!result.success) return this.toastService.error(result.error || 'Failed mpt locking', AppConstants.TOAST.ERROR);

                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in destroyMpt:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               }
          });
     }

     async clawbackMpt() {
          await this.withPerf('clawbackMpt', async () => {
               try {
                    this.txUiService.clearAllOptionsAndMessages();
                    this.txUiService.resetCurrentStepToIdle();

                    if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) return this.toastService.error('Please select a wallet.', AppConstants.TOAST.ERROR);

                    // This is the holder address
                    const destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);

                    if (!destinationAddress) return this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);

                    const env = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerIndex: true,
                         includeDestinationAccountInfo: true,
                         includeDestinationAccountObject: true,
                         destinationAddress,
                    });

                    const { client, accountInfo, accountObjects, destinationAccountObject, fee, currentLedger, wallet } = env;

                    if (!accountInfo || !accountObjects || !destinationAccountObject) return this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);

                    const result = await this.mptOrchestratorServiceService.executeMptTx('clawback', {
                         wallet: this.currentWallet(),
                         formValues: {
                              ...this.getTransactionValues(),
                              destinationAddress,
                         },
                         extra: {},
                         preFetchedEnv: {
                              client,
                              accountInfo,
                              accountObjects,
                              fee: fee!,
                              currentLedger: currentLedger!,
                              wallet: wallet,
                         },
                    });

                    if (!result.success) return this.toastService.error(result.error || 'Failed to send mpt', AppConstants.TOAST.ERROR);

                    await this.refreshAfterTx(client, wallet, destinationAddress, false);
               } catch (error: any) {
                    console.error(`Error during clawbackMpt: ${error.message}`);
                    this.toastService.error(`Error during clawback: ${error.message}`, AppConstants.TOAST.ERROR);
               }
          });
     }

     private getTransactionValues() {
          const tokenCountField = this.txUiService.tokenCountField();
          const assetScaleField = this.txUiService.assetScaleField();
          const transferFeeField = this.txUiService.transferFeeField();
          const isSimulate = this.txUiService.isSimulateEnabled();
          const useMultiSign = this.txUiService.useMultiSign();
          const isRegularKeyAddress = this.txUiService.isRegularKeyAddress();
          const regularKeyAddress = this.txUiService.regularKeyAddress();
          const regularKeySeed = this.txUiService.regularKeySeed();
          const multiSignAddress = this.txUiService.multiSignAddress();
          const multiSignSeeds = this.txUiService.multiSignSeeds();
          const mptIssuanceIdField = this.txUiService.mptIssuanceIdField();
          const amount = this.txUiService.amountField();
          return { tokenCountField, isSimulate, useMultiSign, isRegularKeyAddress, regularKeyAddress, regularKeySeed, multiSignAddress, multiSignSeeds, assetScaleField, transferFeeField, mptIssuanceIdField, amount };
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          this.existingMpts.set(this.mptUtilService.getMpts(accountObjects, wallet.classicAddress));
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

     copyMptId(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.txUiService.showToastMessage('MPT Issuance ID copied!');
          });
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     loadXls89Template() {
          this.txUiService.metaDataField.set(JSON.stringify(this.XLS89_TEMPLATE(), null, 2));
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.mptUtilService.flags.canClawback = false;
               this.mptUtilService.flags.canLock = false;
               this.mptUtilService.flags.isRequireAuth = false;
               this.mptUtilService.flags.canTransfer = false;
               this.mptUtilService.flags.canTrade = false;
               this.mptUtilService.flags.canEscrow = false;
          }

          this.selectedDestinationAddress.set('');
          this.txUiService.clearAllOptionsAndMessages();
     }
}
