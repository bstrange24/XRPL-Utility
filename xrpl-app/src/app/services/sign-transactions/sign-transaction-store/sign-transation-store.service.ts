import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { ButtonLoadingState } from '../../../components/sign-transactions/constants/sign-transaction.types';

export interface SignTransactionState {
     accountInfo: any;
     selectedTransaction: string;
     jsonEditorError: string;
     account: any;
     txJson: string;
     outputField: string;
     editedTxJson: any;
     multiSignedTxBlob: string;
     availableSigners: any[];
     requiredQuorum: number;
     selectedQuorum: number;
     flagResults: string;
     buttonLoading: ButtonLoadingState;
}

const initialState: SignTransactionState = {
     accountInfo: null,
     selectedTransaction: '',
     jsonEditorError: '',
     account: '',
     txJson: '',
     outputField: '',
     editedTxJson: '',
     multiSignedTxBlob: '',
     availableSigners: [],
     requiredQuorum: 0,
     selectedQuorum: 0,
     flagResults: '',
     buttonLoading: {
          getJson: false,
          signed: false,
          submit: false,
          multiSign: false,
          regularKeySign: false,
     },
};

export const SignTransationStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof SignTransactionState>(field: K, value: SignTransactionState[K]) {
               patchState(store, { [field]: value });
          },

          /** Generic updater */
          updateField<K extends keyof SignTransactionState>(field: K, updater: (current: SignTransactionState[K]) => SignTransactionState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          /** Reset entire store */
          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          /** Reset credential form fields */
          resetCredentailFields() {
               patchState(store, {
                    jsonEditorError: '',
                    account: '',
                    txJson: '',
                    outputField: '',
                    editedTxJson: '',
                    multiSignedTxBlob: '',
                    availableSigners: [],
                    requiredQuorum: 0,
                    selectedQuorum: 0,
                    flagResults: '',
                    buttonLoading: {
                         getJson: false,
                         signed: false,
                         submit: false,
                         multiSign: false,
                         regularKeySign: false,
                    },
               });
          },

          /** Snapshot */
          getAll(): SignTransactionState {
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
               return snapshot as SignTransactionState;
          },
     }))
);
