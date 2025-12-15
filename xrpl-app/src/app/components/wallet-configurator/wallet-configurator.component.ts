import { Component, OnInit, inject, computed, DestroyRef, signal } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
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
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

@Component({
     selector: 'app-wallet-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './wallet-configurator.component.html',
     styleUrl: './wallet-configurator.component.css',
})
export class WalletConfiguratorComponent extends PerformanceBaseComponent implements OnInit {
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
     public readonly walletGenerator = inject(WalletGeneratorService);

     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     infoPanelExpanded = signal(false);
     activeTab = signal<'generate' | 'deriveSeed' | 'deriveMnemonic' | 'deriveSecretNumbers' | 'removeCustomWallets'>('generate');
     encryptionType: string = '';
     seed = signal<string>('');
     mnemonic = signal<string>('');
     secretNumbers = signal<string>('');
     ed25519_encryption_type = signal(false); //: boolean = false;
     secp256k1_encryption_type = signal(false); //: boolean = false;

     buttonLoading = {
          generateNewWalletFromSeed: false,
          generateNewWalletFromMnemonic: false,
          generateNewWalletFromSecretNumbers: false,
          deriveWalletFromFamilySeed: false,
          deriveWalletFromMnemonic: false,
          deriveWalletFromSecretNumbers: false,
     };

     mnemonicInput = signal<string>('');
     mnemonicValid = signal(false); // = false;
     secretNumberInput = signal<string[]>([]); // : string[] = [];
     secretNumberValid = signal(false); // = false;
     seedInput = signal<string>('');
     seedValid = signal(false); // = false;

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

     destinations = computed(() => [...this.customDestinations()]);

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
                    this.txUiService.setInfoMessage('');
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
                    this.clearFields();
                    await this.getAccountDetails(false);
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

