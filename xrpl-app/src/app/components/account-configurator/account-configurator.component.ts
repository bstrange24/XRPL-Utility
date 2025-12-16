import { OnInit, Component, ChangeDetectorRef, inject, computed, DestroyRef, signal } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AccountSet, DepositPreauth, SignerListSet } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
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
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';

interface ValidationInputs {
     selectedAccount?: string;
     senderAddress?: string;
     seed?: string;
     accountInfo?: any;
     setFlags?: any;
     clearFlags?: any;
     destination?: string;
     amount?: string;
     flags?: any;
     depositAuthAddress?: string;
     depositAuthAddresses?: any;
     nfTokenMinterAddress?: string;
     tickSize?: string;
     transferRate?: string;
     domain?: string;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeyAccount?: string;
     regularKeyAccountSeeds?: string;
     regularKeySeed?: string;
     isMultiSign?: boolean;
     useMultiSign?: boolean;
     multiSignSeeds?: string;
     multiSignAddresses?: string;
     isTicket?: boolean;
     ticketSequence?: string;
     selectedSingleTicket?: string;
     signerQuorum?: number;
     signers?: { account: string; seed: string; weight: number }[];
}

interface SignerEntry {
     Account: string;
     SignerWeight: number;
     SingnerSeed: string;
}

interface SignerEntry {
     account: string;
     seed: string;
     weight: number;
}

interface AccountFlags {
     asfRequireDest: boolean;
     asfRequireAuth: boolean;
     asfDisallowXRP: boolean;
     asfDisableMaster: boolean;
     asfNoFreeze: boolean;
     asfGlobalFreeze: boolean;
     asfDefaultRipple: boolean;
     asfDepositAuth: boolean;
     asfAuthorizedNFTokenMinter: boolean;
     asfDisallowIncomingNFTokenOffer: boolean;
     asfDisallowIncomingCheck: boolean;
     asfDisallowIncomingPayChan: boolean;
     asfDisallowIncomingTrustline: boolean;
     asfAllowTrustLineClawback: boolean;
     asfAllowTrustLineLocking: boolean;
}

