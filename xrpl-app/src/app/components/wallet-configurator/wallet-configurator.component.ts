import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { AppWalletDynamicInputComponent } from '../app-wallet-dynamic-input/app-wallet-dynamic-input.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { LucideAngularModule } from 'lucide-angular';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { Subject, takeUntil } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { TemplatePortal } from '@angular/cdk/portal';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
declare var Prism: any;

@Component({
     selector: 'app-wallet-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './wallet-configurator.component.html',
     styleUrl: './wallet-configurator.component.css',
})
export class WalletConfiguratorComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     @ViewChild('accountForm') accountForm!: NgForm;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('signers') signersRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChild('seeds') seedsRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChildren('signers, seeds') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef; // We'll add this to the input
     private overlayRef: OverlayRef | null = null;
     private readonly injector = inject(Injector);
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

     constructor(
          private readonly xrplService: XrplService,
          private readonly utilsService: UtilsService,
          private readonly cdr: ChangeDetectorRef,
          private readonly storageService: StorageService,
          private walletGenerator: WalletGeneratorService,
          private walletManagerService: WalletManagerService,
          public ui: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private overlay: Overlay,
          private viewContainerRef: ViewContainerRef,
          private destinationDropdownService: DestinationDropdownService
     ) {}

     ngOnInit() {
          this.environment = this.xrplService.getNet().environment;
          this.encryptionType = this.storageService.getInputValue('encryptionType');

          this.ed25519_encryption_type = true; // Default to ed25519
          this.secp256k1_encryption_type = false;
          // If loading from storage, override based on saved value
          const savedType = this.storageService.getInputValue('encryptionType');
          if (savedType === AppConstants.ENCRYPTION.SECP256K1) {
               this.ed25519_encryption_type = false;
               this.secp256k1_encryption_type = true;
          }

          this.editingIndex = this.walletManagerService.isEditing.bind(this.walletManagerService);

          type EnvKey = keyof typeof AppConstants.XRPL_WIN_URL;
          const env = this.xrplService.getNet().environment.toUpperCase() as EnvKey;
          this.url = AppConstants.XRPL_WIN_URL[env] || AppConstants.XRPL_WIN_URL.DEVNET;

          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               if (!this.wallets) {
                    this.hasWallets = false;
                    return;
               }
          });

          // Load custom destinations from storage
          const storedCustoms = this.storageService.get('customDestinations');
          this.customDestinations = storedCustoms ? JSON.parse(storedCustoms) : [];
          this.updateDestinations();

          // Ensure service knows the list
          this.destinationDropdownService.setItems(this.destinations);

          // Subscribe to filtered list updates
          this.destinationDropdownService.filtered$.pipe(takeUntil(this.destroy$)).subscribe(list => {
               this.filteredDestinations = list;
               // keep selection sane
               this.highlightedIndex = list.length > 0 ? 0 : -1;
               this.cdr.detectChanges();
          });

          // Subscribe to open/close state from service
          this.destinationDropdownService.isOpen$.pipe(takeUntil(this.destroy$)).subscribe(open => {
               this.dropdownOpen = open;
               if (open) {
                    this.openDropdownInternal(); // create + attach overlay (component-owned)
               } else {
                    this.closeDropdownInternal(); // detach overlay (component-owned)
               }
          });
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

     ngAfterViewInit() {
          setTimeout(() => {
               this.textareas.forEach(ta => this.autoResize(ta.nativeElement));
          });
     }

     ngOnDestroy() {
          this.destroy$.next();
          this.destroy$.complete();
     }

     trackByWalletAddress(index: number, wallet: Wallet): string {
          return wallet.address;
     }

     setTab(tab: string) {
          this.activeTab = tab;
          this.clearFields(true);
          this.ui.clearMessages();
          this.ui.clearWarning();
     }

     selectWallet(index: number) {
          if (this.selectedWalletIndex === index) return; // ← Add this guard!
          this.selectedWalletIndex = index;
          this.onAccountChange();
     }

     editName(i: number) {
          this.walletManagerService.startEdit(i);
          const wallet = this.wallets[i];
          this.tempName = wallet.name || `Wallet ${i + 1}`;
          setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
     }

     saveName() {
          this.walletManagerService.saveEdit(this.tempName);
          this.tempName = '';
          this.updateDestinations();
     }

     cancelEdit() {
          this.walletManagerService.cancelEdit();
          this.tempName = '';
     }

     onWalletListChange(): void {
          if (this.wallets.length <= 0) {
               this.hasWallets = false;
               return;
          }

          if (this.wallets.length === 1 && this.wallets[0].address === '') {
               this.hasWallets = false;
               return;
          }

          if (this.wallets.length > 0 && this.selectedWalletIndex >= this.wallets.length) {
               this.selectedWalletIndex = 0;
          }

          this.onAccountChange();
     }

     toggleSecret(index: number) {
          this.wallets[index].showSecret = !this.wallets[index].showSecret;
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          try {
               const client = await this.xrplService.getClient();
               const walletAddress = wallet.classicAddress ? wallet.classicAddress : wallet.address;
               await this.refreshWallets(client, [walletAddress]).catch(console.error);
          } catch (err) {
               this.ui.setError('Failed to refresh balance');
          }
     }

     deleteWallet(index: number) {
          if (confirm('Delete this wallet? This cannot be undone.')) {
               this.walletManagerService.deleteWallet(index);
               if (this.selectedWalletIndex >= this.wallets.length) {
                    this.selectedWalletIndex = Math.max(0, this.wallets.length - 1);
               }
               this.onAccountChange();
          }
     }

     async generateNewAccount() {
          console.log('Entering generateNewAccount');
          const startTime = Date.now();
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);
          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType: ', this.encryptionType);
               const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment, this.encryptionType);
               const client = await this.xrplService.getClient();
               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner = false;
               this.ui.clearWarning();
               this.ui.txResult.push(faucetWallet);
               this.updateTxResult(this.ui.txResult);
          } catch (error: any) {
               console.error('Error in generateNewAccount:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving v in ${this.executionTime}ms`);
          }
     }

     async deriveWalletFromFamilySeed() {
          console.log('Entering deriveWalletFromFamilySeed');
          const startTime = Date.now();
          this.ui.updateSpinnerMessage(``);
          this.ui.showSpinnerWithDelay('Derive wallet', 10);

          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType: ', this.encryptionType);
               const client = await this.xrplService.getClient();

               const { wallet: faucetWallet, destinations, customDestinations } = await this.walletGenerator.deriveWalletFromFamilySeed(client, this.encryptionType, this.seed, this.destinations, this.customDestinations);
               this.destinations = destinations;
               this.customDestinations = customDestinations;
               this.updateDestinations();

               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner = false;
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
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deriveWalletFromFamilySeed in ${this.executionTime}ms`);
          }
     }

     async generateNewWalletFromMnemonic() {
          console.log('Entering deriveWalletFromFamilySeed');
          const startTime = Date.now();
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);

          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType: ', this.encryptionType);
               const faucetWallet = await this.walletGenerator.generateNewWalletFromMnemonic(this.wallets, this.environment, this.encryptionType);
               const client = await this.xrplService.getClient();
               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner = false;
               this.ui.clearWarning();
          } catch (error: any) {
               console.error('Error in deriveWalletFromFamilySeed:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deriveWalletFromFamilySeed in ${this.executionTime}ms`);
          }
     }

     async deriveWalletFromMnemonic() {
          console.log('Entering deriveWalletFromMnemonic');
          const startTime = Date.now();
          this.ui.updateSpinnerMessage(``);
          this.ui.showSpinnerWithDelay('Derive wallet', 10);

          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType ............................................................', this.encryptionType);
               const client = await this.xrplService.getClient();

               const { wallet: faucetWallet, destinations, customDestinations } = await this.walletGenerator.deriveWalletFromMnemonic(client, this.encryptionType, this.mnemonic, this.destinations, this.customDestinations);
               this.destinations = destinations;
               this.customDestinations = customDestinations;
               this.updateDestinations();

               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner = false;
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
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deriveWalletFromMnemonic in ${this.executionTime}ms`);
          }
     }

     async generateNewWalletFromSecretNumbers() {
          console.log('Entering generateNewWalletFromSecretNumbers');
          const startTime = Date.now();
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);

          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType ............................................................', this.encryptionType);
               const faucetWallet = await this.walletGenerator.generateNewWalletFromSecretNumbers(this.wallets, this.environment, this.encryptionType);
               const client = await this.xrplService.getClient();
               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner = false;
               this.ui.clearWarning();
          } catch (error: any) {
               console.error('Error in generateNewWalletFromSecretNumbers:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving generateNewWalletFromSecretNumbers in ${this.executionTime}ms`);
          }
     }

     async deriveWalletFromSecretNumbers() {
          console.log('Entering deriveWalletFromSecretNumbers');
          const startTime = Date.now();
          this.ui.updateSpinnerMessage(``);
          this.ui.showSpinnerWithDelay('Derive wallet', 10);

          try {
               this.encryptionType = this.getEncryptionType();
               console.log('encryptionType ............................................................', this.encryptionType);
               const client = await this.xrplService.getClient();

               const { wallet: faucetWallet, destinations, customDestinations } = await this.walletGenerator.deriveWalletFromSecretNumbers(client, this.encryptionType, this.secretNumbers, this.destinations, this.customDestinations);
               this.destinations = destinations;
               this.customDestinations = customDestinations;
               this.updateDestinations();

               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner = false;
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
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deriveWalletFromSecretNumbers in ${this.executionTime}ms`);
          }
     }

     getEncryptionType(): string {
          if (this.secp256k1_encryption_type) {
               return AppConstants.ENCRYPTION.SECP256K1;
          }
          return AppConstants.ENCRYPTION.ED25519; // Default if neither or only ed25519 checked
     }

     dropWallet(event: CdkDragDrop<any[]>) {
          moveItemInArray(this.wallets, event.previousIndex, event.currentIndex);

          // Update your selectedWalletIndex if needed
          if (this.selectedWalletIndex === event.previousIndex) {
               this.selectedWalletIndex = event.currentIndex;
          } else if (this.selectedWalletIndex > event.previousIndex && this.selectedWalletIndex <= event.currentIndex) {
               this.selectedWalletIndex--;
          } else if (this.selectedWalletIndex < event.previousIndex && this.selectedWalletIndex >= event.currentIndex) {
               this.selectedWalletIndex++;
          }

          // Persist the new order to localStorage
          this.saveWallets();

          // Update destinations and account state
          this.updateDestinations();
          this.onAccountChange();
     }

     async onAccountChange() {
          if (this.wallets.length === 0) {
               this.currentWallet = {
                    classicAddress: '',
                    address: '',
                    seed: '',
                    name: undefined,
                    balance: '0',
                    ownerCount: undefined,
                    xrpReserves: undefined,
                    spendableXrp: undefined,
               };
               return;
          }

          const selected = this.wallets[this.selectedWalletIndex];
          this.currentWallet = {
               ...selected,
               balance: selected.balance || '0',
               ownerCount: selected.ownerCount || '0',
               xrpReserves: selected.xrpReserves || '0',
               spendableXrp: selected.spendableXrp || '0',
          };

          if (this.currentWallet.address && xrpl.isValidAddress(this.currentWallet.address)) {
               this.ui.clearWarning();
               this.updateDestinations();
               await this.getAccountDetails();
          } else if (this.currentWallet.address) {
               this.ui.setError('Failed to refresh balance');
          }
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

               await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

               this.clearFields(false);
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getAccountDetails:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getAccountDetails in ${this.executionTime}ms`);
          }
     }

     onEncryptionChange() {
          this.storageService.setInputValue('encryptionType', this.encryptionType.toString());
     }

     private async refreshWallets(client: xrpl.Client, addressesToRefresh?: string[]) {
          console.log('Calling refreshWallets');

          try {
               await this.walletDataService.refreshWallets(
                    client,
                    this.wallets, // pass current wallet list
                    this.selectedWalletIndex, // pass selected index
                    addressesToRefresh,
                    (updatedWalletsList, newCurrentWallet) => {
                         // This callback runs inside NgZone → UI updates safely
                         this.currentWallet = { ...newCurrentWallet };
                         // Optional: trigger change detection if needed
                         this.cdr.detectChanges();
                    }
               );
          } catch (error: any) {
               throw new Error(error.message);
          }
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.storageService.set('destinations', this.destinations);
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet.encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet.seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     saveWallets() {
          this.storageService.set('wallets', JSON.stringify(this.wallets));
     }

     updatePaymentTx() {
          this.scheduleHighlight();
     }

     updateTxResult(tx: any) {
          this.ui.txResult = tx;
          this.scheduleHighlight();
     }

     private scheduleHighlight() {
          // Use the captured injector to run afterRenderEffect safely
          afterRenderEffect(
               () => {
                    if (this.ui.paymentTx && this.paymentJson?.nativeElement) {
                         const json = JSON.stringify(this.ui.paymentTx, null, 2);
                         this.paymentJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                    }

                    if (this.ui.txResult && this.txResultJson?.nativeElement) {
                         const json = JSON.stringify(this.ui.txResult, null, 2);
                         this.txResultJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                    }
               },
               { injector: this.injector }
          );
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

          // return `The <code>${walletName}</code> wallet has ${dynamicText} ${config.message}`;
          return null;
     }

     autoResize(textarea: HTMLTextAreaElement) {
          if (!textarea) return;
          textarea.style.height = 'auto'; // reset
          textarea.style.height = textarea.scrollHeight + 'px'; // expand
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.ui.clearMessages();
               this.ui.clearWarning();
          }

          this.cdr.detectChanges();
     }

     openDropdown() {
          // update service items (in case destinations changed)
          this.destinationDropdownService.setItems(this.destinations);
          // prepare filtered list
          this.destinationDropdownService.filter(this.destinationField || '');
          // tell service to open -> subscription above will attach overlay
          this.destinationDropdownService.openDropdown();
     }

     // Called by outside click / programmatic close
     closeDropdown() {
          this.destinationDropdownService.closeDropdown();
     }

     // Called by chevron toggle
     toggleDropdown() {
          // make sure the service has current items first
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.toggleDropdown();
     }

     // Called on input typing
     onDestinationInput() {
          this.filterQuery = this.destinationField || '';
          this.destinationDropdownService.filter(this.filterQuery);
          this.destinationDropdownService.openDropdown(); // ensure open while typing
     }

     private openDropdownInternal() {
          // If already attached, do nothing
          if (this.overlayRef?.hasAttached()) return;

          // position strategy (your existing logic)
          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(this.dropdownOrigin)
               .withPositions([
                    {
                         originX: 'start',
                         originY: 'bottom',
                         overlayX: 'start',
                         overlayY: 'top',
                         offsetY: 8,
                    },
               ])
               .withPush(false);

          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.close(),
          });

          const portal = new TemplatePortal(this.dropdownTemplate, this.viewContainerRef);
          this.overlayRef.attach(portal);

          // Close on backdrop click
          this.overlayRef.backdropClick().subscribe(() => {
               this.destinationDropdownService.closeDropdown(); // close via service so subscribers sync
          });
     }

     private closeDropdownInternal() {
          if (this.overlayRef) {
               this.overlayRef.detach();
               this.overlayRef = null;
          }
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

     selectDestination(address: string) {
          if (address === this.currentWallet.address) return;

          const dest = this.destinations.find(d => d.address === address);
          if (dest) {
               // show "Name (rABC12...DEF456)"
               this.destinationField = this.destinationDropdownService.formatDisplay(dest);
          } else {
               this.destinationField = `${address.slice(0, 6)}...${address.slice(-6)}`;
          }

          // close via service so subscribers remain in sync
          this.destinationDropdownService.closeDropdown();
          this.cdr.detectChanges();
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
}
