import { TestBed } from '@angular/core/testing';
import { PaymentChannelViewModelService } from './payment-channel-view-model.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PaymentChannelOrchestratorService } from '../payment-channel-orchestrator/payment-channel-orchestrator.service';
import { PaymentChannelUtilService } from '../payment-channel-util/payment-channel-util.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { PaymentChannelStoreService } from '../payment-channel-store/payment-channel-store.service';
import { signal } from '@angular/core';

let mockWallet: any;

// Mock classes
class MockWalletManagerService {
     getSelectedWallet = jasmine.createSpy();
}

class MockDownloadUtilService {
     downloadSignTxJson = jasmine.createSpy();
     downloadTxResultSignal = jasmine.createSpy();
     downloadTxResult = jasmine.createSpy();
     downloadTxSignal = jasmine.createSpy();
}

class MockXrplTransactionService {
     signTransaction = jasmine.createSpy();
     submitAndWaitTransaction = jasmine.createSpy();
     submitTransaction = jasmine.createSpy();
     simulateTransaction = jasmine.createSpy();
     waitForFinalOutcome = jasmine.createSpy();
}

class MockPaymentChannelOrchestratorService {
     executeCreatePaymentChannel = jasmine.createSpy();
     executeFundPaymentChannel = jasmine.createSpy();
     executeClaimPaymentChannel = jasmine.createSpy();
     executeRenewPaymentChannel = jasmine.createSpy();
     executeClosePaymentChannel = jasmine.createSpy();
}

class MockPaymentChannelUtilService {
     formatChannelItem = jasmine.createSpy().and.callFake((ch, arrow, suffix) => ({
          id: ch.id,
          display: `${ch.totalAmount} ${arrow} ${ch.remaining}`,
          secondary: suffix,
     }));
     existingChannelMap = jasmine.createSpy().and.returnValue(new Map());
     checkChannelExpired = jasmine.createSpy();
}

class MockTransactionUiService {
     currentStep = signal('idle');
     stepMessage = jasmine.createSpy().and.returnValue('Processing...');
     explorerUrl = jasmine.createSpy().and.returnValue('https://explorer.xrpl.org/');
}

class MockPaymentChannelStoreService {
     channelIDField = jasmine.createSpy().and.returnValue('');
     isCreatorMode = jasmine.createSpy().and.returnValue(false);
     existingPaymentChannels = jasmine.createSpy().and.returnValue([]);
     receivablePaymentChannels = jasmine.createSpy().and.returnValue([]);
     closablePaymentChannels = jasmine.createSpy().and.returnValue([]);
     setField = jasmine.createSpy();
}

class MockXrplDateService {
     convertXRPLTime = jasmine.createSpy();
     fromRippleTime = jasmine.createSpy();
     toRippleTime = jasmine.createSpy();
}

