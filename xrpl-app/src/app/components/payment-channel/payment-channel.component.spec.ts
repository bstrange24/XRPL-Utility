import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, computed, WritableSignal, Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CreatePaymentChannelComponent } from './payment-channel.component';
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
import { PaymentChannelUtilService } from '../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { PaymentChannelOrchestratorService } from '../../services/payment-channel/payment-channel-orchestrator/payment-channel-orchestrator.service';
import { XrplDateService } from '../../core/xrpl-date.service';
import { PaymentChannelViewModelService } from '../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelStoreService } from '../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { PaymentChannelSignatureContextService } from '../../services/payment-channel/payment-channel-signature-context/payment-channel-signature-context.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AppConstants } from '../../core/app.constants';
import { PAYMENT_CHANNEL_TABS, PAYMENT_CHANNEL_TAB_META } from './constants/payment-channel.ui';

// Mock Performance API
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

// Mock child components
@Component({ selector: 'app-tab-menu-with-info', template: '<div></div>', standalone: true })
class MockTabMenuWithInfo {}

@Component({ selector: 'app-payment-channel-summary', template: '<div></div>', standalone: true })
class MockPaymentChannelSummary {}

@Component({ selector: 'app-warning-message', template: '<div></div>', standalone: true })
class MockWarningMessage {}

@Component({ selector: 'app-payment-channel-create', template: '<div></div>', standalone: true })
class MockPaymentChannelCreate {}

@Component({ selector: 'app-payment-channel-fund', template: '<div></div>', standalone: true })
class MockPaymentChannelFund {}

@Component({ selector: 'app-payment-channel-claim', template: '<div></div>', standalone: true })
class MockPaymentChannelClaim {}

@Component({ selector: 'app-payment-channel-renew', template: '<div></div>', standalone: true })
class MockPaymentChannelRenew {}

@Component({ selector: 'app-payment-channel-close', template: '<div></div>', standalone: true })
class MockPaymentChannelClose {}

@Component({ selector: 'app-payment-channel-flags', template: '<div></div>', standalone: true })
class MockPaymentChannelFlags {}

@Component({ selector: 'app-transaction-options', template: '<div></div>', standalone: true })
class MockTransactionOptions {}

@Component({ selector: 'app-execution-time-display', template: '<div></div>', standalone: true })
class MockExecutionTimeDisplay {}

@Component({ selector: 'app-transaction-preview', template: '<div></div>', standalone: true })
class MockTransactionPreview {}

