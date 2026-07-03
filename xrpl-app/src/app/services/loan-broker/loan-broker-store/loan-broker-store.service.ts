import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { LoanBrokerDisplayItem } from '../../../components/loan-broker/constants/loan-broker.types';

export interface LoanBrokerState {
     vaultId: string;
     loanBrokerId: string;
     data: string;
     managementFeeRate: number | null;
     debtMaximum: string;
     coverRateMinimum: number | null;
     coverRateLiquidation: number | null;
     existingBrokers: LoanBrokerDisplayItem[];
     selectedBrokerId: string | null;
     brokerIdSearchQuery: string;
     manuallyFetchedBroker: LoanBrokerDisplayItem | null;
}

const initialState: LoanBrokerState = {
     vaultId: '',
     loanBrokerId: '',
     data: '',
     managementFeeRate: null,
     debtMaximum: '',
     coverRateMinimum: null,
     coverRateLiquidation: null,
     existingBrokers: [],
     selectedBrokerId: null,
     brokerIdSearchQuery: '',
     manuallyFetchedBroker: null,
};

export const LoanBrokerStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setField<K extends keyof LoanBrokerState>(field: K, value: LoanBrokerState[K]) {
               patchState(store, { [field]: value });
          },

          resetAll() {
               patchState(store, {
                    ...structuredClone(initialState),
               });
          },

          resetFormFields() {
               patchState(store, {
                    vaultId: '',
                    loanBrokerId: '',
                    data: '',
                    managementFeeRate: null,
                    debtMaximum: '',
                    coverRateMinimum: null,
                    coverRateLiquidation: null,
                    brokerIdSearchQuery: '',
               });
          },

          getAll(): LoanBrokerState {
               const snapshot: any = {};
               for (const [key, value] of Object.entries(store)) {
                    if (typeof value === 'function') {
                         try {
                              snapshot[key] = value();
                         } catch {
                              // ignore non-signal methods
                         }
                    }
               }
               return snapshot as LoanBrokerState;
          },
     }))
);