     get isAnyButtonLoading(): boolean {
          return Object.values(this.buttonLoading).some(v => v === true);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'generate' | 'deriveSeed' | 'deriveMnemonic' | 'deriveSecretNumbers' | 'removeCustomWallets'): Promise<void> {
          this.activeTab.set(tab);
          this.clearFields(true);
          this.txUiService.clearAllOptionsAndMessages();
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.withPerf('getAccountDetails', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               if (this.hasWallets() && this.walletManagerService.getSelectedIndex() < 0) {
                    throw new Error('Please select a wallet.');
               }

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const accountInfo = await this.xrplCache.getAccountInfo(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.clearFields(false);
               } catch (error: any) {
                    console.error('Failed to load account:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async generateNewAccount() {
          await this.withPerf('generateNewAccount', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.buttonLoading.generateNewWalletFromSeed = true;
               this.txUiService.showSpinnerWithDelay('Generating new wallet', 5000);

               try {
                    // Default to ed25519
                    this.encryptionType = AppConstants.ENCRYPTION.ED25519;
                    console.log('encryptionType: ', this.encryptionType);
                    const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets(), this.environment(), this.encryptionType);
                    const client = await this.xrplService.getClient();
                    await this.refreshWallets(client, [faucetWallet.address]);
                    this.txUiService.spinner.set(false);
                    this.txUiService.clearWarning();
                    this.txUiService.setSuccess(`Generated ${faucetWallet.address ? faucetWallet.address : faucetWallet.wallet.classicAddress} wallet from a seed successfully!`);
                    this.txUiService.setTxResultSignal(faucetWallet);
               } catch (error: any) {
                    console.error('Error in generateNewAccount:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
                    this.buttonLoading.generateNewWalletFromSeed = false;
               }
          });
     }

     async deriveWalletFromFamilySeed() {
          await this.withPerf('deriveWalletFromFamilySeed', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.buttonLoading.deriveWalletFromFamilySeed = true;
               this.txUiService.updateSpinnerMessage(``);
               this.txUiService.showSpinnerWithDelay('Derive wallet', 10);

               try {
                    this.encryptionType = this.getEncryptionType();
                    console.log('encryptionType: ', this.encryptionType);

                    if (!xrpl.isValidSecret(this.seed())) {
                         return this.txUiService.setError('Invalid seed value.');
                    }

                    const client = await this.xrplService.getClient();

                    const stored = this.storageService.get('destinations');
                    const dest = stored ? stored : [];
                    const { wallet: faucetWallet, destinations, customDestinations } = await this.walletGenerator.deriveWalletFromFamilySeed(client, this.seed(), dest, dest);
                    this.destinations = destinations;
                    this.customDestinations.set(customDestinations);
                    // this.customDestinations = customDestinations;
                    this.updateDestinations();

                    await this.refreshWallets(client, [faucetWallet.address]);
                    this.txUiService.spinner.set(false);
                    this.txUiService.clearWarning();
                    this.txUiService.setSuccess(`Successfully added ${faucetWallet.address}`);
               } catch (error: any) {
                    console.error('Error in deriveWalletFromFamilySeed:', error);
                    if (error.message === 'Failed to fetch account info: Account not found.') {
                         this.txUiService.setError(`${error.message} Are you using the correct encryption?`);
                    } else {
                         this.txUiService.setError(`${error.message || 'Transaction failed'}`);
                    }
               } finally {
                    this.txUiService.spinner.set(false);
                    this.buttonLoading.deriveWalletFromFamilySeed = false;
               }
          });
     }

     async generateNewWalletFromMnemonic() {
          await this.withPerf('generateNewWalletFromMnemonic', async () => {
               this.buttonLoading.generateNewWalletFromMnemonic = true;
               this.txUiService.showSpinnerWithDelay('Generating new wallet', 5000);

               try {
                    this.encryptionType = this.getEncryptionType();
                    console.log('encryptionType: ', this.encryptionType);
                    const faucetWallet = await this.walletGenerator.generateNewWalletFromMnemonic(this.wallets(), this.environment(), this.encryptionType);
                    const client = await this.xrplService.getClient();
                    await this.refreshWallets(client, [faucetWallet.address]);
                    this.txUiService.spinner.set(false);
                    this.txUiService.clearWarning();
                    this.txUiService.setSuccess(`Generated ${faucetWallet.address} wallet from a Mneomic successfully!`);
                    this.txUiService.setTxResultSignal(faucetWallet);
               } catch (error: any) {
                    console.error('Failed to generateNewWalletFromMnemonic:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
                    this.buttonLoading.generateNewWalletFromMnemonic = false;
               }
          });
     }

     async deriveWalletFromMnemonic() {
          await this.withPerf('deriveWalletFromMnemonic', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.buttonLoading.deriveWalletFromMnemonic = true;
               this.txUiService.updateSpinnerMessage(``);
               this.txUiService.showSpinnerWithDelay('Derive wallet', 10);

               try {
                    this.encryptionType = this.getEncryptionType();
                    console.log('encryptionType: ', this.encryptionType);

                    if (!this.utilsService.isValidMnemonic(this.mnemonic())) {
                         return this.txUiService.setError('Invalid Mnemonic.');
                    }

                    const client = await this.xrplService.getClient();

                    const stored = this.storageService.get('destinations');
                    const dest = stored ? stored : [];
                    const { wallet: faucetWallet, destinations, customDestinations } = await this.walletGenerator.deriveWalletFromMnemonic(client, this.mnemonic(), dest, dest);
                    this.destinations = destinations;
                    this.customDestinations = customDestinations;
                    this.updateDestinations();

                    await this.refreshWallets(client, [faucetWallet.address]);
                    this.txUiService.spinner.set(false);
                    this.txUiService.clearWarning();
                    this.txUiService.setSuccess(`Successfully added ${faucetWallet.address}`);
               } catch (error: any) {
                    console.error('Error in deriveWalletFromMnemonic:', error);
                    if (error.message === 'Failed to fetch account info: Account not found.') {
                         this.txUiService.setError(`${error.message} Are you using the correct encryption?`);
                    } else {
                         this.txUiService.setError(`${error.message || 'Transaction failed'}`);
                    }
               } finally {
                    this.txUiService.spinner.set(false);
                    this.buttonLoading.deriveWalletFromMnemonic = false;
               }
          });
     }

     async generateNewWalletFromSecretNumbers() {
          await this.withPerf('generateNewWalletFromSecretNumbers', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.buttonLoading.generateNewWalletFromSecretNumbers = true;
               this.txUiService.showSpinnerWithDelay('Generating new wallet', 5000);

               try {
                    this.encryptionType = this.getEncryptionType();
                    console.log('encryptionType ............................................................', this.encryptionType);
                    const faucetWallet = await this.walletGenerator.generateNewWalletFromSecretNumbers(this.wallets(), this.environment(), this.encryptionType);
                    const client = await this.xrplService.getClient();
                    await this.refreshWallets(client, [faucetWallet.address]);
                    this.txUiService.spinner.set(false);
                    this.txUiService.clearWarning();
                    this.txUiService.setSuccess(`Generated ${faucetWallet.address} wallet from secret numbers successfully!`);
                    this.txUiService.setTxResultSignal(faucetWallet);
               } catch (error: any) {
                    console.error('Error in generateNewWalletFromSecretNumbers:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
                    this.buttonLoading.generateNewWalletFromSecretNumbers = false;
               }
          });
     }

     async deriveWalletFromSecretNumbers() {
          await this.withPerf('deriveWalletFromSecretNumbers', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.buttonLoading.deriveWalletFromSecretNumbers = true;
               this.txUiService.updateSpinnerMessage(``);
               this.txUiService.showSpinnerWithDelay('Derive wallet', 10);

               try {
                    this.encryptionType = this.getEncryptionType();
                    console.log('encryptionType: ', this.encryptionType);

                    if (!this.utilsService.isValidSecret(this.utilsService.convertSecretNumberStringToArray(this.secretNumbers()))) {
                         return this.txUiService.setError('Invalid Secret Number.');
                    }

                    const client = await this.xrplService.getClient();

                    const stored = this.storageService.get('destinations');
                    const dest = stored ? stored : [];
                    const { wallet: faucetWallet, destinations, customDestinations } = await this.walletGenerator.deriveWalletFromSecretNumbers(client, this.secretNumbers(), dest, dest);
                    this.destinations = destinations;
                    this.customDestinations = customDestinations;
                    this.updateDestinations();

                    await this.refreshWallets(client, [faucetWallet.address]);
                    this.txUiService.spinner.set(false);
                    this.txUiService.clearWarning();
                    this.txUiService.setSuccess(`Successfully added ${faucetWallet.address}`);
               } catch (error: any) {
                    console.error('Error in deriveWalletFromSecretNumbers:', error);
                    if (error.message === 'Failed to fetch account info: Account not found.') {
                         this.txUiService.setError(`${error.message} Are you using the correct encryption?`);
                    } else {
                         this.txUiService.setError(`${error.message}`);
                         this.txUiService.setError(`${error.message || 'Transaction failed'}`);
                    }
               } finally {
                    this.txUiService.spinner.set(false);
                    this.buttonLoading.deriveWalletFromSecretNumbers = false;
               }
          });
     }