describe('PaymentChannelViewModelService', () => {
     let service: PaymentChannelViewModelService;
     let walletManagerService: MockWalletManagerService;
     let paymentChannelStoreService: MockPaymentChannelStoreService;
     let paymentChannelUtilService: MockPaymentChannelUtilService;
     let mockWallet: any;

     beforeEach(() => {
          walletManagerService = new MockWalletManagerService();
          paymentChannelStoreService = new MockPaymentChannelStoreService();
          paymentChannelUtilService = new MockPaymentChannelUtilService();

          mockWallet = {
               address: 'rTestAddress1234567890',
               name: 'Test Wallet',
               classicAddress: 'rTestAddress1234567890',
          };

          walletManagerService.getSelectedWallet.and.returnValue(mockWallet);

          TestBed.configureTestingModule({
               providers: [
                    PaymentChannelViewModelService,
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: DownloadUtilService, useValue: new MockDownloadUtilService() },
                    { provide: XrplTransactionService, useValue: new MockXrplTransactionService() },
                    { provide: PaymentChannelOrchestratorService, useValue: new MockPaymentChannelOrchestratorService() },
                    { provide: PaymentChannelUtilService, useValue: paymentChannelUtilService },
                    { provide: TransactionUiService, useValue: new MockTransactionUiService() },
                    { provide: PaymentChannelStoreService, useValue: paymentChannelStoreService },
                    { provide: XrplDateService, useValue: new MockXrplDateService() },
               ],
          });

          service = TestBed.inject(PaymentChannelViewModelService);
     });

     describe('activeTab', () => {
          it('should default to createPaymentChannel', () => {
               expect(service.activeTab()).toBe('createPaymentChannel');
          });
     });

     describe('infoData claim tab', () => {
          it('should return info for claim tab as creator mode', () => {
               service.activeTab.set('claimPaymentChannel');
               paymentChannelStoreService.isCreatorMode.and.returnValue(true);
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1' }]);

               const info = service.infoData();
               expect(info?.headerMessage).toContain('for which you can generate claim signatures');
          });

          it('should return info for claim tab as non-creator mode', () => {
               service.activeTab.set('claimPaymentChannel');
               paymentChannelStoreService.isCreatorMode.and.returnValue(false);
               paymentChannelStoreService.receivablePaymentChannels.and.returnValue([{ id: 'ch1' }]);

               const info = service.infoData();
               expect(info?.headerMessage).toContain('with claimable funds');
          });

          it('should return info for fund tab', () => {
               service.activeTab.set('fundPaymentChannel');
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1' }]);

               const info = service.infoData();
               expect(info?.headerMessage).toContain('available for funding');
          });

          it('should return info for renew tab', () => {
               service.activeTab.set('renewPaymentChannel');
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1' }]);

               const info = service.infoData();
               expect(info?.headerMessage).toContain('that can be renewed');
          });

          it('should return info for close tab', () => {
               service.activeTab.set('closePaymentChannel');
               paymentChannelStoreService.closablePaymentChannels.and.returnValue([{ id: 'ch1' }]);

               const info = service.infoData();
               expect(info?.headerMessage).toContain('that can be closed');
          });

          it('should handle empty channels for claim tab', () => {
               service.activeTab.set('claimPaymentChannel');
               paymentChannelStoreService.isCreatorMode.and.returnValue(true);
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([]);

               const info = service.infoData();
               expect(info?.headerMessage).toContain('has no payment channels to generate signatures for');
          });
     });

     describe('selectedChannel', () => {
          it('should return null when no channel ID', () => {
               paymentChannelStoreService.channelIDField.and.returnValue('');
               expect(service.selectedChannel()).toBeNull();
          });

          it('should return channel for claim tab', () => {
               service.activeTab.set('claimPaymentChannel');
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');
               paymentChannelStoreService.receivablePaymentChannels.and.returnValue([{ id: 'ch1', isOwner: false }]);

               expect(service.selectedChannel()).toBeTruthy();
          });

          it('should return channel for fund tab', () => {
               service.activeTab.set('fundPaymentChannel');
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1', isOwner: true }]);

               expect(service.selectedChannel()).toBeTruthy();
          });
     });

     describe('selectedIsOwner', () => {
          it('should return false when no channel selected', () => {
               paymentChannelStoreService.channelIDField.and.returnValue('');
               expect(service.selectedIsOwner()).toBe(false);
          });

          it('should return true when channel is owned by user', () => {
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1', isOwner: true }]);
               service.activeTab.set('fundPaymentChannel');

               expect(service.selectedIsOwner()).toBe(true);
          });
     });

     describe('selectedChannelForClaim', () => {
          it('should return null when no channel ID', () => {
               paymentChannelStoreService.channelIDField.and.returnValue('');
               expect(service.selectedChannelForClaim()).toBeNull();
          });

          it('should return channel when found', () => {
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');
               paymentChannelStoreService.receivablePaymentChannels.and.returnValue([{ id: 'ch1' }]);

               expect(service.selectedChannelForClaim()).toBeTruthy();
          });
     });

     describe('isCurrentWalletDestination', () => {
          it('should return true when sender is not current wallet', () => {
               paymentChannelStoreService.receivablePaymentChannels.and.returnValue([{ id: 'ch1', sender: 'rOtherAddress' }]);
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');

               expect(service.isCurrentWalletDestination()).toBe(true);
          });
     });

     describe('isCurrentWalletSource', () => {
          it('should return true when destination is not current wallet', () => {
               // Need to set up the selected channel properly
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([
                    {
                         id: 'ch1',
                         destination: 'rOtherAddress',
                         isOwner: true,
                    },
               ]);
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');
               service.activeTab.set('renewPaymentChannel'); // renew tab uses existingPaymentChannels

               // Also need to mock the selectedChannelForRenewOrClose computed
               // The computed uses existingChannelMap
               const mockMap = new Map();
               mockMap.set('ch1', { destination: 'rOtherAddress' });
               paymentChannelUtilService.existingChannelMap.and.returnValue(mockMap);

               expect(service.isCurrentWalletSource()).toBe(true);
          });

          it('should return false when destination is current wallet', () => {
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([
                    {
                         id: 'ch1',
                         destination: mockWallet.classicAddress,
                         isOwner: true,
                    },
               ]);
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');
               service.activeTab.set('renewPaymentChannel');

               const mockMap = new Map();
               mockMap.set('ch1', { destination: mockWallet.classicAddress });
               paymentChannelUtilService.existingChannelMap.and.returnValue(mockMap);

               expect(service.isCurrentWalletSource()).toBe(false);
          });
     });

     describe('hasClaimableChannels', () => {
          it('should return true when receivable channels exist', () => {
               paymentChannelStoreService.receivablePaymentChannels.and.returnValue([{ id: 'ch1' }]);
               expect(service.hasClaimableChannels()).toBe(true);
          });

          it('should return false when no receivable channels', () => {
               paymentChannelStoreService.receivablePaymentChannels.and.returnValue([]);
               expect(service.hasClaimableChannels()).toBe(false);
          });
     });

     describe('hasRenewableChannels', () => {
          it('should return true when existing channels exist', () => {
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1' }]);
               expect(service.hasRenewableChannels()).toBe(true);
          });
     });

     describe('isValidClaimTab', () => {
          it('should return true when all conditions met', () => {
               service.activeTab.set('claimPaymentChannel');
               paymentChannelStoreService.receivablePaymentChannels.and.returnValue([{ id: 'ch1', sender: 'rOther' }]);
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');

               expect(service.isValidClaimTab()).toBe(true);
          });
     });

     describe('isValidRenewTab', () => {
          it('should return true when all conditions met', () => {
               service.activeTab.set('renewPaymentChannel');
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([
                    {
                         id: 'ch1',
                         destination: 'rOtherAddress',
                         isOwner: true,
                    },
               ]);
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');

               const mockMap = new Map();
               mockMap.set('ch1', { destination: 'rOtherAddress' });
               paymentChannelUtilService.existingChannelMap.and.returnValue(mockMap);

               expect(service.isValidRenewTab()).toBe(true);
          });

          it('should return false when no renewable channels', () => {
               service.activeTab.set('renewPaymentChannel');
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([]);
               expect(service.isValidRenewTab()).toBe(false);
          });

          it('should return false when no channel selected', () => {
               service.activeTab.set('renewPaymentChannel');
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1' }]);
               paymentChannelStoreService.channelIDField.and.returnValue('');
               expect(service.isValidRenewTab()).toBe(false);
          });
     });

     describe('channelItems', () => {
          it('should return formatted items for claim tab as creator', () => {
               service.activeTab.set('claimPaymentChannel');
               paymentChannelStoreService.isCreatorMode.and.returnValue(true);
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1', totalAmount: '1000 XRP', remaining: '500 XRP' }]);

               const items = service.channelItems();
               expect(items.length).toBe(1);
               expect(paymentChannelUtilService.formatChannelItem).toHaveBeenCalled();
          });

          it('should return formatted items for claim tab as non-creator', () => {
               service.activeTab.set('claimPaymentChannel');
               paymentChannelStoreService.isCreatorMode.and.returnValue(false);
               paymentChannelStoreService.receivablePaymentChannels.and.returnValue([{ id: 'ch1', sender: 'rSender' }]);

               const items = service.channelItems();
               expect(items.length).toBe(1);
          });

          it('should return formatted items for fund tab', () => {
               service.activeTab.set('fundPaymentChannel');
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1' }]);

               const items = service.channelItems();
               expect(items.length).toBe(1);
          });

          it('should return empty array for create tab', () => {
               service.activeTab.set('createPaymentChannel');
               const items = service.channelItems();
               expect(items).toEqual([]);
          });
     });

     describe('expired computed signals', () => {
          it('should return true when selected channel is expired', () => {
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1', isExpired: true }]);
               service.activeTab.set('fundPaymentChannel');

               expect(service.selectedIsExpired()).toBe(true);
               expect(service.selectedFundIsExpired()).toBe(true);
          });
     });

     describe('selectedChannelItem', () => {
          it('should return null when no channel ID', () => {
               paymentChannelStoreService.channelIDField.and.returnValue('');
               expect(service.selectedChannelItem()).toBeNull();
          });

          it('should return channel item when found', () => {
               service.activeTab.set('fundPaymentChannel');
               paymentChannelStoreService.channelIDField.and.returnValue('ch1');
               paymentChannelStoreService.existingPaymentChannels.and.returnValue([{ id: 'ch1' }]);

               const item = service.selectedChannelItem();
               expect(item).toBeTruthy();
          });
     });
});
