import { Component, OnInit, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
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
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { ActivatedRoute } from '@angular/router';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { WalletsStoreService } from '../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../services/wallets/wallets-util/wallets-util.service';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WALLET_GENERATOR_TAB_META, WALLET_GENERATOR_TABS } from './constants/wallet-generator.ui';
import { WALLET_GENERATOR_TAB } from './constants/wallet-generator.constants';
import { WalletGeneratorActionTypes } from './constants/wallet-generator.types';
import { WalletsViewModelService } from '../../services/wallets/wallets-view-model/wallets-view-model.service';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { WalletGeneratorRequirementsInfoComponent } from './ui-components/wallet-generator-requirements-info/wallet-generator-requirements-info.component';
import { WalletDeriveSeedComponent } from './tab/wallet-derive-seed/wallet-derive-seed.component';
import { WalletDeriveMnemonicComponent } from './tab/wallet-derive-mnemonic/wallet-derive-mnemonic.component';
import { WalletDeriveSecretNumbersComponent } from './tab/wallet-derive-secret-numbers/wallet-derive-secret-numbers.component';
import { WalletRemoveCustomWalletComponent } from './tab/wallet-remove-custom-wallet/wallet-remove-custom-wallet.component';
import { ButtonLoadingState } from '../../models/interface-items.model';
import { WalletGenerateComponent } from './tab/wallet-generate/wallet-generate.component';

