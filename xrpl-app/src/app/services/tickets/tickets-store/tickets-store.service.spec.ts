import { TestBed } from '@angular/core/testing';
import { TicketStore } from './tickets-store.service';

describe('TicketStore (100% coverage)', () => {
     let store: InstanceType<typeof TicketStore>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(TicketStore);
     });

     afterEach(() => {
          store.resetAll();
     });

     // -------------------------
     // INITIAL STATE
     // -------------------------

     it('should initialize with default state', () => {
          const state = store.getAll();

          expect(state.ticketSearchQuery).toBe('');
          expect(state.isTicketDropdownOpen).toBeFalse();
          expect(state.highlightedTicketIndex).toBe(-1);
          expect(state.ticketCount).toBe(0);
          expect(state.ticketId).toBe('');
          expect(state.ticketIdIDs).toEqual([]);
          expect(state.selectedCredentials).toBeNull();
          expect(state.subjectCredentials).toEqual([]);
     });

     // -------------------------
     // setField
     // -------------------------

     it('should set string field', () => {
          store.setField('ticketId', 'T123');

          expect(store.getAll().ticketId).toBe('T123');
     });

     it('should set boolean field', () => {
          store.setField('isTicketDropdownOpen', true);

          expect(store.getAll().isTicketDropdownOpen).toBeTrue();
     });

     it('should set array field', () => {
          store.setField('ticketIdIDs', ['1', '2']);

          expect(store.getAll().ticketIdIDs).toEqual(['1', '2']);
     });

     it('should set object field', () => {
          store.setField('selectedCredentials', { id: 1 });

          expect(store.getAll().selectedCredentials).toEqual({ id: 1 });
     });

     // -------------------------
     // updateField
     // -------------------------

     it('should update string field using updater', () => {
          store.setField('ticketSearchQuery', 'abc');

          store.updateField('ticketSearchQuery', (v: string) => v + '_updated');

          expect(store.getAll().ticketSearchQuery).toBe('abc_updated');
     });

     it('should update number field', () => {
          store.setField('ticketCount', 1);

          store.updateField('ticketCount', (c: number) => c + 1);

          expect(store.getAll().ticketCount).toBe(2);
     });

     it('should update array immutably', () => {
          store.setField('ticketIdIDs', ['a']);

          const before = store.getAll().ticketIdIDs;

          store.updateField('ticketIdIDs', (arr: any) => [...arr, 'b']);

          const after = store.getAll().ticketIdIDs;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });

     it('should handle no-op updater', () => {
          store.setField('ticketId', 'same');

          store.updateField('ticketId', (v: any) => v);

          expect(store.getAll().ticketId).toBe('same');
     });

     // -------------------------
     // resetCredentialIdDropDown
     // -------------------------

     it('should reset only selectedCredentials', () => {
          store.setField('selectedCredentials', { id: 1 });
          store.setField('ticketId', 'T1');

          store.resetCredentialIdDropDown();

          const state = store.getAll();

          expect(state.selectedCredentials).toBeNull();
          expect(state.ticketId).toBe('T1'); // unchanged
     });

     // -------------------------
     // resetCredentailFields
     // -------------------------

     it('should reset credential-related fields', () => {
          store.setField('selectedCredentials', { id: 1 });
          store.setField('ticketId', 'T1');
          store.setField('ticketIdIDs', ['x']);
          store.setField('ticketCount', 5);
          store.setField('ticketSearchQuery', 'query');
          store.setField('isTicketDropdownOpen', true); // should NOT reset

          store.resetCredentailFields();

          const state = store.getAll();

          expect(state.selectedCredentials).toBeNull();
          expect(state.ticketId).toBe('');
          expect(state.ticketIdIDs).toEqual([]);
          expect(state.ticketCount).toBe(0);
          expect(state.ticketSearchQuery).toBe('');
          expect(state.isTicketDropdownOpen).toBeTrue(); // unchanged
     });

     // -------------------------
     // resetAll
     // -------------------------

     it('should fully reset store', () => {
          store.setField('ticketId', 'dirty');
          store.setField('ticketCount', 99);

          store.resetAll();

          const state = store.getAll();

          expect(state.ticketId).toBe('');
          expect(state.ticketCount).toBe(0);
     });

     it('should deep clone on resetAll', () => {
          const before = store.getAll().ticketIdIDs;

          store.resetAll();

          const after = store.getAll().ticketIdIDs;

          expect(before).not.toBe(after);
     });

     // -------------------------
     // getAll snapshot
     // -------------------------

     it('should return snapshot of state', () => {
          store.setField('ticketId', 'T999');

          const snapshot = store.getAll();

          expect(snapshot.ticketId).toBe('T999');
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
          expect(snapshot.ticketSearchQuery).toBeDefined();
     });

     // -------------------------
     // edge cases
     // -------------------------

     it('should handle empty string updates', () => {
          store.setField('ticketId', 'abc');
          store.setField('ticketId', '');

          expect(store.getAll().ticketId).toBe('');
     });

     it('should preserve immutability for arrays', () => {
          store.setField('ticketIdIDs', ['a']);

          const before = store.getAll().ticketIdIDs;

          store.setField('ticketIdIDs', [...before, 'b']);

          const after = store.getAll().ticketIdIDs;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });
});
