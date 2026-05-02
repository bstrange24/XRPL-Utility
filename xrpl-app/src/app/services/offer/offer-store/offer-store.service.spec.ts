import { TestBed } from '@angular/core/testing';
import { OfferStoreService } from './offer-store.service';

describe('OfferStoreService (signalStore)', () => {
     let store: InstanceType<typeof OfferStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(OfferStoreService);
     });

     afterEach(() => {
          store.resetAll();
     });

     // -------------------------
     // initial state
     // -------------------------

     it('should initialize with correct default state', () => {
          const state = store.getAll();

          expect(state.weSpendCurrency).toBe('XRP');
          expect(state.isPassive).toBeTrue();
          expect(state.isMarketOrder).toBeFalse();
          expect(state.isFillOrKill).toBeFalse();
          expect(state.existingOffers).toEqual([]);
          expect(state.offersArray).toEqual([]);
          expect(state.orderBookStats).toBeNull();
     });

     // -------------------------
     // setField
     // -------------------------

     it('should set string field using setField', () => {
          store.setField('weWantCurrency', 'USD');

          expect(store.getAll().weWantCurrency).toBe('USD');
     });

     it('should set boolean field using setField', () => {
          store.setField('isMarketOrder', true);

          expect(store.getAll().isMarketOrder).toBeTrue();
     });

     it('should set numeric-string field correctly', () => {
          store.setField('weWantAmount', '100');

          expect(store.getAll().weWantAmount).toBe('100');
     });

     // -------------------------
     // updateField
     // -------------------------

     it('should update field using updater function', () => {
          store.setField('weWantAmount', '10');

          store.updateField('weWantAmount', current => current + '0');

          expect(store.getAll().weWantAmount).toBe('100');
     });

     it('should toggle boolean via updateField', () => {
          store.setField('isPassive', true);

          store.updateField('isPassive', current => !current);

          expect(store.getAll().isPassive).toBeFalse();
     });

     // -------------------------
     // resetOfferFields (partial reset)
     // -------------------------

     it('should reset only offer input fields and flags', () => {
          store.setField('weWantAmount', '500');
          store.setField('weSpendAmount', '100');
          store.setField('isMarketOrder', true);
          store.setField('offerSequenceField', '123');

          store.resetOfferFields();

          const state = store.getAll();

          expect(state.weWantAmount).toBe('');
          expect(state.weSpendAmount).toBe('');
          expect(state.offerSequenceField).toBe('');
          expect(state.isMarketOrder).toBeFalse();
          expect(state.isPassive).toBeTrue();
          expect(state.isFillOrKill).toBeFalse();
          expect(state.insufficientLiquidityWarning).toBeFalse();
     });

     it('should NOT reset unrelated fields in resetOfferFields', () => {
          store.setField('weWantCurrency', 'USD');
          store.setField('weSpendCurrency', 'EUR');

          store.resetOfferFields();

          const state = store.getAll();

          expect(state.weWantCurrency).toBe('USD');
          expect(state.weSpendCurrency).toBe('EUR');
     });

     // -------------------------
     // resetAll
     // -------------------------

     it('should fully reset store to initial state', () => {
          store.setField('weWantCurrency', 'USD');
          store.setField('isMarketOrder', true);
          store.setField('orderBookPair', 'XRP/USD');

          store.resetAll();

          const state = store.getAll();

          expect(state.weWantCurrency).toBe('');
          expect(state.isMarketOrder).toBeFalse();
          expect(state.orderBookPair).toBe('');
          expect(state.weSpendCurrency).toBe('XRP');
     });

     // -------------------------
     // arrays and objects
     // -------------------------

     it('should handle existingOffers array updates', () => {
          store.setField('existingOffers', [{ id: 1 }]);

          expect(store.getAll().existingOffers.length).toBe(1);
     });

     it('should preserve array immutability when updating offersArray', () => {
          store.setField('offersArray', ['a']);

          const before = store.getAll().offersArray;

          store.setField('offersArray', [...before, 'b']);

          const after = store.getAll().offersArray;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });

     // -------------------------
     // computed safety (no computed defined, but snapshot stability)
     // -------------------------

     it('should safely handle null orderBookStats', () => {
          store.setField('orderBookStats', null);

          expect(store.getAll().orderBookStats).toBeNull();
     });

     // -------------------------
     // snapshot integrity
     // -------------------------

     it('should return full snapshot via getAll', () => {
          store.setField('weWantCurrency', 'USD');
          store.setField('weSpendCurrency', 'EUR');
          store.setField('isPassive', false);

          const snapshot = store.getAll();

          expect(snapshot.weWantCurrency).toBe('USD');
          expect(snapshot.weSpendCurrency).toBe('EUR');
          expect(snapshot.isPassive).toBeFalse();
     });

     // -------------------------
     // edge cases
     // -------------------------

     it('should handle empty string reset behavior correctly', () => {
          store.setField('weWantAmount', '999');

          store.resetOfferFields();

          expect(store.getAll().weWantAmount).toBe('');
     });

     it('should not mutate unrelated state during partial reset', () => {
          store.setField('orderBookPair', 'XRP/USD');

          store.resetOfferFields();

          expect(store.getAll().orderBookPair).toBe('XRP/USD');
     });
});
