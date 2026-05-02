import { TestBed } from '@angular/core/testing';
import { AccountDeleteStoreService } from './account-delete-store.service';

describe('AccountDeleteStoreService', () => {
     let store: InstanceType<typeof AccountDeleteStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [AccountDeleteStoreService],
          });

          store = TestBed.inject(AccountDeleteStoreService);
     });

     it('should create store with initial state', () => {
          const state = store.getAll();

          expect(state.isAccountDelete).toBeFalse();
          expect(state.destination).toBe('');
          expect(state.savedTxJson).toEqual([]);
          expect(state.savedTxResult).toEqual([]);
          expect(state.blockingObjects).toEqual([]);
     });

     describe('setField', () => {
          it('should update primitive field', () => {
               store.setField('destination', 'rTestAddress');

               expect(store.destination()).toBe('rTestAddress');
          });

          it('should update array field', () => {
               const arr = [{ a: 1 }];
               store.setField('savedTxJson', arr);

               expect(store.savedTxJson()).toEqual(arr);
          });
     });

     describe('updateField', () => {
          it('should update value using updater function', () => {
               store.setField('destination', 'rA');
               store.updateField('destination', current => current + 'B');

               expect(store.destination()).toBe('rAB');
          });

          it('should update array immutably', () => {
               store.setField('savedTxJson', [1, 2, 3]);

               store.updateField('savedTxJson', current => [...current, 4]);

               expect(store.savedTxJson()).toEqual([1, 2, 3, 4]);
          });
     });

     describe('resetAll', () => {
          it('should reset entire state', () => {
               store.setField('destination', 'rX');
               store.setField('isAccountDelete', true);

               store.resetAll();

               expect(store.destination()).toBe('');
               expect(store.isAccountDelete()).toBeFalse();
               expect(store.savedTxJson()).toEqual([]);
          });
     });

     describe('resetFields', () => {
          it('should only reset blockingObjects', () => {
               store.setField('blockingObjects', [{ x: 1 }] as any);
               store.setField('destination', 'rX');

               store.resetFields();

               expect(store.blockingObjects()).toEqual([]);
               expect(store.destination()).toBe('rX');
          });
     });

     describe('getAll', () => {
          it('should return snapshot including state signals', () => {
               store.setField('destination', 'rSnap');
               store.setField('isAccountDelete', true);

               const snapshot = store.getAll();

               expect(snapshot.destination).toBe('rSnap');
               expect(snapshot.isAccountDelete).toBeTrue();
          });

          it('should ignore non-function properties safely', () => {
               const snapshot = store.getAll();

               // should not throw even if store contains non-signal fields
               expect(snapshot).toBeTruthy();
               expect(typeof snapshot).toBe('object');
          });
     });
});
