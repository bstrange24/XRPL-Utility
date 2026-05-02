import { TestBed } from '@angular/core/testing';
import { LedgerStore } from './ledger.store';

describe('LedgerStore (signalStore)', () => {
     let store: InstanceType<typeof LedgerStore>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(LedgerStore);
     });

     afterEach(() => {
          store.resetAll();
     });

     // -------------------------
     // Initial state
     // -------------------------

     it('should initialize with correct default ledger state', () => {
          const state = store.getAll();

          expect(state.ledgerIndex).toBe(0);
          expect(state.validatedLedger).toBe(0);
          expect(state.baseFee).toBe('12');
          expect(state.reserveBase).toBe('10');
          expect(state.reserveIncrement).toBe('2');
          expect(state.lastLedgerSequence).toBe(0);
          expect(state.fee).toBe('12');
     });

     // -------------------------
     // setField
     // -------------------------

     it('should update ledgerIndex using setField', () => {
          store.setField('ledgerIndex', 100);

          expect(store.getAll().ledgerIndex).toBe(100);
     });

     it('should update string fields using setField', () => {
          store.setField('baseFee', '20');

          expect(store.getAll().baseFee).toBe('20');
     });

     it('should allow setting nullable field to null', () => {
          store.setField('fee', null);

          expect(store.getAll().fee).toBeNull();
     });

     // -------------------------
     // updateField (functional updates)
     // -------------------------

     it('should increment ledgerIndex using updateField', () => {
          store.setField('ledgerIndex', 10);

          store.updateField('ledgerIndex', (current: number) => current + 5);

          expect(store.getAll().ledgerIndex).toBe(15);
     });

     it('should update string field using updater', () => {
          store.setField('baseFee', '10');

          store.updateField('baseFee', (current: string) => current + '_x');

          expect(store.getAll().baseFee).toBe('10_x');
     });

     // it('should handle null field updates safely', () => {
     //      store.setField('fee', null);

     //      store.updateField('fee', (current: null) => (current === null ? 'fallback' : current));

     //      expect(store.getAll().fee).toBe('fallback');
     // });

     // -------------------------
     // resetAll
     // -------------------------

     it('should reset state to initial values', () => {
          store.setField('ledgerIndex', 999);
          store.setField('baseFee', '999');
          store.setField('fee', null);

          store.resetAll();

          const state = store.getAll();

          expect(state.ledgerIndex).toBe(0);
          expect(state.baseFee).toBe('12');
          expect(state.fee).toBe('12');
     });

     // -------------------------
     // getAll snapshot integrity
     // -------------------------

     it('should return full state snapshot via getAll', () => {
          store.setField('ledgerIndex', 42);
          store.setField('validatedLedger', 99);
          store.setField('reserveBase', '15');

          const snapshot = store.getAll();

          expect(snapshot).toEqual(
               jasmine.objectContaining({
                    ledgerIndex: 42,
                    validatedLedger: 99,
                    reserveBase: '15',
               })
          );
     });

     // -------------------------
     // type stability / runtime guards
     // -------------------------

     it('should maintain numeric type for ledgerIndex', () => {
          store.setField('ledgerIndex', 123);

          const value = store.getAll().ledgerIndex;

          expect(typeof value).toBe('number');
     });

     it('should maintain string type for baseFee', () => {
          store.setField('baseFee', '999');

          const value = store.getAll().baseFee;

          expect(typeof value).toBe('string');
     });

     // -------------------------
     // edge cases
     // -------------------------

     it('should not mutate unrelated fields when updating one field', () => {
          store.setField('ledgerIndex', 5);
          store.setField('baseFee', '10');

          store.updateField('ledgerIndex', (c: number) => c + 1);

          const state = store.getAll();

          expect(state.ledgerIndex).toBe(6);
          expect(state.baseFee).toBe('10');
     });

     it('should handle zero values correctly', () => {
          store.setField('ledgerIndex', 0);
          store.setField('validatedLedger', 0);

          const state = store.getAll();

          expect(state.ledgerIndex).toBe(0);
          expect(state.validatedLedger).toBe(0);
     });
});
