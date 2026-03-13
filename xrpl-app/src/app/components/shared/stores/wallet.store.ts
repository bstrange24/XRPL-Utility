import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface WalletState {
     address: string;
     walletName: string;
     balance: string;
     ownerCount: number;
     sequence: number;
     signerList: any[];
}

const initialState: WalletState = {
     address: '',
     walletName: '',
     balance: '0',
     ownerCount: 0,
     sequence: 0,
     signerList: [],
};

export const WalletStore = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setWallet(address: string, name: string) {
               patchState(store, {
                    address,
                    walletName: name,
               });
          },

          updateAccountInfo(info: any) {
               patchState(store, {
                    balance: info.Balance,
                    ownerCount: info.OwnerCount,
                    sequence: info.Sequence,
               });
          },

          setSignerList(signers: any[]) {
               patchState(store, { signerList: signers });
          },

          reset() {
               patchState(store, initialState);
          },
     }))
);
