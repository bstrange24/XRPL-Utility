import { OnInit, Component, inject, ChangeDetectionStrategy } from '@angular/core';
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
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { ActivatedRoute } from '@angular/router';
import { NFT_CREATE_TAB_META, NFT_CREATE_TABS } from './constants/nft-create.ui';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { NftTransactionViewModelService } from '../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { NFT_CREATE_TAB, NFT_FLAGS_CONFIG } from './constants/nft-create.constants';
import { NftCreateActionTypes, NftCreateTxConfig } from './constants/nft-create.types';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { CreateNftStoreService } from '../../services/nft/nft-store/nft-store.service';
import { NftUtilService } from '../../services/nft/nft-util/nft-util.service';
import { NftCreateSummaryComponent } from './ui-components/nft-create-summary/nft-create-summary.component';
import { NftTransactionOrchestrator } from '../../services/nft/nft-orchestrator/nft-orchestrator.service';
import { NftCreateFieldsComponent } from './tab/nft-create-fields/nft-create-fields.component';
import { NftBurnComponent } from './tab/nft-burn/nft-burn.component';
import { NftModifyComponent } from './tab/nft-modify/nft-modify.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { NftRequirementsInfoComponent } from './ui-components/nft-requirements-info/nft-requirements-info.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { FlagSelectorComponent } from '../shared/flag-selector/flag-selector.component';

