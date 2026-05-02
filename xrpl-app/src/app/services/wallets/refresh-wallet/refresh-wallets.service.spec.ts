import { WalletManagerService } from '../manager/wallet-manager.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { NetworkService } from '../../utils/network/network-service';
import { NgZone, signal } from '@angular/core';
import { WalletDataService } from './refresh-wallets.service';
import { provideZoneChangeDetection } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

describe('WalletDataService', () => {
     let service: WalletDataService;

     let walletManagerMock: jasmine.SpyObj<WalletManagerService>;
     let utilsMock: jasmine.SpyObj<UtilsService>;
     let toastMock: jasmine.SpyObj<ToastService>;
     let txUiMock: jasmine.SpyObj<TransactionUiService>;

     let networkSignal = signal<string | undefined>(undefined);

     const mockWallet = {
          address: 'r123',
          classicAddress: 'r123',
          seed: '',
          balance: '0',
          lastUpdated: 0,
     };

     beforeEach(async () => {
          // ← async + await is safer
          walletManagerMock = jasmine.createSpyObj<WalletManagerService>('WalletManagerService', ['wallets', 'getSelectedIndex', 'updateWallet']);
          utilsMock = jasmine.createSpyObj<UtilsService>('UtilsService', ['sleep']);
          toastMock = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
          txUiMock = {} as jasmine.SpyObj<TransactionUiService>; // fixed earlier

          walletManagerMock.wallets.and.returnValue([mockWallet]);
          walletManagerMock.getSelectedIndex.and.returnValue(0);

          const ngZoneMock = {
               run: (fn: any) => fn(),
               runOutsideAngular: (fn: any) => fn(),
          };

          const networkMock = {
               networkChanged: networkSignal, // your signal
          };

          await TestBed.configureTestingModule({
               providers: [WalletDataService, { provide: WalletManagerService, useValue: walletManagerMock }, { provide: UtilsService, useValue: utilsMock }, { provide: ToastService, useValue: toastMock }, { provide: TransactionUiService, useValue: txUiMock }, { provide: NetworkService, useValue: networkMock }, { provide: NgZone, useValue: ngZoneMock }, provideZoneChangeDetection({ eventCoalescing: true })],
          }).compileComponents();

          service = TestBed.inject(WalletDataService);

          // Patch xrplService (still needed because it's not injected)
          (service as any).xrplService = {
               getAccountInfo: jasmine.createSpy().and.resolveTo({
                    result: { account_data: { Balance: '1000000' } },
               }),
               getXrplReserve: jasmine.createSpy().and.resolveTo(10),
               updateOwnerCountAndReserves: jasmine.createSpy().and.resolveTo({
                    ownerCount: '1',
                    totalXrpReserves: '10',
               }),
          };

          // Bypass PerformanceBaseComponent.measure
          spyOn(service as any, 'measure').and.callFake(async (_: any, __: any, fn: any) => fn());
     });

     it('should queue refresh and call performRefreshWallets', fakeAsync(() => {
          const spy = spyOn<any>(service, 'performRefreshWallets').and.resolveTo();

          service.refreshWallets({} as any);

          tick(300); // pass debounceTime

          expect(spy).toHaveBeenCalled();
     }));

     it('should update wallets when refresh runs', async () => {
          await (service as any).performRefreshWallets({} as any, [mockWallet], 0);

          expect(walletManagerMock.updateWallet).toHaveBeenCalled();
     });

     it('should skip update if wallets are fresh', async () => {
          const freshWallet = {
               ...mockWallet,
               lastUpdated: Date.now(),
          };

          walletManagerMock.wallets.and.returnValue([freshWallet]);

          const onUpdate = jasmine.createSpy();

          await (service as any).performRefreshWallets({} as any, [freshWallet], 0, undefined, onUpdate);

          expect(walletManagerMock.updateWallet).not.toHaveBeenCalled();
          expect(onUpdate).toHaveBeenCalled();
     });

     it('should filter wallets by address', async () => {
          await (service as any).performRefreshWallets({} as any, [mockWallet], 0, ['r123']);

          expect(walletManagerMock.updateWallet).toHaveBeenCalled();
     });

     it('should handle XRPL errors gracefully', async () => {
          (service as any).xrplService.getAccountInfo.and.rejectWith(new Error('fail'));

          await (service as any).performRefreshWallets({} as any, [mockWallet], 0);

          expect(toastMock.error).toHaveBeenCalled();
     });

     it('should call onUpdate with updated wallet', async () => {
          const onUpdate = jasmine.createSpy();

          await (service as any).performRefreshWallets({} as any, [mockWallet], 0, undefined, onUpdate);

          expect(onUpdate).toHaveBeenCalled();
     });

     it('should always resolve promise in refreshWallets', fakeAsync(() => {
          let resolved = false;

          service.refreshWallets({} as any).then(() => (resolved = true));

          tick(300);

          expect(resolved).toBeTrue();
     }));
});
