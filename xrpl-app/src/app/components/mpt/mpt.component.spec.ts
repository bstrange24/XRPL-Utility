import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { MptComponent } from './mpt.component';
import { MPT_TABS, MPT_TAB_META } from './constants/mpt.ui';
import { MPT_TAB, MPT_FLAGS_CONFIG } from './constants/mpt.constants';

// Services
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { MptTransactionViewModelService } from '../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MptStoreService } from '../../services/mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { MptOrchestratorServiceService } from '../../services/mpt/mpt-orchestrator/mpt-orchestrator.service.service';
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

describe('MptComponent', () => {
     let component: MptComponent;
     let fixture: ComponentFixture<MptComponent>;

     let walletManager: jasmine.SpyObj<WalletManagerService>;
     let transactionUiService: jasmine.SpyObj<TransactionUiService>;
     let downloadUtilService: jasmine.SpyObj<DownloadUtilService>;
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let walletDataService: jasmine.SpyObj<WalletDataService>;
     let trustlineCurrencyService: jasmine.SpyObj<TrustlineCurrencyService>;

     let mptViewModelService: jasmine.SpyObj<any>;
     let mptStoreService: jasmine.SpyObj<any>;
     let mptUtilService: jasmine.SpyObj<any>;
     let mptOrchestrator: jasmine.SpyObj<MptOrchestratorServiceService>;

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

     const XLS89_TEMPLATE_MOCK = `{"t":"TBILL","n":"T-Bill Yield Token"}`;

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
          transactionDropdownService.getFinalDestinationAddress.and.returnValue('rDestination123');

          mptViewModelService = jasmine.createSpyObj('MptTransactionViewModelService', ['getExistingNfts'], {
               activeTab: signal('createMpt'),
               infoData: computed(() => ({
                    walletName: 'Test Wallet',
                    mptCount: 3,
                    mptsToShow: [],
                    links: '',
               })),
               mptItems: computed(() => []),
               metadataByteLength: computed(() => 0), // default small
               metadataIsValid: computed(() => true),
          });

          mptStoreService = jasmine.createSpyObj('MptStoreService', ['setField', 'getAll', 'resetMptFields'], {
               mptIssuanceId: signal(''),
               metaData: signal('{}'),
               authAction: signal('authorize'),
               lockAction: signal('lock'),
               outstandingMptsCollapsed: signal(false),
               existingMpts: signal([]),
               transferFee: signal(0),
               assetScale: signal(0),
               tokenCount: signal(1000),
               destination: signal(''),
               XLS89_TEMPLATE: jasmine.createSpy('XLS89_TEMPLATE').and.returnValue(XLS89_TEMPLATE_MOCK),
          });
          mptStoreService.getAll.and.returnValue({} as any);

          mptUtilService = jasmine.createSpyObj('MptUtilService', ['flags', 'getFlagsValue', 'decodeMptFlagsForUi', 'resetFlags', 'toggleFlag', 'createMptButtonLabel', 'authorizeButtonLabel', 'sendMptButtonLabel', 'lockMptButtonLabel', 'clawbackMptButtonLabel', 'destroyMptButtonLabel', 'hasNoOutstandingMpts', 'getMpts'], {
               flags: computed(() => ({
                    canLock: false,
                    isRequireAuth: false,
                    canEscrow: false,
                    canTrade: false,
                    canTransfer: false,
                    canClawback: false,
               })),
               totalFlagsValue: signal(0),
               totalFlagsHex: signal('0x0'),
               createMptButtonLabel: computed(() => 'Create MPT'),
               authorizeButtonLabel: computed(() => 'Authorize MPT'),
               sendMptButtonLabel: computed(() => 'Send MPT'),
               lockMptButtonLabel: computed(() => 'Lock MPT'),
               clawbackMptButtonLabel: computed(() => 'Clawback MPT'),
               destroyMptButtonLabel: computed(() => 'Destroy MPT'),
               hasNoOutstandingMpts: computed(() => true),
          });
          mptUtilService.getFlagsValue.and.returnValue(0);
          mptUtilService.decodeMptFlagsForUi.and.returnValue('None');
          mptUtilService.getMpts.and.returnValue([]);
          mptUtilService.toggleFlag.and.callFake(() => {});

          mptOrchestrator = jasmine.createSpyObj('MptOrchestratorServiceService', ['executeMptTx']);
          mptOrchestrator.executeMptTx.and.resolveTo({ success: true, hash: 'txHash123' });

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

          txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo({ client: {}, wallet: mockWallet } as any);
          txEnvironmentService.prepareTxEnvironment.and.resolveTo({ client: {}, wallet: mockWallet } as any);

          toastService = jasmine.createSpyObj('ToastService', ['error', 'success', 'info']);

          storageService = jasmine.createSpyObj('StorageService', ['get', 'set']);
          rightPanelService = jasmine.createSpyObj('RightPanelService', ['setPanel']);

          await TestBed.configureTestingModule({
               imports: [MptComponent],
               providers: [
                    provideRouter([]),
                    { provide: WalletManagerService, useValue: walletManager },
                    { provide: TransactionUiService, useValue: transactionUiService },
                    { provide: DownloadUtilService, useValue: downloadUtilService },
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: WalletDataService, useValue: walletDataService },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: MptTransactionViewModelService, useValue: mptViewModelService },
                    { provide: MptStoreService, useValue: mptStoreService },
                    { provide: MptUtilService, useValue: mptUtilService },
                    { provide: MptOrchestratorServiceService, useValue: mptOrchestrator },
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

          fixture = TestBed.createComponent(MptComponent);
          component = fixture.componentInstance;

          (component as any).tabs = computed(() => MPT_TABS);
          (component as any).tabMeta = MPT_TAB_META;
          (component as any).mptFlagsConfig = MPT_FLAGS_CONFIG;

          (component as any).xrpl = { isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(true) };

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('ngOnInit', () => {
          it('should load custom destinations and set right panel', () => {
               expect(transactionDropdownService.loadCustomDestinations).toHaveBeenCalled();
               expect(rightPanelService.setPanel).toHaveBeenCalled();
          });
     });

     describe('performAction', () => {
          beforeEach(() => {
               component.currentWallet.set(mockWallet);
               mptOrchestrator.executeMptTx.calls.reset();
               toastService.error.calls.reset();
          });

          it('should execute createMpt successfully', async () => {
               mptViewModelService.activeTab.set('createMpt');
               await component.performAction();

               expect(txEnvironmentService.prepareTxEnvironmentWithWallet).toHaveBeenCalled();
               expect(mptOrchestrator.executeMptTx).toHaveBeenCalled();
          });

          it('should reject createMpt with oversized metadata', async () => {
               mptViewModelService.activeTab.set('createMpt');
               // Override the computed for this test
               Object.defineProperty(mptViewModelService, 'metadataByteLength', {
                    value: computed(() => 2048),
                    writable: true,
               });

               await component.performAction();

               expect(toastService.error).toHaveBeenCalledWith(jasmine.stringContaining('exceeds maximum size'), jasmine.any(Number));
               expect(mptOrchestrator.executeMptTx).not.toHaveBeenCalled();
          });

          it('should show error for invalid destination (sendMpt)', async () => {
               mptViewModelService.activeTab.set('sendMpt');
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('');
               (component as any).xrpl.isValidAddress.and.returnValue(false);

               await component.performAction();

               expect(toastService.error).toHaveBeenCalled();
               expect(mptOrchestrator.executeMptTx).not.toHaveBeenCalled();
          });
     });

     describe('setTab', () => {
          it('should change active tab and clear fields', async () => {
               await component.setTab('sendMpt');
               expect(mptViewModelService.activeTab()).toBe('sendMpt');
               expect(mptStoreService.resetMptFields).toHaveBeenCalled();
          });
     });

     describe('onMptSelected', () => {
          it('should update mptIssuanceId', () => {
               component.onMptSelected({ id: '0000000000000001', display: 'Test MPT' } as any);
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', '0000000000000001');
          });
     });

     describe('toggleExistingMpts', () => {
          it('should toggle collapsed state', () => {
               mptStoreService.outstandingMptsCollapsed.set(false);
               component.toggleExistingMpts();
               expect(mptStoreService.setField).toHaveBeenCalledWith('outstandingMptsCollapsed', true);
          });
     });
});
