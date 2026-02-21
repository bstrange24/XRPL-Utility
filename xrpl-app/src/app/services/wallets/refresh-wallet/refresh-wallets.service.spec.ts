import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import * as xrpl from 'xrpl';
import { WalletDataService } from './refresh-wallets.service';

// Stubs/Spies for dependencies
class MockUtilsService {
     getXrplReserve = jasmine.createSpy('getXrplReserve').and.returnValue(Promise.resolve('2'));
     updateOwnerCountAndReserves = jasmine.createSpy('updateOwnerCountAndReserves').and.callFake((_client: any, _accountInfo: any, _address: string) => Promise.resolve({ ownerCount: 1, totalXrpReserves: '2' }));
}

class MockXrplService {
     getAccountInfo = jasmine.createSpy('getAccountInfo').and.callFake((_client: any, _address: string) => Promise.resolve({ result: { account_data: { Balance: '10000000' } } }));
}

class MockWalletManagerService {
     updateWallet = jasmine.createSpy('updateWallet');
}

class MockNgZone {
     run<T>(fn: () => T): T {
          return fn();
     }
     runOutsideAngular<T>(fn: () => T | Promise<T>): T | Promise<T> {
          return fn();
     }
}

describe('WalletDataService', () => {
     let service: WalletDataService;
     let utilsService: MockUtilsService;
     let xrplService: MockXrplService;
     let walletManagerService: MockWalletManagerService;
     let zone: MockNgZone;

     beforeEach(() => {
          utilsService = new MockUtilsService();
          xrplService = new MockXrplService();
          walletManagerService = new MockWalletManagerService();
          zone = new MockNgZone();

          TestBed.configureTestingModule({
               providers: [
                    { provide: NgZone, useValue: zone },
                    { provide: 'UtilsService', useValue: utilsService },
                    { provide: 'XrplService', useValue: xrplService },
                    { provide: 'WalletManagerService', useValue: walletManagerService },
                    // Provide service with manual deps because it uses constructor injection by type names
                    {
                         provide: WalletDataService,
                         useFactory: (ngZone: NgZone) => new WalletDataService(ngZone as any, utilsService as any, xrplService as any, walletManagerService as any),
                         deps: [NgZone],
                    },
               ],
          });

          service = TestBed.inject(WalletDataService);

          // Default dropsToXrp behavior
          spyOn(xrpl, 'dropsToXrp').and.callFake((drops: any) => {
               // simplistic conversion used for tests
               return Number(drops) / 1_000_000;
          });
     });

     it('should create the service', () => {
          expect(service).toBeTruthy();
     });

     it('should skip refresh when wallets are updated within threshold', async () => {
          const now = Date.now();
          const wallets: any[] = [
               { address: 'rA', lastUpdated: now },
               { address: 'rB', lastUpdated: now },
          ];

          await service.refreshWallets({} as any, wallets, 0);

          expect(xrplService.getAccountInfo).not.toHaveBeenCalled();
          expect(walletManagerService.updateWallet).not.toHaveBeenCalled();
     });

     it('should filter updates by addressesToRefresh', async () => {
          const past = Date.now() - 10_000;
          const wallets: any[] = [
               { address: 'rA', lastUpdated: past },
               { address: 'rB', lastUpdated: past },
          ];

          await service.refreshWallets({} as any, wallets, 0, ['rB']);

          // Only rB should be updated
          expect(xrplService.getAccountInfo).toHaveBeenCalledTimes(1);
          expect(xrplService.getAccountInfo).toHaveBeenCalledWith(jasmine.anything(), 'rB', 'validated', '');
          expect(walletManagerService.updateWallet).toHaveBeenCalledTimes(1);
     });

     it('should compute spendable balance and update wallet manager', async () => {
          const past = Date.now() - 10_000;
          const wallets: any[] = [{ address: 'rA', lastUpdated: past }];

          // Configure conversions: Balance 12 XRP, reserves 5 XRP => spendable 7 XRP
          (xrpl.dropsToXrp as jasmine.Spy).and.returnValue('12');
          utilsService.updateOwnerCountAndReserves.and.returnValue(Promise.resolve({ ownerCount: 2, totalXrpReserves: '5' }));

          await service.refreshWallets({} as any, wallets, 0);

          expect(walletManagerService.updateWallet).toHaveBeenCalledTimes(1);
          const callArgs = walletManagerService.updateWallet.calls.mostRecent().args;
          const updated = callArgs[1];
          expect(updated.ownerCount).toBe(2);
          expect(updated.xrpReserves).toBe('5');
          expect(updated.balance).toBe('7.000000');
          expect(updated.spendableXrp).toBe('7.000000');
          expect(typeof updated.lastUpdated).toBe('number');
     });

     it('should cache reserves across multiple refresh calls', async () => {
          const past = Date.now() - 10_000;
          const wallets: any[] = [{ address: 'rA', lastUpdated: past }];

          await service.refreshWallets({} as any, wallets, 0);

          // Advance time to force refresh again
          (wallets[0].lastUpdated as number) = Date.now() - 10_000;

          await service.refreshWallets({} as any, wallets, 0);

          // getXrplReserve should only be called once due to caching
          expect(utilsService.getXrplReserve).toHaveBeenCalledTimes(1);
     });

     it('should call onUpdate with the current wallet (updated or not)', async () => {
          const fresh = Date.now();
          const past = Date.now() - 10_000;
          const wallets: any[] = [
               { address: 'rCurrent', lastUpdated: fresh }, // not updated due to freshness
               { address: 'rOther', lastUpdated: past }, // will be updated
          ];

          const onUpdate = jasmine.createSpy('onUpdate');

          await service.refreshWallets({} as any, wallets, 0, undefined, onUpdate);

          expect(onUpdate).toHaveBeenCalledTimes(1);
          const args = onUpdate.calls.mostRecent().args;
          expect(args[0]).toBe(wallets);
          expect(args[1].address).toBe('rCurrent');
     });
});
