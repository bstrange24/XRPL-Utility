import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed, Component } from '@angular/core';
import { PermissionedDomainComponent } from './permissioned-domain.component';
import { PermissionedDomainUtilService } from '../../services/permissioned-domain/permissioned-domain-util/permissioned-domain-util.service';
import { PermissionedDomainOrchestratorService } from '../../services/permissioned-domain/permissioned-domain-orchestrator/permissioned-domain-orchestrator.service';
import { PermissionedDomainViewModelService } from '../../services/permissioned-domain/permissioned-domain-view-model/permissioned-domain-view-model.service';
import { PermissionedDomainStoreService } from '../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { CredentialViewModelService } from '../../services/credentials/credential-view-model/credential-view-model.service';
import { CredentialUtilService } from '../../services/credentials/credential-util/credential-util.service';
import { CredentialStore } from '../../services/credentials/credential-store/credential-store.service';
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
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';
import { PERMISSION_DOMAIN_TAB } from './constants/permissioned-domain.constants';
import { AccountConfiguratorStoreService } from '../../services/account-configurator/account-configurator-store/account-configurator-store.service';

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

// Mock child components
@Component({ selector: 'app-tab-menu-with-info', template: '<div></div>', standalone: true })
class MockTabMenuWithInfo {}

@Component({ selector: 'app-permissioned-domains-summary', template: '<div></div>', standalone: true })
class MockPermissionedDomainsSummary {}

@Component({ selector: 'app-warning-message', template: '<div></div>', standalone: true })
class MockWarningMessage {}

@Component({ selector: 'app-permission-domain-set-form', template: '<div></div>', standalone: true })
class MockPermissionDomainSetForm {}

@Component({ selector: 'app-permission-domain-delete-form', template: '<div></div>', standalone: true })
class MockPermissionDomainDeleteForm {}

@Component({ selector: 'app-transaction-options', template: '<div></div>', standalone: true })
class MockTransactionOptions {}

@Component({ selector: 'app-execution-time-display', template: '<div></div>', standalone: true })
class MockExecutionTimeDisplay {}

@Component({ selector: 'app-transaction-preview', template: '<div></div>', standalone: true })
class MockTransactionPreview {}

// Test wrapper component
@Component({
     template: '<div>Test Component</div>',
     standalone: true,
})
class TestPermissionedDomainComponent extends PermissionedDomainComponent {
     override ngOnInit(): void {}
     override environment(): string {
          return 'devnet';
     }
}

