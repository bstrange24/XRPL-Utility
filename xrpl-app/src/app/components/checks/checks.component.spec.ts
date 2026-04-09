import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal, NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { SendChecksComponent } from './checks.component';
import { ChecksStoreService } from '../../services/checks/checks-store/checks-store.service';
import { ChecksTransactionViewModelService } from '../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { CheckUtilService } from '../../services/checks/checks-util/check-util.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { CurrencyStoreService } from '../../services/currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../services/trustlines/trustline-utils/trustline-util.service';
import { ValidationService } from '../../services/utils/validation/transaction-validation-rule.service';
import { XrplTransactionOrchestratorService } from '../../services/xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplDateService } from '../../core/xrpl-date.service';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import { provideHttpClient } from '@angular/common/http';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { ChecksCashComponent } from './tab/checks-cash/checks-cash.component';

describe('SendChecksComponent', () => {
     let component: SendChecksComponent;
     let fixture: ComponentFixture<SendChecksComponent>;

     const mockWallet = { address: 'rTEST', classicAddress: 'rTEST', name: 'Test', seed: '' } as any;

     const walletManagerMock = {
          wallets: signal([mockWallet]),
          wallets$: of([mockWallet]),
          hasWallets$: of(true),
          hasWalletsFromWallets$: of(true),
          hasWallets: signal(true),
          selectedIndex$: of(0),
          selectedIndex: signal(0),

          // ← UPDATED: always return a wallet with classicAddress
          getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),

          getSelectedIndex: jasmine.createSpy('getSelectedIndex').and.returnValue(0),
          ensureWalletSelected: jasmine.createSpy('ensureWalletSelected').and.returnValue(true),
          isEditing: { bind: jasmine.createSpy('bind').and.returnValue(() => false) },
          setSelectedIndex: jasmine.createSpy('setSelectedIndex'),
          setWallets: jasmine.createSpy('setWallets'),
          startEdit: jasmine.createSpy('startEdit'),
          saveEdit: jasmine.createSpy('saveEdit'),
          cancelEdit: jasmine.createSpy('cancelEdit'),
          deleteWallet: jasmine.createSpy('deleteWallet'),
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
          txSignal: signal(null),
          warningMessage: null,
          clearWarning: jasmine.createSpy('clearWarning'),
          setWarning: jasmine.createSpy('setWarning'),
          setError: jasmine.createSpy('setError'),
          setInfoMessage: jasmine.createSpy('setInfoMessage'),
          suppressTxClear: signal(false),
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
          customDestinations: signal([]),
          allDestinations: jasmine.createSpy('allDestinations').and.returnValue(signal([])),
          destinationMap: jasmine.createSpy('destinationMap').and.returnValue(signal(new Map())),
          destinationItems: jasmine.createSpy('destinationItems').and.returnValue(signal([])),
          selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(signal(null)),
          filteredDestinations: jasmine.createSpy('filteredDestinations').and.returnValue(signal([])),
          destinationDisplay: jasmine.createSpy('destinationDisplay').and.returnValue(signal('')),
          setupAutoSelectOnValidTypedAddress: jasmine.createSpy('setupAutoSelectOnValidTypedAddress'),
          loadCustomDestinations: jasmine.createSpy('loadCustomDestinations'),
          getFinalDestinationAddress: jasmine.createSpy('getFinalDestinationAddress').and.returnValue(''),
          addCustomIfNewAndSelect: jasmine.createSpy('addCustomIfNewAndSelect'),
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

     const outstandingChecksCollapsed = signal(false);
     const enableExpirationDate = signal(false);
     const checkExpirationDate = signal('');
     const destination = signal('');
     const checkIdSearchQuery = signal('');

     const checksStoreMock = {
          outstandingChecksCollapsed,
          enableExpirationDate,
          checkExpirationDate,
          destination,
          checkIdSearchQuery,
          amount: signal(0),
          resetCheckFields: jasmine.createSpy('resetCheckFields'),
          getAll: jasmine.createSpy('getAll').and.returnValue({}),
          setField: jasmine.createSpy('setField').and.callFake((field: string, value: any) => {
               const map: Record<string, any> = {
                    outstandingChecksCollapsed,
                    enableExpirationDate,
                    checkExpirationDate,
                    destination,
                    checkIdSearchQuery,
               };
               map[field]?.set(value);
          }),
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
          spyOn(console, 'error');

          await TestBed.configureTestingModule({
               imports: [SendChecksComponent],
               schemas: [NO_ERRORS_SCHEMA], // ← this finally skips Lucide

               providers: [
                    provideRouter([]),
                    provideHttpClient(),

                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },

                    { provide: WalletManagerService, useValue: walletManagerMock },
                    { provide: TransactionUiService, useValue: txUiMock },
                    { provide: ChecksTransactionViewModelService, useValue: vmMock },
                    { provide: ToastService, useValue: toastMock },
                    { provide: StorageService, useValue: storeMock },

                    {
                         provide: CheckTransactionOrchestrator,
                         useValue: { executeCredentialTx: jasmine.createSpy().and.resolveTo({ success: true }) },
                    },

                    {
                         provide: CheckUtilService,
                         useValue: {
                              getExistingChecks: jasmine.createSpy('getExistingChecks').and.returnValue([]),
                              getCashableChecks: jasmine.createSpy('getCashableChecks').and.returnValue([]),
                              getCancelableChecks: jasmine.createSpy('getCancelableChecks').and.returnValue([]),
                              onCheckSelected: jasmine.createSpy('onCheckSelected'),
                              onCheckSelectedInUi: jasmine.createSpy('onCheckSelectedInUi'),
                              isCheckExpired: jasmine.createSpy('isCheckExpired').and.returnValue(false),
                              mapCheckItems: jasmine.createSpy('mapCheckItems').and.returnValue(signal([])),
                              filteredCheckItems: jasmine.createSpy('filteredCheckItems').and.returnValue(signal([])),
                              checkIdDisplay: jasmine.createSpy('checkIdDisplay').and.returnValue(signal('')),
                              checksLength: jasmine.createSpy('checksLength').and.returnValue(0),
                         },
                    },

                    {
                         provide: ChecksStoreService,
                         useValue: {
                              outstandingChecksCollapsed: signal(false),
                              enableExpirationDate: signal(false),
                              checkExpirationDate: signal(''),
                              destination: signal(''),
                              checkIdSearchQuery: signal(''),
                              amount: signal(0),
                              escrowCancelAfterExpirationDate: signal(null),
                              escrowFinishAfterExpirationDate: signal(null),
                              expiration: signal(null),
                              setField: jasmine.createSpy('setField'),
                              resetCheckFields: jasmine.createSpy('resetCheckFields'),
                         },
                    },

                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyMock },
                    { provide: TrustlineStoreService, useValue: { outstandingIOUCollapsed: signal(false), setField: jasmine.createSpy('setField'), reset: jasmine.createSpy('reset'), getAll: jasmine.createSpy('getAll').and.returnValue({}) } },
                    { provide: TrustlineUtilService, useValue: { loadTrustlines: jasmine.createSpy().and.resolveTo() } },
                    { provide: ValidationService, useValue: { validate: jasmine.createSpy().and.resolveTo([]) } },
                    { provide: XrplTransactionOrchestratorService, useValue: {} },
                    { provide: XrplTransactionService, useValue: { waitForFinalOutcome: jasmine.createSpy().and.resolveTo({}), processTxFinalResult: jasmine.createSpy(), processTxError: jasmine.createSpy() } },
                    {
                         provide: TxEnvironmentService,
                         useValue: {
                              getValidatedEnvironment: jasmine.createSpy('getValidatedEnvironment').and.rejectWith(new Error('Unable to get environment.')),
                              prepareTxEnvironmentWithWallet: jasmine.createSpy('prepareTxEnvironmentWithWallet').and.rejectWith(new Error('Unable to get environment.')),
                         },
                    },
                    {
                         provide: CurrencyStoreService,
                         useValue: {
                              currency: jasmine.createSpy('currency').and.returnValue('XRP'),
                              issuer: jasmine.createSpy('issuer').and.returnValue(''),
                              currencyCode: jasmine.createSpy('currencyCode').and.returnValue('XRP'),
                              currencyIssuer: jasmine.createSpy('currencyIssuer').and.returnValue(''),
                              resetOptions: jasmine.createSpy('resetOptions'),
                              setField: jasmine.createSpy('setField'),
                              getAll: jasmine.createSpy('getAll').and.returnValue({}),
                         },
                    },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy() } },
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
                              paramMap: of(convertToParamMap({})),
                              queryParamMap: of(convertToParamMap({})),
                              snapshot: {
                                   params: {},
                                   queryParams: {},
                                   data: {},
                                   paramMap: convertToParamMap({}),
                                   queryParamMap: convertToParamMap({}),
                              },
                         },
                    },
               ],
          })
               .overrideProvider(ChecksStoreService, { useValue: checksStoreMock })
               .overrideComponent(NavbarComponent, { set: { template: '<div></div>' } })
               .overrideComponent(WalletPanelComponent, { set: { template: '<div></div>' } })
               .overrideComponent(TransactionPreviewComponent, { set: { template: '<div></div>' } })
               .overrideComponent(ChecksCashComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(SendChecksComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          await fixture.whenStable();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     // In the describe blocks you can now safely call setTab etc.
     it('should set activeTab to valid tab value', async () => {
          await component.setTab('cashCheck');
          expect(vmMock.activeTab()).toBe('cashCheck');
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

     describe('toggleOutstandingChecks', () => {
          it('should toggle outstandingChecksCollapsed', () => {
               checksStoreMock.outstandingChecksCollapsed.set(false);
               component.toggleOutstandingChecks();
               expect(checksStoreMock.outstandingChecksCollapsed()).toBeTrue();
               component.toggleOutstandingChecks();
               expect(checksStoreMock.outstandingChecksCollapsed()).toBeFalse();
          });
     });

     describe('handleSearchQueryChange', () => {
          it('should update destinationSearchQuery and checkIdSearchQuery', () => {
               component.handleSearchQueryChange('test query');
               expect(component.destinationSearchQuery()).toBe('test query');
               expect(checksStoreMock.checkIdSearchQuery()).toBe('test query');
          });
     });

     describe('handleDestinationChange', () => {
          it('should update selectedDestinationAddress and destination', () => {
               component.handleDestinationChange({ id: 'rDEST', display: 'rDEST', isCurrentAccount: false, secondary: '' });
               expect(component.selectedDestinationAddress()).toBe('rDEST');
               expect(checksStoreMock.destination()).toBe('rDEST');
          });
     });

     describe('toggleExpiration', () => {
          it('should enable expiration date', () => {
               component.toggleExpiration(true);
               expect(checksStoreMock.enableExpirationDate()).toBeTrue();
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
