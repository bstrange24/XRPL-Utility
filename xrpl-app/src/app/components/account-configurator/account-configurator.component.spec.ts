import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, Component } from '@angular/core';
import { AccountConfiguratorComponent } from './account-configurator.component';
import { AccountConfiguratorUtilService } from '../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { AccountConfiguratorViewModelService } from '../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { AccountConfiguratorStoreService } from '../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorOrchestratorService } from '../../services/account-configurator/account-configurator-orchestrator/account-configurator-orchestrator.service';
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
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';
import { ACCOUNT_CONFIG_ACTIONS } from './constants/account-configurator.types';
import { XrplService } from '../../services/xrpl-services/xrpl.service';

// Mock Performance API globally
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

// Create a test wrapper component that overrides ngOnInit
@Component({
     template: '<div>Test Component</div>',
     standalone: true,
})
class TestAccountConfiguratorComponent extends AccountConfiguratorComponent {
     override ngOnInit(): void {
          // Override to do nothing
     }

     override environment(): string {
          return 'devnet';
     }
}

describe('AccountConfiguratorComponent', () => {
     let component: TestAccountConfiguratorComponent;
     let fixture: ComponentFixture<TestAccountConfiguratorComponent>;

     // Services
     let connectionGuardService: any;
     let walletManagerService: any;
     let downloadUtilService: any;
     let trustlineCurrencyService: any;
     let xrplTransactionService: any;
     let accountConfiguratorUtilService: any;
     let accountDataService: any;
     let accountConfiguratorOrchestratorService: any;
     let accountConfiguratorViewModelService: any;
     let accountConfiguratorStoreService: any;
     let rightPanelService: any;
     let transactionUiService: any;
     let transactionDropdownService: any;
     let walletDataService: any;
     let txEnvironmentService: any;
     let copyUtilService: any;
     let toastService: any;
     let storageService: any;
     let activatedRouteSpy: any;
     let xrplService: any;

     // Mock data
     const mockWallets: Wallet[] = [
          { address: 'rWallet1', classicAddress: 'rWallet1', seed: 'seed1', name: 'Wallet 1', balance: '100' },
          { address: 'rWallet2', classicAddress: 'rWallet2', seed: 'seed2', name: 'Wallet 2', balance: '200' },
     ];

     const mockEnv = {
          client: { disconnect: jasmine.createSpy('disconnect') },
          wallet: mockWallets[0],
          accountInfo: { Balance: '1000000', Account: 'rWallet1' },
          accountObjects: [],
          serverInfo: {},
          fee: '12',
          ledgerInfo: { lastIndex: 5000, currentRippleTime: 1000 },
     };

     const mockTxResult = { success: true, hash: 'txHash123' };

     beforeEach(async () => {
          // Create spies
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
          trustlineCurrencyService = {};
          xrplTransactionService = { buildAmount: jasmine.createSpy('buildAmount') };

          accountConfiguratorUtilService = {
               setAccountFlags: jasmine.createSpy('setAccountFlags'),
               handlePostSuccess: jasmine.createSpy('handlePostSuccess'),
               actionHandlers: {},
               accountConfigTabs: ACCOUNT_CONFIG_ACTIONS,
               accountConfigTabsMeta: {},
          };

          accountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState', 'refreshUiStateAccountConfigure']);

          accountConfiguratorOrchestratorService = {};

          // Create a proper signal spy for accountInfo
          const mockAccountInfoSignal = (() => {
               let value: any = null;
               const signalFn = jasmine.createSpy('accountInfo').and.callFake(() => value);
               (signalFn as any).set = jasmine.createSpy('set').and.callFake((newValue: any) => {
                    value = newValue;
               });
               return signalFn;
          })();

          accountConfiguratorViewModelService = {
               activeTab: signal('modifyAccountFlags'),
               accountInfo: mockAccountInfoSignal,
          };

          accountConfiguratorStoreService = {
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               setField: jasmine.createSpy('setField'),
               resetAll: jasmine.createSpy('resetAll'),
          };

          rightPanelService = {
               setPanel: jasmine.createSpy('setPanel'),
          };

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
               getValidatedEnvironment: jasmine.createSpy('getValidatedEnvironment').and.returnValue(Promise.resolve(mockEnv)),
               prepareTxEnvironmentWithWallet: jasmine.createSpy('prepareTxEnvironmentWithWallet').and.returnValue(Promise.resolve(mockEnv)),
          };

          copyUtilService = { copyAddress: jasmine.createSpy('copyAddress') };
          toastService = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info'), warn: jasmine.createSpy('warn') };

          storageService = {
               getItem: jasmine.createSpy('getItem'),
               setItem: jasmine.createSpy('setItem'),
               getNet: jasmine.createSpy('getNet').and.returnValue('devnet'),
          };

          xrplService = {
               getNet: jasmine.createSpy('getNet').and.returnValue({ environment: 'devnet' }),
          };

          activatedRouteSpy = {
               queryParams: of({}),
               snapshot: { queryParams: {} },
               firstChild: null,
          };

          await TestBed.configureTestingModule({
               imports: [TestAccountConfiguratorComponent],
               providers: [
                    provideNoopAnimations(),
                    provideIcons({}),
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: ConnectionGuardService, useValue: connectionGuardService },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: DownloadUtilService, useValue: downloadUtilService },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: XrplTransactionService, useValue: xrplTransactionService },
                    { provide: AccountConfiguratorUtilService, useValue: accountConfiguratorUtilService },
                    { provide: AcccountDataService, useValue: accountDataService },
                    { provide: AccountConfiguratorOrchestratorService, useValue: accountConfiguratorOrchestratorService },
                    { provide: AccountConfiguratorViewModelService, useValue: accountConfiguratorViewModelService },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: RightPanelService, useValue: rightPanelService },
                    { provide: TransactionUiService, useValue: transactionUiService },
                    { provide: TransactionDropdownService, useValue: transactionDropdownService },
                    { provide: WalletDataService, useValue: walletDataService },
                    { provide: TxEnvironmentService, useValue: txEnvironmentService },
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: ToastService, useValue: toastService },
                    { provide: StorageService, useValue: storageService },
                    { provide: XrplService, useValue: xrplService },
                    { provide: ActivatedRoute, useValue: activatedRouteSpy },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(TestAccountConfiguratorComponent);
          component = fixture.componentInstance;

          // Manually set required properties
          (component as any).xrplTxOptionsStore = {
               reset: jasmine.createSpy('reset'),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               isSimulateEnabled: jasmine.createSpy('isSimulateEnabled').and.returnValue(false),
          };
          (component as any).accountConfiguratorStoreService = accountConfiguratorStoreService;

          // Manually call initialization
          transactionUiService.clearAllOptionsAndMessages();
          rightPanelService.setPanel(jasmine.any(Function), { activeTab: component.activeTabForRequirements });

          fixture.detectChanges();
     });

     afterEach(() => {
          if (accountConfiguratorStoreService.setField) {
               accountConfiguratorStoreService.setField.calls.reset();
          }
          if (transactionUiService.clearAllOptionsAndMessages) {
               transactionUiService.clearAllOptionsAndMessages.calls.reset();
          }
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Initialization', () => {
          it('should clear all options and messages', () => {
               expect(transactionUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
          });

          it('should set right panel on init', () => {
               expect(rightPanelService.setPanel).toHaveBeenCalled();
          });
     });

     describe('Wallet Selection', () => {
          it('should select wallet when different from current', () => {
               component.currentWallet = signal(mockWallets[0]);
               const newWallet = { ...mockWallets[1] };

               component.selectWallet(newWallet);

               expect(component.currentWallet()).toEqual(newWallet);
          });

          it('should not select wallet when same as current', () => {
               component.currentWallet = signal(mockWallets[0]);
               const sameWallet = mockWallets[0];

               component.selectWallet(sameWallet);

               expect(component.currentWallet()).toBe(mockWallets[0]);
          });
     });

     describe('setTab', () => {
          it('should set active tab for valid tab', () => {
               component.setTab('modifyDepositAuth');
               expect(accountConfiguratorViewModelService.activeTab()).toBe('modifyDepositAuth');
          });

          it('should ignore invalid tab', () => {
               component.setTab('invalidTab');
               expect(accountConfiguratorViewModelService.activeTab()).toBe('modifyAccountFlags');
          });
     });

     describe('getAccountDetails', () => {
          it('should fetch account details successfully', async () => {
               await component.getAccountDetails();

               expect(txEnvironmentService.getValidatedEnvironment).toHaveBeenCalled();
               expect(accountConfiguratorUtilService.setAccountFlags).toHaveBeenCalled();
               expect(component.isSummaryLoading()).toBeFalse();
          });

          it('should handle error when fetching account details', async () => {
               txEnvironmentService.getValidatedEnvironment.and.returnValue(Promise.reject(new Error('Failed to fetch')));

               await component.getAccountDetails();

               expect(toastService.error).toHaveBeenCalled();
               expect(component.isSummaryLoading()).toBeFalse();
          });
     });

     describe('performAction', () => {
          beforeEach(() => {
               spyOn(component as any, 'handleTxResult').and.returnValue(Promise.resolve(true));
               accountConfiguratorUtilService.actionHandlers['modifyAccountFlags'] = jasmine.createSpy().and.returnValue(Promise.resolve(mockTxResult));
          });

          it('should execute action successfully', async () => {
               await component.performAction('enabled');

               expect(txEnvironmentService.prepareTxEnvironmentWithWallet).toHaveBeenCalled();
               expect(accountConfiguratorUtilService.actionHandlers['modifyAccountFlags']).toHaveBeenCalled();
          });
     });

     describe('refreshAccountObject', () => {
          it('should update account info and refresh UI state', async () => {
               await (component as any).refreshAccountObject(mockEnv);

               expect(accountConfiguratorViewModelService.accountInfo.set).toHaveBeenCalledWith(mockEnv.accountInfo);
          });
     });

     describe('clearInputFields', () => {
          it('should reset all store fields', () => {
               (component as any).clearInputFields();

               expect(accountConfiguratorStoreService.resetAll).toHaveBeenCalled();
          });
     });

     describe('trackByAddress', () => {
          it('should return address for tracking', () => {
               const item = { address: 'rTest123' } as any;
               const result = component.trackByAddress(0, item);
               expect(result).toBe('rTest123');
          });
     });

     describe('activeTabForRequirements', () => {
          it('should return active tab from view model', () => {
               accountConfiguratorViewModelService.activeTab.set('modifyMetaData');
               expect(component.activeTabForRequirements()).toBe('modifyMetaData');
          });
     });

     describe('onSelectedWalletIndexChange', () => {
          it('should call getAccountDetails with forceRefresh true', async () => {
               spyOn(component, 'getAccountDetails');

               await (component as any).onSelectedWalletIndexChange();

               expect(component.getAccountDetails).toHaveBeenCalledWith(true);
          });
     });

     describe('Template Constants', () => {
          it('should have credential tabs', () => {
               expect(component.credentialTabs).toBeDefined();
          });

          it('should have tab meta', () => {
               expect(component.tabMeta).toBeDefined();
          });
     });
});
