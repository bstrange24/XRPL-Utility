import { OnInit, Component, ChangeDetectorRef, inject, computed, DestroyRef, signal, ChangeDetectionStrategy } from '@angular/core';
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
     changeDetection: ChangeDetectionStrategy.OnPush,
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

     // Destination Dropdown
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now

     // Reactive State (Signals)
     activeTab = signal<'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey' | 'delete'>('modifyAccountFlags');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');
     accountInfo: any;
     configurationType = signal<'holder' | 'exchanger' | 'issuer' | null>(null);
     isHolderConfiguration = signal<boolean>(false);
     isExchangerConfiguration = signal<boolean>(false);
     isIssuerConfiguration = signal<boolean>(false);
     hasSignerList = signal<boolean>(false);
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

     avatarUrl = computed(() => {
          const emailHash = this.txUiService.userEmail();

          if (emailHash && emailHash.includes('@')) {
               const encoded = encodeURIComponent(emailHash.trim().toLowerCase());
               return `https://api.dicebear.com/7.x/shapes/svg?seed=${encoded}`;
          }

          if (emailHash) {
               return `https://api.dicebear.com/7.x/identicon/svg?seed=${emailHash}`;
          }

          const saved = localStorage.getItem('avatarUrl');
          if (saved) {
               return saved;
          }

          return ''; // or a default placeholder URL
     });

     infoData = computed(() => {
          if (!this.currentWallet().address) {
               return null;
          }

          const walletName = this.currentWallet().name || 'selected';
          const accountFlags = this.accountInfo?.result?.account_flags;

          // Base message parts
          const messageParts: string[] = [];

          // === Signing method detection ===
          // const hasMultiSign = this.checkForSignerAccounts(this.xrplCache.getAccountObjects(this.currentWallet().address)).length > 0;
          const hasRegularKey = !!this.accountInfo?.result?.account_data?.RegularKey;
          const masterKeyDisabled = accountFlags?.disableMasterKey;

          if (masterKeyDisabled) {
               if (this.hasSignerList()) messageParts.push('Multi-signing enabled');
               if (hasRegularKey) messageParts.push('Regular Key configured');
               messageParts.push('Master key permanently disabled');
          } else {
               if (this.hasSignerList()) messageParts.push('Multi-signing configured');
               if (hasRegularKey) messageParts.push('Regular Key configured');
               messageParts.push('Master key enabled');
          }

          // === Deposit Auth ===
          if (this.txUiService.depositAuthEnabled()) {
               const preauthCount = this.txUiService.depositAuthAddresses().filter(a => a.account).length;
               if (preauthCount > 0) {
                    messageParts.push(`Deposit Authorization enabled (${preauthCount} preauthorized account${preauthCount > 1 ? 's' : ''})`);
               } else {
                    messageParts.push('Deposit Authorization enabled');
               }
          }

          // === Irreversible flags ===
          const irreversible: string[] = [];
          if (accountFlags?.noFreeze) irreversible.push('No Freeze');
          if (accountFlags?.allowTrustLineClawback) irreversible.push('Clawback');

          return {
               walletName,
               hasSpecialConfig: messageParts.length > 0 || irreversible.length > 0,
               configItems: messageParts,
               irreversibleFlags: irreversible,
               hasIrreversible: irreversible.length > 0,
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
                         this.selectWallet(wallet);
                    }
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
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

          if (this.hasWallets()) {
               await this.getAccountDetails(true);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     validateQuorum() {
          const totalWeight = this.txUiService.signers().reduce((sum: any, s: { SignerWeight: any }) => sum + (s.SignerWeight || 0), 0);
          if (this.txUiService.signerQuorum() > totalWeight) {
               this.txUiService.signerQuorum.set(totalWeight);
          }
     }

     onConfigurationChange() {
          this.resetFlags();

          const type = this.configurationType() || '';
          const configActions: Record<string, () => void> = {
               holder: () => this.setHolder(),
               exchanger: () => this.setExchanger(),
               issuer: () => this.setIssuer(),
          };

          configActions[type]?.();
          this.updateFlagTotal();

          console.log('Configuration changed to:', this.configurationType());
     }

     toggleConfigurationTemplate() {}

     addSigner() {
          this.txUiService.addSignersSignal({ account: '', seed: '', weight: 1 });
     }

     removeSigner(index: number) {
          this.txUiService.removeSignerSignal(index);
     }

     addDepositAuthAddresses() {
          this.txUiService.addDepositAuthAddressesSignal({ account: '', seed: '', weight: 1 });
     }

     removeDepositAuthAddresses(index: number) {
          this.txUiService.removeDepositAuthAddressesSignal(index);
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
          await this.withPerf('getAccountDetails', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.configurationType.set(null);

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

                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async updateFlags() {
          await this.withPerf('updateFlags', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, fee, currentLedger, serverInfo] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client), this.xrplCache.getServerInfo(this.xrplService)]);
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
                         const result = await this.handleFlagTx(client, wallet, accountInfo, fee, currentLedger, serverInfo, 'SetFlag', flag, this.txUiService.memoField());
                         allFlagResults.push(result);
                         this.txUiService.addTxHashSignal(result.hash);
                         this.txUiService.addTxResultSignal(result.result);
                    }

                    for (const flag of clearFlags) {
                         const result = await this.handleFlagTx(client, wallet, accountInfo, fee, currentLedger, serverInfo, 'ClearFlag', flag, this.txUiService.memoField());
                         allFlagResults.push(result);
                         this.txUiService.addTxHashSignal(result.hash);
                         this.txUiService.addTxResultSignal(result.result);
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
                         await this.refreshAfterTx(client, wallet, null, false);
                    }
               } catch (error: any) {
                    console.error('Error in updateFlags:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async updateMetaData() {
          await this.withPerf('updateMetaData', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validateInputs(inputs, 'updateMetaData');
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    const accountSetTx: AccountSet = {
                         TransactionType: 'AccountSet',
                         Account: wallet.classicAddress,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);

                    const updates: (() => void)[] = [];

                    if (this.txUiService.tickSize()) {
                         updates.push(() => this.utilsService.setTickSize(accountSetTx, parseInt(this.txUiService.tickSize())));
                    }

                    if (this.txUiService.transferRate()) {
                         updates.push(() => this.utilsService.setTransferRate(accountSetTx, parseFloat(this.txUiService.transferRate())));
                    }

                    if (this.txUiService.isMessageKey() && wallet.publicKey) {
                         updates.push(() => this.utilsService.setMessageKey(accountSetTx, wallet.publicKey));
                    }

                    if (this.txUiService.userEmail()) {
                         updates.push(() => this.utilsService.setEmailHash(accountSetTx, this.txUiService.userEmail()));
                    }

                    if (this.txUiService.domain && this.txUiService.domain().trim() !== '') {
                         updates.push(() => this.utilsService.setDomain(accountSetTx, this.txUiService.domain()));
                    }

                    if (updates.length === 0) {
                         this.txUiService.setWarning(`No meta data fields selected for modification.`);
                         return;
                    }

                    updates.forEach(update => update());

                    const result = await this.txExecutor.updateMetaData(accountSetTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.isUpdateMetaData.set(true);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? `Simulated Meta Data update successfully!` : `Updated Meta Data successfully!`;
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in updateMetaData:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async setDepositAuthAccounts(authorizeFlag: 'Y' | 'N'): Promise<void> {
          await this.withPerf('setDepositAuthAccounts', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               // Split and validate deposit auth addresses
               let depsositAuthEntries = this.createDepsoitAuthEntries();
               const formattedDepsositAuthEntries = this.formatDepositAuthEntries(depsositAuthEntries);
               if (!formattedDepsositAuthEntries.length) {
                    return this.txUiService.setError('Deposit Auth address list is empty');
               }

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
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

                    // === SHOW ONE SPINNER FOR THE ENTIRE BATCH ===
                    const total = formattedDepsositAuthEntries.length;
                    const isSimulate = this.txUiService.isSimulateEnabled();
                    this.txUiService.showSpinnerWithDelay(isSimulate ? `Simulating deletion of ${total} ticket(s)...` : `Deleting ${total} ticket(s)...`, 200);

                    let depositAuthProcessedCount = 0;
                    const depositAuthProcessed: string[] = [];

                    // Process each address
                    for (let i = 0; i < formattedDepsositAuthEntries.length; i++) {
                         const ticketSeq = formattedDepsositAuthEntries[i];

                         // Update spinner with progress BEFORE calling executor
                         const progressMsg = isSimulate ? `Simulating ticket ${i + 1}/${total}...` : `Deleting ticket ${i + 1}/${total}...`;
                         this.txUiService.updateSpinnerMessage(progressMsg);

                         let currentLedger = await this.xrplService.getLastLedgerIndex(client);

                         const depositPreauthTx: DepositPreauth = {
                              TransactionType: 'DepositPreauth',
                              Account: wallet.classicAddress,
                              [authorizeFlag === 'Y' ? 'Authorize' : 'Unauthorize']: ticketSeq.SignerEntry.Account,
                              Fee: fee,
                              LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                         };

                         await this.setTxOptionalFields(client, depositPreauthTx, wallet, accountInfo);

                         const result = await this.txExecutor.setDepositAuth(depositPreauthTx, wallet, client, {
                              useMultiSign: this.txUiService.useMultiSign(),
                              isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                              regularKeySeed: this.txUiService.regularKeySeed(),
                              multiSignAddress: this.txUiService.multiSignAddress(),
                              multiSignSeeds: this.txUiService.multiSignSeeds(),
                              suppressIndividualFeedback: true,
                              customSpinnerMessage: progressMsg, // ← This preserves your message
                         });

                         if (result.success) {
                              depositAuthProcessedCount++;
                              depositAuthProcessed.push(result.hash!);
                         } else {
                              this.txUiService.setError(`${result.error}`);
                              return;
                         }
                    }

                    if (depositAuthProcessedCount > 0) {
                         depositAuthProcessed.forEach(hash => this.txUiService.addTxHashSignal(hash));
                         this.utilsService.setSuccess(this.utilsService.result);
                         this.txUiService.successMessage = isSimulate ? `Simulated ${depositAuthProcessedCount} deposit authorizations successfully!` : `${depositAuthProcessedCount} deposit authorizations processed successfully!`;
                    }

                    await this.refreshAfterTx(client, wallet, null, true);
               } catch (error: any) {
                    console.error('Error in setDepositAuthAccounts:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async setMultiSign(enableMultiSignFlag: 'Y' | 'N') {
          await this.withPerf('enableMultiSignFlag', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
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
                    let action = 'Remove';
                    if (enableMultiSignFlag === 'Y') {
                         signerListTx.SignerEntries = formattedSignerEntries;
                         if (Number(this.txUiService.signerQuorum()) <= 0) {
                              return this.txUiService.setError('Signer Quorum must be greater than 0.');
                         }
                         signerListTx.SignerQuorum = Number(this.txUiService.signerQuorum());
                         action = 'Set';
                    }

                    const result = await this.txExecutor.setMultiSign(signerListTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    if (enableMultiSignFlag === 'Y') {
                         this.txUiService.successMessage = 'Set Multi Sign successfully!';
                         this.storageService.set(wallet.classicAddress + 'signerEntries', signerEntries);
                    } else {
                         this.txUiService.successMessage = 'Removed Multi Sign successfully!';
                         this.storageService.removeValue(wallet.classicAddress + 'signerEntries');
                         this.txUiService.signerQuorum.set(0);
                    }

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? `Simulated ${action} Multi Sign successfully!` : `${action} Multi Sign successfully successfully!`;
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in setMultiSign:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async setRegularKey(enableRegularKeyFlag: 'Y' | 'N') {
          await this.withPerf('setRegularKey', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    // inputs.accountInfo = accountInfo;
                    // const errors = await this.validateInputs(inputs, 'setRegularKey');
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    if (this.txUiService.regularKeyAddress() === '' || this.txUiService.regularKeyAddress() === 'No RegularKey configured for account' || this.txUiService.regularKeySeed() === '') {
                         return this.txUiService.setError(`Regular Key address and seed must be present`);
                    }

                    let setRegularKeyTx: xrpl.SetRegularKey = {
                         TransactionType: 'SetRegularKey',
                         Account: wallet.classicAddress,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    if (enableRegularKeyFlag === 'Y') {
                         setRegularKeyTx.RegularKey = this.txUiService.regularKeyAddress();
                    }

                    await this.setTxOptionalFields(client, setRegularKeyTx, wallet, accountInfo);

                    const result = await this.txExecutor.setRegularKey(setRegularKeyTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    if (!this.txUiService.isSimulateEnabled()) {
                         const regularKeysAccount = wallet.classicAddress + 'regularKey';
                         const regularKeySeedAccount = wallet.classicAddress + 'regularKeySeed';
                         if (enableRegularKeyFlag === 'Y') {
                              this.storageService.set(regularKeysAccount, this.txUiService.regularKeyAddress());
                              this.storageService.set(regularKeySeedAccount, this.txUiService.regularKeySeed());
                         } else {
                              this.storageService.removeValue(regularKeysAccount);
                              this.storageService.removeValue(regularKeySeedAccount);
                         }
                    }

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? `Simulated ${enableRegularKeyFlag === 'Y' ? `Set Regular Key` : `Regular Key removal`} successfully!` : `${enableRegularKeyFlag === 'Y' ? `Set Regular Key` : `Regular Key removal`} successfully!`;
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in setRegularKey:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async setNftMinterAddress(enableNftMinter: 'Y' | 'N') {
          await this.withPerf('setNftMinterAddress', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    // this.utilsService.logAccountInfoObjects(accountInfo, null);
                    // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

                    // inputs.accountInfo = accountInfo;

                    // const errors = await this.validateInputs(inputs, 'setNftMinterAddress');
                    // if (errors.length > 0) {
                    //      return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    // }

                    const accountSetTx: xrpl.AccountSet = {
                         TransactionType: 'AccountSet',
                         Account: wallet.classicAddress,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    if (enableNftMinter === 'Y') {
                         accountSetTx.NFTokenMinter = this.txUiService.nfTokenMinterAddress();
                         accountSetTx.SetFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
                    } else {
                         accountSetTx.ClearFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
                    }

                    await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);

                    const result = await this.txExecutor.setNftMinterAddress(accountSetTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = `${enableNftMinter === 'Y' ? 'Set NFT Minter Address' : 'NFT Minter Address removal'} successfully!`;
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in setNftMinterAddress:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
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
               if (this.txUiService.isRegularKeyAddress() && !this.txUiService.useMultiSign()) {
                    console.log('Using Regular Key Seed for transaction signing');
                    regularKeyWalletSignTx = await this.utilsService.getWallet(this.txUiService.regularKeySeed());
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

               let response: any;
               let finalTxToSubmit: any = tx; // This will hold the final version

               if (this.txUiService.isSimulateEnabled()) {
                    response = await this.xrplTransactions.simulateTransaction(client, tx);
               } else {
                    let signedTx: { tx_blob: string; hash: string } | null = null;

                    if (this.txUiService.useMultiSign()) {
                         const signerAddresses = this.utilsService.getMultiSignAddress(this.txUiService.multiSignAddress());
                         if (signerAddresses.length === 0) {
                              return this.txUiService.setError('No signer addresses provided for multi-signing');
                         }

                         const signerSeeds = this.utilsService.getMultiSignSeeds(this.txUiService.multiSignSeeds());
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

                    finalTxToSubmit = xrpl.decode(signedTx.tx_blob);

                    // ← SEND THE FINAL SIGNED TX TO UI
                    this.txUiService.addTxSignal(finalTxToSubmit);
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
               this.txUiService.avatarUrl.set('');
               return;
          }
          const encoded = encodeURIComponent(email.trim().toLowerCase());
          this.txUiService.avatarUrl.set(`https://api.dicebear.com/7.x/shapes/svg?seed=${encoded}`);
     }

     private async setTxOptionalFields(client: xrpl.Client, accountTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(accountTx, ticket, true);
               }
          }
          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(accountTx, this.txUiService.memoField());
          }
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
          const nftTokenMinter = accountInfo?.result?.account_data.NFTokenMinter;

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.hasSignerList.set(hasSignerList);
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

          const preAuthAccounts = this.utilsService.findDepositPreauthObjects(accountObjects);
          const hasPreAuthAccounts = preAuthAccounts?.length > 0;
          this.setDepositAuthProperties(hasPreAuthAccounts, preAuthAccounts);

          // === NFT Minter ===
          this.setNfTokenMinterProperties(nftTokenMinter);

          this.refreshUiAccountMetaData(accountInfo?.result?.account_data);
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
          this.txUiService.signers.set([{ Account: '', seed: '', SignerWeight: 1 }]);
          this.storageService.removeValue('signerEntries');
     }

     private setDepositAuthProperties(hasPreAuthAccounts: boolean, preAuthAccounts: string[]): void {
          if (hasPreAuthAccounts) {
               console.debug('preAuthAccounts:', preAuthAccounts);
               this.txUiService.depositAuthAddresses.set(preAuthAccounts.map(a => ({ account: a })));
               this.txUiService.isdepositAuthAddress.set(true);
               this.txUiService.depositAuthEnabled.set(true);
          } else {
               this.txUiService.depositAuthAddresses.set([{ account: '' }]);
               this.txUiService.isdepositAuthAddress.set(false);
               this.txUiService.depositAuthEnabled.set(false);
          }
     }

     private setNfTokenMinterProperties(nftTokenMinter: string | undefined): void {
          if (nftTokenMinter) {
               this.txUiService.isAuthorizedNFTokenMinter.set(false); // stays false until verified externally
               this.txUiService.isNFTokenMinterEnabled.set(true);
               this.txUiService.nfTokenMinterAddress.set(nftTokenMinter);
          } else {
               this.txUiService.isAuthorizedNFTokenMinter.set(false);
               this.txUiService.isNFTokenMinterEnabled.set(false);
               this.txUiService.nfTokenMinterAddress.set('');
          }
     }

     private refreshUiAccountMetaData(accountData: any): void {
          this.clearUiIAccountMetaData();
          const { TickSize, TransferRate, Domain, MessageKey, EmailHash } = accountData;

          const hasMetaData = TickSize || TransferRate || Domain || MessageKey || EmailHash;
          if (hasMetaData) {
               this.txUiService.isUpdateMetaData.set(true);
               this.refreshUiIAccountMetaData(accountData);
          } else {
               this.txUiService.isUpdateMetaData.set(false);
               if (!EmailHash) {
                    this.txUiService.userEmail.set('');
                    this.txUiService.avatarUrl.set('');
               }
          }
     }

     async refreshUiIAccountMetaData(accountInfo: any) {
          const { TickSize, TransferRate, Domain, MessageKey, EmailHash } = accountInfo;
          this.txUiService.tickSize.set(TickSize || '');
          this.txUiService.transferRate.set(TransferRate ? ((TransferRate / 1_000_000_000 - 1) * 100).toFixed(3) : '');
          this.txUiService.domain.set(Domain ? this.utilsService.decodeHex(Domain) : '');
          this.txUiService.isMessageKey.set(!!MessageKey);
          this.txUiService.userEmail.set(EmailHash || '');
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
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

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;');
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
          return this.txUiService
               .signers()
               .filter(s => s.Account && s.SignerWeight > 0)
               .map(s => ({
                    Account: s.Account,
                    SignerWeight: Number(s.SignerWeight),
                    seed: s.seed,
               }));
     }

     private createDepsoitAuthEntries() {
          return this.txUiService
               .depositAuthAddresses()
               .filter(s => s.account)
               .map(s => ({
                    Account: s.account,
               }));
     }

     clearUiIAccountMetaData() {
          this.txUiService.tickSize.set('');
          this.txUiService.transferRate.set('');
          this.txUiService.domain.set('');
          this.txUiService.isMessageKey.set(false);
     }

     toggleMessageKey() {
          if (this.txUiService.isMessageKey()) {
               this.txUiService.isMessageKey.set(false);
          } else {
               this.txUiService.isMessageKey.set(true);
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