@Component({
     selector: 'app-nft-create',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, TransactionOptionsComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, TransactionPreviewComponent, NftCreateSummaryComponent, NftCreateFieldsComponent, NftModifyComponent, NftBurnComponent, WarningMessageComponent, FlagSelectorComponent],
     templateUrl: './nft-create.component.html',
     styleUrl: './nft-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateNftComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly nftCreateTransactionViewModelService = inject(NftTransactionViewModelService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly nftTransactionOrchestrator = inject(NftTransactionOrchestrator);
     private readonly rightPanelService = inject(RightPanelService);
     public readonly tabs = NFT_CREATE_TABS;
     public readonly tabMeta = NFT_CREATE_TAB_META;
     public readonly nftFlagsConfig = NFT_FLAGS_CONFIG;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, NFT_CREATE_TAB, tab => this.setTab(tab));
          this.trustlineCurrencyService.load();
          this.trustlineCurrencyService.preferXrpAsDefault.set(true);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(true);
          this.trustlineCurrencyService.addMptInCurrencyDropdown.set(false);
          this.transactionDropdownService.loadCustomDestinations();
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.trustlineCurrencyService.refreshCurrentBalance();

          this.rightPanelService.setPanel(NftRequirementsInfoComponent, {
               activeTab: this.nftCreateTransactionViewModelService.activeTab,
          });
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getNFT(false);
     }

     async onCurrencyChange(item: any) {
          const currency = item?.id ?? item ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          await this.syncAfterSelection();
     }

     async onIssuerChange(item: any) {
          const issuer = item?.id ?? item ?? 'XRP';
          this.trustlineCurrencyService.selectIssuer(issuer);
          await this.syncAfterSelection();
     }

     async onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          await this.trustlineUtilService.loadTrustlines(false);
          await this.trustlineCurrencyService.refreshCurrentBalance();
     }

     async onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);

          // Add this: If both currency and issuer are set, fetch env and update flags
          if (this.currencyStoreService.currency() && address) {
               await this.trustlineUtilService.loadTrustlines(false);
               await this.trustlineCurrencyService.refreshCurrentBalance();
          }
     }

     onNftSelected(item: SelectItem | null) {
          if (item) {
               this.nftCreateStoreService.setField('nftId', item?.id || '');
          }
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');

          this.trustlineCurrencyService.refreshCurrentBalance();
          this.populateDefaultDateTime();
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     toggleExistingNfts() {
          this.nftCreateStoreService.setField('existingNftsCollapsed', !this.nftCreateStoreService.existingNftsCollapsed());
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     get onlyXrpEnabled(): boolean {
          return this.nftUtilService.nftFlags().onlyXrpNft ?? false;
     }

     async setTab(tab: string): Promise<void> {
          if (!NFT_CREATE_TAB.includes(tab as any)) return;
          this.nftCreateTransactionViewModelService.activeTab.set(tab as NftCreateActionTypes);
          this.clearInputFields();
          this.nftUtilService.resetFlags();
          if (this.hasWallets()) await this.getNFT();
     }

     async getNFT(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);
          await this.measure('getNFT', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.trustlineStoreService.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getNFT:', error);
                    this.toastService.error(error.message || 'Failed to load NFTs', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.nftCreateTransactionViewModelService.activeTab();
          const wallet = this.currentWallet();

          if (currentTab === 'burnNft' || currentTab === 'updateNFTMetadata') {
               const nftId = this.nftCreateStoreService.nftId();
               if (!nftId) {
                    this.toastService.error('Please select a valid NFT ID', AppConstants.TOAST.ERROR);
                    return;
               }
          }

          let destinationAddress = '';
          if (currentTab === 'createNft') {
               this.nftCreateStoreService.setField('nftFlags', this.nftUtilService.getFlagsValue());
               this.nftCreateStoreService.setField('decodedNftFlags', this.nftUtilService.decodeNftFlags(this.nftUtilService.getFlagsValue()));
               destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
               if (!destinationAddress || !xrpl.isValidAddress(destinationAddress)) {
                    this.selectedDestinationAddress.set(destinationAddress);
                    this.nftCreateStoreService.setField('destination', destinationAddress);
               }
          }

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeTrustlines: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeDestinationAccountInfo: true,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (currentTab === 'burnNft') {
               const validNFTs = this.nftUtilService.parseAndValidateNFTokenIDs(this.nftCreateStoreService.nftId());
               if (!validNFTs) {
                    this.toastService.error('Please select a valid NFT ID', AppConstants.TOAST.ERROR);
                    return;
               }

               if (validNFTs.length > 1) {
                    this.toastService.error("Use Batch Mode to burn multiple NFT's at once.", AppConstants.TOAST.ERROR);
                    return;
               }
          }

          const nftState = this.nftCreateStoreService.getAll();
          const currency = this.currencyStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: NftCreateTxConfig = {
               nft: nftState,
               account: accountState,
               txOptions: txOptionsState,
               currency: currency,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'createNft':
                              txResult = await this.nftTransactionOrchestrator.executeCreateNftTx('createNft', config);
                              break;
                         case 'burnNft':
                              txResult = await this.nftTransactionOrchestrator.executeCreateNftTx('burnNft', config);
                              break;
                         case 'updateNFTMetadata':
                              txResult = await this.nftTransactionOrchestrator.executeCreateNftTx('updateNFTMetadata', config);
                              break;
                    }
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) {
               this.toastService.error('Unexpected error when submitting transaction.', AppConstants.TOAST.ERROR);
               return;
          }

          await this.handleTxResult(txResult, env.client, env.wallet, nftState.nftCreator, this.nftCreateStoreService.destination(), '', { includeNftObjects: true });
          this.txUiService.resetCurrentStepToIdle();
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          const accountNfts = await this.xrplService.getAccountNFTs(env.client, env.wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } }));
          this.nftCreateStoreService.setField('existingNfts', this.nftCreateTransactionViewModelService.getExistingNfts(accountNfts, this.currentWallet().address));
     }

     toggleOptions(enabled: boolean): void {
          this.txUiService.wantsOptions.set(enabled);
     }

     toggleExpiration(enabled: boolean): void {
          this.nftCreateStoreService.setField('enableExpirationDate', enabled);
          if (!enabled) {
               this.nftCreateStoreService.setField('expiration', '');
          }
     }

     private async syncAfterSelection(load = true) {
          if (load) await this.trustlineUtilService.loadTrustlines();
          await this.trustlineCurrencyService.refreshCurrentBalance();
     }

     public currencyItems() {
          return this.trustlineCurrencyService.currencyItems();
     }

     public selectedCurrencyItem() {
          const code = this.currencyStoreService.currency();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          this.nftCreateStoreService.setField('nftIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.nftCreateStoreService.setField('destination', addr);
     }

     populateDefaultDateTime() {
          this.nftCreateStoreService.setField('expiration', '');
     }

     protected clearInputFields() {
          this.clearFields();
     }

     clearFields() {
          this.nftCreateStoreService.resetNftFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }
}
