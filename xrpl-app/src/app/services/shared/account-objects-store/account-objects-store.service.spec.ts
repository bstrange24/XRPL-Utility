import { TestBed } from '@angular/core/testing';
import { AccountObjectsStoreService, SharedAccountObjectsState } from './account-objects-store.service';

describe('AccountObjectsStoreService', () => {
     let store: any;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(AccountObjectsStoreService);
     });

     const getState = (): SharedAccountObjectsState => {
          return {
               address: store.address(),
               accountObjects: store.accountObjects(),
               accountInfo: store.accountInfo(),
          };
     };

     it('should initialize with default state', () => {
          const state = getState();

          expect(state.address).toBe('');
          expect(state.accountObjects).toBeNull();
          expect(state.accountInfo).toBeNull();
     });

     it('should setField correctly', () => {
          store.setField('address', 'rABC123');
          store.setField('accountObjects', { foo: 'bar' });
          store.setField('accountInfo', { test: true });

          const state = getState();

          expect(state.address).toBe('rABC123');
          expect(state.accountObjects).toEqual({ foo: 'bar' });
          expect(state.accountInfo).toEqual({ test: true });
     });

     it('should update all fields using update()', () => {
          store.update('rADDRESS', [{ object: 1 }], { info: 'data' });

          const state = getState();

          expect(state.address).toBe('rADDRESS');
          expect(state.accountObjects).toEqual([{ object: 1 }]);
          expect(state.accountInfo).toEqual({ info: 'data' });
     });

     it('should overwrite previous values on update()', () => {
          store.setField('address', 'old');
          store.setField('accountObjects', { old: true });
          store.setField('accountInfo', { old: true });

          store.update('newAddress', null, null);

          const state = getState();

          expect(state.address).toBe('newAddress');
          expect(state.accountObjects).toBeNull();
          expect(state.accountInfo).toBeNull();
     });

     it('should reset state correctly', () => {
          store.setField('address', 'temp');
          store.setField('accountObjects', { x: 1 });
          store.setField('accountInfo', { y: 2 });

          store.reset();

          const state = getState();

          expect(state.address).toBe('');
          expect(state.accountObjects).toBeNull();
          expect(state.accountInfo).toBeNull();
     });

     it('should maintain independence between fields', () => {
          store.setField('address', 'A');
          store.setField('accountObjects', { obj: 1 });

          const state = getState();

          expect(state.address).toBe('A');
          expect(state.accountObjects).toEqual({ obj: 1 });
          expect(state.accountInfo).toBeNull();
     });
});
