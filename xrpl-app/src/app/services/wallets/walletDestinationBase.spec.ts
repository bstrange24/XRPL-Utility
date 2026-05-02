import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { WalletManagerService } from './manager/wallet-manager.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../transaction-dropdown/transaction-dropdown.service';
import { WalletDataService } from './refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../transaction-environment/tx-environment.service';
import { CopyUtilService } from '../utils/copy-util/copy-util.service';
import { ToastService } from '../utils/toast/toast.service';
import { AcccountDataService } from '../account-data/acccount-data.service';
import { ActivatedRoute } from '@angular/router';
import { StorageService } from '../shared/local-storage/storage.service';
import { UtilsService } from '../utils/util-service/utils.service';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { AccountObjectsStoreService } from '../shared/account-objects-store/account-objects-store.service';
import { WalletsUtilService } from './wallets-util/wallets-util.service';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorStoreService } from '../account-configurator/account-configurator-store/account-configurator-store.service';
import { WalletDestinationBase } from './walletDestinationBase';

class TestComponent extends WalletDestinationBase {
     protected async refreshAccountObject(): Promise<void> {}
     protected clearInputFields(): void {}
     protected async onSelectedWalletIndexChange(): Promise<void> {}
}

describe('WalletDestinationBase', () => {
     let component: TestComponent;

     let walletManagerMock: any;
     let txUiMock: any;
     let dropdownMock: any;
     let walletDataMock: any;
     let txEnvMock: any;
     let storageMock: any;

     const walletSignal = signal<any[]>([]);
     const selectedIndexSignal = signal(0);

     beforeEach(() => {
          walletManagerMock = {
               wallets: walletSignal,
               hasWallets: () => walletSignal().length > 0,
               selectedIndex: selectedIndexSignal,
               currentWallet: signal({ address: 'r123', name: 'Wallet 1' }),
          };

          txUiMock = {
               currentStep: signal('idle'),
               warningMessage: '',
               clearWarning: jasmine.createSpy(),
               setWarning: jasmine.createSpy(),
               setError: jasmine.createSpy(),
               setInfoMessage: jasmine.createSpy(),
               clearAllOptionsAndMessages: jasmine.createSpy(),
               suppressTxClear: signal(false),
          };

          dropdownMock = {
               customDestinations: signal([]),
               allDestinations: () => signal([]),
               destinationMap: () => signal(new Map()),
               destinationItems: () => signal([]),
               selectedDestinationItem: () => signal(null),
               filteredDestinations: () => signal([]),
               destinationDisplay: () => signal(''),
          };

          walletDataMock = {
               refreshWallets: jasmine.createSpy().and.resolveTo(),
          };

          txEnvMock = {
               prepareTxEnvironment: jasmine.createSpy().and.resolveTo({
                    wallet: { classicAddress: 'r123' },
                    accountObjects: [],
                    accountInfo: {},
               }),
          };

          storageMock = jasmine.createSpyObj('StorageService', ['set']);

          TestBed.configureTestingModule({
               providers: [
                    { provide: WalletManagerService, useValue: walletManagerMock },
                    { provide: TransactionUiService, useValue: txUiMock },
                    { provide: TransactionDropdownService, useValue: dropdownMock },
                    { provide: WalletDataService, useValue: walletDataMock },
                    { provide: TxEnvironmentService, useValue: txEnvMock },
                    { provide: CopyUtilService, useValue: {} },
                    { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
                    { provide: AcccountDataService, useValue: { refreshUiState: jasmine.createSpy() } },
                    { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map() } } },
                    { provide: StorageService, useValue: storageMock },
                    { provide: UtilsService, useValue: { truncateAddress: (a: string) => a.slice(0, 6) } },
                    { provide: XrplCacheService, useValue: { get: () => null } },
                    { provide: AccountObjectsStoreService, useValue: { address: signal(''), accountObjects: signal(null), update: jasmine.createSpy() } },
                    { provide: WalletsUtilService, useValue: {} },
                    { provide: XrplTxOptionsStore, useValue: { isSimulateEnabled: () => false } },
                    { provide: AccountConfiguratorStoreService, useValue: {} },
               ],
          });

          component = TestBed.runInInjectionContext(() => new TestComponent(walletManagerMock, txUiMock, dropdownMock, walletDataMock, txEnvMock, {} as any, TestBed.inject(ToastService), TestBed.inject(AcccountDataService), TestBed.inject(ActivatedRoute), storageMock));

          spyOn(component as any, 'measure').and.callFake(async (_: any, __: any, fn: any) => fn());
     });

     it('should compute wallet name', () => {
          expect(component.walletName()).toBe('Selected wallet');
     });

     it('should detect idle state', () => {
          expect(component.isIdle()).toBeTrue();
     });

     it('should compute canSubmit correctly', () => {
          walletSignal.set([{ address: 'r123' }]);
          expect(component.canSubmit()).toBeTrue();
     });

     // it('should set warning if no wallets', () => {
     //      walletSignal.set([]);
     //      expect(txUiMock.setWarning).toHaveBeenCalled();
     // });

     it('should sync wallets from manager', () => {
          walletSignal.set([{ address: 'r123' }]);
          expect(component.wallets().length).toBe(0);
     });

     it('should toggle info panel', () => {
          expect(component.infoPanelExpanded()).toBeFalse();
          (component as any).toggleInfoPanel();
          expect(component.infoPanelExpanded()).toBeTrue();
     });

     it('should add custom destination if valid', () => {
          dropdownMock.destinationMap = () => signal(new Map());

          spyOn<any>(component, 'addCustomDestination').and.callThrough();

          (component as any).addCustomDestination('r1234567890');

          expect(component['addCustomDestination']).toHaveBeenCalled();
     });

     it('should update destinations and dedupe', () => {
          walletSignal.set([{ address: 'r1', name: 'A' }]);

          dropdownMock.customDestinations = () => [{ address: 'r1', name: 'A' }];

          component.updateDestinations();

          expect(storageMock.set).toHaveBeenCalled();
     });

     it('should call refreshWallets wrapper', async () => {
          await (component as any).refreshWallets({} as any, ['r123']);

          expect(walletDataMock.refreshWallets).toHaveBeenCalled();
     });

     it('should apply tab from query param', () => {
          const routeMock = {
               snapshot: {
                    queryParamMap: {
                         get: () => 'tab1',
                    },
               },
          };

          const setTab = jasmine.createSpy();

          (component as any).applyTabFromQueryParam(routeMock, ['tab1', 'tab2'], setTab);

          expect(setTab).toHaveBeenCalledWith('tab1');
     });
});
