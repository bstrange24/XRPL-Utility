import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TimeBasedEscrowComponent } from './time-based-escrow.component';
import { EscrowStoreService } from '../../../services/escrow/escrow-store/escrow-store.service';
import { EscrowTransactionViewModelService } from '../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowOrchestratorService } from '../../../services/escrow/escrow-orchestrator/escrow-orchestrator.service';
import { EscrowUtilService } from '../../../services/escrow/escrow-util/escrow-util.service';
import { WalletManagerService } from '../../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../services/trustline-currency/trustline-util/trustline-currency.service';
import { CurrencyStoreService } from '../../../services/currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../../services/trustlines/trustline-utils/trustline-util.service';
import { ValidationService } from '../../../services/utils/validation/transaction-validation-rule.service';
import { XrplTransactionOrchestratorService } from '../../../services/xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../../services/xrpl-transactions/xrpl-transaction.service';
import { TxEnvironmentService } from '../../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../../services/transaction-dropdown/transaction-dropdown.service';
import { MptStoreService } from '../../../services/mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../../services/mpt/mpt-util/mpt-util.service';
import { DownloadUtilService } from '../../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../../services/utils/copy-util/copy-util.service';
import { XrplTransactionExecutorService } from '../../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { WalletDataService } from '../../../services/wallets/refresh-wallet/refresh-wallets.service';
import { AcccountDataService } from '../../../services/account-data/acccount-data.service';
import { StorageService } from '../../../services/shared/local-storage/storage.service';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { ConnectionGuardService } from '../../../services/shared/connection-guard/connection-guard.service';
import { NavbarComponent } from '../../shared/ui-components/navbar/navbar.component';

