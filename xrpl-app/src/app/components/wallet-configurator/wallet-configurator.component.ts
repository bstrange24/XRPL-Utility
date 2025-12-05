import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ElementRef, ViewChild, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
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
import { Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';

declare var Prism: any;

@Component({
     selector: 'app-wallet-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './wallet-configurator.component.html',
     styleUrl: './wallet-configurator.component.css',
})
export class WalletConfiguratorComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef; // We'll add this to the input
     private overlayRef: OverlayRef | null = null;
     private readonly injector = inject(Injector);
     public destinationSearch$ = new Subject<string>();
     executionTime: string = '';
     destinationField: string = '';
     destinations: DropdownItem[] = [];
     customDestinations: { name?: string; address: string }[] = [];
     showDropdown: boolean = false;
     dropdownOpen: boolean = false;
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;
     wallets: Wallet[] = [];
     selectedWalletIndex: number = 0;
     currentWallet: Wallet = {
          classicAddress: '',
          address: '',
          seed: '',
          name: undefined,
          balance: '0',
          ownerCount: undefined,
          xrpReserves: undefined,
          spendableXrp: undefined,
          encryptionAlgorithm: '',
     };
     showSecret: boolean = false;
     environment: string = '';
     activeTab: string = 'generate'; // default
     encryptionType: string = '';
     hasWallets: boolean = true;
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     filterQuery: string = '';
     seed: string = '';
     mnemonic: string = '';
     secretNumbers: string = '';
     ed25519_encryption_type: boolean = false;
     secp256k1_encryption_type: boolean = false;
     buttonLoading = {
          generateNewWalletFromSeed: false,
          generateNewWalletFromMnemonic: false,
          generateNewWalletFromSecretNumbers: false,
          deriveWalletFromFamilySeed: false,
          deriveWalletFromMnemonic: false,
          deriveWalletFromSecretNumbers: false,
     };
     mnemonicInput = '';
     mnemonicValid = false;
     secretNumberInput: string[] = [];
     secretNumberValid = false;
     seedInput = '';
     seedValid = false;

     // Form fields
     amountField = '';
     destinationTagField = '';
     sourceTagField = '';
     invoiceIdField = '';
     memoField: string = '';
     isMemoEnabled: boolean = false;
     useMultiSign: boolean = false;
     isRegularKeyAddress: boolean = false;
     isTicket: boolean = false;
     selectedSingleTicket: string = '';
     selectedTickets: string[] = [];
     multiSelectMode: boolean = false;
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     selectedTicket: string = '';

     // Multi-sign & Regular Key
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
     signerQuorum: number = 0;
     regularKeyAddress: string = '';
     regularKeySeed: string = '';
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     ticketArray: string[] = [];
     masterKeyDisabled: boolean = false;

     // Code preview
     private lastPaymentTx = '';
     private lastTxResult = '';

     constructor(
          private xrplService: XrplService,
          private utilsService: UtilsService,
          private storageService: StorageService,
          private xrplTransactions: XrplTransactionService,
          private walletManagerService: WalletManagerService,
          public ui: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private validationService: ValidationService,
          private walletGenerator: WalletGeneratorService,
          private overlay: Overlay,
          private viewContainerRef: ViewContainerRef,
          private destinationDropdownService: DestinationDropdownService,
          private cdr: ChangeDetectorRef
     ) {}

     ngOnInit() {
          this.environment = this.xrplService.getNet().environment;
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url = AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET;

          // Listen to selected wallet changes (critical!)
          this.walletManagerService.selectedIndex$.pipe(takeUntil(this.destroy$)).subscribe(index => {
               if (this.wallets[index]) {
                    this.currentWallet = { ...this.wallets[index] };
                    // this.getChecks();
               }
          });

          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               this.hasWallets = wallets.length > 0;

               // If panel hasn't emitted yet (e.g. on page load), set current wallet manually
               if (wallets.length > 0 && !this.currentWallet.address) {
                    const index = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    this.currentWallet = { ...wallets[index] };
                    this.getAccountDetails();
               }

               this.updateDestinations();
          });

          // Load custom destinations
          const stored = this.storageService.get('customDestinations');
          this.customDestinations = stored ? JSON.parse(stored) : [];
          this.updateDestinations();

          // Dropdown service sync
          this.destinationSearch$.pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(query => {
               this.destinationDropdownService.filter(query);
          });
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.filtered$.pipe(takeUntil(this.destroy$)).subscribe(list => {
               this.filteredDestinations = list;
               this.highlightedIndex = list.length > 0 ? 0 : -1;
               this.cdr.detectChanges();
          });
          this.destinationDropdownService.isOpen$.pipe(takeUntil(this.destroy$)).subscribe(open => {
               open ? this.openDropdownInternal() : this.closeDropdownInternal();
          });
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

     get isAnyButtonLoading(): boolean {
          return Object.values(this.buttonLoading).some(v => v === true);
     }

     onWalletSelected(wallet: Wallet) {
          this.currentWallet = { ...wallet };

          // Prevent setting self as the destination after switching wallet
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address || this.destinationField;
          if (currentDest === wallet.address) {
               this.destinationField = '';
          }

          this.getAccountDetails();
     }

     setTab(tab: string) {
          this.activeTab = tab;
          this.clearFields(true);
          this.ui.clearMessages();
          this.ui.clearWarning();
     }

     async getAccountDetails() {
          console.log('Entering getAccountDetails');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               this.clearFields(false);
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getAccountDetails:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getAccountDetails in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async generateNewAccount() {
          console.log('Entering generateNewAccount');
          const startTime = Date.now();
          this.buttonLoading.generateNewWalletFromSeed = true;
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);

          try {
               // Default to ed25519
               this.encryptionType = AppConstants.ENCRYPTION.ED25519;
               console.log('encryptionType: ', this.encryptionType);
               const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment, this.encryptionType);
               const client = await this.xrplService.getClient();
               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner.set(false);
               this.ui.clearWarning();
               this.ui.setTxResult(faucetWallet);
               this.updateTxResult();
          } catch (error: any) {
               console.error('Error in generateNewAccount:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.buttonLoading.generateNewWalletFromSeed = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving generateNewAccount in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async deriveWalletFromFamilySeed() {
          console.log('Entering deriveWalletFromFamilySeed');
          const startTime = Date.now();
          this.buttonLoading.deriveWalletFromFamilySeed = true;
          this.ui.updateSpinnerMessage(``);
          this.ui.showSpinnerWithDelay('Derive wallet', 10);

          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType: ', this.encryptionType);

               if (!xrpl.isValidSecret(this.seed)) {
                    return this.ui.setError('Invalid seed value.');
               }

               const client = await this.xrplService.getClient();

               const { wallet: faucetWallet, destinations, customDestinations } = await this.walletGenerator.deriveWalletFromFamilySeed(client, this.encryptionType, this.seed, this.destinations, this.customDestinations);
               this.destinations = destinations;
               this.customDestinations = customDestinations;
               this.updateDestinations();

               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner.set(false);
               this.ui.clearWarning();
               this.ui.setSuccess(`Successfully added ${faucetWallet.address}`);
          } catch (error: any) {
               console.error('Error in deriveWalletFromFamilySeed:', error);
               if (error.message === 'Failed to fetch account info: Account not found.') {
                    this.ui.setError(`${error.message} Are you using the correct encryption?`);
               } else {
                    this.ui.setError(`${error.message}`);
               }
          } finally {
               this.ui.spinner.set(false);
               this.buttonLoading.deriveWalletFromFamilySeed = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving deriveWalletFromFamilySeed in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async generateNewWalletFromMnemonic() {
          console.log('Entering generateNewWalletFromMnemonic');
          const startTime = Date.now();
          this.buttonLoading.generateNewWalletFromMnemonic = true;
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);

          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType: ', this.encryptionType);
               const faucetWallet = await this.walletGenerator.generateNewWalletFromMnemonic(this.wallets, this.environment, this.encryptionType);
               const client = await this.xrplService.getClient();
               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner.set(false);
               this.ui.clearWarning();
               this.ui.setTxResult(faucetWallet);
               this.updateTxResult();
          } catch (error: any) {
               console.error('Error in generateNewWalletFromMnemonic:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.buttonLoading.generateNewWalletFromMnemonic = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving generateNewWalletFromMnemonic in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async deriveWalletFromMnemonic() {
          console.log('Entering deriveWalletFromMnemonic');
          const startTime = Date.now();
          this.buttonLoading.deriveWalletFromMnemonic = true;
          this.ui.updateSpinnerMessage(``);
          this.ui.showSpinnerWithDelay('Derive wallet', 10);

          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType: ', this.encryptionType);

               if (!this.utilsService.isValidMnemonic(this.mnemonic)) {
                    return this.ui.setError('Invalid Mnemonic.');
               }

               const client = await this.xrplService.getClient();

               const { wallet: faucetWallet, destinations, customDestinations } = await this.walletGenerator.deriveWalletFromMnemonic(client, this.encryptionType, this.mnemonic, this.destinations, this.customDestinations);
               this.destinations = destinations;
               this.customDestinations = customDestinations;
               this.updateDestinations();

               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner.set(false);
               this.ui.clearWarning();
               this.ui.setSuccess(`Successfully added ${faucetWallet.address}`);
          } catch (error: any) {
               console.error('Error in deriveWalletFromMnemonic:', error);
               if (error.message === 'Failed to fetch account info: Account not found.') {
                    this.ui.setError(`${error.message} Are you using the correct encryption?`);
               } else {
                    this.ui.setError(`${error.message}`);
               }
          } finally {
               this.ui.spinner.set(false);
               this.buttonLoading.deriveWalletFromMnemonic = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving deriveWalletFromMnemonic in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async generateNewWalletFromSecretNumbers() {
          console.log('Entering generateNewWalletFromSecretNumbers');
          const startTime = Date.now();
          this.buttonLoading.generateNewWalletFromSecretNumbers = true;
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);

          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType ............................................................', this.encryptionType);
               const faucetWallet = await this.walletGenerator.generateNewWalletFromSecretNumbers(this.wallets, this.environment, this.encryptionType);
               const client = await this.xrplService.getClient();
               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner.set(false);
               this.ui.clearWarning();
               this.ui.setTxResult(faucetWallet);
               this.updateTxResult();
          } catch (error: any) {
               console.error('Error in generateNewWalletFromSecretNumbers:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner.set(false);
               this.buttonLoading.generateNewWalletFromSecretNumbers = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving generateNewWalletFromSecretNumbers in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async deriveWalletFromSecretNumbers() {
          console.log('Entering deriveWalletFromSecretNumbers');
          const startTime = Date.now();
          this.buttonLoading.deriveWalletFromSecretNumbers = true;
          this.ui.updateSpinnerMessage(``);
          this.ui.showSpinnerWithDelay('Derive wallet', 10);

          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType: ', this.encryptionType);

               if (!this.utilsService.isValidSecret(this.utilsService.convertSecretNumberStringToArray(this.secretNumbers))) {
                    return this.ui.setError('Invalid Secret Number.');
               }

               const client = await this.xrplService.getClient();

               const { wallet: faucetWallet, destinations, customDestinations } = await this.walletGenerator.deriveWalletFromSecretNumbers(client, this.encryptionType, this.secretNumbers, this.destinations, this.customDestinations);
               this.destinations = destinations;
               this.customDestinations = customDestinations;
               this.updateDestinations();

               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner.set(false);
               this.ui.clearWarning();
               this.ui.setSuccess(`Successfully added ${faucetWallet.address}`);
          } catch (error: any) {
               console.error('Error in deriveWalletFromSecretNumbers:', error);
               if (error.message === 'Failed to fetch account info: Account not found.') {
                    this.ui.setError(`${error.message} Are you using the correct encryption?`);
               } else {
                    this.ui.setError(`${error.message}`);
               }
          } finally {
               this.ui.spinner.set(false);
               this.buttonLoading.deriveWalletFromSecretNumbers = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving deriveWalletFromSecretNumbers in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     getEncryptionType(): string {
          if (this.secp256k1_encryption_type) {
               return AppConstants.ENCRYPTION.SECP256K1;
          }
          return AppConstants.ENCRYPTION.ED25519; // Default if neither or only ed25519 checked
     }

     onEncryptionChange() {
          this.storageService.setInputValue('encryptionType', this.encryptionType.toString());
     }

     onMnemonicInput() {
          this.mnemonicInput = this.utilsService.normalizeMnemonic(this.mnemonic);
          this.mnemonicValid = this.utilsService.isValidMnemonic(this.mnemonic);
     }

     onSecretNumberInput() {
          this.secretNumberInput = this.utilsService.normalizeSecrets(this.secretNumbers);
          this.secretNumberValid = this.utilsService.isValidSecret(this.utilsService.convertSecretNumberStringToArray(this.secretNumbers));
     }

     onSeedInput() {
          this.seedInput = this.utilsService.normalizeFamilySeed(this.seed);
          this.seedValid = xrpl.isValidSecret(this.seed);
     }

     onEd25519Change() {
          if (this.ed25519_encryption_type) {
               this.secp256k1_encryption_type = false;
          }
          this.saveEncryptionPreference();
     }

     onSecp256k1Change() {
          if (this.secp256k1_encryption_type) {
               this.ed25519_encryption_type = false;
          }
          this.saveEncryptionPreference();
     }

     private saveEncryptionPreference() {
          const type = this.getEncryptionType();
          this.storageService.setInputValue('encryptionType', type);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets, this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet = { ...newCurrent };
          });
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.destinationDropdownService.setItems(this.destinations);
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet.encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet.seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     public get infoMessage(): string | null {
          const tabConfig = {
               send: {
                    message: '',
                    dynamicText: '', // Empty for no additional text
                    showLink: false,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          // return `<code>${walletName}</code> wallet has ${dynamicText} ${config.message}`;
          return null;
     }

     get safeWarningMessage() {
          return this.ui.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }

     clearFields(all = true) {
          if (all) {
               this.ui.clearMessages();
               this.ui.clearWarning();
          }
          this.seed = '';
          this.mnemonic = '';
          this.secretNumbers = '';
          this.mnemonicInput = '';
          this.mnemonicValid = false;
          this.secretNumberInput = [];
          this.secretNumberValid = false;
          this.seedInput = '';
          this.seedValid = false;
          this.cdr.detectChanges();
     }

     filterDestinations() {
          const query = this.filterQuery.trim().toLowerCase();

          if (query === '') {
               this.filteredDestinations = [...this.destinations];
          } else {
               this.filteredDestinations = this.destinations.filter(d => d.address.toLowerCase().includes(query) || (d.name && d.name.toLowerCase().includes(query)));
          }

          this.highlightedIndex = this.filteredDestinations.length > 0 ? 0 : -1;
     }

     onArrowDown() {
          if (!this.showDropdown || this.filteredDestinations.length === 0) return;
          this.highlightedIndex = (this.highlightedIndex + 1) % this.filteredDestinations.length;
     }

     selectHighlighted() {
          if (this.highlightedIndex >= 0 && this.filteredDestinations[this.highlightedIndex]) {
               const addr = this.filteredDestinations[this.highlightedIndex].address;
               if (addr !== this.currentWallet.address) {
                    this.destinationField = addr;
                    this.closeDropdown(); // Also close on Enter
               }
          }
     }

     // Dropdown controls
     openDropdown() {
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.filter(this.destinationField || '');
          this.destinationDropdownService.openDropdown();
     }

     closeDropdown() {
          this.destinationDropdownService.closeDropdown();
     }

     toggleDropdown() {
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.toggleDropdown();
     }

     onDestinationInput() {
          this.destinationDropdownService.filter(this.destinationField || '');
          this.destinationDropdownService.openDropdown();
     }

     selectDestination(address: string) {
          if (address === this.currentWallet.address) return;
          const dest = this.destinations.find(d => d.address === address);
          this.destinationField = dest ? this.destinationDropdownService.formatDisplay(dest) : `${address.slice(0, 6)}...${address.slice(-6)}`;
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
                    const paymentStr = JSON.stringify(this.ui.paymentTx, null, 2);
                    const resultStr = JSON.stringify(this.ui.txResult, null, 2);

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

                    this.cdr.detectChanges();
               },
               { injector: this.injector }
          );
     }
}
