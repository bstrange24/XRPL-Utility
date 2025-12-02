import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { CredentialCreate, CredentialDelete, CredentialAccept, rippleTimeToISOTime } from 'xrpl';
import * as xrpl from 'xrpl';
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
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { debounceTime, distinctUntilChanged, filter, map, startWith, switchMap } from 'rxjs/operators';
import * as lodash from 'lodash'; // For memoize
import { toObservable } from '@angular/core/rxjs-interop';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
declare var Prism: any;

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

@Component({
     selector: 'app-credentials',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './credentials.component.html',
     styleUrl: './credentials.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCredentialsComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     private readonly injector = inject(Injector);
     public destinationSearch$ = new Subject<string>();
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('credentialInput', { static: false }) inputElement!: ElementRef<HTMLInputElement>;
     // Use signals for reactive state
     activeTab = signal<string>('create');
     currentWallet = signal<Wallet>({} as Wallet);
     wallets = signal<Wallet[]>([]);
     hasWallets = computed(() => this.wallets().length > 0);
     existingCredentials = signal<any[]>([]);
     subjectCredentials = signal<any[]>([]);
     private decodeCache = new Map<string, string>();
     // Form fields
     amountField = signal<string>('');
     destinationField = signal<string>('');
     destinationTagField = signal<string>('');
     sourceTagField = signal<string>('');
     invoiceIdField = signal<string>('');
     memoField = signal<string>('');
     isMemoEnabled = signal<boolean>(false);
     useMultiSign = signal<boolean>(false);
     isRegularKeyAddress = signal<boolean>(false);
     isTicket = signal<boolean>(false);
     selectedSingleTicket = signal<string>('');
     selectedTickets = signal<string[]>([]);
     multiSelectMode = signal<boolean>(false);
     showDropdown = signal<boolean>(false);
     signers = signal<{ account: string; seed: string; weight: number }[]>([{ account: '', seed: '', weight: 1 }]);
     selectedTicket = signal<string>('');
     credentialSearchTerm = signal<string>('');
     // Multi-sign & Regular Key
     multiSignAddress = signal<string>('');
     multiSignSeeds = signal<string>('');
     signerQuorum = signal<number>(0);
     regularKeyAddress = signal<string>('');
     regularKeySeed = signal<string>('');
     multiSigningEnabled = signal<boolean>(false);
     regularKeySigningEnabled = signal<boolean>(false);
     ticketArray = signal<string[]>([]);
     masterKeyDisabled = signal<boolean>(false);
     // Dropdown
     private overlayRef: OverlayRef | null = null;
     filteredDestinations = signal<DropdownItem[]>([]);
     highlightedIndex = signal<number>(-1);
     destinations = signal<DropdownItem[]>([]);
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     // Code preview
     private lastPaymentTx = '';
     private lastTxResult = '';
     executionTime = signal<string>('');
     environment = signal<string>('');
     url = signal<string>('');
     // Credential Specific
     selectedCredentials = signal<CredentialItem | null>(null);
     currencyField = signal<string>('');
     currencyBalanceField = signal<string>('');
     credentialType = signal<string>('');
     credentialData = signal<string>('');
     credentialID = signal<string>('');
     subject = signal<string>('');
     credential = signal<{
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
     }>({
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
          verification: {
               method: '',
               verified_at: '',
               verifier: '',
          },
          hash: '',
          uri: 'ipfs://bafybeiexamplehash',
     });
     selectedWalletIndex = signal<number>(0);
     createdCredentials = signal<boolean>(true);
     subjectCredential = signal<boolean>(true);
     editingIndex!: (index: number) => boolean;
     tempName = signal<string>('');
     filterQuery = signal<string>('');
     showCredentialDropdown = signal<boolean>(false);

     constructor(
          private xrplService: XrplService,
          public utilsService: UtilsService,
          private storageService: StorageService,
          private xrplTransactions: XrplTransactionService,
          private walletManagerService: WalletManagerService,
          public txUiService: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private validationService: ValidationService,
          private overlay: Overlay,
          private viewContainerRef: ViewContainerRef,
          private destinationDropdownService: DestinationDropdownService,
          private cdr: ChangeDetectorRef,
          private xrplCache: XrplCacheService
     ) {}

     ngOnInit() {
          this.environment.set(this.xrplService.getNet().environment);
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url.set(AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET);

          // === 1. Listen to wallet list changes (wallets$.valueChanges) ===
          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets.set(wallets);
               // Rebuild destination dropdown whenever wallets change
               this.updateDestinations();
               // Only set currentWallet on first load if nothing is selected yet
               if (this.hasWallets() && !this.currentWallet().address) {
                    const selectedIndex = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const selectedWallet = wallets[selectedIndex];
                    if (selectedWallet) {
                         this.currentWallet.set({ ...selectedWallet });
                    }
               }
               this.cdr.markForCheck();
          });

          // === 2. Listen to selected wallet index changes (ONLY update if address actually changes) ===
          this.walletManagerService.selectedIndex$
               .pipe(
                    map(index => this.wallets()[index]),
                    filter(wallet => !!wallet && !!wallet.address),
                    distinctUntilChanged((a, b) => a?.address === b?.address),
                    takeUntil(this.destroy$)
               )
               .subscribe(wallet => {
                    this.currentWallet.set({ ...wallet });
                    // Invalidate old account cache when switching wallets
                    this.txUiService.clearTxSignal();
                    this.txUiService.clearTxResultSignal();
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.getCredentialsForAccount(false);
                    this.cdr.markForCheck();
               });

          // === 3. Load custom destinations from storage ===
          const stored = this.storageService.get('customDestinations');
          this.customDestinations.set(stored ? JSON.parse(stored) : []);
          this.updateDestinations();

          // === 4. Dropdown search integration (unchanged) ===
          this.destinationSearch$.pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(query => this.destinationDropdownService.filter(query));
          this.destinationDropdownService.setItems(this.destinations());
          this.destinationDropdownService.filtered$.pipe(takeUntil(this.destroy$)).subscribe(list => {
               this.filteredDestinations.set(list);
               this.highlightedIndex.set(list.length > 0 ? 0 : -1);
               this.cdr.markForCheck();
          });
          this.destinationDropdownService.isOpen$.pipe(takeUntil(this.destroy$)).subscribe(open => {
               open ? this.openDropdownInternal() : this.closeDropdownInternal();
          });

          // start the stream
          this.credentialSearchTerm.set('');

          document.addEventListener('keydown', e => {
               if (e.key === 'Escape' && this.showCredentialDropdown()) {
                    this.showCredentialDropdown.set(false);
               }
          });
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

     ngAfterViewInit() {
          this.scheduleHighlight();
     }

     ngOnDestroy() {
          this.destroy$.next();
          this.destroy$.complete();
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: Wallet): string {
          return wallet.address;
     }

     toggleCreatedCredentials() {
          this.createdCredentials.update(val => !val);
     }

     toggleSubjectCredentials() {
          this.subjectCredential.update(val => !val);
     }

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign(), this.signers(), (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.txUiService.setError(`${error.message}`);
          }
     }

     onWalletSelected(wallet: Wallet) {
          this.currentWallet.set({ ...wallet });
          // Prevent setting self as the destination after switching wallet
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address || this.destinationField();
          if (currentDest === wallet.address) {
               this.destinationField.set('');
          }
     }

     async setTab(tab: string) {
          const previousTab = this.activeTab();
          this.activeTab.set(tab);
          this.selectedCredentials.set(null);
          // Only clear messages when actually changing tabs
          if (previousTab !== tab) {
               this.txUiService.clearMessages();
               this.txUiService.clearWarning();
          }
          this.updateInfoMessage();
          this.clearFields(true);
          this.txUiService.clearTxSignal();
          this.txUiService.clearTxResultSignal();
          await this.getAllCredentialsForAccount();
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getAllCredentialsForAccount() {
          console.log('Entering getAllCredentialsForAccount');
          const startTime = Date.now();
          try {
               const wallet = await this.getWallet();
               this.xrplCache.debug();
               console.log(this.xrplCache.debugSnapshot());
               const { accountObjects } = await this.xrplCache.getAccountObjects(wallet.classicAddress, false);
               this.getExistingCredentials(accountObjects, wallet.classicAddress);
               this.getSubjectCredentials(accountObjects, wallet.classicAddress);
          } catch (error: any) {
               console.error('Error in getAllCredentialsForAccount:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner = false;
               this.executionTime.set((Date.now() - startTime).toString());
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getAllCredentialsForAccount in ${this.executionTime()} ms ${executionTimeSeconds} seconds`);
          }
     }

     async getCredentialsForAccount(forceRefresh = false) {
          console.log('Entering getCredentialsForAccount');
          const startTime = Date.now();
          this.txUiService.clearMessages();
          this.txUiService.updateSpinnerMessage(``);

          try {
               const client = await this.getClient();
               const wallet = await this.getWallet();
               this.xrplCache.debug();
               console.log(this.xrplCache.debugSnapshot());
               const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

               const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               this.getExistingCredentials(accountObjects, wallet.classicAddress);
               this.getSubjectCredentials(accountObjects, wallet.classicAddress);
               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers());
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.updateInfoMessage();
               this.cdr.markForCheck();
          } catch (error: any) {
               console.error('Error in getCredentialsForAccount:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner = false;
               this.executionTime.set((Date.now() - startTime).toString());
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getCredentialsForAccount in ${this.executionTime()} ms ${executionTimeSeconds} seconds`);
          }
     }

     async createCredential() {
          console.log('Entering createCredential');
          const startTime = Date.now();
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

               const { accountInfo } = await this.xrplCache.getAccountInfo(wallet.classicAddress, false);
               const { fee, serverInfo } = await this.xrplCache.getFeeAndServerInfo(this.xrplService, { forceRefresh: false, ledgerIndex: 'validated' });
               const currentLedger = await this.xrplService.getLastLedgerIndex(client);
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

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, credentialCreateTx, fee)) {
                    return this.txUiService.setError('Insufficient XRP to complete transaction');
               }

               this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled ? 'Simulating Create Credentials (no changes will be made)...' : 'Submitting Create Credentials to Ledger...', 200);

               this.txUiService.setTxSignal(credentialCreateTx);
               this.updatePaymentTx();

               let response: any;

               if (this.txUiService.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, credentialCreateTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign(), this.isRegularKeyAddress(), this.regularKeySeed());
                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, credentialCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign(), this.multiSignAddress(), this.multiSignSeeds());
                    if (!signedTx) {
                         return this.txUiService.setError('Failed to sign Payment transaction.');
                    }
                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               this.txUiService.setTxResultSignal(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);
                    console.error(`Transaction ${this.txUiService.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.txUiService.setError(userMessage);
               } else {
                    this.txUiService.setSuccess(this.txUiService.result);
               }

               this.txUiService.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.txUiService.isSimulateEnabled) {
                    this.txUiService.successMessage = 'Created credential successfully!';

                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
                    this.getExistingCredentials(accountObjects, wallet.classicAddress);
                    this.getSubjectCredentials(accountObjects, wallet.classicAddress);
                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);
                    this.addNewDestinationFromUser();
                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers());
                    this.updateTickets(accountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.markForCheck();
               } else {
                    this.txUiService.successMessage = 'Simulated Setting Credential successfully!';
               }
          } catch (error: any) {
               console.error('Error in createCredential:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner = false;
               this.executionTime.set((Date.now() - startTime).toString());
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving createCredential in ${this.executionTime()} ms ${executionTimeSeconds} seconds`);
          }
     }

     async deleteCredentials() {
          console.log('Entering deleteCredentials');
          const startTime = Date.now();
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

               const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, false);
               const { fee, serverInfo } = await this.xrplCache.getFeeAndServerInfo(this.xrplService, { forceRefresh: false, ledgerIndex: 'validated' });
               const currentLedger = await this.xrplService.getLastLedgerIndex(client);

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

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, credentialDeleteTx, fee)) {
                    return this.txUiService.setError('Insufficient XRP to complete transaction');
               }

               this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled ? 'Simulating Delete Credentials (no changes will be made)...' : 'Submitting Delete Credentials to Ledger...', 200);

               this.txUiService.setTxSignal(credentialDeleteTx);
               this.updatePaymentTx();

               let response: any;

               if (this.txUiService.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, credentialDeleteTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign(), this.isRegularKeyAddress(), this.regularKeySeed());
                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, credentialDeleteTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign(), this.multiSignAddress(), this.multiSignSeeds());
                    if (!signedTx) {
                         return this.txUiService.setError('Failed to sign Payment transaction.');
                    }
                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               this.txUiService.setTxResultSignal(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);
                    console.error(`Transaction ${this.txUiService.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.txUiService.setError(userMessage);
               } else {
                    this.txUiService.setSuccess(this.txUiService.result);
               }

               this.txUiService.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.txUiService.isSimulateEnabled) {
                    this.txUiService.successMessage = 'Credential removed successfully!';

                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
                    this.getExistingCredentials(accountObjects, wallet.classicAddress);
                    this.getSubjectCredentials(accountObjects, wallet.classicAddress);
                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers());
                    this.updateTickets(accountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();

                    this.credentialSearchTerm.set('');
                    this.selectedCredentials.set(null);
                    this.credentialID.set('');
                    this.credentialType.set('');

                    this.cdr.markForCheck();
               }
          } catch (error: any) {
               console.error('Error:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner = false;
               this.executionTime.set((Date.now() - startTime).toString());
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving deleteCredentials in ${this.executionTime()} ms ${executionTimeSeconds} seconds`);
          }
     }

     async acceptCredentials() {
          console.log('Entering acceptCredentials');
          const startTime = Date.now();
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

               const { accountInfo } = await this.xrplCache.getAccountInfo(wallet.classicAddress, false);
               const accountObjects = await this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'credential');
               const { fee, serverInfo } = await this.xrplCache.getFeeAndServerInfo(this.xrplService, { forceRefresh: false, ledgerIndex: 'validated' });
               const currentLedger = await this.xrplService.getLastLedgerIndex(client);

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

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, credentialAcceptTx, fee)) {
                    return this.txUiService.setError('Insufficient XRP to complete transaction');
               }

               this.txUiService.showSpinnerWithDelay(this.txUiService.isSimulateEnabled ? 'Simulating Accepting Credentials (no changes will be made)...' : 'Submitting Accepting Credentials to Ledger...', 200);

               this.txUiService.setTxSignal(credentialAcceptTx);
               this.updatePaymentTx();

               let response: any;

               if (this.txUiService.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, credentialAcceptTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign(), this.isRegularKeyAddress(), this.regularKeySeed());
                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, credentialAcceptTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign(), this.multiSignAddress(), this.multiSignSeeds());
                    if (!signedTx) {
                         return this.txUiService.setError('Failed to sign Payment transaction.');
                    }
                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               this.txUiService.setTxResultSignal(response.result);
               this.updateTxResult();

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);
                    console.error(`Transaction ${this.txUiService.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.txUiService.setError(userMessage);
               } else {
                    this.txUiService.setSuccess(this.txUiService.result);
               }

               this.txUiService.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.txUiService.isSimulateEnabled) {
                    this.txUiService.successMessage = 'Credential accepted successfully!';

                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
                    this.getExistingCredentials(accountObjects, wallet.classicAddress);
                    this.getSubjectCredentials(accountObjects, wallet.classicAddress);
                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers());
                    this.updateTickets(accountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.markForCheck();
               } else {
                    this.txUiService.successMessage = 'Simulated accepting credential successfully!';
               }
          } catch (error: any) {
               console.error('Error in acceptCredentials:', error);
               this.txUiService.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.txUiService.spinner = false;
               this.executionTime.set((Date.now() - startTime).toString());
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving acceptCredentials in ${this.executionTime()} ms ${executionTimeSeconds} seconds`);
          }
     }

     async verifyCredential(binary: boolean): Promise<boolean | void> {
          console.log('Entering verifyCredential');
          const startTime = Date.now();
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

               const { accountInfo } = await this.xrplCache.getAccountInfo(wallet.classicAddress, false);
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
                         this.updateTxResult();
                         this.txUiService.setError(`Credential not found.`);
                         return;
                    } else {
                         this.txUiService.setTxResultSignal(xrplResponse);
                         this.updateTxResult();
                         this.txUiService.setError(`Failed to check credential: ${error.message || 'Unknown error'}`);
                         return;
                    }
               }

               this.txUiService.setTxResultSignal(xrplResponse.result);
               this.updateTxResult();

               const credential = (xrplResponse.result as any).node;
               console.info(`Found credential:`, credential);

               // Check if the credential has been accepted
               if (!(credential.Flags & AppConstants.LSF_ACCEPTED)) {
                    console.info('Credential is not accepted.');
                    this.txUiService.setTxResultSignal(xrplResponse.result);
                    this.updateTxResult();
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
                    this.updateTxResult();
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
               this.executionTime.set((Date.now() - startTime).toString());
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving verifyCredential in ${this.executionTime()} ms ${executionTimeSeconds} seconds`);
          }
     }

     // Helper: safely decode hex strings
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

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          const tickets = this.utilsService.getAccountTickets(accountObjects);
          this.ticketArray.set(tickets);
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

     updateDestinations() {
          this.destinations.set([...this.wallets().map(w => ({ name: w.name, address: w.address })), ...this.customDestinations()]);
          if (this.destinations().length > 0 && !this.destinationField()) {
               this.credential.update(cred => ({ ...cred, subject: { ...cred.subject, destinationAddress: this.destinations()[0].address } }));
          }
          this.storageService.set('destinations', this.destinations());
          this.ensureDefaultNotSelected();
     }

     ensureDefaultNotSelected() {
          const currentAddress = this.currentWallet().address;
          if (currentAddress && this.destinations().length > 0) {
               if (!this.credential().subject.destinationAddress || this.credential().subject.destinationAddress === currentAddress) {
                    const nonSelectedDest = this.destinations().find(d => d.address !== currentAddress);
                    this.credential.update(cred => ({ ...cred, subject: { ...cred.subject, destinationAddress: nonSelectedDest ? nonSelectedDest.address : this.destinations()[0].address } }));
               }
          }
          this.cdr.markForCheck();
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet().encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('Wallet could not be created or is undefined');
          }
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

     updateInfoMessage(): void {
          if (!this.currentWallet().address) {
               this.txUiService.setInfoMessage('No wallet is currently selected.');
               return;
          }
          const walletName = this.currentWallet().name || 'Selected wallet';
          // Always filter strictly by role
          const issuedByMe = this.existingCredentials() ?? []; // Issuer === me
          const issuedToMe = this.subjectCredentials() ?? []; // Subject === me
          let relevantCredentials: any[] = [];
          let message = '';
          switch (this.activeTab()) {
               case 'create':
                    relevantCredentials = issuedByMe;
                    if (relevantCredentials.length === 0) {
                         message = `<code>${walletName}</code> has not issued any credentials yet.`;
                    } else {
                         message = `<code>${walletName}</code> has issued <strong>${relevantCredentials.length}</strong> credential(s):`;
                    }
                    break;
               case 'accept':
                    relevantCredentials = issuedToMe;
                    if (relevantCredentials.length === 0) {
                         message = `<code>${walletName}</code> has no pending credentials to accept.`;
                    } else {
                         message = `<code>${walletName}</code> has <strong>${relevantCredentials.length}</strong> credential(s) to accept:`;
                    }
                    break;
               case 'delete':
                    relevantCredentials = issuedByMe;
                    if (relevantCredentials.length === 0) {
                         message = `<code>${walletName}</code> has no credentials to delete.`;
                    } else {
                         message = `<code>${walletName}</code> has <strong>${relevantCredentials.length}</strong> credential(s) that can be deleted:`;
                    }
                    break;
               case 'verify':
                    relevantCredentials = [...issuedToMe, ...issuedByMe];
                    const total = relevantCredentials.length;
                    if (total === 0) {
                         message = `<code>${walletName}</code> is not involved in any credentials.`;
                    } else {
                         const toMe = issuedToMe.length;
                         const byMe = issuedByMe.length;
                         if (toMe && byMe) {
                              message = `<code>${walletName}</code> is involved in <strong>${total}</strong> credential(s):<br>` + `• ${toMe} issued to this wallet<br>• ${byMe} issued by this wallet`;
                         } else if (toMe) {
                              message = `<code>${walletName}</code> has <strong>${toMe}</strong> credential(s) issued to it:`;
                         } else {
                              message = `<code>${walletName}</code> has issued <strong>${byMe}</strong> credential(s):`;
                         }
                    }
                    break;
               default:
                    relevantCredentials = issuedByMe;
                    message = `<code>${walletName}</code> has issued <strong>${relevantCredentials.length}</strong> credential(s).`;
          }
          // Always append explorer links if any relevant credentials
          if (relevantCredentials.length > 0) {
               message += `<br><br>View Credentials on XRPL Win:<ul style="margin:8px 0; padding-left:20px; font-size:0.9em;">`;
               relevantCredentials.slice(0, 8).forEach(cred => {
                    const type = cred.CredentialType;
                    let subject;
                    let issuer;
                    if (this.currentWallet().address === cred.Subject) {
                         issuer = cred.Issuer ? cred.Issuer.slice(0, 8) + '...' + cred.Issuer.slice(-6) : '';
                    } else {
                         subject = cred.Subject ? cred.Subject.slice(0, 8) + '...' + cred.Subject.slice(-6) : '';
                    }
                    const shortId = cred.index.slice(0, 8) + '...' + cred.index.slice(-6);
                    const link = `${this.url()}entry/${cred.index}`;
                    const subjectText = subject?.trim() ? ` Subject: (${subject.trim()})` : '';
                    const issuerText = issuer?.trim() ? ` Issuer: (${issuer.trim()})` : '';
                    message += `<li><a href="${link}" target="_blank" class="xrpl-win-link">${type} Index: (${shortId})${subjectText}${issuerText}</a></li>`;
               });
               if (relevantCredentials.length > 8) {
                    message += `<li><em>... and ${relevantCredentials.length - 8} more</em></li>`;
               }
               message += `</ul>`;
          }
          this.txUiService.setInfoMessage(message);
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }

     clearFields(all = true) {
          if (all) {
               this.credentialID.set('');
               this.useMultiSign.set(false);
               this.isRegularKeyAddress.set(false);
               this.txUiService.clearMessages();
               this.txUiService.clearWarning();
          }
          this.credentialID.set('');
          this.selectedTicket.set('');
          this.selectedSingleTicket.set('');
          this.isTicket.set(false);
          this.selectedTicket.set('');
          this.isMemoEnabled.set(false);
          this.memoField.set('');
          this.cdr.markForCheck();
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

     // Dropdown controls
     openDropdown() {
          this.destinationDropdownService.setItems(this.destinations());
          this.destinationDropdownService.filter(this.destinationField() || '');
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
          const dest = this.destinations().find(d => d.address === address);
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

     updatePaymentTx() {
          this.scheduleHighlight();
     }

     updateTxResult() {
          this.scheduleHighlight();
     }

     private scheduleHighlight() {
          afterRenderEffect(
               () => {
                    const paymentStr = JSON.stringify(this.txUiService.txSignal(), null, 2); // Use () for signal value
                    const resultStr = JSON.stringify(this.txUiService.txResultSignal(), null, 2); // Use () for signal value
                    if (this.paymentJson?.nativeElement && paymentStr !== this.lastPaymentTx) {
                         this.paymentJson.nativeElement.textContent = paymentStr;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                         this.lastPaymentTx = paymentStr;
                    }
                    if (this.txResultJson?.nativeElement && resultStr !== this.lastTxResult) {
                         this.txResultJson.nativeElement.textContent = resultStr;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                         this.lastTxResult = resultStr;
                    }
                    this.cdr.markForCheck(); // Optional fallback, but signals should handle it
               },
               { injector: this.injector }
          );
     }

     private scheduleHighlight1() {
          afterRenderEffect(
               () => {
                    const paymentStr = JSON.stringify(this.txUiService.paymentTx, null, 2);
                    const resultStr = JSON.stringify(this.txUiService.txResult, null, 2);
                    if (this.paymentJson?.nativeElement && paymentStr !== this.lastPaymentTx) {
                         this.paymentJson.nativeElement.textContent = paymentStr;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                         this.lastPaymentTx = paymentStr;
                    }
                    if (this.txResultJson?.nativeElement && resultStr !== this.lastTxResult) {
                         this.txResultJson.nativeElement.textContent = resultStr;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                         this.lastTxResult = resultStr;
                    }
                    this.cdr.markForCheck();
               },
               { injector: this.injector }
          );
     }
}