@Component({
     selector: 'app-wallet-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, WalletGeneratorRequirementsInfoComponent, WalletDeriveSeedComponent, WalletDeriveMnemonicComponent, WalletDeriveSecretNumbersComponent, WalletRemoveCustomWalletComponent, WalletGenerateComponent],
     templateUrl: './wallet-configurator.component.html',
     styleUrl: './wallet-configurator.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletConfiguratorComponent extends WalletDestinationBase implements OnInit {
     public readonly walletManagerService = inject(WalletManagerService);
     private readonly dropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly walletGenerator = inject(WalletGeneratorService);
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsUtilService = inject(WalletsUtilService);
     public readonly walletsViewModelService = inject(WalletsViewModelService);
     readonly menuTabs: TabConfig[] = WALLET_GENERATOR_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = WALLET_GENERATOR_TAB_META;

     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     destinations = computed(() => [...this.customDestinations()]);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);
          this.xrplCache.invalidateAccountCache(wallet.address);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     async setTab(tab: string): Promise<void> {
          if (WALLET_GENERATOR_TAB.includes(tab as any)) {
               this.walletsViewModelService.activeTab.set(tab as WalletGeneratorActionTypes);
               this.destinationSearchQuery.set('');
          }
     }

     async generateNewAccount() {
          await this.executeWalletFlow({
               perfLabel: 'generateNewAccount',
               loadingKey: 'generateNewWalletFromSeed',
               walletType: 'familySeed',
               mode: 'generate',
               successMessage: addr => `Generated ${addr} wallet successfully!`,
          });
     }

     async deriveWalletFromFamilySeed() {
          await this.executeWalletFlow({
               perfLabel: 'deriveWalletFromFamilySeed',
               loadingKey: 'deriveWalletFromFamilySeed',
               walletType: 'familySeed',
               mode: 'import',
               input: () => this.walletsStoreService.seed(),
               validate: () => (xrpl.isValidSecret(this.walletsStoreService.seed()) ? null : 'Invalid seed value.'),
               successMessage: addr => `Successfully added ${addr}`,
          });
     }

     async generateNewWalletFromMnemonic() {
          await this.executeWalletFlow({
               perfLabel: 'generateNewWalletFromMnemonic',
               loadingKey: 'generateNewWalletFromMnemonic',
               walletType: 'mnemonic',
               mode: 'generate',
               successMessage: addr => `Generated ${addr} wallet from a mnemonic successfully!`,
          });
     }

     async deriveWalletFromMnemonic() {
          await this.executeWalletFlow({
               perfLabel: 'deriveWalletFromMnemonic',
               loadingKey: 'deriveWalletFromMnemonic',
               walletType: 'mnemonic',
               mode: 'import',
               input: () => this.walletsStoreService.mnemonic(),
               validate: () => (this.utilsService.isValidMnemonic(this.walletsStoreService.mnemonic()) ? null : this.walletsStoreService.errorMessage()),
               successMessage: addr => `Successfully added ${addr}`,
          });
     }

     async generateNewWalletFromSecretNumbers() {
          await this.executeWalletFlow({
               perfLabel: 'generateNewWalletFromSecretNumbers',
               loadingKey: 'generateNewWalletFromSecretNumbers',
               walletType: 'secretNumbers',
               mode: 'generate',
               successMessage: addr => `Generated ${addr} wallet from secret numbers successfully!`,
          });
     }

     async deriveWalletFromSecretNumbers() {
          await this.executeWalletFlow({
               perfLabel: 'deriveWalletFromSecretNumbers',
               loadingKey: 'deriveWalletFromSecretNumbers',
               walletType: 'secretNumbers',
               mode: 'import',
               input: () => this.walletsStoreService.secretNumbers(),
               validate: () => {
                    const converted = this.utilsService.convertSecretNumberStringToArray(this.walletsStoreService.secretNumbers());

                    return this.utilsService.isValidSecret(converted) ? null : 'Invalid Secret Number.';
               },
               successMessage: addr => `Successfully added ${addr}`,
          });
     }

     private async executeWalletFlow(config: {
          perfLabel: string;
          loadingKey: keyof ButtonLoadingState;
          walletType: 'familySeed' | 'mnemonic' | 'secretNumbers';
          mode: 'generate' | 'import';
          input?: () => any;
          validate?: () => string | null; // return error message or null
          successMessage: (address: string) => string;
     }) {
          await this.withPerf(config.perfLabel, async () => {
               this.txUiService.clearTxResultsHash();
               this.txUiService.resetCurrentStepToIdle();

               this.walletsStoreService.updateField('buttonLoading', s => ({
                    ...s,
                    [config.loadingKey]: true,
               }));

               try {
                    this.txUiService.currentStep.set('waiting_for_wallet_creation');

                    const encryption = this.walletsUtilService.getEncryptionType();

                    // Validation (if provided)
                    if (config.validate) {
                         const errorMsg = config.validate();
                         if (errorMsg) {
                              this.toastService.error(errorMsg, AppConstants.TOAST.ERROR);
                              return;
                         }
                    }

                    // Execute wallet op
                    const wallet = config.mode === 'generate' ? await this.walletGenerator.generateWallet(config.walletType, this.environment(), encryption) : await this.walletGenerator.importWallet(config.walletType, config.input?.(), encryption);

                    await this.refreshWallets(await this.xrplService.getClient(), [wallet.address]);

                    this.txUiService.setTxResultSignal(wallet);

                    this.toastService.success(config.successMessage(wallet.address), AppConstants.TOAST.SUCCESS, false);
               } catch (error: any) {
                    this.handleWalletError(error);
               } finally {
                    this.walletsStoreService.updateField('buttonLoading', s => ({
                         ...s,
                         [config.loadingKey]: false,
                    }));

                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     private handleWalletError(error: any) {
          console.error(error);

          if (error?.message?.includes('Account not found')) {
               this.toastService.error(`${error.message} Are you using the correct encryption?`, AppConstants.TOAST.ERROR);
          } else {
               this.toastService.error(error?.message || 'Unknown error', AppConstants.TOAST.ERROR);
          }
     }

     removeCustomWallet(): void {
          console.log('[REMOVE] Selected address set to1111111111:', this.selectedDestinationAddress());
  const address = this.selectedDestinationAddress();

  if (!address) {
    this.toastService.error('Please select a custom wallet first', AppConstants.TOAST.ERROR);
    return;
  }

  if (!xrpl.isValidAddress(address)) {
    this.toastService.error('Invalid address selected', AppConstants.TOAST.ERROR);
    return;
  }

  const currentCustoms = this.customDestinations();
  if (!currentCustoms.some((w) => w.address === address)) {
    this.toastService.error('Selected wallet not found in custom list', AppConstants.TOAST.ERROR);
    return;
  }

  this.customDestinations.update((list) => list.filter((w) => w.address !== address));
  this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));

  this.updateDestinations(); // refresh other dropdowns if they use the same source

  // Reset selection
  this.selectedDestinationAddress.set('');
  this.destinationSearchQuery.set('');

  this.toastService.success(`Custom wallet ${address} removed successfully`);
}

     removeCustomWallet1(): void {
          // this.selectedDestinationAddress.set(this.credentialStore.subject());
          //                     subjectDestination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
          //                     if (!subjectDestination || !xrpl.isValidAddress(subjectDestination)) {
          //                          this.toastService.error('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
          //                          return;
          //                     }

          // const address = this.selectedDestinationAddress();
          const address = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
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

     protected async onSelectedWalletIndexChange(): Promise<void> {
          return;
     }

     protected refreshAccountObject(_env: any): void {
          return;
     }

     protected clearInputFields(): void {
          this.walletsStoreService.resetAll();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }

     clearFields(all = true) {
          if (all) {
               this.txUiService.clearMessages();
               this.txUiService.clearWarning();
          }
          this.walletsStoreService.resetAll();
     }
}
