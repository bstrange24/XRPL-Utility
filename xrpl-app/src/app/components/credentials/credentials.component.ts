import { animate, style, transition, trigger } from '@angular/animations';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, OnInit, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { CredentialAccept, CredentialCreate, CredentialDelete, rippleTimeToISOTime } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { ToastService } from '../../services/toast/toast.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

interface CredentialItem {
     index: string;
     CredentialType: string;
     Subject: string;
     Issuer: string;
     Expiration?: string;
     URI?: string;
     Flags?: any;
}

interface CredentialData {
     version: string;
     credential_type: string;
     issuer: string;
     subject: {
          full_name: string;
          destinationAddress: string;
          dob: string;
          country: string;
          id_type: string;
          id_number: string;
          expirationDate: string;
     };
     verification: {
          method: string;
          verified_at: string;
          verifier: string;
     };
     hash: string;
     uri: string;
}

@Component({
     selector: 'app-credentials',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './credentials.component.html',
     styleUrl: './credentials.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCredentialsComponent extends PerformanceBaseComponent implements OnInit {
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

     // Destination Dropdown
     credentialIdSearchQuery = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);

     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     highlightedIndex = signal<number>(-1);
     highlightedCredentialIdIndex = signal<number>(-1);

     // Reactive State (Signals)
     activeTab = signal<'create' | 'accept' | 'delete' | 'verify'>('create');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);

     // Credential lists
     existingCredentials = signal<CredentialItem[]>([]);
     subjectCredentials = signal<CredentialItem[]>([]);

     // Filtered credentials — derived state, fully reactive
     filteredExisting = computed(() => this.filterCredentials(this.existingCredentials(), this.credentialIdSearchTerm()));
     filteredSubject = computed(() => this.filterCredentials(this.subjectCredentials(), this.credentialIdSearchTerm()));

     // Form & UI State
     credentialIdSearchTerm = signal<string>('');
     credentialID = signal<string>('');
     credentialType = signal<string>('');
     selectedCredentials = signal<CredentialItem | null>(null);
     infoPanelExpanded = signal(false);
     private decodeCache = new Map<string, string>();
     subject = signal<string>('');

     // Credential Form Data
     credential = signal<CredentialData>({
          version: '1.0',
          credential_type: 'KYCCredential',
          issuer: '',
          subject: {
               full_name: '',
               destinationAddress: '',
               dob: '',
               country: '',
               id_type: '',
               id_number: '',
               expirationDate: '',
          },
          verification: { method: '', verified_at: '', verifier: '' },
          hash: '',
          uri: 'ipfs://bafybeiexamplehash',
     });

     // Destination dropdown (same as before)
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

     selectedDestinationItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;
          return this.destinationItems().find(i => i.id === addr) || null;
     });

     onDestinationSelected(item: SelectItem | null) {
          this.selectedDestinationAddress.set(item?.id || '');
     }

     // Credential dropdown
     credentialItems = computed(() => {
          const list = this.activeTab() === 'accept' ? this.subjectCredentials() : this.existingCredentials();

          return list.map(cred => ({
               id: cred.index,
               display: cred.CredentialType || 'Unknown Type',
               secondary: cred.index.slice(0, 12) + '...' + cred.index.slice(-10),
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
               // Optional: add badge for pending
               pending: !this.isCredentialAccepted(cred) && this.activeTab() === 'accept',
          }));
     });

     selectedCredentialItem = computed(() => {
          const id = this.credentialID();
          if (!id) return null;
          return this.credentialItems().find(i => i.id === id) || null;
     });

     onCredentialSelected(item: SelectItem | null) {
          if (!item) {
               this.credentialID.set('');
               this.credentialType.set('');
               return;
          }

          const cred = [...this.existingCredentials(), ...this.subjectCredentials()].find(c => c.index === item.id);

          if (cred) {
               this.credentialID.set(cred.index);
               this.credentialType.set(cred.CredentialType || '');
          }
     }

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || 'Selected wallet';
          const issuedByMe = this.existingCredentials();
          const issuedToMe = this.subjectCredentials();

          const pendingToAccept = issuedToMe.filter(c => !this.isCredentialAccepted(c));
          const acceptedByMe = issuedToMe.filter(c => this.isCredentialAccepted(c));
          const pendingIssued = issuedByMe.filter(c => !this.isCredentialAccepted(c));
          const acceptedIssued = issuedByMe.filter(c => this.isCredentialAccepted(c));

          let credentialsToShow: CredentialItem[] = [];

          switch (this.activeTab()) {
               case 'create':
                    credentialsToShow = [...pendingIssued, ...acceptedIssued];
                    break;
               case 'accept':
                    credentialsToShow = pendingToAccept.length ? pendingToAccept : acceptedByMe;
                    break;
               case 'delete':
                    credentialsToShow = issuedByMe;
                    break;
               case 'verify':
                    credentialsToShow = [...pendingToAccept, ...pendingIssued, ...acceptedByMe, ...acceptedIssued];
                    break;
               default:
                    credentialsToShow = issuedByMe;
          }

          return {
               walletName,
               mode: this.activeTab(),
               issuedByMe,
               issuedToMe,
               pendingIssued,
               acceptedIssued,
               pendingToAccept,
               acceptedByMe,
               credentialsToShow,
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
          this.populateDefaultDateTime();
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
                    if (wallet) this.selectWallet(wallet);
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearAllOptionsAndMessages();
                    await this.getCredentialsForAccount(false);
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

     onSelectCredentials(credential: CredentialItem | null) {
          if (!credential) {
               this.resetCredentialIdDropDown();
               return;
          }
          // Keep the search term that led to this selection!
          this.selectedCredentials.set(credential); // store the whole object
          this.credentialID.set(credential.index);
          this.credentialType.set(credential.CredentialType || '');
     }

     trackByCredentialIndex(index: number, cred: CredentialItem) {
          return cred.index;
     }

     trackByWalletAddress(index: number, wallet: any) {
          return wallet.address;
     }

     trackByTicket(index: number, ticket: any) {
          return ticket;
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'create' | 'accept' | 'delete' | 'verify'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.resetCredentialIdDropDown();
          this.txUiService.clearAllOptionsAndMessages();
          await this.getAllCredentialsForAccount();
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getAllCredentialsForAccount(): Promise<void> {
          await this.withPerf('getAllCredentials', async () => {
               const wallet = await this.getWallet();
               const accountObjects = await this.xrplCache.getAccountObjects(wallet.classicAddress, false);
               this.parseCredentials(accountObjects, wallet.classicAddress);
          });
     }

     async getCredentialsForAccount(forceRefresh = false): Promise<void> {
          await this.withPerf('getCredentialsForAccount', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.parseCredentials(accountObjects, wallet.classicAddress);
                    this.refreshUiState(wallet, accountInfo, accountObjects);
               } catch (error: any) {
                    console.error('Error in getCredentialsForAccount:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async createCredential() {
          await this.withPerf('createCredential', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();
                    const [accountInfo, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    console.debug('expirationDate:', this.credential().subject.expirationDate);
                    const expirationRipple = this.utilsService.toRippleTime(this.credential().subject.expirationDate || '');
                    console.debug('expirationRipple:', expirationRipple);

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: { accountInfo, fee, currentLedger },
                         credentials: { credentialType: this.credential().credential_type, subject: destinationAddress, date: expirationRipple },
                    });

                    const errors = await this.validationService.validate('CredentialCreate', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    const credentialCreateTx: CredentialCreate = {
                         TransactionType: 'CredentialCreate',
                         Account: wallet.classicAddress,
                         CredentialType: Buffer.from(this.credential().credential_type || 'defaultCredentialType', 'utf8').toString('hex'),
                         Subject: destinationAddress,
                         Expiration: expirationRipple,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, credentialCreateTx, wallet, accountInfo, 'createCredential');

                    const result = await this.txExecutor.createCredential(credentialCreateTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Setting Credential successfully!' : 'Created credential successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in createCredential:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async deleteCredentials() {
          await this.withPerf('createCredential', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: { accountInfo, accountObjects, fee, currentLedger },
                         credentials: { credentialId: this.credentialID() },
                    });

                    const errors = await this.validationService.validate('CredentialDelete', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    const credentialFound = accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'Credential' && line.index === this.credentialID();
                    });

                    if (!credentialFound) {
                         this.txUiService.setError('Credential not found.');
                         return;
                    }

                    const credentialDeleteTx: CredentialDelete = {
                         TransactionType: 'CredentialDelete',
                         Account: wallet.classicAddress,
                         CredentialType: (credentialFound as any)?.CredentialType,
                         Subject: (credentialFound as any)?.Subject,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, credentialDeleteTx, wallet, accountInfo, 'deleteCredentials');

                    const result = await this.txExecutor.deleteCredential(credentialDeleteTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Credential delete successfully!' : 'Credential removed successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
                    this.resetCredentialIdDropDown();
               } catch (error: any) {
                    console.error('Error in deleteCredentials:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async acceptCredentials() {
          await this.withPerf('acceptCredentials', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, currentLedger, fee] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplService.getLastLedgerIndex(client), this.xrplCache.getFee(this.xrplService, false)]);

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: {
                              accountInfo,
                         },
                         credentials: { credentialId: this.credentialID() },
                    });

                    const errors = await this.validationService.validate('CredentialAccept', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    const credentialFound = accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'Credential' && line.Subject === wallet.classicAddress; // && line.index === this.credentialID();
                    });

                    if (!credentialFound) {
                         this.txUiService.setError('Credential not found.');
                         return;
                    }

                    console.debug(`credentialFound for ${wallet.classicAddress} ${credentialFound}`);
                    console.debug(`credentialFound:`, credentialFound);

                    const credentialAcceptTx: CredentialAccept = {
                         TransactionType: 'CredentialAccept',
                         Account: wallet.classicAddress,
                         Issuer: (credentialFound as any)?.Issuer,
                         CredentialType: (credentialFound as any)?.CredentialType,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, credentialAcceptTx, wallet, accountInfo, 'acceptCredentials');

                    const result = await this.txExecutor.acceptCredential(credentialAcceptTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated accepting credential successfully!' : 'Credential accepted successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
               } catch (error: any) {
                    console.error('Error in acceptCredentials:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async verifyCredential(binary: boolean): Promise<boolean | void> {
          await this.withPerf('verifyCredential', async () => {
               this.txUiService.clearAllOptionsAndMessages();

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const accountInfo = await this.xrplCache.getAccountInfo(wallet.classicAddress, false);

                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: {
                              accountInfo,
                         },
                         credentials: {
                              credentialId: this.credentialID(),
                         },
                    });

                    const errors = await this.validationService.validate('CredentialVerify', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         this.txUiService.isSuccess = false;
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    const selected = this.selectedCredentials();
                    if (!selected) {
                         this.txUiService.setError('No credential selected.');
                         return;
                    }

                    // Encode credentialType as uppercase hex, if needed
                    let credentialTypeHex = '';
                    const credentialType = this.selectedCredentials()?.CredentialType ?? '';
                    if (binary) {
                         credentialTypeHex = credentialType.toUpperCase();
                    } else {
                         credentialTypeHex = xrpl.convertStringToHex(credentialType).toUpperCase();
                         console.info(`Raw credential_type ${credentialType} Encoded credential_type as hex: ${credentialTypeHex}`);
                    }

                    if (credentialTypeHex.length % 2 !== 0 || !AppConstants.CREDENTIAL_REGEX.test(credentialTypeHex)) {
                         // Hexadecimal is always 2 chars per byte, so an odd length is invalid.
                         this.txUiService.setError(`Credential type must be 128 characters as hexadecimal.`);
                         return;
                    }

                    // Perform XRPL lookup of Credential ledger entry
                    const credentialSubject = this.selectedCredentials()?.Subject ?? '';
                    const ledgerEntryRequest = {
                         command: 'ledger_entry',
                         credential: {
                              subject: credentialSubject,
                              issuer: wallet.classicAddress,
                              credential_type: credentialTypeHex,
                         },
                         ledger_index: 'validated',
                    };

                    console.info('Looking up credential...', ledgerEntryRequest);
                    this.txUiService.setTxSignal(ledgerEntryRequest);

                    let xrplResponse;
                    try {
                         xrplResponse = await client.request(ledgerEntryRequest as any);
                    } catch (error: any) {
                         if (error.data?.error === 'entryNotFound') {
                              console.info('Credential was not found');
                              this.txUiService.setTxResultSignal(error.data);
                              this.txUiService.setError(`Credential not found.`);
                              return;
                         } else {
                              this.txUiService.setTxResultSignal(xrplResponse);
                              this.txUiService.setError(`Failed to check credential: ${error.message || 'Unknown error'}`);
                              return;
                         }
                    }

                    this.txUiService.setTxResultSignal(xrplResponse.result);

                    const credential = (xrplResponse.result as any).node;
                    console.info(`Found credential:`, credential);

                    // Check if the credential has been accepted
                    if (!(credential.Flags & AppConstants.LSF_ACCEPTED)) {
                         console.info('Credential is not accepted.');
                         this.txUiService.setTxResultSignal(xrplResponse.result);
                         this.txUiService.setError('Credential is not accepted.');
                         return;
                    }

                    // Confirm that the credential is not expired
                    if (credential.Expiration) {
                         const expirationTime = rippleTimeToISOTime(credential.Expiration);
                         console.info(`Credential has expiration: ${expirationTime}`);
                         console.info('Looking up validated ledger to check for expiration.');
                         let ledgerResponse;
                         try {
                              ledgerResponse = await client.request({
                                   command: 'ledger',
                                   ledger_index: 'validated',
                              });
                         } catch (error: any) {
                              this.txUiService.setError(`Failed to check credential: ${error.message || 'Unknown error'}`);
                              return;
                         }
                         const closeTime = rippleTimeToISOTime(ledgerResponse.result.ledger.close_time);
                         console.info(`Most recent validated ledger is: ${closeTime}`);
                         if (new Date(closeTime) > new Date(expirationTime)) {
                              console.info('Credential is expired.');
                              this.txUiService.setError(`Credential is expired.`);
                              return;
                         }

                         this.txUiService.setTxResultSignal(ledgerResponse.result);
                    }

                    // Credential has passed all checks
                    console.info('Credential is verified.');
                    this.txUiService.setSuccess(this.txUiService.result);
                    this.txUiService.successMessage = 'Credential is verified.';
                    return true;
               } catch (error: any) {
                    console.error('Error in verifyCredential:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private decodeutf8Hex(hex: string | undefined): string {
          if (!hex) return 'N/A';
          if (this.decodeCache.has(hex)) return this.decodeCache.get(hex)!;

          try {
               const result = Buffer.from(hex, 'hex').toString('utf8') || 'N/A';
               this.decodeCache.set(hex, result);
               return result;
          } catch {
               this.decodeCache.set(hex, 'Invalid Hex');
               return 'Invalid Hex';
          }
     }

     private getExistingCredentials(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Credential' && obj.Issuer === sender)
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         CredentialType: obj.CredentialType ? this.decodeutf8Hex(obj.CredentialType) : 'Unknown Type',
                         Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
                         Issuer: obj.Issuer,
                         Subject: obj.Subject,
                         URI: this.decodeutf8Hex(obj.URI),
                         Flags: this.utilsService.getCredentialStatus(obj.Flags),
                    };
               })
               .sort((a, b) => a.Expiration.localeCompare(b.Expiration));
          this.existingCredentials.set(mapped);
          this.utilsService.logObjects('existingCredentials', mapped);
     }

     private getSubjectCredentials(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Credential' && obj.Subject === sender)
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         CredentialType: obj.CredentialType ? this.decodeutf8Hex(obj.CredentialType) : 'Unknown Type',
                         Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
                         Issuer: obj.Issuer,
                         Subject: obj.Subject,
                         URI: this.decodeutf8Hex(obj.URI),
                         Flags: this.utilsService.getCredentialStatus(obj.Flags),
                    };
               })
               .sort((a, b) => a.Expiration.localeCompare(b.Expiration));
          this.subjectCredentials.set(mapped);
          this.utilsService.logObjects('subjectCredentials', mapped);
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, credentialTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'createCredential') {
               if (this.credential().uri) this.utilsService.setURI(credentialTx, this.credential().uri);
          }

          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(credentialTx, ticket, true);
               }
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(credentialTx, this.txUiService.memoField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          this.getExistingCredentials(accountObjects, wallet.classicAddress);
          this.getSubjectCredentials(accountObjects, wallet.classicAddress);
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
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private parseCredentials(accountObjects: xrpl.AccountObjectsResponse, address: string): void {
          const objs = accountObjects.result.account_objects ?? [];

          const issued = objs
               .filter(o => o.LedgerEntryType === 'Credential' && o.Issuer === address)
               .map(o => this.mapCredential(o))
               .sort((a, b) => (a.Expiration || '').localeCompare(b.Expiration || ''));

          const received = objs
               .filter(o => o.LedgerEntryType === 'Credential' && o.Subject === address)
               .map(o => this.mapCredential(o))
               .sort((a, b) => (a.Expiration || '').localeCompare(b.Expiration || ''));

          // Just set signals — infoData() recomputes automatically!
          this.existingCredentials.set(issued);
          this.subjectCredentials.set(received);
     }

     private mapCredential(obj: any): CredentialItem {
          return {
               index: obj.index,
               CredentialType: obj.CredentialType ? this.decodeutf8Hex(obj.CredentialType) : 'Unknown Type',
               Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
               Issuer: obj.Issuer,
               Subject: obj.Subject,
               URI: this.decodeutf8Hex(obj.URI),
               Flags: this.utilsService.getCredentialStatus(obj.Flags),
          };
     }

     private filterCredentials(list: CredentialItem[], term: string): CredentialItem[] {
          if (!term) return list;
          const lower = term.toLowerCase();
          return list.filter(c => [c.CredentialType, c.Issuer, c.Subject, c.index].some(f => f?.toLowerCase().includes(lower)));
     }

     private addNewDestinationFromUser(destination: string): void {
          if (!destination || !xrpl.isValidAddress(destination)) return;

          // Use destinationItems() instead of destinations()
          const alreadyExists = this.destinationItems().some((item: { id: string }) => item.id === destination);
          if (alreadyExists) return;

          this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
          this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
          this.updateDestinations();
     }

     populateDefaultDateTime() {
          if (!this.credential().subject.expirationDate) {
               const now = new Date();
               const year = now.getFullYear();
               const month = String(now.getMonth() + 1).padStart(2, '0');
               const day = String(now.getDate()).padStart(2, '0');
               const hours = String(now.getHours()).padStart(2, '0');
               const minutes = String(now.getMinutes()).padStart(2, '0');
               const seconds = String(now.getSeconds()).padStart(2, '0');
               this.credential.update(cred => ({ ...cred, subject: { ...cred.subject, expirationDate: `${year}-${month}-${day}T${hours}:${minutes}:${seconds}` } }));
          }
     }

     copyCredentialId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Credential Id copied!');
          });
     }

     isCredentialAccepted(cred: CredentialItem): boolean {
          // Flags come from XRPL as number, but your utilsService.getCredentialStatus() returns object
          // So we check both possibilities
          if (typeof cred.Flags === 'number') {
               return (cred.Flags & AppConstants.LSF_ACCEPTED) !== 0;
          }
          if (typeof cred.Flags === 'object') {
               return !!(cred.Flags as any).lsfAccepted;
          }
          if (cred.Flags === 'Credential accepted') {
               return true;
          }
          return false;
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     resetCredentialIdDropDown() {
          this.selectedCredentials.set(null);
          this.credentialID.set('');
          this.credentialType.set('');
     }

     clearFields() {
          this.resetCredentialIdDropDown();
          this.txUiService.clearAllOptionsAndMessages();
     }

     // selectCredentialId(domainId: string): void {
     //      this.credentialID.set(domainId); // Auto-fill the Domain ID field
     //      this.credentialIdSearchQuery.set(''); // Clear search
     //      this.closeCredentialIdDropdown();
     // }

     onCredentialIdInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.credentialIdSearchQuery.set(value);
     }
}
