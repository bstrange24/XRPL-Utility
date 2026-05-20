import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { MptAuthorizedStorageService } from '../mpt-authorized-storage/mpt-authorized-storage.service';
import { inject } from '@angular/core';

export interface MPTokenIssuance {
     LedgerEntryType: 'MPTokenIssuance';
     mpt_issuance_id: string;
     id?: string;
     AssetScale?: number;
     OutstandingAmount?: string;
     MaximumAmount?: string;
     TransferFee?: string;
     MPTokenMetadata?: string;
     Flags?: number;
     Account?: string;
     Issuer?: string;
     isHolder?: boolean;
     amount?: string;
}

export interface MPTokenHolding {
     LedgerEntryType: 'MPToken';
     id?: string;
     mpt_issuance_id: string;
     MPTokenIssuanceID?: string;
     MPTAmount?: string;
     AssetScale?: number;
     Flags?: number;
     Account?: string;
     isHolder?: boolean;
     amount?: string;
}

export interface MptState {
     mptIssuanceId: string;
     metaData: string;
     authAction: string;
     lockAction: string;
     metadataError: string;
     tokenCount: number;
     assetScale: number;
     isMptFlagModeEnabled: boolean;
     transferFee: number;
     isAuthorized: boolean;
     isUnauthorized: boolean;
     holderAccount: string;
     destination: string;
     amount: string;
     mptIdSearchQuery: string;
     XLS89_TEMPLATE: string;
     outstandingMpts: string;
     outstandingMptsCollapsed: boolean;
     deliverMinAmount: string;
     isMptEnabled: boolean;
     useDeliverMin: boolean;
     isCheckOwner: boolean;
     isCollapsed: boolean;
     existingMpts: any[];
     authorizedHolders: Record<string, string[]>;
     assetScaleCache: Map<string, number>;
}

const initialState: MptState = {
     mptIssuanceId: '',
     metaData: '',
     authAction: 'authorize',
     lockAction: 'unlock',
     metadataError: '',
     tokenCount: null as any,
     assetScale: null as any,
     isMptFlagModeEnabled: false,
     transferFee: null as any,
     isAuthorized: false,
     isUnauthorized: false,
     holderAccount: '',
     destination: '',
     amount: '',
     mptIdSearchQuery: '',
     XLS89_TEMPLATE: `{
  "t": "TBILL",
  "n": "T-Bill Yield Token",
  "d": "A yield-bearing stablecoin backed by short-term U.S. Treasuries and money market instruments.",
  "i": "example.org/tbill-icon.png",
  "ac": "rwa",
  "as": "treasury",
  "in": "Example Yield Co.",
  "us": [
    {
      "u": "exampleyield.co/tbill",
      "c": "website",
      "t": "Product Page"
    },
    {
      "u": "exampleyield.co/docs",
      "c": "docs",
      "t": "Yield Token Docs"
    }
  ],
  "ai": {
    "interest_rate": "5.00%",
    "interest_type": "variable",
    "yield_source": "U.S. Treasury Bills",
    "maturity_date": "2045-06-30",
    "cusip": "912796RX0"
  }
}`,
     outstandingMpts: '',
     outstandingMptsCollapsed: false,
     deliverMinAmount: '',
     useDeliverMin: false,
     isCheckOwner: false,
     isCollapsed: false,
     existingMpts: [],
     isMptEnabled: false,
     authorizedHolders: {},
     assetScaleCache: new Map<string, number>(),
};

