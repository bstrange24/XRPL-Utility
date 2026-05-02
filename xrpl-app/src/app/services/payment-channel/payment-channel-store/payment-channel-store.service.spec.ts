import { TestBed } from '@angular/core/testing';
import { PaymentChannelStoreService } from './payment-channel-store.service';

describe('PaymentChannelStoreService (100% coverage)', () => {
     let store: InstanceType<typeof PaymentChannelStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(PaymentChannelStoreService);
     });

     afterEach(() => {
          store.resetAll();
     });

     // -------------------------
     // INITIAL STATE
     // -------------------------

     it('should initialize with default state', () => {
          const state = store.getAll();

          expect(state.channelIDField).toBe('');
          expect(state.flags.close).toBeTrue();
          expect(state.flagValues.close).toBe(0x00020000);
          expect(state.authorizedWallets).toEqual([]);
          expect(state.totalFlagsHex).toBe('0x0');
     });

     // -------------------------
     // setField
     // -------------------------

     it('should set generic field', () => {
          store.setField('destination', 'rABC');

          expect(store.getAll().destination).toBe('rABC');
     });

     it('should set array field', () => {
          store.setField('authorizedWallets', [{ address: 'r1' }]);

          expect(store.getAll().authorizedWallets.length).toBe(1);
     });

     it('should set nested object field', () => {
          store.setField('flags', {
               renew: true,
               close: false,
               claimAndClose: true,
          });

          expect(store.getAll().flags.renew).toBeTrue();
     });

     // -------------------------
     // specific setter
     // -------------------------

     it('should set paymentChannelCancelAfterTime', () => {
          store.setPaymentChannelCancelAfterTime('123');

          expect(store.getAll().paymentChannelCancelAfterTimeField).toBe('123');
     });

     // -------------------------
     // updateField
     // -------------------------

     it('should update field using updater', () => {
          store.setField('amount', '10');

          store.updateField('amount', val => val + '0');

          expect(store.getAll().amount).toBe('100');
     });

     it('should update numeric field', () => {
          store.setField('walletPaymentChannelCount', 1);

          store.updateField('walletPaymentChannelCount', c => c + 1);

          expect(store.getAll().walletPaymentChannelCount).toBe(2);
     });

     it('should handle no-op updater', () => {
          store.setField('destination', 'rABC');

          store.updateField('destination', v => v);

          expect(store.getAll().destination).toBe('rABC');
     });

     // -------------------------
     // computed
     // -------------------------

     it('should reflect computed expiration date', () => {
          store.setPaymentChannelCancelAfterTime('999');

          expect(store.credentialSubjectExpirationDate()).toBe('999');
     });

     // -------------------------
     // clearOptionalExpirationDate
     // -------------------------

     it('should clear expiration date', () => {
          store.setPaymentChannelCancelAfterTime('123');

          store.clearOptionalExpirationDate();

          expect(store.getAll().paymentChannelCancelAfterTimeField).toBe('');
     });

     // -------------------------
     // resetChannelIdSelection
     // -------------------------

     it('should reset channel selection fields only', () => {
          store.setField('channelIDField', 'abc');
          store.setField('amount', '100');
          store.setField('destination', 'rABC');

          store.resetChannelIdSelection();

          const state = store.getAll();

          expect(state.channelIDField).toBe('');
          expect(state.amount).toBe('');
          expect(state.destination).toBe('rABC'); // unchanged
     });

     // -------------------------
     // resetCredentailFields
     // -------------------------

     it('should reset credential-related fields', () => {
          store.setField('channelIDField', 'x');
          store.setField('destination', 'rABC');
          store.setField('authorizedWallets', [{ address: 'r1' }]);
          store.setField('existingPaymentChannels', [{ id: 1 }]);
          store.setField('flags', { renew: true, close: false, claimAndClose: true });

          store.resetCredentailFields();

          const state = store.getAll();

          expect(state.channelIDField).toBe('');
          expect(state.destination).toBe('');
          expect(state.authorizedWallets).toEqual([]);
          expect(state.existingPaymentChannels).toEqual([]);
          expect(state.flags.close).toBeTrue(); // reset to default
     });

     // -------------------------
     // resetAll
     // -------------------------

     it('should fully reset store', () => {
          store.setField('destination', 'dirty');
          store.setField('walletPaymentChannelCount', 99);

          store.resetAll();

          const state = store.getAll();

          expect(state.destination).toBe('');
          expect(state.walletPaymentChannelCount).toBe(0);
     });

     it('should deep clone on resetAll', () => {
          const before = store.getAll().flags;

          store.resetAll();

          const after = store.getAll().flags;

          expect(before).not.toBe(after);
     });

     // -------------------------
     // getAll snapshot
     // -------------------------

     it('should return snapshot of state', () => {
          store.setField('destination', 'rXYZ');

          const snapshot = store.getAll();

          expect(snapshot.destination).toBe('rXYZ');
     });

     // -------------------------
     // getAll catch branch (critical for 100%)
     // -------------------------

     it('should ignore failing functions in getAll (catch branch)', () => {
          (store as any).badFn = () => {
               throw new Error('fail');
          };

          const snapshot = store.getAll();

          expect(snapshot).toBeTruthy();
          expect(snapshot.channelIDField).toBeDefined();
     });

     // -------------------------
     // edge cases
     // -------------------------

     it('should handle empty string values correctly', () => {
          store.setField('destination', 'abc');
          store.setField('destination', '');

          expect(store.getAll().destination).toBe('');
     });

     it('should handle array immutability', () => {
          store.setField('authorizedWallets', [{ address: 'r1' }]);

          const before = store.getAll().authorizedWallets;

          store.setField('authorizedWallets', [...before, { address: 'r2' }]);

          const after = store.getAll().authorizedWallets;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });
});
