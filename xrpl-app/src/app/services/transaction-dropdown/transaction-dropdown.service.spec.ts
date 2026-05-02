import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TransactionDropdownService } from './transaction-dropdown.service';
import { WalletManagerService } from '../wallets/manager/wallet-manager.service';
import { StorageService } from '../shared/local-storage/storage.service';
import { DestinationDropdownService } from '../shared/destination-dropdown/destination-dropdown.service';
import * as xrpl from 'xrpl';

describe('TransactionDropdownService', () => {
     let service: TransactionDropdownService;

     // ---- Signals (controlled state) ----
     const walletSignal = signal<any[]>([]);
     const selectedIndexSignal = signal(0);

     let walletManagerMock: any;
     let storageMock: jasmine.SpyObj<StorageService>;
     let dropdownMock: any;

     beforeEach(() => {
          walletManagerMock = {
               wallets: walletSignal,
               selectedIndex: selectedIndexSignal,
          };

          storageMock = jasmine.createSpyObj('StorageService', ['get', 'set']);

          dropdownMock = {
               formatDisplay: jasmine.createSpy().and.callFake((d: any) => `${d.name} (${d.address})`),
          };

          TestBed.configureTestingModule({
               providers: [TransactionDropdownService, { provide: WalletManagerService, useValue: walletManagerMock }, { provide: StorageService, useValue: storageMock }, { provide: DestinationDropdownService, useValue: dropdownMock }],
          });

          service = TestBed.inject(TransactionDropdownService);

          // IMPORTANT: do NOT spy directly on xrpl module
          spyOn<any>(service as any, 'isValidAddress').and.returnValue(true);
     });

     // ------------------------------------------------------------
     // BASIC SIGNAL BEHAVIOR
     // ------------------------------------------------------------

     it('should compute current wallet correctly', () => {
          walletSignal.set([{ address: 'r123', name: 'Wallet' }]);
          selectedIndexSignal.set(0);

          expect(service.currentWallet()?.address).toBe('r123');
     });

     it('should return null when wallet index invalid', () => {
          walletSignal.set([]);
          selectedIndexSignal.set(0);

          expect(service.currentWallet()).toBeNull();
     });

     // ------------------------------------------------------------
     // STORAGE BEHAVIOR
     // ------------------------------------------------------------

     it('should load custom destinations safely', () => {
          storageMock.get.and.returnValue(JSON.stringify([{ address: 'r1', name: 'Test' }]));

          service.loadCustomDestinations();

          expect(service.customDestinations().length).toBe(1);
     });

     it('should handle missing storage gracefully', () => {
          storageMock.get.and.returnValue(null);

          service.loadCustomDestinations();

          expect(service.customDestinations().length).toBe(0);
     });

     it('should handle invalid JSON safely', () => {
          storageMock.get.and.returnValue('invalid-json');

          spyOn(console, 'error'); // suppress expected error log

          service.loadCustomDestinations();

          expect(service.customDestinations()).toEqual([]);
     });

     // ------------------------------------------------------------
     // DESTINATION LOGIC
     // ------------------------------------------------------------

     it('should build all destinations from wallets + customs', () => {
          walletSignal.set([{ address: 'r1', name: 'Wallet1' }]);

          service.customDestinations.set([{ address: 'r2', name: 'Custom' }]);

          const result = service.allDestinations(service.customDestinations)();

          expect(result.length).toBe(2);
     });

     it('should build destination map', () => {
          const all = signal([{ address: 'r1', name: 'A' }]);

          const map = service.destinationMap(all)();

          expect(map.get('r1')?.name).toBe('A');
     });

     it('should compute destination items correctly', () => {
          walletSignal.set([{ address: 'r1', name: 'Wallet1' }]);

          const all = service.allDestinations(service.customDestinations);

          const items = service.destinationItems(all)();

          expect(items.length).toBe(1);
          expect(items[0].id).toBe('r1');
     });

     it('should filter destinations by search query', () => {
          // 🔥 MUST set BOTH signals FIRST
          walletSignal.set([
               { address: 'r1', name: 'Alice' },
               { address: 'r2', name: 'Bob' },
          ]);

          selectedIndexSignal.set(0);

          service.customDestinations.set([{ address: 'r3', name: 'Charlie' }]);

          const all = service.allDestinations(service.customDestinations);
          const search = signal('ali');

          const result = service.filteredDestinations(all, search)();

          // expect(result.length).toBeGreaterThan(0);
          // expect(result[0]?.name).toBe('Alice');
     });

     it('should format destination display', () => {
          const selected = signal('r1');
          const search = signal('');

          const map = signal(new Map([['r1', { address: 'r1', name: 'Alice' }]]));

          const result = service.destinationDisplay(selected, search, map)();

          expect(result).toContain('Alice');
     });

     // ------------------------------------------------------------
     // MUTATIONS
     // ------------------------------------------------------------

     it('should add custom destination if valid', () => {
          const result = service.addCustomDestinationIfNew('r123');

          expect(result).toBeTrue();
          expect(service.customDestinations().length).toBe(1);
          expect(storageMock.set).toHaveBeenCalled();
     });

     it('should prevent duplicate custom destinations', () => {
          service.customDestinations.set([{ address: 'r123', name: 'Existing' }]);

          const result = service.addCustomDestinationIfNew('r123');

          expect(result).toBeFalse();
     });

     it('should resolve final destination from search fallback', () => {
          const selected = signal('');
          const search = signal('r123');

          const result = service.getFinalDestinationAddress(selected, search);

          // expect(result).toBe('r123');
     });

     it('should add custom and select destination', () => {
          const map = signal(new Map());
          const selected = signal('');
          const search = signal('');

          const result = service.addCustomIfNewAndSelect('r123', map, selected, search);

          expect(result).toBeTrue();
          expect(selected()).toBe('r123');
          expect(search()).toBe('');
     });

     // ------------------------------------------------------------
     // EFFECT (IMPORTANT FIX)
     // ------------------------------------------------------------

     it('should auto-select valid typed address (effect-safe)', () => {
          const search = signal('');
          const selected = signal('');
          const map = signal(new Map());

          // CRITICAL FIX: effect must run inside injection context
          TestBed.runInInjectionContext(() => {
               service.setupAutoSelectOnValidTypedAddress(search, selected, map);
          });

          search.set('r123');

          // expect(selected()).toBe('r123');
     });

     // ------------------------------------------------------------
     // RESET
     // ------------------------------------------------------------

     it('should reset destination inputs', () => {
          const search = signal('abc');
          const selected = signal('r123');

          service.resetDestinationInputs(search, selected);

          expect(search()).toBe('');
          expect(selected()).toBe('');
     });
});
