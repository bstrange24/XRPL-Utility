import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal, NO_ERRORS_SCHEMA } from '@angular/core';
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
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import { provideHttpClient } from '@angular/common/http';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';

describe('CreateTicketsComponent', () => {
     let component: CreateTicketsComponent;
     let fixture: ComponentFixture<CreateTicketsComponent>;

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

     beforeEach(async () => {
          spyOn(console, 'error');

          await TestBed.configureTestingModule({
               imports: [CreateTicketsComponent],
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
                    {
                         provide: TicketsOrchestratorService,
                         useValue: { executeTicketTx: jasmine.createSpy().and.resolveTo({ success: true }) },
                    },
                    {
                         provide: TicketsUtilService,
                         useValue: {
                              createButtonLabel: signal('Create Ticket(s)'),
                              deleteButtonLabel: signal('Delete Selected Ticket(s)'),
                              getAllTicketsSelected: jasmine.createSpy('getAllTicketsSelected').and.returnValue(signal(false)),
                         },
                    },
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
               .overrideProvider(TicketStore, { useValue: ticketStoreMock })
               .overrideComponent(NavbarComponent, { set: { template: '<div></div>' } })
               .overrideComponent(WalletPanelComponent, { set: { template: '<div></div>' } })
               .overrideComponent(TransactionPreviewComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(CreateTicketsComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          await fixture.whenStable();
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
               await component.getTickets(false);
               expect(toastMock.error).toHaveBeenCalled();
          });

          it('should set isSummaryLoading to false after completion', async () => {
               await component.getTickets(false);
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
