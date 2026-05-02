import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal, NO_ERRORS_SCHEMA, Component } from '@angular/core';
import { of } from 'rxjs';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { CreateTicketsComponent } from './tickets.component';
import { TicketStore } from '../../services/tickets/tickets-store/tickets-store.service';
import { TicketsViewModelService } from '../../services/tickets/tickets-view-model/tickets-view-model.service';
import { TicketsUtilService } from '../../services/tickets/tickets-util/tickets-util.service';
import { TicketsOrchestratorService } from '../../services/tickets/tickets-orchestrator/tickets-orchestrator.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { provideHttpClient } from '@angular/common/http';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { AppConstants } from '../../core/app.constants';

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

// Test wrapper component to override template
@Component({
     template: '<div>Test Component</div>',
     standalone: true,
})
class TestTicketsComponent extends CreateTicketsComponent {
     override ngOnInit(): void {
          // Override to prevent initialization issues
     }

     override measure<T>(label: string, clearExecutionTime: boolean, fetchFn: () => Promise<T>): Promise<T> {
          // Skip performance measurement in tests
          return fetchFn();
     }
}

describe('CreateTicketsComponent', () => {
     let component: TestTicketsComponent;
     let fixture: ComponentFixture<TestTicketsComponent>;
     let rightPanelServiceSpy: jasmine.SpyObj<RightPanelService>;

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

     const vmMock = {
          activeTab: signal('createTicket'),
          infoData: signal(null),
          hasWalletsSignal: signal(true),
          allTicketsSelected: signal(false),
          hasSelectedTickets: signal(false),
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

     const ticketStoreMock = {
          ticketSearchQuery: signal(''),
          ticketCount: signal(0),
          ticketId: signal(''),
          setField: jasmine.createSpy('setField'),
          getAll: jasmine.createSpy('getAll').and.returnValue({}),
          resetAll: jasmine.createSpy('resetAll'),
     };

     const ticketsUtilMock = {
          createButtonLabel: jasmine.createSpy('createButtonLabel').and.returnValue('Create Ticket(s)'),
          deleteButtonLabel: jasmine.createSpy('deleteButtonLabel').and.returnValue('Delete Selected Ticket(s)'),
          getAllTicketsSelected: jasmine.createSpy('getAllTicketsSelected').and.returnValue(signal(false)),
          filterAccountObjectsByTypes: jasmine.createSpy('filterAccountObjectsByTypes').and.callFake((obj: any, types: string[]) => obj),
     };

     const orchestratorMock = {
          executeTicketTx: jasmine.createSpy('executeTicketTx').and.resolveTo({ success: true, hash: 'txHash123' }),
     };

     const txEnvironmentMock = {
          getValidatedEnvironment: jasmine.createSpy('getValidatedEnvironment'),
          prepareTxEnvironmentWithWallet: jasmine.createSpy('prepareTxEnvironmentWithWallet'),
     };

     const xrplTransactionMock = {
          waitForFinalOutcome: jasmine.createSpy('waitForFinalOutcome').and.resolveTo({}),
          processTxFinalResult: jasmine.createSpy('processTxFinalResult'),
          processTxError: jasmine.createSpy('processTxError'),
     };

     rightPanelServiceSpy = jasmine.createSpyObj('RightPanelService', ['setPanel']);

     beforeEach(async () => {
          spyOn(console, 'error');

          await TestBed.configureTestingModule({
               imports: [TestTicketsComponent],
               schemas: [NO_ERRORS_SCHEMA],
               providers: [
                    provideRouter([]),
                    provideHttpClient(),
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: WalletManagerService, useValue: walletManagerMock },
                    { provide: TransactionUiService, useValue: txUiMock },
                    { provide: TicketsViewModelService, useValue: vmMock },
                    { provide: ToastService, useValue: toastMock },
                    { provide: StorageService, useValue: storeMock },
                    { provide: TransactionDropdownService, useValue: dropdownMock },
                    { provide: TicketsOrchestratorService, useValue: orchestratorMock },
                    { provide: TicketsUtilService, useValue: ticketsUtilMock },
                    { provide: XrplTransactionService, useValue: xrplTransactionMock },
                    { provide: TxEnvironmentService, useValue: txEnvironmentMock },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy() } },
                    { provide: WalletDataService, useValue: { refreshWallets: jasmine.createSpy().and.resolveTo() } },
                    { provide: AcccountDataService, useValue: { refreshUiState: jasmine.createSpy(), loadAccountData: jasmine.createSpy() } },
                    { provide: ConnectionGuardService, useValue: { isConnected: signal(true) } },
                    { provide: RightPanelService, useValue: rightPanelServiceSpy },
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
               .overrideProvider(TicketStore, { useValue: ticketStoreMock })
               .overrideComponent(TestTicketsComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(TestTicketsComponent);
          component = fixture.componentInstance;

          // Set up xrplTxOptionsStore
          (component as any).xrplTxOptionsStore = {
               ticketCountField: signal(''),
               walletTicketCount: signal(0),
               selectedTicketSequences: signal([]),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               reset: jasmine.createSpy('reset'),
               setField: jasmine.createSpy('setField'),
          };

          // Manually call initialization that would have been in ngOnInit
          (component as any).rightPanelService = rightPanelServiceSpy;
          (component as any).ticketsViewModelService = vmMock;

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('setTab', () => {
          it('should set activeTab to deleteTicket', async () => {
               await component.setTab('deleteTicket');
               expect(vmMock.activeTab()).toBe('deleteTicket');
          });

          it('should set activeTab to createTicket', async () => {
               vmMock.activeTab.set('deleteTicket');
               await component.setTab('createTicket');
               expect(vmMock.activeTab()).toBe('createTicket');
          });

          it('should ignore invalid tab values', async () => {
               vmMock.activeTab.set('createTicket');
               await component.setTab('invalidTab');
               expect(vmMock.activeTab()).toBe('createTicket');
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

          it('should call txUiService.clearAllFields', () => {
               (component as any).clearInputFields();
               expect(txUiMock.clearAllFields).toHaveBeenCalled();
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

     describe('getTickets', () => {
          it('should call toastService.error when environment fetch fails', async () => {
               txEnvironmentMock.getValidatedEnvironment.and.rejectWith(new Error('Unable to get environment.'));
               await component.getTickets(false);
               expect(toastMock.error).toHaveBeenCalled();
          });

          it('should set isSummaryLoading to false after completion', async () => {
               txEnvironmentMock.getValidatedEnvironment.and.rejectWith(new Error('Unable to get environment.'));
               await component.getTickets(false);
               expect(component.isSummaryLoading()).toBeFalse();
          });
     });

     describe('getTickets - Success path', () => {
          let mockEnv: any;

          beforeEach(() => {
               mockEnv = {
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: {
                         result: {
                              account_objects: [{ TicketSequence: '1' }, { TicketSequence: '2' }, { TicketSequence: '3' }],
                         },
                    },
                    client: {},
               };

               txEnvironmentMock.getValidatedEnvironment.and.resolveTo(mockEnv);
               ticketsUtilMock.filterAccountObjectsByTypes.and.returnValue(mockEnv.accountObjects);
          });

          it('should fetch tickets successfully and update store', async () => {
               await component.getTickets();
               expect(component.isSummaryLoading()).toBeFalse();
          });
     });

     describe('performAction - Create Ticket', () => {
          let mockEnv: any;

          beforeEach(() => {
               mockEnv = {
                    client: { disconnect: jasmine.createSpy('disconnect') },
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
                    fee: '12',
                    ledgerInfo: { lastIndex: 5000 },
               };

               txEnvironmentMock.getValidatedEnvironment.and.resolveTo(mockEnv);
               txEnvironmentMock.prepareTxEnvironmentWithWallet.and.resolveTo(mockEnv);
               orchestratorMock.executeTicketTx.and.resolveTo({ success: true, hash: 'txHash123' });
               spyOn(component as any, 'handleTxResult').and.returnValue(Promise.resolve(true));
          });

          it('should create tickets successfully', async () => {
               vmMock.activeTab.set('createTicket');
               (component as any).xrplTxOptionsStore.ticketCountField = signal('5');
               (component as any).xrplTxOptionsStore.walletTicketCount = signal(0);

               await component.performAction();

               expect(orchestratorMock.executeTicketTx).toHaveBeenCalledWith('createTicket', jasmine.any(Object));
          });

          it('should show error when ticket count exceeds 250 limit', async () => {
               vmMock.activeTab.set('createTicket');
               (component as any).xrplTxOptionsStore.walletTicketCount = signal(248);
               (component as any).xrplTxOptionsStore.ticketCountField = signal('5');

               await component.performAction();

               expect(toastMock.error).toHaveBeenCalledWith('An XRPL account can not hold more than 250 Tickets at one time. This account already has 248', AppConstants.TOAST.ERROR);
          });

          it('should handle transaction preparation error', async () => {
               vmMock.activeTab.set('createTicket');
               txEnvironmentMock.prepareTxEnvironmentWithWallet.and.rejectWith(new Error('Prep failed'));

               await component.performAction();

               expect(toastMock.error).toHaveBeenCalledWith('Failed to prepare transaction environment.', AppConstants.TOAST.ERROR);
          });

          it('should handle transaction execution error', async () => {
               vmMock.activeTab.set('createTicket');
               orchestratorMock.executeTicketTx.and.rejectWith(new Error('Tx failed'));

               await component.performAction();

               expect(toastMock.error).toHaveBeenCalledWith('Tx failed', AppConstants.TOAST.ERROR);
          });
     });

     describe('performAction - Delete Ticket', () => {
          let mockEnv: any;

          beforeEach(() => {
               mockEnv = {
                    client: { disconnect: jasmine.createSpy('disconnect') },
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
                    fee: '12',
                    ledgerInfo: { lastIndex: 5000 },
               };

               txEnvironmentMock.getValidatedEnvironment.and.resolveTo(mockEnv);
               txEnvironmentMock.prepareTxEnvironmentWithWallet.and.resolveTo(mockEnv);
               orchestratorMock.executeTicketTx.and.resolveTo({ success: true, hash: 'txHash123' });
               spyOn(component as any, 'handleTxResult').and.returnValue(Promise.resolve(true));
          });

          it('should delete tickets successfully', async () => {
               vmMock.activeTab.set('deleteTicket');
               (component as any).xrplTxOptionsStore.selectedTicketSequences = signal(['1', '2', '3']);

               await component.performAction();

               expect(orchestratorMock.executeTicketTx).toHaveBeenCalledWith('deleteTicket', jasmine.any(Object));
          });

          it('should show error when no tickets selected', async () => {
               vmMock.activeTab.set('deleteTicket');
               (component as any).xrplTxOptionsStore.selectedTicketSequences = signal([]);

               await component.performAction();

               expect(toastMock.error).toHaveBeenCalledWith('No tickets selected to delete.', AppConstants.TOAST.ERROR);
          });

          it('should handle txResult null', async () => {
               vmMock.activeTab.set('deleteTicket');
               (component as any).xrplTxOptionsStore.selectedTicketSequences = signal(['1']);
               orchestratorMock.executeTicketTx.and.resolveTo(null);

               await component.performAction();

               expect(toastMock.error).toHaveBeenCalledWith('Unexpected error when submitting transaction.', AppConstants.TOAST.ERROR);
          });
     });

     describe('refreshAccountObject', () => {
          let mockEnv: any;

          beforeEach(() => {
               mockEnv = {
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: {
                         result: {
                              account_objects: [{ TicketSequence: '1' }, { TicketSequence: '2' }],
                         },
                    },
               };

               ticketsUtilMock.filterAccountObjectsByTypes.and.returnValue(mockEnv.accountObjects);
          });

          it('should update wallet ticket count', async () => {
               await (component as any).refreshAccountObject(mockEnv);
               expect(TestBed.inject(AcccountDataService).refreshUiState).toHaveBeenCalled();
          });
     });

     describe('onWalletSelected', () => {
          it('should delegate to selectWallet', () => {
               spyOn(component, 'selectWallet');
               component.onWalletSelected(mockWallet);
               expect(component.selectWallet).toHaveBeenCalledWith(mockWallet);
          });
     });

     describe('onSelectedWalletIndexChange', () => {
          it('should call getTickets', async () => {
               spyOn(component, 'getTickets');
               await (component as any).onSelectedWalletIndexChange();
               expect(component.getTickets).toHaveBeenCalledWith(false);
          });
     });

     // describe('ngOnInit', () => {
     //      it('should set right panel', () => {
     //           // Manually call ngOnInit to test the behavior
     //           component.ngOnInit();
     //           expect(rightPanelServiceSpy.setPanel).toHaveBeenCalled();
     //      });
     // });

     describe('Template Constants', () => {
          it('should have tabs defined', () => {
               expect(component.tabs).toBeDefined();
          });

          it('should have tab meta defined', () => {
               expect(component.tabMeta).toBeDefined();
          });
     });

     describe('Button labels', () => {
          it('should show create button label for create tab', () => {
               expect(ticketsUtilMock.createButtonLabel()).toBe('Create Ticket(s)');
          });

          it('should show delete button label for delete tab', () => {
               expect(ticketsUtilMock.deleteButtonLabel()).toBe('Delete Selected Ticket(s)');
          });
     });
});
