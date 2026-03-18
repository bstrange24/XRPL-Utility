import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';

export interface WalletState {
     wallets: Wallet[];
     selectedIndex: number;
     currentNetwork: string;
}

const initialState: WalletState = {
     wallets: [],
     selectedIndex: 0,
     currentNetwork: 'devnet',
};

export const WalletStore = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withComputed(store => ({
          hasWallets: computed(() => store.wallets().length > 0),

          selectedWallet: computed(() => {
               const wallets = store.wallets();
               const index = store.selectedIndex();

               return wallets[index] ?? null;
          }),

          walletVm: computed(() => {
               const wallets = store.wallets();
               const index = store.selectedIndex();
               const wallet = wallets[index] ?? null;

               return wallet
                    ? {
                           wallet,
                           address: wallet.address,
                           name: wallet.name,
                           hasWallet: true,
                      }
                    : {
                           wallet: null,
                           address: '',
                           name: '',
                           hasWallet: false,
                      };
          }),
     })),

     withMethods(store => ({
          setWallets(wallets: Wallet[]) {
               patchState(store, { wallets });
          },

          addWallet(wallet: Wallet) {
               patchState(store, state => ({
                    wallets: [...state.wallets, wallet],
               }));
          },

          updateWallet(index: number, updates: Partial<Wallet>) {
               patchState(store, state => ({
                    wallets: state.wallets.map((w, i) => (i === index ? { ...w, ...updates } : w)),
               }));
          },

          updateWalletByAddress(address: string, updates: Partial<Wallet>) {
               patchState(store, state => ({
                    wallets: state.wallets.map(w => {
                         const addr = w.classicAddress || w.address;
                         return addr === address ? { ...w, ...updates } : w;
                    }),
               }));
          },

          /** 🔥 CRITICAL: batch update */
          replaceWallets(updated: Wallet[]) {
               patchState(store, { wallets: updated });
          },

          deleteWallet(index: number) {
               patchState(store, state => {
                    const wallets = state.wallets.filter((_, i) => i !== index);

                    return {
                         wallets,
                         selectedIndex: Math.min(state.selectedIndex, wallets.length - 1),
                    };
               });
          },

          setSelectedIndex(index: number) {
               patchState(store, { selectedIndex: index });
          },

          reset() {
               patchState(store, initialState);
          },

          /** Snapshot (like your tx store) */
          getAll(): WalletState {
               return {
                    wallets: store.wallets(),
                    selectedIndex: store.selectedIndex(),
                    currentNetwork: store.currentNetwork(),
               };
          },
     }))
);
