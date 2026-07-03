import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import * as xrpl from 'xrpl';

export interface VaultState {
     amount: string;
     vaultIdSearchQuery: string;
     vaultStrategyFirstComeFirstServe: boolean;
     vaultMetaData: string;
     vaultCountField: string;
     tfVaultPrivate: boolean;
     tfVaultShareNonTransferable: boolean;
     existingVaults: any[];
     selectedVaultId: string | null;
     selectedVaultSequence: number | null;
     assetsMaximum: string;
     domainId: string;
     currentAssetsMaximum: any;
     holder: string;
     clawbackAmount: string;
     vaultAction: 'deposit' | 'withdraw';
     vaultAmount: string;
     destination: string;
     assetScale: any;
     manualVaultId: string | null;
     manuallyFetchedVault: any | null;
     cachedVaults: any[];
     shareMpts: any[];
     shareMpt: string;
}

const initialState: VaultState = {
     amount: '',
     vaultIdSearchQuery: '',
     vaultMetaData: '',
     tfVaultPrivate: false,
     tfVaultShareNonTransferable: false,
     vaultCountField: '',
     vaultStrategyFirstComeFirstServe: true,
     existingVaults: [],
     selectedVaultSequence: null,
     selectedVaultId: null,
     assetsMaximum: '',
     domainId: '',
     currentAssetsMaximum: null,
     holder: '',
     clawbackAmount: '',
     vaultAction: 'deposit',
     vaultAmount: '',
     destination: '',
     assetScale: null,
     manualVaultId: null,
     manuallyFetchedVault: null,
     cachedVaults: [],
     shareMpts: [],
     shareMpt: '',
};

export const VaultStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof VaultState>(field: K, value: VaultState[K]) {
               patchState(store, { [field]: value });
          },

          setEnableVaultStrategyFirstComeFirstServe(enabled: boolean) {
               patchState(store, { vaultStrategyFirstComeFirstServe: enabled });
          },

          /** Generic updater */
          updateField<K extends keyof VaultState>(field: K, updater: (current: VaultState[K]) => VaultState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          /** Reset entire store */
          resetAll() {
               patchState(store, {
                    ...structuredClone(initialState),
                    manuallyFetchedVault: null, // Ensure this is reset
               });
          },

          /** Reset dropdown-related fields */
          resetVaultIdSelection() {
               patchState(store, {
                    amount: '',
               });
          },

          /** Reset NFT form fields */
          resetVaultFields() {
               patchState(store, {
                    vaultStrategyFirstComeFirstServe: true,
                    vaultMetaData: '',
                    vaultCountField: '',
                    vaultIdSearchQuery: '',
                    amount: '',
                    tfVaultPrivate: false,
                    tfVaultShareNonTransferable: false,
                    selectedVaultId: null,
                    shareMpt: '',
               });
          },

          /** Snapshot */
          getAll(): VaultState {
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
               return snapshot as VaultState;
          },
     }))
);
