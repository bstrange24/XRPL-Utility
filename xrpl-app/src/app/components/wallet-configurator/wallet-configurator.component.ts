import { Component, OnInit, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { ActivatedRoute } from '@angular/router';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { WalletsStoreService } from '../../services/wallets/wallets-store/wallets-store.service';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { WALLET_GENERATOR_TAB_META, WALLET_GENERATOR_TABS } from './constants/wallet-generator.ui';
import { WALLET_GENERATOR_TAB } from './constants/wallet-generator.constants';
import { WalletGeneratorActionTypes } from './constants/wallet-generator.types';
import { WalletsViewModelService } from '../../services/wallets/wallets-view-model/wallets-view-model.service';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { WalletGeneratorRequirementsInfoComponent } from './ui-components/wallet-generator-requirements-info/wallet-generator-requirements-info.component';
import { WalletDeriveSeedComponent } from './tab/wallet-derive-seed/wallet-derive-seed.component';
import { WalletDeriveMnemonicComponent } from './tab/wallet-derive-mnemonic/wallet-derive-mnemonic.component';
import { WalletDeriveSecretNumbersComponent } from './tab/wallet-derive-secret-numbers/wallet-derive-secret-numbers.component';
import { WalletRemoveCustomWalletComponent } from './tab/wallet-remove-custom-wallet/wallet-remove-custom-wallet.component';
import { WalletGenerateComponent } from './tab/wallet-generate/wallet-generate.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { WalletConfiguratorOrchestratorService } from '../../services/wallets/wallet-configurator-orchestrator/wallet-configurator-orchestrator.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';

@Component({
     selector: 'app-wallet-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TransactionPreviewComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, WalletDeriveSeedComponent, WalletDeriveMnemonicComponent, WalletDeriveSecretNumbersComponent, WalletRemoveCustomWalletComponent, WalletGenerateComponent],
     templateUrl: './wallet-configurator.component.html',
     styleUrl: './wallet-configurator.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletConfiguratorComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     protected override readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsViewModelService = inject(WalletsViewModelService);
     public readonly walletConfiguratorOrchestrator = inject(WalletConfiguratorOrchestratorService);
     private rightPanelService = inject(RightPanelService);
     menuTabs = WALLET_GENERATOR_TABS;
     tabMeta = WALLET_GENERATOR_TAB_META;

     customDestinations = signal<{ name?: string; address: string }[]>([]);
     destinations = computed(() => [...this.customDestinations()]);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.transactionDropdownService.loadCustomDestinations();
          this.walletsStoreService.resetAll();
          this.walletsStoreService.setField('secp256k1_encryption_type', true);

          // NEW - Recommended
          this.rightPanelService.setPanel({
               mainComponent: WalletGeneratorRequirementsInfoComponent,
               mainInputs: {
                    activeTab: this.walletsViewModelService.activeTab,
               },

               // Add summary here when you want it (e.g. on Credentials page)
               // summaryComponent: CredentialsSummaryComponent,
               // summaryInputs: { ... }
          });
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          this.xrplCache.invalidateAccountCache(wallet.address);
          if (this.walletsStoreService.selectedAddress() === wallet.address) this.walletsStoreService.setField('selectedAddress', '');
     }

     async setTab(tab: string): Promise<void> {
          if (!WALLET_GENERATOR_TAB.includes(tab as any)) return;
          this.walletsViewModelService.activeTab.set(tab as WalletGeneratorActionTypes);
          this.clearInputFields();
          this.walletsStoreService.resetAll();
          this.walletsStoreService.setField('secp256k1_encryption_type', true);
     }

     async generateNewAccount(): Promise<void> {
          const result = await this.walletConfiguratorOrchestrator.executeWalletFlow({
               perfLabel: 'generateNewAccount',
               loadingKey: 'generateNewWalletFromSeed',
               walletType: 'familySeed',
               mode: 'generate',
               successMessage: addr => `Generated ${addr} wallet successfully!`,
          });
          if (result.success && result.wallet) {
               await this.refreshWallets(await this.xrplService.getClient(), [result.wallet.address]);
          }
     }

     async deriveWalletFromFamilySeed(): Promise<void> {
          const result = await this.walletConfiguratorOrchestrator.executeWalletFlow({
               perfLabel: 'deriveWalletFromFamilySeed',
               loadingKey: 'deriveWalletFromFamilySeed',
               walletType: 'familySeed',
               mode: 'import',
               input: () => this.walletsStoreService.seed(),
               validate: () => (xrpl.isValidSecret(this.walletsStoreService.seed()) ? null : 'Invalid seed value.'),
               successMessage: addr => `Successfully added ${addr}`,
          });
          if (result.success && result.wallet) {
               await this.refreshWallets(await this.xrplService.getClient(), [result.wallet.address]);
          }
     }

     async generateNewWalletFromMnemonic(): Promise<void> {
          const result = await this.walletConfiguratorOrchestrator.executeWalletFlow({
               perfLabel: 'generateNewWalletFromMnemonic',
               loadingKey: 'generateNewWalletFromMnemonic',
               walletType: 'mnemonic',
               mode: 'generate',
               successMessage: addr => `Generated ${addr} wallet from a mnemonic successfully!`,
          });
          if (result.success && result.wallet) {
               await this.refreshWallets(await this.xrplService.getClient(), [result.wallet.address]);
          }
     }

     async deriveWalletFromMnemonic(): Promise<void> {
          const result = await this.walletConfiguratorOrchestrator.executeWalletFlow({
               perfLabel: 'deriveWalletFromMnemonic',
               loadingKey: 'deriveWalletFromMnemonic',
               walletType: 'mnemonic',
               mode: 'import',
               input: () => this.walletsStoreService.mnemonic(),
               validate: () => (this.walletsUtilService.isValidMnemonic(this.walletsStoreService.mnemonic()) ? null : 'Invalid mnemonic value.'),
               successMessage: addr => `Successfully added ${addr}`,
          });
          if (result.success && result.wallet) {
               await this.refreshWallets(await this.xrplService.getClient(), [result.wallet.address]);
          }
     }

     async generateNewWalletFromSecretNumbers(): Promise<void> {
          const result = await this.walletConfiguratorOrchestrator.executeWalletFlow({
               perfLabel: 'generateNewWalletFromSecretNumbers',
               loadingKey: 'generateNewWalletFromSecretNumbers',
               walletType: 'secretNumbers',
               mode: 'generate',
               successMessage: addr => `Generated ${addr} wallet from secret numbers successfully!`,
          });
          if (result.success && result.wallet) {
               await this.refreshWallets(await this.xrplService.getClient(), [result.wallet.address]);
          }
     }

     async deriveWalletFromSecretNumbers(): Promise<void> {
          const result = await this.walletConfiguratorOrchestrator.executeWalletFlow({
               perfLabel: 'deriveWalletFromSecretNumbers',
               loadingKey: 'deriveWalletFromSecretNumbers',
               walletType: 'secretNumbers',
               mode: 'import',
               input: () => this.walletsStoreService.secretNumbers(),
               validate: () => {
                    const converted = this.walletsUtilService.convertSecretNumberStringToArray(this.walletsStoreService.secretNumbers());
                    return this.walletsUtilService.isValidSecret(converted) ? null : 'Invalid Secret Number.';
               },
               successMessage: addr => `Successfully added ${addr}`,
          });
          if (result.success && result.wallet) {
               await this.refreshWallets(await this.xrplService.getClient(), [result.wallet.address]);
          }
     }

     removeCustomWallet(): void {
          const address = this.walletsStoreService.selectedAddress();

          if (!address) {
               this.toastService.error('Please select a custom wallet first', AppConstants.TOAST.ERROR);
               return;
          }

          if (!xrpl.isValidAddress(address)) {
               this.toastService.error('Invalid address selected', AppConstants.TOAST.ERROR);
               return;
          }

          const result = this.walletConfiguratorOrchestrator.removeCustomWallet(address);

          if (!result.success) {
               this.toastService.error(result.error ?? 'Selected wallet not found in custom list', AppConstants.TOAST.ERROR);
               return;
          }

          this.updateDestinations();
          this.walletsStoreService.setField('selectedAddress', '');
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          return;
     }

     protected async refreshAccountObject(_env: any): Promise<void> {
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
