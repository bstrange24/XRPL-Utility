import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { BalanceChange } from '../../../models/interface-items.model';

export interface AccountChangesState {
     balanceChanges: BalanceChange[];
     loadingInitial: boolean;
     loadingMore: boolean;
     hasMoreData: boolean;
     filterValue: string;
     dateRange: { start: Date | null; end: Date | null };
}

const initialState: AccountChangesState = {
     balanceChanges: [],
     loadingInitial: false,
     loadingMore: false,
     hasMoreData: true,
     filterValue: '',
     dateRange: { start: null, end: null },
};

export const AccountChangesStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withComputed(() => ({})),

     withMethods(store => ({
          setField<K extends keyof AccountChangesState>(field: K, value: AccountChangesState[K]) {
               patchState(store, { [field]: value });
          },

          resetForNewLoad() {
               patchState(store, {
                    balanceChanges: [],
                    hasMoreData: true,
                    loadingInitial: true,
                    loadingMore: false,
               });
          },

          appendBalanceChanges(entries: BalanceChange[]) {
               patchState(store, state => ({
                    balanceChanges: [...state.balanceChanges, ...entries],
               }));
          },

          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          getAll(): AccountChangesState {
               const snapshot: Record<string, unknown> = {};
               for (const [key, value] of Object.entries(store)) {
                    if (typeof value === 'function') {
                         try {
                              snapshot[key] = (value as () => unknown)();
                         } catch {
                              // ignore non-signal methods
                         }
                    }
               }
               return snapshot as unknown as AccountChangesState;
          },
     }))
);