     removeCustomWallet(): void {
          const address = this.selectedDestinationAddress();
          if (!address) {
               this.toastService.success('Custom wallet not found');
               return;
          }

          this.customDestinations.update(list => list.filter(w => w.address !== address));
          this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));

          this.updateDestinations();

          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');

          this.dropdownService.setSelectedItems(this.destinationItems());
          this.dropdownService.closeDropdown();
          this.toastService.success(`Custom wallet ${address} removed successfully`);
     }

     getEncryptionType(): string {
          if (this.secp256k1_encryption_type()) {
               return AppConstants.ENCRYPTION.SECP256K1;
          }
          return AppConstants.ENCRYPTION.ED25519; // Default if neither or only ed25519 checked
     }

     onEncryptionChange() {
          this.storageService.setInputValue('encryptionType', this.encryptionType.toString());
     }

     onMnemonicInput() {
          this.mnemonicInput.set(this.utilsService.normalizeMnemonic(this.mnemonic()));
          this.mnemonicValid.set(this.utilsService.isValidMnemonic(this.mnemonic()));
     }

     onSecretNumberInput() {
          this.secretNumberInput.set(this.utilsService.normalizeSecrets(this.secretNumbers()));
          this.secretNumberValid.set(this.utilsService.isValidSecret(this.utilsService.convertSecretNumberStringToArray(this.secretNumbers())));
     }

     onSeedInput() {
          this.seedInput.set(this.utilsService.normalizeFamilySeed(this.seed()));
          this.seedValid.set(xrpl.isValidSecret(this.seed()));
     }

     onEd25519Change() {
          if (this.ed25519_encryption_type()) {
               this.secp256k1_encryption_type.set(false);
          }
          this.saveEncryptionPreference();
     }

     onSecp256k1Change() {
          if (this.secp256k1_encryption_type()) {
               this.ed25519_encryption_type.set(false);
          }
          this.saveEncryptionPreference();
     }

     private saveEncryptionPreference() {
          const type = this.getEncryptionType();
          this.storageService.setInputValue('encryptionType', type);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
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

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
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

          const config = tabConfig[this.activeTab() as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          // return `<code>${walletName}</code> wallet has ${dynamicText} ${config.message}`;
          return null;
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields(all = true) {
          if (all) {
               this.txUiService.clearMessages();
               this.txUiService.clearWarning();
          }
          this.seed.set('');
          this.mnemonic.set('');
          this.secretNumbers.set('');
          this.mnemonicInput.set('');
          this.mnemonicValid.set(false);
          this.secretNumberInput.set([]);
          this.secretNumberValid.set(false);
          this.seedInput.set('');
          this.seedValid.set(false);
     }
}
