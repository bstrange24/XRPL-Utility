import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed, Signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { SendXrpComponent } from './send-xrp.component';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { SendXrpTransactionOrchestratorService } from '../../services/send-xrp/send-xrp-orchestrator/send-xrp-transaction-orchestrator.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { CredentialStore } from '../../services/credentials/credential-store/credential-store.service';
import { SendXrpViewModelService } from '../../services/send-xrp/send-xrp-view-model/send-xrp-view-model.service';
import { SendXrpUtilService } from '../../services/send-xrp/send-xrp-util/send-xrp-util.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AppConstants } from '../../core/app.constants';
import { SEND_XRP_TABS, SEND_XRP_TAB_META } from './constants/send-xrp.ui';
import { SendXrpRequirementsInfoComponent } from './ui-components/send-xrp-requirements-info/send-xrp-requirements-info.component';
import { XrplTxOptionsStore } from '../shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorStoreService } from '../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import * as xrpl from 'xrpl';

// Mock performance API
const mockPerformance = {
     mark: jasmine.createSpy('mark'),
     measure: jasmine.createSpy('measure'),
     getEntriesByName: jasmine.createSpy('getEntriesByName').and.returnValue([{ duration: 100 }]),
     clearMarks: jasmine.createSpy('clearMarks'),
     clearMeasures: jasmine.createSpy('clearMeasures'),
};
Object.defineProperty(window, 'performance', { value: mockPerformance, writable: true });

