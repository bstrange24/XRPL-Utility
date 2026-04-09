import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { CreateTicketsComponent } from './tickets.component';

// Service stubs and minimal fakes to satisfy DI and isolate component logic
class MockTransactionUiService {
     // Signals mimicking the service API used by the component
     ticketArray = signal<string[]>([]);
     spinner = signal<boolean>(false);

     // Flags and state used in various paths (not all needed for these tests)
     suppressSuccessMessage = { set: (_: boolean) => {} } as any;
     regularKeySigningEnabled = { set: (_: any) => {} } as any;
     signerQuorum = { set: (_: any) => {} } as any;
     signers = { set: (_: any) => {} } as any;
     multiSigningEnabled = { set: (_: any) => {} } as any;
     // multiSignAddress = { set: (_: any) => {} } as any;
     // multiSignSeeds = { set: (_: any) => {} } as any;
     ticketCountField = { set: (_: any) => _ } as any;
     currentWallet = { set: (_: any) => {} } as any;

     // Methods used by tests
     clearAllOptionsAndMessages = jasmine.createSpy('clearAllOptionsAndMessages');
     clearAllOptions = jasmine.createSpy('clearAllOptions');
     setError = jasmine.createSpy('setError');
     setWarning = jasmine.createSpy('setWarning');
     setInfoMessage = jasmine.createSpy('setInfoMessage');

     // Unused in our tests but referenced by component paths
     isSimulateEnabled() {
          return false;
     }
     showWithDelay(_msg: string, _delay: number) {}
     updateSpinnerMessage(_msg: string) {}
     addTxHashSignal(_hash: string) {}
     isTicket() {
          return false;
     }
     selectedSingleTicket() {
          return '';
     }
     selectedTickets() {
          return [] as string[];
     }
     isMemoEnabled() {
          return false;
     }
     memoField() {
          return '';
     }
     getValidationInputs(arg: any) {
          return arg;
     }
     useMultiSign() {
          return false;
     }
     isRegularKeyAddress() {
          return false;
     }
     regularKeyAddress() {
          return '';
     }
     regularKeySeed() {
          return '';
     }
     multiSignAddress() {
          return '';
     }
     multiSignSeeds() {
          return '';
     }
     warningMessage = '';
     successMessage = '';
}

class MockWalletManagerService {
     hasWalletsFromWallets$ = of(false);
     wallets$ = of([]);
     selectedIndex$ = of(0);
     getSelectedIndex = () => 0;
}

class MockStorageService {
     private store = new Map<string, any>();
     get(key: string) {
          return this.store.get(key) ?? null;
     }
     set(key: string, val: any) {
          this.store.set(key, val);
     }
     removeValue(_key: string) {}
}

class MockUtilsService {
     logObjects(_label: string, _value: any) {}
     getAccountTickets(_accountObjects: any) {
          return [] as string[];
     }
     setSuccess(_result: any) {}
     setTicketSequence(_tx: any, _ticket: any, _force: boolean) {}
     setMemoField(_tx: any, _memo: string) {}
     checkForSignerAccounts(_objs: any) {
          return { signerAccounts: [], signerQuorum: 0 };
     }
     setRegularKeyProperties(_rk: any, _acct: any) {
          return { regularKeyAddress: '', regularKeySeed: '' };
     }
     async getWalletWithEncryptionAlgorithm(_seed: string, _alg: 'ed25519' | 'secp256k1') {
          return { classicAddress: 'rTEST', address: 'rTEST' } as any;
     }
}

class MockValidationService {
     async validate(_rule: string, _payload: any) {
          return [] as string[];
     }
}

class MockXrplCacheService {
     async getAccountData(_addr: string, _force: boolean) {
          return { accountInfo: { result: { account_data: {} } }, accountObjects: { result: { account_objects: [] } } };
     }
     async getFee(_svc: any, _force: boolean) {
          return '10';
     }
     getClient(cb: any) {
          return cb();
     }
}

class MockWalletDataService {
     async refreshWallets(_client: any, _wallets: any, _idx: number, _addresses: string[] | undefined, _cb: Function) {
          _cb([], { classicAddress: 'rTEST', address: 'rTEST' });
     }
}
class MockToastService {}
class MockXrplTransactionExecutorService {}

// Overlay minimal stub (not used by our tests but injected during construction)
class MockOverlay {
     position() {
          return { flexibleConnectedTo: () => ({ withPositions: () => ({}) }) } as any;
     }
     scrollStrategies = { reposition: () => ({}) } as any;
     create() {
          return { hasAttached: () => false, attach: (_: any) => {}, dispose: () => {}, backdropClick: () => of() } as any;
     }
}

// Provide a minimal xrpl service via the base class token if needed (component references this.xrplService in some methods via base). We avoid calling those paths.
class MockXrplService {
     async getLastLedgerIndex(_client: any) {
          return 1;
     }
     filterAccountObjectsByTypes(_objs: any, _types: string[]) {
          return { result: { account_objects: [] } };
     }
     async getAccountObjects(_client: any, _addr: string, _ledger: string, _type: string) {
          return { result: { account_objects: [] } };
     }
     async checkTicketExists(_client: any, _addr: string, _ticket: number) {
          return false;
     }
     getClient() {
          return Promise.resolve({}) as any;
     }
}

// Note: PerformanceBaseComponent is imported by the component; we will stub withPerf to avoid executing any base performance logic.

