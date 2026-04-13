import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { DelegateAction, XRPLDelegate } from '../../../components/delegate/constants/delegate.types';
import { AppConstants } from '../../../core/app.constants';

export interface DelegateState {
     actions: any[];
     selected: Set<number>;
     delegateSelections: Record<string, Set<number>>;
     leftActions: DelegateAction[];
     rightActions: DelegateAction[];
     createdDelegations: boolean;
     existingDelegations: XRPLDelegate[];
     destination: string;
     outstandingChecksCollapsed: boolean;
     isCollapsed: boolean;
}

const initialState: DelegateState = {
     actions: AppConstants.DELEGATE_ACTIONS,
     selected: new Set<number>(),
     delegateSelections: {},
     leftActions: [],
     rightActions: [],
     createdDelegations: false,
     existingDelegations: [],
     destination: '',
     outstandingChecksCollapsed: false,
     isCollapsed: false,
};

export const DelegateStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof DelegateState>(field: K, value: DelegateState[K]) {
               patchState(store, { [field]: value });
          },

          /** Generic updater */
          updateField<K extends keyof DelegateState>(field: K, updater: (current: DelegateState[K]) => DelegateState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          /** Reset entire store */
          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          /** Reset dropdown-related fields */
          resetChannelIdSelection() {
               patchState(store, {
                    selected: new Set<number>(),
                    delegateSelections: {},
                    leftActions: [],
                    rightActions: [],
               });
          },

          /** Reset check form fields */
          resetCheckFields() {
               patchState(store, {
                    destination: '',
                    isCollapsed: false,
               });
          },

          /** Snapshot */
          getAll(): DelegateState {
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
               return snapshot as DelegateState;
          },
     }))
);