export const MptStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => {
          // Initialize storage service
          const storageService = inject(MptAuthorizedStorageService);

          // Helper function to load persisted data
          const loadPersistedAuthorizedHolders = () => {
               const persisted = storageService.loadAuthorizedHolders();
               const authorizedHolders: Record<string, string[]> = {};

               for (const [issuanceId, data] of Object.entries(persisted)) {
                    authorizedHolders[issuanceId] = data.holders;
               }

               if (Object.keys(authorizedHolders).length > 0) {
                    patchState(store, { authorizedHolders });
                    console.log(`📦 Loaded ${Object.keys(authorizedHolders).length} MPT authorization records from localStorage`);
               }
          };

          // Load persisted data immediately when store initializes
          loadPersistedAuthorizedHolders();

          return {
               /** Generic setter */
               setField<K extends keyof MptState>(field: K, value: MptState[K]) {
                    patchState(store, { [field]: value });
               },

               /** Generic updater */
               updateField<K extends keyof MptState>(field: K, updater: (current: MptState[K]) => MptState[K]) {
                    patchState(store, state => ({
                         [field]: updater(state[field]),
                    }));
               },

               /** Reset entire store */
               resetAll() {
                    patchState(store, structuredClone(initialState));
                    // Clear localStorage as well
                    storageService.clearAll();
                    console.log('🗑️ Reset all MPT store data and cleared localStorage');
               },

               /** Reset dropdown-related fields */
               resetChannelIdSelection() {
                    patchState(store, {
                         mptIssuanceId: '',
                         amount: '',
                    });
               },

               /** Reset MPT form fields */
               resetMptFields() {
                    patchState(store, {
                         destination: '',
                         mptIdSearchQuery: '',
                         outstandingMpts: '',
                         outstandingMptsCollapsed: false,
                         mptIssuanceId: '',
                         amount: '',
                         deliverMinAmount: '',
                         useDeliverMin: false,
                         isCheckOwner: false,
                         isCollapsed: false,
                    });
               },

               /** Snapshot */
               getAll(): MptState {
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
                    return snapshot as MptState;
               },

               /** Update authorized holders for an issuance and persist to localStorage */
               setAuthorizedHolders(issuanceId: string, holders: string[]) {
                    // Update runtime state
                    patchState(store, {
                         authorizedHolders: {
                              ...store.authorizedHolders(),
                              [issuanceId]: holders,
                         },
                    });

                    // Persist to localStorage
                    storageService.saveHoldersForIssuance(issuanceId, holders);
                    console.log(`💾 Saved ${holders.length} authorized holder(s) for MPT ${issuanceId.slice(0, 10)}... to localStorage`);
               },

               /** Get authorized holders for an issuance */
               getAuthorizedHolders(issuanceId: string): string[] {
                    return store.authorizedHolders()[issuanceId] || [];
               },

               /** Clear authorized holders for an issuance */
               clearAuthorizedHolders(issuanceId: string) {
                    const newHolders = { ...store.authorizedHolders() };
                    delete newHolders[issuanceId];
                    patchState(store, { authorizedHolders: newHolders });

                    // Remove from localStorage
                    storageService.removeIssuance(issuanceId);
                    console.log(`🗑️ Cleared authorized holders for MPT ${issuanceId.slice(0, 10)}...`);
               },

               /** Clear all authorized holders (useful for wallet switching) */
               clearAllAuthorizedHolders() {
                    patchState(store, { authorizedHolders: {} });
                    storageService.clearAll();
                    console.log('🗑️ Cleared all authorized holders from store and localStorage');
               },

               /** Sync authorized holders from localStorage (useful after page reload) */
               syncFromLocalStorage() {
                    loadPersistedAuthorizedHolders();
               },

               /** Check if stored data is stale for an issuance */
               isAuthorizedHoldersStale(issuanceId: string, maxAgeDays: number = 7): boolean {
                    return storageService.isStale(issuanceId, maxAgeDays);
               },

               /** Get all issuance IDs that have authorized holders */
               getIssuancesWithAuthorizedHolders(): string[] {
                    return Object.keys(store.authorizedHolders());
               },

               /** Get total count of authorized holders across all issuances */
               getTotalAuthorizedHoldersCount(): number {
                    const holders = store.authorizedHolders();
                    return Object.values(holders).reduce((total, current) => total + current.length, 0);
               },
          };
     })
);
