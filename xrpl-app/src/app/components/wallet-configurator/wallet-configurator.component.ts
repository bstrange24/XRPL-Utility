import { Component, OnInit, inject, computed, signal, effect, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import * as bip39 from 'bip39';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { ActivatedRoute } from '@angular/router';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { WalletsStoreService } from '../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../services/wallets/wallets-util/wallets-util.service';

@Component({
     selector: 'app-wallet-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './wallet-configurator.component.html',
     styleUrl: './wallet-configurator.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletConfiguratorComponent  extends WalletDestinationBase  implements OnInit {
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     private readonly dropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly walletGenerator = inject(WalletGeneratorService);
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsUtilService = inject(WalletsUtilService);

     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     // errorMessage = signal<string>('');
     activeTab = signal<'generate' | 'deriveSeed' | 'deriveMnemonic' | 'deriveSecretNumbers' | 'removeCustomWallets'>('generate');

     // statusMessage = computed(() => {
     //      if (this.txUiService.mnemonicValid()) {
     //           return '✅ Mnemonic Valid';
     //      }

     //      const error = this.errorMessage();
     //      return error ? `❌ ${error}` : '❌ Invalid Mnemonic';
     // });

     destinations = computed(() => [...this.customDestinations()]);

     private readonly _selectedIndexEffect = effect(() => {
          // Trigger on selection change
          this.walletManagerService.selectedIndex();

          this.txUiService.clearAllOptionsAndMessages();
          this.clearFields();
     });

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
           this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     get isAnyButtonLoading(): boolean {
          return Object.values(this.txUiService.buttonLoading).includes(true);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'generate' | 'deriveSeed' | 'deriveMnemonic' | 'deriveSecretNumbers' | 'removeCustomWallets'): Promise<void> {
          this.activeTab.set(tab);
          this.clearFields(true);
          this.txUiService.clearAllOptionsAndMessages();
     }

     // Called by the Wallet Configurator page
     async generateNewAccount() {
          await this.withPerf('generateNewAccount', async () => {
               this.txUiService.clearTxResultsHash();
               this.txUiService.resetCurrentStepToIdle();
               console.log('ON Wallet Configurator page');

               this.txUiService.buttonLoading.update(s => ({
                    ...s,
                    generateNewWalletFromSeed: true,
               }));

               try {
                    this.txUiService.currentStep.set('waiting_for_wallet_creation');

                    const encryption = this.walletsUtilService.getEncryptionType();

                    const wallet = await this.walletGenerator.generateWallet('familySeed', this.environment(), encryption);

                    await this.refreshWallets(await this.xrplService.getClient(), [wallet.address]);

                    this.txUiService.setTxResultSignal(wallet);

                    this.toastService.success(`Generated ${wallet.address || wallet.wallet?.classicAddress} wallet successfully!`, AppConstants.TOAST.SUCCESS, false);
               } catch (error: any) {
                    console.error('Generate account failed', error);
                    this.toastService.error(error.message, AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.buttonLoading.update(s => ({
                         ...s,
                         generateNewWalletFromSeed: false,
                    }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     // Called by the Wallet Configurator page
     async deriveWalletFromFamilySeed() {
          await this.withPerf('deriveWalletFromFamilySeed', async () => {
               this.txUiService.clearTxResultsHash();
               this.txUiService.resetCurrentStepToIdle();

               this.txUiService.buttonLoading.update(s => ({
                    ...s,
                    deriveWalletFromFamilySeed: true,
               }));

               try {
                    this.txUiService.currentStep.set('waiting_for_wallet_creation');

                    const encryption = this.walletsUtilService.getEncryptionType();

                    if (!xrpl.isValidSecret(this.txUiService.seed())) {
                         return this.toastService.error('Invalid seed value.', AppConstants.TOAST.ERROR);
                    }

                    const wallet = await this.walletGenerator.importWallet('familySeed', this.txUiService.seed(), encryption);

                    await this.refreshWallets(await this.xrplService.getClient(), [wallet.address]);

                    this.txUiService.setTxResultSignal(wallet);

                    this.toastService.success(`Successfully added ${wallet.address}`, AppConstants.TOAST.SUCCESS, false);
               } catch (error: any) {
                    if (error.message.includes('Account not found')) {
                         this.toastService.error(`${error.message} Are you using the correct encryption?`, AppConstants.TOAST.ERROR);
                    } else {
                         this.toastService.error(error.message, AppConstants.TOAST.ERROR);
                    }
               } finally {
                    this.txUiService.buttonLoading.update(s => ({
                         ...s,
                         deriveWalletFromFamilySeed: false,
                    }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async generateNewWalletFromMnemonic() {
          await this.withPerf('generateNewWalletFromMnemonic', async () => {
               this.txUiService.clearTxResultsHash();
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.buttonLoading.update(state => ({
                    ...state,
                    generateNewWalletFromMnemonic: true,
               }));

               try {
                    this.txUiService.currentStep.set('waiting_for_wallet_creation');

                    this.txUiService.encryptionType.set(this.walletsUtilService.getEncryptionType());
                    console.log('encryptionType: ', this.txUiService.encryptionType());

                    const faucetWallet = await this.walletGenerator.generateWallet('mnemonic', this.environment(), this.walletsUtilService.getEncryptionType());

                    await this.refreshWallets(await this.xrplService.getClient(), [faucetWallet.address]);

                    this.txUiService.setTxResultSignal(faucetWallet);
                    this.toastService.success(`Generated ${faucetWallet.address} wallet from a Mneomic successfully!`, AppConstants.TOAST.SUCCESS, false);
               } catch (error: any) {
                    console.error('Failed to generateNewWalletFromMnemonic:', error);
                    this.toastService.error(error.message || 'Unknown error', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.buttonLoading.update(state => ({
                         ...state,
                         generateNewWalletFromMnemonic: false,
                    }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     // Called by the Wallet Configurator page
     async deriveWalletFromMnemonic() {
          await this.withPerf('deriveWalletFromMnemonic', async () => {
               this.txUiService.clearTxResultsHash();
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.buttonLoading.update(state => ({
                    ...state,
                    deriveWalletFromMnemonic: true,
               }));

               try {
                    this.txUiService.currentStep.set('waiting_for_wallet_creation');

                    this.txUiService.encryptionType.set(this.walletsUtilService.getEncryptionType());
                    console.log('encryptionType: ', this.txUiService.encryptionType());

                    if (!this.utilsService.isValidMnemonic(this.txUiService.mnemonic())) {
                         return this.toastService.error(this.walletsStoreService.errorMessage(), AppConstants.TOAST.ERROR);
                    }

                    const faucetWallet = await this.walletGenerator.importWallet('mnemonic', this.txUiService.mnemonic(), this.walletsUtilService.getEncryptionType());

                    await this.refreshWallets(await this.xrplService.getClient(), [faucetWallet.address]);

                    this.txUiService.setTxResultSignal(faucetWallet);
                    this.toastService.success(`Successfully added ${faucetWallet.address}`, AppConstants.TOAST.SUCCESS, false);
               } catch (error: any) {
                    console.error('Error in deriveWalletFromMnemonic:', error);
                    if (error.message === 'Failed to fetch account info: Account not found.') {
                         this.toastService.error(`${error.message} Are you using the correct encryption?`, AppConstants.TOAST.ERROR);
                    } else {
                         this.toastService.error(error.message || 'Unknown error', AppConstants.TOAST.ERROR);
                    }
               } finally {
                    this.txUiService.buttonLoading.update(state => ({
                         ...state,
                         deriveWalletFromMnemonic: false,
                    }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     // Called by the Wallet Configurator page
     async generateNewWalletFromSecretNumbers() {
          await this.withPerf('generateNewWalletFromSecretNumbers', async () => {
               this.txUiService.clearTxResultsHash();
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.buttonLoading.update(state => ({
                    ...state,
                    generateNewWalletFromSecretNumbers: true,
               }));

               try {
                    this.txUiService.currentStep.set('waiting_for_wallet_creation');

                    this.txUiService.encryptionType.set(this.walletsUtilService.getEncryptionType());
                    console.log('encryptionType: ', this.txUiService.encryptionType());

                    const faucetWallet = await this.walletGenerator.generateWallet('secretNumbers', this.environment(), this.walletsUtilService.getEncryptionType());

                    await this.refreshWallets(await this.xrplService.getClient(), [faucetWallet.address]);

                    this.txUiService.setTxResultSignal(faucetWallet);
                    this.toastService.success(`Generated ${faucetWallet.address} wallet from secret numbers successfully!`, AppConstants.TOAST.SUCCESS, false);
               } catch (error: any) {
                    console.error('Error in generateNewWalletFromSecretNumbers:', error);
                    this.toastService.error(error.message || 'Unknown error', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.buttonLoading.update(state => ({
                         ...state,
                         generateNewWalletFromSecretNumbers: false,
                    }));
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     // Called by the Wallet Configurator page
     async deriveWalletFromSecretNumbers() {
          await this.withPerf('deriveWalletFromSecretNumbers', async () => {
               this.txUiService.clearTxResultsHash();
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.buttonLoading.update(state => ({
                    ...state,
                    deriveWalletFromSecretNumbers: true,
               }));

               try {
                    this.txUiService.currentStep.set('waiting_for_wallet_creation');

                    this.txUiService.encryptionType.set(this.walletsUtilService.getEncryptionType());
                    console.log('encryptionType: ', this.txUiService.encryptionType());

                    if (!this.utilsService.isValidSecret(this.utilsService.convertSecretNumberStringToArray(this.txUiService.secretNumbers()))) {
                         return this.toastService.error('Invalid Secret Number.', AppConstants.TOAST.ERROR);
                    }

                    const faucetWallet = await this.walletGenerator.importWallet('secretNumbers', this.txUiService.secretNumbers(), this.walletsUtilService.getEncryptionType());

                    await this.refreshWallets(await this.xrplService.getClient(), [faucetWallet.address]);

                    this.txUiService.setTxResultSignal(faucetWallet);
                    this.toastService.success(`Successfully added ${faucetWallet.address}`, AppConstants.TOAST.SUCCESS, false);
               } catch (error: any) {
                    console.error('Error in deriveWalletFromSecretNumbers:', error);
                    if (error.message === 'Failed to fetch account info: Account not found.') {
                         this.toastService.error(`${error.message} Are you using the correct encryption?`, AppConstants.TOAST.ERROR);
                    } else {
                         this.toastService.error(error.message || 'Unknown error', AppConstants.TOAST.ERROR);
                    }
               } finally {
                    this.txUiService.buttonLoading.update(state => ({
                         ...state,
                         deriveWalletFromSecretNumbers: false,
                    }));
                    this.txUiService.resetCurrentStepToIdle();
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

     // getEncryptionType(): string {
     //      if (this.txUiService.secp256k1_encryption_type()) {
     //           return AppConstants.ENCRYPTION.SECP256K1;
     //      }
     //      return AppConstants.ENCRYPTION.ED25519; // Default if neither or only ed25519 checked
     // }

     // onEncryptionChange() {
     //      this.storageService.setInputValue('encryptionType', this.txUiService.encryptionType.toString());
     // }

     // onMnemonicInput() {
     //      this.txUiService.mnemonicInput.set(this.utilsService.normalizeMnemonic(this.txUiService.mnemonic()));

     //      if (!/^[a-z]+( [a-z]+)*$/.test(this.txUiService.mnemonic())) {
     //           this.walletsStoreService.setField('errorMessage', 'Invalid Mnemonic. Must contain lowercase words separated by single spaces only.');
     //      }

     //      if (!bip39.validateMnemonic(this.txUiService.mnemonic())) {
     //           this.walletsStoreService.setField('errorMessage','Invalid BIP39 Mnemonic.');
     //      }

     //      this.txUiService.mnemonicValid.set(this.utilsService.isValidMnemonic(this.txUiService.mnemonic()));
     // }

     // onSecretNumberInput() {
     //      this.txUiService.secretNumberInput.set(this.utilsService.normalizeSecrets(this.txUiService.secretNumbers()));
     //      this.txUiService.secretNumberValid.set(this.utilsService.isValidSecret(this.utilsService.convertSecretNumberStringToArray(this.txUiService.secretNumbers())));
     // }

     // onSeedInput() {
     //      this.txUiService.seedInput.set(this.utilsService.normalizeFamilySeed(this.txUiService.seed()));
     //      this.txUiService.seedValid.set(xrpl.isValidSecret(this.txUiService.seed()));
     // }

     // setEncryption(type: 'ed25519' | 'secp256k1') {
     //      if (type === 'ed25519') {
     //           this.txUiService.ed25519_encryption_type.set(true);
     //           this.txUiService.secp256k1_encryption_type.set(false);
     //      } else {
     //           this.txUiService.ed25519_encryption_type.set(false);
     //           this.txUiService.secp256k1_encryption_type.set(true);
     //      }

     //      this.saveEncryptionPreference();
     // }

     // onEd25519Change() {
     //      const isEd25519 = this.txUiService.ed25519_encryption_type();

     //      if (isEd25519) {
     //           // Turning ED25519 ON → force SECP off
     //           this.txUiService.secp256k1_encryption_type.set(false);
     //      } else if (!this.txUiService.secp256k1_encryption_type()) {
     //           // Trying to turn ED25519 OFF → don't allow it unless SECP is already on
     //           this.txUiService.ed25519_encryption_type.set(true);
     //           this.toastService.info('At least one encryption type must be selected', AppConstants.TOAST.INFO);
     //           return;
     //      }

     //      this.saveEncryptionPreference();
     // }

     // onSecp256k1Change() {
     //      const isSecp = this.txUiService.secp256k1_encryption_type();

     //      if (isSecp) {
     //           // Turning SECP ON → force ED25519 off
     //           this.txUiService.ed25519_encryption_type.set(false);
     //      } else if (!this.txUiService.ed25519_encryption_type()) {
     //           // Trying to turn SECP OFF → don't allow it unless ED25519 is on
     //           this.txUiService.secp256k1_encryption_type.set(true);
     //           this.toastService.info('At least one encryption type must be selected', AppConstants.TOAST.INFO);
     //           return;
     //      }

     //      this.saveEncryptionPreference();
     // }

     // private saveEncryptionPreference() {
     //      const type = this.getEncryptionType();
     //      this.storageService.setInputValue('encryptionType', type);
     // }

      protected async onSelectedWalletIndexChange(): Promise<void> {
     }

      protected refreshAccountObject(env: any): void {
     }

     protected clearInputFields(): void {
          // this.permissionedDomainUtilService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }

     updateDestinations() {
          const allItems = [
               ...this.walletManagerService.wallets().map(wallet => ({
                    name: wallet.name ?? this.truncateAddress(wallet.address),
                    address: wallet.address,
               })),
               ...this.customDestinations(),
          ];

          // Deduplicate by address
          const deduped = Array.from(new Map(allItems.map(item => [item.address, item])).values());

          console.log('deduped: ', deduped);

          this.storageService.set('destinations', deduped);
     }

     updateDestinations1() {
          const allItems = [
               ...this.walletManagerService.wallets().map(wallet => ({
                    name: wallet.name ?? this.truncateAddress(wallet.address),
                    address: wallet.address,
               })),
               ...this.customDestinations(),
          ];
          console.log('allItems: ', allItems);
          this.storageService.set('destinations', allItems);
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     clearFields(all = true) {
          if (all) {
               this.txUiService.clearMessages();
               this.txUiService.clearWarning();
          }
          this.txUiService.seed.set('');
          this.txUiService.mnemonic.set('');
          this.txUiService.secretNumbers.set('');
          this.txUiService.mnemonicInput.set('');
          // this.txUiService.mnemonicValid.set(false);
          this.txUiService.secretNumberInput.set([]);
          this.txUiService.secretNumberValid.set(false);
          this.txUiService.seedInput.set('');
          this.txUiService.seedValid.set(false);
     }
}