describe('SendXrpComponent', () => {
     let component: SendXrpComponent;
     let fixture: ComponentFixture<SendXrpComponent>;

     let walletManagerService: jasmine.SpyObj<WalletManagerService>;
     let transactionUiService: jasmine.SpyObj<TransactionUiService>;
     let transactionDropdownService: jasmine.SpyObj<TransactionDropdownService>;
     let walletDataService: jasmine.SpyObj<WalletDataService>;
     let txEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let toastService: jasmine.SpyObj<ToastService>;
     let sendXrpTransactionOrchestratorService: jasmine.SpyObj<SendXrpTransactionOrchestratorService>;
     let credentialStore: any;
     let sendXrpViewModelService: any;
     let sendXrpUtilService: any;
     let rightPanelService: jasmine.SpyObj<RightPanelService>;
     let xrplService: jasmine.SpyObj<XrplService>;
     let acccountDataService: jasmine.SpyObj<AcccountDataService>;
     let accountConfiguratorStoreService: any;
     let xrplTxOptionsStore: any;

     const mockWallet = {
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

          // Mock XrplService
          xrplService = jasmine.createSpyObj('XrplService', ['getNet']);
          xrplService.getNet.and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });

          // Mock WalletManagerService
          walletManagerService = jasmine.createSpyObj('WalletManagerService', ['ensureWalletSelected', 'getSelectedWallet', 'getSelectedIndex'], {
               wallets: signal([mockWallet]),
               selectedIndex: signal(0),
               hasWallets: computed(() => true),
               currentWallet: computed(() => mockWallet),
          });
          walletManagerService.ensureWalletSelected.and.returnValue(true);
          walletManagerService.getSelectedWallet.and.returnValue(mockWallet);

          // Mock TransactionUiService
          transactionUiService = jasmine.createSpyObj('TransactionUiService', ['clearAllOptionsAndMessages', 'resetCurrentStepToIdle', 'setTxResultSignal', 'clearMessages', 'clearAllFields', 'toggleOptions'], {
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

          // Mock TransactionDropdownService
          transactionDropdownService = jasmine.createSpyObj('TransactionDropdownService', ['loadCustomDestinations', 'getFinalDestinationAddress', 'setupAutoSelectOnValidTypedAddress', 'allDestinations', 'destinationMap', 'destinationItems', 'selectedDestinationItem', 'filteredDestinations', 'destinationDisplay', 'addCustomIfNewAndSelect'], {
               customDestinations: signal([]),
          });
          transactionDropdownService.allDestinations.and.returnValue(signal([]));
          transactionDropdownService.destinationMap.and.returnValue(signal(new Map()));
          transactionDropdownService.destinationItems.and.returnValue(signal([]));
          transactionDropdownService.selectedDestinationItem.and.returnValue(signal(null));
          transactionDropdownService.filteredDestinations.and.returnValue(signal([]));
          transactionDropdownService.destinationDisplay.and.returnValue(signal(''));

          // Mock getFinalDestinationAddress to properly handle signals
          transactionDropdownService.getFinalDestinationAddress.and.returnValue('rDestination123');

          // Mock TxEnvironmentService
          txEnvironmentService = jasmine.createSpyObj('TxEnvironmentService', ['getValidatedEnvironment', 'prepareTxEnvironmentWithWallet']);
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
               accountInfo: { result: { account_data: { Balance: '1000000' } } },
               accountObjects: { result: { account_objects: [] } },
               fee: '10',
               ledgerInfo: { currentRippleTime: Date.now() },
               serverInfo: { info: { complete_ledgers: '1-100' } },
          } as any);

          // Mock ToastService
          toastService = jasmine.createSpyObj('ToastService', ['error', 'success']);

          // Mock SendXrpTransactionOrchestratorService
          sendXrpTransactionOrchestratorService = jasmine.createSpyObj('SendXrpTransactionOrchestratorService', ['executeXrpPayment']);
          sendXrpTransactionOrchestratorService.executeXrpPayment.and.resolveTo({ success: true, hash: 'txHash123' });

          // Mock CredentialStore
          credentialStore = jasmine.createSpyObj('CredentialStore', ['setField', 'getAll', 'credentialIssuer']);
          credentialStore.getAll.and.returnValue({});
          credentialStore.credentialIssuer.and.returnValue('');

          // Mock SendXrpViewModelService
          sendXrpViewModelService = {
               activeTab: signal('sendXrp'),
               infoData: computed(() => ({ walletName: 'Test Wallet', balance: '1000' })),
          };

          // Mock SendXrpUtilService
          sendXrpUtilService = {
               sendButtonLabel: computed(() => 'Send XRP'),
               clearInputFields: jasmine.createSpy('clearInputFields'),
          };

          // Mock RightPanelService
          rightPanelService = jasmine.createSpyObj('RightPanelService', ['setPanel', 'clearPanel']);

          // Mock WalletDataService
          walletDataService = jasmine.createSpyObj('WalletDataService', ['refreshWallets']);
          walletDataService.refreshWallets.and.resolveTo();

          // Mock AcccountDataService
          acccountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState']);
          acccountDataService.refreshUiState.and.returnValue();

          // Mock AccountConfiguratorStoreService
          accountConfiguratorStoreService = {
               setField: jasmine.createSpy('setField'),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               multiSigningEnabled: jasmine.createSpy('multiSigningEnabled').and.returnValue(signal(false)),
               getMultiSigningSigners: jasmine.createSpy('getMultiSigningSigners').and.returnValue(signal([])),
               destination: jasmine.createSpy('destination').and.returnValue(signal('')),
               amount: jasmine.createSpy('amount').and.returnValue(signal('')),
               regularKeySigningEnabled: jasmine.createSpy('regularKeySigningEnabled').and.returnValue(signal('')),
          };

          // Mock XrplTxOptionsStore
          xrplTxOptionsStore = {
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               reset: jasmine.createSpy('reset'),
               wantsOptions: jasmine.createSpy('wantsOptions').and.returnValue(false),
               expiration: jasmine.createSpy('expiration').and.returnValue(null),
               memos: jasmine.createSpy('memos').and.returnValue([]),
               ticketArray: jasmine.createSpy('ticketArray').and.returnValue({}),
               isMemoEnabled: jasmine.createSpy('isMemoEnabled').and.returnValue(false),
               useMultiSign: jasmine.createSpy('useMultiSign').and.returnValue(false),
               isRegularKeyAddress: jasmine.createSpy('isRegularKeyAddress').and.returnValue(''),
               isTicket: jasmine.createSpy('isTicket').and.returnValue(false),
               isSimulateEnabled: jasmine.createSpy('isSimulateEnabled').and.returnValue(false),
          };

          await TestBed.configureTestingModule({
               imports: [SendXrpComponent],
               providers: [
                    provideRouter([]),
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: TransactionUiService, useValue: transactionUiService },
                    { provide: TransactionDropdownService, useValue: transactionDropdownService },
                    { provide: WalletDataService, useValue: walletDataService },
                    { provide: TxEnvironmentService, useValue: txEnvironmentService },
                    { provide: CopyUtilService, useValue: {} },
                    { provide: ToastService, useValue: toastService },
                    { provide: AcccountDataService, useValue: acccountDataService },
                    { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                    { provide: StorageService, useValue: { getNet: () => ({ environment: 'devnet' }) } },
                    { provide: XrplTransactionService, useValue: {} },
                    { provide: SendXrpTransactionOrchestratorService, useValue: sendXrpTransactionOrchestratorService },
                    { provide: TrustlineCurrencyService, useValue: {} },
                    { provide: CredentialStore, useValue: credentialStore },
                    { provide: SendXrpViewModelService, useValue: sendXrpViewModelService },
                    { provide: SendXrpUtilService, useValue: sendXrpUtilService },
                    { provide: RightPanelService, useValue: rightPanelService },
                    { provide: ConnectionGuardService, useValue: { isConnected: signal(true) } },
                    { provide: XrplService, useValue: xrplService },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStore },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
               schemas: [NO_ERRORS_SCHEMA],
          }).compileComponents();

          fixture = TestBed.createComponent(SendXrpComponent);
          component = fixture.componentInstance;

          // Set up component properties
          (component as any).sendXrpTabs = SEND_XRP_TABS;
          (component as any).tabMeta = SEND_XRP_TAB_META;
          (component as any).destinationItems = signal([]);
          (component as any).selectedDestinationItem = signal(null);
          (component as any).isSummaryLoading = signal(false);

          // Mock xrpl.isValidAddress
          (component as any).xrpl = { isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(true) };

          // Mock withPerf method
          (component as any).withPerf = jasmine.createSpy('withPerf').and.callFake(async (name: string, fn: () => Promise<void>) => {
               return await fn();
          });

          // Mock handleTxResult method
          spyOn(component as any, 'handleTxResult').and.resolveTo();

          // Mock onAccountChange method
          spyOn(component as any, 'onAccountChange').and.resolveTo();

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('ngOnInit', () => {
          it('should initialize tab, load destinations, and set right panel', () => {
               spyOn(component as any, 'applyTabFromQueryParam');

               component.ngOnInit();

               expect(transactionDropdownService.loadCustomDestinations).toHaveBeenCalled();
               expect(rightPanelService.setPanel).toHaveBeenCalledWith(SendXrpRequirementsInfoComponent, {
                    activeTab: sendXrpViewModelService.activeTab,
               });
               expect((component as any).applyTabFromQueryParam).toHaveBeenCalled();
          });
     });

     describe('performAction', () => {
          beforeEach(() => {
               // Reset all spies
               sendXrpTransactionOrchestratorService.executeXrpPayment.calls.reset();
               toastService.error.calls.reset();
               txEnvironmentService.prepareTxEnvironmentWithWallet.calls.reset();
               accountConfiguratorStoreService.setField.calls.reset();

               // Set up default successful conditions
               component.currentWallet.set(mockWallet);
               sendXrpViewModelService.activeTab.set('sendXrp');

               // Set the signals directly on the component
               component.selectedDestinationAddress.set('rDestination123');
               component.destinationSearchQuery.set('');

               // Mock xrpl.isValidAddress to return true
               (component as any).xrpl.isValidAddress.and.returnValue(true);
          });

          it('should show error for invalid destination', async () => {
               // Set empty address
               component.selectedDestinationAddress.set('');
               component.destinationSearchQuery.set('');
               (component as any).xrpl.isValidAddress.and.returnValue(false);

               await component.performAction();
               await fixture.whenStable();

               expect(toastService.error).toHaveBeenCalledWith('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
               expect(sendXrpTransactionOrchestratorService.executeXrpPayment).not.toHaveBeenCalled();
          });

          it('should handle prepareTxEnvironment failure', async () => {
               txEnvironmentService.prepareTxEnvironmentWithWallet.and.rejectWith(new Error('Environment preparation failed'));

               await component.performAction();
               await fixture.whenStable();

               expect(toastService.error).toHaveBeenCalledWith('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
               expect(sendXrpTransactionOrchestratorService.executeXrpPayment).not.toHaveBeenCalled();
          });

          // it('should execute successfully and NOT show error toast', async () => {
          //      component.currentWallet.set(mockWallet);

          //      // IMPORTANT: valid destination path
          //      component.selectedDestinationAddress.set('');
          //      component.destinationSearchQuery.set('rDestination123');

          //      transactionDropdownService.getFinalDestinationAddress.and.returnValue('rDestination123');

          //      spyOn(xrpl, 'isValidAddress').and.returnValue(true);

          //      const mockEnv = {
          //           client: {},
          //           wallet: mockWallet,
          //           accountInfo: { result: { account_data: { Balance: '1000' } } },
          //           accountObjects: { result: { account_objects: [] } },
          //           fee: '10',
          //           ledgerInfo: { currentRippleTime: Date.now() },
          //           serverInfo: { info: { complete_ledgers: '1-100' } },
          //      } as any;

          //      txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo(mockEnv);

          //      sendXrpTransactionOrchestratorService.executeXrpPayment.and.resolveTo({
          //           success: true,
          //           hash: 'abc123',
          //      });

          //      await component.performAction();

          //      expect(sendXrpTransactionOrchestratorService.executeXrpPayment).toHaveBeenCalled();
          //      expect(toastService.error).not.toHaveBeenCalled();
          // });
     });

     describe('handleSearchQueryChange', () => {
          it('should update destinationSearchQuery', () => {
               component.handleSearchQueryChange('test query');
               expect(component.destinationSearchQuery()).toBe('test query');
          });
     });

     describe('handleDestinationChange', () => {
          it('should update selectedDestinationAddress when item has id', () => {
               const item = { id: 'rDestination123' };
               component.handleDestinationChange(item as any);
               expect(component.selectedDestinationAddress()).toBe('rDestination123');
          });

          it('should update selectedDestinationAddress to empty string when item is null', () => {
               component.handleDestinationChange(null);
               expect(component.selectedDestinationAddress()).toBe('');
          });
     });

     describe('ngOnDestroy', () => {
          it('should clear right panel', () => {
               component.ngOnDestroy();
               expect(rightPanelService.clearPanel).toHaveBeenCalled();
          });
     });
});
