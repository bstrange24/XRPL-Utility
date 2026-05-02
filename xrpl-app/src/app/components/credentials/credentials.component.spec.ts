import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { CreateCredentialsComponent } from './credentials.component';
import { CREDENTIAL_TABS, CREDENTIAL_TAB_META } from './constants/credential.ui';

// Services
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { CredentialTransactionOrchestratorService } from '../../services/credentials/credential-transaction-orchestrator/credential-transaction-orchestrator.service';
import { CredentialUtilService } from '../../services/credentials/credential-util/credential-util.service';
import { CredentialStore } from '../../services/credentials/credential-store/credential-store.service';
import { CredentialViewModelService } from '../../services/credentials/credential-view-model/credential-view-model.service';
import { RightPanelService } from '../../services/utils/right-panel/right-panel.service';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { XrplDateService } from '../../core/xrpl-date.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';

// Mock performance API
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

describe('CreateCredentialsComponent', () => {
     let component: CreateCredentialsComponent;
     let fixture: ComponentFixture<CreateCredentialsComponent>;

     let walletManager: jasmine.SpyObj<WalletManagerService>;
     let transactionUiService: jasmine.SpyObj<TransactionUiService>;
     let transactionDropdownService: jasmine.SpyObj<TransactionDropdownService>;
     let txEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let toastService: jasmine.SpyObj<ToastService>;
     let credentialOrchestrator: jasmine.SpyObj<CredentialTransactionOrchestratorService>;
     let credentialUtilService: jasmine.SpyObj<CredentialUtilService>;
     let credentialStore: jasmine.SpyObj<InstanceType<typeof CredentialStore>>;
     let credentialViewModelService: jasmine.SpyObj<CredentialViewModelService>;
     let rightPanelService: jasmine.SpyObj<RightPanelService>;
     let xrplService: jasmine.SpyObj<XrplService>;
     let acccountDataService: jasmine.SpyObj<AcccountDataService>;
     let walletDataService: jasmine.SpyObj<WalletDataService>;
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;

     const subjectSignal = signal('');
     const credentialIDSignal = signal('');
     const credentialTypeSignal = signal('');
     const credentialIssuerSignal = signal('');

     const mockWallet = {
          address: 'rTestWallet1234567890',
          classicAddress: 'rTestWallet1234567890',
          name: 'Test Wallet',
          seed: 'sEdTestSeed1234567890abcdef',
     } as any;

     beforeEach(async () => {
          // Reset performance spies
          mockPerformance.mark.calls.reset();
          mockPerformance.measure.calls.reset();
          mockPerformance.getEntriesByName.calls.reset();
          mockPerformance.clearMarks.calls.reset();
          mockPerformance.clearMeasures.calls.reset();

          xrplService = jasmine.createSpyObj('XrplService', ['getNet']);
          xrplService.getNet.and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });
          walletManager = jasmine.createSpyObj(
               'WalletManagerService',
               [
                    'getSelectedWallet',
                    'ensureWalletSelected',
                    'setSelectedIndex',
                    'walletVm',
                    'getSelectedIndex', // Add this
                    'getSelectedWallet',
                    'hasWallets',
               ],
               {
                    wallets: signal([mockWallet]),
                    selectedIndex: signal(0),
                    hasWallets: computed(() => true),
                    currentWallet: computed(() => mockWallet),
               }
          );
          walletManager.getSelectedWallet.and.returnValue(mockWallet);
          walletManager.ensureWalletSelected.and.returnValue(true);
          walletManager.getSelectedIndex.and.returnValue(0);
          walletManager.getSelectedWallet.and.returnValue(mockWallet);
          walletManager.ensureWalletSelected.and.returnValue(true);

          transactionUiService = jasmine.createSpyObj('TransactionUiService', ['clearAllOptionsAndMessages', 'resetCurrentStepToIdle', 'setTxResultSignal', 'clearMessages', 'clearAllFields'], {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
               spinner: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org'),
               warningMessage: '',
               errorMessage: '',
               infoMessage: '',
               txSignal: signal([]),
               txResultSignal: signal([]),
               stepMessage: signal(''),
               suppressTxClear: signal(false),
          });

          transactionDropdownService = jasmine.createSpyObj('TransactionDropdownService', ['loadCustomDestinations', 'setupAutoSelectOnValidTypedAddress', 'getFinalDestinationAddress', 'allDestinations', 'destinationMap', 'destinationItems', 'selectedDestinationItem', 'filteredDestinations', 'destinationDisplay'], {
               customDestinations: signal([]),
          });

          transactionDropdownService.allDestinations.and.returnValue(signal([]));
          transactionDropdownService.destinationMap.and.returnValue(signal(new Map()));
          transactionDropdownService.destinationItems.and.returnValue(signal([]));
          transactionDropdownService.selectedDestinationItem.and.returnValue(signal(null));
          transactionDropdownService.filteredDestinations.and.returnValue(signal([]));
          transactionDropdownService.destinationDisplay.and.returnValue(signal(''));
          transactionDropdownService.getFinalDestinationAddress.and.returnValue('rDestination123');

          txEnvironmentService = jasmine.createSpyObj('TxEnvironmentService', ['getValidatedEnvironment', 'prepareTxEnvironmentWithWallet', 'prepareTxEnvironment']);
          txEnvironmentService.getValidatedEnvironment.and.resolveTo({
               wallet: mockWallet,
               accountInfo: { result: { account_data: {} } },
               accountObjects: { result: { account_objects: [] } },
               client: {} as any,
               ledgerInfo: { currentRippleTime: Date.now() },
               fee: '10',
          } as any);
          txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo({ client: {}, wallet: mockWallet } as any);
          txEnvironmentService.prepareTxEnvironment.and.resolveTo({ client: {}, wallet: mockWallet, ledgerInfo: { currentRippleTime: 1000 } } as any);

          toastService = jasmine.createSpyObj('ToastService', ['error', 'success', 'info']);

          credentialOrchestrator = jasmine.createSpyObj('CredentialTransactionOrchestratorService', ['executeCredentialTx']);
          credentialOrchestrator.executeCredentialTx.and.resolveTo({ success: true, hash: 'txHash123' });

          credentialUtilService = jasmine.createSpyObj('CredentialUtilService', ['parseIssuedCredentials', 'parseSubjectCredentials', 'selectCredential', 'clearInputFields', 'selectedCredentialIndex']);
          credentialUtilService.parseIssuedCredentials.and.returnValue([]);
          credentialUtilService.parseSubjectCredentials.and.returnValue([]);
          credentialUtilService.selectedCredentialIndex.and.returnValue('0');

          credentialStore = jasmine.createSpyObj('CredentialStore', ['setField', 'getAll', 'resetCredentailFields', 'resetCredentialIdDropDown'], {
               subject: subjectSignal,
               credentialID: credentialIDSignal,
               credentialType: credentialTypeSignal,
               selectedCredentials: signal(null),
               credentialIssuer: credentialIssuerSignal,
               existingCredentials: signal([]),
               subjectCredentials: signal([]),
          });
          credentialStore.getAll.and.returnValue({
               credentialIDs: [],
               credentialID: '',
               credentialType: '',
               subject: '',
               existingCredentials: [],
               subjectCredentials: [],
               credentialIssuer: '',
               credentialIdSearchQuery: '',
          } as any);

          credentialViewModelService = jasmine.createSpyObj('CredentialViewModelService', [], {
               activeTab: signal('createCredential'),
               vm: computed(() => ({
                    actionButtonClass: 'btn-primary',
                    actionButtonLabel: 'Create Credential',
                    canSubmit: true,
                    clearFields: () => {},
                    creds: { dropdown: [], list: [] },
                    destinationItems: [],
                    destinationSearchQuery: '',
                    performAction: () => Promise.resolve(),
                    searchQueryChange: () => {},
                    selectCredential: () => {},
                    selectedDestinationItem: null,
                    view: { walletName: 'Test Wallet', summaryMessage: '' },
               })),
               credentialVm: computed(() => ({
                    list: [{ id: 'cred1', display: 'Credential 1' }],
                    dropdown: [],
               })),
               summaryMessage: computed(() => 'Test summary message'),
               infoData: computed(() => ({
                    walletName: 'Test Wallet',
                    credentialCount: 2,
               })),
          });

          acccountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState', 'refreshUiAccountMetaData']);
          acccountDataService.refreshUiState.and.returnValue();
          acccountDataService.refreshUiAccountMetaData.and.resolveTo();

          walletDataService = jasmine.createSpyObj('WalletDataService', ['refreshWallets']);
          walletDataService.refreshWallets.and.resolveTo();

          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copyAddress', 'copyTxSignal', 'copyTxResultSignal', 'copyAndToast']);
          copyUtilService.copyAddress.and.returnValue();
          copyUtilService.copyTxSignal.and.returnValue();
          copyUtilService.copyTxResultSignal.and.returnValue();
          copyUtilService.copyAndToast.and.returnValue();

          rightPanelService = jasmine.createSpyObj('RightPanelService', ['setPanel']);

          await TestBed.configureTestingModule({
               imports: [CreateCredentialsComponent],
               providers: [
                    provideRouter([]),
                    { provide: WalletManagerService, useValue: walletManager },
                    { provide: TransactionUiService, useValue: transactionUiService },
                    { provide: TransactionDropdownService, useValue: transactionDropdownService },
                    { provide: TxEnvironmentService, useValue: txEnvironmentService },
                    { provide: ToastService, useValue: toastService },
                    { provide: CredentialTransactionOrchestratorService, useValue: credentialOrchestrator },
                    { provide: CredentialUtilService, useValue: credentialUtilService },
                    { provide: CredentialStore, useValue: credentialStore },
                    { provide: CredentialViewModelService, useValue: credentialViewModelService },
                    { provide: RightPanelService, useValue: rightPanelService },
                    { provide: XrplService, useValue: xrplService },
                    { provide: AcccountDataService, useValue: acccountDataService }, // Add this
                    { provide: WalletDataService, useValue: walletDataService },
                    { provide: CopyUtilService, useValue: copyUtilService }, // Add this
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                    { provide: ConnectionGuardService, useValue: { isConnected: signal(true) } },
                    { provide: XrplDateService, useValue: { isExpired: () => false } },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(CreateCredentialsComponent);
          component = fixture.componentInstance;

          (component as any).credentialTabs = CREDENTIAL_TABS;
          (component as any).tabMeta = CREDENTIAL_TAB_META;

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('ngOnInit', () => {
          it('should load custom destinations and set right panel', () => {
               expect(transactionDropdownService.loadCustomDestinations).toHaveBeenCalled();
               expect(rightPanelService.setPanel).toHaveBeenCalled();
          });
     });

     describe('setTab', () => {
          it('should change active tab and clear fields', async () => {
               await component.setTab('acceptCredential');
               expect(credentialViewModelService.activeTab()).toBe('acceptCredential');
               expect(credentialUtilService.clearInputFields).toHaveBeenCalled();
          });
     });

     describe('canSelectCredential', () => {
          it('should return false for createCredential', () => {
               credentialViewModelService.activeTab.set('createCredential');
               expect(component.canSelectCredential({})).toBeFalse();
          });

          it('should return true for acceptCredential and deleteCredential', () => {
               ['acceptCredential', 'deleteCredential'].forEach(tab => {
                    credentialViewModelService.activeTab.set(tab as any);
                    expect(component.canSelectCredential({})).toBeTrue();
               });
          });
     });

     describe('selectWallet', () => {
          it('should not switch if same wallet', () => {
               component.currentWallet.set(mockWallet);
               component.selectWallet(mockWallet);
               expect(component.currentWallet()).toEqual(mockWallet);
          });

          it('should switch wallet', () => {
               const newWallet = { ...mockWallet, address: 'rNewWallet123' };
               component.selectWallet(newWallet);
               expect(component.currentWallet()).toEqual(newWallet);
          });
     });

     describe('getCredentialsForAccount', () => {
          it('should fetch environment and parse credentials', async () => {
               // Reset to successful response
               txEnvironmentService.getValidatedEnvironment.and.resolveTo({
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
                    client: {} as any,
                    ledgerInfo: { currentRippleTime: Date.now() },
                    fee: '10',
               } as any);

               await component.getCredentialsForAccount();

               expect(txEnvironmentService.getValidatedEnvironment).toHaveBeenCalled();
               expect(credentialUtilService.parseIssuedCredentials).toHaveBeenCalled();
               expect(credentialUtilService.parseSubjectCredentials).toHaveBeenCalled();
          });

          it('should handle errors when loading credentials', async () => {
               // Reset to error response for this test only
               txEnvironmentService.getValidatedEnvironment.and.rejectWith(new Error('Network error'));

               await component.getCredentialsForAccount();
               expect(toastService.error).toHaveBeenCalled();
          });
     });

     describe('performAction', () => {
          beforeEach(() => {
               component.currentWallet.set(mockWallet);
               // Reset to successful response for each test
               txEnvironmentService.getValidatedEnvironment.and.resolveTo({
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
                    accountObjects: { result: { account_objects: [] } },
                    client: {} as any,
                    ledgerInfo: { currentRippleTime: Date.now() },
                    fee: '10',
               } as any);
               txEnvironmentService.prepareTxEnvironmentWithWallet.and.resolveTo({
                    client: {},
                    wallet: mockWallet,
                    accountInfo: { result: { account_data: {} } },
               } as any);

               // Mock xrpl.isValidAddress on the component
               (component as any).xrpl = { isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(true) };
          });

          it('should execute createCredential successfully', async () => {
               subjectSignal.set('rDestination123'); // This makes it take the first branch

               credentialViewModelService.activeTab.set('createCredential');

               await component.performAction();

               expect(txEnvironmentService.prepareTxEnvironmentWithWallet).toHaveBeenCalled();
               expect(credentialOrchestrator.executeCredentialTx).toHaveBeenCalled();
          });

          it('should show error for createCredential with invalid destination', async () => {
               subjectSignal.set(''); // Make sure subject is empty so it uses dropdown

               credentialViewModelService.activeTab.set('createCredential');
               transactionDropdownService.getFinalDestinationAddress.and.returnValue('');
               (component as any).xrpl = { isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(false) };

               await component.performAction();

               expect(toastService.error).toHaveBeenCalled();
               expect(credentialOrchestrator.executeCredentialTx).not.toHaveBeenCalled();
          });
     });

     describe('handleSearchQueryChange', () => {
          it('should update destinationSearchQuery and credentialStore', () => {
               component.handleSearchQueryChange('test query');
               expect(component.destinationSearchQuery()).toBe('test query');
               expect(credentialStore.setField).toHaveBeenCalledWith('credentialIdSearchQuery', 'test query');
          });
     });

     describe('handleDestinationChange', () => {
          it('should update selectedDestinationAddress and store subject', () => {
               const mockItem = { id: 'rDest123', display: 'Destination' };
               component.handleDestinationChange(mockItem);

               expect(component.selectedDestinationAddress()).toBe('rDest123');
               expect(credentialStore.setField).toHaveBeenCalledWith('subject', 'rDest123');
          });
     });
});
