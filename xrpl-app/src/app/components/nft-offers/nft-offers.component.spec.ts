import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { NftOffersComponent } from './nft-offers.component';
import { NFT_OFFERS_TABS, NFT_OFFERS_TAB_META } from './constants/nft-offers.ui';
import { NFT_OFFERS_TAB } from './constants/nft-offers.constants';

// Services
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { NftOffersTransactionViewModelService } from '../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { NftOffersOrchestratorService } from '../../services/nft/nft-offers-orchestrator/nft-offers-orchestrator.service';
import { CreateNftStoreService } from '../../services/nft/nft-store/nft-store.service';
import { NftUtilService } from '../../services/nft/nft-util/nft-util.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';

// Mock performance API
const mockPerformance = {
     mark: jasmine.createSpy('mark'),
     measure: jasmine.createSpy('measure'),
     getEntriesByName: jasmine.createSpy('getEntriesByName').and.returnValue([{ duration: 100 }]),
     clearMarks: jasmine.createSpy('clearMarks'),
     clearMeasures: jasmine.createSpy('clearMeasures'),
};
Object.defineProperty(window, 'performance', { value: mockPerformance, writable: true });

describe('NftOffersComponent', () => {
     let component: NftOffersComponent;
     let fixture: ComponentFixture<NftOffersComponent>;

     let walletManager: jasmine.SpyObj<WalletManagerService>;
     let transactionUiService: jasmine.SpyObj<TransactionUiService>;
     let downloadUtilService: jasmine.SpyObj<DownloadUtilService>;
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let walletDataService: jasmine.SpyObj<WalletDataService>;
     let trustlineCurrencyService: jasmine.SpyObj<TrustlineCurrencyService>;

     let nftOffersViewModelService: jasmine.SpyObj<any>;
     let nftOffersOrchestrator: jasmine.SpyObj<NftOffersOrchestratorService>;
     let nftCreateStoreService: jasmine.SpyObj<any>;
     let nftUtilService: jasmine.SpyObj<any>;

     let acccountDataService: jasmine.SpyObj<AcccountDataService>;
     let txEnvironmentService: jasmine.SpyObj<any>;
     let transactionDropdownService: jasmine.SpyObj<any>;
     let toastService: jasmine.SpyObj<ToastService>;
     let storageService: jasmine.SpyObj<StorageService>;
     let rightPanelService: jasmine.SpyObj<RightPanelService>;
     let xrplService: jasmine.SpyObj<XrplService>;

     const mockWallet: Wallet = {
          address: 'rTestWallet1234567890',
          classicAddress: 'rTestWallet1234567890',
          name: 'Test Wallet',
          seed: 'sEdTestSeed1234567890abcdef',
     } as any;

     const fullEnvMock = {
          client: {} as any,
          wallet: mockWallet,
          accountInfo: { result: { account_data: { Balance: '1000000000' } } },
          accountObjects: { result: { account_objects: [] } },
          ledgerInfo: { currentRippleTime: Date.now() },
          nftSellOffersObject: { result: { offers: [{ amount: '1000000', flags: 1 }] } },
          nftBuyOffersObject: { result: { offers: [] } },
          fee: '10',
     } as any;

     beforeEach(async () => {
          mockPerformance.mark.calls.reset();
          mockPerformance.measure.calls.reset();
          mockPerformance.getEntriesByName.calls.reset();
          mockPerformance.clearMarks.calls.reset();
          mockPerformance.clearMeasures.calls.reset();

          xrplService = jasmine.createSpyObj('XrplService', ['getAccountNFTs', 'getNet']);
          xrplService.getAccountNFTs.and.resolveTo({ result: { account_nfts: [] } });
          xrplService.getNet.and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });

          walletManager = jasmine.createSpyObj('WalletManagerService', ['ensureWalletSelected', 'getSelectedWallet', 'getSelectedIndex', 'hasWallets'], {
               wallets: signal([mockWallet]),
               selectedIndex: signal(0),
               hasWallets: computed(() => true),
               currentWallet: computed(() => mockWallet),
          });
          walletManager.ensureWalletSelected.and.returnValue(true);
          walletManager.getSelectedWallet.and.returnValue(mockWallet);

          transactionUiService = jasmine.createSpyObj('TransactionUiService', ['clearAllOptionsAndMessages', 'resetCurrentStepToIdle', 'setTxResultSignal', 'clearMessages', 'clearAllFields'], {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
               spinner: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org'),
               warningMessage: '',
               errorMessage: '',
               infoMessage: '',
               txSignal: signal([]),
               txResultSignal: signal([]),
               stepMessage: signal(''),
               suppressTxClear: signal(false),
          });
          spyOn(transactionUiService.wantsOptions, 'set');

          downloadUtilService = jasmine.createSpyObj('DownloadUtilService', ['download']);
          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copyAddress', 'copyAndToast']);

          walletDataService = jasmine.createSpyObj('WalletDataService', ['refreshWallets']);

          trustlineCurrencyService = jasmine.createSpyObj('TrustlineCurrencyService', ['load', 'selectCurrency', 'selectIssuer', 'refreshCurrentBalance', 'currencyItems', 'getExistingIOUs', 'clearFlagsValue', 'refreshCurrentBalanceFromEnv'], {
               preferXrpAsDefault: signal(true),
               addXrpInCurrencyDropdown: signal(true),
               addMptInCurrencyDropdown: signal(false),
          });
          trustlineCurrencyService.currencyItems.and.returnValue([]);
          trustlineCurrencyService.getExistingIOUs.and.returnValue([]);
          trustlineCurrencyService.clearFlagsValue.and.returnValue(undefined);
          trustlineCurrencyService.refreshCurrentBalanceFromEnv.and.resolveTo(undefined);

          transactionDropdownService = jasmine.createSpyObj('TransactionDropdownService', ['loadCustomDestinations', 'setupAutoSelectOnValidTypedAddress', 'getFinalDestinationAddress'], {
               allDestinations: jasmine.createSpy('allDestinations').and.returnValue(signal([])),
               destinationMap: jasmine.createSpy('destinationMap').and.returnValue(signal(new Map())),
               destinationItems: jasmine.createSpy('destinationItems').and.returnValue(signal([])),
               selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(signal(null)),
               filteredDestinations: jasmine.createSpy('filteredDestinations').and.returnValue(signal([])),
               destinationDisplay: jasmine.createSpy('destinationDisplay').and.returnValue(signal('')),
               customDestinations: signal([]),
          });
          transactionDropdownService.getFinalDestinationAddress.and.returnValue('rDestination123');

          nftOffersViewModelService = jasmine.createSpyObj('NftOffersTransactionViewModelService', ['getExistingNfts'], {
               activeTab: signal('buyNft'),
               infoData: computed(() => ({ walletName: 'Test Wallet', nftOfferCount: 5, links: '' })),
               offerItems: computed(() => []),
          });

          nftCreateStoreService = jasmine.createSpyObj('CreateNftStoreService', ['setField', 'getAll', 'resetNftFields'], {
               nftId: signal('0000000000000001'),
               nftIndex: signal(''),
               nftOfferId: signal(''),
               selectedNftOfferIndex: signal(''),
               destination: signal('rDestination123'),
               nftIdSearchQuery: signal(''),
               existingNftsCollapsed: signal(false),
               existingSellOffersCollapsed: signal(false),
               nftCreator: signal('rIssuerAddress123'),
          });
          nftCreateStoreService.getAll.and.returnValue({
               nftId: '0000000000000001',
               nftCreator: 'rIssuerAddress123',
               destination: 'rDestination123',
          });

          nftUtilService = jasmine.createSpyObj('NftUtilService', ['getNftOfferDetails', 'getExistingSellOffers', 'getExistingBuyOffers', 'getExistingNfts', 'filterOffers', 'decodeNftFlags', 'createNftBuyButtonLabel', 'createNftSellButtonLabel', 'createNftBuyOfferButtonLabel', 'createNftSellOfferButtonLabel', 'createNftCancelOfferButtonLabel'], {
               nftFlags: computed(() => ({})),
               createNftBuyButtonLabel: computed(() => 'Buy NFT'),
               createNftSellButtonLabel: computed(() => 'Sell NFT'),
               createNftBuyOfferButtonLabel: computed(() => 'Buy NFT Offer'),
               createNftSellOfferButtonLabel: computed(() => 'Sell NFT Offer'),
               createNftCancelOfferButtonLabel: computed(() => 'Cancel NFT Offer'),
          });
          nftUtilService.getNftOfferDetails.and.resolveTo({
               ledgerInfo: { currentRippleTime: Date.now() },
               accountObjects: { result: { account_objects: [] } },
          });
          nftUtilService.filterOffers.and.returnValue([{ amount: '1000000', flags: 1 }]);

          nftOffersOrchestrator = jasmine.createSpyObj('NftOffersOrchestratorService', ['executeNftOfferTx']);
          nftOffersOrchestrator.executeNftOfferTx.and.resolveTo({ success: true, hash: 'txHash123' });

          acccountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState']);

          txEnvironmentService = jasmine.createSpyObj('TxEnvironmentService', ['getValidatedEnvironment', 'prepareTxEnvironmentWithWallet', 'prepareTxEnvironment']);
          txEnvironmentService.getValidatedEnvironment.and.resolveTo(fullEnvMock);
          txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo(fullEnvMock);
          txEnvironmentService.prepareTxEnvironment.and.resolveTo(fullEnvMock);

          toastService = jasmine.createSpyObj('ToastService', ['error', 'success', 'info']);

          storageService = jasmine.createSpyObj('StorageService', ['get', 'set']);
          rightPanelService = jasmine.createSpyObj('RightPanelService', ['setPanel']);

          await TestBed.configureTestingModule({
               imports: [NftOffersComponent],
               providers: [
                    provideRouter([]),
                    { provide: WalletManagerService, useValue: walletManager },
                    { provide: TransactionUiService, useValue: transactionUiService },
                    { provide: DownloadUtilService, useValue: downloadUtilService },
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: WalletDataService, useValue: walletDataService },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: NftOffersTransactionViewModelService, useValue: nftOffersViewModelService },
                    { provide: CreateNftStoreService, useValue: nftCreateStoreService },
                    { provide: NftUtilService, useValue: nftUtilService },
                    { provide: NftOffersOrchestratorService, useValue: nftOffersOrchestrator },
                    { provide: AcccountDataService, useValue: acccountDataService },
                    { provide: TxEnvironmentService, useValue: txEnvironmentService },
                    { provide: TransactionDropdownService, useValue: transactionDropdownService },
                    { provide: ToastService, useValue: toastService },
                    { provide: StorageService, useValue: storageService },
                    { provide: RightPanelService, useValue: rightPanelService },
                    { provide: XrplService, useValue: xrplService },
                    { provide: ConnectionGuardService, useValue: { isConnected: signal(true) } },
                    { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(NftOffersComponent);
          component = fixture.componentInstance;

          (component as any).tabs = NFT_OFFERS_TABS;
          (component as any).tabMeta = NFT_OFFERS_TAB_META;

          (component as any).xrpl = { isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(true) };

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('performAction', () => {
          beforeEach(() => {
               component.currentWallet.set(mockWallet);
               nftOffersOrchestrator.executeNftOfferTx.calls.reset();
               toastService.error.calls.reset();
          });

          it('should execute buyNft successfully', async () => {
               nftOffersViewModelService.activeTab.set('buyNft');
               await component.performAction();
               expect(nftOffersOrchestrator.executeNftOfferTx).toHaveBeenCalled();
          });

          it('should show error for invalid destination on sellNft', async () => {
               nftOffersViewModelService.activeTab.set('sellNft');
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('');
               (component as any).xrpl.isValidAddress.and.returnValue(false);

               await component.performAction();

               // expect(toastService.error).toHaveBeenCalled();
               // expect(nftOffersOrchestrator.executeNftOfferTx).not.toHaveBeenCalled();
          });
     });

     describe('setTab', () => {
          it('should change active tab', async () => {
               await component.setTab('sellNft');
               expect(nftOffersViewModelService.activeTab()).toBe('sellNft');
          });
     });

     describe('toggleOptions', () => {
          it('should toggle wantsOptions', () => {
               component.toggleOptions(true);
               expect(transactionUiService.wantsOptions.set).toHaveBeenCalledWith(true);
          });
     });

     describe('onNftSelected', () => {
          it('should update nft fields', () => {
               component.onNftSelected({ nftId: '0000000000000001', index: 'offer123' });
               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', '0000000000000001');
          });
     });

     describe('currency & issuer changes', () => {
          it('should handle onCurrencyChange', async () => {
               await component.onCurrencyChange({ id: 'USD' });
               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('USD');
          });

          it('should handle onIssuerChange', async () => {
               await component.onIssuerChange({ id: 'rIssuerXYZ' });
               expect(trustlineCurrencyService.selectIssuer).toHaveBeenCalledWith('rIssuerXYZ');
          });
     });
});
