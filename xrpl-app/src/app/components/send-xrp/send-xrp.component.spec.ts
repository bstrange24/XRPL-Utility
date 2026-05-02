import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
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
     let credentialStore: jasmine.SpyObj<typeof CredentialStore>;
     let sendXrpViewModelService: any;
     let sendXrpUtilService: any;
     let rightPanelService: jasmine.SpyObj<RightPanelService>;
     let xrplService: jasmine.SpyObj<XrplService>;
     let acccountDataService: jasmine.SpyObj<AcccountDataService>;

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

          xrplService = jasmine.createSpyObj('XrplService', ['getNet']);
          xrplService.getNet.and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });

          walletManagerService = jasmine.createSpyObj('WalletManagerService', ['ensureWalletSelected', 'getSelectedWallet', 'getSelectedIndex'], {
               wallets: signal([mockWallet]),
               selectedIndex: signal(0),
               hasWallets: computed(() => true),
               currentWallet: computed(() => mockWallet),
          });
          walletManagerService.ensureWalletSelected.and.returnValue(true);
          walletManagerService.getSelectedWallet.and.returnValue(mockWallet);

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

          transactionDropdownService = jasmine.createSpyObj('TransactionDropdownService', ['loadCustomDestinations', 'getFinalDestinationAddress', 'setupAutoSelectOnValidTypedAddress', 'allDestinations', 'destinationMap', 'destinationItems', 'selectedDestinationItem', 'filteredDestinations', 'destinationDisplay'], {
               customDestinations: signal([]),
          });
          transactionDropdownService.allDestinations.and.returnValue(signal([]));
          transactionDropdownService.destinationMap.and.returnValue(signal(new Map()));
          transactionDropdownService.destinationItems.and.returnValue(signal([]));
          transactionDropdownService.selectedDestinationItem.and.returnValue(signal(null));
          transactionDropdownService.filteredDestinations.and.returnValue(signal([]));
          transactionDropdownService.destinationDisplay.and.returnValue(signal(''));
          transactionDropdownService.getFinalDestinationAddress.and.returnValue('rDestination123');

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
               accountInfo: { result: { account_data: {} } },
               accountObjects: { result: { account_objects: [] } },
          } as any);

          toastService = jasmine.createSpyObj('ToastService', ['error', 'success']);

          sendXrpTransactionOrchestratorService = jasmine.createSpyObj('SendXrpTransactionOrchestratorService', ['executeXrpPayment']);
          sendXrpTransactionOrchestratorService.executeXrpPayment.and.resolveTo({ success: true, hash: 'txHash123' });

          credentialStore = jasmine.createSpyObj('CredentialStore', ['setField', 'getAll']);
          // credentialStore.getAll.and.returnValue({});

          sendXrpViewModelService = {
               activeTab: signal('sendXrp'),
               infoData: computed(() => ({ walletName: 'Test Wallet', balance: '1000' })),
          };

          sendXrpUtilService = {
               sendButtonLabel: computed(() => 'Send XRP'),
               clearInputFields: jasmine.createSpy('clearInputFields'),
          };

          rightPanelService = jasmine.createSpyObj('RightPanelService', ['setPanel', 'clearPanel']);

          walletDataService = jasmine.createSpyObj('WalletDataService', ['refreshWallets']);
          walletDataService.refreshWallets.and.resolveTo();

          // Add acccountDataService mock
          acccountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState']);
          acccountDataService.refreshUiState.and.returnValue();

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
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
               schemas: [NO_ERRORS_SCHEMA],
          }).compileComponents();

          fixture = TestBed.createComponent(SendXrpComponent);
          component = fixture.componentInstance;

          (component as any).sendXrpTabs = SEND_XRP_TABS;
          (component as any).tabMeta = SEND_XRP_TAB_META;
          (component as any).destinationItems = signal([]);
          (component as any).selectedDestinationItem = signal(null);
          (component as any).destinationSearchQuery = signal('');
          (component as any).selectedDestinationAddress = signal('');
          (component as any).xrpl = { isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(true) };

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('performAction', () => {
          beforeEach(() => {
               component.currentWallet.set(mockWallet);
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('rDestination123');
               (component as any).xrpl.isValidAddress.and.returnValue(true);
               sendXrpTransactionOrchestratorService.executeXrpPayment.calls.reset();
               txEnvironmentService.prepareTxEnvironmentWithWallet.calls.reset();
          });

          // it('should execute sendXrp successfully', async () => {
          //      sendXrpViewModelService.activeTab.set('sendXrp');

          //      await component.performAction();

          //      expect(txEnvironmentService.prepareTxEnvironmentWithWallet).toHaveBeenCalled();
          //      expect(sendXrpTransactionOrchestratorService.executeXrpPayment).toHaveBeenCalled();
          // });

          it('should show error for invalid destination', async () => {
               sendXrpViewModelService.activeTab.set('sendXrp');
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('');
               (component as any).xrpl.isValidAddress.and.returnValue(false);

               await component.performAction();

               expect(toastService.error).toHaveBeenCalledWith('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
               expect(sendXrpTransactionOrchestratorService.executeXrpPayment).not.toHaveBeenCalled();
          });
     });
});
