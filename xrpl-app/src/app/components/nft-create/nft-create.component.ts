import { OnInit, Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { ToastService } from '../../services/utils/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { ActivatedRoute } from '@angular/router';
import { NFT_CREATE_TAB_META, NFT_CREATE_TABS } from './constants/nft-create.ui';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info.component';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time.component';
import { NftTransactionViewModelService } from '../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { NFT_CREATE_TAB } from './constants/nft-create.constants';
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
import { NftFlagsComponent } from './tab/nft-flags/nft-flags.component';
import { NftRequirementsInfoComponent } from './ui-components/nft-requirements-info/nft-requirements-info.component';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';

@Component({
     selector: 'app-nft-create',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionOptionsComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, TransactionPreviewComponent, NftCreateSummaryComponent, NftRequirementsInfoComponent, NftCreateFieldsComponent, NftModifyComponent, NftBurnComponent, WarningMessageComponent, NftFlagsComponent],
     templateUrl: './nft-create.component.html',
     styleUrl: './nft-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateNftComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly nftCreateTransactionViewModelService = inject(NftTransactionViewModelService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly nftTransactionOrchestrator = inject(NftTransactionOrchestrator);

     readonly menuTabs: TabConfig[] = NFT_CREATE_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = NFT_CREATE_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, NFT_CREATE_TAB, tab => this.setTab(tab));
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getNFT(false);
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

     async setTab(tab: string): Promise<void> {
          if (NFT_CREATE_TAB.includes(tab as any)) {
               this.nftCreateTransactionViewModelService.activeTab.set(tab as NftCreateActionTypes);
               this.clearInputFields();
               this.nftUtilService.resetFlags();

               if (this.hasWallets()) await this.getNFT();
          }
     }

     async getNFT(forceRefresh = false): Promise<void> {
          await this.measure('getNFT', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in getNFT:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
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
               this.nftCreateStoreService.setField('nftFlags', this.nftUtilService.getFlagsValue(this.nftUtilService.nftFlags));
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
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeDestinationAccountInfo: true,
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (!env) throw new Error('Unable to get environment.');

          if (currentTab === 'burnNft') {
               const validNFTs = this.utilsService.parseAndValidateNFTokenIDs(this.nftCreateStoreService.nftId());
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
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: NftCreateTxConfig = {
               nft: nftState,
               account: accountState,
               txOptions: txOptionsState,
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

          if (!txResult) throw new Error('Unexpected error when submitting transaction.');

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
