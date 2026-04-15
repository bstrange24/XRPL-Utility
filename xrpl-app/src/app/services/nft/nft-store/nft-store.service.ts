import { computed } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';

export interface NFtState {
     nftId: string;
     nftIndex: string;
     nftOfferId: string;
     selectedNftOfferIndex: string;
     destination: string;
     amount: string;
     taxon: string;
     nftCreator: string;
     nftFlags: number;
     decodedNftFlags: any;
     nftIdSearchQuery: string;
     transferFee: number;
     outstandingNfts: string;
     expiration: string;
     outstandingNftsCollapsed: boolean;
     existingNftsCollapsed: boolean;
     existingSellOffersCollapsed: boolean;
     minterAddress: string;
     issuerAddress: string;
     enableExpirationDate: boolean;
     enableSellOnNftCreation: boolean;
     initialURI: string;
     nftCountField: string;
     isNftOwner: boolean;
     isCollapsed: boolean;
     nftOwnerAddress: string;
     nfTokenMinterAddress: string;
     nfTokenIssuerAddress: string;
     existingNfts: any[];
     existingSellOffers: any[];
     existingBuyOffers: any[];
}

const initialState: NFtState = {
     nftId: '',
     nftIndex: '',
     nftOfferId: '',
     selectedNftOfferIndex: '',
     destination: '',
     amount: '',
     nftCreator: '',
     nftFlags: 0,
     decodedNftFlags: [],
     taxon: '',
     nftIdSearchQuery: '',
     transferFee: 0,
     outstandingNfts: '',
     outstandingNftsCollapsed: false,
     existingNftsCollapsed: false,
     existingSellOffersCollapsed: false,
     minterAddress: '',
     issuerAddress: '',
     expiration: '',
     initialURI: 'https://ipfs.io/ipfs/bafybeigjro2d2tc43bgv7e4sxqg7f5jga7kjizbk7nnmmyhmq35dtz6deq',
     nftCountField: '',
     enableExpirationDate: false,
     enableSellOnNftCreation: false,
     isNftOwner: false,
     isCollapsed: false,
     nftOwnerAddress: '',
     nfTokenMinterAddress: '',
     nfTokenIssuerAddress: '',
     existingNfts: [],
     existingSellOffers: [],
     existingBuyOffers: [],
};

export const CreateNftStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     // withComputed(store => ({
     //      expiration: computed(() => store.expiration()),
     // })),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof NFtState>(field: K, value: NFtState[K]) {
               patchState(store, { [field]: value });
          },

          setExpiration(value: string) {
               patchState(store, { expiration: value });
          },

          /** Generic updater */
          updateField<K extends keyof NFtState>(field: K, updater: (current: NFtState[K]) => NFtState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          /** Reset entire store */
          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          /** Clear expiration */
          clearExpiration() {
               patchState(store, { expiration: '' });
          },

          /** Reset dropdown-related fields */
          resetNftIdSelection() {
               patchState(store, {
                    nftId: '',
                    nftIndex: '',
                    nftCreator: '',
                    amount: '',
               });
          },

          /** Reset NFT form fields */
          resetNftFields() {
               patchState(store, {
                    nftId: '',
                    nftIndex: '',
                    nftOfferId: '',
                    taxon: '',
                    nftCreator: '',
                    expiration: '',
                    enableExpirationDate: false,
                    enableSellOnNftCreation: false,
                    minterAddress: '',
                    issuerAddress: '',
                    initialURI: 'https://ipfs.io/ipfs/bafybeigjro2d2tc43bgv7e4sxqg7f5jga7kjizbk7nnmmyhmq35dtz6deq',
                    nftCountField: '',
                    destination: '',
                    nftIdSearchQuery: '',
                    outstandingNfts: '',
                    nfTokenMinterAddress: '',
                    nfTokenIssuerAddress: '',
                    amount: '',
                    transferFee: 0,
                    isNftOwner: false,
                    isCollapsed: false,
               });
          },

          /** Snapshot */
          getAll(): NFtState {
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
               return snapshot as NFtState;
          },
     }))
);
