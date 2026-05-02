import { TestBed } from '@angular/core/testing';
import { AmmStoreService } from './amm-store.service';

describe('AmmStoreService', () => {
     let store: InstanceType<typeof AmmStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [AmmStoreService],
          });

          store = TestBed.inject(AmmStoreService);
     });

     it('should create store with initial state', () => {
          const state = store.getAll();

          expect(state.weSpendCurrency).toBe('XRP');
          expect(state.isMarketOrder).toBeFalse();
          expect(state.isPassive).toBeTrue();
          expect(state.lpTokenBalanceField).toBe('0');
          expect(state.tradingFeeField).toBe('0.1');
          expect(state.availableCurrencies).toEqual([]);
     });

     describe('setField', () => {
          it('should set primitive field', () => {
               store.setField('destination', 'rDEST');

               expect(store.destination()).toBe('rDEST');
          });

          it('should set array field', () => {
               store.setField('availableCurrencies', ['XRP', 'USD']);

               expect(store.availableCurrencies()).toEqual(['XRP', 'USD']);
          });

          it('should set boolean field', () => {
               store.setField('isMarketOrder', true);

               expect(store.isMarketOrder()).toBeTrue();
          });
     });

     describe('setExpiration', () => {
          it('should set expiration explicitly', () => {
               store.setExpiration('2026-01-01');

               expect(store.expiration()).toBe('2026-01-01');
          });
     });

     describe('updateField', () => {
          it('should update numeric-like string field', () => {
               store.setField('lpTokenBalanceField', '10');

               store.updateField('lpTokenBalanceField', current => String(Number(current) + 5));

               expect(store.lpTokenBalanceField()).toBe('15');
          });

          it('should update array immutably', () => {
               store.setField('existingOffers', [1, 2] as any);

               store.updateField('existingOffers', current => [...current, 3] as any);

               expect(store.existingOffers()).toEqual([1, 2, 3]);
          });
     });

     describe('resetAll', () => {
          it('should restore full initial state', () => {
               store.setField('destination', 'rX');
               store.setField('isMarketOrder', true);

               store.resetAll();

               const state = store.getAll();

               expect(state.destination).toBe('');
               expect(state.isMarketOrder).toBeFalse();
               expect(state.weSpendCurrency).toBe('XRP');
          });
     });

     describe('clearExpiration', () => {
          it('should clear expiration only', () => {
               store.setField('expiration', '2026-01-01');

               store.clearExpiration();

               expect(store.expiration()).toBe('');
          });
     });

     describe('resetNftIdSelection', () => {
          it('should clear amount only', () => {
               store.setField('amount', '123');

               store.resetNftIdSelection();

               expect(store.amount()).toBe('');
          });
     });

     describe('resetAmmFields', () => {
          it('should reset AMM-specific fields only', () => {
               store.setField('destination', 'rX');
               store.setField('amount', '999');
               store.setField('transferFee', 5);

               store.resetAmmFields();

               expect(store.destination()).toBe('');
               expect(store.amount()).toBe('');
               expect(store.transferFee()).toBe(0);
               expect(store.isCollapsed()).toBeFalse();
          });
     });

     describe('getAll', () => {
          it('should return full snapshot', () => {
               store.setField('destination', 'rSNAP');
               store.setField('isPassive', false);

               const snapshot = store.getAll();

               expect(snapshot.destination).toBe('rSNAP');
               expect(snapshot.isPassive).toBeFalse();
          });

          it('should not throw on internal store fields', () => {
               const snapshot = store.getAll();

               expect(typeof snapshot).toBe('object');
               expect(snapshot).toBeTruthy();
          });
     });
});
