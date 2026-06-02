import { TestBed } from '@angular/core/testing';
import { CurrencyStoreService } from './currency-store.service';

describe('CurrencyStoreService (signalStore)', () => {
     let store: InstanceType<typeof CurrencyStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(CurrencyStoreService);
     });

     afterEach(() => {
          store.reset();
     });

     // -------------------------
     // initial state snapshot
     // -------------------------

     it('should initialize with default state', () => {
          const state = store.getAll();

          expect(state.currencyCode).toBe('XRP');
          expect(state.currencyIssuer).toBe('');
          expect(state.amount).toBeNull();
          expect(state.balance).toBe('');
          expect(state.isIssuer).toBeFalse();
     });

     // -------------------------
     // setCurrency
     // -------------------------

     it('should set currency from primitive value', () => {
          store.setCurrency('USD');

          const state = store.getAll();

          expect(state.currency).toBe('USD');
          expect(state.currencyCode).toBe('USD');
     });

     it('should set currency from object value', () => {
          store.setCurrency({ value: 'EUR' });

          const state = store.getAll();

          expect(state.currency).toBe('EUR');
          expect(state.currencyCode).toBe('EUR');
     });

     // -------------------------
     // setIssuer
     // -------------------------

     it('should set issuer from primitive value', () => {
          store.setIssuer('issuer-1');

          const state = store.getAll();

          expect(state.issuer).toBe('issuer-1');
          expect(state.currencyIssuer).toBe('issuer-1');
     });

     it('should set issuer from object value', () => {
          store.setIssuer({ value: 'issuer-2' });

          const state = store.getAll();

          expect(state.issuer).toBe('issuer-2');
          expect(state.currencyIssuer).toBe('issuer-2');
     });

     // -------------------------
     // setAmount
     // -------------------------

     it('should set amount correctly', () => {
          store.setAmount(150);

          expect(store.getAll().amount).toBe(150);
     });

     // -------------------------
     // setField (generic)
     // -------------------------

     it('should set arbitrary field using setField', () => {
          store.setField('destination', 'rXYZ');

          expect(store.getAll().destination).toBe('rXYZ');
     });

     // -------------------------
     // updateField (functional update)
     // -------------------------

     it('should update field using updater function', () => {
          store.setField('amount', 10);

          store.updateField('amount', (current: number | null) => {
               const value = current ?? 0;
               return value + 5;
          });

          expect(store.getAll().amount).toBe(15);
     });

     it('should update string field correctly', () => {
          store.setField('currency', 'USD');

          store.updateField('currency', (current: string) => current + '-X');

          expect(store.getAll().currency).toBe('USD-X');
     });

     // -------------------------
     // reset
     // -------------------------

     it('should reset entire store to initial state', () => {
          store.setCurrency('USD');
          store.setIssuer('issuer');
          store.setAmount(999);
          store.setField('destination', 'abc');

          store.reset();

          const state = store.getAll();

          expect(state.currencyCode).toBe('XRP');
          expect(state.currencyIssuer).toBe('');
          expect(state.amount).toBeNull();
          expect(state.destination).toBe('');
     });

     // -------------------------
     // resetOptions
     // -------------------------

     it('should reset only currency option fields', () => {
          store.setCurrency('USD');
          store.setIssuer('issuer-1');
          store.setField('lastCurrency', 'OLD');
          store.setField('newCurrency', 'NEW');
          store.setField('balance', '1000');

          store.resetOptions();

          const state = store.getAll();

          expect(state.currencyCode).toBe('XRP');
          expect(state.currencyIssuer).toBe('');
          expect(state.lastCurrency).toBe('');
          expect(state.lastIssuer).toBe('');
          expect(state.newCurrency).toBe('');
          expect(state.newIssuer).toBe('');
          expect(state.balance).toBe('1000'); // should remain untouched
     });

     // -------------------------
     // getAll snapshot integrity
     // -------------------------

     it('should return full state snapshot', () => {
          store.setCurrency('USD');
          store.setIssuer('issuer');
          store.setAmount(42);

          const snapshot = store.getAll();

          expect(snapshot).toEqual(
               jasmine.objectContaining({
                    currency: 'USD',
                    issuer: 'issuer',
                    amount: 42,
               })
          );
     });

     // -------------------------
     // edge cases
     // -------------------------

     it('should not break when updater returns same value', () => {
          store.setField('amount', 10);

          store.updateField('amount', (current: number | null) => current);

          expect(store.getAll().amount).toBe(10);
     });

     it('should handle nullish object safely in setCurrency', () => {
          store.setCurrency(null);

          const state = store.getAll();

          expect(state.currency).toBeNull();
          expect(state.currencyCode).toBeNull();
     });
});
