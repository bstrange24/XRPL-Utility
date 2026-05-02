import { TestBed } from '@angular/core/testing';
import { XrplTxOptionsStore } from './xrpl-tx-options.store';

describe('XrplTxOptionsStore (signalStore)', () => {
     let store: InstanceType<typeof XrplTxOptionsStore>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(XrplTxOptionsStore);
     });

     afterEach(() => {
          store.reset();
     });

     // -------------------------
     // initial state
     // -------------------------

     it('should initialize with correct default state', () => {
          const state = store.getAll();

          expect(state.isMemoEnabled).toBeFalse();
          expect(state.memos).toEqual([]);
          expect(state.isSimulateEnabled).toBeFalse();
          expect(state.useMultiSign).toBeFalse();
          expect(state.isTicket).toBeFalse();
          expect(state.ticketArray.length).toBe(0);
     });

     // -------------------------
     // generic setters
     // -------------------------

     it('should set field using setField', () => {
          store.setField('invoiceId', 'INV-123');

          expect(store.getAll().invoiceId).toBe('INV-123');
     });

     it('should update field using updateField', () => {
          store.setField('ticketCountField', '1');

          store.updateField('ticketCountField', current => current + '-updated');

          expect(store.getAll().ticketCountField).toBe('1-updated');
     });

     // -------------------------
     // memo handling
     // -------------------------

     it('should enable memo flag', () => {
          store.setIsMemoEnabled(true);

          expect(store.getAll().isMemoEnabled).toBeTrue();
     });

     it('should add memo correctly', () => {
          store.addMemo({ Memo: { MemoData: 'abc' } });

          expect(store.getAll().memos.length).toBe(1);
     });

     it('should replace memos via updateMemos', () => {
          store.addMemo('old');

          store.updateMemos(['new1', 'new2']);

          expect(store.getAll().memos).toEqual(['new1', 'new2']);
     });

     it('should clear memos', () => {
          store.addMemo('test');

          store.clearMemos();

          expect(store.getAll().memos).toEqual([]);
     });

     // -------------------------
     // toggleMemo behavior (important branch logic)
     // -------------------------

     it('should clear memos when memo is disabled', () => {
          store.addMemo('x');

          store.toggleMemo(false);

          const state = store.getAll();

          expect(state.isMemoEnabled).toBeFalse();
          expect(state.memos).toEqual([]);
     });

     it('should not clear memos when memo is enabled', () => {
          store.addMemo('x');

          store.toggleMemo(true);

          const state = store.getAll();

          expect(state.isMemoEnabled).toBeTrue();
          expect(state.memos.length).toBe(1);
     });

     // -------------------------
     // resetOptions
     // -------------------------

     it('should reset only option flags and memos', () => {
          store.setField('useMultiSign', true);
          store.setField('isSimulateEnabled', true);
          store.addMemo('x');
          store.setField('isTicket', true);

          store.resetOptions();

          const state = store.getAll();

          expect(state.isMemoEnabled).toBeFalse();
          expect(state.isSimulateEnabled).toBeFalse();
          expect(state.useMultiSign).toBeFalse();
          expect(state.isRegularKeyAddress).toBeFalse();
          expect(state.isTicket).toBeFalse();
          expect(state.memos).toEqual([]);
     });

     // -------------------------
     // full reset
     // -------------------------

     it('should fully reset store state', () => {
          store.setField('invoiceId', '123');
          store.addMemo('x');
          store.setField('useMultiSign', true);

          store.reset();

          const state = store.getAll();

          expect(state.invoiceId).toBe('');
          expect(state.memos).toEqual([]);
          expect(state.useMultiSign).toBeFalse();
     });

     // -------------------------
     // snapshot integrity
     // -------------------------

     it('should return full snapshot using getAll', () => {
          store.setField('destinationTag', 'TAG1');
          store.setField('sourceTag', 'TAG2');
          store.setField('invoiceId', 'INV');

          const snapshot = store.getAll();

          expect(snapshot.destinationTag).toBe('TAG1');
          expect(snapshot.sourceTag).toBe('TAG2');
          expect(snapshot.invoiceId).toBe('INV');
     });

     // -------------------------
     // edge cases
     // -------------------------

     it('should handle null destinationTag safely', () => {
          store.setField('destinationTag', null);

          expect(store.getAll().destinationTag).toBeNull();
     });

     it('should preserve array immutability for memos', () => {
          store.addMemo('a');

          const before = store.getAll().memos;

          store.addMemo('b');

          const after = store.getAll().memos;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });
});
