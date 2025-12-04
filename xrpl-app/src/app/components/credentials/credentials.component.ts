import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, TemplateRef, inject, signal, computed, effect, DestroyRef, ChangeDetectionStrategy, Injector, ViewContainerRef, afterRenderEffect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
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
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { CredentialCreate, CredentialDelete, CredentialAccept, rippleTimeToISOTime } from 'xrpl';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { Subject } from 'rxjs';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';

interface ValidationInputs {
     seed?: string;
     accountInfo?: any;
     destination?: any;
     credentialID?: any;
     domainId?: string;
     credentialType?: string;
     date?: string;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeySeed?: string;
     useMultiSign?: boolean;
     multiSignSeeds?: string;
     multiSignAddresses?: string;
     isTicket?: boolean;
     selectedSingleTicket?: string;
     selectedTicket?: string;
     signerQuorum?: number;
     signers?: { account: string; weight: number }[];
}

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
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TooltipLinkComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './credentials.component.html',
     styleUrl: './credentials.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCredentialsComponent extends PerformanceBaseComponent implements OnInit, AfterViewInit {
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
     private readonly destinationDropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);

     // ViewChildren & Template
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('credentialInput', { static: false }) inputElement!: ElementRef<HTMLInputElement>;

     // Reactive State (Signals)
     activeTab = signal<'create' | 'accept' | 'delete' | 'verify'>('create');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     hasWallets = computed(() => this.wallets().length > 0);

     // Credential lists
     existingCredentials = signal<CredentialItem[]>([]);
     subjectCredentials = signal<CredentialItem[]>([]);

     // Filtered credentials — derived state, fully reactive
     filteredExisting = computed(() => this.filterCredentials(this.existingCredentials(), this.credentialSearchTerm()));
     filteredSubject = computed(() => this.filterCredentials(this.subjectCredentials(), this.credentialSearchTerm()));

     // Form & UI State
     credentialSearchTerm = signal<string>('');
     destinationField = signal<string>('');
     credentialID = signal<string>('');
     credentialType = signal<string>('');
     selectedCredentials = signal<CredentialItem | null>(null);
     infoPanelExpanded = signal(false);

     isRegularKeyAddress = signal<boolean>(false);
     regularKeyAddress = signal<string>('');
     regularKeySeed = signal<string>('');
     useMultiSign = signal<boolean>(false);
     multiSignAddress = signal<string>('');
     multiSignSeeds = signal<string>('');
     isTicket = signal<boolean>(false);
     selectedSingleTicket = signal<string>('');
     selectedTicket = signal<string>('');
     memoField = signal<string>('');
     isMemoEnabled = signal<boolean>(false);

     // Dropdown
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     destinations = signal<DropdownItem[]>([]);

     filteredDestinations = signal<DropdownItem[]>([]);
     highlightedIndex = signal<number>(-1);
     showDropdown = signal<boolean>(false);
     private overlayRef: OverlayRef | null = null;

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

     url = signal<string>('');
     public destinationSearch$ = new Subject<string>();
     private decodeCache = new Map<string, string>();
     selectedTickets = signal<string[]>([]);
     multiSelectMode = signal<boolean>(false);
     signers = signal<{ account: string; seed: string; weight: number }[]>([{ account: '', seed: '', weight: 1 }]);
     signerQuorum = signal<number>(0);
     multiSigningEnabled = signal<boolean>(false);
     regularKeySigningEnabled = signal<boolean>(false);
     ticketArray = signal<string[]>([]);
     masterKeyDisabled = signal<boolean>(false);
     credentialData = signal<string>('');
     subject = signal<string>('');
     selectedWalletIndex = signal<number>(0);
     createdCredentials = signal<boolean>(true);
     subjectCredential = signal<boolean>(true);
     editingIndex!: (index: number) => boolean;
     tempName = signal<string>('');
     filterQuery = signal<string>('');
     showCredentialDropdown = signal<boolean>(false);

     constructor() {
          super();
          this.txUiService.clearTxSignal();
          this.txUiService.clearTxResultSignal();
          effect(() => this.updateInfoMessage());
          effect(() => {
               this.destinations.set([...this.wallets().map(w => ({ name: w.name ?? `Wallet ${w.address.slice(0, 8)}`, address: w.address } as DropdownItem)), ...this.customDestinations()]);
          });
     }

     ngOnInit() {
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url.set(AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET);

          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.setupDropdownSubscriptions();
          this.populateDefaultDateTime();
     }

     ngAfterViewInit(): void {
          document.addEventListener('keydown', e => {
               if (e.key === 'Escape' && this.showDropdown()) this.closeDropdown();
          });
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
     }

     private setupWalletSubscriptions(): void {
          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);

               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) this.currentWallet.set({ ...wallet });
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.currentWallet.set({ ...wallet });
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearTxSignal();
                    this.txUiService.clearTxResultSignal();
                    this.getCredentialsForAccount(false);
               }
          });
     }

     private setupDropdownSubscriptions(): void {
          this.destinationDropdownService.filtered$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(list => {
               this.filteredDestinations.set(list);
               this.highlightedIndex.set(list.length > 0 ? 0 : -1);
          });

          this.destinationDropdownService.isOpen$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(open => (open ? this.openDropdownInternal() : this.closeDropdownInternal()));
     }

     onSelectCredentials(credential: CredentialItem | null) {
          if (!credential) {
               this.selectedCredentials.set(null);
               this.credentialID.set('');
               this.credentialType.set('');
               return;
          }
          // Keep the search term that led to this selection!
          this.selectedCredentials.set(credential); // store the whole object
          this.credentialID.set(credential.index);
          this.credentialType.set(credential.CredentialType || '');
     }

     toggleCreatedCredentials() {
          this.createdCredentials.update(val => !val);
     }

     toggleSubjectCredentials() {
          this.subjectCredential.update(val => !val);
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

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign(), this.signers(), (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.txUiService.setError(`${error.message}`);
          }
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
          this.updateInfoMessage(); // Rebuild the HTML with new state
     }

     onWalletSelected(wallet: Wallet) {
          this.currentWallet.set({ ...wallet });
          // Prevent setting self as the destination after switching wallet
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address || this.destinationField();
          if (currentDest === wallet.address) {
               this.destinationField.set('');
          }
     }

     async setTab(tab: 'create' | 'accept' | 'delete' | 'verify'): Promise<void> {
          this.activeTab.set(tab);
          this.clearFields(true);
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
               try {
                    const client = await this.getClient();
                    const wallet = await this.getWallet();
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length) {
                         this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                         return;
                    }

                    this.parseCredentials(accountObjects, wallet.classicAddress);
                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.clearFields(true);
               } catch (error: any) {
                    console.error('Error in getCredentialsForAccount:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner = false;
               }
          });
     }

     async createCredential() {
          await this.withPerf('createCredential', async () => {
               this.txUiService.clearMessages();
               this.txUiService.updateSpinnerMessage(``);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet().seed,
                    destination: this.credential().subject.destinationAddress,
                    credentialType: this.credential().credential_type,
                    isRegularKeyAddress: this.isRegularKeyAddress(),
                    regularKeyAddress: this.isRegularKeyAddress() ? this.regularKeyAddress() : undefined,
                    regularKeySeed: this.isRegularKeyAddress() ? this.regularKeySeed() : undefined,
                    useMultiSign: this.useMultiSign(),
                    multiSignAddresses: this.useMultiSign() ? this.multiSignAddress() : undefined,
                    multiSignSeeds: this.useMultiSign() ? this.multiSignSeeds() : undefined,
                    isTicket: this.isTicket(),
                    selectedTicket: this.selectedTicket(),
                    selectedSingleTicket: this.selectedSingleTicket(),
                    date: this.credential().subject.expirationDate,
               };

               try {
                    const client = await this.getClient();
                    const wallet = await this.getWallet();

                    const [accountInfo, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    if (this.destinationField() === '') {
                         return this.txUiService.setError(`Destination cannot be empty.`);
                    }

                    const isShortForm = this.destinationField().includes('...');
                    const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address : this.destinationField();
                    inputs.destination = resolvedDestination;
                    inputs.date = this.credential().subject.expirationDate;

                    const errors = await this.validationService.validate('CredentialCreate', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    console.debug('expirationDate:', this.credential().subject.expirationDate);
                    const expirationRipple = this.utilsService.toRippleTime(this.credential().subject.expirationDate || '');
                    console.debug('expirationRipple:', expirationRipple);

                    const credentialCreateTx: CredentialCreate = {
                         TransactionType: 'CredentialCreate',
                         Account: wallet.classicAddress,
                         CredentialType: Buffer.from(this.credential().credential_type || 'defaultCredentialType', 'utf8').toString('hex'),
                         Subject: resolvedDestination,
                         Expiration: expirationRipple,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, credentialCreateTx, wallet, accountInfo, 'createCredential');

                    const result = await this.txExecutor.createCredential(credentialCreateTx, wallet, client, {
                         useMultiSign: this.useMultiSign(),
                         isRegularKeyAddress: this.isRegularKeyAddress(),
                         regularKeySeed: this.regularKeySeed(),
                         multiSignAddress: this.multiSignAddress(),
                         multiSignSeeds: this.multiSignSeeds(),
                    });
                    if (!result.success) return;

                    if (!this.txUiService.isSimulateEnabled) {
                         this.txUiService.successMessage = 'Created credential successfully!';
                         await this.refreshAfterTx(client, wallet, resolvedDestination, true);
                    } else {
                         this.txUiService.successMessage = 'Simulated Setting Credential successfully!';
                    }
               } catch (error: any) {
                    console.error('Error in createCredential:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner = false;
               }
          });
     }

     async deleteCredentials() {
          await this.withPerf('createCredential', async () => {
               this.txUiService.clearMessages();
               this.txUiService.updateSpinnerMessage(``);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet().seed,
                    credentialID: this.credentialID(),
                    credentialType: this.credential().credential_type,
                    isRegularKeyAddress: this.isRegularKeyAddress(),
                    useMultiSign: this.useMultiSign(),
                    regularKeyAddress: this.isRegularKeyAddress() ? this.regularKeyAddress() : undefined,
                    regularKeySeed: this.isRegularKeyAddress() ? this.regularKeySeed() : undefined,
                    multiSignAddresses: this.useMultiSign() ? this.multiSignAddress() : undefined,
                    multiSignSeeds: this.useMultiSign() ? this.multiSignSeeds() : undefined,
                    isTicket: this.isTicket(),
                    selectedTicket: this.selectedTicket(),
                    selectedSingleTicket: this.selectedSingleTicket(),
               };

               try {
                    const client = await this.getClient();
                    const wallet = await this.getWallet();

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    inputs.accountInfo = accountInfo;
                    const errors = await this.validationService.validate('CredentialDelete', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    const credentialFound = accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'Credential' && line.index === this.credentialID();
                    });

                    // If not found, exit early
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
                         useMultiSign: this.useMultiSign(),
                         isRegularKeyAddress: this.isRegularKeyAddress(),
                         regularKeySeed: this.regularKeySeed(),
                         multiSignAddress: this.multiSignAddress(),
                         multiSignSeeds: this.multiSignSeeds(),
                    });
                    if (!result.success) return;

                    if (!this.txUiService.isSimulateEnabled) {
                         this.txUiService.successMessage = 'Credential removed successfully!';
                         await this.refreshAfterTx(client, wallet, null, false);
                    } else {
                         this.txUiService.successMessage = 'Simulated Credential delete successfully!';
                    }
               } catch (error: any) {
                    console.error('Error:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner = false;
               }
          });
     }

     async acceptCredentials() {
          await this.withPerf('acceptCredentials', async () => {
               this.txUiService.clearMessages();
               this.txUiService.updateSpinnerMessage(``);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet().seed,
                    credentialType: this.credential().credential_type,
                    credentialID: this.credentialID(),
                    isRegularKeyAddress: this.isRegularKeyAddress(),
                    regularKeyAddress: this.isRegularKeyAddress() ? this.regularKeyAddress() : undefined,
                    regularKeySeed: this.isRegularKeyAddress() ? this.regularKeySeed() : undefined,
                    useMultiSign: this.useMultiSign(),
                    multiSignAddresses: this.useMultiSign() ? this.multiSignAddress() : undefined,
                    multiSignSeeds: this.useMultiSign() ? this.multiSignSeeds() : undefined,
                    isTicket: this.isTicket(),
                    selectedTicket: this.selectedTicket(),
                    selectedSingleTicket: this.selectedSingleTicket(),
               };

               try {
                    const client = await this.getClient();
                    const wallet = await this.getWallet();

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    inputs.accountInfo = accountInfo;

                    const errors = await this.validationService.validate('CredentialAccept', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    const credentialFound = accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'Credential' && line.Subject === wallet.classicAddress; // && line.index === this.credentialID();
                    });

                    // If not found, exit early
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
                         useMultiSign: this.useMultiSign(),
                         isRegularKeyAddress: this.isRegularKeyAddress(),
                         regularKeySeed: this.regularKeySeed(),
                         multiSignAddress: this.multiSignAddress(),
                         multiSignSeeds: this.multiSignSeeds(),
                    });
                    if (!result.success) return;

                    if (!this.txUiService.isSimulateEnabled) {
                         this.txUiService.successMessage = 'Credential accepted successfully!';
                         await this.refreshAfterTx(client, wallet, null, false);
                    } else {
                         this.txUiService.successMessage = 'Simulated accepting credential successfully!';
                    }
               } catch (error: any) {
                    console.error('Error in acceptCredentials:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner = false;
               }
          });
     }

     async verifyCredential(binary: boolean): Promise<boolean | void> {
          await this.withPerf('verifyCredential', async () => {
               this.txUiService.clearMessages();
               this.txUiService.updateSpinnerMessage(``);
               const inputs: ValidationInputs = {
                    seed: this.currentWallet().seed,
                    destination: this.credential().subject.destinationAddress,
                    credentialID: this.credentialID(),
                    credentialType: this.credentialType(),
                    isRegularKeyAddress: this.isRegularKeyAddress(),
                    useMultiSign: this.useMultiSign(),
                    regularKeyAddress: this.isRegularKeyAddress() ? this.regularKeyAddress() : undefined,
                    regularKeySeed: this.isRegularKeyAddress() ? this.regularKeySeed() : undefined,
                    multiSignAddresses: this.useMultiSign() ? this.multiSignAddress() : undefined,
                    multiSignSeeds: this.useMultiSign() ? this.multiSignSeeds() : undefined,
                    isTicket: this.isTicket(),
                    selectedTicket: this.selectedTicket(),
                    selectedSingleTicket: this.selectedSingleTicket(),
               };
               try {
                    const client = await this.getClient();
                    const wallet = await this.getWallet();

                    const accountInfo = await this.xrplCache.getAccountInfo(wallet.classicAddress, false);
                    inputs.accountInfo = accountInfo;

                    const errors = await this.validationService.validate('CredentialVerify', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         this.txUiService.isSuccess = false;
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
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
                    this.updateInfoMessage();
                    console.info('Credential is verified.');
                    this.txUiService.setSuccess(this.txUiService.result);
                    this.txUiService.successMessage = 'Credential is verified.';
                    return true;
               } catch (error: any) {
                    console.error('Error:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner = false;
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

     filteredCredentials = computed(() => {
          const term = this.credentialSearchTerm(); // we'll use a signal for search term
          const creds = this.existingCredentials();

          if (!term) return creds;
          if (!creds || creds.length === 0) return [];

          const lower = term.toLowerCase();
          return creds.filter(c => (c.CredentialType || '').toLowerCase().includes(lower) || (c.Issuer || '').toLowerCase().includes(lower) || (c.Subject || '').toLowerCase().includes(lower) || (c.index || '').toLowerCase().includes(lower));
     });

     filteredAcceptableCredentials = computed(() => {
          const term = this.credentialSearchTerm();
          const creds = this.subjectCredentials();

          if (!term) return creds;
          if (!creds || creds.length === 0) return [];

          const lower = term.toLowerCase();
          return creds.filter(c => (c.CredentialType || '').toLowerCase().includes(lower) || (c.Issuer || '').toLowerCase().includes(lower) || (c.Subject || '').toLowerCase().includes(lower) || (c.index || '').toLowerCase().includes(lower));
     });

     private async setTxOptionalFields(client: xrpl.Client, credentialTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (txType === 'createCredential') {
               if (this.credential().uri) this.utilsService.setURI(credentialTx, this.credential().uri);
          }
          if (this.selectedSingleTicket()) {
               const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket()));
               if (!exists) throw new Error(`Ticket ${this.selectedSingleTicket()} not found`);
               this.utilsService.setTicketSequence(credentialTx, this.selectedSingleTicket(), true);
          } else {
               if (this.multiSelectMode() && this.selectedTickets().length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets());
                    this.utilsService.setTicketSequence(credentialTx, accountInfo.result.account_data.Sequence, false);
               }
          }
          if (this.memoField()) this.utilsService.setMemoField(credentialTx, this.memoField());
     }

     private async refreshAfterTx(client: any, wallet: any, resolvedDestination: string | null, addNewDestinationFromUser: boolean) {
          try {
               const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
               this.getExistingCredentials(accountObjects, wallet.classicAddress);
               this.getSubjectCredentials(accountObjects, wallet.classicAddress);
               resolvedDestination ? await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error) : await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
               if (addNewDestinationFromUser) this.addNewDestinationFromUser();
               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers());
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.updateInfoMessage();
          } catch (error: any) {
               console.error('Error in refreshAfterTx:', error);
          }
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     private updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          const tickets = this.utilsService.getAccountTickets(accountObjects);
          this.ticketArray.update(() => [...tickets]);
          if (this.multiSelectMode()) {
               this.selectedSingleTicket.set(this.utilsService.cleanUpMultiSelection(this.selectedTickets(), tickets));
          } else {
               this.selectedSingleTicket.set(this.utilsService.cleanUpSingleSelection(this.selectedTickets(), tickets));
          }
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     public refreshUiAccountObjects(accountObjects: xrpl.AccountObjectsResponse, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet): void {
          // Tickets
          this.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));
          this.selectedTicket.set(this.ticketArray()[0] || this.selectedTicket());
          // Signer accounts
          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          this.signerQuorum.set(signerQuorum);
          const hasSignerAccounts = signerAccounts?.length > 0;
          this.checkForMultiSigners(hasSignerAccounts, wallet);
          // Boolean flags
          this.multiSigningEnabled.set(hasSignerAccounts);
          this.useMultiSign.set(false);
          this.masterKeyDisabled.set(Boolean(accountInfo?.result?.account_flags?.disableMasterKey));
          this.clearFields(false);
     }

     private checkForMultiSigners(hasSignerAccounts: boolean, wallet: xrpl.Wallet) {
          if (hasSignerAccounts) {
               const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
               this.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
          } else {
               this.signerQuorum.set(0);
               this.multiSignAddress.set('No Multi-Sign address configured for account');
               this.multiSignSeeds.set('');
               this.storageService.removeValue('signerEntries');
          }
     }

     public refreshUiAccountInfo(accountInfo: xrpl.AccountInfoResponse): void {
          const accountData = accountInfo?.result?.account_data;
          if (!accountData) return;
          const regularKey = accountData.RegularKey;
          const isMasterKeyDisabled = accountInfo?.result?.account_flags?.disableMasterKey ?? false;
          // Set regular key properties
          const rkProps = this.utilsService.setRegularKeyProperties(regularKey, accountData.Account) || { regularKeyAddress: 'No RegularKey configured for account', regularKeySeed: '', isRegularKeyAddress: false };
          this.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.regularKeySeed.set(rkProps.regularKeySeed);
          // Set master key property
          this.masterKeyDisabled.set(isMasterKeyDisabled);
          // Set regular key signing enabled flag
          this.regularKeySigningEnabled.set(!!regularKey);
     }

     private updateDestinations(): void {
          const walletItems: DropdownItem[] = this.wallets().map(wallet => ({
               name: wallet.name ?? this.truncateAddress(wallet.address),
               address: wallet.address,
          }));

          const allItems = [...walletItems, ...this.customDestinations()];
          this.destinations.set(allItems);

          // Auto-fill first destination if field is empty
          if (allItems.length > 0 && !this.destinationField()) {
               this.credential.update(cred => ({
                    ...cred,
                    subject: { ...cred.subject, destinationAddress: allItems[0].address },
               }));
          }

          // Optional: persist (you had this before)
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

          this.existingCredentials.set(issued);
          this.subjectCredentials.set(received);
          console.log(`existingCredentials ${this.existingCredentials()} subjectCredentials ${this.subjectCredentials()}`);
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

     private async getWallet(): Promise<xrpl.Wallet> {
          const encryption = this.currentWallet().encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, encryption as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private addNewDestinationFromUser() {
          const addr = this.destinationField().includes('...') ? this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address : this.destinationField();
          if (addr && xrpl.isValidAddress(addr) && !this.destinations().some(d => d.address === addr)) {
               this.customDestinations.update(dest => [...dest, { name: `Custom ${dest.length + 1}`, address: addr }]);
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

     private updateInfoMessage(): void {
          if (!this.currentWallet().address) {
               this.txUiService.setInfoData(null);
               return;
          }

          const walletName = this.currentWallet().name || 'Selected wallet';

          const issuedByMe = this.existingCredentials() ?? [];
          const issuedToMe = this.subjectCredentials() ?? [];

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

          this.txUiService.setInfoData({
               walletName,
               mode: this.activeTab(),
               issuedByMe,
               issuedToMe,
               pendingIssued,
               acceptedIssued,
               pendingToAccept,
               acceptedByMe,
               credentialsToShow,
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
          return this.txUiService.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }

     clearFields(all = true) {
          if (all) {
               this.selectedCredentials.set(null);
               this.credentialType.set('');
               this.txUiService.successMessage = '';
               this.txUiService.clearTxSignal();
               this.txUiService.clearTxResultSignal();
               this.txUiService.isSimulateEnabled = false;
               this.txUiService.clearMessages();
               this.txUiService.clearWarning();
          }

          this.credentialSearchTerm.set('');
          this.isRegularKeyAddress.set(false);
          this.useMultiSign.set(false);
          this.credentialID.set('');
          this.selectedSingleTicket.set('');
          this.isTicket.set(false);
          this.selectedTicket.set('');
          this.isMemoEnabled.set(false);
          this.memoField.set('');
     }

     filterDestinations() {
          const query = this.filterQuery().trim().toLowerCase();
          if (query === '') {
               this.filteredDestinations.set([...this.destinations()]);
          } else {
               this.filteredDestinations.set(this.destinations().filter(d => d.address.toLowerCase().includes(query) || (d.name && d.name.toLowerCase().includes(query))));
          }
          this.highlightedIndex.set(this.filteredDestinations().length > 0 ? 0 : -1);
     }

     onArrowDown() {
          if (!this.showDropdown || this.filteredDestinations().length === 0) return;
          this.highlightedIndex.update(idx => (idx + 1) % this.filteredDestinations().length);
     }

     selectHighlighted() {
          if (this.highlightedIndex() >= 0 && this.filteredDestinations()[this.highlightedIndex()]) {
               const addr = this.filteredDestinations()[this.highlightedIndex()].address;
               if (addr !== this.currentWallet().address) {
                    this.destinationField.set(addr);
                    this.closeDropdown(); // Also close on Enter
               }
          }
     }

     openDropdown(): void {
          this.destinationDropdownService.setItems(this.destinations());
          this.destinationDropdownService.filter(this.destinationField());
          this.destinationDropdownService.openDropdown();
     }

     closeDropdown() {
          this.destinationDropdownService.closeDropdown();
     }

     toggleDropdown() {
          this.destinationDropdownService.setItems(this.destinations());
          this.destinationDropdownService.toggleDropdown();
     }

     onDestinationInput() {
          this.destinationDropdownService.filter(this.destinationField() || '');
          this.destinationDropdownService.openDropdown();
     }

     selectDestination(address: string) {
          if (address === this.currentWallet().address) return;
          const dest = this.destinations().find((d: { address: string }) => d.address === address);
          this.destinationField.set(dest ? this.destinationDropdownService.formatDisplay(dest) : `${address.slice(0, 6)}...${address.slice(-6)}`);
          this.closeDropdown();
     }

     private openDropdownInternal() {
          if (this.overlayRef?.hasAttached()) return;
          const strategy = this.overlay
               .position()
               .flexibleConnectedTo(this.dropdownOrigin)
               .withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 }]);
          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy: strategy,
               scrollStrategy: this.overlay.scrollStrategies.close(),
          });
          this.overlayRef.attach(new TemplatePortal(this.dropdownTemplate, this.viewContainerRef));
          this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());
     }

     private closeDropdownInternal() {
          this.overlayRef?.detach();
          this.overlayRef = null;
     }
}
