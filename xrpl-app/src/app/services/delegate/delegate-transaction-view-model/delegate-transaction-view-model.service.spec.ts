import { TestBed } from '@angular/core/testing';
import { DelegateTransactionViewModelService } from './delegate-transaction-view-model.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { DelegateStoreService } from '../delegate-store/delegate-store.service';
import { signal } from '@angular/core';

// Mock classes
class MockWalletManagerService {
     getSelectedWallet = jasmine.createSpy();
     wallets = jasmine.createSpy().and.returnValue([]);
}

class MockDelegateStoreService {
     existingDelegations = jasmine.createSpy().and.returnValue([]);
}

describe('DelegateTransactionViewModelService', () => {
     let service: DelegateTransactionViewModelService;
     let walletManagerService: MockWalletManagerService;
     let delegateStore: MockDelegateStoreService;
     let mockWallet: any;

     beforeEach(() => {
          walletManagerService = new MockWalletManagerService();
          delegateStore = new MockDelegateStoreService();

          mockWallet = {
               address: 'rTestAddress1234567890',
               name: 'Test Wallet',
               classicAddress: 'rTestAddress1234567890',
          };

          walletManagerService.getSelectedWallet.and.returnValue(mockWallet);
          walletManagerService.wallets.and.returnValue([mockWallet]);
          delegateStore.existingDelegations.and.returnValue([]);

          TestBed.configureTestingModule({
               providers: [DelegateTransactionViewModelService, { provide: WalletManagerService, useValue: walletManagerService }, { provide: DelegateStoreService, useValue: delegateStore }],
          });

          service = TestBed.inject(DelegateTransactionViewModelService);
     });

     describe('activeTab', () => {
          it('should default to delegateCreate', () => {
               expect(service.activeTab()).toBe('delegateCreate');
          });
     });

     describe('infoData', () => {
          it('should return null when no wallet selected', () => {
               walletManagerService.getSelectedWallet.and.returnValue(null);
               expect(service.infoData()).toBeNull();
          });

          it('should return null when wallet not found in wallets list', () => {
               walletManagerService.getSelectedWallet.and.returnValue({ address: 'rNotInList' });
               walletManagerService.wallets.and.returnValue([mockWallet]);
               expect(service.infoData()).toBeNull();
          });

          it('should return info with wallet name when provided', () => {
               const info = service.infoData();
               expect(info).not.toBeNull();
               expect(info?.address).toBe(mockWallet.address);
               expect(info?.mode).toBe('delegateCreate');
               expect(info?.delegationCount).toBe(0);
               expect(info?.existingDelegations).toEqual([]);
               expect(info?.message).toContain(mockWallet.address);
               expect(info?.message).toContain('has no delegations');
          });

          it('should return info with default name when wallet has no name', () => {
               const walletWithoutName = { address: 'rNoNameAddress' };
               walletManagerService.getSelectedWallet.and.returnValue(walletWithoutName);
               walletManagerService.wallets.and.returnValue([walletWithoutName]);

               const info = service.infoData();
               expect(info?.message).toContain('rNoNameAddress');
               expect(info?.message).toContain('has no delegations');
          });

          it('should show message for single delegation', () => {
               const delegations = [{ id: 'delegate1', action: 'create' }];
               delegateStore.existingDelegations.and.returnValue(delegations);

               const info = service.infoData();
               expect(info?.delegationCount).toBe(1);
               expect(info?.message).toContain('has <strong>1</strong> delegation');
          });

          it('should show message for multiple delegations', () => {
               const delegations = [
                    { id: 'delegate1', action: 'create' },
                    { id: 'delegate2', action: 'delete' },
               ];
               delegateStore.existingDelegations.and.returnValue(delegations);

               const info = service.infoData();
               expect(info?.delegationCount).toBe(2);
               expect(info?.message).toContain('has <strong>2</strong> delegations');
          });

          it('should handle empty wallet name gracefully', () => {
               const walletWithEmptyName = { address: 'rTestAddress', name: '' };
               walletManagerService.getSelectedWallet.and.returnValue(walletWithEmptyName);
               walletManagerService.wallets.and.returnValue([walletWithEmptyName]);

               const info = service.infoData();
               expect(info?.message).toBeDefined();
          });

          it('should include the wallet address in the message', () => {
               const info = service.infoData();
               expect(info?.message).toContain(mockWallet.address);
          });

          it('should wrap address in code tags', () => {
               const info = service.infoData();
               expect(info?.message).toContain(`<code>${mockWallet.address}</code>`);
          });

          it('should handle wallet with classicAddress instead of address', () => {
               const walletWithClassic = { classicAddress: 'rClassicAddress', name: 'Classic Wallet' };
               walletManagerService.getSelectedWallet.and.returnValue(walletWithClassic);
               walletManagerService.wallets.and.returnValue([walletWithClassic]);

               const info = service.infoData();
               // The service uses wallet.address, so this would be undefined
               expect(info).toBeNull();
          });

          it('should return correct mode from activeTab signal', () => {
               service.activeTab.set('delegateCreate');
               const info = service.infoData();
               expect(info?.mode).toBe('delegateCreate');
          });

          it('should update info when activeTab changes', () => {
               const info1 = service.infoData();
               expect(info1?.mode).toBe('delegateCreate');

               service.activeTab.set('delegateClear');
               const info2 = service.infoData();
               expect(info2?.mode).toBe('delegateClear');
          });
     });
});
