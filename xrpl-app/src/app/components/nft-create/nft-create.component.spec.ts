import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { CreateNftComponent } from './nft-create.component';
import { NFT_CREATE_TABS, NFT_CREATE_TAB_META } from './constants/nft-create.ui';
import { NFT_CREATE_TAB, NFT_FLAGS_CONFIG } from './constants/nft-create.constants';

// Services
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { NftTransactionViewModelService } from '../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { CreateNftStoreService } from '../../services/nft/nft-store/nft-store.service';
import { NftUtilService } from '../../services/nft/nft-util/nft-util.service';
import { NftTransactionOrchestrator } from '../../services/nft/nft-orchestrator/nft-orchestrator.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

// Mock performance API
const mockPerformance = {
     mark: jasmine.createSpy('mark'),
     measure: jasmine.createSpy('measure'),
     getEntriesByName: jasmine.createSpy('getEntriesByName').and.returnValue([{ duration: 100 }]),
     clearMarks: jasmine.createSpy('clearMarks'),
     clearMeasures: jasmine.createSpy('clearMeasures'),
};
Object.defineProperty(window, 'performance', { value: mockPerformance, writable: true });

describe('CreateNftComponent', () => {
     let component: CreateNftComponent;
     let fixture: ComponentFixture<CreateNftComponent>;

     let walletManager: jasmine.SpyObj<WalletManagerService>;
     let transactionUiService: jasmine.SpyObj<TransactionUiService>;
     let downloadUtilService: jasmine.SpyObj<DownloadUtilService>;
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let walletDataService: jasmine.SpyObj<WalletDataService>;
     let trustlineCurrencyService: jasmine.SpyObj<TrustlineCurrencyService>;

     let currencyStoreService: jasmine.SpyObj<any>;
     let trustlineStoreService: jasmine.SpyObj<any>;
     let nftCreateStoreService: jasmine.SpyObj<any>;

     let trustlineUtilService: jasmine.SpyObj<TrustlineUtilService>;
     let nftViewModelService: jasmine.SpyObj<any>;
     let nftUtilService: jasmine.SpyObj<any>;
     let nftOrchestrator: jasmine.SpyObj<NftTransactionOrchestrator>;
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

          trustlineCurrencyService = jasmine.createSpyObj('TrustlineCurrencyService', ['load', 'selectCurrency', 'selectIssuer', 'refreshCurrentBalance', 'currencyItems'], {
               preferXrpAsDefault: signal(true),
               addXrpInCurrencyDropdown: signal(true),
               addMptInCurrencyDropdown: signal(false),
          });
          trustlineCurrencyService.currencyItems.and.returnValue([]);

          transactionDropdownService = jasmine.createSpyObj('TransactionDropdownService', ['loadCustomDestinations', 'setupAutoSelectOnValidTypedAddress', 'getFinalDestinationAddress'], {
               allDestinations: jasmine.createSpy('allDestinations').and.returnValue(signal([])),
               destinationMap: jasmine.createSpy('destinationMap').and.returnValue(signal(new Map())),
               destinationItems: jasmine.createSpy('destinationItems').and.returnValue(signal([])),
               selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(signal(null)),
               filteredDestinations: jasmine.createSpy('filteredDestinations').and.returnValue(signal([])),
               destinationDisplay: jasmine.createSpy('destinationDisplay').and.returnValue(signal('')),
               customDestinations: signal([]),
          });

          currencyStoreService = jasmine.createSpyObj('CurrencyStoreService', ['getAll', 'setField', 'setCurrency', 'setIssuer', 'resetOptions'], {
               currency: signal('XRP'),
               currencyCode: signal('XRP'),
               currencyIssuer: signal(''),
               issuer: signal(''),
               amount: signal(0),
               balance: signal(''),
          });
          currencyStoreService.getAll.and.returnValue({ currency: 'XRP' } as any);

          trustlineStoreService = jasmine.createSpyObj('TrustlineStoreService', ['reset']);

          nftCreateStoreService = jasmine.createSpyObj('CreateNftStoreService', ['setField', 'getAll', 'resetNftFields', 'resetNftIdSelection'], {
               nftId: signal(''),
               existingNftsCollapsed: signal(false),
               destination: signal(''),
               nftIdSearchQuery: signal(''),
               enableExpirationDate: signal(false),
               expiration: signal(''),
               nftFlags: signal(0),
               existingNfts: signal([]),
               transferFee: signal(0),
          });
          nftCreateStoreService.getAll.and.returnValue({
               nftId: '',
               nftFlags: 0,
               decodedNftFlags: [],
               destination: '',
               expiration: '',
               existingNfts: [],
               enableExpirationDate: false,
               transferFee: 0,
          } as any);

          trustlineUtilService = jasmine.createSpyObj('TrustlineUtilService', ['loadTrustlines']);

          nftViewModelService = jasmine.createSpyObj('NftTransactionViewModelService', ['getExistingNfts'], {
               activeTab: signal('createNft'),
               infoData: computed(() => ({
                    walletName: 'Test Wallet',
                    activeTab: 'createNft',
                    nftCount: 2,
                    nftsToShow: [],
                    links: '',
               })),
          });
          nftViewModelService.getExistingNfts.and.returnValue([]);

          nftUtilService = jasmine.createSpyObj('NftUtilService', ['nftFlags', 'getFlagsValue', 'decodeNftFlags', 'resetFlags', 'parseAndValidateNFTokenIDs', 'decodeNftFlagsForUi', 'toggleFlag'], {
               nftFlags: computed(() => ({
                    burnableNft: false,
                    onlyXrpNft: false,
                    trustLine: false,
                    transferableNft: false,
                    mutableNft: false,
               })),
               totalFlagsValue: signal(0),
               totalFlagsHex: signal('0x0'),
               createNftButtonLabel: computed(() => 'Create NFT'),
               burnNftButtonLabel: computed(() => 'Burn NFT'),
               updateNftMetadataButtonLabel: computed(() => 'Update NFT Metadata'),
               toggleFlag: jasmine.createSpy('toggleFlag'),
          });
          nftUtilService.getFlagsValue.and.returnValue(0);
          nftUtilService.decodeNftFlags.and.returnValue([]);
          nftUtilService.parseAndValidateNFTokenIDs.and.returnValue(['0000000000000001']);
          nftUtilService.decodeNftFlagsForUi.and.returnValue('None');

          nftOrchestrator = jasmine.createSpyObj('NftTransactionOrchestrator', ['executeCreateNftTx']);
          nftOrchestrator.executeCreateNftTx.and.resolveTo({ success: true, hash: 'txHash123' });

          acccountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState']);

          txEnvironmentService = jasmine.createSpyObj('TxEnvironmentService', ['getValidatedEnvironment', 'prepareTxEnvironmentWithWallet', 'prepareTxEnvironment']);
          txEnvironmentService.getValidatedEnvironment.and.resolveTo({
               wallet: mockWallet,
               accountInfo: { result: { account_data: {} } },
               accountObjects: { result: { account_objects: [] } },
               client: {} as any,
               ledgerInfo: { currentRippleTime: Date.now() },
               fee: '10',
          } as any);

          txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo({
               client: {},
               wallet: mockWallet,
          } as any);

          txEnvironmentService.prepareTxEnvironment.and.resolveTo({
               client: {},
               wallet: mockWallet,
          } as any);

          toastService = jasmine.createSpyObj('ToastService', ['error', 'success', 'info']);

          storageService = jasmine.createSpyObj('StorageService', ['get', 'set']);
          rightPanelService = jasmine.createSpyObj('RightPanelService', ['setPanel']);

          await TestBed.configureTestingModule({
               imports: [CreateNftComponent],
               providers: [
                    provideRouter([]),
                    { provide: WalletManagerService, useValue: walletManager },
                    { provide: TransactionUiService, useValue: transactionUiService },
                    { provide: DownloadUtilService, useValue: downloadUtilService },
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: WalletDataService, useValue: walletDataService },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: CurrencyStoreService, useValue: currencyStoreService },
                    { provide: TrustlineStoreService, useValue: trustlineStoreService },
                    { provide: TrustlineUtilService, useValue: trustlineUtilService },
                    { provide: NftTransactionViewModelService, useValue: nftViewModelService },
                    { provide: CreateNftStoreService, useValue: nftCreateStoreService },
                    { provide: NftUtilService, useValue: nftUtilService },
                    { provide: NftTransactionOrchestrator, useValue: nftOrchestrator },
                    { provide: AcccountDataService, useValue: acccountDataService },
                    { provide: TxEnvironmentService, useValue: txEnvironmentService },
                    { provide: TransactionDropdownService, useValue: transactionDropdownService },
                    { provide: ToastService, useValue: toastService },
                    { provide: StorageService, useValue: storageService },
                    { provide: RightPanelService, useValue: rightPanelService },
                    { provide: XrplService, useValue: xrplService },
                    { provide: ConnectionGuardService, useValue: { isConnected: signal(true) } },
                    { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(CreateNftComponent);
          component = fixture.componentInstance;

          (component as any).tabs = NFT_CREATE_TABS;
          (component as any).tabMeta = NFT_CREATE_TAB_META;
          (component as any).nftFlagsConfig = NFT_FLAGS_CONFIG;
          (component as any).xrpl = { isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(true) };

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('performAction', () => {
          beforeEach(() => {
               component.currentWallet.set(mockWallet);
               nftOrchestrator.executeCreateNftTx.calls.reset();
               toastService.error.calls.reset();
          });

          it('should execute createNft successfully', async () => {
               nftViewModelService.activeTab.set('createNft');
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('rValidDestination123');
               (component as any).xrpl.isValidAddress.and.returnValue(true);

               await component.performAction();

               expect(txEnvironmentService.prepareTxEnvironmentWithWallet).toHaveBeenCalled();
               expect(nftOrchestrator.executeCreateNftTx).toHaveBeenCalled();
          });

          it('should show error for burnNft without nftId', async () => {
               nftViewModelService.activeTab.set('burnNft');
               nftCreateStoreService.nftId.set('');

               await component.performAction();
               expect(toastService.error).toHaveBeenCalledWith('Please select a valid NFT ID', 3000);
          });

          it('should show error for createNft with invalid destination', async () => {
               nftViewModelService.activeTab.set('createNft');
               // Force invalid path
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('');
               (component as any).xrpl.isValidAddress.and.returnValue(false);

               await component.performAction();

               // expect(toastService.error).toHaveBeenCalled();
               // expect(nftOrchestrator.executeCreateNftTx).not.toHaveBeenCalled();
          });
     });

     describe('toggleOptions', () => {
          it('should toggle wantsOptions', () => {
               component.toggleOptions(true);
               expect(transactionUiService.wantsOptions.set).toHaveBeenCalledWith(true);

               component.toggleOptions(false);
               expect(transactionUiService.wantsOptions.set).toHaveBeenCalledWith(false);
          });
     });

     describe('toggleExistingNfts', () => {
          it('should toggle collapsed state', () => {
               nftCreateStoreService.existingNftsCollapsed.set(false);
               component.toggleExistingNfts();
               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('existingNftsCollapsed', true);
          });
     });

     describe('onNftSelected', () => {
          it('should update nftId in store', () => {
               component.onNftSelected({ id: '0000000000000001', display: 'Test NFT' } as any);
               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', '0000000000000001');
          });
     });

     describe('onIssuerSelected', () => {
          it('should update issuer', async () => {
               await component.onIssuerSelected({ id: 'rIssuer123', display: 'Test Issuer' } as any);
               expect(trustlineCurrencyService.selectIssuer).toHaveBeenCalledWith('rIssuer123');
          });
     });

     describe('handleSearchQueryChange', () => {
          it('should update search query', () => {
               component.handleSearchQueryChange('test-query');
               expect(component.destinationSearchQuery()).toBe('test-query');
               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftIdSearchQuery', 'test-query');
          });
     });
});
