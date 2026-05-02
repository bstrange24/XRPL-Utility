import { TestBed } from '@angular/core/testing';
import { TrustlineStoreService } from './trustline-store.service';

describe('TrustlineStoreService (100% coverage)', () => {
     let store: InstanceType<typeof TrustlineStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(TrustlineStoreService);
     });

     afterEach(() => {
          store.reset();
     });

     // -------------------------
     // INITIAL STATE
     // -------------------------

     it('should initialize with default state', () => {
          const state = store.getAll();

          expect(state.isLoaded).toBeFalse();
          expect(state.isLoading).toBeFalse();
          expect(state.error).toBe('');
          expect(state.existingIOUs).toEqual([]);
          expect(state.trustlineLimitField).toBe(0);
          expect(state.missingTrustlineInfo).toEqual({
               currencyCode: '',
               issuer: '',
          });
     });

     // -------------------------
     // setField
     // -------------------------

     it('should set string field', () => {
          store.setField('tokenToRemove', 'USD');

          expect(store.getAll().tokenToRemove).toBe('USD');
     });

     it('should set boolean field', () => {
          store.setField('isLoaded', true);

          expect(store.getAll().isLoaded).toBeTrue();
     });

     it('should set array field', () => {
          store.setField('existingIOUs', [{ currency: 'USD' }]);

          expect(store.getAll().existingIOUs.length).toBe(1);
     });

     it('should set nested object field', () => {
          store.setField('missingTrustlineInfo', { currencyCode: 'USD', issuer: 'rABC' });

          expect(store.getAll().missingTrustlineInfo.currencyCode).toBe('USD');
     });

     // -------------------------
     // updateField
     // -------------------------

     it('should update field using updater', () => {
          store.setField('trustlineLimitField', 10);

          store.updateField('trustlineLimitField', v => v + 5);

          expect(store.getAll().trustlineLimitField).toBe(15);
     });

     it('should update array immutably', () => {
          store.setField('existingIOUs', [{ currency: 'USD' }]);

          const before = store.getAll().existingIOUs;

          store.updateField('existingIOUs', arr => [...arr, { currency: 'EUR' }]);

          const after = store.getAll().existingIOUs;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });

     it('should handle no-op updater', () => {
          store.setField('tokenToRemove', 'USD');

          store.updateField('tokenToRemove', v => v);

          expect(store.getAll().tokenToRemove).toBe('USD');
     });

     // -------------------------
     // reset
     // -------------------------

     it('should fully reset store', () => {
          store.setField('tokenToRemove', 'dirty');

          store.reset();

          expect(store.getAll().tokenToRemove).toBe('');
     });

     // -------------------------
     // resetOptions
     // -------------------------

     it('should reset only option-related fields', () => {
          store.setField('tokenToRemove', 'USD');
          store.setField('existingIOUs', [{ currency: 'USD' }]);
          store.setField('trustlineLimitField', 100);

          store.resetOptions();

          const state = store.getAll();

          expect(state.tokenToRemove).toBe('');
          expect(state.existingIOUs).toEqual([]);
          expect(state.trustlineLimitField).toBe(0);
     });

     it('should not reset unrelated fields in resetOptions', () => {
          store.setField('isLoaded', true);

          store.resetOptions();

          expect(store.getAll().isLoaded).toBeTrue();
     });

     // -------------------------
     // currentTrustline
     // -------------------------

     it('should return matching trustline', () => {
          const data = [
               { currency: 'USD', issuer: 'r1' },
               { currency: 'EUR', issuer: 'r2' },
          ];

          store.setField('existingIOUs', data);

          const result = store.currentTrustline('USD', 'r1');

          expect(result).toEqual({ currency: 'USD', issuer: 'r1' });
     });

     it('should return null if no match found', () => {
          store.setField('existingIOUs', [{ currency: 'USD', issuer: 'r1' }]);

          const result = store.currentTrustline('EUR', 'r2');

          expect(result).toBeNull();
     });

     // -------------------------
     // loading state transitions
     // -------------------------

     it('should set loading state', () => {
          store.setLoading();

          const state = store.getAll();

          expect(state.isLoading).toBeTrue();
          expect(state.isLoaded).toBeFalse();
          expect(state.error).toBeNull();
     });

     it('should set loaded state', () => {
          const data = [{ currency: 'USD' }];

          store.setLoaded(data);

          const state = store.getAll();

          expect(state.existingIOUs).toEqual(data);
          expect(state.isLoading).toBeFalse();
          expect(state.isLoaded).toBeTrue();
          expect(state.error).toBeNull();
     });

     it('should set error state', () => {
          store.setError('fail');

          const state = store.getAll();

          expect(state.existingIOUs).toEqual([]);
          expect(state.isLoading).toBeFalse();
          expect(state.isLoaded).toBeFalse();
          expect(state.error).toBe('fail');
     });

     // -------------------------
     // computed
     // -------------------------

     it('should compute trustlineCount correctly', () => {
          store.setField('existingIOUs', [{}, {}, {}]);

          expect(store.trustlineCount()).toBe(3);
     });

     // -------------------------
     // getAll snapshot
     // -------------------------

     it('should return snapshot of state', () => {
          store.setField('tokenToRemove', 'XRP');

          const snapshot = store.getAll();

          expect(snapshot.tokenToRemove).toBe('XRP');
     });

     // -------------------------
     // getAll catch branch (critical)
     // -------------------------

     it('should ignore failing functions in getAll', () => {
          (store as any).badFn = () => {
               throw new Error('fail');
          };

          const snapshot = store.getAll();

          expect(snapshot).toBeTruthy();
          expect(snapshot.tokenToRemove).toBeDefined();
     });

     // -------------------------
     // edge cases
     // -------------------------

     it('should handle empty string updates', () => {
          store.setField('error', 'err');
          store.setField('error', '');

          expect(store.getAll().error).toBe('');
     });

     it('should preserve immutability for arrays', () => {
          store.setField('existingIOUs', [{ currency: 'USD' }]);

          const before = store.getAll().existingIOUs;

          store.setField('existingIOUs', [...before, { currency: 'EUR' }]);

          const after = store.getAll().existingIOUs;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });
});