describe('PermissionedDomainComponent', () => {
     let component: TestPermissionedDomainComponent;
     let fixture: ComponentFixture<TestPermissionedDomainComponent>;

     // Services
     let connectionGuardService: any;
     let walletManagerService: any;
     let downloadUtilService: any;
     let xrplTransactionService: any;
     let permissionedDomainUtilService: any;
     let permissionedDomainOrchestratorService: any;
     let credentialUtilService: any;
     let credentialViewModelService: any;
     let permissionedDomainViewModelService: any;
     let permissionedDomainStoreService: any;
     let credentialStore: any;
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

     // Mock data
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
          connectionGuardService = { isConnectionReady: jasmine.createSpy('isConnectionReady').and.returnValue(true) };

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
          xrplTransactionService = { buildAmount: jasmine.createSpy('buildAmount') };

          permissionedDomainUtilService = {
               clearFields: jasmine.createSpy('clearFields'),
               clearInputFields: jasmine.createSpy('clearInputFields'),
               onDomainSelected: jasmine.createSpy('onDomainSelected'),
          };

          permissionedDomainOrchestratorService = {
               executePermissionDomainTx: jasmine.createSpy('executePermissionDomainTx').and.returnValue(Promise.resolve(mockTxResult)),
          };

          credentialUtilService = {};
          credentialViewModelService = {};
          credentialStore = {};

          permissionedDomainViewModelService = {
               activeTab: signal('setPermissionedDomain'),
               infoData: signal({
                    walletName: 'Test Wallet',
                    permissionedDomainCount: 0,
                    permissionedDomainsToShow: [],
                    actionButtonClass: 'btn-primary',
                    actionButtonLabel: 'Set Permissioned Domain',
                    summaryMessage: 'Test summary',
               }),
               getCreatedPermissionedDomains: jasmine.createSpy('getCreatedPermissionedDomains'),
          };

          permissionedDomainStoreService = {
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               setField: jasmine.createSpy('setField'),
               resetDomainDropDown: jasmine.createSpy('resetDomainDropDown'),
               selectedDomainId: signal(''),
               credentialIssuer: signal(''),
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

          accountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState']);
          accountConfiguratorStoreService = {
               multiSigningEnabled: signal(false),
               regularKeySigningEnabled: signal(false),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               resetAll: jasmine.createSpy('resetAll'),
          };

          activatedRouteSpy = {
               queryParams: of({}),
               snapshot: { queryParams: {} },
               firstChild: null,
          };

          await TestBed.configureTestingModule({
               imports: [TestPermissionedDomainComponent],
               providers: [
                    provideNoopAnimations(),
                    provideIcons({}),
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: ConnectionGuardService, useValue: connectionGuardService },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: DownloadUtilService, useValue: downloadUtilService },
                    { provide: XrplTransactionService, useValue: xrplTransactionService },
                    { provide: PermissionedDomainUtilService, useValue: permissionedDomainUtilService },
                    { provide: PermissionedDomainOrchestratorService, useValue: permissionedDomainOrchestratorService },
                    { provide: CredentialUtilService, useValue: credentialUtilService },
                    { provide: CredentialViewModelService, useValue: credentialViewModelService },
                    { provide: PermissionedDomainViewModelService, useValue: permissionedDomainViewModelService },
                    { provide: PermissionedDomainStoreService, useValue: permissionedDomainStoreService },
                    { provide: CredentialStore, useValue: credentialStore },
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
               .overrideComponent(TestPermissionedDomainComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(TestPermissionedDomainComponent);
          component = fixture.componentInstance;

          // Manually set required properties
          (component as any).xrplTxOptionsStore = {
               reset: jasmine.createSpy('reset'),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               isSimulateEnabled: jasmine.createSpy('isSimulateEnabled').and.returnValue(false),
          };
          (component as any).accountConfiguratorStoreService = accountConfiguratorStoreService;

          fixture.detectChanges();
     });

     afterEach(() => {
          if (permissionedDomainStoreService.setField) {
               permissionedDomainStoreService.setField.calls.reset();
          }
          if (transactionUiService.clearAllOptionsAndMessages) {
               transactionUiService.clearAllOptionsAndMessages.calls.reset();
          }
          if (permissionedDomainOrchestratorService.executePermissionDomainTx) {
               permissionedDomainOrchestratorService.executePermissionDomainTx.calls.reset();
          }
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Initialization', () => {
          it('should clear all options and messages', () => {
               expect(transactionUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
          });

          // it('should set right panel', () => {
          //      expect(rightPanelService.setPanel).toHaveBeenCalled();
          // });
     });

     describe('setTab', () => {
          it('should set active tab for valid tab', async () => {
               spyOn(component, 'getPermissionedDomainForAccount');
               await component.setTab('deletePermissionedDomain');
               expect(permissionedDomainViewModelService.activeTab()).toBe('deletePermissionedDomain');
          });

          it('should ignore invalid tab', async () => {
               await component.setTab('invalidTab');
               expect(permissionedDomainViewModelService.activeTab()).toBe('setPermissionedDomain');
          });
     });

     describe('getPermissionedDomainForAccount', () => {
          it('should fetch permissioned domains successfully', async () => {
               await component.getPermissionedDomainForAccount();
               expect(txEnvironmentService.getValidatedEnvironment).toHaveBeenCalled();
               expect(component.isSummaryLoading()).toBeFalse();
          });

          it('should handle error when fetching', async () => {
               txEnvironmentService.getValidatedEnvironment.and.returnValue(Promise.reject(new Error('Fetch failed')));
               await component.getPermissionedDomainForAccount();
               expect(toastService.error).toHaveBeenCalled();
          });
     });

     describe('performAction', () => {
          beforeEach(() => {
               spyOn(component as any, 'handleTxResult').and.returnValue(Promise.resolve(true));
               (component as any).withPerf = jasmine.createSpy('withPerf').and.callFake((name: string, fn: () => Promise<any>) => fn());
          });

          it('should execute setPermissionedDomain action', async () => {
               permissionedDomainViewModelService.activeTab.set('setPermissionedDomain');
               component.setFormComponent = {
                    getAllCredentialsForSubmit: jasmine.createSpy('getAllCredentialsForSubmit').and.returnValue([{ issuer: 'rIssuer', credentialType: 'KYC' }]),
               } as any;

               await component.performAction();
               expect(permissionedDomainOrchestratorService.executePermissionDomainTx).toHaveBeenCalled();
          });

          it('should show error when no credentials for setPermissionedDomain', async () => {
               permissionedDomainViewModelService.activeTab.set('setPermissionedDomain');
               component.setFormComponent = {
                    getAllCredentialsForSubmit: jasmine.createSpy('getAllCredentialsForSubmit').and.returnValue([]),
               } as any;

               await component.performAction();
               expect(toastService.error).toHaveBeenCalled();
          });

          it('should execute deletePermissionedDomain action', async () => {
               permissionedDomainViewModelService.activeTab.set('deletePermissionedDomain');
               permissionedDomainStoreService.selectedDomainId.set('domain123');
               txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo({
                    ...mockEnv,
                    accountObjects: { result: { account_objects: [{ LedgerEntryType: 'PermissionedDomain', index: 'domain123' }] } },
               });

               await component.performAction();
               expect(permissionedDomainOrchestratorService.executePermissionDomainTx).toHaveBeenCalled();
          });

          it('should show error when no domain selected for delete', async () => {
               permissionedDomainViewModelService.activeTab.set('deletePermissionedDomain');
               permissionedDomainStoreService.selectedDomainId.set('');

               await component.performAction();
               expect(toastService.error).toHaveBeenCalled();
          });
     });

     describe('selectWallet', () => {
          it('should select wallet when different from current', () => {
               component.currentWallet = signal(mockWallets[0]);
               const newWallet = { ...mockWallets[1] };
               component.selectWallet(newWallet);
               expect(component.currentWallet()).toEqual(newWallet);
          });
     });

     describe('handleSearchQueryChange', () => {
          it('should update search query', () => {
               component.handleSearchQueryChange('test');
               expect(component.destinationSearchQuery()).toBe('test');
               expect(permissionedDomainStoreService.setField).toHaveBeenCalledWith('credentialIdSearchQuery', 'test');
          });
     });

     describe('handleDestinationChange', () => {
          it('should update destination', () => {
               const item = { id: 'rDestination', display: 'Dest' };
               component.handleDestinationChange(item);
               expect(component.selectedDestinationAddress()).toBe('rDestination');
               expect(permissionedDomainStoreService.setField).toHaveBeenCalledWith('subject', 'rDestination');
          });
     });

     describe('toggleSummaryPanel', () => {
          it('should toggle summary expanded', () => {
               const initial = component.summaryExpanded();
               component.toggleSummaryPanel();
               expect(component.summaryExpanded()).toBe(!initial);
          });
     });

     describe('clearInputFields', () => {
          it('should clear input fields', () => {
               component.destinationSearchQuery.set('test');
               component.selectedDestinationAddress.set('rTest');
               (component as any).clearInputFields();
               expect(component.destinationSearchQuery()).toBe('');
               expect(component.selectedDestinationAddress()).toBe('');
          });
     });

     describe('activeTabForRequirements', () => {
          it('should return active tab', () => {
               expect(component.activeTabForRequirements()).toBe('setPermissionedDomain');
          });
     });
});
