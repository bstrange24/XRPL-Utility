import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { ButtonLoadingState } from '../../../models/interface-items.model';

export interface WalletState {
     mnemonicInput: string;
     mnemonicValid: boolean;
     secretNumberInput: any[];
     secretNumberValid: boolean;
     seedInput: string;
     seedValid: boolean;
     encryptionType: string;
     seed: string;
     mnemonic: string;
     secretNumbers: string;
     ed25519_encryption_type: boolean;
     secp256k1_encryption_type: boolean;
     buttonLoading: ButtonLoadingState;
     errorMessage: string;
     selectedAddress: string;
}

const initialState: WalletState = {
     mnemonicInput: '',
     mnemonicValid: false,
     secretNumberInput: [],
     secretNumberValid: false,
     seedValid: false,
     seedInput: '',
     encryptionType: '',
     seed: '',
     mnemonic: '',
     secretNumbers: '',
     ed25519_encryption_type: false,
     secp256k1_encryption_type: false,
     buttonLoading: {
          generateNewWalletFromSeed: false,
          generateNewWalletFromMnemonic: false,
          generateNewWalletFromSecretNumbers: false,
          deriveWalletFromFamilySeed: false,
          deriveWalletFromMnemonic: false,
          deriveWalletFromSecretNumbers: false,
     },
     errorMessage: '',
     selectedAddress: '',
};

export const WalletsStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setField<K extends keyof WalletState>(field: K, value: WalletState[K]) {
               patchState(store, { [field]: value });
          },

          updateField<K extends keyof WalletState>(field: K, updater: (current: WalletState[K]) => WalletState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          /** Snapshot */
          getAll(): WalletState {
               const snapshot: any = {};
               for (const [key, value] of Object.entries(store)) {
                    if (typeof value === 'function') {
                         try {
                              snapshot[key] = value();
                         } catch {
                              // ignore non-signal functions (methods)
                         }
                    }
               }
               return snapshot as WalletState;
          },
     }))
);
