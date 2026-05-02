import { TestBed } from '@angular/core/testing';
import { WalletsStoreService } from './wallets-store.service';

describe('WalletsStoreService (100% coverage)', () => {
     let store: InstanceType<typeof WalletsStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(WalletsStoreService);
     });

     afterEach(() => {
          store.resetAll();
     });

     // -------------------------
     // INITIAL STATE
     // -------------------------

     it('should initialize with full default state', () => {
          const state = store.getAll();

          expect(state.mnemonicInput).toBe('');
          expect(state.mnemonicValid).toBeFalse();
          expect(state.secretNumberInput).toEqual([]);
          expect(state.secretNumberValid).toBeFalse();
          expect(state.seedInput).toBe('');
          expect(state.seedValid).toBeFalse();
          expect(state.encryptionType).toBe('');
          expect(state.seed).toBe('');
          expect(state.mnemonic).toBe('');
          expect(state.secretNumbers).toBe('');
          expect(state.ed25519_encryption_type).toBeFalse();
          expect(state.secp256k1_encryption_type).toBeFalse();
          expect(state.errorMessage).toBe('');
          expect(state.selectedAddress).toBe('');

          expect(state.buttonLoading).toEqual({
               generateNewWalletFromSeed: false,
               generateNewWalletFromMnemonic: false,
               generateNewWalletFromSecretNumbers: false,
               deriveWalletFromFamilySeed: false,
               deriveWalletFromMnemonic: false,
               deriveWalletFromSecretNumbers: false,
          });
     });

     // -------------------------
     // setField (cover all types)
     // -------------------------

     it('should set string field', () => {
          store.setField('mnemonicInput', 'test mnemonic');
          expect(store.getAll().mnemonicInput).toBe('test mnemonic');
     });

     it('should set boolean field', () => {
          store.setField('mnemonicValid', true);
          expect(store.getAll().mnemonicValid).toBeTrue();
     });

     it('should set array field', () => {
          store.setField('secretNumberInput', ['1', '2']);
          expect(store.getAll().secretNumberInput).toEqual(['1', '2']);
     });

     it('should set nested object field', () => {
          store.setField('buttonLoading', {
               generateNewWalletFromSeed: true,
               generateNewWalletFromMnemonic: false,
               generateNewWalletFromSecretNumbers: false,
               deriveWalletFromFamilySeed: false,
               deriveWalletFromMnemonic: false,
               deriveWalletFromSecretNumbers: false,
          });

          expect(store.getAll().buttonLoading.generateNewWalletFromSeed).toBeTrue();
     });

     // -------------------------
     // updateField (functional path)
     // -------------------------

     it('should update string field using updater', () => {
          store.setField('seedInput', 'abc');

          store.updateField('seedInput', current => current + '_updated');

          expect(store.getAll().seedInput).toBe('abc_updated');
     });

     it('should update boolean field using updater', () => {
          store.setField('seedValid', false);

          store.updateField('seedValid', current => !current);

          expect(store.getAll().seedValid).toBeTrue();
     });

     it('should update array field immutably', () => {
          store.setField('secretNumberInput', ['1']);

          const before = store.getAll().secretNumberInput;

          store.updateField('secretNumberInput', arr => [...arr, '2']);

          const after = store.getAll().secretNumberInput;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });

     it('should handle no-op updater (same value)', () => {
          store.setField('seed', 'abc');

          store.updateField('seed', current => current);

          expect(store.getAll().seed).toBe('abc');
     });

     // -------------------------
     // resetAll (structuredClone path)
     // -------------------------

     it('should fully reset state using resetAll', () => {
          store.setField('mnemonicInput', 'dirty');
          store.setField('seedValid', true);

          store.resetAll();

          const state = store.getAll();

          expect(state.mnemonicInput).toBe('');
          expect(state.seedValid).toBeFalse();
     });

     it('should not retain object references after reset (structuredClone)', () => {
          const before = store.getAll().buttonLoading;

          store.resetAll();

          const after = store.getAll().buttonLoading;

          expect(before).not.toBe(after); // ensures clone
     });

     // -------------------------
     // getAll() - normal path
     // -------------------------

     it('should return full snapshot via getAll', () => {
          store.setField('selectedAddress', 'rABC');

          const snapshot = store.getAll();

          expect(snapshot.selectedAddress).toBe('rABC');
          expect(snapshot).toEqual(
               jasmine.objectContaining({
                    selectedAddress: 'rABC',
               })
          );
     });

     // -------------------------
     // getAll() - catch branch coverage
     // -------------------------

     it('should ignore non-signal functions in getAll (catch branch)', () => {
          // Force a function on store that throws when called
          (store as any).badFunction = () => {
               throw new Error('fail');
          };

          const snapshot = store.getAll();

          // test passes if no crash and snapshot still valid
          expect(snapshot).toBeTruthy();
          expect(snapshot.mnemonicInput).toBeDefined();
     });

     // -------------------------
     // edge cases
     // -------------------------

     it('should handle empty string updates correctly', () => {
          store.setField('errorMessage', 'error');

          store.setField('errorMessage', '');

          expect(store.getAll().errorMessage).toBe('');
     });

     it('should handle null-like values safely', () => {
          store.setField('selectedAddress', '');

          expect(store.getAll().selectedAddress).toBe('');
     });
});
