import { TestBed } from '@angular/core/testing';
import { SendXrpViewModelService } from './send-xrp-view-model.service';
import { WalletManagerService, Wallet } from '../../wallets/manager/wallet-manager.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { signal, WritableSignal } from '@angular/core';

describe('SendXrpViewModelService', () => {
     let service: SendXrpViewModelService;
     let mockWalletManagerService: jasmine.SpyObj<WalletManagerService>;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;

     // Signals for wallet manager
     let walletVmSignal: WritableSignal<any>;
     let walletsSignal: WritableSignal<Wallet[]>;

     const mockWallet: Wallet = {
          address: 'rTestAddress1234567890',
          classicAddress: 'rTestAddress1234567890',
          name: 'Test Wallet',
          balance: '1000',
          seed: 'test-seed',
     };

     const mockWalletVm = {
          wallet: mockWallet,
          address: mockWallet.address,
          name: mockWallet.name,
          hasWallet: true,
     };

     beforeEach(() => {
          // Initialize signals
          walletVmSignal = signal<any>(mockWalletVm);
          walletsSignal = signal<Wallet[]>([mockWallet]);

          mockWalletManagerService = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet', 'wallets', 'updateWallets', 'addWallet', 'updateWallet', 'deleteWallet', 'clearWallets', 'setSelectedIndex', 'getSelectedIndex', 'ensureWalletSelected'], {
               walletVm: walletVmSignal,
               wallets: walletsSignal,
          });
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['someMethod']);

          TestBed.configureTestingModule({
               providers: [SendXrpViewModelService, { provide: WalletManagerService, useValue: mockWalletManagerService }, { provide: UtilsService, useValue: mockUtilsService }],
          });

          service = TestBed.inject(SendXrpViewModelService);
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });

          it('should initialize activeTab to sendXrp', () => {
               expect(service.activeTab()).toBe('sendXrp');
          });
     });

     describe('currentWallet', () => {
          it('should return walletVm from walletManager', () => {
               expect(service.currentWallet()).toEqual(mockWalletVm);
          });

          it('should update when walletVm changes', () => {
               const newWallet: Wallet = {
                    address: 'rNewAddress',
                    classicAddress: 'rNewAddress',
                    name: 'New Wallet',
                    balance: '500',
                    seed: 'new-seed',
               };
               const newWalletVm = {
                    wallet: newWallet,
                    address: newWallet.address,
                    name: newWallet.name,
                    hasWallet: true,
               };
               walletVmSignal.set(newWalletVm);

               expect(service.currentWallet()).toEqual(newWalletVm);
          });
     });

     describe('infoData', () => {
          it('should return null when current wallet address is undefined', () => {
               walletVmSignal.set({ address: undefined });

               const result = service.infoData();

               expect(result).toBeNull();
          });

          it('should return null when wallet not found in wallets list', () => {
               const walletVmWithAddress = { address: 'rNotFound' };
               walletVmSignal.set(walletVmWithAddress);
               walletsSignal.set([]);

               const result = service.infoData();

               expect(result).toBeNull();
          });

          it('should return info with wallet name and no balance', () => {
               const walletWithoutBalance: Wallet = {
                    address: 'rTestAddress1234567890',
                    classicAddress: 'rTestAddress1234567890',
                    name: 'Test Wallet',
                    seed: 'test-seed',
               };
               const walletVmWithoutBalance = {
                    wallet: walletWithoutBalance,
                    address: walletWithoutBalance.address,
                    name: walletWithoutBalance.name,
                    hasWallet: true,
               };
               walletVmSignal.set(walletVmWithoutBalance);
               walletsSignal.set([walletWithoutBalance]);

               const result = service.infoData();

               expect(result).toBe('<code>Test Wallet</code> wallet is ready to send XRP.');
          });

          it('should use "Selected wallet" as default name when name is missing', () => {
               const walletWithoutName: Wallet = {
                    address: 'rTestAddress1234567890',
                    classicAddress: 'rTestAddress1234567890',
                    balance: '1000',
                    seed: 'test-seed',
               };
               const walletVmWithoutName = {
                    wallet: walletWithoutName,
                    address: walletWithoutName.address,
                    name: undefined,
                    hasWallet: true,
               };
               walletVmSignal.set(walletVmWithoutName);
               walletsSignal.set([walletWithoutName]);

               const result = service.infoData();

               expect(result).toContain('<code>Selected wallet</code>');
          });

          it('should return info with wallet name and balance', () => {
               const result = service.infoData();

               expect(result).toBe('<code>Test Wallet</code> wallet has <strong class="object-count">1000 XRP</strong> available for sending.');
          });

          it('should handle balance as string', () => {
               const walletWithStringBalance: Wallet = {
                    address: 'rTestAddress1234567890',
                    classicAddress: 'rTestAddress1234567890',
                    name: 'Test Wallet',
                    balance: '2500',
                    seed: 'test-seed',
               };
               const walletVmWithStringBalance = {
                    wallet: walletWithStringBalance,
                    address: walletWithStringBalance.address,
                    name: walletWithStringBalance.name,
                    hasWallet: true,
               };
               walletVmSignal.set(walletVmWithStringBalance);
               walletsSignal.set([walletWithStringBalance]);

               const result = service.infoData();

               expect(result).toContain('2500 XRP');
          });

          it('should update info when wallet changes', () => {
               const newWallet: Wallet = {
                    address: 'rNewAddress',
                    classicAddress: 'rNewAddress',
                    name: 'New Wallet',
                    balance: '2000',
                    seed: 'new-seed',
               };
               const newWalletVm = {
                    wallet: newWallet,
                    address: newWallet.address,
                    name: newWallet.name,
                    hasWallet: true,
               };
               walletsSignal.set([mockWallet, newWallet]);
               walletVmSignal.set(newWalletVm);

               const result = service.infoData();

               expect(result).toBe('<code>New Wallet</code> wallet has <strong class="object-count">2000 XRP</strong> available for sending.');
          });
     });
});
