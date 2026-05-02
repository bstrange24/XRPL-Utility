import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed, Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { EscrowBaseComponent } from './escrow-base.component';
import { WalletManagerService } from '../../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../../services/transaction-dropdown/transaction-dropdown.service';
import { WalletDataService } from '../../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../../../services/transaction-environment/tx-environment.service';
import { CopyUtilService } from '../../../services/utils/copy-util/copy-util.service';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { AcccountDataService } from '../../../services/account-data/acccount-data.service';
import { StorageService } from '../../../services/shared/local-storage/storage.service';
import { DownloadUtilService } from '../../../services/utils/download-util/download-util.service';
import { TrustlineCurrencyService } from '../../../services/trustlines/trustline-currency/trustline-currency.service';
import { XrplTransactionService } from '../../../services/xrpl-transactions/xrpl-transaction.service';
import { MptUtilService } from '../../../services/mpt/mpt-util/mpt-util.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { CurrencyStoreService } from '../../../services/currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../../services/trustlines/trustline-utils/trustline-util.service';
import { XrplTransactionOrchestratorService } from '../../../services/xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { ValidationService } from '../../../services/utils/validation/transaction-validation-rule.service';
import { EscrowTransactionViewModelService } from '../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowOrchestratorService } from '../../../services/escrow/escrow-orchestrator/escrow-orchestrator.service';
import { EscrowUtilService } from '../../../services/escrow/escrow-util/escrow-util.service';
import { EscrowStoreService } from '../../../services/escrow/escrow-store/escrow-store.service';
import { MptStoreService } from '../../../services/mpt/mpt-store/mpt-store.service';
import { RightPanelService } from '../../../services/utils/right-panel/right-panel.service';
import { ConnectionGuardService } from '../../../services/shared/connection-guard/connection-guard.service';
import { XrplService } from '../../../services/xrpl-services/xrpl.service';
import { SelectItem } from '../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AppConstants } from '../../../core/app.constants';
import { AccountConfiguratorStoreService } from '../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../../shared/stores/xrpl-tx-options.store';

// Mock performance API - fully mock to avoid errors
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

// Create a concrete implementation for testing
@Component({
     standalone: true,
     template: '',
})
class TestEscrowComponent extends EscrowBaseComponent {
     protected override clearInputFields(): void {
          throw new Error('Method not implemented.');
     }
     override readonly isConditional = false;
}

