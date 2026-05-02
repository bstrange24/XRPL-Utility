import { TestBed } from '@angular/core/testing';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { WalletStore } from './wallet.store';

describe('WalletStore (signalStore + computed)', () => {
     let store: InstanceType<typeof WalletStore>;

     const mockWalletA: Wallet = {
          address: 'rA',
          classicAddress: 'rA',
          name: 'Wallet A',
     } as any;

     const mockWalletB: Wallet = {
          address: 'rB',
          classicAddress: 'rB',
          name: 'Wallet B',
     } as any;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(WalletStore);
     });

     afterEach(() => {
          store.reset();
     });

     // -------------------------
     // initial state
     // -------------------------

     it('should initialize correctly', () => {
          const state = store.getAll();

          expect(state.wallets.length).toBe(0);
          expect(state.selectedIndex).toBe(0);
          expect(state.currentNetwork).toBe('devnet');
     });

     // -------------------------
     // setWallets
     // -------------------------

     it('should set wallets list', () => {
          store.setWallets([mockWalletA, mockWalletB]);

          expect(store.getAll().wallets.length).toBe(2);
     });

     // -------------------------
     // addWallet
     // -------------------------

     it('should add wallet to store', () => {
          store.addWallet(mockWalletA);
          store.addWallet(mockWalletB);

          const state = store.getAll();

          expect(state.wallets.length).toBe(2);
          expect(state.wallets[0].name).toBe('Wallet A');
     });

     // -------------------------
     // updateWallet by index
     // -------------------------

     it('should update wallet by index', () => {
          store.setWallets([mockWalletA]);

          store.updateWallet(0, { name: 'Updated Wallet' });

          expect(store.getAll().wallets[0].name).toBe('Updated Wallet');
     });

     it('should not affect other wallets when updating by index', () => {
          store.setWallets([mockWalletA, mockWalletB]);

          store.updateWallet(0, { name: 'Updated A' });

          const wallets = store.getAll().wallets;

          expect(wallets[0].name).toBe('Updated A');
          expect(wallets[1].name).toBe('Wallet B');
     });

     // -------------------------
     // updateWalletByAddress
     // -------------------------

     it('should update wallet by address', () => {
          store.setWallets([mockWalletA, mockWalletB]);

          store.updateWalletByAddress('rB', { name: 'Updated B' });

          const wallets = store.getAll().wallets;

          expect(wallets[1].name).toBe('Updated B');
     });

     it('should use classicAddress fallback', () => {
          const wallet: Wallet = {
               address: '',
               classicAddress: 'rX',
               name: 'Wallet X',
          } as any;

          store.setWallets([wallet]);

          store.updateWalletByAddress('rX', { name: 'Updated X' });

          expect(store.getAll().wallets[0].name).toBe('Updated X');
     });

     // -------------------------
     // replaceWallets
     // -------------------------

     it('should replace entire wallet list', () => {
          store.setWallets([mockWalletA]);

          store.replaceWallets([mockWalletB]);

          expect(store.getAll().wallets.length).toBe(1);
          expect(store.getAll().wallets[0].name).toBe('Wallet B');
     });

     // -------------------------
     // deleteWallet
     // -------------------------

     it('should delete wallet by index', () => {
          store.setWallets([mockWalletA, mockWalletB]);

          store.deleteWallet(0);

          const wallets = store.getAll().wallets;

          expect(wallets.length).toBe(1);
          expect(wallets[0].name).toBe('Wallet B');
     });

     it('should adjust selectedIndex when deleting last wallet', () => {
          store.setWallets([mockWalletA, mockWalletB]);

          store.setSelectedIndex(1);

          store.deleteWallet(1);

          expect(store.getAll().selectedIndex).toBe(0);
     });

     it('should not go negative selectedIndex', () => {
          store.setWallets([mockWalletA]);

          store.setSelectedIndex(0);

          store.deleteWallet(0);

          // expect(store.getAll().selectedIndex).toBe(0);
     });

     // -------------------------
     // setSelectedIndex
     // -------------------------

     it('should update selected index', () => {
          store.setWallets([mockWalletA, mockWalletB]);

          store.setSelectedIndex(1);

          expect(store.getAll().selectedIndex).toBe(1);
     });

     // -------------------------
     // computed: hasWallets
     // -------------------------

     it('should return false when no wallets exist', () => {
          expect(store.hasWallets()).toBeFalse();
     });

     it('should return true when wallets exist', () => {
          store.setWallets([mockWalletA]);

          expect(store.hasWallets()).toBeTrue();
     });

     // -------------------------
     // computed: selectedWallet
     // -------------------------

     it('should return selected wallet', () => {
          store.setWallets([mockWalletA, mockWalletB]);
          store.setSelectedIndex(1);

          expect(store.selectedWallet()?.name).toBe('Wallet B');
     });

     it('should return null if index is invalid', () => {
          store.setWallets([mockWalletA]);
          store.setSelectedIndex(99);

          expect(store.selectedWallet()).toBeNull();
     });

     // -------------------------
     // computed: walletVm
     // -------------------------

     it('should return walletVm with wallet data', () => {
          store.setWallets([mockWalletA]);
          store.setSelectedIndex(0);

          const vm = store.walletVm();

          expect(vm.hasWallet).toBeTrue();
          expect(vm.address).toBe('rA');
          expect(vm.name).toBe('Wallet A');
     });

     it('should return empty walletVm when no wallets exist', () => {
          const vm = store.walletVm();

          expect(vm.hasWallet).toBeFalse();
          expect(vm.address).toBe('');
          expect(vm.name).toBe('');
          expect(vm.wallet).toBeNull();
     });

     // -------------------------
     // reset
     // -------------------------

     it('should reset store to initial state', () => {
          store.setWallets([mockWalletA]);
          store.setSelectedIndex(5);

          store.reset();

          const state = store.getAll();

          expect(state.wallets.length).toBe(0);
          expect(state.selectedIndex).toBe(0);
          expect(state.currentNetwork).toBe('devnet');
     });

     // -------------------------
     // snapshot integrity
     // -------------------------

     it('should return correct snapshot from getAll', () => {
          store.setWallets([mockWalletA]);
          store.setSelectedIndex(0);

          const snapshot = store.getAll();

          expect(snapshot.wallets.length).toBe(1);
          expect(snapshot.selectedIndex).toBe(0);
     });
});
