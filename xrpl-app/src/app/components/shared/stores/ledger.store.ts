import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface LedgerState {
     ledgerIndex: number;
     validatedLedger: number;
     baseFee: string;
     reserveBase: string;
     reserveIncrement: string;
}

const initialState: LedgerState = {
     ledgerIndex: 0,
     validatedLedger: 0,
     baseFee: '12',
     reserveBase: '10',
     reserveIncrement: '2',
};

export const LedgerStore = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          updateServerInfo(info: any) {
               patchState(store, {
                    validatedLedger: info.validated_ledger.seq,
               });
          },

          updateFee(fee: any) {
               patchState(store, {
                    baseFee: fee.drops.base_fee,
               });
          },

          updateReserve(reserveBase: string, reserveIncrement: string) {
               patchState(store, {
                    reserveBase,
                    reserveIncrement,
               });
          },
     }))
);
