import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component, effect } from '@angular/core';
import { CreateOfferComponent } from './offer.component';
import { OfferStoreService } from '../../services/offer/offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { OfferTransactionOrchestratorService } from '../../services/offer/offer-transaction-orchestrator/offer-transaction-orchestrator.service';
import { OfferUtilsService } from '../../services/offer/offer-utils/offer-utils.service';
import { OfferCurrencyService } from '../../services/offer/offer-currency/offer-currency.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { AccountConfiguratorStoreService } from '../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';
import { OFFER_TX_TYPES } from './constants/offer.constants';
import { SelectItem } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';

// Mock child components
@Component({ selector: 'app-tab-menu-with-info', template: '<div></div>', standalone: true })
class MockTabMenuWithInfo {}

@Component({ selector: 'app-offer-summary', template: '<div></div>', standalone: true })
class MockOfferSummary {}

@Component({ selector: 'app-warning-message', template: '<div></div>', standalone: true })
class MockWarningMessage {}

@Component({ selector: 'app-offer-fields', template: '<div></div>', standalone: true })
class MockOfferFields {}

@Component({ selector: 'app-transaction-options', template: '<div></div>', standalone: true })
class MockTransactionOptions {}

@Component({ selector: 'app-execution-time-display', template: '<div></div>', standalone: true })
class MockExecutionTimeDisplay {}

@Component({ selector: 'app-transaction-preview', template: '<div></div>', standalone: true })
class MockTransactionPreview {}

// Mock Performance API
beforeAll(() => {
     const mockPerformance = {
          mark: jasmine.createSpy('mark'),
          measure: jasmine.createSpy('measure'),
          clearMarks: jasmine.createSpy('clearMarks'),
          clearMeasures: jasmine.createSpy('clearMeasures'),
          getEntriesByName: jasmine.createSpy('getEntriesByName').and.returnValue([{ duration: 123.45 } as PerformanceEntry]),
     };
     Object.defineProperty(window, 'performance', {
          value: mockPerformance,
          configurable: true,
          writable: true,
     });
});

// Test wrapper component
@Component({
     template: '<div>Test Component</div>',
     standalone: true,
})
class TestCreateOfferComponent extends CreateOfferComponent {
     override ngOnInit(): void {}
     override environment(): string {
          return 'devnet';
     }
}