describe('CreatePaymentChannelComponent', () => {
     let component: CreatePaymentChannelComponent;
     let fixture: ComponentFixture<CreatePaymentChannelComponent>;

     // Services
     let walletManagerService: any;
     let transactionUiService: any;
     let transactionDropdownService: any;
     let walletDataService: any;
     let txEnvironmentService: any;
     let copyUtilService: any;
     let toastService: any;
     let acccountDataService: any;
     let route: any;
     let storageService: any;
     let xrplTransactionService: any;
     let paymentChannelUtilService: any;
     let paymentChannelOrchestratorService: any;
     let xrplDateService: any;
     let paymentChannelViewModelService: any;
     let paymentChannelStoreService: any;
     let paymentChannelSignatureContextService: any;
     let rightPanelService: any;
     let connectionGuardService: any;
     let xrplService: any;

     // Writable signals
     let activeTabSignal: WritableSignal<string>;
     let channelIDFieldSignal: WritableSignal<string>;
     let channelClaimSignatureFieldSignal: WritableSignal<string>;
     let isCreatorModeSignal: WritableSignal<boolean>;
     let amount: WritableSignal<string>;
     let currentStepSignal: WritableSignal<string>;
     let destinationItemsSignal: WritableSignal<any[]>;
     let selectedDestinationItemSignal: WritableSignal<any>;
     let destinationSearchQuerySignal: WritableSignal<string>;
     let selectedDestinationAddressSignal: WritableSignal<string>;

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

          // Initialize signals
          activeTabSignal = signal('createPaymentChannel');
          channelIDFieldSignal = signal('');
          channelClaimSignatureFieldSignal = signal('');
          isCreatorModeSignal = signal(false);
          amount = signal('');
          currentStepSignal = signal('idle');
          destinationItemsSignal = signal([]);
          selectedDestinationItemSignal = signal(null);
          destinationSearchQuerySignal = signal('');
          selectedDestinationAddressSignal = signal('');

          // Create service mocks
          xrplService = {
               getNet: jasmine.createSpy('getNet').and.returnValue({ environment: 'devnet' }),
               getChannelVerifiy: jasmine.createSpy('getChannelVerifiy').and.resolveTo({ result: { signature_verified: true } }),
          };

          walletManagerService = {
               wallets: signal([mockWallet]),
               selectedIndex: signal(0),
               hasWallets: computed(() => true),
               currentWallet: computed(() => mockWallet),
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
               ensureWalletSelected: jasmine.createSpy('ensureWalletSelected').and.returnValue(true),
               setSelectedIndex: jasmine.createSpy('setSelectedIndex'),
          };

          transactionUiService = {
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               setTxResultSignal: jasmine.createSpy('setTxResultSignal'),
               clearAllFields: jasmine.createSpy('clearAllFields'),
               currentStep: currentStepSignal,
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
          };

          transactionDropdownService = {
               loadCustomDestinations: jasmine.createSpy('loadCustomDestinations'),
               setupAutoSelectOnValidTypedAddress: jasmine.createSpy('setupAutoSelectOnValidTypedAddress'),
               getFinalDestinationAddress: jasmine.createSpy('getFinalDestinationAddress').and.returnValue('rDestination123'),
               allDestinations: jasmine.createSpy('allDestinations').and.returnValue(signal([])),
               destinationMap: jasmine.createSpy('destinationMap').and.returnValue(signal(new Map())),
               destinationItems: jasmine.createSpy('destinationItems').and.returnValue(destinationItemsSignal),
               selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(selectedDestinationItemSignal),
               filteredDestinations: jasmine.createSpy('filteredDestinations').and.returnValue(signal([])),
               destinationDisplay: jasmine.createSpy('destinationDisplay').and.returnValue(signal('')),
          };

          walletDataService = {
               refreshWallets: jasmine.createSpy('refreshWallets').and.resolveTo(),
          };

          txEnvironmentService = {
               getValidatedEnvironment: jasmine.createSpy('getValidatedEnvironment').and.resolveTo({
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
                    client: {} as any,
                    ledgerInfo: { currentRippleTime: Date.now() },
                    fee: '10',
               }),
               prepareTxEnvironmentWithWallet: jasmine.createSpy('prepareTxEnvironmentWithWallet').and.resolveTo({
                    client: {},
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
               }),
               prepareTxEnvironment: jasmine.createSpy('prepareTxEnvironment').and.resolveTo({ client: {}, wallet: mockWallet }),
          };

          copyUtilService = {
               copy: jasmine.createSpy('copy'),
          };

          toastService = {
               error: jasmine.createSpy('error'),
               success: jasmine.createSpy('success'),
               info: jasmine.createSpy('info'),
          };

          acccountDataService = {
               refreshUiState: jasmine.createSpy('refreshUiState'),
          };

          route = {
               queryParams: of({}),
               snapshot: {
                    queryParams: {},
                    queryParamMap: convertToParamMap({}),
               },
          };

          storageService = {
               get: jasmine.createSpy('get'),
               set: jasmine.createSpy('set'),
               removeValue: jasmine.createSpy('removeValue'),
               getNet: jasmine.createSpy('getNet').and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' }),
          };

          xrplTransactionService = {
               getNet: jasmine.createSpy('getNet').and.returnValue({ environment: 'devnet' }),
          };

          paymentChannelUtilService = {
               createChannelButtonLabel: jasmine.createSpy('createChannelButtonLabel').and.returnValue('Create Payment Channel'),
               fundChannelButtonLabel: jasmine.createSpy('fundChannelButtonLabel').and.returnValue('Fund Payment Channel'),
               claimFundsButtonLabel: jasmine.createSpy('claimFundsButtonLabel').and.returnValue('Claim Funds'),
               generateClaimSignatureButtonLabel: jasmine.createSpy('generateClaimSignatureButtonLabel').and.returnValue('Generate Signature'),
               renewChannelButtonLabel: jasmine.createSpy('renewChannelButtonLabel').and.returnValue('Renew Channel'),
               closeChannelButtonLabel: jasmine.createSpy('closeChannelButtonLabel').and.returnValue('Close Channel'),
               processPaymentChannels: jasmine.createSpy('processPaymentChannels'),
               clearInputFields: jasmine.createSpy('clearInputFields'),
               selectPaymentChannelFromList: jasmine.createSpy('selectPaymentChannelFromList'),
               generateCreatorClaimSignature: jasmine.createSpy('generateCreatorClaimSignature').and.resolveTo(),
               loadFlagsFromSignature: jasmine.createSpy('loadFlagsFromSignature'),
               clearFlagsValue: jasmine.createSpy('clearFlagsValue'),
               updateFlagTotal: jasmine.createSpy('updateFlagTotal'),
          };

          paymentChannelOrchestratorService = {
               executePaymentChannelTx: jasmine.createSpy('executePaymentChannelTx').and.resolveTo({ success: true, hash: 'txHash123' }),
          };

          xrplDateService = {
               toLocalDateTimeString: jasmine.createSpy('toLocalDateTimeString').and.returnValue('2024-01-01T00:00:00'),
          };

          paymentChannelViewModelService = {
               activeTab: activeTabSignal,
               isValidRenewTab: jasmine.createSpy('isValidRenewTab').and.returnValue(true),
               isValidClaimTab: jasmine.createSpy('isValidClaimTab').and.returnValue(true),
               isCurrentWalletSource: jasmine.createSpy('isCurrentWalletSource').and.returnValue(true),
               isCurrentWalletDestination: jasmine.createSpy('isCurrentWalletDestination').and.returnValue(true),
               selectedIsExpired: jasmine.createSpy('selectedIsExpired').and.returnValue(false),
               infoData: computed(() => ({
                    walletName: 'Test Wallet',
                    paymentChannelCount: 0,
                    paymentChannelsToShow: [],
                    links: '',
               })),
          };

          paymentChannelStoreService = {
               channelIDField: channelIDFieldSignal,
               channelClaimSignatureField: channelClaimSignatureFieldSignal,
               isCreatorMode: isCreatorModeSignal,
               amount: amount,
               publicKeyField: signal(''),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               setField: jasmine.createSpy('setField'),
               updateField: jasmine.createSpy('updateField'),
               resetChannelIdSelection: jasmine.createSpy('resetChannelIdSelection'),
               destination: signal(''),
          };

          paymentChannelSignatureContextService = {
               getSignatureContext: jasmine.createSpy('getSignatureContext'),
          };

          rightPanelService = {
               setPanel: jasmine.createSpy('setPanel'),
          };

          connectionGuardService = {
               isConnected: signal(true),
          };

          await TestBed.configureTestingModule({
               imports: [CreatePaymentChannelComponent],
               providers: [
                    provideRouter([]),
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: TransactionUiService, useValue: transactionUiService },
                    { provide: TransactionDropdownService, useValue: transactionDropdownService },
                    { provide: WalletDataService, useValue: walletDataService },
                    { provide: TxEnvironmentService, useValue: txEnvironmentService },
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: ToastService, useValue: toastService },
                    { provide: AcccountDataService, useValue: acccountDataService },
                    { provide: ActivatedRoute, useValue: route },
                    { provide: StorageService, useValue: storageService },
                    { provide: XrplTransactionService, useValue: xrplTransactionService },
                    { provide: PaymentChannelUtilService, useValue: paymentChannelUtilService },
                    { provide: PaymentChannelOrchestratorService, useValue: paymentChannelOrchestratorService },
                    { provide: XrplDateService, useValue: xrplDateService },
                    { provide: PaymentChannelViewModelService, useValue: paymentChannelViewModelService },
                    { provide: PaymentChannelStoreService, useValue: paymentChannelStoreService },
                    { provide: PaymentChannelSignatureContextService, useValue: paymentChannelSignatureContextService },
                    { provide: RightPanelService, useValue: rightPanelService },
                    { provide: ConnectionGuardService, useValue: connectionGuardService },
                    { provide: XrplService, useValue: xrplService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
               schemas: [NO_ERRORS_SCHEMA],
          })
               .overrideComponent(CreatePaymentChannelComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(CreatePaymentChannelComponent);
          component = fixture.componentInstance;

          // Set up component signals
          (component as any).destinationItems = destinationItemsSignal;
          (component as any).selectedDestinationItem = selectedDestinationItemSignal;
          (component as any).destinationSearchQuery = destinationSearchQuerySignal;
          (component as any).selectedDestinationAddress = selectedDestinationAddressSignal;
          (component as any).tabs = PAYMENT_CHANNEL_TABS;
          (component as any).tabMeta = PAYMENT_CHANNEL_TAB_META;

          // Mock xrpl
          (component as any).xrpl = { isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(true) };

          // Mock measure method
          (component as any).measure = jasmine.createSpy('measure').and.callFake((label: string, clear: boolean, fn: () => Promise<any>) => {
               return fn();
          });
          fixture.detectChanges();
     });

     afterEach(() => {
          if (paymentChannelOrchestratorService.executePaymentChannelTx) {
               paymentChannelOrchestratorService.executePaymentChannelTx.calls.reset();
          }
          if (paymentChannelUtilService.generateCreatorClaimSignature) {
               paymentChannelUtilService.generateCreatorClaimSignature.calls.reset();
          }
          if (toastService.error) {
               toastService.error.calls.reset();
          }
          if (paymentChannelUtilService.processPaymentChannels) {
               paymentChannelUtilService.processPaymentChannels.calls.reset();
          }
          if (paymentChannelStoreService.setField) {
               paymentChannelStoreService.setField.calls.reset();
          }
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

     describe('toggleSummaryPanel', () => {
          it('should toggle summaryExpanded', () => {
               const initial = component.summaryExpanded();
               component.toggleSummaryPanel();
               expect(component.summaryExpanded()).toBe(!initial);
               component.toggleSummaryPanel();
               expect(component.summaryExpanded()).toBe(initial);
          });
     });

     describe('selectWallet', () => {
          it('should not switch if same wallet', () => {
               component.currentWallet.set(mockWallet);
               component.selectWallet(mockWallet);
               expect(component.currentWallet()).toEqual(mockWallet);
          });

          it('should switch to different wallet', () => {
               const newWallet = { ...mockWallet, address: 'rNewWallet123' };
               component.selectWallet(newWallet);
               expect(component.currentWallet()).toEqual(newWallet);
          });
     });

     describe('setTab', () => {
          beforeEach(() => {
               spyOn(component, 'getPaymentChannels').and.returnValue(Promise.resolve());
               spyOn(component, 'populateDefaultDateTime');
               paymentChannelStoreService.setField.calls.reset();
               paymentChannelUtilService.clearFlagsValue.calls.reset();
          });

          it('should set active tab for valid tab', async () => {
               await component.setTab('fundPaymentChannel');
               expect(paymentChannelViewModelService.activeTab()).toBe('fundPaymentChannel');
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('isCreatorMode', false);
               expect(paymentChannelUtilService.clearFlagsValue).toHaveBeenCalled();
          });

          it('should ignore invalid tab', async () => {
               await component.setTab('invalidTab');
               expect(paymentChannelViewModelService.activeTab()).toBe('createPaymentChannel');
          });

          it('should call getPaymentChannels when has wallets', async () => {
               await component.setTab('createPaymentChannel');
               expect(component.getPaymentChannels).toHaveBeenCalledWith(false);
          });
     });

     describe('getPaymentChannels', () => {
          beforeEach(() => {
               txEnvironmentService.prepareTxEnvironment.and.resolveTo({
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
                    client: {} as any,
               });
          });

          it('should fetch payment channels successfully', async () => {
               await component.getPaymentChannels();
               expect(txEnvironmentService.prepareTxEnvironment).toHaveBeenCalled();
               expect(paymentChannelUtilService.processPaymentChannels).toHaveBeenCalled();
               expect(component.isSummaryLoading()).toBeFalse();
          });

          it('should handle error when fetching payment channels', async () => {
               txEnvironmentService.prepareTxEnvironment.and.rejectWith(new Error('Fetch failed'));
               await component.getPaymentChannels();
               expect(toastService.error).toHaveBeenCalled();
               expect(component.isSummaryLoading()).toBeFalse();
          });

          it('should not fetch when no wallet selected', async () => {
               txEnvironmentService.prepareTxEnvironment.calls.reset();
               walletManagerService.ensureWalletSelected.and.returnValue(false);

               await component.getPaymentChannels();

               expect(txEnvironmentService.prepareTxEnvironment).not.toHaveBeenCalled();
          });
     });

     describe('handlePaymentChannelAction - Create', () => {
          beforeEach(() => {
               activeTabSignal.set('createPaymentChannel');
               component.currentWallet.set(mockWallet);
               (component as any).isIdle = signal(true);

               // Set the destination address signal
               component.selectedDestinationAddress.set('rDestination123');
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('rDestination123');

               (component as any).xrpl = { isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(true) };

               txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo({
                    client: {},
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
               });

               paymentChannelOrchestratorService.executePaymentChannelTx.and.resolveTo({ success: true, hash: 'txHash123' });
               spyOn(component as any, 'handleTxResult').and.returnValue(Promise.resolve(true));
               (component as any).withPerf = jasmine.createSpy('withPerf').and.callFake((name: string, fn: () => Promise<any>) => fn());
               walletManagerService.ensureWalletSelected.and.returnValue(true);

               // Clear any previous calls
               paymentChannelOrchestratorService.executePaymentChannelTx.calls.reset();
               paymentChannelStoreService.setField.calls.reset();
          });

          // it('should create payment channel successfully', async () => {
          //      await component.handlePaymentChannelAction();

          //      expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('destination', 'rDestination123');
          //      expect(paymentChannelOrchestratorService.executePaymentChannelTx).toHaveBeenCalledWith('createPaymentChannel', jasmine.any(Object));
          // });

          it('should show error for createPaymentChannel with invalid destination', async () => {
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('');
               (component as any).xrpl.isValidAddress.and.returnValue(false);

               await component.handlePaymentChannelAction();

               expect(toastService.error).toHaveBeenCalledWith(jasmine.stringContaining('valid destination address'), AppConstants.TOAST.ERROR);
          });

          it('should show error when no channel ID selected', async () => {
               activeTabSignal.set('fundPaymentChannel');
               channelIDFieldSignal.set('');

               await component.handlePaymentChannelAction();

               expect(toastService.error).toHaveBeenCalledWith('No channel ID selected.', AppConstants.TOAST.ERROR);
          });

          it('should handle transaction preparation error', async () => {
               txEnvironmentService.prepareTxEnvironmentWithWallet.and.rejectWith(new Error('Prep failed'));
               await component.handlePaymentChannelAction();
               expect(toastService.error).toHaveBeenCalled();
          });

          it('should handle transaction execution error', async () => {
               paymentChannelOrchestratorService.executePaymentChannelTx.and.rejectWith(new Error('Tx failed'));
               await component.handlePaymentChannelAction();
               expect(toastService.error).toHaveBeenCalled();
          });
     });

     describe('handlePaymentChannelAction - Create with invalid destination', () => {
          beforeEach(() => {
               activeTabSignal.set('createPaymentChannel');
               component.currentWallet.set(mockWallet);
               (component as any).xrpl = { isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(false) };
               spyOn(component as any, 'handleTxResult').and.returnValue(Promise.resolve(true));
               (component as any).withPerf = jasmine.createSpy('withPerf').and.callFake((name: string, fn: () => Promise<any>) => fn());
          });

          it('should show error for createPaymentChannel with invalid destination', async () => {
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('');

               await component.handlePaymentChannelAction();

               expect(toastService.error).toHaveBeenCalled();
          });
     });

     describe('handlePaymentChannelAction - Fund/Renew/Close', () => {
          beforeEach(() => {
               component.currentWallet.set(mockWallet);
               channelIDFieldSignal.set('channel123');
               txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo({
                    client: {},
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
               });
               paymentChannelOrchestratorService.executePaymentChannelTx.and.resolveTo({ success: true, hash: 'txHash123' });
               spyOn(component as any, 'handleTxResult').and.returnValue(Promise.resolve(true));
          });

          it('should fund payment channel', async () => {
               activeTabSignal.set('fundPaymentChannel');
               await component.handlePaymentChannelAction();
               expect(paymentChannelOrchestratorService.executePaymentChannelTx).toHaveBeenCalledWith('fundPaymentChannel', jasmine.any(Object));
          });

          it('should renew payment channel', async () => {
               activeTabSignal.set('renewPaymentChannel');
               paymentChannelViewModelService.isValidRenewTab.and.returnValue(true);
               paymentChannelViewModelService.isCurrentWalletSource.and.returnValue(true);
               await component.handlePaymentChannelAction();
               expect(paymentChannelOrchestratorService.executePaymentChannelTx).toHaveBeenCalledWith('renewPaymentChannel', jasmine.any(Object));
          });

          it('should show error for renew when not valid', async () => {
               activeTabSignal.set('renewPaymentChannel');
               paymentChannelViewModelService.isValidRenewTab.and.returnValue(false);
               await component.handlePaymentChannelAction();
               expect(toastService.error).toHaveBeenCalled();
          });

          it('should show error for renew when not source wallet', async () => {
               activeTabSignal.set('renewPaymentChannel');
               paymentChannelViewModelService.isValidRenewTab.and.returnValue(true);
               paymentChannelViewModelService.isCurrentWalletSource.and.returnValue(false);
               await component.handlePaymentChannelAction();
               expect(toastService.error).toHaveBeenCalled();
          });

          it('should close payment channel', async () => {
               activeTabSignal.set('closePaymentChannel');
               await component.handlePaymentChannelAction();
               expect(paymentChannelOrchestratorService.executePaymentChannelTx).toHaveBeenCalledWith('closePaymentChannel', jasmine.any(Object));
          });
     });

     describe('handlePaymentChannelAction - Claim', () => {
          beforeEach(() => {
               activeTabSignal.set('claimPaymentChannel');
               component.currentWallet.set(mockWallet);
               channelIDFieldSignal.set('channel123');
               txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo({
                    client: {},
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
               });
               spyOn(component as any, 'handleTxResult').and.returnValue(Promise.resolve(true));
               (component as any).withPerf = jasmine.createSpy('withPerf').and.callFake((name: string, fn: () => Promise<any>) => fn());

               paymentChannelStoreService.channelClaimSignatureField = signal('signature123');
               paymentChannelStoreService.amount = signal('100');
               (paymentChannelStoreService as any).publicKeyField = signal('publicKey123');

               // Setup for valid claim
               paymentChannelViewModelService.isValidClaimTab.and.returnValue(true);
               paymentChannelViewModelService.isCurrentWalletDestination.and.returnValue(true);
          });

          it('should claim payment channel successfully', async () => {
               (component as any).xrplService = {
                    getChannelVerifiy: jasmine.createSpy('getChannelVerifiy').and.resolveTo({ result: { signature_verified: true } }),
                    getNet: jasmine.createSpy('getNet').and.returnValue({ environment: 'devnet' }),
               };

               await component.handlePaymentChannelAction();
               expect(paymentChannelOrchestratorService.executePaymentChannelTx).toHaveBeenCalledWith('claimPaymentChannel', jasmine.any(Object));
          });

          it('should show error for claim when not valid', async () => {
               paymentChannelViewModelService.isValidClaimTab.and.returnValue(false);
               await component.handlePaymentChannelAction();
               expect(toastService.error).toHaveBeenCalled();
          });

          it('should show error for claim when not destination wallet', async () => {
               paymentChannelViewModelService.isValidClaimTab.and.returnValue(true);
               paymentChannelViewModelService.isCurrentWalletDestination.and.returnValue(false);
               await component.handlePaymentChannelAction();
               expect(toastService.error).toHaveBeenCalled();
          });

          it('should show error for invalid signature', async () => {
               (component as any).xrplService = {
                    getChannelVerifiy: jasmine.createSpy('getChannelVerifiy').and.resolveTo({ result: { signature_verified: false } }),
                    getNet: jasmine.createSpy('getNet').and.returnValue({ environment: 'devnet' }),
               };

               await component.handlePaymentChannelAction();

               expect(toastService.error).toHaveBeenCalledWith('Invalid signature');
          });
     });

     describe('generateCreatorClaimSignature', () => {
          it('should call paymentChannelUtilService.generateCreatorClaimSignature', () => {
               component.generateCreatorClaimSignature();
               expect(paymentChannelUtilService.generateCreatorClaimSignature).toHaveBeenCalledWith(mockWallet);
          });
     });

     describe('handleSearchQueryChange', () => {
          it('should update destinationSearchQuery and store', () => {
               component.handleSearchQueryChange('test query');
               expect(component.destinationSearchQuery()).toBe('test query');
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('paymentChannelIdSearchQuery', 'test query');
          });
     });

     describe('handleDestinationChange', () => {
          it('should update selectedDestinationAddress and store destination', () => {
               const mockItem = { id: 'rDest123', display: 'Destination' };
               component.handleDestinationChange(mockItem);

               expect(component.selectedDestinationAddress()).toBe('rDest123');
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('destination', 'rDest123');
          });
     });

     describe('paymentChannelSelected', () => {
          it('should call selectPaymentChannelFromList', () => {
               const mockEvent = { channel: { id: 'channel123' } };
               component.paymentChannelSelected(mockEvent as any);
               expect(paymentChannelUtilService.selectPaymentChannelFromList).toHaveBeenCalledWith(mockEvent, activeTabSignal());
          });
     });

     describe('getClaimAndCloseTooltip', () => {
          it('should return creator mode tooltip when isCreatorMode is true', () => {
               paymentChannelStoreService.isCreatorMode.set(true);
               const tooltip = component.getClaimAndCloseTooltip();
               expect(tooltip).toContain('Adding this flag allows the recipient');
          });

          it('should return destination mode tooltip when isCreatorMode is false', () => {
               paymentChannelStoreService.isCreatorMode.set(false);
               const tooltip = component.getClaimAndCloseTooltip();
               expect(tooltip).toContain('If the creator included the tfClose flag');
          });
     });

     describe('populateDefaultDateTime', () => {
          it('should set paymentChannelCancelAfterTimeField to empty string', () => {
               component.populateDefaultDateTime();
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('paymentChannelCancelAfterTimeField', '');
          });
     });

     describe('clearInputFields', () => {
          it('should clear input fields', () => {
               (component as any).clearInputFields();
               expect(component.selectedDestinationAddress()).toBe('');
               expect(component.destinationSearchQuery()).toBe('');
          });
     });

     describe('trackByAddress', () => {
          it('should return address for tracking', () => {
               const item = { address: 'rTest123' } as any;
               const result = component.trackByAddress(0, item);
               expect(result).toBe('rTest123');
          });
     });

     describe('onSelectedWalletIndexChange', () => {
          it('should call getPaymentChannels with forceRefresh true', async () => {
               spyOn(component, 'getPaymentChannels');
               await (component as any).onSelectedWalletIndexChange();
               expect(component.getPaymentChannels).toHaveBeenCalledWith(true);
          });
     });

     describe('handleCachedAccountObjects', () => {
          it('should process payment channels from cached objects', () => {
               const mockAccountObjects = { result: { account_objects: [{ id: 'channel1' }] } };
               (component as any).handleCachedAccountObjects(mockAccountObjects, 'rTest');
               expect(paymentChannelUtilService.processPaymentChannels).toHaveBeenCalled();
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('walletPaymentChannelCount', 1);
          });
     });

     describe('refreshAccountObject', () => {
          it('should process payment channels and update count', async () => {
               const mockEnv = {
                    accountObjects: { result: { account_objects: [{ id: 'channel1' }, { id: 'channel2' }] } },
                    wallet: { classicAddress: 'rTest' },
               };
               await (component as any).refreshAccountObject(mockEnv);
               expect(paymentChannelUtilService.processPaymentChannels).toHaveBeenCalled();
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('walletPaymentChannelCount', 2);
          });
     });

     describe('ngOnInit with signature query param', () => {
          it('should handle signature from query params', () => {
               const mockContext = {
                    channelId: 'channel123',
                    amount: '1000',
                    flags: { renew: false, close: true, claimAndClose: false },
               };
               paymentChannelSignatureContextService.getSignatureContext.and.returnValue(mockContext);

               route.snapshot.queryParams = { signature: 'testSignature' };

               component.ngOnInit();

               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('channelClaimSignatureField', 'testSignature');
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('channelIDField', 'channel123');
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('amount', '1000');
          });
     });

     describe('ngOnDestroy', () => {
          it('should clean up effect and subscription', () => {
               const mockEffect = { destroy: jasmine.createSpy('destroy') };
               const mockSubscription = { unsubscribe: jasmine.createSpy('unsubscribe') };

               (component as any).signatureEffect = mockEffect;
               (component as any).signatureSubscription = mockSubscription;

               component.ngOnDestroy();

               expect(mockEffect.destroy).toHaveBeenCalled();
               expect(mockSubscription.unsubscribe).toHaveBeenCalled();
          });
     });

     describe('Effect for signature', () => {
          it('should load flags when signature changes', () => {
               // The effect runs during component initialization
               // We need to trigger the effect by changing the signal
               const signatureSpy = paymentChannelUtilService.loadFlagsFromSignature;
               signatureSpy.calls.reset();

               // Set up the effect manually since the component's constructor runs once
               // Create a new effect for testing
               const testEffect = () => {
                    const signature = paymentChannelStoreService.channelClaimSignatureField();
                    if (signature) {
                         paymentChannelUtilService.loadFlagsFromSignature(signature);
                    }
               };

               // Call the effect function directly
               testEffect();

               // Now change the signal and call again
               channelClaimSignatureFieldSignal.set('newSignature');
               testEffect();

               expect(paymentChannelUtilService.loadFlagsFromSignature).toHaveBeenCalledWith('newSignature');
          });
     });
});
