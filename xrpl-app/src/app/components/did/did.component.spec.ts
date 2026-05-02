import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { DidComponent } from './did.component';
import { DID_TABS, DID_TAB_META } from './constants/did.ui';
import { DID_TAB } from './constants/did.constants';

// Services
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { DidTransactionOrchestratorService } from '../../services/did/did-transaction-orchestrator/did-transaction-orchestrator.service';
import { DidUtilService } from '../../services/did/did-util/did-util.service';
import { DidStoreService } from '../../services/did/did-store/did-store.service';
import { DidViewModelService } from '../../services/did/did-view-model/did-view-model.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { XrplDateService } from '../../core/xrpl-date.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';

// Mock performance API
const mockPerformance = {
     mark: jasmine.createSpy('mark'),
     measure: jasmine.createSpy('measure'),
     getEntriesByName: jasmine.createSpy('getEntriesByName').and.returnValue([{ duration: 100 }]),
     clearMarks: jasmine.createSpy('clearMarks'),
     clearMeasures: jasmine.createSpy('clearMeasures'),
};
Object.defineProperty(window, 'performance', {
     value: mockPerformance,
     writable: true,
});

describe('DidComponent', () => {
     let component: DidComponent;
     let fixture: ComponentFixture<DidComponent>;

     let walletManager: jasmine.SpyObj<WalletManagerService>;
     let transactionUiService: jasmine.SpyObj<TransactionUiService>;
     let transactionDropdownService: jasmine.SpyObj<TransactionDropdownService>;
     let txEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let toastService: jasmine.SpyObj<ToastService>;
     let didOrchestrator: jasmine.SpyObj<DidTransactionOrchestratorService>;
     let didUtilService: jasmine.SpyObj<DidUtilService>;
     let didStoreService: jasmine.SpyObj<InstanceType<typeof DidStoreService>>;
     let didViewModelService: jasmine.SpyObj<DidViewModelService>;
     let rightPanelService: jasmine.SpyObj<RightPanelService>;
     let xrplService: jasmine.SpyObj<XrplService>;
     let acccountDataService: jasmine.SpyObj<AcccountDataService>;
     let walletDataService: jasmine.SpyObj<WalletDataService>;
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let downloadUtilService: jasmine.SpyObj<DownloadUtilService>;
     // let xrplTransactionService: jasmine.SpyObj<XrplTransactionService>;

     const existingDidSignal = signal([]);

     const mockWallet = {
          address: 'rTestWallet1234567890',
          classicAddress: 'rTestWallet1234567890',
          name: 'Test Wallet',
          seed: 'sEdTestSeed1234567890abcdef',
     } as any;

     beforeEach(async () => {
          // Reset performance spies
          mockPerformance.mark.calls.reset();
          mockPerformance.measure.calls.reset();
          mockPerformance.getEntriesByName.calls.reset();
          mockPerformance.clearMarks.calls.reset();
          mockPerformance.clearMeasures.calls.reset();

          xrplService = jasmine.createSpyObj('XrplService', ['getNet']);
          xrplService.getNet.and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });

          walletManager = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet', 'ensureWalletSelected', 'setSelectedIndex', 'walletVm', 'getSelectedIndex', 'hasWallets'], {
               wallets: signal([mockWallet]),
               selectedIndex: signal(0),
               hasWallets: computed(() => true),
               currentWallet: computed(() => mockWallet),
          });
          walletManager.getSelectedWallet.and.returnValue(mockWallet);
          walletManager.ensureWalletSelected.and.returnValue(true);
          walletManager.getSelectedIndex.and.returnValue(0);

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

          transactionDropdownService = jasmine.createSpyObj('TransactionDropdownService', ['loadCustomDestinations', 'setupAutoSelectOnValidTypedAddress', 'getFinalDestinationAddress', 'allDestinations', 'destinationMap', 'destinationItems', 'selectedDestinationItem', 'filteredDestinations', 'destinationDisplay'], {
               customDestinations: signal([]),
          });

          transactionDropdownService.allDestinations.and.returnValue(signal([]));
          transactionDropdownService.destinationMap.and.returnValue(signal(new Map()));
          transactionDropdownService.destinationItems.and.returnValue(signal([]));
          transactionDropdownService.selectedDestinationItem.and.returnValue(signal(null));
          transactionDropdownService.filteredDestinations.and.returnValue(signal([]));
          transactionDropdownService.destinationDisplay.and.returnValue(signal(''));

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
          txEnvironmentService.prepareTxEnvironment.and.resolveTo({ client: {}, wallet: mockWallet, ledgerInfo: { currentRippleTime: 1000 } } as any);

          toastService = jasmine.createSpyObj('ToastService', ['error', 'success', 'info']);

          didOrchestrator = jasmine.createSpyObj('DidTransactionOrchestratorService', ['executeDidTx']);
          didOrchestrator.executeDidTx.and.resolveTo({ success: true, hash: 'txHash123' });

          didUtilService = jasmine.createSpyObj('DidUtilService', ['populateDidDefaultData', 'getExistingDid']);
          didUtilService.populateDidDefaultData.and.returnValue();
          didUtilService.getExistingDid.and.returnValue();

          didStoreService = jasmine.createSpyObj('DidStoreService', ['setField', 'getAll', 'clearDidFields'], {
               didData: signal(''),
               uriData: signal(''),
               didDocumentData: signal(''),
               existingDid: existingDidSignal.asReadonly(), // This makes it a signal that returns the array
          });
          didStoreService.clearDidFields.and.returnValue();
          didStoreService.getAll.and.returnValue({
               didData: '',
               uriData: '',
               didDocumentData: '',
               createdDids: false,
               existingDid: [],
               regularKeySigningEnabled: false,
          });

          didViewModelService = jasmine.createSpyObj('DidViewModelService', ['setDidDataEditor'], {
               activeTab: signal('setDid'),
               infoData: computed(() => ({
                    walletName: 'Test Wallet',
                    mode: 'setDid',
                    didCount: existingDidSignal().length,
                    existingDid: existingDidSignal(),
               })),
               actionButtonLabel: computed(() => 'Set DID'),
               actionButtonClass: computed(() => 'btn-primary-blue'),
               didDataByteLength: computed(() => 0),
               uriDataByteLength: computed(() => 0),
               didDocumentDataByteLength: computed(() => 0),
               didDataIsValid: computed(() => true),
               uriDataIsValid: computed(() => true),
               didDocumentDataIsValid: computed(() => true),
               hasJsonSyntaxError: computed(() => false),
               validDidSchema: computed(() => true),
               allFieldsValid: computed(() => true),
          });
          didViewModelService.setDidDataEditor.and.returnValue();

          acccountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState']);
          acccountDataService.refreshUiState.and.returnValue();

          walletDataService = jasmine.createSpyObj('WalletDataService', ['refreshWallets']);
          walletDataService.refreshWallets.and.resolveTo();

          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copyAddress', 'copyTxSignal', 'copyTxResultSignal']);
          copyUtilService.copyAddress.and.returnValue();
          copyUtilService.copyTxSignal.and.returnValue();
          copyUtilService.copyTxResultSignal.and.returnValue();

          downloadUtilService = jasmine.createSpyObj('DownloadUtilService', ['downloadSignTxJson', 'downloadTxResultSignal', 'downloadTxResult', 'downloadTxSignal']);
          downloadUtilService.downloadSignTxJson.and.returnValue();
          downloadUtilService.downloadTxResultSignal.and.returnValue();
          downloadUtilService.downloadTxResult.and.returnValue();
          downloadUtilService.downloadTxSignal.and.returnValue();

          xrplService = jasmine.createSpyObj('XrplService', ['getNet']);
          xrplService.getNet.and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });

          rightPanelService = jasmine.createSpyObj('RightPanelService', ['setPanel', 'clearPanel']);

          await TestBed.configureTestingModule({
               imports: [DidComponent],
               providers: [
                    provideRouter([]),
                    { provide: WalletManagerService, useValue: walletManager },
                    { provide: TransactionUiService, useValue: transactionUiService },
                    { provide: TransactionDropdownService, useValue: transactionDropdownService },
                    { provide: TxEnvironmentService, useValue: txEnvironmentService },
                    { provide: ToastService, useValue: toastService },
                    { provide: DidTransactionOrchestratorService, useValue: didOrchestrator },
                    { provide: DidUtilService, useValue: didUtilService },
                    { provide: DidStoreService, useValue: didStoreService },
                    { provide: DidViewModelService, useValue: didViewModelService },
                    { provide: RightPanelService, useValue: rightPanelService },
                    { provide: XrplService, useValue: xrplService },
                    { provide: AcccountDataService, useValue: acccountDataService },
                    { provide: WalletDataService, useValue: walletDataService },
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: DownloadUtilService, useValue: downloadUtilService },
                    // { provide: XrplTransactionService, useValue: xrplTransactionService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, queryParams: of({}) } },
                    { provide: ConnectionGuardService, useValue: { isConnected: signal(true) } },
                    { provide: XrplDateService, useValue: { isExpired: () => false } },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(DidComponent);
          component = fixture.componentInstance;

          (component as any).didTabs = DID_TABS;
          (component as any).tabMeta = DID_TAB_META;

          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset any spies
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('ngOnInit', () => {
          it('should set active tab, load data and set right panel', () => {
               expect(didViewModelService.activeTab()).toBe('setDid');
               expect(didUtilService.populateDidDefaultData).toHaveBeenCalled();
               expect(rightPanelService.setPanel).toHaveBeenCalled();
          });
     });

     describe('ngOnDestroy', () => {
          it('should clear right panel', () => {
               component.ngOnDestroy();
               expect(rightPanelService.clearPanel).toHaveBeenCalled();
          });
     });

     describe('setTab', () => {
          it('should change active tab and clear fields', async () => {
               await component.setTab('deleteDid');
               expect(didViewModelService.activeTab()).toBe('deleteDid');
               expect(didUtilService.populateDidDefaultData).toHaveBeenCalled();
               expect(transactionUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
          });
     });

     describe('selectWallet', () => {
          it('should not switch if same wallet', () => {
               component.currentWallet.set(mockWallet);
               component.selectWallet(mockWallet);
               expect(component.currentWallet()).toEqual(mockWallet);
          });

          it('should switch wallet', () => {
               const newWallet = { ...mockWallet, address: 'rNewWallet123' };
               component.selectWallet(newWallet);
               expect(component.currentWallet()).toEqual(newWallet);
               expect(didUtilService.populateDidDefaultData).toHaveBeenCalled();
          });
     });

     describe('getDidForAccount', () => {
          it('should fetch environment and parse did', async () => {
               await component.getDidForAccount();

               expect(txEnvironmentService.getValidatedEnvironment).toHaveBeenCalled();
               expect(didUtilService.getExistingDid).toHaveBeenCalled();
          });

          it('should handle errors when loading did', async () => {
               txEnvironmentService.getValidatedEnvironment.and.rejectWith(new Error('Network error'));

               await component.getDidForAccount();
               expect(toastService.error).toHaveBeenCalled();
          });
     });

     describe('performAction', () => {
          beforeEach(() => {
               component.currentWallet.set(mockWallet);
               txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo({
                    client: {},
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
               } as any);
          });

          it('should execute setDid successfully', async () => {
               didViewModelService.activeTab.set('setDid');

               await component.performAction();

               expect(txEnvironmentService.prepareTxEnvironmentWithWallet).toHaveBeenCalled();
               expect(didOrchestrator.executeDidTx).toHaveBeenCalled();
          });

          it('should execute deleteDid successfully', async () => {
               didViewModelService.activeTab.set('deleteDid');

               await component.performAction();

               expect(didOrchestrator.executeDidTx).toHaveBeenCalled();
          });
     });

     describe('clearInputFields', () => {
          it('should clear did fields', () => {
               (component as any).clearInputFields();
               expect(didStoreService.clearDidFields).toHaveBeenCalled();
          });
     });
});