describe('CreateOfferComponent', () => {
     let component: TestCreateOfferComponent;
     let fixture: ComponentFixture<TestCreateOfferComponent>;

     // Services
     let connectionGuardService: any;
     let walletManagerService: any;
     let downloadUtilService: any;
     let trustlineCurrencyService: any;
     let offerCurrencyService: any;
     let offerStoreService: any;
     let offerTransactionViewModelService: any;
     let accountConfiguratorStore: any;
     let offerTransactionOrchestratorService: any;
     let offerUtilsService: any;
     let rightPanelService: any;
     let transactionUiService: any;
     let transactionDropdownService: any;
     let walletDataService: any;
     let txEnvironmentService: any;
     let copyUtilService: any;
     let toastService: any;
     let accountDataService: any;
     let storageService: any;
     let activatedRouteSpy: any;
     let accountConfiguratorStoreService: any;

     const mockWallets: Wallet[] = [
          { address: 'rWallet1', classicAddress: 'rWallet1', seed: 'seed1', name: 'Wallet 1', balance: '100' },
          { address: 'rWallet2', classicAddress: 'rWallet2', seed: 'seed2', name: 'Wallet 2', balance: '200' },
     ];

     const mockEnv = {
          client: { disconnect: jasmine.createSpy('disconnect') },
          wallet: mockWallets[0],
          accountInfo: { Balance: '1000000', Account: 'rWallet1' },
          accountObjects: { result: { account_objects: [] } },
          fee: '12',
          ledgerInfo: { lastIndex: 5000, currentRippleTime: 1000 },
     };

     const mockTxResult = { success: true, hash: 'txHash123' };

     beforeEach(async () => {
          connectionGuardService = { checkConnection: jasmine.createSpy('checkConnection') };

          walletManagerService = {
               wallets: signal([...mockWallets]),
               selectedIndex: signal(0),
               hasWallets: signal(true),
               getSelectedIndex: jasmine.createSpy('getSelectedIndex').and.returnValue(0),
               setSelectedIndex: jasmine.createSpy('setSelectedIndex'),
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallets[0]),
               ensureWalletSelected: jasmine.createSpy('ensureWalletSelected').and.returnValue(true),
               deleteWallet: jasmine.createSpy('deleteWallet'),
               isEditing: jasmine.createSpy('isEditing').and.returnValue(false),
          };

          downloadUtilService = { download: jasmine.createSpy('download') };
          trustlineCurrencyService = { refreshCurrentBalance: jasmine.createSpy('refreshCurrentBalance') };

          offerCurrencyService = {
               weWant: { currency: signal(''), issuer: signal('') },
               weSpend: { currency: signal(''), issuer: signal('') },
               setWalletAddress: jasmine.createSpy('setWalletAddress'),
               refreshBothBalances: jasmine.createSpy('refreshBothBalances').and.returnValue(Promise.resolve()),
               selectWeWantCurrency: jasmine.createSpy('selectWeWantCurrency'),
               selectWeWantIssuer: jasmine.createSpy('selectWeWantIssuer').and.returnValue(Promise.resolve()),
               selectWeSpendCurrency: jasmine.createSpy('selectWeSpendCurrency'),
               selectWeSpendIssuer: jasmine.createSpy('selectWeSpendIssuer').and.returnValue(Promise.resolve()),
          };

          offerStoreService = {
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               setField: jasmine.createSpy('setField'),
          };

          offerTransactionViewModelService = {
               activeTab: signal('createOffer'),
               weWantCurrency: signal(''),
               weSpendCurrency: signal(''),
               weWantIssuersTrigger: signal(0),
               weSpendIssuersTrigger: signal(0),
          };

          accountConfiguratorStore = { multiSigningEnabled: signal(false), regularKeySigningEnabled: signal(false) };

          offerTransactionOrchestratorService = {
               executeOfferTx: jasmine.createSpy('executeOfferTx').and.returnValue(Promise.resolve(mockTxResult)),
          };

          offerUtilsService = {
               clearInputFields: jasmine.createSpy('clearInputFields'),
               getExistingOffers: jasmine.createSpy('getExistingOffers'),
               fetchOrderBook: jasmine.createSpy('fetchOrderBook').and.returnValue(Promise.resolve()),
               onWeWantAmountChange: jasmine.createSpy('onWeWantAmountChange'),
               onWeSpendAmountChange: jasmine.createSpy('onWeSpendAmountChange'),
               invertOrder: jasmine.createSpy('invertOrder'),
               actionButtonClass: signal('btn-primary'),
               actionButtonLabel: signal('Create Offer'),
          };

          rightPanelService = { setPanel: jasmine.createSpy('setPanel') };

          transactionUiService = {
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               wantsOptions: signal(false),
               toggleOptions: jasmine.createSpy('toggleOptions'),
               warningMessage: '',
               txResultSignal: signal(null),
               currentStep: signal('idle'),
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               setWarning: jasmine.createSpy('setWarning'),
               setError: jasmine.createSpy('setError'),
               setInfoMessage: jasmine.createSpy('setInfoMessage'),
               clearTxResultsHash: jasmine.createSpy('clearTxResultsHash'),
               explorerUrl: signal('https://testnet.xrpl.org/'),
               clearAllFields: jasmine.createSpy('clearAllFields'),
          };

          transactionDropdownService = {
               customDestinations: signal([]),
               allDestinations: jasmine.createSpy('allDestinations').and.returnValue(signal([])),
               destinationMap: jasmine.createSpy('destinationMap').and.returnValue(signal(new Map())),
               destinationItems: jasmine.createSpy('destinationItems').and.returnValue(signal([])),
               selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(signal(null)),
               filteredDestinations: jasmine.createSpy('filteredDestinations').and.returnValue(signal([])),
               destinationDisplay: jasmine.createSpy('destinationDisplay').and.returnValue(signal('')),
               setupAutoSelectOnValidTypedAddress: jasmine.createSpy('setupAutoSelectOnValidTypedAddress'),
               loadCustomDestinations: jasmine.createSpy('loadCustomDestinations'),
               getFinalDestinationAddress: jasmine.createSpy('getFinalDestinationAddress').and.returnValue('rDestination'),
          };

          walletDataService = { refreshWallets: jasmine.createSpy('refreshWallets') };

          txEnvironmentService = {
               prepareTxEnvironmentWithWallet: jasmine.createSpy('prepareTxEnvironmentWithWallet').and.returnValue(Promise.resolve(mockEnv)),
          };

          copyUtilService = { copyAddress: jasmine.createSpy('copyAddress') };
          toastService = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info'), warn: jasmine.createSpy('warn') };

          storageService = { getItem: jasmine.createSpy('getItem'), setItem: jasmine.createSpy('setItem'), getNet: jasmine.createSpy('getNet').and.returnValue('devnet') };

          accountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState']);

          accountConfiguratorStoreService = {
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               resetAll: jasmine.createSpy('resetAll'),
               multiSigningEnabled: jasmine.createSpy('multiSigningEnabled').and.returnValue(false),
               regularKeySigningEnabled: jasmine.createSpy('regularKeySigningEnabled').and.returnValue(false),
          };

          activatedRouteSpy = {
               queryParams: of({}),
               snapshot: { queryParams: {} },
               firstChild: null,
          };

          await TestBed.configureTestingModule({
               imports: [TestCreateOfferComponent],
               providers: [
                    provideNoopAnimations(),
                    provideIcons({}),
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: ConnectionGuardService, useValue: connectionGuardService },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: DownloadUtilService, useValue: downloadUtilService },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: OfferCurrencyService, useValue: offerCurrencyService },
                    { provide: OfferStoreService, useValue: offerStoreService },
                    { provide: OfferTransactionViewModelService, useValue: offerTransactionViewModelService },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStore },
                    { provide: OfferTransactionOrchestratorService, useValue: offerTransactionOrchestratorService },
                    { provide: OfferUtilsService, useValue: offerUtilsService },
                    { provide: RightPanelService, useValue: rightPanelService },
                    { provide: TransactionUiService, useValue: transactionUiService },
                    { provide: TransactionDropdownService, useValue: transactionDropdownService },
                    { provide: WalletDataService, useValue: walletDataService },
                    { provide: TxEnvironmentService, useValue: txEnvironmentService },
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: ToastService, useValue: toastService },
                    { provide: AcccountDataService, useValue: accountDataService },
                    { provide: StorageService, useValue: storageService },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: ActivatedRoute, useValue: activatedRouteSpy },
               ],
          })
               .overrideComponent(TestCreateOfferComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(TestCreateOfferComponent);
          component = fixture.componentInstance;

          (component as any).xrplTxOptionsStore = {
               reset: jasmine.createSpy('reset'),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               isSimulateEnabled: jasmine.createSpy('isSimulateEnabled').and.returnValue(false),
          };
          (component as any).accountConfiguratorStoreService = accountConfiguratorStoreService;

          fixture.detectChanges();
     });

     afterEach(() => {
          if (offerStoreService.setField) {
               offerStoreService.setField.calls.reset();
          }
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Initialization', () => {
          it('should clear all options and messages', () => {
               expect(transactionUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
          });

          it('should set right panel', () => {
               expect(rightPanelService.setPanel).toHaveBeenCalled();
          });
     });

     describe('setTab', () => {
          it('should set active tab for valid tab', async () => {
               await component.setTab('cancelOffer');
               expect(offerTransactionViewModelService.activeTab()).toBe('cancelOffer');
          });

          it('should ignore invalid tab', async () => {
               await component.setTab('invalidTab');
               expect(offerTransactionViewModelService.activeTab()).toBe('createOffer');
          });
     });

     describe('selectWallet', () => {
          it('should select wallet when different from current', async () => {
               component.currentWallet = signal(mockWallets[0]);
               const newWallet = { ...mockWallets[1] };
               await component.selectWallet(newWallet);
               expect(component.currentWallet()).toEqual(newWallet);
          });
     });

     describe('performAction', () => {
          beforeEach(() => {
               spyOn(component as any, 'handleTxResult').and.returnValue(Promise.resolve(true));
          });

          it('should execute createOffer action', async () => {
               offerTransactionViewModelService.activeTab.set('createOffer');
               await component.performAction();
               expect(txEnvironmentService.prepareTxEnvironmentWithWallet).toHaveBeenCalled();
               expect(offerTransactionOrchestratorService.executeOfferTx).toHaveBeenCalled();
          });

          it('should fetch order book for getOrderBook tab', async () => {
               offerTransactionViewModelService.activeTab.set('getOrderBook');
               await component.performAction();
               expect(offerUtilsService.fetchOrderBook).toHaveBeenCalled();
          });

          it('should handle transaction error', async () => {
               offerTransactionOrchestratorService.executeOfferTx.and.returnValue(Promise.reject(new Error('Tx failed')));
               offerTransactionViewModelService.activeTab.set('createOffer');
               await component.performAction();
               expect(toastService.error).toHaveBeenCalled();
          });
     });

     describe('Currency Selection Handlers', () => {
          const mockItem: SelectItem = { id: 'USD', display: 'USD' };

          it('should handle weWantCurrencySelected', () => {
               component.onWeWantCurrencySelected(mockItem);
               expect(offerCurrencyService.selectWeWantCurrency).toHaveBeenCalledWith('USD', component.currentWallet());
          });

          it('should handle weWantIssuerSelected', async () => {
               await component.onWeWantIssuerSelected(mockItem);
               expect(offerCurrencyService.selectWeWantIssuer).toHaveBeenCalled();
          });

          it('should handle weSpendCurrencySelected', () => {
               component.onWeSpendCurrencySelected(mockItem);
               expect(offerCurrencyService.selectWeSpendCurrency).toHaveBeenCalledWith('USD', component.currentWallet());
          });

          it('should handle weSpendIssuerSelected', async () => {
               await component.onWeSpendIssuerSelected(mockItem);
               expect(offerCurrencyService.selectWeSpendIssuer).toHaveBeenCalled();
          });

          it('should handle null selection', () => {
               component.onWeWantCurrencySelected(null);
               expect(offerCurrencyService.selectWeWantCurrency).toHaveBeenCalledWith('XRP', component.currentWallet());
          });
     });

     describe('Amount Change Handlers', () => {
          it('should handle weWantAmountChange', () => {
               component.handleWeWantAmountChange();
               expect(offerUtilsService.onWeWantAmountChange).toHaveBeenCalled();
          });

          it('should handle weSpendAmountChange', () => {
               component.handleWeSpendAmountChange();
               expect(offerUtilsService.onWeSpendAmountChange).toHaveBeenCalled();
          });
     });

     describe('invertOrder', () => {
          it('should call invertOrder on utils service', () => {
               component.invertOrder();
               expect(offerUtilsService.invertOrder).toHaveBeenCalled();
          });
     });

     describe('clearInputFields', () => {
          it('should clear all fields', () => {
               component.selectedDestinationAddress.set('rTest');
               component.destinationSearchQuery.set('test');
               (component as any).clearInputFields();
               expect(offerUtilsService.clearInputFields).toHaveBeenCalled();
               expect(component.selectedDestinationAddress()).toBe('');
               expect(component.destinationSearchQuery()).toBe('');
          });
     });

     describe('toggleInfoPanel', () => {
          it('should toggle info panel expanded state', () => {
               component.infoPanelExpanded.set(false);
               component.toggleInfoPanel();
               expect(component.infoPanelExpanded()).toBeTrue();
               component.toggleInfoPanel();
               expect(component.infoPanelExpanded()).toBeFalse();
          });
     });

     describe('onAccountChange', () => {
          it('should fetch account details successfully', async () => {
               await component.onAccountChange();
               expect(txEnvironmentService.prepareTxEnvironmentWithWallet).toHaveBeenCalled();
               expect(offerUtilsService.getExistingOffers).toHaveBeenCalled();
          });

          it('should handle error', async () => {
               txEnvironmentService.prepareTxEnvironmentWithWallet.and.returnValue(Promise.reject(new Error('Failed')));
               await component.onAccountChange();
               expect(toastService.error).toHaveBeenCalled();
          });
     });

     describe('refreshAccountObject', () => {
          it('should get existing offers', async () => {
               await (component as any).refreshAccountObject(mockEnv);
               expect(offerUtilsService.getExistingOffers).toHaveBeenCalled();
          });
     });

     describe('handleCachedAccountObjects', () => {
          it('should get existing offers from cached objects', () => {
               (component as any).handleCachedAccountObjects({ result: { account_objects: [] } }, 'rTest');
               expect(offerUtilsService.getExistingOffers).toHaveBeenCalled();
          });
     });

     describe('Template Constants', () => {
          it('should have tabs defined', () => {
               expect(component.tabs).toBeDefined();
          });

          it('should have tab meta defined', () => {
               expect(component.tabMeta).toBeDefined();
          });
     });
});
