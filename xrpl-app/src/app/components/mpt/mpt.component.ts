import { OnInit, Component, inject, DestroyRef, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { MPTokenIssuanceCreate, MPTokenIssuanceCreateFlags } from 'xrpl';
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
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface AccountFlags {
     canLock: boolean;
     canClawback: boolean;
     isRequireAuth: boolean;
     canTransfer: boolean;
     canTrade: boolean;
     canEscrow: boolean;
}

interface MPTAmount {
     mpt_issuance_id: string;
     value: string;
}

interface IssuerItem {
     name: string;
     address: string;
}

@Component({
     selector: 'app-mpt',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './mpt.component.html',
     styleUrl: './mpt.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptComponent extends PerformanceBaseComponent implements OnInit {
     private readonly destroyRef = inject(DestroyRef);
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
     checkIdSearchQuery = signal<string>('');

     // Reactive State (Signals)
     activeTab = signal<'create' | 'authorize' | 'unauthorize' | 'send' | 'lock' | 'unlock' | 'clawback' | 'destroy'>('create');
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
     selectedWalletIndex = signal<number>(0);
     isTicketEnabled = signal<boolean>(false);
     existingMpts = signal<any[]>([]);
     existingIOUs = signal<any[]>([]);
     existingMptsCollapsed: boolean = true;
     outstandingIOUCollapsed: boolean = true;
     metaDataField = signal<string>('');
     tokenCountField = signal<string>('');
     assetScaleField = signal<string>('');
     isdepositAuthAddress = signal<boolean>(false);
     isMptFlagModeEnabled = signal<boolean>(false);
     transferFeeField = signal<string>('');
     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');
     private flagValues = {
          canLock: 0x00000002,
          isRequireAuth: 0x00000004,
          canEscrow: 0x00000008,
          canTrade: 0x00000010,
          canTransfer: 0x00000020,
          canClawback: 0x00000040,
     };
     flags: AccountFlags = {
          canLock: false,
          isRequireAuth: false,
          canEscrow: false,
          canTrade: false,
          canClawback: false,
          canTransfer: false,
     };
     isAuthorized = signal<boolean>(false);
     isUnauthorize = signal<boolean>(false);
     lockedUnlock = signal<string>('');
     holderAccount = signal<string>('');
     filterQuery = signal<string>('');

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

     hasWallets = computed(() => this.wallets().length > 0);

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const baseUrl = this.txUiService.explorerUrl();
          const address = wallet.address;

          const mpts = this.existingMpts();
          const count = mpts.length;

          const links = count > 0 ? `<a href="${baseUrl}account/${address}/mpts/owned" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View MPTs</a>` : '';

          const mptsToShow = this.infoPanelExpanded()
               ? this.existingMpts().map(m => ({
                      mpt_issuance_id: m.mpt_issuance_id || 'We have issues',
                      id: m.id || 'We have big issues',
                      amount: m.amount,
                      isHolder: m.isHolder,
                      maxAmount: m.MaximumAmount,
                      outstanding: m.OutstandingAmount,
                      transferFee: m.TransferFee,
                      flags: this.decodeMptFlagsForUi(m.Flags || 0),
                 }))
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
          const t = this.existingMpts()
               // .filter(m => m.mpt_issuance_id) // Only show entries with a valid issuance ID
               .map(m => {
                    const type = m.LedgerEntryType === 'MPToken' ? 'MPToken' : 'MPTokenIssuance';
                    let isHolder = false;
                    if (type === 'MPToken') {
                         isHolder = true;
                    }
                    const amount = isHolder ? m.MPTAmount || '0' : m.OutstandingAmount || '0';

                    const displayAmount = amount !== '0' ? amount : '0';

                    return {
                         id: m.mpt_issuance_id ? m.mpt_issuance_id : m.id,
                         // display: `MPT • ${displayAmount} ${isHolder ? 'held' : 'issued'} • ${isHolder ? `${m.MaximumAmount} outstanding` : 'issued'}`,
                         display: `MPT • ${displayAmount} ${isHolder ? 'held' : 'issued'}`,
                         secondary: m.mpt_issuance_id ? m.mpt_issuance_id.slice(0, 12) + '...' + m.mpt_issuance_id.slice(-10) : m.id.slice(0, 12) + '...' + m.id.slice(-10),
                         isCurrentAccount: false,
                         isCurrentCode: false,
                         isCurrentToken: false,
                    };
               });
          return t;
     });

     selectedMptItem = computed(() => {
          const id = this.mptIssuanceIdField();
          if (!id) return null;
          return this.mptItems().find(i => i.id === id) || null;
     });

     onMptSelected(item: SelectItem | null) {
          this.mptIssuanceIdField.set(item?.id || '');
     }

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
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
                    await this.getMptDetails(true);
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

     onMptSelect(selected: any) {
          if (selected) {
               this.mptIssuanceIdField.set(selected.mpt_issuance_id);
          }
     }

     toggleExistingMpts() {
          this.existingMptsCollapsed = !this.existingMptsCollapsed;
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
          await this.getMptDetails(true);
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getMptDetails(forceRefresh = false): Promise<void> {
          await this.withPerf('getMptDetails', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.getExistingMpts(accountObjects, wallet.classicAddress);

                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getMptDetails:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createMpt() {
          await this.withPerf('createCheck', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, trustLines, checkObjects, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplCache.getAccountObjectsWithType(this.currentWallet().address, true, 'check'), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, null);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validationService.validate('MptCreate', { inputs, client, accountInfo });
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    // let v_flags = 0;
                    // if (this.isMptFlagModeEnabled) {
                    const v_flags = this.getFlagsValue(this.flags);
                    // }

                    const mPTokenIssuanceCreateTx: MPTokenIssuanceCreate = {
                         TransactionType: 'MPTokenIssuanceCreate',
                         Account: wallet.classicAddress,
                         // MaximumAmount: this.tokenCountField,
                         Fee: fee,
                         Flags: v_flags,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, mPTokenIssuanceCreateTx, wallet, accountInfo, 'create');

                    const result = await this.txExecutor.mptCreate(mPTokenIssuanceCreateTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Create MPT successfully!' : 'MPT created successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in createMpt:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async authorizeMpt(authorizeFlag: 'Y' | 'N') {
          await this.withPerf('authorizeMpt', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, null);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    //   inputs.accountInfo = accountInfo;

                    // const errors = await this.validateInputs(inputs, 'authorize');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    const mPTokenAuthorizeTx: xrpl.MPTokenAuthorize = {
                         TransactionType: 'MPTokenAuthorize',
                         Account: wallet.address,
                         MPTokenIssuanceID: this.mptIssuanceIdField(),
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         Fee: fee,
                    };

                    console.log('authorizeFlag', authorizeFlag);
                    if (authorizeFlag === 'N') {
                         mPTokenAuthorizeTx.Flags = xrpl.MPTokenAuthorizeFlags.tfMPTUnauthorize;
                    }

                    await this.setTxOptionalFields(client, mPTokenAuthorizeTx, wallet, accountInfo, 'generate');

                    const result = await this.txExecutor.mptAuthUnauth(mPTokenAuthorizeTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    if (authorizeFlag === 'Y') {
                         this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? `Simulated MPT Authorized successfully!` : `MPT Authorized successfully!`;
                    } else {
                         this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? `Simulated MPT Unauthorized successfully!` : `MPT Unauthorized successfully!`;
                    }

                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in authorizeMpt:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async setMptLockUnlock(locked: 'Y' | 'N') {
          await this.withPerf('setMptLockUnlock', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, mptokenObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    this.utilsService.logAccountInfoObjects(accountInfo, null);
                    this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
                    this.utilsService.logObjects('mptokenObjects', mptokenObjects);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validateInputs(inputs, 'setMptLocked');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    console.debug(`MPT Account Objects: `, mptokenObjects);
                    const mptokens = mptokenObjects.result.account_objects.filter((o: any) => o.LedgerEntryType === 'MPTToken' || o.LedgerEntryType === 'MPTokenIssuance' || o.LedgerEntryType === 'MPToken');
                    console.debug(`MPT Objects: `, mptokens);
                    console.debug('MPT Issuance ID:', this.mptIssuanceIdField());

                    const accountIssuerToken = mptokens.some((obj: any) => obj.mpt_issuance_id === this.mptIssuanceIdField());

                    if (!accountIssuerToken) {
                         return this.txUiService.setError(`ERROR: MPT issuance ID ${this.mptIssuanceIdField()} was not issued by ${wallet.classicAddress}.`);
                    }

                    const mPTokenIssuanceSetTx: xrpl.MPTokenIssuanceSet = {
                         TransactionType: 'MPTokenIssuanceSet',
                         Account: wallet.classicAddress,
                         MPTokenIssuanceID: this.mptIssuanceIdField(),
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         Fee: fee,
                    };

                    await this.setTxOptionalFields(client, mPTokenIssuanceSetTx, wallet, accountInfo, 'lock');

                    const result = await this.txExecutor.mptLockUnlock(mPTokenIssuanceSetTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    if (locked === 'Y') {
                         this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? `Simulated MPT Lock successfully!` : `MPT Lock successfully!`;
                    } else {
                         this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? `Simulated MPT Unlock successfully!` : `MPT Unlock successfully!`;
                    }
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in setMptLocked:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async sendMpt() {
          await this.withPerf('sendMpt', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();

                    const [accountInfo, accountObjects, destObjects, fee, currentLedger, serverInfo] = await Promise.all([
                         this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                         this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
                         this.xrplService.getAccountObjects(client, destinationAddress, 'validated', ''),
                         this.xrplService.calculateTransactionFee(client),
                         this.xrplService.getLastLedgerIndex(client),
                         this.xrplService.getXrplServerInfo(client, 'current', ''),
                    ]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
                    // this.utilsService.logObjects('destObjects', destObjects);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validateInputs(inputs, 'send');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    // Check if destination can hold the MPT
                    if (!destObjects?.result?.account_objects) {
                         return this.txUiService.setError(`ERROR: Unable to fetch account objects for destination ${destinationAddress}`);
                    }

                    const walletMptTokens = accountObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'MPTokenIssuance');
                    console.debug(`Wallet MPT Tokens:`, walletMptTokens);
                    console.debug('MPT Issuance ID:', this.mptIssuanceIdField());
                    const walletMptToken = walletMptTokens.find((obj: any) => obj.mpt_issuance_id === this.mptIssuanceIdField());

                    const mptTokens = destObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'MPToken');
                    console.debug(`Destination MPT Tokens:`, mptTokens);
                    console.debug('MPT Issuance ID:', this.mptIssuanceIdField());
                    const authorized = mptTokens.some((obj: any) => obj.MPTokenIssuanceID === this.mptIssuanceIdField());

                    if (!authorized) {
                         return this.txUiService.setError(`ERROR: Destination ${destinationAddress} is not authorized to receive this MPT (issuance ID ${this.mptIssuanceIdField()}). Please ensure authorization has been completed.`);
                    }

                    if (walletMptToken) {
                         const decodedFlags = this.decodeMPTFlags((walletMptToken as any).Flags);
                         const authorized = decodedFlags.some((obj: any) => obj.MPTokenIssuanceID === 'tfMPTRequireAuth');
                         if (authorized) {
                              // Since no specific authorized flag on MPToken, assume existence after proper auth process suffices
                              // If needed, user can rely on simulation or submission error
                              console.warn('MPT requires authorization; assuming existence of MPToken entry indicates approval.');
                         }
                    }

                    const sendMptPaymentTx: xrpl.Payment = {
                         TransactionType: 'Payment',
                         Account: wallet.classicAddress,
                         Amount: {
                              mpt_issuance_id: this.mptIssuanceIdField(),
                              value: this.amountField(),
                         },
                         Destination: destinationAddress,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         Fee: fee,
                    };

                    await this.setTxOptionalFields(client, sendMptPaymentTx, wallet, accountInfo, 'send');

                    const result = await this.txExecutor.mptSend(sendMptPaymentTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated MPT sent successfully!' : 'MPT sent successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in sendMpt:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async destroyMpt() {
          await this.withPerf('destroyMpt', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, destObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    this.utilsService.logAccountInfoObjects(accountInfo, null);
                    this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
                    this.utilsService.logObjects('destObjects', destObjects);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validateInputs(inputs, 'delete');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
                    // }

                    const mPTokenIssuanceDestroyTx: xrpl.MPTokenIssuanceDestroy = {
                         TransactionType: 'MPTokenIssuanceDestroy',
                         Account: wallet.classicAddress,
                         MPTokenIssuanceID: this.mptIssuanceIdField(),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, mPTokenIssuanceDestroyTx, wallet, accountInfo, 'generate');

                    const result = await this.txExecutor.mptDestroy(mPTokenIssuanceDestroyTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated MPT destroy successfully!' : 'MPT destroyed successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in destroyMpt:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async clawbackMpt() {
          await this.withPerf('clawbackMpt', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();

                    const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);

                    // inputs.destination = resolvedDestination;
                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validateInputs(inputs, 'clawback');
                    // if (errors.length > 0) {
                    //      return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    const amount: MPTAmount = {
                         value: this.amountField(),
                         mpt_issuance_id: this.mptIssuanceIdField(),
                    };

                    // For clawback, you'll need additional fields like:
                    // - MPToken ID (the token to claw back)
                    // - Amount to claw back
                    // - From address (the holder's address)
                    const mptClawbackTx: xrpl.Clawback = {
                         TransactionType: 'Clawback',
                         Account: wallet.classicAddress,
                         Amount: amount,
                         Holder: destinationAddress,
                         Fee: fee,
                         Flags: 0, // Typically 0 for clawback unless specific flags are needed
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, mptClawbackTx, wallet, accountInfo, 'clawback');

                    const result = await this.txExecutor.mptClawback(mptClawbackTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated MPT clawback successfully!' : 'MPT clawback successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in clawbackMpt:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private getExistingMpts(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const issuances = new Map<string, any>();
          const holdings: any[] = [];

          // 1. Collect all issuances and holdings
          (accountObjects.result.account_objects ?? []).forEach(obj => {
               const o = obj as any;
               if (o.LedgerEntryType === 'MPTokenIssuance') {
                    issuances.set(o.MPTokenIssuanceID, o);
               } else if (o.LedgerEntryType === 'MPToken' && o.Account === classicAddress) {
                    holdings.push(o);
               }
          });

          const result: any[] = [];

          // 2. Add holdings (you hold tokens)
          for (const holding of holdings) {
               const issuance = issuances.get(holding.MPTokenIssuanceID) || {};
               result.push({
                    LedgerEntryType: 'MPToken',
                    id: holding.index,
                    mpt_issuance_id: holding.MPTokenIssuanceID,
                    MPTAmount: holding.MPTAmount || '0',
                    OutstandingAmount: issuance.OutstandingAmount || '0',
                    MaximumAmount: issuance.MaximumAmount || 'Unlimited',
                    TransferFee: issuance.TransferFee || '0',
                    MPTokenMetadata: issuance.MPTokenMetadata || 'N/A',
                    Flags: holding.Flags || 0,
                    AssetScale: issuance.AssetScale || 'N/A',
                    Issuer: issuance.Account || 'Unknown',
                    isHolder: true,
                    amount: holding.MPTAmount || '0',
               });
          }

          // 3. Add issuances that you own (even if you hold 0)
          for (const [id, issuance] of issuances.entries()) {
               const alreadyAddedAsHolder = result.some(r => r.mpt_issuance_id === id);
               if (!alreadyAddedAsHolder) {
                    result.push({
                         LedgerEntryType: 'MPTokenIssuance',
                         id: issuance.index,
                         mpt_issuance_id: issuance.mpt_issuance_id,
                         MPTAmount: '0',
                         OutstandingAmount: issuance.OutstandingAmount || '0',
                         MaximumAmount: issuance.MaximumAmount || 'Unlimited',
                         TransferFee: issuance.TransferFee || '0',
                         MPTokenMetadata: issuance.MPTokenMetadata || 'N/A',
                         Flags: issuance.Flags || 0,
                         AssetScale: issuance.AssetScale || 'N/A',
                         Issuer: issuance.Account || 'Unknown',
                         isHolder: false,
                         amount: issuance.OutstandingAmount || '0',
                    });
               }
          }

          this.existingMpts.set(result);
          this.utilsService.logObjects('existingMpts (holders + issuers)', result);
     }

     toggleFlag(key: 'canLock' | 'isRequireAuth' | 'canEscrow' | 'canClawback' | 'canTransfer' | 'canTrade') {
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          if (this.flags.canClawback) sum |= this.flagValues.canClawback;
          if (this.flags.canLock) sum |= this.flagValues.canLock;
          if (this.flags.isRequireAuth) sum |= this.flagValues.isRequireAuth;
          if (this.flags.canEscrow) sum |= this.flagValues.canEscrow;
          if (this.flags.canTrade) sum |= this.flagValues.canTrade;
          if (this.flags.canTransfer) sum |= this.flagValues.canTransfer;

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     private getFlagsValue(flags: AccountFlags): number {
          let v_flags = 0;
          if (flags.canLock) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanLock; // 2
          }
          if (flags.isRequireAuth) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTRequireAuth; // 4;
          }
          if (flags.canEscrow) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanEscrow; // 8;
          }
          if (flags.canTrade) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanTrade; // 16;
          }
          if (flags.canTransfer) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanTransfer; // 32;
          }
          if (flags.canClawback) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanClawback; // 64;
          }
          return v_flags;
     }

     decodeMPTFlags(flags: number) {
          const MPT_FLAGS = {
               tfMPTCanLock: 0x00000002,
               tfMPTCanEscrow: 0x00000004,
               tfMPTCanTrade: 0x00000008,
               tfMPTCanClawback: 0x00000010,
               tfMPTRequireAuth: 0x00000020,
               tfMPTImmutable: 0x00000040,
               tfMPTDisallowIncoming: 0x00000080,
          };

          const activeFlags = [];
          for (const [name, value] of Object.entries(MPT_FLAGS)) {
               if ((flags & value) !== 0) {
                    activeFlags.push(name);
               }
          }
          return activeFlags;
     }

     // Add this to your component class
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

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, mptTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(mptTx, ticket, true);
               }
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(mptTx, this.txUiService.memoField());
          }

          if (this.assetScaleField && this.activeTab() === 'create') {
               const assetScale = parseInt(this.assetScaleField());
               if (assetScale < 0 || assetScale > 15) {
                    throw new Error('Tick size must be between 3 and 15.');
               }
               mptTx.AssetScale = assetScale;
          }

          if (this.flags.canTransfer) {
               // In setTxOptionalFields
               if (!this.transferFeeField()?.trim() && this.flags.canTransfer) {
                    throw new Error('Transfer Fee is required when CanTransfer is enabled');
               }
               if (this.transferFeeField) {
                    // TransferFee is in 1/1000th of a percent (basis points / 10), so for 1%, input 1000
                    const transferFee = Number.parseInt(this.transferFeeField());
                    if (isNaN(transferFee) || transferFee < 0 || transferFee > 50000) {
                         throw new Error('Transfer Fee must be a number between 0 and 50,000 (for 0% to 50%).');
                    }
                    mptTx.TransferFee = transferFee;
               }
          }

          if (this.tokenCountField && this.activeTab() === 'create') {
               mptTx.MaximumAmount = this.tokenCountField;
          }

          if (this.metaDataField && this.activeTab() === 'create') {
               mptTx.MPTokenMetadata = xrpl.convertStringToHex(this.metaDataField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
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

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;');
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.tokenCountField.set('');
               this.assetScaleField.set('');
               this.transferFeeField.set('');
               this.mptIssuanceIdField.set('');
               this.metaDataField.set('');
               this.amountField.set('');
               this.flags.canClawback = false;
               this.flags.canLock = false;
               this.flags.isRequireAuth = false;
               this.flags.canTransfer = false;
               this.flags.canTrade = false;
               this.flags.canEscrow = false;
               this.destinationTagField.set('');
          }

          this.amountField.set('');
          this.mptIssuanceIdField.set('');
          this.ticketSequence.set('');
          this.txUiService.clearAllOptionsAndMessages();
     }
}