describe('CreateTicketsComponent (unit)', () => {
     let fixture: ComponentFixture<CreateTicketsComponent>;
     let component: CreateTicketsComponent;
     let txUi: MockTransactionUiService;
     let walletMgr: MockWalletManagerService;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               providers: [
                    { provide: MockXrplService, useClass: MockXrplService }, // Just to ensure availability if base requests
                    { provide: 'XrplService', useExisting: MockXrplService } as any,
                    { provide: MockTransactionUiService, useClass: MockTransactionUiService },
                    { provide: MockWalletManagerService, useClass: MockWalletManagerService },
                    // Map real tokens used by the component to our mocks
                    { provide: (require('../../services/transaction-ui/transaction-ui.service') as any).TransactionUiService, useExisting: MockTransactionUiService },
                    { provide: (require('../../services/wallets/manager/wallet-manager.service') as any).WalletManagerService, useExisting: MockWalletManagerService },
                    { provide: (require('../../services/local-storage/storage.service') as any).StorageService, useClass: MockStorageService },
                    { provide: (require('../../services/util-service/utils.service') as any).UtilsService, useClass: MockUtilsService },
                    { provide: (require('../../services/validation/transaction-validation-rule.service') as any).ValidationService, useClass: MockValidationService },
                    { provide: (require('../../services/xrpl-cache/xrpl-cache.service') as any).XrplCacheService, useClass: MockXrplCacheService },
                    { provide: (require('../../services/wallets/refresh-wallet/refersh-wallets.service') as any).WalletDataService, useClass: MockWalletDataService },
                    { provide: (require('../../services/toast/toast.service') as any).ToastService, useClass: MockToastService },
                    { provide: (require('../../services/xrpl-transaction-executor/xrpl-transaction-executor.service') as any).XrplTransactionExecutorService, useClass: MockXrplTransactionExecutorService },
                    { provide: (require('@angular/cdk/overlay') as any).Overlay, useClass: MockOverlay },
               ],
          })
               // Avoid compiling the heavy real template. Provide a minimal template.
               .overrideComponent(CreateTicketsComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(CreateTicketsComponent);
          component = fixture.componentInstance;
          txUi = TestBed.inject(MockTransactionUiService);
          walletMgr = TestBed.inject(MockWalletManagerService);

          // Run initial change detection
          fixture.detectChanges();
     });

     it('should set error when wallets exist but no wallet is selected during getTickets', async () => {
          // Arrange
          component.wallets.set([{ address: 'rXXXX', name: 'W1' } as any]); // hasWallets => true
          walletMgr.getSelectedIndex = () => -1; // simulate no selection

          // Ensure withPerf runs the callback synchronously
          spyOn<any>(component as any, 'withPerf').and.callFake((_label: string, fn: any) => fn());

          // Act
          await component.getTickets();

          // Assert
          expect(txUi.setError).toHaveBeenCalledWith('Please select a wallet.');
          expect(txUi.spinner()).toBeFalse();
     });

     it('should filter tickets by search query', () => {
          // Arrange
          txUi.ticketArray.set(['100', '101', '202']);
     });

     // it('should compute allTicketsSelected when selection equals total tickets', () => {
     //      // Arrange
     //      txUi.ticketArray.set(['A', 'B', 'C']);
     //      component.selectedTicketSequences.set(['A', 'B', 'C']);

     //      // Act & Assert
     //      expect(component.allTicketsSelected()).toBeTrue();

     //      // Now partial selection
     //      component.selectedTicketSequences.set(['A']);
     //      expect(component.allTicketsSelected()).toBeFalse();
     // });

     // it('should toggle a single ticket selection and clear options/messages', () => {
     //      // Arrange
     //      txUi.ticketArray.set(['X']);

     //      // Act - add
     //      component.toggleTicketSelection('X');

     //      // Assert
     //      expect(component.selectedTicketSequences()).toEqual(['X']);
     //      expect(txUi.clearAllOptionsAndMessages).toHaveBeenCalled();

     //      // Act - remove
     //      (txUi.clearAllOptionsAndMessages as jasmine.Spy).calls.reset();
     //      component.toggleTicketSelection('X');

     //      expect(component.selectedTicketSequences()).toEqual([]);
     //      expect(txUi.clearAllOptionsAndMessages).toHaveBeenCalled();
     // });

     // it('should select all tickets when not all selected, and clear when all selected', () => {
     //      // Arrange
     //      txUi.ticketArray.set(['1', '2', '3']);

     //      // Act - select all
     //      component.toggleSelectAll();
     //      expect(component.selectedTicketSequences()).toEqual(['1', '2', '3']);

     //      // Act - clear all
     //      component.toggleSelectAll();
     //      expect(component.selectedTicketSequences()).toEqual([]);
     // });

     // it('should clear destination search and call getTickets when switching tabs with wallets', async () => {
     //      // Arrange
     //      component.wallets.set([{ address: 'rXXXX', name: 'W1' } as any]); // hasWallets => true
     //      component.destinationSearchQuery.set('some query');
     //      spyOn(component, 'getTickets').and.returnValue(Promise.resolve());

     //      // Act
     //      await component.setTab('delete');

     //      // Assert
     //      expect(component.destinationSearchQuery()).toBe('');
     //      expect(component.getTickets).toHaveBeenCalled();
     // });
});