@Component({
     selector: 'app-account-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionOptionsComponent, TransactionPreviewComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './account-configurator.component.html',
     styleUrl: './account-configurator.component.css',
     // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountConfiguratorComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly xrplTransactions = inject(XrplTransactionService);
     public readonly cdr = inject(ChangeDetectorRef);

     // Destination Dropdown
     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     checkIdSearchQuery = signal<string>('');

     // Reactive State (Signals)
     activeTab = signal<'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey' | 'delete'>('modifyAccountFlags');
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

     // Form fields
     memoField = signal<string>('');
     isMemoEnabled = signal<boolean>(false);
     useMultiSign = signal<boolean>(false);
     isRegularKeyAddress = signal<boolean>(false);
     isTicket = signal<boolean>(false);
     selectedSingleTicket = signal<string>('');
     selectedTickets: string[] = [];
     multiSelectMode = signal<boolean>(false);
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     selectedTicket = signal<string>('');

     // Multi-sign & Regular Key
     multiSignAddress = signal<string>('');
     multiSignSeeds = signal<string>('');
     signerQuorum = signal<number>(0);
     regularKeyAddress = signal<string>('');
     regularKeySeed = signal<string>('');
     multiSigningEnabled = signal<boolean>(false);
     regularKeySigningEnabled = signal<boolean>(false);
     ticketArray: string[] = [];
     masterKeyDisabled = signal<boolean>(false);
     accountInfo: any;

     // Account Specific
     configurationType: 'holder' | 'exchanger' | 'issuer' | null = null;
     isMultiSign = signal<boolean>(false);
     depositAuthEnabled = signal<boolean>(false);
     isNFTokenMinterEnabled = signal<boolean>(false);
     nfTokenMinterAddress = signal<string>('');
     isUpdateMetaData = signal<boolean>(false);
     isHolderConfiguration = signal<boolean>(false);
     isExchangerConfiguration = signal<boolean>(false);
     isIssuerConfiguration = signal<boolean>(false);
     isAuthorizedNFTokenMinter = signal<boolean>(false);
     depositAuthAddress = signal<string>('');
     tickSize = signal<string>('');
     transferRate = signal<string>('');
     isMessageKey = signal<boolean>(false);
     domain = signal<string>('');
     avatarUrl = signal<string>('');
     readonly FLAG_VALUES = xrpl.AccountSetAsfFlags;
     flags: AccountFlags = {
          asfRequireDest: false,
          asfRequireAuth: false,
          asfDisallowXRP: false,
          asfDisableMaster: false,
          asfNoFreeze: false,
          asfGlobalFreeze: false,
          asfDefaultRipple: false,
          asfDepositAuth: false,
          asfAuthorizedNFTokenMinter: false,
          asfDisallowIncomingNFTokenOffer: false,
          asfDisallowIncomingCheck: false,
          asfDisallowIncomingPayChan: false,
          asfDisallowIncomingTrustline: false,
          asfAllowTrustLineClawback: false,
          asfAllowTrustLineLocking: false,
     };

     depositAuthAddresses: { account: string }[] = [{ account: '' }];
     userEmail = signal<string>('');
     accountFlagsConfig = [
          {
               key: 'asfRequireDest',
               title: 'Require Destination Tag',
               desc: 'Require a destination tag to send transactions to this account.',
          },
          {
               key: 'asfRequireAuth',
               title: 'Require Trust Line Auth',
               desc: 'Require authorization for users to hold balances issued by this address can only be enabled if the address has no trust lines connected to it.',
          },
          {
               key: 'asfDisallowXRP',
               title: 'Disallow XRP',
               desc: 'XRP should not be sent to this account.',
          },
          {
               key: 'asfDisableMaster',
               title: 'Disable Master Key',
               desc: 'Disallow use of the master key pair. Can only be enabled if the account has configured another way to sign transactions, such as a Regular Key or a Signer List.',
          },
          {
               key: 'asfNoFreeze',
               title: 'No Freeze',
               desc: 'Permanently give up the ability to freeze individual trust lines or disable Global Freeze. This flag can never be disabled after being enabled.',
          },
          {
               key: 'asfGlobalFreeze',
               title: 'Global Freeze',
               desc: 'Freeze all assets issued by this account.',
          },
          {
               key: 'asfDefaultRipple',
               title: 'Default Ripple',
               desc: "Enable rippling on this account's trust lines by default.",
          },
          {
               key: 'asfDepositAuth',
               title: 'Deposit Authorization',
               desc: 'Enable Deposit Authorization on this account.',
          },
          {
               key: 'asfAuthorizedNFTokenMinter',
               title: 'Authorized NFToken Minter',
               desc: 'Allow another account to mint and burn tokens on behalf of this account.',
          },
          {
               key: 'asfDisallowIncomingNFTokenOffer',
               title: 'Disallow Incoming NFToken Offer',
               desc: 'Disallow other accounts from creating incoming NFTOffers.',
          },
          {
               key: 'asfDisallowIncomingCheck',
               title: 'Disallow Incoming Check',
               desc: 'Disallow other accounts from creating incoming Checks.',
          },
          {
               key: 'asfDisallowIncomingPayChan',
               title: 'Disallow Incoming Payment Channel',
               desc: 'Disallow other accounts from creating incoming PayChannels.',
          },
          {
               key: 'asfDisallowIncomingTrustline',
               title: 'Disallow Incoming Trustline',
               desc: 'Disallow other accounts from creating incoming Trustlines.',
          },
          {
               key: 'asfAllowTrustLineClawback',
               title: 'Allow TrustLine Clawback',
               desc: 'Permanently gain the ability to claw back issued IOUs.',
          },
          {
               key: 'asfAllowTrustLineLocking',
               title: 'Allow TrustLine Locking',
               desc: 'Issuers allow their IOUs to be used as escrow amounts.',
          },
     ] as const;

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
                    await this.getAccountDetails(true);
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

     async setTab(tab: 'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey' | 'delete'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          this.clearFields(true);
          if (this.hasWallets()) {
               await this.getAccountDetails(true);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     validateQuorum() {
          const totalWeight = this.signers.reduce((sum: any, s: { weight: any }) => sum + (s.weight || 0), 0);
          if (this.signerQuorum() > totalWeight) {
               this.signerQuorum.set(totalWeight);
          }
     }

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign(), this.signers, (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.txUiService.setError(`${error.message}`);
          }
     }

     onConfigurationChange() {
          this.resetFlags();

          const type = this.configurationType || '';
          const configActions: Record<string, () => void> = {
               holder: () => this.setHolder(),
               exchanger: () => this.setExchanger(),
               issuer: () => this.setIssuer(),
          };

          configActions[type]?.();
          this.updateFlagTotal();

          console.log('Configuration changed to:', this.configurationType);
          this.cdr.detectChanges();
     }

     toggleConfigurationTemplate() {
          this.cdr.detectChanges();
     }

     addSigner() {
          this.signers.push({ account: '', seed: '', weight: 1 });
     }

     addDepositAuthAddresses() {
          this.depositAuthAddresses.push({ account: '' });
     }

     removeSigner(index: number) {
          this.signers.splice(index, 1);
     }

     removeDepositAuthAddresses(index: number) {
          this.depositAuthAddresses.splice(index, 1);
     }

     onNoFreezeChange() {
          if (this.flags.asfNoFreeze) {
               alert('Prevent Freezing Trust Lines (No Freeze) cannot be unset!');
          }
     }

     onClawbackChange() {
          if (this.flags.asfAllowTrustLineClawback) {
               alert('Trust Line Clawback cannot be unset!');
          }
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          console.log('Entering getAccountDetails');
          const startTime = Date.now();
          this.txUiService.clearMessages();
          this.txUiService.updateSpinnerMessage(``);
          this.configurationType = null;

          try {
               const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

               const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);
               this.accountInfo = accountInfo;
               const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.txUiService.setError(errors.join('\n• '));
               }

               AppConstants.FLAGS.forEach(flag => {
                    const flagKey = AppConstants.FLAGMAP[flag.name as keyof typeof AppConstants.FLAGMAP];
                    if (flagKey) {
                         const isEnabled = !!accountInfo.result.account_flags?.[flagKey as keyof typeof accountInfo.result.account_flags];
                         const flagName = flag.name as keyof AccountFlags;
                         this.flags[flagName] = isEnabled;
                    }
               });

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.loadSignerList(wallet.classicAddress);
               this.updateTickets(accountObjects);
               this.clearFields(false);
               // this.refreshUiState(wallet, accountInfo, accountObjects);
               // this.updateInfoMessage(accountObjects);
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getAccountDetails:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner.set(false);
               // this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getAccountDetails in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async updateFlags() {
          console.log('Entering updateFlags');
          const startTime = Date.now();
          this.txUiService.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          // const inputs: ValidationInputs = {
          //      selectedAccount: this.currentWallet.address,
          //      seed: this.currentWallet.seed,
          //      isRegularKeyAddress: this.isRegularKeyAddress,
          //      isMultiSign: this.useMultiSign,
          //      regularKeyAddress: this.regularKeyAddress || undefined,
          //      regularKeySeed: this.regularKeySeed || undefined,
          //      multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
          //      multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
          //      isTicket: this.isTicket,
          //      selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
          //      signers: this.signers || undefined,
          //      signerQuorum: this.signerQuorum || undefined,
          // };

          try {
               const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const { setFlags, clearFlags } = this.utilsService.getFlagUpdates(accountInfo.result.account_flags);

               // inputs.accountInfo = accountInfo;
               // inputs.flags = accountInfo.result.account_flags;
               // inputs.setFlags = setFlags;
               // inputs.clearFlags = clearFlags;

               // const errors = await this.validationService.validate('UpdateAccountFlags', { inputs, client, accountInfo });
               // if (errors.length > 0) {
               //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               // }

               this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? 'Simulating Flag Modifications (no changes will be made)...' : 'Submitting Flag Modifications to Ledger...', 200);

               const allFlagResults: any[] = [];

               for (const flag of setFlags) {
                    const result = await this.handleFlagTx(client, wallet, accountInfo, fee, currentLedger, serverInfo, 'SetFlag', flag, this.memoField());
                    allFlagResults.push(result);
                    this.txUiService.setTxResult(result.result);
                    // this.updateTxResult();
               }

               for (const flag of clearFlags) {
                    const result = await this.handleFlagTx(client, wallet, accountInfo, fee, currentLedger, serverInfo, 'ClearFlag', flag, this.memoField());
                    allFlagResults.push(result);
                    this.txUiService.setTxResult(result.result);
                    // this.updateTxResult();
               }

               const succeeded = allFlagResults.filter(r => r.success);
               const failed = allFlagResults.filter(r => !r.success);

               if (succeeded.length > 0) {
                    this.txUiService.successMessage = `${succeeded.length} Flag Transaction(s) Succeeded.`;
                    this.txUiService.successMessage += ` [ ` + this.getFlagNames(succeeded) + ` ]`;
                    this.txUiService.isSuccess = true;
                    succeeded.forEach(h => h.hash && this.txUiService.txHashes.push(h.hash));
               }

               if (failed.length > 0) {
                    this.txUiService.errorMessage = `${failed.length} Flag Transaction(s) Failed.`;
                    this.txUiService.errorMessage += ` [ ` + this.getFlagNames(failed) + ` ]`;
                    this.txUiService.isError = true;
                    failed.forEach(h => h.hash && this.txUiService.txErrorHashes.push(h.hash));
               }

               if (!this.txUiService.isSimulateEnabled()) {
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    // await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
                    // this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    // this.updateInfoMessage(updatedAccountObjects);
                    // this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    // this.updateTickets(updatedAccountObjects);
                    // this.clearFields(false);
                    // this.cdr.detectChanges();
                    await this.refreshAfterTx(client, wallet, null, false);
                    this.updateInfoMessage(updatedAccountObjects);
                    this.cdr.detectChanges();
               }
          } catch (error: any) {
               console.error('Error in updateFlags:', error);
               this.txUiService.errorMessage = `${error.message || 'Unknown error'}`;
          } finally {
               this.txUiService.spinner.set(false);
               // this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving updateFlags in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async updateMetaData() {
          console.log('Entering updateMetaData');
          const startTime = Date.now();
          this.txUiService.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          // const inputs: ValidationInputs = {
          //      selectedAccount: this.currentWallet.address,
          //      seed: this.currentWallet.seed,
          //      tickSize: this.tickSize,
          //      transferRate: this.transferRate,
          //      domain: this.domain,
          //      isRegularKeyAddress: this.isRegularKeyAddress,
          //      isMultiSign: this.useMultiSign,
          //      regularKeyAddress: this.regularKeyAddress || undefined,
          //      regularKeySeed: this.regularKeySeed || undefined,
          //      multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
          //      multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
          //      isTicket: this.isTicket,
          //      selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
          //      signers: this.signers || undefined,
          //      signerQuorum: this.signerQuorum || undefined,
          // };

          try {
               const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               // inputs.accountInfo = accountInfo;

               // const errors = await this.validateInputs(inputs, 'updateMetaData');
               // if (errors.length > 0) {
               //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               // }

               const accountSetTx: AccountSet = await client.autofill({
                    TransactionType: 'AccountSet',
                    Account: wallet.classicAddress,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               });

               await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);

               const updates: (() => void)[] = [];

               if (this.tickSize()) {
                    updates.push(() => this.utilsService.setTickSize(accountSetTx, parseInt(this.tickSize())));
               }

               if (this.transferRate()) {
                    updates.push(() => this.utilsService.setTransferRate(accountSetTx, parseFloat(this.transferRate())));
               }

               if (this.isMessageKey() && wallet.publicKey) {
                    updates.push(() => this.utilsService.setMessageKey(accountSetTx, wallet.publicKey));
               }

               if (this.userEmail()) {
                    updates.push(() => this.utilsService.setEmailHash(accountSetTx, this.userEmail()));
               }

               if (this.domain && this.domain().trim() !== '') {
                    updates.push(() => this.utilsService.setDomain(accountSetTx, this.domain()));
               }

               if (updates.length === 0) {
                    this.txUiService.setWarning(`No meta data fields selected for modification.`);
                    return;
               }

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
                    return this.txUiService.setError('Insufficient XRP to complete transaction');
               }

               updates.forEach(update => update());

               this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? 'Simulating Meta Data Update (no changes will be made)...' : 'Submitting Meta Data Update to Ledger...', 200);

               this.txUiService.setPaymentTx(accountSetTx);
               // this.updatePaymentTx();

               let response: any;

               if (this.txUiService.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign(), this.isRegularKeyAddress(), this.regularKeySeed());

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign(), this.multiSignAddress(), this.multiSignSeeds());

                    if (!signedTx) {
                         return this.txUiService.setError('Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txUiService.setTxResult(response.result);
               // this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.txUiService.setError(userMessage);
               } else {
                    this.txUiService.setSuccess(this.txUiService.result);
               }

               this.isUpdateMetaData.set(true);

               this.txUiService.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.txUiService.isSimulateEnabled()) {
                    this.txUiService.successMessage = 'Updated Meta Data successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    // await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
                    // this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    // this.updateInfoMessage(updatedAccountObjects);
                    // this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    // this.updateTickets(updatedAccountObjects);
                    // this.clearFields(false);
                    // this.cdr.detectChanges();
                    await this.refreshAfterTx(client, wallet, null, false);
                    this.updateInfoMessage(accountObjects);
                    this.cdr.detectChanges();
               } else {
                    this.txUiService.successMessage = 'Simulated Meta Data Update successfully!';
               }
          } catch (error: any) {
               console.error('Error in updateMetaData:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner.set(false);
               // this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving updateMetaData in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async setDepositAuthAccounts(authorizeFlag: 'Y' | 'N'): Promise<void> {
          console.log('Entering setDepositAuthAccounts');
          const startTime = Date.now();
          this.txUiService.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          // const inputs: ValidationInputs = {
          //      selectedAccount: this.currentWallet.address,
          //      seed: this.currentWallet.seed,
          //      isRegularKeyAddress: this.isRegularKeyAddress,
          //      isMultiSign: this.useMultiSign,
          //      regularKeyAddress: this.regularKeyAddress || undefined,
          //      regularKeySeed: this.regularKeySeed || undefined,
          //      multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
          //      multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
          //      isTicket: this.isTicket,
          //      selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
          //      signers: this.signers || undefined,
          //      signerQuorum: this.signerQuorum || undefined,
          // };

          // Split and validate deposit auth addresses
          let depsositAuthEntries = this.createDepsoitAuthEntries();
          const formattedDepsositAuthEntries = this.formatDepositAuthEntries(depsositAuthEntries);
          if (!formattedDepsositAuthEntries.length) {
               return this.txUiService.setError('Deposit Auth address list is empty');
          }

          try {
               const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'deposit_preauth'), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               // inputs.accountInfo = accountInfo;
               // inputs.depositAuthAddresses = formattedDepsositAuthEntries;

               // const errors = await this.validateInputs(inputs, 'setDepositAuthAccounts');
               // if (errors.length > 0) {
               //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               // }

               // Validate each address
               for (const authorizedAddress of formattedDepsositAuthEntries) {
                    // Check for existing preauthorization
                    const alreadyAuthorized = accountObjects.result.account_objects.some((obj: any) => obj.Authorize === authorizedAddress.SignerEntry.Account);
                    if (authorizeFlag === 'Y' && alreadyAuthorized) {
                         return this.txUiService.setError(`Preauthorization already exists for ${authorizedAddress.SignerEntry.Account} (tecDUPLICATE). Use Unauthorize to remove`);
                    }
                    if (authorizeFlag === 'N' && !alreadyAuthorized) {
                         return this.txUiService.setError(`No preauthorization exists for ${authorizedAddress.SignerEntry.Account} to unauthorize`);
                    }
               }

               // Process each address
               for (const authorizedAddress of formattedDepsositAuthEntries) {
                    const depositPreauthTx: DepositPreauth = await client.autofill({
                         TransactionType: 'DepositPreauth',
                         Account: wallet.classicAddress,
                         [authorizeFlag === 'Y' ? 'Authorize' : 'Unauthorize']: authorizedAddress.SignerEntry.Account,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    });

                    await this.setTxOptionalFields(client, depositPreauthTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, depositPreauthTx, fee)) {
                         return this.txUiService.setError('Insufficient XRP to complete transaction');
                    }

                    this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? 'Simulating Setting Deposit Auth (no changes will be made)...' : 'Submitting Deposit Auth Accounts to Ledger...', 200);

                    this.txUiService.setPaymentTx(depositPreauthTx);
                    // this.updatePaymentTx();

                    let response: any;
                    if (this.txUiService.isSimulateEnabled()) {
                         response = await this.xrplTransactions.simulateTransaction(client, depositPreauthTx);
                    } else {
                         const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign(), this.isRegularKeyAddress(), this.regularKeySeed());

                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, depositPreauthTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign(), this.multiSignAddress(), this.multiSignSeeds());

                         if (!signedTx) {
                              console.error(`Failed to sign transaction for deposit authorization `);
                              continue;
                         }

                         response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    }

                    // this.utilsService.logObjects('response', response);
                    // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    this.txUiService.setTxResult(response.result);
                    // this.updateTxResult();

                    // this.utilsService.logObjects('response', response);
                    const isSuccess = this.utilsService.isTxSuccessful(response);
                    if (!isSuccess) {
                         console.warn(`Deposit Authorization failed:`, response);
                         this.txUiService.errorMessage = `Deposit Authorization Transaction(s) Failed`;
                         this.txUiService.setError(this.txUiService.errorMessage);
                         this.txUiService.txErrorHashes.push(response.result.hash ? response.result.hash : response.result.tx_json.hash);
                    } else {
                         const hash = response.result.hash ?? response.result.tx_json.hash;
                         this.txUiService.txHashes.push(hash); // ← push to array
                         console.log(`Deposit Authorization successfully. TxHash:`, response.result.hash ? response.result.hash : response.result.tx_json.hash);
                    }
               }

               this.txUiService.setSuccess(this.txUiService.result);

               if (!this.txUiService.isSimulateEnabled()) {
                    this.txUiService.successMessage = `Deposit Authorization ${authorizeFlag === 'Y' ? 'set' : 'removed'} successfully!`;

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    // await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
                    // this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    // this.updateInfoMessage(updatedAccountObjects);
                    // this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    // this.updateTickets(updatedAccountObjects);
                    // this.clearFields(false);
                    // this.cdr.detectChanges();
                    await this.refreshAfterTx(client, wallet, null, false);
                    this.updateInfoMessage(accountObjects);
                    this.cdr.detectChanges();
               } else {
                    this.txUiService.successMessage = 'Simulated Deposit Authorization successfully!';
               }
          } catch (error: any) {
               console.error('Error in setDepositAuthAccounts:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner.set(false);
               // this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving setDepositAuthAccounts in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async setMultiSign(enableMultiSignFlag: 'Y' | 'N') {
          console.log('Entering setMultiSign');
          const startTime = Date.now();
          this.txUiService.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          // const inputs: ValidationInputs = {
          //      selectedAccount: this.currentWallet.address,
          //      seed: this.currentWallet.seed,
          //      isRegularKeyAddress: this.isRegularKeyAddress,
          //      isMultiSign: this.isMultiSign,
          //      regularKeyAddress: this.regularKeyAddress || undefined,
          //      regularKeySeed: this.regularKeySeed || undefined,
          //      multiSignAddresses: this.isMultiSign ? this.multiSignAddress : undefined,
          //      multiSignSeeds: this.isMultiSign ? this.multiSignSeeds : undefined,
          //      isTicket: this.isTicket,
          //      selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
          //      signers: this.signers || undefined,
          //      signerQuorum: this.signerQuorum || undefined,
          // };

          try {
               const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               // inputs.accountInfo = accountInfo;

               // const errors = await this.validateInputs(inputs, 'setMultiSign');
               // if (errors.length > 0) {
               //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               // }

               // Create array of signer accounts and their weights
               let signerEntries = this.createSignerEntries();

               // Format SignerEntries for XRPL transaction
               const formattedSignerEntries = this.formatSignerEntries(signerEntries);

               // Shared base tx
               const signerListTx: SignerListSet = {
                    TransactionType: 'SignerListSet',
                    Account: wallet.classicAddress,
                    SignerQuorum: 0,
                    Fee: fee,
               };

               await this.setTxOptionalFields(client, signerListTx, wallet, accountInfo);

               signerListTx.LastLedgerSequence = currentLedger + AppConstants.LAST_LEDGER_ADD_TIME;

               console.debug(`enableMultiSignFlag:`, enableMultiSignFlag);
               if (enableMultiSignFlag === 'Y') {
                    signerListTx.SignerEntries = formattedSignerEntries;
                    if (Number(this.signerQuorum) <= 0) {
                         return this.txUiService.setError('Signer Quorum must be greater than 0.');
                    }
                    signerListTx.SignerQuorum = Number(this.signerQuorum);
               }

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, signerListTx, fee)) {
                    return this.txUiService.setError('Insufficent XRP to complete transaction');
               }

               this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? 'Simulating Setting Multi Sign (no changes will be made)...' : 'Submitting Multi-Sign to Ledger...', 200);

               this.txUiService.setPaymentTx(signerListTx);
               // this.updatePaymentTx();

               let response: any;

               if (this.txUiService.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, signerListTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign(), this.isRegularKeyAddress(), this.regularKeySeed());

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, signerListTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign(), this.multiSignAddress(), this.multiSignSeeds());

                    if (!signedTx) {
                         return this.txUiService.setError('Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txUiService.setTxResult(response.result);
               // this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.txUiService.setError(userMessage);
               } else {
                    this.txUiService.setSuccess(this.txUiService.result);
               }

               if (!this.txUiService.isSimulateEnabled()) {
                    this.txUiService.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

                    if (enableMultiSignFlag === 'Y') {
                         this.txUiService.successMessage = 'Set Multi Sign successfully!';
                         this.storageService.set(wallet.classicAddress + 'signerEntries', signerEntries);
                    } else {
                         this.txUiService.successMessage = 'Removed Multi Sign successfully!';
                         // this.storageService.removeValue('signerEntries');
                         this.storageService.removeValue(wallet.classicAddress + 'signerEntries');
                         this.signerQuorum.set(0);
                    }

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    // await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
                    // this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    // this.updateInfoMessage(updatedAccountObjects);
                    // this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    // this.updateTickets(updatedAccountObjects);
                    // this.clearFields(false);
                    // this.cdr.detectChanges();
                    await this.refreshAfterTx(client, wallet, null, false);
                    this.updateInfoMessage(updatedAccountObjects);
                    this.cdr.detectChanges();
               } else {
                    this.txUiService.successMessage = `Simulated Setting Multi Sign ${enableMultiSignFlag === 'Y' ? 'creation' : 'removal'} successfully!`;
               }
          } catch (error: any) {
               console.error('Error in setMultiSign:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner.set(false);
               // this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving setMultiSign in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async setRegularKey(enableRegularKeyFlag: 'Y' | 'N') {
          console.log('Entering setRegularKey');
          const startTime = Date.now();
          this.txUiService.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          // const inputs: ValidationInputs = {
          //      selectedAccount: this.currentWallet.address,
          //      seed: this.currentWallet.seed,
          //      isRegularKeyAddress: this.isRegularKeyAddress,
          //      isMultiSign: this.useMultiSign,
          //      regularKeyAddress: this.regularKeyAddress || undefined,
          //      regularKeySeed: this.regularKeySeed || undefined,
          //      multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
          //      multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
          //      isTicket: this.isTicket,
          //      selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
          //      signers: this.signers || undefined,
          //      signerQuorum: this.signerQuorum || undefined,
          // };

          try {
               const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               // inputs.accountInfo = accountInfo;

               // const errors = await this.validateInputs(inputs, 'setRegularKey');
               // if (errors.length > 0) {
               //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               // }

               if (this.regularKeyAddress() === '' || this.regularKeyAddress() === 'No RegularKey configured for account' || this.regularKeySeed() === '') {
                    return this.txUiService.setError(`Regular Key address and seed must be present`);
               }

               let setRegularKeyTx: xrpl.SetRegularKey = {
                    TransactionType: 'SetRegularKey',
                    Account: wallet.classicAddress,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               if (enableRegularKeyFlag === 'Y') {
                    setRegularKeyTx.RegularKey = this.regularKeyAddress();
               }

               await this.setTxOptionalFields(client, setRegularKeyTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, setRegularKeyTx, fee)) {
                    return this.txUiService.setError('Insufficient XRP to complete transaction');
               }

               this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? `Simulating ${enableRegularKeyFlag === 'Y' ? 'Setting' : 'Remove'} Regular Key (no changes will be made)...` : `Submitting Regular Key ${enableRegularKeyFlag === 'Y' ? 'Set' : 'Removal'} to Ledger...`, 200);

               this.txUiService.setPaymentTx(setRegularKeyTx);
               // this.updatePaymentTx();

               let response: any;

               if (this.txUiService.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, setRegularKeyTx);
               } else {
                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, setRegularKeyTx, false, '', fee, this.useMultiSign(), this.multiSignAddress(), this.multiSignSeeds());

                    if (!signedTx) {
                         return this.txUiService.setError('Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txUiService.setTxResult(response.result);
               // this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.txUiService.setError(userMessage);
               } else {
                    this.txUiService.setSuccess(this.txUiService.result);
               }

               this.txUiService.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.txUiService.isSimulateEnabled()) {
                    const regularKeysAccount = wallet.classicAddress + 'regularKey';
                    const regularKeySeedAccount = wallet.classicAddress + 'regularKeySeed';
                    if (enableRegularKeyFlag === 'Y') {
                         this.txUiService.successMessage = 'Set Regular Key successfully!';
                         this.storageService.set(regularKeysAccount, this.regularKeyAddress());
                         this.storageService.set(regularKeySeedAccount, this.regularKeySeed());
                    } else {
                         this.txUiService.successMessage = 'Removed Regular Key successfully!';
                         this.storageService.removeValue(regularKeysAccount);
                         this.storageService.removeValue(regularKeySeedAccount);
                    }

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    // await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
                    // this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    // this.updateInfoMessage(updatedAccountObjects);
                    // this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    // this.updateTickets(updatedAccountObjects);
                    // this.clearFields(false);
                    // this.cdr.detectChanges();
                    await this.refreshAfterTx(client, wallet, null, false);
                    this.updateInfoMessage(updatedAccountObjects);
                    this.cdr.detectChanges();
               } else {
                    this.txUiService.successMessage = `Simulated ${enableRegularKeyFlag === 'Y' ? 'Set Regular Key' : 'Regular Key removal'} successfully!`;
               }
          } catch (error: any) {
               console.error('Error in setRegularKey:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner.set(false);
               // this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving setRegularKey in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async setNftMinterAddress(enableNftMinter: 'Y' | 'N') {
          console.log('Entering setNftMinterAddress');
          const startTime = Date.now();
          this.txUiService.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          // const inputs: ValidationInputs = {
          //      selectedAccount: this.currentWallet.address,
          //      seed: this.currentWallet.seed,
          //      nfTokenMinterAddress: this.nfTokenMinterAddress,
          //      isRegularKeyAddress: this.isRegularKeyAddress,
          //      isMultiSign: this.useMultiSign,
          //      regularKeyAddress: this.regularKeyAddress || undefined,
          //      regularKeySeed: this.regularKeySeed || undefined,
          //      multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
          //      multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
          //      isTicket: this.isTicket,
          //      selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
          //      signers: this.signers || undefined,
          //      signerQuorum: this.signerQuorum || undefined,
          // };

          // Split and validate NFT minter addresses
          const addressesArray = this.utilsService.getUserEnteredAddress(this.nfTokenMinterAddress);
          if (!addressesArray.length) {
               return this.txUiService.setError('NFT Minter address is empty');
          }

          try {
               const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               // inputs.accountInfo = accountInfo;

               // const errors = await this.validateInputs(inputs, 'setNftMinterAddress');
               // if (errors.length > 0) {
               //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               // }

               try {
                    addressesArray.map((address: any) => accountInfo);
               } catch (error: any) {
                    if (error.data?.error === 'actNotFound') {
                         const missingAddress = addressesArray.find((addr: any) => error.data?.error_message?.includes(addr)) || addressesArray[0];
                         return this.txUiService.setError(`Account ${missingAddress} does not exist (tecNO_TARGET)`);
                    }
                    throw error;
               }

               // Process each address
               const results: any[] = [];

               // Build base transaction
               const accountSetTx: xrpl.AccountSet = await client.autofill({
                    TransactionType: 'AccountSet',
                    Account: wallet.classicAddress,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               });

               if (enableNftMinter === 'Y') {
                    accountSetTx.NFTokenMinter = addressesArray;
                    accountSetTx.SetFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
               } else {
                    accountSetTx.ClearFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
               }

               await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
                    return this.txUiService.setError('Insufficient XRP to complete transaction');
               }

               this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled() ? `Simulating ${enableNftMinter === 'Y' ? 'Setting' : 'Remove'} NFT Minter (no changes will be made)...` : `Submitting NFT Minter ${enableNftMinter === 'Y' ? 'Set' : 'Removal'} to Ledger...`, 200);

               this.txUiService.setPaymentTx(accountSetTx);
               // this.updatePaymentTx();

               let response: any;

               if (this.txUiService.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign(), this.isRegularKeyAddress(), this.regularKeySeed());

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign(), this.multiSignAddress(), this.multiSignSeeds());

                    if (!signedTx) {
                         return this.txUiService.setError('Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txUiService.setTxResult(response.result);
               // this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.txUiService.isSimulateEnabled() ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.txUiService.setError(userMessage);
               } else {
                    this.txUiService.setSuccess(this.txUiService.result);
               }

               this.txUiService.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.txUiService.isSimulateEnabled()) {
                    this.txUiService.successMessage = `${enableNftMinter === 'Y' ? 'Set NFT Minter Address' : 'NFT Minter Address removal'} successfully!`;

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    // await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
                    // this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    // this.updateInfoMessage(updatedAccountObjects);
                    // this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    // this.updateTickets(updatedAccountObjects);
                    // this.clearFields(false);
                    // this.cdr.detectChanges();
                    await this.refreshAfterTx(client, wallet, null, false);
                    this.updateInfoMessage(updatedAccountObjects);
                    this.cdr.detectChanges();
               } else {
                    this.txUiService.successMessage = `Simulated ${enableNftMinter === 'Y' ? 'Set NFT Minter Address' : 'NFT Minter Address removal'} successfully!`;
               }
          } catch (error: any) {
               console.error('Error in setNftMinterAddress:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner.set(false);
               // this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving setNftMinterAddress in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     private async handleFlagTx(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: any, currentLedger: any, serverInfo: any, type: 'SetFlag' | 'ClearFlag', flagValue: string, memoField: string): Promise<{ flagType: 'SetFlag' | 'ClearFlag'; flagName: string; hash?: string; success: boolean; error?: string; result?: any }> {
          try {
               const response = await this.submitFlagTransaction(client, wallet, accountInfo, fee, currentLedger, serverInfo, type === 'SetFlag' ? { SetFlag: flagValue } : { ClearFlag: flagValue }, memoField);

               const flagName = this.utilsService.getFlagName(flagValue);
               const success = response?.success === true;
               const message = response?.message;
               const result = typeof message === 'object' && 'result' in message ? message.result : message;

               // Extract hash safely
               let hash: string | undefined;
               try {
                    if (typeof result === 'object' && result) {
                         hash = result.hash ?? result.tx_json?.hash;
                    } else if (typeof result === 'string') {
                         const parsed = JSON.parse(result);
                         hash = parsed.hash ?? parsed.tx_json?.hash;
                    }
               } catch {
                    hash = undefined;
               }

               return { flagType: type, flagName, hash, success, result, error: success ? undefined : JSON.stringify(result) };
          } catch (err: any) {
               return { flagType: type, flagName: this.utilsService.getFlagName(flagValue), success: false, error: err.message || 'Unknown error' };
          }
     }

     private async submitFlagTransaction(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: any, currentLedger: any, serverInfo: any, flagPayload: any, memoField: any) {
          console.log('Entering submitFlagTransaction');
          const startTime = Date.now();

          if (flagPayload.SetFlag) {
               const flagToUpdate = Array.from(AppConstants.FLAGS.values()).find((flag: any) => flag.value === flagPayload.SetFlag);
               this.txUiService.updateSpinnerMessage(`Submitting ${flagToUpdate ? flagToUpdate.label : 'Flag'} set flag to the Ledger...`);
          }

          if (flagPayload.ClearFlag) {
               const flagToUpdate = Array.from(AppConstants.FLAGS.values()).find((flag: any) => flag.value === flagPayload.ClearFlag);
               this.txUiService.updateSpinnerMessage(`Submitting ${flagToUpdate ? flagToUpdate.label : 'Flag'} clear flag to the Ledger...`);
          }

          try {
               let regularKeyWalletSignTx: any = '';
               let useRegularKeyWalletSignTx = false;
               if (this.isRegularKeyAddress() && !this.useMultiSign()) {
                    console.log('Using Regular Key Seed for transaction signing');
                    regularKeyWalletSignTx = await this.utilsService.getWallet(this.regularKeySeed());
                    useRegularKeyWalletSignTx = true;
               }

               const tx = {
                    TransactionType: 'AccountSet',
                    Account: wallet.classicAddress,
                    ...flagPayload,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, tx, wallet, accountInfo);

               this.txUiService.setPaymentTx(tx);
               // this.updatePaymentTx();

               let response: any;

               if (this.txUiService.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, tx);
               } else {
                    let signedTx: { tx_blob: string; hash: string } | null = null;

                    if (this.useMultiSign()) {
                         const signerAddresses = this.utilsService.getMultiSignAddress(this.multiSignAddress());
                         if (signerAddresses.length === 0) {
                              return this.txUiService.setError('No signer addresses provided for multi-signing');
                         }

                         const signerSeeds = this.utilsService.getMultiSignSeeds(this.multiSignSeeds());
                         if (signerSeeds.length === 0) {
                              return this.txUiService.setError('No signer seeds provided for multi-signing');
                         }

                         try {
                              const result = await this.utilsService.handleMultiSignTransaction({ client, wallet, tx: tx, signerAddresses, signerSeeds, fee });
                              signedTx = result.signedTx;
                              tx.Signers = result.signers;

                              console.debug('Payment with Signers:', tx);
                              console.debug('SignedTx:', signedTx);

                              if (!signedTx) {
                                   return this.txUiService.setError('No valid signature collected for multisign transaction');
                              }

                              const multiSignFee = String((signerAddresses.length + 1) * Number(await this.xrplService.calculateTransactionFee(client)));
                              console.debug(`multiSignFee: ${multiSignFee}`);
                              tx.Fee = multiSignFee;
                              const finalTx = xrpl.decode(signedTx.tx_blob);
                              console.debug('Decoded Final Tx:', finalTx);
                         } catch (err: any) {
                              return { success: false, message: `${err.message}` };
                         }
                    } else {
                         const preparedTx = await client.autofill(tx);
                         console.debug(`preparedTx:`, preparedTx);
                         if (useRegularKeyWalletSignTx) {
                              console.log('Using RegularKey to sign transaction');
                              signedTx = regularKeyWalletSignTx.sign(preparedTx);
                         } else {
                              signedTx = wallet.sign(preparedTx);
                         }
                    }

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, tx, fee)) {
                         return { success: false, message: 'Insufficient XRP to complete transaction' };
                    }

                    if (!signedTx) {
                         return { success: false, message: 'Failed to sign transaction.' };
                    }

                    response = await client.submitAndWait(signedTx.tx_blob);
               }

               if (response.result.meta.TransactionResult != 'tesSUCCESS') {
                    return {
                         success: false,
                         message: response,
                    };
               } else {
                    return {
                         success: true,
                         message: response,
                    };
               }
          } catch (error: any) {
               return { success: false, message: `ERROR submitting flag: ${error.message}` };
          } finally {
               console.log(`Leaving submitFlagTransaction in ${Date.now() - startTime}ms`);
          }
     }

     updateAvatarUrlFromEmail(email: string) {
          if (!email || !email.includes('@')) {
               this.avatarUrl.set('');
               return;
          }
          const encoded = encodeURIComponent(email.trim().toLowerCase());
          this.avatarUrl.set(`https://api.dicebear.com/7.x/shapes/svg?seed=${encoded}`);
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     private checkForSignerAccounts(accountObjects: xrpl.AccountObjectsResponse) {
          const signerAccounts: string[] = [];
          if (accountObjects.result && Array.isArray(accountObjects.result.account_objects)) {
               accountObjects.result.account_objects.forEach(obj => {
                    if (obj.LedgerEntryType === 'SignerList' && Array.isArray(obj.SignerEntries)) {
                         obj.SignerEntries.forEach((entry: any) => {
                              if (entry.SignerEntry?.Account) {
                                   signerAccounts.push(entry.SignerEntry.Account + '~' + entry.SignerEntry.SignerWeight);
                                   this.signerQuorum.set(obj.SignerQuorum);
                              }
                         });
                    }
               });
          }
          return signerAccounts;
     }

     private async setTxOptionalFields(client: xrpl.Client, accountTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.selectedSingleTicket()) {
               const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket()));
               if (!exists) throw new Error(`Ticket ${this.selectedSingleTicket()} not found`);
               this.utilsService.setTicketSequence(accountTx, this.selectedSingleTicket(), true);
          } else {
               if (this.multiSelectMode() && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(accountTx, accountInfo.result.account_data.Sequence, false);
               }
          }

          if (this.memoField()) this.utilsService.setMemoField(accountTx, this.memoField());
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
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

     public refreshUiAccountObjects(accountObjects: xrpl.AccountObjectsResponse, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet): void {
          const isMasterKeyDisabled = !!accountInfo?.result?.account_flags?.disableMasterKey;
          const signerAccounts = this.checkForSignerAccounts(accountObjects);
          const hasSignerAccounts = signerAccounts?.length > 0;
          const preAuthAccounts = this.utilsService.findDepositPreauthObjects(accountObjects);
          const hasPreAuthAccounts = preAuthAccounts?.length > 0;

          // === Tickets ===
          this.ticketArray = this.getAccountTickets(accountObjects);
          this.selectedTicket.set(this.ticketArray[0] || this.selectedTicket());

          // === Multi-Sign (Signer Entries) ===
          this.setMultiSignProperties(hasSignerAccounts, wallet);

          // === Master Key ===
          this.masterKeyDisabled.set(isMasterKeyDisabled);

          // === MultiSign Enabled / Usage State ===
          this.multiSigningEnabled.set(hasSignerAccounts);
          this.useMultiSign.set(isMasterKeyDisabled && hasSignerAccounts);

          // === DepositAuth / PreAuth ===
          this.setDepositAuthProperties(hasPreAuthAccounts, preAuthAccounts);

          // === Final cleanup ===
          this.clearFields(false);
     }

     private setMultiSignProperties(hasSignerAccounts: boolean, wallet: xrpl.Wallet): void {
          if (hasSignerAccounts) {
               const signerEntriesKey = `${wallet.classicAddress}signerEntries`;
               const signerEntries: SignerEntry[] = this.storageService.get(signerEntriesKey) || [];

               console.debug('signerEntries:', signerEntries);

               this.multiSignAddress.set(signerEntries.map(e => e.Account).join(',\n'));
               this.multiSignSeeds.set(signerEntries.map(e => e.seed).join(',\n'));
          } else {
               this.signerQuorum.set(0);
               this.multiSignAddress.set('No Multi-Sign address configured for account');
               this.multiSignSeeds.set('');
               // this.storageService.removeValue('signerEntries');
               this.storageService.removeValue(`${wallet.classicAddress}signerEntries`);
          }
     }

     private setDepositAuthProperties(hasPreAuthAccounts: boolean, preAuthAccounts: string[]): void {
          if (hasPreAuthAccounts) {
               console.debug('preAuthAccounts:', preAuthAccounts);
               this.depositAuthAddresses = preAuthAccounts.map(a => ({ account: a }));
               this.isdepositAuthAddress.set(false);
               this.depositAuthEnabled.set(false);
          } else {
               this.depositAuthAddresses = [{ account: '' }];
               this.isdepositAuthAddress.set(false);
               this.depositAuthEnabled.set(false);
          }
     }

     public refreshUiAccountInfo(accountInfo: xrpl.AccountInfoResponse): void {
          const accountData = accountInfo?.result?.account_data;
          if (!accountData) return;

          const account = accountData.Account;
          const regularKey = accountData.RegularKey;
          const isMasterKeyDisabled = accountInfo?.result?.account_flags?.disableMasterKey ?? false;
          const nftTokenMinter = accountData.NFTokenMinter;

          // === Regular Key Properties ===
          this.setRegularKeyProperties(regularKey, account);

          // === Master Key ===
          this.masterKeyDisabled.set(isMasterKeyDisabled);

          // === Regular Key Signing Enabled ===
          this.regularKeySigningEnabled.set(!!regularKey);

          // === Regular Key Address Validity (used for UI state) ===
          this.isRegularKeyAddress.set(isMasterKeyDisabled && xrpl.isValidAddress(this.regularKeyAddress()));

          // === NFT Minter ===
          this.setNfTokenMinterProperties(nftTokenMinter);

          // === Metadata (TickSize, TransferRate, Domain, etc.) ===
          this.refreshUiAccountMetaData(accountData);
     }

     private setRegularKeyProperties(regularKey: string | undefined, account: string): void {
          if (regularKey) {
               this.regularKeyAddress.set(regularKey);
               this.regularKeySeed.set(this.storageService.get(`${account}regularKeySeed`) || '');
          } else {
               // this.regularKeyAddress = 'No RegularKey configured for account';
               this.regularKeyAddress.set('');
               this.regularKeySeed.set('');
               this.isRegularKeyAddress.set(false);
          }
     }

     private setNfTokenMinterProperties(nftTokenMinter: string | undefined): void {
          if (nftTokenMinter) {
               this.isAuthorizedNFTokenMinter.set(false); // stays false until verified externally
               this.isNFTokenMinterEnabled.set(true);
               this.nfTokenMinterAddress.set(nftTokenMinter);
          } else {
               this.isAuthorizedNFTokenMinter.set(false);
               this.isNFTokenMinterEnabled.set(false);
               this.nfTokenMinterAddress.set('');
          }
     }

     private refreshUiAccountMetaData(accountData: any): void {
          this.clearUiIAccountMetaData();
          const { TickSize, TransferRate, Domain, MessageKey, EmailHash } = accountData;

          const hasMetaData = TickSize || TransferRate || Domain || MessageKey || EmailHash;
          if (hasMetaData) {
               this.isUpdateMetaData.set(true);
               this.refreshUiIAccountMetaData(accountData); // your existing function
          } else {
               this.isUpdateMetaData.set(false);
               if (!EmailHash) {
                    this.userEmail.set('');
                    this.avatarUrl.set('');
               }
          }
     }

     async refreshUiIAccountMetaData(accountInfo: any) {
          // const { TickSize, TransferRate, Domain, MessageKey, EmailHash } = accountInfo.account_data;
          const { TickSize, TransferRate, Domain, MessageKey, EmailHash } = accountInfo;
          this.tickSize.set(TickSize || '');
          this.transferRate.set(TransferRate ? ((TransferRate / 1_000_000_000 - 1) * 100).toFixed(3) : '');
          this.domain.set(Domain ? this.utilsService.decodeHex(Domain) : '');
          this.isMessageKey.set(!!MessageKey);
          this.userEmail.set(EmailHash || '');
          this.avatarUrl.set(await this.loadAvatarForAccount(EmailHash));
          this.cdr.detectChanges();
     }

     async loadAvatarForAccount(emailHash: any): Promise<string> {
          // 1. Prefer on-ledger EmailHash => Gravatar
          if (emailHash) {
               return `https://api.dicebear.com/7.x/identicon/svg?seed=${emailHash}`;
          }

          // 2. Next prefer locally saved avatar (DiceBear from typed email)
          const savedAvatar = localStorage.getItem('avatarUrl');
          if (savedAvatar) {
               this.userEmail.set(localStorage.getItem('userEmail') || '');
               return savedAvatar;
          }

          // 3. Fallback: deterministic DiceBear using the account address
          // if (this.currentWallet) {
          //      const seed = encodeURIComponent(this.currentWallet.seed);
          //      return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;
          // }

          // otherwise leave blank or show default placeholder
          return '';
     }

     // private getAccountTickets(accountObjects: xrpl.AccountObjectsResponse): string[] {
     //      const objects = accountObjects.result?.account_objects;
     //      if (!Array.isArray(objects)) return [];

     //      const tickets = objects.reduce((acc: number[], obj) => {
     //           if (obj.LedgerEntryType === 'Ticket' && typeof obj.TicketSequence === 'number') {
     //                acc.push(obj.TicketSequence);
     //           }
     //           return acc;
     //      }, []);

     //      return tickets.sort((a, b) => a - b).map(String);
     // }

     private getAccountTickets(accountObjects: xrpl.AccountObjectsResponse) {
          const getAccountTickets: string[] = [];
          if (accountObjects.result && Array.isArray(accountObjects.result.account_objects)) {
               accountObjects.result.account_objects.forEach(obj => {
                    if (obj.LedgerEntryType === 'Ticket') {
                         getAccountTickets.push(obj.TicketSequence.toString());
                    }
               });
          }
          return getAccountTickets;
     }

     public cleanUpSingleSelection() {
          // Check if selected ticket still exists in available tickets
          if (this.selectedSingleTicket && !this.ticketArray.includes(this.selectedSingleTicket())) {
               this.selectedSingleTicket.set(''); // Reset to "Select a ticket"
          }
     }

     public cleanUpMultiSelection() {
          // Filter out any selected tickets that no longer exist
          this.selectedTickets = this.selectedTickets.filter(ticket => this.ticketArray.includes(ticket));
     }

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          this.ticketArray = this.getAccountTickets(accountObjects);

          // Clean up selections based on current mode
          if (this.multiSelectMode()) {
               this.cleanUpMultiSelection();
          } else {
               this.cleanUpSingleSelection();
          }
     }

     // private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
     //      await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
     //           this.currentWallet.set({ ...newCurrent });
     //      });
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

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     loadSignerList(account: string) {
          const singerEntriesAccount = account + 'signerEntries';
          if (this.storageService.get(singerEntriesAccount) != null && this.storageService.get(singerEntriesAccount).length > 0) {
               this.signers = this.storageService.get(singerEntriesAccount).map((s: { Account: any; seed: any; SignerWeight: any }) => ({
                    account: s.Account,
                    seed: s.seed,
                    weight: s.SignerWeight,
               }));
          } else {
               this.clearSignerList();
          }
     }

     clearSignerList() {
          this.signers = [{ account: '', seed: '', weight: 1 }];
     }

     private resetFlags() {
          Object.keys(this.flags).forEach(key => (this.flags[key as keyof AccountFlags] = false));

          ['domainField', 'transferRateField', 'tickSizeField'].forEach(id => {
               const elem = document.getElementById(id) as HTMLInputElement | null;
               if (elem) elem.value = '';
          });
     }

     setHolder() {
          // Update flags for Holder configuration
          this.flags.asfRequireDest = false;
          this.flags.asfRequireAuth = false;
          this.flags.asfDisallowXRP = false;
          this.flags.asfDisableMaster = false;
          this.flags.asfNoFreeze = false;
          this.flags.asfGlobalFreeze = false;
          this.flags.asfDefaultRipple = false;
          this.flags.asfDepositAuth = false;
          this.flags.asfAllowTrustLineClawback = false;
          this.flags.asfDisallowIncomingNFTokenOffer = false;
          this.flags.asfDisallowIncomingCheck = false;
          this.flags.asfDisallowIncomingPayChan = false;
          this.flags.asfDisallowIncomingTrustline = false;
     }

     setExchanger() {
          // Update flags for Exchanger configuration
          this.flags.asfRequireDest = true;
          this.flags.asfRequireAuth = false;
          this.flags.asfDisallowXRP = false;
          this.flags.asfDisableMaster = false;
          this.flags.asfNoFreeze = false;
          this.flags.asfGlobalFreeze = false;
          this.flags.asfDefaultRipple = true;
          this.flags.asfDepositAuth = false;
          this.flags.asfAuthorizedNFTokenMinter = false;
          this.flags.asfDisallowIncomingNFTokenOffer = true;
          this.flags.asfDisallowIncomingCheck = false;
          this.flags.asfDisallowIncomingPayChan = true;
          this.flags.asfDisallowIncomingTrustline = false;
          this.flags.asfAllowTrustLineClawback = false;
          this.flags.asfAllowTrustLineLocking = false;
     }

     setIssuer() {
          // Update flags for Issuer configuration
          this.flags.asfRequireDest = false;
          this.flags.asfRequireAuth = false;
          this.flags.asfDisallowXRP = false;
          this.flags.asfDisableMaster = false;
          this.flags.asfNoFreeze = false;
          this.flags.asfGlobalFreeze = false;
          this.flags.asfDefaultRipple = true;
          this.flags.asfDepositAuth = false;
          this.flags.asfAuthorizedNFTokenMinter = false;
          this.flags.asfDisallowIncomingNFTokenOffer = true;
          this.flags.asfDisallowIncomingCheck = true;
          this.flags.asfDisallowIncomingPayChan = true;
          this.flags.asfDisallowIncomingTrustline = false;
          this.flags.asfAllowTrustLineClawback = true;
          this.flags.asfAllowTrustLineLocking = false;
     }

     getFlagNames(results: any): string {
          return results
               .map((r: any) =>
                    r.flagName
                         .replace(/^asf/, '')
                         .replace(/([A-Z])/g, ' $1')
                         .replace(/\bN F T\b/g, 'NFT')
                         .replace(/\bI O U\b/g, 'IOU')
                         .replace(/\bX R P\b/g, 'XRP')
                         .trim()
               )
               .join(' - ');
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

     updateInfoMessage(accountObjects: xrpl.AccountObjectsResponse): void {
          if (!this.currentWallet()?.address) {
               this.txUiService.setInfoMessage('No wallet is currently selected.');
               return;
          }

          const walletName = this.currentWallet().name || 'selected';
          const accountFlags = this.accountInfo?.result?.account_flags;

          if (!accountFlags) {
               this.txUiService.setInfoMessage(`<code>${walletName}</code> wallet is ready for account configuration.`);
               return;
          }

          // Determine key configuration aspects
          const hasMultiSign = this.checkForSignerAccounts(accountObjects).length > 0;
          const hasRegularKey = !!this.accountInfo?.result?.account_data?.RegularKey;
          const masterKeyDisabled = accountFlags.disableMasterKey;
          const hasPreauthObjects = this.depositAuthAddresses.length > 1 || (this.depositAuthAddresses.length === 1 && this.depositAuthAddresses[0].account !== '');

          let messageParts: string[] = [];

          // Primary signing configuration
          if (masterKeyDisabled) {
               if (hasMultiSign) {
                    messageParts.push('This account is configured with multi-signing.');
               }
               if (hasRegularKey) {
                    messageParts.push('This account is configured with a Regular Key.');
               }
               messageParts.push('This account has the master key disabled.');
          } else {
               if (hasMultiSign) {
                    messageParts.push('This account has multi-signing configured.');
               }
               if (hasRegularKey) {
                    messageParts.push('This account has a Regular Key configured.');
               }
               messageParts.push('The master key is still enabled.');
          }

          // Other significant configurations
          if (this.depositAuthEnabled()) {
               const preauthCount = hasPreauthObjects ? this.depositAuthAddresses.length : 0;
               if (preauthCount > 0) {
                    messageParts.push(`Deposit Authorization is enabled with ${preauthCount} preauthorized account${preauthCount > 1 ? 's' : ''}.`);
               } else {
                    messageParts.push('Deposit Authorization is enabled.');
               }
          }

          // Certain irreversible flags
          if (accountFlags.noFreeze) {
               messageParts.push('This account has permanently given up the ability to freeze trust lines (NoFreeze).');
          }

          if (accountFlags.allowTrustLineClawback) {
               messageParts.push('This account has the ability to claw back issued tokens from trust lines.');
          }

          let message: string;

          if (messageParts.length === 0) {
               message = `<code>${walletName}</code> wallet has no special account configuration. All account flags are in their default state.`;
          } else {
               message = `<code>${walletName}</code> wallet has the following account configuration:<ul>`;
               messageParts.forEach(part => {
                    message += `<li>${part}</li>`;
               });
               message += '</ul>';
          }

          // Add information about irreversible flags if any are set
          const irreversibleFlags = ['noFreeze', 'allowTrustLineClawback'];
          const setIrreversibleFlags = irreversibleFlags.filter(flag => accountFlags[flag as keyof typeof accountFlags]);
          if (setIrreversibleFlags.length > 0) {
               const flagNames = setIrreversibleFlags
                    .map(flag => {
                         const displayName = flag.replace(/([A-Z])/g, ' $1').replace('No Freeze', 'NoFreeze');
                         return `<strong>${displayName}</strong>`;
                    })
                    .join(', ');

               message += `<em>Note: The following flags are irreversible and cannot be disabled once enabled: ${flagNames}.</em>`;
          }

          this.txUiService.setInfoMessage(message);
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.ticketSequence.set('');
               this.useMultiSign.set(false);
               this.isAuthorizedNFTokenMinter.set(false);
               this.isdepositAuthAddress.set(false);
               this.isUpdateMetaData.set(false);
               this.isRegularKeyAddress.set(false);
               this.txUiService.clearMessages();
               this.txUiService.clearWarning();
          }

          this.selectedTicket.set('');
          this.isTicket.set(false);
          this.isTicketEnabled.set(false);
          this.multiSelectMode.set(false);
          this.selectedSingleTicket.set('');
          this.selectedTickets = [];
          this.isMultiSign.set(false);
          this.memoField.set('');
          this.isMemoEnabled.set(false);
          this.cdr.detectChanges();
     }

     private formatSignerEntries(signerEntries: { Account: string; SignerWeight: number; seed: string }[]) {
          return signerEntries.map(entry => ({
               SignerEntry: {
                    Account: entry.Account,
                    SignerWeight: entry.SignerWeight,
               },
          }));
     }

     private formatDepositAuthEntries(signerEntries: { Account: string }[]) {
          return signerEntries.map(entry => ({
               SignerEntry: {
                    Account: entry.Account,
               },
          }));
     }

     private createSignerEntries() {
          return this.signers
               .filter(s => s.account && s.weight > 0)
               .map(s => ({
                    Account: s.account,
                    SignerWeight: Number(s.weight),
                    seed: s.seed,
               }));
     }

     private createDepsoitAuthEntries() {
          return this.depositAuthAddresses
               .filter(s => s.account)
               .map(s => ({
                    Account: s.account,
               }));
     }

     clearUiIAccountMetaData() {
          this.tickSize.set('');
          this.transferRate.set('');
          this.domain.set('');
          this.isMessageKey.set(false);
     }

     toggleMessageKey() {
          if (this.isMessageKey()) {
               this.isMessageKey.set(false);
          } else {
               this.isMessageKey.set(true);
          }
     }

     toggleFlag(key: 'asfRequireDest' | 'asfRequireAuth' | 'asfDisallowXRP' | 'asfDisableMaster' | 'asfNoFreeze' | 'asfGlobalFreeze' | 'asfDefaultRipple' | 'asfDepositAuth' | 'asfAuthorizedNFTokenMinter' | 'asfDisallowIncomingNFTokenOffer' | 'asfDisallowIncomingCheck' | 'asfDisallowIncomingPayChan' | 'asfDisallowIncomingTrustline' | 'asfAllowTrustLineClawback' | 'asfAllowTrustLineLocking') {
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          (Object.keys(this.flags) as (keyof typeof this.flags)[]).forEach(key => {
               if (this.flags[key]) {
                    sum |= 1 << this.FLAG_VALUES[key];
               }
          });
          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     clearFlagsValue() {
          this.flags = {
               asfRequireDest: false,
               asfRequireAuth: false,
               asfDisallowXRP: false,
               asfDisableMaster: false,
               asfNoFreeze: false,
               asfGlobalFreeze: false,
               asfDefaultRipple: false,
               asfDepositAuth: false,
               asfAuthorizedNFTokenMinter: false,
               asfDisallowIncomingNFTokenOffer: false,
               asfDisallowIncomingCheck: false,
               asfDisallowIncomingPayChan: false,
               asfDisallowIncomingTrustline: false,
               asfAllowTrustLineClawback: false,
               asfAllowTrustLineLocking: false,
          };
          this.totalFlagsValue.set(0);
          this.totalFlagsHex.set('0x0');
     }
}
