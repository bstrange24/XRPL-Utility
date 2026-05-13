import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { UiSignerEntry } from '../../../models/interface-items.model';
import { AccountConfiguratorState } from '../../../components/account-configurator/constants/account-configurator.types';

// Initial state — copy from your old one, but now strongly typed
const initialState: AccountConfiguratorState = {
     txOptions: null,
     account: null,
     accountInfo: '',
     configurationType: null,
     memoField: '',
     isMemoEnabled: false,
     isSimulateEnabled: false,
     useMultiSign: false,
     multiSignAddress: '',
     multiSignSeeds: '',
     multiSigningEnabled: false,
     hasSignerList: false,
     operations: '',
     amount: '',
     destination: '',
     nfTokenMinterAddress: '',
     authorizeFlag: '',
     enableMultiSignFlag: '',
     enableRegularKeyFlag: '',
     enableNftMinter: '',
     tickSize: '',
     transferRate: '',
     domain: '',
     isMessageKey: false,
     publicKey: '',
     regularKeyAddress: '',
     regularKeySeed: '',
     isRegularKeyAddress: false,
     regularKeySigningEnabled: false,
     signerQuorum: 1,
     SignerWeight: 1,
     signers: [{ Account: '', seed: '', SignerWeight: 1 }],
     depositAuthAddresses: [{ Account: '', seed: '', SignerWeight: 1 }],
     masterKeyDisabled: false,
     depositAuthEnabled: false,
     isdepositAuthAddress: false,
     depositAuthAddress: '',
     depositAuthEntries: '',
     formattedDepositAuthEntries: '',
     signerEntries: '',
     formattedSignerEntries: '',
     isNFTokenMinterEnabled: false,
     isAuthorizedNFTokenMinter: false,
     isUpdateMetaData: false,
     isHolderConfiguration: false,
     isExchangerConfiguration: false,
     isIssuerConfiguration: false,
     setFlags: [],
     clearFlags: [],
     walletTicketCount: 0,
     url: '',
     suppressIndividualFeedback: '',
     totalFlagsValue: 0,
     totalFlagsHex: '0x0',
};

export const AccountConfiguratorStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     // Methods (your convenience + generics)
     withMethods(store => ({
          // Generic setter
          setField<K extends keyof AccountConfiguratorState>(field: K, value: AccountConfiguratorState[K]) {
               patchState(store, { [field]: value });
          },

          // Generic updater
          updateField<K extends keyof AccountConfiguratorState>(field: K, updater: (current: AccountConfiguratorState[K]) => AccountConfiguratorState[K]) {
               patchState(store, state => ({ [field]: updater(state[field]) }));
          },

          getAll(): AccountConfiguratorState {
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

               return snapshot as AccountConfiguratorState;
          },

          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          addSigner(signer: UiSignerEntry) {
               patchState(store, state => ({ signers: [...state.signers, signer] }));
          },

          removeSigner(index: number) {
               patchState(store, state => ({
                    signers: state.signers.filter((_: any, i: number) => i !== index),
               }));
          },

          clearSigners() {
               patchState(store, { signers: [{ Account: '', seed: '', SignerWeight: 1 }] });
          },

          addDepositAuthAddress(entry: UiSignerEntry) {
               patchState(store, state => ({
                    depositAuthAddresses: [...state.depositAuthAddresses, entry],
               }));
          },

          removeDepositAuthAddress(index: number) {
               patchState(store, state => ({
                    depositAuthAddresses: state.depositAuthAddresses.filter((_: any, i: number) => i !== index),
               }));
          },

          clearDepositAuthAddresses() {
               patchState(store, {
                    depositAuthAddresses: [{ Account: '', seed: '', SignerWeight: 1 }],
               });
          },

          clearDepositAuthAddress(index: number) {
               patchState(store, state => {
                    const addresses = [...state.depositAuthAddresses];
                    addresses[index] = { ...addresses[index], account: '' };
                    return { depositAuthAddresses: addresses };
               });
          },

          updateSigner(index: number, field: keyof UiSignerEntry, value: string | number) {
               patchState(store, state => {
                    const signers = [...state.signers];
                    signers[index] = { ...signers[index], [field]: value };
                    return { signers };
               });
          },

          updateDepositAuthAddress(index: number, field: 'account', value: string) {
               patchState(store, state => {
                    const addresses = [...state.depositAuthAddresses];
                    addresses[index] = { ...addresses[index], [field]: value };
                    return { depositAuthAddresses: addresses };
               });
          },
     }))
);
