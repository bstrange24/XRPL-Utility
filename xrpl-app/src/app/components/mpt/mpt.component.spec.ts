import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal, NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import * as xrpl from 'xrpl';
import { MptComponent } from './mpt.component';
import { MptStoreService } from '../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MptUtilService } from '../../services/mpt/mpt-util/mpt-util.service';
import { MptOrchestratorServiceService } from '../../services/mpt/mpt-orchestrator/mpt-orchestrator.service.service';
import { CheckTransactionOrchestrator } from '../../services/checks/checks-transaction-orchestrator/checks-transaction-orchestrator.service';
import { CheckUtilService } from '../../services/checks/checks-util/check-util.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { TrustlineCurrencyService } from '../../services/trustlines/trustline-currency/trustline-currency.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import { provideHttpClient } from '@angular/common/http';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';

describe('MptComponent', () => {
     let component: MptComponent;
     let fixture: ComponentFixture<MptComponent>;

     const mockWallet = { address: 'rTEST', classicAddress: 'rTEST', name: 'Test', seed: '' } as any;

     const walletManagerMock = {
          wallets: signal([mockWallet]),
          wallets$: of([mockWallet]),
          hasWallets$: of(true),
          hasWalletsFromWallets$: of(true),
          hasWallets: signal(true),
          selectedIndex$: of(0),
          selectedIndex: signal(0),
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

     const outstandingMptsCollapsed = signal(false);
     const destination = signal('');
     const mptIssuanceId = signal('');
     const mptIdSearchQuery = signal('');

     const mptStoreMock = {
          outstandingMptsCollapsed,
          destination,
          mptIssuanceId,
          mptIdSearchQuery,
          existingMpts: signal([]),
          authAction: signal('authorize'),
          lockAction: signal('unlock'),
          metaData: signal(''),
          XLS89_TEMPLATE: jasmine.createSpy('XLS89_TEMPLATE').and.returnValue('{}'),
          setField: jasmine.createSpy('setField').and.callFake((field: string, value: any) => {
               const map: Record<string, any> = {
                    outstandingMptsCollapsed,
                    destination,
                    mptIssuanceId,
                    mptIdSearchQuery,
               };
               map[field]?.set(value);
          }),
          getAll: jasmine.createSpy('getAll').and.returnValue({}),
          resetMptFields: jasmine.createSpy('resetMptFields'),
     };

     const vmMock = {
          activeTab: signal('createMpt'),
          infoData: signal(null),
          explorerLinks: signal(null),
          metadataByteLength: jasmine.createSpy('metadataByteLength').and.returnValue(0),
          metadataIsValid: jasmine.createSpy('metadataIsValid').and.returnValue(true),
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
               imports: [MptComponent],
               schemas: [NO_ERRORS_SCHEMA],
               providers: [
                    provideRouter([]),
                    provideHttpClient(),
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: WalletManagerService, useValue: walletManagerMock },
                    { provide: TransactionUiService, useValue: txUiMock },
                    { provide: MptTransactionViewModelService, useValue: vmMock },
                    { provide: ToastService, useValue: toastMock },
                    { provide: StorageService, useValue: storeMock },
                    { provide: TransactionDropdownService, useValue: dropdownMock },
                    { provide: MptOrchestratorServiceService, useValue: { executeMptTx: jasmine.createSpy().and.resolveTo({ success: true }) } },
                    {
                         provide: MptUtilService,
                         useValue: {
                              resetFlags: jasmine.createSpy('resetFlags'),
                              getMpts: jasmine.createSpy('getMpts').and.returnValue([]),
                              getAllMptTokens: jasmine.createSpy('getAllMptTokens').and.returnValue(null),
                              isDestinationAuthorizedForMpt: jasmine.createSpy('isDestinationAuthorizedForMpt').and.returnValue(true),
                         },
                    },
                    {
                         provide: CheckTransactionOrchestrator,
                         useValue: { executeCredentialTx: jasmine.createSpy().and.resolveTo({ success: true }) },
                    },
                    {
                         provide: CheckUtilService,
                         useValue: { getExistingChecks: jasmine.createSpy().and.returnValue([]) },
                    },
                    { provide: TrustlineCurrencyService, useValue: { load: jasmine.createSpy() } },
                    {
                         provide: XrplTransactionService,
                         useValue: { waitForFinalOutcome: jasmine.createSpy().and.resolveTo({}), processTxFinalResult: jasmine.createSpy(), processTxError: jasmine.createSpy() },
                    },
                    {
                         provide: TxEnvironmentService,
                         useValue: {
                              getValidatedEnvironment: jasmine.createSpy('getValidatedEnvironment').and.rejectWith(new Error('Unable to get environment.')),
                              prepareTxEnvironmentWithWallet: jasmine.createSpy('prepareTxEnvironmentWithWallet').and.rejectWith(new Error('Unable to get environment.')),
                         },
                    },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy() } },
                    { provide: WalletDataService, useValue: { refreshWallets: jasmine.createSpy().and.resolveTo() } },
                    { provide: AcccountDataService, useValue: { refreshUiState: jasmine.createSpy(), loadAccountData: jasmine.createSpy() } },
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
               .overrideProvider(MptStoreService, { useValue: mptStoreMock })
               .overrideComponent(NavbarComponent, { set: { template: '<div></div>' } })
               .overrideComponent(WalletPanelComponent, { set: { template: '<div></div>' } })
               .overrideComponent(TransactionPreviewComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(MptComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          await fixture.whenStable();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('setTab', () => {
          it('should set activeTab to a valid tab value', async () => {
               await component.setTab('sendMpt');
               expect(vmMock.activeTab()).toBe('sendMpt');
          });

          it('should ignore invalid tab values', async () => {
               vmMock.activeTab.set('createMpt');
               await component.setTab('invalidTab');
               expect(vmMock.activeTab()).toBe('createMpt');
          });

          it('should set activeTab to authorizeMpt', async () => {
               await component.setTab('authorizeMpt');
               expect(vmMock.activeTab()).toBe('authorizeMpt');
          });

          it('should set activeTab to destroyMpt', async () => {
               await component.setTab('destroyMpt');
               expect(vmMock.activeTab()).toBe('destroyMpt');
          });
     });

     describe('toggleExistingMpts', () => {
          it('should toggle outstandingMptsCollapsed from false to true', () => {
               mptStoreMock.outstandingMptsCollapsed.set(false);
               component.toggleExistingMpts();
               expect(mptStoreMock.setField).toHaveBeenCalledWith('outstandingMptsCollapsed', true);
          });

          it('should toggle outstandingMptsCollapsed from true to false', () => {
               mptStoreMock.outstandingMptsCollapsed.set(true);
               component.toggleExistingMpts();
               expect(mptStoreMock.setField).toHaveBeenCalledWith('outstandingMptsCollapsed', false);
          });
     });

     describe('onMptSelected', () => {
          it('should set mptIssuanceId from selected item id', () => {
               component.onMptSelected({ id: 'ABC123', display: 'Token', secondary: '' });
               expect(mptStoreMock.setField).toHaveBeenCalledWith('mptIssuanceId', 'ABC123');
          });

          it('should not call setField when item is null', () => {
               mptStoreMock.setField.calls.reset();
               component.onMptSelected(null);
               expect(mptStoreMock.setField).not.toHaveBeenCalled();
          });
     });

     describe('onMptSelectedFromSummary', () => {
          it('should set mptIssuanceId from mpt_issuance_id', () => {
               component.onMptSelectedFromSummary({ mpt_issuance_id: 'ISSUANCE001' });
               expect(mptStoreMock.setField).toHaveBeenCalledWith('mptIssuanceId', 'ISSUANCE001');
          });

          it('should not call setField when mpt is null', () => {
               mptStoreMock.setField.calls.reset();
               component.onMptSelectedFromSummary(null);
               expect(mptStoreMock.setField).not.toHaveBeenCalled();
          });
     });

     describe('clearInputFields', () => {
          it('should reset selectedDestinationAddress', () => {
               component.selectedDestinationAddress.set('rSOME');
               (component as any).clearInputFields();
               expect(component.selectedDestinationAddress()).toBe('');
          });

          it('should call mptUtilService.resetFlags', () => {
               const mptUtil = TestBed.inject(MptUtilService) as any;
               (component as any).clearInputFields();
               expect(mptUtil.resetFlags).toHaveBeenCalled();
          });

          it('should call mptStoreService.resetMptFields', () => {
               (component as any).clearInputFields();
               expect(mptStoreMock.resetMptFields).toHaveBeenCalled();
          });
     });

     describe('clearFields', () => {
          it('should clear selectedDestinationAddress and call clearAllOptionsAndMessages', () => {
               component.selectedDestinationAddress.set('rSOME');
               component.clearFields(false);
               expect(component.selectedDestinationAddress()).toBe('');
               expect(txUiMock.clearAllOptionsAndMessages).toHaveBeenCalled();
          });

          it('should also reset mpt fields when clearAllFields is true', () => {
               component.clearFields(true);
               expect(mptStoreMock.resetMptFields).toHaveBeenCalled();
          });
     });

     describe('selectWallet', () => {
          it('should update currentWallet when a different wallet is selected', () => {
               const newWallet = { address: 'rNEW', classicAddress: 'rNEW', seed: '', name: 'New' } as any;
               component.currentWallet.set({ address: 'rOLD', classicAddress: 'rOLD' } as any);
               component.selectWallet(newWallet);
               expect(component.currentWallet().address).toBe('rNEW');
          });

          it('should not change currentWallet when same wallet is selected', () => {
               component.currentWallet.set(mockWallet);
               component.selectWallet(mockWallet);
               expect(component.currentWallet().address).toBe('rTEST');
          });

          it('should clear selectedDestinationAddress if it matches newly selected wallet address', () => {
               const wallet = { address: 'rMATCH', classicAddress: 'rMATCH', seed: '', name: 'Match' } as any;
               component.selectedDestinationAddress.set('rMATCH');
               component.currentWallet.set({ address: 'rOTHER', classicAddress: 'rOTHER' } as any);
               component.selectWallet(wallet);
               expect(component.selectedDestinationAddress()).toBe('');
          });
     });

     describe('performAction – invalid destination for sendMpt', () => {
          it('should show error toast when destination address is invalid for sendMpt', async () => {
               vmMock.activeTab.set('sendMpt');
               spyOn(xrpl, 'isValidAddress').and.returnValue(false);
               dropdownMock.getFinalDestinationAddress.and.returnValue('');

               await component.performAction();

               expect(toastMock.error).toHaveBeenCalledWith(jasmine.stringContaining('valid destination'), jasmine.any(String));
          });
     });

     describe('getMptDetails', () => {
          it('should call toastService.error when environment fetch fails', async () => {
               await component.getMptDetails(false);
               expect(toastMock.error).toHaveBeenCalled();
          });

          it('should set isSummaryLoading to false after completion', async () => {
               await component.getMptDetails(false);
               expect(component.isSummaryLoading()).toBeFalse();
          });
     });

     describe('onWalletSelected', () => {
          it('should delegate to selectWallet', () => {
               spyOn(component, 'selectWallet');
               component.onWalletSelected(mockWallet);
               expect(component.selectWallet).toHaveBeenCalledWith(mockWallet);
          });
     });
});
