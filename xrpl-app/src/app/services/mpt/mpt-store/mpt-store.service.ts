import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

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
}

const initialState: MptState = {
     mptIssuanceId: '',
     metaData: '',
     authAction: 'authorize',
     lockAction: 'unlock',
     metadataError: '',
     tokenCount: 0,
     assetScale: 0,
     isMptFlagModeEnabled: false,
     transferFee: 0,
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
};

export const MptStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
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
     }))
);
