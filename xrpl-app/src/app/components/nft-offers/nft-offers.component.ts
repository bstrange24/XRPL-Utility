import { OnInit, Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { AppConstants, TabConfig, TabMetaInfo } from '../../core/app.constants';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { SelectItem } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { ActivatedRoute } from '@angular/router';
import { AccountConfiguratorStoreService } from '../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { TabMenuWithInfoComponent } from '../shared/ui-components/tab-with-menu/tab-with-info/tab-with-info.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { NftOffersTransactionViewModelService } from '../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { NFT_OFFERS_TAB_META, NFT_OFFERS_TABS } from './constants/nft-offers.ui';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { NFT_OFFERS_TAB } from './constants/nft-offers.constants';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { NftUtilService } from '../../services/nft/nft-util/nft-util.service';
import { CreateNftStoreService } from '../../services/nft/nft-store/nft-store.service';
import { NftOfferActionTypes, NftOfferTxConfig } from './constants/nft-offers.types';
import { NftOffersRequirementsInfoComponent } from './ui-components/nft-offers-requirements-info/nft-offers-requirements-info.component';
import { NftOffersSummaryComponent } from './ui-components/nft-offers-summary/nft-offers-summary.component';
import { NftSellOffersComponent } from './tab/nft-sell-offers/nft-sell-offers.component';
import { NftBuyComponent } from './tab/nft-buy/nft-buy.component';
import { NftBuyOffersComponent } from './tab/nft-buy-offers/nft-buy-offers.component';
import { NftCancelOffersComponent } from './tab/nft-cancel-offers/nft-cancel-offers.component';
import { NftSellComponent } from './tab/nft-sell/nft-sell.component';
import { NftOffersOrchestratorService } from '../../services/nft/nft-offers-orchestrator/nft-offers-orchestrator.service';

@Component({
     selector: 'app-nft-offers',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionOptionsComponent, ExecutionTimeDisplayComponent, TabMenuWithInfoComponent, WarningMessageComponent, TabMenuWithInfoComponent, TransactionPreviewComponent, WarningMessageComponent, NftOffersRequirementsInfoComponent, NftOffersSummaryComponent, NftSellComponent, NftSellOffersComponent, NftBuyComponent, NftBuyOffersComponent, NftCancelOffersComponent],
     templateUrl: './nft-offers.component.html',
     styleUrl: './nft-offers.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftOffersComponent extends WalletDestinationBase implements OnInit {
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly nftOffersTransactionViewModelService = inject(NftOffersTransactionViewModelService);
     public readonly accountConfiguratorStore = inject(AccountConfiguratorStoreService);
     public readonly nftOffersOrchestratorService = inject(NftOffersOrchestratorService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftUtilService = inject(NftUtilService);

     readonly menuTabs: TabConfig[] = NFT_OFFERS_TABS;
     readonly tabMeta: Record<string, TabMetaInfo> = NFT_OFFERS_TAB_META;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, NFT_OFFERS_TAB, tab => this.setTab(tab));
          this.trustlineCurrencyService.load();
          this.trustlineCurrencyService.preferXrpAsDefault.set(true);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(true);
          this.trustlineCurrencyService.addMptInCurrencyDropdown.set(false);
          this.transactionDropdownService.loadCustomDestinations();
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.trustlineCurrencyService.refreshCurrentBalance();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getNFTOffers(true);
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

     selectedOfferItem = computed(() => {
          const id = this.nftCreateStoreService.nftIndex();
          if (!id) return null;
          return this.nftOffersTransactionViewModelService.offerItems().find(i => i.id === id) || null;
     });

     onOfferSelected(item: any | null) {
          if (item) {
               this.nftCreateStoreService.setField('nftId', item?.nftId || '');
               this.nftCreateStoreService.setField('nftOfferId', item?.index || '');
          }
     }

     onNftSelected(item: any | null) {
          if (item) {
               this.nftCreateStoreService.setField('nftId', item?.nftId || '');
               this.nftCreateStoreService.setField('nftOfferId', item?.index || '');
          }
     }

     onSelectNftOfferIndex(nftOfferIndex: string | null) {
          this.nftCreateStoreService.setField('selectedNftOfferIndex', nftOfferIndex ?? '');
          this.nftCreateStoreService.setField('nftIndex', nftOfferIndex ?? '');
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');

          this.trustlineCurrencyService.refreshCurrentBalance();
          this.populateDefaultDateTime();
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByOfferIndex(_index: number, offer: any): string {
          return offer.OfferIndex;
     }

     toggleExistingNfts() {
          this.nftCreateStoreService.setField('existingNftsCollapsed', !this.nftCreateStoreService.existingNftsCollapsed());
     }

     toggleExistingSellOffers() {
          this.nftCreateStoreService.setField('existingSellOffersCollapsed', !this.nftCreateStoreService.existingSellOffersCollapsed());
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
          this.getNFTOffers(true);
     }

     async setTab(tab: string): Promise<void> {
          if (NFT_OFFERS_TAB.includes(tab as any)) {
               this.nftOffersTransactionViewModelService.activeTab.set(tab as NftOfferActionTypes);
               this.clearInputFields();

               if (this.hasWallets()) await this.getNFTOffers(false);
          }
     }

     async getNFTOffers(forceRefresh = false): Promise<void> {
          await this.measure('getNFTOffers', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.trustlineStoreService.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);

                    const { ledgerInfo } = await this.nftUtilService.getNftOfferDetails(env.client, env.wallet, {
                         accountInfo: env.accountInfo,
                         accountObjects: env.accountObjects,
                    });

                    this.nftUtilService.getExistingSellOffers(env.accountObjects, ledgerInfo);
                    this.nftUtilService.getExistingBuyOffers(env.accountObjects, ledgerInfo);
                    this.nftUtilService.getExistingNfts(env.accountObjects, this.currentWallet().address);

                    const currencyValue = this.currencyStoreService.currency() ?? 'XRP';
                    if (currencyValue !== 'XRP' && currencyValue !== 'MPT' && this.currencyStoreService.issuer()) {
                         await this.trustlineUtilService.loadTrustlines(forceRefresh);
                         this.trustlineCurrencyService.selectCurrency(currencyValue);
                    }
               } catch (error: any) {
                    console.error('Error in getNFT:', error);
                    this.toastService.error(error.message || 'Failed to load checks', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.nftOffersTransactionViewModelService.activeTab();
          const wallet = this.currentWallet();

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeNftSellOffers: currentTab === 'buyNft' || currentTab === 'buyNftOffer',
                    includeNftBuyOffers: currentTab === 'sellNft' || currentTab === 'sellNftOffer',
               });
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          if (!env) throw new Error('Unable to get environment.');
          console.log('Prepared environment:', env);

          if (currentTab === 'buyNft') {
               const sellOffer = env.nftSellOffersObject.result?.offers || [];
               if (!Array.isArray(sellOffer) || sellOffer.length === 0) {
                    this.txUiService.setError(`No sell offers found for this NFT ${this.nftCreateStoreService.nftId()}`);
                    return;
               }

               const validOffers = this.nftUtilService.filterOffers(sellOffer, wallet);
               if (validOffers.length === 0) {
                    this.txUiService.setError('No matching sell offers found for this wallet.');
                    return;
               }

               const matchingOffers = sellOffer.filter(o => o.amount && o.flags === 1); // 1 = tfSellNFToken
               console.log('Matching Offers:', matchingOffers);

               const selectedOffer = validOffers[0];
               console.log('First sell offer:', validOffers[0]);

               if (selectedOffer && selectedOffer.Destination) {
                    this.txUiService.setError(`This NFT is only purchasable by: ${selectedOffer.Destination}`);
                    return;
               }

               if (selectedOffer && selectedOffer.owner === wallet.classicAddress) {
                    this.txUiService.setError('You already own this NFT.');
                    return;
               }
          }

          if (currentTab === 'buyNftOffer') {
               if (!env.nftBuyOffersObject || env.nftBuyOffersObject.result?.offers?.length <= 0) {
                    return this.txUiService.setError(`No NFT offers for ${this.nftCreateStoreService.nftId()} were found for this account.`);
               }
               this.nftCreateStoreService.setField('nftOwnerAddress', env.nftBuyOffersObject.result.offers[0].owner);
          }

          const nftState = this.nftCreateStoreService.getAll();
          const currencyState = this.currencyStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();

          const config: NftOfferTxConfig = {
               nft: nftState,
               account: accountState,
               currency: currencyState,
               txOptions: txOptionsState,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'buyNft':
                              txResult = await this.nftOffersOrchestratorService.executeNftOfferTx('buyNft', config);
                              break;
                         case 'sellNft':
                              txResult = await this.nftOffersOrchestratorService.executeNftOfferTx('sellNft', config);
                              break;
                         case 'buyNftOffer':
                              txResult = await this.nftOffersOrchestratorService.executeNftOfferTx('buyNftOffer', config);
                              break;
                         case 'sellNftOffer':
                              txResult = await this.nftOffersOrchestratorService.executeNftOfferTx('sellNftOffer', config);
                              break;
                         case 'cancelNftOffer':
                              txResult = await this.nftOffersOrchestratorService.executeNftOfferTx('cancelNftOffer', config);
                              break;
                    }
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) throw new Error('Unable error when submitting transaction.');

          await this.handleTxResult(txResult, env.client, env.wallet, nftState.nftCreator, this.nftCreateStoreService.destination(), '', { includeNftObjects: true });
          this.txUiService.resetCurrentStepToIdle();
     }

     decodeNftFlags(value: number): string {
          const active: string[] = [];
          for (const [name, bit] of Object.entries(AppConstants.NFT_FLAGS)) {
               if ((value & bit) !== 0) {
                    active.push(name);
               }
          }
          return active.join(', ');
     }

     decodeOfferFlags(value: number): string[] {
          const active: string[] = [];

          for (const [name, bit] of Object.entries(AppConstants.NFT_FLAGS)) {
               if ((value & bit) !== 0) {
                    active.push(name);
               }
          }

          return active;
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          const { ledgerInfo, accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse } = await this.nftUtilService.getNftOfferDetails(env.client, env.wallet, {
               accountInfo: env.accountInfo,
               accountObjects: env.accountObjects,
          });
          this.nftUtilService.getExistingSellOffers(accountObjects, ledgerInfo);
          this.nftUtilService.getExistingBuyOffers(accountObjects, ledgerInfo);
          this.nftUtilService.getExistingNfts(accountObjects, env.wallet.classicAddress);
     }

     toggleOptions(enabled: boolean): void {
          this.txUiService.wantsOptions.set(enabled);
          if (!enabled) this.txUiService.clearOptionalInputFields();
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

     copyNFTokenID(NFTokenID: string) {
          navigator.clipboard.writeText(NFTokenID).then(() => {
               this.txUiService.showToastMessage('MPT Issuance ID copied!');
          });
     }

     protected clearInputFields(): void {
          this.destinationSearchQuery.set('');
          this.selectedDestinationAddress.set('');
          this.nftCreateStoreService.resetNftFields();
          this.currencyStoreService.resetOptions();
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
     }
}
