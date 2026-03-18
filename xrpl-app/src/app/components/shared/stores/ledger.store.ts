import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface LedgerState {
     ledgerIndex: number;
     validatedLedger: number;
     baseFee: string;
     reserveBase: string;
     reserveIncrement: string;
     lastLedgerSequence: number | null;
     fee: string | null;
}

const initialState: LedgerState = {
     ledgerIndex: 0,
     validatedLedger: 0,
     baseFee: '12',
     reserveBase: '10',
     reserveIncrement: '2',
     lastLedgerSequence: 0,
     fee: '12',
};

export const LedgerStore = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof LedgerState>(field: K, value: LedgerState[K]) {
               patchState(store, { [field]: value });
          },

          // Generic updater
          updateField<K extends keyof LedgerState>(field: K, updater: (current: LedgerState[K]) => LedgerState[K]) {
               patchState(store, state => ({ [field]: updater(state[field]) }));
          },

          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          // updateServerInfo(info: any) {
          //      patchState(store, {
          //           validatedLedger: info.validated_ledger.seq,
          //      });
          // },

          // updateFee(fee: any) {
          //      patchState(store, {
          //           baseFee: fee.drops.base_fee,
          //      });
          // },

          // updateReserve(reserveBase: string, reserveIncrement: string) {
          //      patchState(store, {
          //           reserveBase,
          //           reserveIncrement,
          //      });
          // },

          /** Snapshot */
          getAll(): LedgerState {
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
               return snapshot as LedgerState;
          },
     }))
);