describe('TimeBasedEscrowComponent', () => {
     let component: TimeBasedEscrowComponent;
     let fixture: ComponentFixture<TimeBasedEscrowComponent>;

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
          warningMessage: null,
          clearWarning: jasmine.createSpy('clearWarning'),
          setWarning: jasmine.createSpy('setWarning'),
          setError: jasmine.createSpy('setError'),
          setInfoMessage: jasmine.createSpy('setInfoMessage'),
          suppressTxClear: signal(false),
     };

     const activeTabSignal = signal<string>('createEscrow');

     const vmMock = {
          activeTab: activeTabSignal,
          escrowCount: signal(0),
          escrowsToShow: signal([]),
          explorerLinks: signal(null),
          infoData: signal(null),
          selectedEscrowIsExpired: signal(false),
          destinationSearchQuery: signal(''),
          selectedDestinationAddress: signal(''),
          destinationItems: jasmine.createSpy('destinationItems').and.returnValue([]),
          selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(null),
     };

     const dropdownMock = {
          setupAutoSelectOnValidTypedAddress: jasmine.createSpy('setupAutoSelectOnValidTypedAddress'),
          loadCustomDestinations: jasmine.createSpy('loadCustomDestinations'),
          destinationItems: signal([]),
          allDestinations: jasmine.createSpy('allDestinations').and.returnValue(signal([])),
          destinationMap: jasmine.createSpy('destinationMap').and.returnValue(signal(new Map())),
          selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(signal(null)),
          getFinalDestinationAddress: jasmine.createSpy('getFinalDestinationAddress').and.returnValue(''),
          customDestinations: signal([]),
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
          activeTabSignal.set('createEscrow');

          await TestBed.configureTestingModule({
               imports: [TimeBasedEscrowComponent],
               providers: [
                    provideRouter([]),
                    EscrowStoreService,
                    { provide: WalletManagerService, useValue: walletManagerMock },
                    { provide: TransactionUiService, useValue: txUiMock },
                    { provide: EscrowTransactionViewModelService, useValue: vmMock },
                    { provide: ToastService, useValue: toastMock },
                    { provide: StorageService, useValue: storeMock },
                    {
                         provide: EscrowOrchestratorService,
                         useValue: { executeEscrowTx: jasmine.createSpy().and.resolveTo({ success: true }), handleSimulationSuccess: jasmine.createSpy().and.returnValue({ success: true }) },
                    },
                    {
                         provide: EscrowUtilService,
                         useValue: {
                              escrowItems: jasmine.createSpy().and.returnValue([]),
                              selectedEscrowItem: jasmine.createSpy().and.returnValue(null),
                              isEscrowExpired: jasmine.createSpy().and.returnValue(false),
                              onEscrowSelected: jasmine.createSpy(),
                              onEscrowSelectedInUi: jasmine.createSpy(),
                              getExistingEscrows: jasmine.createSpy().and.resolveTo([]),
                              getExpiredOrFulfilledEscrows: jasmine.createSpy().and.resolveTo([]),
                              loadAllEscrows: jasmine.createSpy().and.resolveTo([]),
                              formatEscrowAmount: jasmine.createSpy().and.returnValue('1 XRP'),
                              escrowLength: signal(0),
                              selectedEscrowSequenceNumber: signal(''),
                              createEscrowButtonLabel: signal('Create Escrow'),
                              finishEscrowButtonLabel: signal('Finish Escrow'),
                              cancelEscrowButtonLabel: signal('Cancel Escrow'),
                              generateConditionButtonLabel: signal('Generate Condition'),
                         },
                    },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyMock },
                    {
                         provide: CurrencyStoreService,
                         useValue: { currency: signal('XRP'), issuer: signal(''), currencyCode: signal('XRP'), currencyIssuer: signal(''), resetOptions: jasmine.createSpy(), setField: jasmine.createSpy(), getAll: jasmine.createSpy().and.returnValue({}) },
                    },
                    {
                         provide: TrustlineStoreService,
                         useValue: { outstandingIOUCollapsed: signal(false), setField: jasmine.createSpy(), reset: jasmine.createSpy(), getAll: jasmine.createSpy().and.returnValue({}) },
                    },
                    { provide: TrustlineUtilService, useValue: { loadTrustlines: jasmine.createSpy().and.resolveTo() } },
                    { provide: ValidationService, useValue: { validate: jasmine.createSpy().and.resolveTo([]) } },
                    { provide: XrplTransactionOrchestratorService, useValue: {} },
                    {
                         provide: XrplTransactionService,
                         useValue: { waitForFinalOutcome: jasmine.createSpy().and.resolveTo({}), processTxFinalResult: jasmine.createSpy(), processTxError: jasmine.createSpy() },
                    },
                    { provide: TxEnvironmentService, useValue: { getValidatedEnvironment: jasmine.createSpy().and.resolveTo(null), prepareTxEnvironment: jasmine.createSpy().and.resolveTo(null) } },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy() } },
                    { provide: XrplTransactionExecutorService, useValue: {} },
                    { provide: WalletDataService, useValue: { refreshWallets: jasmine.createSpy().and.resolveTo() } },
                    { provide: AcccountDataService, useValue: { refreshUiState: jasmine.createSpy(), loadAccountData: jasmine.createSpy() } },
                    { provide: TransactionDropdownService, useValue: dropdownMock },
                    { provide: XrplDateService, useValue: { toLocalDateTimeString: jasmine.createSpy().and.returnValue('') } },
                    { provide: MptUtilService, useValue: { computeMptItems: jasmine.createSpy().and.returnValue([]), computeSelectedMptItem: jasmine.createSpy().and.returnValue(null) } },
                    { provide: MptStoreService, useValue: { existingMpts: signal([]), mptIssuanceId: jasmine.createSpy().and.returnValue(''), setField: jasmine.createSpy() } },
                    { provide: ConnectionGuardService, useValue: { isConnected: signal(true) } },
                    {
                         provide: ActivatedRoute,
                         useValue: { params: of({}), queryParams: of({}), fragment: of(null), data: of({}), snapshot: { params: {}, queryParams: {}, data: {} } },
                    },
               ],
          })
               .overrideComponent(TimeBasedEscrowComponent, { set: { template: '<div></div>' } })
               .overrideComponent(NavbarComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(TimeBasedEscrowComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          await fixture.whenStable();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('isConditional should be false', () => {
          expect(component.isConditional).toBeFalse();
     });

     describe('setTab', () => {
          it('should set activeTab to valid tab value', async () => {
               await component.setTab('finishEscrow');
               expect(activeTabSignal()).toBe('finishEscrow');
          });

          it('should ignore invalid tab values', async () => {
               activeTabSignal.set('createEscrow');
               await component.setTab('invalidTab');
               expect(activeTabSignal()).toBe('createEscrow');
          });
     });

     describe('toggleOutstandingEscrows', () => {
          it('should toggle outstandingEscrowCollapsed', () => {
               const escrowStore = TestBed.inject(EscrowStoreService);
               escrowStore.setField('outstandingEscrowCollapsed', false);
               component.toggleOutstandingEscrows();
               expect(escrowStore.outstandingEscrowCollapsed()).toBeTrue();
               component.toggleOutstandingEscrows();
               expect(escrowStore.outstandingEscrowCollapsed()).toBeFalse();
          });
     });

     describe('toggleEscrowFinishAfterExpiration', () => {
          it('should set enableEscrowFinishAfterExpirationDate in store', () => {
               const escrowStore = TestBed.inject(EscrowStoreService);
               component.toggleEscrowFinishAfterExpiration(true);
               expect(escrowStore.enableEscrowFinishAfterExpirationDate()).toBeTrue();
               component.toggleEscrowFinishAfterExpiration(false);
               expect(escrowStore.enableEscrowFinishAfterExpirationDate()).toBeFalse();
          });
     });

     describe('toggleEscrowCancelAfterExpiration', () => {
          it('should set enableEscrowCancelAfterExpirationDate in store', () => {
               const escrowStore = TestBed.inject(EscrowStoreService);
               component.toggleEscrowCancelAfterExpiration(true);
               expect(escrowStore.enableEscrowCancelAfterExpirationDate()).toBeTrue();
          });
     });

     describe('clearEscrowFinishAfterExpiration', () => {
          it('should set escrowFinishAfterExpirationDate to empty string', () => {
               const escrowStore = TestBed.inject(EscrowStoreService);
               escrowStore.setField('escrowFinishAfterExpirationDate', '2030-01-01');
               component.clearEscrowFinishAfterExpiration();
               expect(escrowStore.escrowFinishAfterExpirationDate()).toBe('');
          });
     });

     describe('clearEscrowCancelAfterExpiration', () => {
          it('should set escrowCancelAfterExpirationDate to empty string', () => {
               const escrowStore = TestBed.inject(EscrowStoreService);
               escrowStore.setField('escrowCancelAfterExpirationDate', '2030-06-01');
               component.clearEscrowCancelAfterExpiration();
               expect(escrowStore.escrowCancelAfterExpirationDate()).toBe('');
          });
     });
});