describe('EscrowBaseComponent', () => {
     let component: TestEscrowComponent;
     let fixture: ComponentFixture<TestEscrowComponent>;

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
     let downloadUtilService: any;
     let trustlineCurrencyService: any;
     let xrplTransactionService: any;
     let mptUtilService: any;
     let xrplDateService: any;
     let currencyStoreService: any;
     let trustlineStoreService: any;
     let trustlineUtilService: any;
     let xrplTransactionOrchestratorService: any;
     let validationService: any;
     let escrowTransactionViewModelService: any;
     let escrowOrchestratorService: any;
     let escrowUtilService: any;
     let escrowStoreService: any;
     let mptStoreService: any;
     let rightPanelService: any;
     let connectionGuardService: any;
     let xrplTxOptionsStore: any;
     let accountConfiguratorStoreService: any;
     let xrplService: any;

     // Mock data
     const mockWallet = { address: 'rTestAddress', classicAddress: 'rTestAddress', name: 'Test Wallet', seed: '' };
     const mockWallets = signal([mockWallet]);
     const mockSelectedIndex = signal(0);

     beforeEach(async () => {
          // Reset performance spies
          mockPerformance.mark.calls.reset();
          mockPerformance.measure.calls.reset();
          mockPerformance.getEntriesByName.calls.reset();
          mockPerformance.clearMarks.calls.reset();
          mockPerformance.clearMeasures.calls.reset();

          // Initialize mocks
          walletManagerService = {
               wallets: mockWallets.asReadonly(),
               selectedIndex: mockSelectedIndex.asReadonly(),
               hasWallets: computed(() => mockWallets().length > 0),
               currentWallet: computed(() => mockWallets()[mockSelectedIndex()] || {}),
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
               getSelectedIndex: jasmine.createSpy('getSelectedIndex').and.returnValue(0),
               setSelectedIndex: jasmine.createSpy('setSelectedIndex'),
               ensureWalletSelected: jasmine.createSpy('ensureWalletSelected').and.returnValue(true),
          };

          transactionUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
               spinner: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org/'),
               stepMessage: jasmine.createSpy('stepMessage'),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               clearAllFields: jasmine.createSpy('clearAllFields'),
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               setTxResultSignal: jasmine.createSpy('setTxResultSignal'),
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

          walletDataService = { refreshWallets: jasmine.createSpy('refreshWallets').and.resolveTo() };

          txEnvironmentService = {
               getValidatedEnvironment: jasmine.createSpy('getValidatedEnvironment').and.resolveTo({
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
               }),
               prepareTxEnvironmentWithWallet: jasmine.createSpy('prepareTxEnvironmentWithWallet').and.resolveTo({
                    client: {},
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
               }),
          };

          copyUtilService = { copy: jasmine.createSpy('copy') };
          toastService = { error: jasmine.createSpy('error'), success: jasmine.createSpy('success'), info: jasmine.createSpy('info') };
          acccountDataService = { refreshUiState: jasmine.createSpy('refreshUiState'), loadAccountData: jasmine.createSpy('loadAccountData') };

          route = {
               queryParams: of({}),
               snapshot: {
                    queryParams: {},
                    paramMap: convertToParamMap({}),
                    queryParamMap: convertToParamMap({}),
               },
          };

          storageService = {
               get: jasmine.createSpy('get').and.returnValue(null),
               set: jasmine.createSpy('set'),
               removeValue: jasmine.createSpy('removeValue'),
               getNet: jasmine.createSpy('getNet').and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' }),
               getNetworkColor: jasmine.createSpy('getNetworkColor').and.returnValue('#10b981'),
          };

          downloadUtilService = {};

          xrplService = {
               getNet: jasmine.createSpy('getNet').and.returnValue({ environment: 'devnet' }),
          };

          trustlineCurrencyService = {
               load: jasmine.createSpy('load'),
               selectCurrency: jasmine.createSpy('selectCurrency'),
               selectIssuer: jasmine.createSpy('selectIssuer'),
               refreshCurrentBalance: jasmine.createSpy('refreshCurrentBalance').and.resolveTo(),
               currencyItems: jasmine.createSpy('currencyItems').and.returnValue(signal([])),
               issuerItems: jasmine.createSpy('issuerItems').and.returnValue(signal([])),
               preferXrpAsDefault: signal(false),
               addXrpInCurrencyDropdown: signal(false),
               addMptInCurrencyDropdown: signal(false),
               getExistingIOUs: jasmine.createSpy('getExistingIOUs').and.returnValue([]),
          };

          xrplTransactionService = { getEscrowBySequence: jasmine.createSpy('getEscrowBySequence').and.resolveTo(null), getCurrentRippleTime: jasmine.createSpy('getCurrentRippleTime').and.resolveTo(1000) };
          mptUtilService = { getExistingMpts: jasmine.createSpy('getExistingMpts').and.returnValue([]), computeMptItems: jasmine.createSpy('computeMptItems').and.returnValue([]), computeSelectedMptItem: jasmine.createSpy('computeSelectedMptItem') };
          xrplDateService = { toLocalDateTimeString: jasmine.createSpy('toLocalDateTimeString').and.returnValue('2024-01-01T00:00:00') };
          currencyStoreService = { currency: signal('XRP'), issuer: signal(''), getAll: jasmine.createSpy('getAll').and.returnValue({}) };
          trustlineStoreService = { outstandingIOUCollapsed: signal(false), setField: jasmine.createSpy('setField'), reset: jasmine.createSpy('reset'), getAll: jasmine.createSpy('getAll').and.returnValue({}) };
          trustlineUtilService = { loadTrustlines: jasmine.createSpy('loadTrustlines').and.resolveTo() };
          xrplTransactionOrchestratorService = {};
          validationService = { validate: jasmine.createSpy('validate').and.resolveTo([]) };

          escrowTransactionViewModelService = {
               activeTab: signal('createEscrow'),
               destinationSearchQuery: signal(''),
               selectedDestinationAddress: signal(''),
          };

          escrowOrchestratorService = { executeEscrowTx: jasmine.createSpy('executeEscrowTx').and.resolveTo({ success: true, hash: 'txHash123' }) };

          escrowUtilService = {
               escrowItems: jasmine.createSpy('escrowItems').and.returnValue([]),
               selectedEscrowItem: jasmine.createSpy('selectedEscrowItem'),
               isEscrowExpired: jasmine.createSpy('isEscrowExpired').and.returnValue(false),
               getExistingEscrows: jasmine.createSpy('getExistingEscrows').and.resolveTo([]),
               getExpiredOrFulfilledEscrows: jasmine.createSpy('getExpiredOrFulfilledEscrows').and.resolveTo([]),
               loadAllEscrows: jasmine.createSpy('loadAllEscrows').and.resolveTo([]),
          };

          escrowStoreService = {
               setField: jasmine.createSpy('setField'),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               allEscrowsRaw: signal([]),
               escrowSequenceNumber: signal(''),
               escrowOwner: signal(''),
               expiredOrFulfilledEscrows: signal([]),
               existingEscrow: signal([]),
               outstandingEscrowCollapsed: signal(false),
               destination: signal(''),
               resetEscrowFields: jasmine.createSpy('resetEscrowFields'),
          };

          mptStoreService = {
               setField: jasmine.createSpy('setField'),
               existingMpts: signal([]),
               mptIssuanceId: signal(''),
               resetMptFields: jasmine.createSpy('resetMptFields'),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
          };

          rightPanelService = { setPanel: jasmine.createSpy('setPanel') };
          connectionGuardService = { isConnected: signal(true) };
          xrplTxOptionsStore = { reset: jasmine.createSpy('reset'), getAll: jasmine.createSpy('getAll').and.returnValue({}) };
          accountConfiguratorStoreService = { getAll: jasmine.createSpy('getAll').and.returnValue({}) };

          await TestBed.configureTestingModule({
               imports: [TestEscrowComponent],
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
                    { provide: DownloadUtilService, useValue: downloadUtilService },
                    { provide: XrplService, useValue: xrplService },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: XrplTransactionService, useValue: xrplTransactionService },
                    { provide: MptUtilService, useValue: mptUtilService },
                    { provide: XrplDateService, useValue: xrplDateService },
                    { provide: CurrencyStoreService, useValue: currencyStoreService },
                    { provide: TrustlineStoreService, useValue: trustlineStoreService },
                    { provide: TrustlineUtilService, useValue: trustlineUtilService },
                    { provide: XrplTransactionOrchestratorService, useValue: xrplTransactionOrchestratorService },
                    { provide: ValidationService, useValue: validationService },
                    { provide: EscrowTransactionViewModelService, useValue: escrowTransactionViewModelService },
                    { provide: EscrowOrchestratorService, useValue: escrowOrchestratorService },
                    { provide: EscrowUtilService, useValue: escrowUtilService },
                    { provide: EscrowStoreService, useValue: escrowStoreService },
                    { provide: MptStoreService, useValue: mptStoreService },
                    { provide: RightPanelService, useValue: rightPanelService },
                    { provide: ConnectionGuardService, useValue: connectionGuardService },
                    { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStore },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(TestEscrowComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset any spies if needed
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should have isConditional abstract property', () => {
          expect(component.isConditional).toBeFalse();
     });

     describe('ngOnInit', () => {
          it('should initialize services and load data', () => {
               expect(trustlineCurrencyService.load).toHaveBeenCalled();
               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('XRP');
               expect(trustlineCurrencyService.refreshCurrentBalance).toHaveBeenCalled();
               expect(transactionDropdownService.loadCustomDestinations).toHaveBeenCalled();
               expect(rightPanelService.setPanel).toHaveBeenCalled();
          });
     });

     describe('activeTab', () => {
          it('should return active tab from view model', () => {
               expect(component.activeTab).toBe('createEscrow');
          });
     });

     describe('toggleInfoPanel', () => {
          it('should toggle infoPanelExpanded', () => {
               const initial = component.infoPanelExpanded();
               component.toggleInfoPanel();
               expect(component.infoPanelExpanded()).toBe(!initial);
               component.toggleInfoPanel();
               expect(component.infoPanelExpanded()).toBe(initial);
          });
     });

     describe('currencyItems', () => {
          it('should return currency items from service', () => {
               component.currencyItems();
               expect(trustlineCurrencyService.currencyItems).toHaveBeenCalled();
          });
     });

     describe('selectedCurrencyItem', () => {
          it('should return null when no currency selected', () => {
               currencyStoreService.currency.set('');
               const result = component.selectedCurrencyItem();
               expect(result).toBeNull();
          });
     });

     describe('escrowItems', () => {
          it('should call escrowUtilService.escrowItems', () => {
               component.escrowItems();
               expect(escrowUtilService.escrowItems).toHaveBeenCalled();
          });
     });

     describe('onEscrowSelected', () => {
          it('should handle null item', () => {
               component.onEscrowSelected(null);
               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowSequenceNumber', '');
          });

          it('should handle cancelEscrow tab', () => {
               escrowTransactionViewModelService.activeTab.set('cancelEscrow');
               component.onEscrowSelected({ id: '123' } as SelectItem);
               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowSequenceNumber', '123');
          });
     });

     describe('selectedEscrowIsExpired', () => {
          it('should return false when no sequence number', () => {
               escrowStoreService.escrowSequenceNumber.set('');
               const result = component.selectedEscrowIsExpired();
               expect(result).toBeFalse();
          });
     });

     describe('toggle methods', () => {
          it('toggleEscrowFinishAfteExpiration should set field', () => {
               component.toggleEscrowFinishAfteExpiration(true);
               expect(escrowStoreService.setField).toHaveBeenCalledWith('enableEscrowFinishAfterExpirationDate', true);
          });

          it('toggleEscrowCancelAfterExpiration should set field', () => {
               component.toggleEscrowCancelAfterExpiration(true);
               expect(escrowStoreService.setField).toHaveBeenCalledWith('enableEscrowCancelAfterExpirationDate', true);
          });
     });

     describe('onFocus', () => {
          it('should call select on input', () => {
               const mockInput = { select: jasmine.createSpy('select') } as any;
               component.onFocus({ target: mockInput } as Event);
               expect(mockInput.select).toHaveBeenCalled();
          });
     });

     describe('selectWallet', () => {
          it('should not switch to same wallet', () => {
               component.currentWallet.set(mockWallet);
               component.selectWallet(mockWallet);
               expect(component.currentWallet()).toBe(mockWallet);
          });

          it('should switch to different wallet', () => {
               const newWallet = { address: 'rNewWallet', classicAddress: 'rNewWallet', name: 'New', seed: '' };
               component.selectWallet(newWallet);
               expect(component.currentWallet()).toBe(newWallet);
          });
     });

     describe('setTab', () => {
          it('should set active tab and reset fields', async () => {
               await component.setTab('finishEscrow');
               expect(escrowTransactionViewModelService.activeTab()).toBe('finishEscrow');
               expect(escrowStoreService.resetEscrowFields).toHaveBeenCalled();
          });
     });

     describe('getEscrows', () => {
          it('should load escrows successfully', async () => {
               await component.getEscrows();
               expect(txEnvironmentService.getValidatedEnvironment).toHaveBeenCalled();
               expect(escrowUtilService.getExistingEscrows).toHaveBeenCalled();
          });

          it('should handle errors', async () => {
               txEnvironmentService.getValidatedEnvironment.and.rejectWith(new Error('Network error'));
               await component.getEscrows();
               expect(toastService.error).toHaveBeenCalled();
          });
     });

     describe('performAction', () => {
          beforeEach(() => {
               component.currentWallet.set(mockWallet);
          });

          it('should validate destination for createEscrow', async () => {
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('');
               await component.performAction();
               expect(toastService.error).toHaveBeenCalledWith(jasmine.stringContaining('valid destination address'), AppConstants.TOAST.ERROR);
          });

          // it('should execute createEscrow successfully', async () => {
          //      transactionDropdownService.getFinalDestinationAddress.and.returnValue('rDestination');
          //      await component.performAction();
          //      expect(escrowOrchestratorService.executeEscrowTx).toHaveBeenCalled();
          // });
     });

     describe('toggleOptions', () => {
          it('should set wantsOptions', () => {
               component.toggleOptions(true);
               expect(transactionUiService.wantsOptions()).toBeTrue();
          });
     });

     describe('resetInputFields', () => {
          it('should reset all input fields', () => {
               component.resetInputFields();
               expect(escrowTransactionViewModelService.selectedDestinationAddress()).toBe('');
               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('XRP');
               expect(mptStoreService.resetMptFields).toHaveBeenCalled();
               expect(escrowStoreService.resetEscrowFields).toHaveBeenCalled();
          });
     });
});
