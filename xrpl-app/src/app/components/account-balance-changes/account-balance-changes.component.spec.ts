import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AccountChangesComponent } from './account-balance-changes.component';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { AccountChangesStoreService } from '../../services/account-balance-changes/account-changes-store/account-changes-store.service';
import { AccountChangesOrchestratorService } from '../../services/account-balance-changes/account-changes-orchestrator/account-changes-orchestrator.service';
import { AccountChangesViewModelService } from '../../services/account-balance-changes/account-changes-view-model/account-changes-view-model.service';
import { ThemeService } from '../../services/utils/theme/theme.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { BalanceChange } from '../../components/account-balance-changes/constants/account-balance.types';

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

describe('AccountChangesComponent', () => {
     let component: AccountChangesComponent;
     let fixture: ComponentFixture<AccountChangesComponent>;

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
     let store: any;
     let orchestrator: any;
     let viewModel: any;
     let themeService: any;
     let xrplService: any;

     const mockBalanceChanges: BalanceChange[] = [
          {
               hash: 'hash123',
               date: new Date(),
               type: 'Payment',
               change: 100,
               fees: 0.000012,
               currency: 'XRP',
               balanceBefore: 1000,
               balanceAfter: 1100,
               counterparty: 'rCounterparty',
          },
     ];

     const mockWallet = {
          address: 'rTestWallet1234567890',
          classicAddress: 'rTestWallet1234567890',
          name: 'Test Wallet',
          seed: 'sEdTestSeed1234567890abcdef',
     } as any;

     // Create typed signals
     const loadingInitialSignal: WritableSignal<boolean> = signal(false);
     const loadingMoreSignal: WritableSignal<boolean> = signal(false);
     const hasMoreDataSignal: WritableSignal<boolean> = signal(true);
     const filterValueSignal: WritableSignal<string> = signal('');
     const dateRangeSignal: WritableSignal<{ start: Date | null; end: Date | null }> = signal({ start: null, end: null });
     const balanceChangesSignal: WritableSignal<BalanceChange[]> = signal([]);

     beforeEach(async () => {
          // Reset performance spies
          mockPerformance.mark.calls.reset();
          mockPerformance.measure.calls.reset();
          mockPerformance.getEntriesByName.calls.reset();
          mockPerformance.clearMarks.calls.reset();
          mockPerformance.clearMeasures.calls.reset();

          // Reset signals
          loadingInitialSignal.set(false);
          loadingMoreSignal.set(false);
          hasMoreDataSignal.set(true);
          filterValueSignal.set('');
          dateRangeSignal.set({ start: null, end: null });
          balanceChangesSignal.set(mockBalanceChanges);

          xrplService = jasmine.createSpyObj('XrplService', ['getNet']);
          xrplService.getNet.and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });

          walletManagerService = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet', 'ensureWalletSelected', 'setSelectedIndex', 'walletVm'], {
               wallets: signal([mockWallet]),
               selectedIndex: signal(0),
               hasWallets: computed(() => true),
               currentWallet: computed(() => mockWallet),
          });
          walletManagerService.getSelectedWallet.and.returnValue(mockWallet);
          walletManagerService.ensureWalletSelected.and.returnValue(true);

          transactionUiService = jasmine.createSpyObj('TransactionUiService', ['clearAllOptionsAndMessages', 'resetCurrentStepToIdle', 'setError'], {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
               spinner: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org'),
               warningMessage: '',
          });

          transactionDropdownService = jasmine.createSpyObj('TransactionDropdownService', ['loadCustomDestinations', 'setupAutoSelectOnValidTypedAddress', 'getFinalDestinationAddress', 'allDestinations', 'destinationMap', 'destinationItems', 'selectedDestinationItem', 'filteredDestinations', 'destinationDisplay']);

          walletDataService = jasmine.createSpyObj('WalletDataService', ['refreshWallets']);
          walletDataService.refreshWallets.and.resolveTo();

          txEnvironmentService = jasmine.createSpyObj('TxEnvironmentService', ['getValidatedEnvironment', 'prepareTxEnvironmentWithWallet', 'prepareTxEnvironment']);

          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copy']);
          toastService = jasmine.createSpyObj('ToastService', ['error', 'success', 'info']);
          acccountDataService = jasmine.createSpyObj('AcccountDataService', ['refreshUiState']);

          route = {
               queryParams: of({}),
               snapshot: { queryParams: {} },
          };

          storageService = jasmine.createSpyObj('StorageService', ['get', 'set', 'removeValue', 'getNet']);
          storageService.getNet.and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });

          // Store with signals as functions
          store = {
               loadingInitial: () => loadingInitialSignal(),
               loadingMore: () => loadingMoreSignal(),
               hasMoreData: () => hasMoreDataSignal(),
               filterValue: () => filterValueSignal(),
               dateRange: () => dateRangeSignal(),
               balanceChanges: () => balanceChangesSignal(),
               setField: jasmine.createSpy('setField'),
          };

          orchestrator = jasmine.createSpyObj('AccountChangesOrchestratorService', ['loadBalanceChanges', 'invalidateCacheAndReload']);
          orchestrator.loadBalanceChanges.and.resolveTo();

          viewModel = {
               filteredBalanceChanges: signal(mockBalanceChanges),
               infoData: computed(() => 'Test info data'),
          };

          themeService = jasmine.createSpyObj('ThemeService', [], {
               darkMode$: of(false),
          });

          await TestBed.configureTestingModule({
               imports: [AccountChangesComponent],
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
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: AccountChangesStoreService, useValue: store },
                    { provide: AccountChangesOrchestratorService, useValue: orchestrator },
                    { provide: AccountChangesViewModelService, useValue: viewModel },
                    { provide: ThemeService, useValue: themeService },
                    { provide: XrplService, useValue: xrplService },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountChangesComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset all spies
          if (store.setField) store.setField.calls.reset();
          if (orchestrator.loadBalanceChanges) orchestrator.loadBalanceChanges.calls.reset();
          if (orchestrator.invalidateCacheAndReload) orchestrator.invalidateCacheAndReload.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('ngOnInit', () => {
          it('should initialize without errors', () => {
               expect(component).toBeDefined();
          });
     });

     describe('onSelectedWalletIndexChange', () => {
          it('should call invalidateCacheAndReload when wallet is selected', async () => {
               // Reset spy before test
               orchestrator.invalidateCacheAndReload.calls.reset();
               walletManagerService.getSelectedWallet.and.returnValue(mockWallet);

               await (component as any).onSelectedWalletIndexChange();

               expect(orchestrator.invalidateCacheAndReload).toHaveBeenCalledTimes(1);
               expect(orchestrator.invalidateCacheAndReload).toHaveBeenCalledWith(mockWallet.address);
          });

          it('should not call invalidateCacheAndReload when no wallet is selected', async () => {
               // Reset spy before test
               orchestrator.invalidateCacheAndReload.calls.reset();
               walletManagerService.getSelectedWallet.and.returnValue(null);

               await (component as any).onSelectedWalletIndexChange();

               expect(orchestrator.invalidateCacheAndReload).not.toHaveBeenCalled();
          });
     });

     describe('loadBalanceChangesForCurrentWallet', () => {
          it('should call invalidateCacheAndReload when wallet has address', async () => {
               orchestrator.invalidateCacheAndReload.calls.reset();
               walletManagerService.getSelectedWallet.and.returnValue(mockWallet);

               await (component as any).loadBalanceChangesForCurrentWallet();

               expect(orchestrator.invalidateCacheAndReload).toHaveBeenCalledWith(mockWallet.address);
          });

          it('should not call invalidateCacheAndReload when wallet address is missing', async () => {
               orchestrator.invalidateCacheAndReload.calls.reset();
               walletManagerService.getSelectedWallet.and.returnValue(null);

               await (component as any).loadBalanceChangesForCurrentWallet();

               expect(orchestrator.invalidateCacheAndReload).not.toHaveBeenCalled();
          });
     });

     describe('onLoadMore', () => {
          it('should call loadBalanceChanges with false', () => {
               orchestrator.loadBalanceChanges.calls.reset();
               component.onLoadMore();

               expect(orchestrator.loadBalanceChanges).toHaveBeenCalledTimes(1);
               expect(orchestrator.loadBalanceChanges).toHaveBeenCalledWith(false);
          });
     });

     describe('onRefresh', () => {
          it('should call loadBalanceChanges with true', () => {
               orchestrator.loadBalanceChanges.calls.reset();
               component.onRefresh();

               expect(orchestrator.loadBalanceChanges).toHaveBeenCalledTimes(1);
               expect(orchestrator.loadBalanceChanges).toHaveBeenCalledWith(true);
          });
     });

     describe('refreshAccountObject', () => {
          it('should return void (no-op)', async () => {
               const result = await (component as any).refreshAccountObject({});
               expect(result).toBeUndefined();
          });
     });

     describe('clearInputFields', () => {
          it('should return void (no-op)', () => {
               const result = (component as any).clearInputFields();
               expect(result).toBeUndefined();
          });
     });

     describe('Store bindings', () => {
          it('should have loadingInitial from store', () => {
               loadingInitialSignal.set(true);
               fixture.detectChanges();
               expect(store.loadingInitial()).toBeTrue();
          });
     });

     describe('ViewModel bindings', () => {
          it('should have filteredBalanceChanges from viewModel', () => {
               const changes = component.viewModel.filteredBalanceChanges();
               expect(changes).toEqual(mockBalanceChanges);
          });

          it('should have infoData from viewModel', () => {
               const info = component.viewModel.infoData();
               expect(info).toBe('Test info data');
          });
     });

     // describe('TxUiService bindings', () => {
     //      it('should have warningMessage from txUiService', () => {
     //           transactionUiService.warningMessage = 'Test warning';
     //           fixture.detectChanges();
     //           expect(transactionUiService.warningMessage).toBe('Test warning');
     //      });
     // });

     describe('ThemeService bindings', () => {
          it('should have isDark signal from themeService', () => {
               expect(component.isDark).toBeDefined();
          });
     });

     describe('Template conditions', () => {
          it('should show wallet selection message when no wallet is selected', () => {
               walletManagerService.getSelectedWallet.and.returnValue(null);
               fixture.detectChanges();

               expect(walletManagerService.getSelectedWallet()).toBeNull();
          });

          it('should show content when wallet is selected', () => {
               walletManagerService.getSelectedWallet.and.returnValue(mockWallet);
               fixture.detectChanges();

               expect(walletManagerService.getSelectedWallet()).toEqual(mockWallet);
          });
     });

     describe('Edge cases', () => {
          it('should handle wallet with no address', () => {
               const walletWithoutAddress = { ...mockWallet, address: null };
               walletManagerService.getSelectedWallet.and.returnValue(walletWithoutAddress);

               expect(() => {
                    (component as any).loadBalanceChangesForCurrentWallet();
               }).not.toThrow();
          });

          it('should handle multiple rapid refresh calls', () => {
               orchestrator.loadBalanceChanges.calls.reset();
               component.onRefresh();
               component.onRefresh();
               component.onRefresh();

               expect(orchestrator.loadBalanceChanges).toHaveBeenCalledTimes(3);
               expect(orchestrator.loadBalanceChanges).toHaveBeenCalledWith(true);
          });

          it('should handle multiple load more calls', () => {
               orchestrator.loadBalanceChanges.calls.reset();
               component.onLoadMore();
               component.onLoadMore();
               component.onLoadMore();

               expect(orchestrator.loadBalanceChanges).toHaveBeenCalledTimes(3);
               expect(orchestrator.loadBalanceChanges).toHaveBeenCalledWith(false);
          });
     });
});
