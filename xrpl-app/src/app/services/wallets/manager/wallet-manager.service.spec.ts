import { TestBed } from '@angular/core/testing';
import { WalletManagerService, Wallet } from './wallet-manager.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { NetworkService } from '../../utils/network/network-service';
import { signal } from '@angular/core';

describe('WalletManagerService', () => {
     let service: WalletManagerService;

     let storageMock: jasmine.SpyObj<StorageService>;
     let networkMock: jasmine.SpyObj<NetworkService>;

     // controlled signal for network changes
     let networkSignal = signal<string | undefined>(undefined);

     const mockWallet: Wallet = {
          address: 'r123',
          classicAddress: 'r123',
          seed: 'seed',
          name: 'Wallet 1',
     };

     beforeEach(() => {
          storageMock = jasmine.createSpyObj('StorageService', ['get', 'set', 'getNet']);

          storageMock.getNet.and.returnValue({
               environment: 'devnet',
               net: '',
          });
          storageMock.get.and.returnValue(null);

          networkMock = jasmine.createSpyObj('NetworkService', ['announceNetworkChange'], {
               networkChanged: networkSignal,
          });

          TestBed.configureTestingModule({
               providers: [WalletManagerService, { provide: StorageService, useValue: storageMock }, { provide: NetworkService, useValue: networkMock }],
          });

          service = TestBed.inject(WalletManagerService);
     });

     it('should initialize with empty wallets', () => {
          expect(service.wallets()).toEqual([]);
          expect(service.hasWallets()).toBeFalse();
     });

     it('should add wallet and persist', () => {
          service.addWallet(mockWallet);

          expect(service.wallets().length).toBe(1);
          expect(storageMock.set).toHaveBeenCalled();
     });

     it('should update wallet by index', () => {
          service.setWallets([mockWallet]);

          service.updateWallet(0, { name: 'Updated' });

          expect(service.wallets()[0].name).toBe('Updated');
     });

     it('should update wallet by address', () => {
          service.setWallets([mockWallet]);

          service.updateWalletByAddress('r123', { name: 'Updated' });

          expect(service.wallets()[0].name).toBe('Updated');
     });

     it('should delete wallet and adjust selected index', () => {
          service.setWallets([mockWallet, { ...mockWallet, address: 'r456' }]);

          service.setSelectedIndex(1);
          service.deleteWallet(1);

          expect(service.wallets().length).toBe(1);
          expect(service.getSelectedIndex()).toBe(0);
     });

     it('should clear wallets', () => {
          service.setWallets([mockWallet]);

          service.clearWallets();

          expect(service.wallets().length).toBe(0);
          expect(service.getSelectedIndex()).toBe(0);
     });

     it('should select wallet correctly', () => {
          service.setWallets([mockWallet]);

          service.setSelectedIndex(0);

          expect(service.getSelectedWallet()?.address).toBe('r123');
     });

     it('should return null if no valid selection', () => {
          expect(service.getSelectedWallet()).toBeNull();
     });

     it('should compute walletVm correctly', () => {
          service.setWallets([mockWallet]);

          const vm = service.walletVm();

          expect(vm.hasWallet).toBeTrue();
          expect(vm.address).toBe('r123');
     });

     it('should handle editing flow', () => {
          service.setWallets([mockWallet]);

          service.startEdit(0);
          expect(service.isEditing(0)).toBeTrue();

          service.saveEdit('New Name');
          expect(service.wallets()[0].name).toBe('New Name');

          service.startEdit(0);
          service.cancelEdit();
          expect(service.isEditing(0)).toBeFalse();
     });

     it('should fallback name if empty edit', () => {
          service.setWallets([mockWallet]);

          service.startEdit(0);
          service.saveEdit('');

          expect(service.wallets()[0].name).toBe('Wallet 1');
     });

     // it('should react to network changes', () => {
     //      storageMock.get.and.returnValue(JSON.stringify([mockWallet]));

     //      networkSignal.set('mainnet'); // trigger effect

     //      expect(service.wallets().length).toBe(1);
     // });

     it('should parse stored wallets safely (invalid JSON)', () => {
          storageMock.get.and.returnValue('invalid-json');

          // force reload
          (service as any).loadFromStorage();

          expect(service.wallets()).toEqual([]);
     });

     // it('should resolve destination from display string', () => {
     //      const destinations = [{ address: 'r1234567890abcdef' }];

     //      const display = 'Test (r12345...bcdef)';

     //      const result = service.getDestinationFromDisplay(display, destinations);

     //      expect(result).toEqual(destinations[0]);
     // });

     it('should return null if destination not found', () => {
          const result = service.getDestinationFromDisplay('invalid', []);

          expect(result).toBeNull();
     });

     it('should ensure wallet selected', () => {
          expect(service.ensureWalletSelected()).toBeFalse();

          service.setWallets([mockWallet]);
          service.setSelectedIndex(0);

          expect(service.ensureWalletSelected()).toBeTrue();
     });
});
