import { animate, style, transition, trigger } from '@angular/animations';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { CredentialAccept, CredentialCreate, CredentialDelete, rippleTimeToISOTime } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { DropdownItem } from '../../models/dropdown-item.model';
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
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './credentials.component.html',
     styleUrl: './credentials.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCredentialsComponent extends PerformanceBaseComponent implements OnInit, AfterViewInit {
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('credentialIdDropdownOrigin') credentialIdDropdownOrigin!: ElementRef<HTMLInputElement>;
     @ViewChild('credentialIdDropdownTemplate') credentialIdDropdownTemplate!: TemplateRef<any>;
     @ViewChild('domainDropdownOrigin') domainDropdownOrigin!: ElementRef<HTMLInputElement>;
     @ViewChild('acceptedCredentialIdDropdownTemplate') acceptedCredentialIdDropdownTemplate!: TemplateRef<any>;

     private readonly destroyRef = inject(DestroyRef);
     private readonly overlay = inject(Overlay);
     private readonly viewContainerRef = inject(ViewContainerRef);

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

     // Destination Dropdown
     credentialIdSearchQuery = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     private overlayRef: OverlayRef | null = null;
     private credentialIdOverlayRef: OverlayRef | null = null;
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     destinationTagField = signal<string>('');
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
     destinationField = signal<string>('');
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

     credentialIdDisplay = computed(() => {
          const id = this.credentialID();
          if (!id) return this.credentialIdSearchQuery() || '';
          return this.dropdownService.formatDomainId(id);
     });

     filteredcredentialIds = computed(() => {
          const q = this.credentialIdSearchQuery().trim().toLowerCase();
          const list = this.activeTab() === 'accept' ? this.subjectCredentials() : this.existingCredentials();

          if (q === '') return list;
          return list.filter(d => d.index.toLowerCase().includes(q));
     });

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
          this.setupDropdownSubscriptions();
          this.populateDefaultDateTime();
     }

     ngAfterViewInit(): void {}

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
                    if (wallet) this.selectWallet(wallet);
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearTxSignal();
                    this.txUiService.clearTxResultSignal();
                    await this.getCredentialsForAccount(false);
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
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
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

               const destinationAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
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
                    if (!result.success) return;

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
                    if (!result.success) return;

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Credential delete successfully!' : 'Credential removed successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
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
                    if (!result.success) return;

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

     // filteredCredentials = computed(() => {
     //      const term = this.credentialSearchTerm(); // we'll use a signal for search term
     //      const creds = this.existingCredentials();

     //      if (!term) return creds;
     //      if (!creds || creds.length === 0) return [];

     //      const lower = term.toLowerCase();
     //      return creds.filter(c => (c.CredentialType || '').toLowerCase().includes(lower) || (c.Issuer || '').toLowerCase().includes(lower) || (c.Subject || '').toLowerCase().includes(lower) || (c.index || '').toLowerCase().includes(lower));
     // });

     // filteredAcceptableCredentials = computed(() => {
     //      const term = this.credentialSearchTerm();
     //      const creds = this.subjectCredentials();

     //      if (!term) return creds;
     //      if (!creds || creds.length === 0) return [];

     //      const lower = term.toLowerCase();
     //      return creds.filter(c => (c.CredentialType || '').toLowerCase().includes(lower) || (c.Issuer || '').toLowerCase().includes(lower) || (c.Subject || '').toLowerCase().includes(lower) || (c.index || '').toLowerCase().includes(lower));
     // });

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

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private ensureDefaultNotSelected() {
          const currentAddress = this.currentWallet().address;
          if (currentAddress && this.destinations().length > 0) {
               if (!this.credential().subject.destinationAddress || this.credential().subject.destinationAddress === currentAddress) {
                    const nonSelectedDest = this.destinations().find(d => d.address !== currentAddress);
                    this.credential.update(cred => ({ ...cred, subject: { ...cred.subject, destinationAddress: nonSelectedDest ? nonSelectedDest.address : this.destinations()[0].address } }));
               }
          }
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
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
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
          this.txUiService.clearAllOptionsAndMessages();
     }

     onDestinationInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;

          this.destinationSearchQuery.set(value);
          this.selectedDestinationAddress.set(''); // clear selection when typing

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

     onArrowDown() {
          if (this.filteredDestinations().length === 0) return;
     }

     openDropdown(): void {
          this.dropdownService.setItems(this.destinations());

          // Always reset search when opening fresh
          this.destinationSearchQuery.set('');
          this.dropdownService.openDropdown();
     }

     closeDropdown(): void {
          this.dropdownService.closeDropdown();

          if (this.overlayRef) {
               this.overlayRef.dispose();
               this.overlayRef = null;
          }

          if (this.credentialIdOverlayRef) {
               this.credentialIdOverlayRef.dispose();
               this.credentialIdOverlayRef = null;
          }
     }

     toggleDropdown(): void {
          this.dropdownService.setItems(this.destinations());
          this.dropdownService.toggleDropdown();
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

          this.overlayRef.attach(new TemplatePortal(this.dropdownTemplate, this.viewContainerRef));
          this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());
     }

     private closeDropdownInternal(): void {
          this.overlayRef?.detach();
          this.overlayRef = null;
     }

     openCredentialIdDropdown(): void {
          if (this.credentialIdOverlayRef?.hasAttached()) return;

          if (this.credentialIdOverlayRef) {
               this.credentialIdOverlayRef.dispose();
               this.credentialIdOverlayRef = null;
          }

          // Choose correct origin and template based on current tab
          const isAcceptTab = this.activeTab() === 'accept';
          const originEl = isAcceptTab ? this.domainDropdownOrigin : this.credentialIdDropdownOrigin;
          const template = isAcceptTab ? this.acceptedCredentialIdDropdownTemplate : this.credentialIdDropdownTemplate;

          if (!originEl) {
               console.warn('Dropdown origin not found for tab:', this.activeTab());
               return;
          }

          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(originEl)
               .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
               ]);

          this.credentialIdOverlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.reposition(),
               width: originEl.nativeElement.getBoundingClientRect().width,
          });

          this.credentialIdOverlayRef.attach(new TemplatePortal(template, this.viewContainerRef));
          this.credentialIdOverlayRef.backdropClick().subscribe(() => this.closeCredentialIdDropdown());
     }

     openCredentialIdDropdown1(): void {
          if (this.credentialIdOverlayRef?.hasAttached()) return;

          // Always destroy first — no exceptions
          if (this.credentialIdOverlayRef) {
               this.credentialIdOverlayRef.dispose();
               this.credentialIdOverlayRef = null;
          }

          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(this.credentialIdDropdownOrigin)
               .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
               ]);

          this.credentialIdOverlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.reposition(),
               width: this.credentialIdDropdownOrigin.nativeElement.getBoundingClientRect().width,
          });

          this.credentialIdOverlayRef.attach(new TemplatePortal(this.credentialIdDropdownTemplate, this.viewContainerRef));
          this.credentialIdOverlayRef.backdropClick().subscribe(() => this.closeCredentialIdDropdown());
     }

     closeCredentialIdDropdown(): void {
          this.credentialIdOverlayRef?.detach();
          this.credentialIdOverlayRef = null;
     }

     selectCredentialId(domainId: string): void {
          // this.selectedDomainId.set(domainId);
          this.credentialID.set(domainId); // Auto-fill the Domain ID field
          this.credentialIdSearchQuery.set(''); // Clear search
          this.closeCredentialIdDropdown();
     }

     onCredentialIdInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.credentialIdSearchQuery.set(value);
          // this.selectedDomainId.set(null); // Clear selection while typing
     }
}
