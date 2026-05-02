import { TestBed } from '@angular/core/testing';
import { SignTransationStoreService } from './sign-transation-store.service';

describe('SignTransationStoreService (100% coverage)', () => {
     let store: InstanceType<typeof SignTransationStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(SignTransationStoreService);
     });

     afterEach(() => {
          store.resetAll();
     });

     // -------------------------
     // INITIAL STATE
     // -------------------------

     it('should initialize with default state', () => {
          const state = store.getAll();

          expect(state.accountInfo).toBeNull();
          expect(state.selectedTransaction).toBe('');
          expect(state.txJson).toBe('');
          expect(state.isAppSigned).toBeFalse();
          expect(state.availableSigners).toEqual([]);
          expect(state.requiredQuorum).toBe(0);

          expect(state.buttonLoading).toEqual({
               getJson: false,
               signed: false,
               submit: false,
               multiSign: false,
               regularKeySign: false,
          });
     });

     // -------------------------
     // setField
     // -------------------------

     it('should set string field', () => {
          store.setField('txJson', '{"tx":1}');

          expect(store.getAll().txJson).toBe('{"tx":1}');
     });

     it('should set boolean field', () => {
          store.setField('isAppSigned', true);

          expect(store.getAll().isAppSigned).toBeTrue();
     });

     it('should set array field', () => {
          store.setField('availableSigners', ['a']);

          expect(store.getAll().availableSigners).toEqual(['a']);
     });

     it('should set nested object field', () => {
          store.setField('buttonLoading', {
               getJson: true,
               signed: false,
               submit: false,
               multiSign: false,
               regularKeySign: false,
          });

          expect(store.getAll().buttonLoading.getJson).toBeTrue();
     });

     // -------------------------
     // updateField
     // -------------------------

     it('should update string field using updater', () => {
          store.setField('outputField', 'abc');

          store.updateField('outputField', (v: string) => v + '_updated');

          expect(store.getAll().outputField).toBe('abc_updated');
     });

     it('should update number field', () => {
          store.setField('requiredQuorum', 1);

          store.updateField('requiredQuorum', (q: number) => q + 1);

          expect(store.getAll().requiredQuorum).toBe(2);
     });

     it('should update array immutably', () => {
          store.setField('availableSigners', ['a']);

          const before = store.getAll().availableSigners;

          store.updateField('availableSigners', (arr: any) => [...arr, 'b']);

          const after = store.getAll().availableSigners;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });

     it('should handle no-op updater', () => {
          store.setField('flagResults', 'ok');

          store.updateField('flagResults', (v: any) => v);

          expect(store.getAll().flagResults).toBe('ok');
     });

     // -------------------------
     // setAppSigned
     // -------------------------

     it('should set isAppSigned via setAppSigned', () => {
          store.setAppSigned(true);

          expect(store.getAll().isAppSigned).toBeTrue();
     });

     // -------------------------
     // resetCredentailFields
     // -------------------------

     it('should reset credential-related fields only', () => {
          store.setField('txJson', 'dirty');
          store.setField('availableSigners', ['x']);
          store.setField('requiredQuorum', 5);
          store.setField('selectedTransaction', 'KEEP'); // should NOT reset

          store.resetCredentailFields();

          const state = store.getAll();

          expect(state.txJson).toBe('');
          expect(state.availableSigners).toEqual([]);
          expect(state.requiredQuorum).toBe(0);
          expect(state.selectedTransaction).toBe('KEEP'); // unchanged
     });

     it('should reset nested buttonLoading object', () => {
          store.setField('buttonLoading', {
               getJson: true,
               signed: true,
               submit: true,
               multiSign: true,
               regularKeySign: true,
          });

          store.resetCredentailFields();

          const state = store.getAll();

          expect(state.buttonLoading).toEqual({
               getJson: false,
               signed: false,
               submit: false,
               multiSign: false,
               regularKeySign: false,
          });
     });

     // -------------------------
     // resetAll
     // -------------------------

     it('should fully reset store', () => {
          store.setField('txJson', 'dirty');
          store.setField('isAppSigned', true);

          store.resetAll();

          const state = store.getAll();

          expect(state.txJson).toBe('');
          expect(state.isAppSigned).toBeFalse();
     });

     it('should deep clone on resetAll', () => {
          const before = store.getAll().buttonLoading;

          store.resetAll();

          const after = store.getAll().buttonLoading;

          expect(before).not.toBe(after);
     });

     // -------------------------
     // getAll snapshot
     // -------------------------

     it('should return snapshot of state', () => {
          store.setField('selectedTransaction', 'tx1');

          const snapshot = store.getAll();

          expect(snapshot.selectedTransaction).toBe('tx1');
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
          expect(snapshot.txJson).toBeDefined();
     });

     // -------------------------
     // edge cases
     // -------------------------

     it('should handle empty string updates', () => {
          store.setField('jsonEditorError', 'error');
          store.setField('jsonEditorError', '');

          expect(store.getAll().jsonEditorError).toBe('');
     });

     it('should preserve immutability for arrays', () => {
          store.setField('availableSigners', ['a']);

          const before = store.getAll().availableSigners;

          store.setField('availableSigners', [...before, 'b']);

          const after = store.getAll().availableSigners;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });
});
