import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { SendChecksComponent } from './checks.component';
import { ChecksStoreService } from '../../services/checks/checks-store/checks-store.service';
import { ChecksTransactionViewModelService } from '../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { CheckUtilService } from '../../services/checks/checks-util/check-util.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-util/trustline-currency.service';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { ValidationService } from '../../services/utils/validation/transaction-validation-rule.service';
import { XrplTransactionOrchestratorService } from '../../services/xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplDateService } from '../../core/xrpl-date.service';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';

describe('SendChecksComponent', () => {
     let component: SendChecksComponent;
     let fixture: ComponentFixture<SendChecksComponent>;

     const mockWallet = { address: 'rTEST', classicAddress: 'rTEST', name: 'Test', seed: '' } as any;

     const walletManagerMock = {
          wallets: signal([mockWallet]),
          wallets$: of([mockWallet]),
          hasWallets$: of(true),
          hasWalletsFromWallets$: of(true),
          selectedIndex$: of(0),
          getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
          getSelectedIndex: jasmine.createSpy('getSelectedIndex').and.returnValue(0),
          ensureWalletSelected: jasmine.createSpy('ensureWalletSelected').and.returnValue(true),
     };

     const txUiMock = {
          currentStep: signal('idle'),
          stepMessage: jasmine.createSpy('stepMessage').and.returnValue(''),
          spinner: signal(false),
          wantsOptions: signal(false),
          infoPanelExpanded: signal(false),
          explorerUrl: signal('https://testnet.xrpl.org/'),
          clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
          clearAllFields: jasmine.createSpy('clearAllFields'),
          resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
          setTxResultSignal: jasmine.createSpy('setTxResultSignal'),
          txResultSignal: signal([]),
          successMessageSignal: signal(''),
          errorMessageSignal: signal(null),
          isSummaryLoading: signal(false),
          isSummaryLoadingSignal: signal(false),
     };

     const vmMock = {
          activeTab: signal('createCheck'),
          checkCount: signal(0),
          checksToShow: signal([]),
          explorerLinks: signal(null),
          infoData: signal(null),
          selectedCheckItem: signal(null),
          selectedCheckIsExpired: signal(false),
          checkItems: signal([]),
          createCheckButtonLabel: signal('Create Check'),
          cashCheckButtonLabel: signal('Cash Check'),
          cancelCheckButtonLabel: signal('Cancel Check'),
          checkIdDisplay: signal(''),
          checkIdInputDisplay: signal(''),
          filteredCheckIds: signal([]),
          currencyItems: signal([]),
          issuerItems: signal([]),
          selectedCurrencyItem: signal(null),
          selectedIssuerItem: signal(null),
          checksStoreService: null as any,
     };

     const dropdownMock = {
          setupAutoSelectOnValidTypedAddress: jasmine.createSpy('setupAutoSelectOnValidTypedAddress'),
          loadCustomDestinations: jasmine.createSpy('loadCustomDestinations'),
          destinationItems: signal([]),
          getFinalDestinationAddress: jasmine.createSpy('getFinalDestinationAddress').and.returnValue(''),
     };

     const trustlineCurrencyMock = {
          load: jasmine.createSpy('load'),
          selectCurrency: jasmine.createSpy('selectCurrency'),
          selectIssuer: jasmine.createSpy('selectIssuer'),
          refreshCurrentBalance: jasmine.createSpy('refreshCurrentBalance'),
          preferXrpAsDefault: signal(false),
          addXrpInCurrencyDropdown: signal(false),
          addMptInCurrencyDropdown: signal(false),
          currencyItems: signal([]),
          issuerItems: signal([]),
          getExistingIOUs: jasmine.createSpy('getExistingIOUs').and.returnValue([]),
     };

     const toastMock = { error: jasmine.createSpy('error'), success: jasmine.createSpy('success') };
     const storeMock = {
          get: jasmine.createSpy('get').and.returnValue(null),
          set: jasmine.createSpy('set'),
          removeValue: jasmine.createSpy('removeValue'),
          getNet: jasmine.createSpy('getNet').and.returnValue({ environment: 'testnet' }),
          getNetworkColor: jasmine.createSpy('getNetworkColor').and.returnValue('#00f'),
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [SendChecksComponent],
               providers: [
                    provideRouter([]),
                    ChecksStoreService,
                    { provide: WalletManagerService, useValue: walletManagerMock },
                    { provide: TransactionUiService, useValue: txUiMock },
                    { provide: ChecksTransactionViewModelService, useValue: vmMock },
                    { provide: ToastService, useValue: toastMock },
                    { provide: StorageService, useValue: storeMock },
                    { provide: CheckTransactionOrchestrator, useValue: { executeCredentialTx: jasmine.createSpy().and.resolveTo({ success: true }) } },
                    { provide: CheckUtilService, useValue: { getExistingChecks: () => [], getCashableChecks: () => [], getCancelableChecks: () => [], onCheckSelected: jasmine.createSpy(), onCheckSelectedInUi: jasmine.createSpy(), isCheckExpired: () => false, mapCheckItems: () => signal([]), filteredCheckItems: () => signal([]), checkIdDisplay: () => signal('') } },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyMock },
                    { provide: CurrencyStoreService, useValue: { currency: signal('XRP'), issuer: signal(''), currencyCode: signal('XRP'), currencyIssuer: signal(''), resetOptions: jasmine.createSpy('resetOptions'), setField: jasmine.createSpy('setField'), getAll: jasmine.createSpy('getAll').and.returnValue({}) } },
                    { provide: TrustlineStoreService, useValue: { outstandingIOUCollapsed: signal(false), setField: jasmine.createSpy('setField'), reset: jasmine.createSpy('reset'), getAll: jasmine.createSpy('getAll').and.returnValue({}) } },
                    { provide: TrustlineUtilService, useValue: { loadTrustlines: jasmine.createSpy().and.resolveTo() } },
                    { provide: ValidationService, useValue: { validate: jasmine.createSpy().and.resolveTo([]) } },
                    { provide: XrplTransactionOrchestratorService, useValue: {} },
                    { provide: XrplTransactionService, useValue: { waitForFinalOutcome: jasmine.createSpy().and.resolveTo({}), processTxFinalResult: jasmine.createSpy(), processTxError: jasmine.createSpy() } },
                    { provide: TxEnvironmentService, useValue: { getValidatedEnvironment: jasmine.createSpy().and.resolveTo(null), prepareTxEnvironmentWithWallet: jasmine.createSpy().and.resolveTo(null) } },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy() } },
                    { provide: XrplTransactionExecutorService, useValue: {} },
                    { provide: WalletDataService, useValue: { refreshWallets: jasmine.createSpy().and.resolveTo() } },
                    { provide: AcccountDataService, useValue: { refreshUiState: jasmine.createSpy(), loadAccountData: jasmine.createSpy() } },
                    { provide: TransactionDropdownService, useValue: dropdownMock },
                    { provide: XrplDateService, useValue: {} },
                    { provide: MptUtilService, useValue: {} },
                    { provide: ConnectionGuardService, useValue: { isConnected: signal(true) } },
                    {
                         provide: ActivatedRoute,
                         useValue: {
                              params: of({}),
                              queryParams: of({}),
                              fragment: of(null),
                              data: of({}),
                              snapshot: { params: {}, queryParams: {}, data: {} },
                         },
                    },
               ],
          })
               .overrideComponent(NavbarComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(SendChecksComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          await fixture.whenStable();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('setTab', () => {
          it('should set activeTab to valid tab value', async () => {
               await component.setTab('cashCheck');
               expect(vmMock.activeTab()).toBe('cashCheck');
          });

          it('should ignore invalid tab values', async () => {
               vmMock.activeTab.set('createCheck');
               await component.setTab('invalidTab');
               expect(vmMock.activeTab()).toBe('createCheck');
          });
     });

     describe('toggleOutstandingChecks', () => {
          it('should toggle outstandingChecksCollapsed', () => {
               const checksStore = TestBed.inject(ChecksStoreService);
               checksStore.setField('outstandingChecksCollapsed', false);
               component.toggleOutstandingChecks();
               expect(checksStore.outstandingChecksCollapsed()).toBeTrue();
               component.toggleOutstandingChecks();
               expect(checksStore.outstandingChecksCollapsed()).toBeFalse();
          });
     });

     describe('toggleOptions', () => {
          it('should set wantsOptions to true', () => {
               component.toggleOptions(true);
               expect(txUiMock.wantsOptions()).toBeTrue();
          });

          it('should set wantsOptions to false', () => {
               component.toggleOptions(false);
               expect(txUiMock.wantsOptions()).toBeFalse();
          });
     });

     describe('toggleExpiration', () => {
          it('should enable expiration date', () => {
               const checksStore = TestBed.inject(ChecksStoreService);
               component.toggleExpiration(true);
               expect(checksStore.enableExpirationDate()).toBeTrue();
          });

          it('should clear checkExpirationDate when disabled', () => {
               const checksStore = TestBed.inject(ChecksStoreService);
               checksStore.setField('checkExpirationDate', '2026-06-01');
               component.toggleExpiration(false);
               expect(checksStore.enableExpirationDate()).toBeFalse();
               expect(checksStore.checkExpirationDate()).toBe('');
          });
     });

     describe('handleSearchQueryChange', () => {
          it('should update destinationSearchQuery and checkIdSearchQuery', () => {
               const checksStore = TestBed.inject(ChecksStoreService);
               component.handleSearchQueryChange('test query');
               expect(component.destinationSearchQuery()).toBe('test query');
               expect(checksStore.checkIdSearchQuery()).toBe('test query');
          });
     });

     describe('handleDestinationChange', () => {
          it('should update selectedDestinationAddress and destination', () => {
               const checksStore = TestBed.inject(ChecksStoreService);
               component.handleDestinationChange({ id: 'rDEST', display: 'rDEST', isCurrentAccount: false, secondary: '' });
               expect(component.selectedDestinationAddress()).toBe('rDEST');
               expect(checksStore.destination()).toBe('rDEST');
          });

          it('should clear address when item is null', () => {
               const checksStore = TestBed.inject(ChecksStoreService);
               component.handleDestinationChange(null);
               expect(component.selectedDestinationAddress()).toBe('');
               expect(checksStore.destination()).toBe('');
          });
     });

     describe('populateDefaultDateTime', () => {
          it('should clear checkExpirationDate', () => {
               const checksStore = TestBed.inject(ChecksStoreService);
               checksStore.setField('checkExpirationDate', '2026-01-01');
               component.populateDefaultDateTime();
               expect(checksStore.checkExpirationDate()).toBe('');
          });
     });

     describe('clearInputFields', () => {
          it('should reset destinationSearchQuery', () => {
               component.destinationSearchQuery.set('some search');
               (component as any).clearInputFields();
               expect(component.destinationSearchQuery()).toBe('');
          });

          it('should reset selectedDestinationAddress', () => {
               component.selectedDestinationAddress.set('rDEST');
               (component as any).clearInputFields();
               expect(component.selectedDestinationAddress()).toBe('');
          });
     });
});