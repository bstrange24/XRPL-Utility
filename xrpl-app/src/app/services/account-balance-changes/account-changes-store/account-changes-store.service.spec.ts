import { TestBed } from '@angular/core/testing';
import { AccountChangesStoreService } from './account-changes-store.service';
import { BalanceChange } from '../../../components/account-balance-changes/constants/account-balance.types';

describe('AccountChangesStoreService', () => {
     let store: InstanceType<typeof AccountChangesStoreService>;

     const mockBalanceChange: BalanceChange = {
          date: new Date('2024-01-01T00:00:00Z'),
          hash: 'hash123',
          type: 'Payment',
          fees: 0.012,
          change: 1.5,
          currency: 'XRP',
          balanceBefore: 100,
          balanceAfter: 101.5,
          counterparty: 'rCounterparty',
          _searchIndex: 'payment 1.5 xrp hash123',
     };

     const mockBalanceChange2: BalanceChange = {
          date: new Date('2024-01-02T00:00:00Z'),
          hash: 'hash456',
          type: 'OfferCreate',
          fees: 0.012,
          change: -0.5,
          currency: 'XRP',
          balanceBefore: 101.5,
          balanceAfter: 101,
          counterparty: 'rCounterparty2',
          _searchIndex: 'offercreate -0.5 xrp hash456',
     };

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(AccountChangesStoreService);
     });

     afterEach(() => {
          // Reset store to initial state
          store.resetAll();
     });

     it('should be created', () => {
          expect(store).toBeTruthy();
     });

     describe('initial state', () => {
          it('should have empty balanceChanges array', () => {
               expect(store.balanceChanges()).toEqual([]);
          });

          it('should have loadingInitial as false', () => {
               expect(store.loadingInitial()).toBeFalse();
          });

          it('should have loadingMore as false', () => {
               expect(store.loadingMore()).toBeFalse();
          });

          it('should have hasMoreData as true', () => {
               expect(store.hasMoreData()).toBeTrue();
          });

          it('should have empty filterValue', () => {
               expect(store.filterValue()).toBe('');
          });

          it('should have dateRange with null values', () => {
               expect(store.dateRange()).toEqual({ start: null, end: null });
          });
     });

     describe('setField', () => {
          it('should update loadingInitial field', () => {
               store.setField('loadingInitial', true);
               expect(store.loadingInitial()).toBeTrue();
          });

          it('should update loadingMore field', () => {
               store.setField('loadingMore', true);
               expect(store.loadingMore()).toBeTrue();
          });

          it('should update hasMoreData field', () => {
               store.setField('hasMoreData', false);
               expect(store.hasMoreData()).toBeFalse();
          });

          it('should update filterValue field', () => {
               store.setField('filterValue', 'test filter');
               expect(store.filterValue()).toBe('test filter');
          });

          it('should update dateRange field', () => {
               const newDateRange = { start: new Date('2024-01-01'), end: new Date('2024-01-31') };
               store.setField('dateRange', newDateRange);
               expect(store.dateRange()).toEqual(newDateRange);
          });

          it('should update balanceChanges directly', () => {
               store.setField('balanceChanges', [mockBalanceChange]);
               expect(store.balanceChanges()).toEqual([mockBalanceChange]);
          });
     });

     describe('resetForNewLoad', () => {
          beforeEach(() => {
               // Add some data to ensure reset works
               store.setField('balanceChanges', [mockBalanceChange, mockBalanceChange2]);
               store.setField('hasMoreData', false);
               store.setField('loadingInitial', false);
               store.setField('loadingMore', true);
          });

          it('should clear balanceChanges', () => {
               store.resetForNewLoad();
               expect(store.balanceChanges()).toEqual([]);
          });

          it('should set hasMoreData to true', () => {
               store.resetForNewLoad();
               expect(store.hasMoreData()).toBeTrue();
          });

          it('should set loadingInitial to true', () => {
               store.resetForNewLoad();
               expect(store.loadingInitial()).toBeTrue();
          });

          it('should set loadingMore to false', () => {
               store.resetForNewLoad();
               expect(store.loadingMore()).toBeFalse();
          });
     });

     describe('appendBalanceChanges', () => {
          it('should append balance changes to existing list', () => {
               store.setField('balanceChanges', [mockBalanceChange]);
               store.appendBalanceChanges([mockBalanceChange2]);
               expect(store.balanceChanges().length).toBe(2);
               expect(store.balanceChanges()[0]).toEqual(mockBalanceChange);
               expect(store.balanceChanges()[1]).toEqual(mockBalanceChange2);
          });

          it('should append to empty list', () => {
               store.appendBalanceChanges([mockBalanceChange]);
               expect(store.balanceChanges().length).toBe(1);
               expect(store.balanceChanges()[0]).toEqual(mockBalanceChange);
          });

          it('should append multiple entries at once', () => {
               store.appendBalanceChanges([mockBalanceChange, mockBalanceChange2]);
               expect(store.balanceChanges().length).toBe(2);
          });

          it('should handle empty array', () => {
               const initialLength = store.balanceChanges().length;
               store.appendBalanceChanges([]);
               expect(store.balanceChanges().length).toBe(initialLength);
          });
     });

     describe('resetAll', () => {
          beforeEach(() => {
               // Modify state
               store.setField('balanceChanges', [mockBalanceChange, mockBalanceChange2]);
               store.setField('loadingInitial', true);
               store.setField('loadingMore', true);
               store.setField('hasMoreData', false);
               store.setField('filterValue', 'some filter');
               store.setField('dateRange', { start: new Date('2024-01-01'), end: new Date('2024-01-31') });
          });

          it('should reset balanceChanges to empty', () => {
               store.resetAll();
               expect(store.balanceChanges()).toEqual([]);
          });

          it('should reset loadingInitial to false', () => {
               store.resetAll();
               expect(store.loadingInitial()).toBeFalse();
          });

          it('should reset loadingMore to false', () => {
               store.resetAll();
               expect(store.loadingMore()).toBeFalse();
          });

          it('should reset hasMoreData to true', () => {
               store.resetAll();
               expect(store.hasMoreData()).toBeTrue();
          });

          it('should reset filterValue to empty', () => {
               store.resetAll();
               expect(store.filterValue()).toBe('');
          });

          it('should reset dateRange to nulls', () => {
               store.resetAll();
               expect(store.dateRange()).toEqual({ start: null, end: null });
          });
     });

     describe('getAll', () => {
          beforeEach(() => {
               store.setField('balanceChanges', [mockBalanceChange]);
               store.setField('loadingInitial', true);
               store.setField('loadingMore', false);
               store.setField('hasMoreData', true);
               store.setField('filterValue', 'test');
               store.setField('dateRange', { start: new Date('2024-01-01'), end: new Date('2024-01-31') });
          });

          it('should return entire state object', () => {
               const state = store.getAll();
               expect(state.balanceChanges).toEqual([mockBalanceChange]);
               expect(state.loadingInitial).toBeTrue();
               expect(state.loadingMore).toBeFalse();
               expect(state.hasMoreData).toBeTrue();
               expect(state.filterValue).toBe('test');
               expect(state.dateRange).toEqual({ start: new Date('2024-01-01'), end: new Date('2024-01-31') });
          });

          it('should return a copy of the state', () => {
               const state1 = store.getAll();
               const state2 = store.getAll();
               expect(state1).not.toBe(state2); // Different references
               expect(state1).toEqual(state2); // Same values
          });
     });

     describe('State immutability', () => {
          it('should not mutate original state when appending', () => {
               const originalBalanceChanges = store.balanceChanges();
               store.appendBalanceChanges([mockBalanceChange]);
               expect(store.balanceChanges()).not.toBe(originalBalanceChanges);
          });

          it('should create new array reference when appending', () => {
               const beforeRef = store.balanceChanges();
               store.appendBalanceChanges([mockBalanceChange]);
               const afterRef = store.balanceChanges();
               expect(beforeRef).not.toBe(afterRef);
          });
     });

     describe('Multiple operations', () => {
          it('should handle multiple appends', () => {
               store.appendBalanceChanges([mockBalanceChange]);
               store.appendBalanceChanges([mockBalanceChange2]);
               expect(store.balanceChanges().length).toBe(2);
          });

          it('should handle resetForNewLoad after appends', () => {
               store.appendBalanceChanges([mockBalanceChange, mockBalanceChange2]);
               expect(store.balanceChanges().length).toBe(2);
               store.resetForNewLoad();
               expect(store.balanceChanges().length).toBe(0);
               expect(store.loadingInitial()).toBeTrue();
          });

          it('should handle resetAll after modifications', () => {
               store.setField('filterValue', 'test');
               store.setField('balanceChanges', [mockBalanceChange]);
               expect(store.filterValue()).toBe('test');
               expect(store.balanceChanges().length).toBe(1);
               store.resetAll();
               expect(store.filterValue()).toBe('');
               expect(store.balanceChanges().length).toBe(0);
          });
     });

     describe('Edge Cases', () => {
          it('should handle setting balanceChanges to empty array', () => {
               store.setField('balanceChanges', []);
               expect(store.balanceChanges()).toEqual([]);
          });

          it('should handle setting filterValue to long string', () => {
               const longString = 'a'.repeat(1000);
               store.setField('filterValue', longString);
               expect(store.filterValue()).toBe(longString);
          });

          it('should handle dateRange with only start date', () => {
               store.setField('dateRange', { start: new Date('2024-01-01'), end: null });
               expect(store.dateRange()).toEqual({ start: new Date('2024-01-01'), end: null });
          });

          it('should handle dateRange with only end date', () => {
               store.setField('dateRange', { start: null, end: new Date('2024-01-31') });
               expect(store.dateRange()).toEqual({ start: null, end: new Date('2024-01-31') });
          });
     });
});
