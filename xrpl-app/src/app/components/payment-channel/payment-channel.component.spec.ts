import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal, NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { CreatePaymentChannelComponent } from './payment-channel.component';
import { PaymentChannelStoreService } from '../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { PaymentChannelViewModelService } from '../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { PaymentChannelOrchestratorService } from '../../services/payment-channel/payment-channel-orchestrator/payment-channel-orchestrator.service';
import { PaymentChannelSignatureContextService } from '../../services/payment-channel/payment-channel-signature-context/payment-channel-signature-context.service';
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
import { XrplDateService } from '../../core/xrpl-date.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import { provideHttpClient } from '@angular/common/http';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';

describe('CreatePaymentChannelComponent', () => {
     let component: CreatePaymentChannelComponent;
     let fixture: ComponentFixture<CreatePaymentChannelComponent>;

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

     const paymentChannelIdSearchQuery = signal('');
     const destination = signal('');
     const channelIDField = signal('');
     const channelClaimSignatureField = signal('');
     const isCreatorMode = signal(false);
     const paymentChannelCancelAfterTimeField = signal('');

     const paymentChannelStoreMock = {
          channelIDField,
          destination,
          paymentChannelIdSearchQuery,
          channelClaimSignatureField,
          isCreatorMode,
          paymentChannelCancelAfterTimeField,
          settleDelay: signal(''),
          publicKeyField: signal(''),
          amount: signal(''),
          isPaymentChannelOwner: signal(false),
          walletPaymentChannelCount: signal(0),
          existingPaymentChannels: signal([]),
          receivablePaymentChannels: signal([]),
          closablePaymentChannels: signal([]),
          resetChannelIdSelection: jasmine.createSpy('resetChannelIdSelection'),
          setField: jasmine.createSpy('setField').and.callFake((field: string, value: any) => {
               const map: Record<string, any> = {
                    channelIDField,
                    destination,
                    paymentChannelIdSearchQuery,
                    paymentChannelCancelAfterTimeField,
               };
               map[field]?.set(value);
          }),
          updateField: jasmine.createSpy('updateField'),
          getAll: jasmine.createSpy('getAll').and.returnValue({}),
     };

     const vmMock = {
          activeTab: signal('createPaymentChannel'),
          infoData: signal(null),
          explorerLinks: signal(null),
          isValidRenewTab: jasmine.createSpy('isValidRenewTab').and.returnValue(false),
          isValidClaimTab: jasmine.createSpy('isValidClaimTab').and.returnValue(false),
          isCurrentWalletSource: jasmine.createSpy('isCurrentWalletSource').and.returnValue(false),
          isCurrentWalletDestination: jasmine.createSpy('isCurrentWalletDestination').and.returnValue(false),
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
               imports: [CreatePaymentChannelComponent],
               schemas: [NO_ERRORS_SCHEMA],
               providers: [
                    provideRouter([]),
                    provideHttpClient(),
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: WalletManagerService, useValue: walletManagerMock },
                    { provide: TransactionUiService, useValue: txUiMock },
                    { provide: PaymentChannelViewModelService, useValue: vmMock },
                    { provide: ToastService, useValue: toastMock },
                    { provide: StorageService, useValue: storeMock },
                    { provide: TransactionDropdownService, useValue: dropdownMock },
                    { provide: PaymentChannelOrchestratorService, useValue: { executePaymentChannelTx: jasmine.createSpy().and.resolveTo({ success: true }) } },
                    {
                         provide: PaymentChannelUtilService,
                         useValue: {
                              clearFlagsValue: jasmine.createSpy('clearFlagsValue'),
                              clearInputFields: jasmine.createSpy('clearInputFields'),
                              processPaymentChannels: jasmine.createSpy('processPaymentChannels'),
                              selectPaymentChannelFromList: jasmine.createSpy('selectPaymentChannelFromList'),
                              loadFlagsFromSignature: jasmine.createSpy('loadFlagsFromSignature'),
                              generateCreatorClaimSignature: jasmine.createSpy('generateCreatorClaimSignature'),
                              updateFlagTotal: jasmine.createSpy('updateFlagTotal'),
                         },
                    },
                    { provide: PaymentChannelSignatureContextService, useValue: { getSignatureContext: jasmine.createSpy().and.returnValue(null) } },
                    {
                         provide: XrplTransactionService,
                         useValue: { waitForFinalOutcome: jasmine.createSpy().and.resolveTo({}), processTxFinalResult: jasmine.createSpy(), processTxError: jasmine.createSpy() },
                    },
                    {
                         provide: TxEnvironmentService,
                         useValue: {
                              prepareTxEnvironment: jasmine.createSpy('prepareTxEnvironment').and.rejectWith(new Error('Unable to get environment.')),
                              prepareTxEnvironmentWithWallet: jasmine.createSpy('prepareTxEnvironmentWithWallet').and.rejectWith(new Error('Unable to get environment.')),
                              getValidatedEnvironment: jasmine.createSpy('getValidatedEnvironment').and.rejectWith(new Error('Unable to get environment.')),
                         },
                    },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy() } },
                    { provide: WalletDataService, useValue: { refreshWallets: jasmine.createSpy().and.resolveTo() } },
                    { provide: AcccountDataService, useValue: { refreshUiState: jasmine.createSpy(), loadAccountData: jasmine.createSpy() } },
                    { provide: XrplDateService, useValue: {} },
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
               .overrideProvider(PaymentChannelStoreService, { useValue: paymentChannelStoreMock })
               .overrideComponent(NavbarComponent, { set: { template: '<div></div>' } })
               .overrideComponent(WalletPanelComponent, { set: { template: '<div></div>' } })
               .overrideComponent(TransactionPreviewComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(CreatePaymentChannelComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          await fixture.whenStable();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('setTab', () => {
          it('should set activeTab to a valid tab value', async () => {
               await component.setTab('fundPaymentChannel');
               expect(vmMock.activeTab()).toBe('fundPaymentChannel');
          });

          it('should ignore invalid tab values', async () => {
               vmMock.activeTab.set('createPaymentChannel');
               await component.setTab('invalidTab');
               expect(vmMock.activeTab()).toBe('createPaymentChannel');
          });

          it('should set activeTab to claimPaymentChannel', async () => {
               await component.setTab('claimPaymentChannel');
               expect(vmMock.activeTab()).toBe('claimPaymentChannel');
          });

          it('should set activeTab to renewPaymentChannel', async () => {
               await component.setTab('renewPaymentChannel');
               expect(vmMock.activeTab()).toBe('renewPaymentChannel');
          });

          it('should set activeTab to closePaymentChannel', async () => {
               await component.setTab('closePaymentChannel');
               expect(vmMock.activeTab()).toBe('closePaymentChannel');
          });
     });

     describe('handleSearchQueryChange', () => {
          it('should update destinationSearchQuery and paymentChannelIdSearchQuery', () => {
               component.handleSearchQueryChange('test query');
               expect(component.destinationSearchQuery()).toBe('test query');
               expect(paymentChannelStoreMock.paymentChannelIdSearchQuery()).toBe('test query');
          });

          it('should clear search query when empty string is passed', () => {
               component.destinationSearchQuery.set('some value');
               component.handleSearchQueryChange('');
               expect(component.destinationSearchQuery()).toBe('');
          });
     });

     describe('handleDestinationChange', () => {
          it('should update selectedDestinationAddress and destination store field', () => {
               component.handleDestinationChange({ id: 'rDEST456', display: 'rDEST456', isCurrentAccount: false, secondary: '' });
               expect(component.selectedDestinationAddress()).toBe('rDEST456');
               expect(paymentChannelStoreMock.destination()).toBe('rDEST456');
          });

          it('should clear selectedDestinationAddress when item is null', () => {
               component.selectedDestinationAddress.set('rOldDest');
               component.handleDestinationChange(null);
               expect(component.selectedDestinationAddress()).toBe('');
          });

          it('should clear destination when item id is empty', () => {
               component.handleDestinationChange({ id: '', display: '', isCurrentAccount: false, secondary: '' });
               expect(component.selectedDestinationAddress()).toBe('');
          });
     });

     describe('populateDefaultDateTime', () => {
          it('should clear paymentChannelCancelAfterTimeField in store', () => {
               paymentChannelStoreMock.paymentChannelCancelAfterTimeField.set('2030-01-01');
               component.populateDefaultDateTime();
               expect(paymentChannelStoreMock.setField).toHaveBeenCalledWith('paymentChannelCancelAfterTimeField', '');
          });
     });

     describe('clearInputFields', () => {
          it('should reset selectedDestinationAddress', () => {
               component.selectedDestinationAddress.set('rSOME');
               (component as any).clearInputFields();
               expect(component.selectedDestinationAddress()).toBe('');
          });

          it('should reset destinationSearchQuery', () => {
               component.destinationSearchQuery.set('some search');
               (component as any).clearInputFields();
               expect(component.destinationSearchQuery()).toBe('');
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

     describe('getClaimAndCloseTooltip', () => {
          it('should return creator-mode tooltip when isCreatorMode is true', () => {
               paymentChannelStoreMock.isCreatorMode.set(true);
               const tooltip = component.getClaimAndCloseTooltip();
               expect(tooltip).toContain('recipient');
          });

          it('should return recipient-mode tooltip when isCreatorMode is false', () => {
               paymentChannelStoreMock.isCreatorMode.set(false);
               const tooltip = component.getClaimAndCloseTooltip();
               expect(tooltip).toContain('creator');
          });
     });
});
