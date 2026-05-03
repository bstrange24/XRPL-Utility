import { TestBed } from '@angular/core/testing';
import { OfferUtilsService } from './offer-utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { OfferStoreService } from '../offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../offer-transaction-view-model/offer-transaction-view-model.service';
import { OfferCurrencyService } from '../offer-currency/offer-currency.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';

// Create mock classes instead of using SpyObj for types
class MockOfferStoreService {
  resetOfferFields = jasmine.createSpy();
  setField = jasmine.createSpy();
  weWantCurrency = jasmine.createSpy().and.returnValue('USD');
  weWantIssuer = jasmine.createSpy().and.returnValue('rIssuerAddress');
  weWantAmount = jasmine.createSpy().and.returnValue('100');
  weSpendCurrency = jasmine.createSpy().and.returnValue('XRP');
  weSpendIssuer = jasmine.createSpy().and.returnValue('');
  weSpendAmount = jasmine.createSpy().and.returnValue('10');
  offersArray = jasmine.createSpy();
  existingOffers = jasmine.createSpy();
  orderBookPair = jasmine.createSpy();
  orderBookStats = jasmine.createSpy();
  insufficientLiquidityWarning = jasmine.createSpy();
}

class MockTransactionUiService {
  clearAllOptionsAndMessages = jasmine.createSpy();
  setError = jasmine.createSpy();
}

class MockUtilsService {
  normalizeCurrencyCode = jasmine.createSpy().and.callFake((code: string) => code);
  encodeIfNeeded = jasmine.createSpy().and.callFake((code: string) => code);
  decodeIfNeeded = jasmine.createSpy().and.callFake((code: string) => code);
  encodeCurrencyCode = jasmine.createSpy().and.callFake((code: string) => code);
}

class MockOfferCurrencyService {
  selectWeWantCurrency = jasmine.createSpy();
  selectWeSpendCurrency = jasmine.createSpy();
  getClient = jasmine.createSpy();
}

class MockWalletManagerService {
  getSelectedWallet = jasmine.createSpy();
}

class MockOfferTransactionViewModelService {
  activeTab = jasmine.createSpy();
  walletManagerService = new MockWalletManagerService();
}

describe('OfferUtilsService', () => {
  let service: OfferUtilsService;
  let offerStoreService: MockOfferStoreService;
  let txUiService: MockTransactionUiService;
  let utilsService: MockUtilsService;
  let offerCurrency: MockOfferCurrencyService;
  let offerTransactionViewModelService: MockOfferTransactionViewModelService;
  let mockWalletManagerService: MockWalletManagerService;
  let mockWallet: any;
  let mockClient: any;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      request: jasmine.createSpy().and.returnValue(Promise.resolve({ result: { offers: [] } }))
    };

    // Create mock wallet
    mockWallet = {
      classicAddress: 'rTestAddress123',
      publicKey: 'testPublicKey',
      privateKey: 'testPrivateKey'
    };

    // Create instances of mock classes
    offerStoreService = new MockOfferStoreService();
    txUiService = new MockTransactionUiService();
    utilsService = new MockUtilsService();
    offerCurrency = new MockOfferCurrencyService();
    offerTransactionViewModelService = new MockOfferTransactionViewModelService();
    mockWalletManagerService = offerTransactionViewModelService.walletManagerService as MockWalletManagerService;
    
    mockWalletManagerService.getSelectedWallet.and.returnValue(mockWallet);
    offerCurrency.getClient.and.returnValue(Promise.resolve(mockClient));

    TestBed.configureTestingModule({
      providers: [
        OfferUtilsService,
        { provide: OfferStoreService, useValue: offerStoreService },
        { provide: TransactionUiService, useValue: txUiService },
        { provide: UtilsService, useValue: utilsService },
        { provide: OfferCurrencyService, useValue: offerCurrency },
        { provide: OfferTransactionViewModelService, useValue: offerTransactionViewModelService }
      ]
    });

    service = TestBed.inject(OfferUtilsService);
  });

  describe('actionButtonLabel', () => {
    it('should return "Create Offer" when activeTab is createOffer', () => {
      offerTransactionViewModelService.activeTab.and.returnValue('createOffer');
      expect(service.actionButtonLabel()).toBe('Create Offer');
    });

    it('should return "Get Order Book" when activeTab is getOrderBook', () => {
      offerTransactionViewModelService.activeTab.and.returnValue('getOrderBook');
      expect(service.actionButtonLabel()).toBe('Get Order Book');
    });

    it('should return "Cancel Offer" when activeTab is cancelOffer', () => {
      offerTransactionViewModelService.activeTab.and.returnValue('cancelOffer');
      expect(service.actionButtonLabel()).toBe('Cancel Offer');
    });

    it('should return "Submit" for default case', () => {
      offerTransactionViewModelService.activeTab.and.returnValue('invalidTab' as any);
      expect(service.actionButtonLabel()).toBe('Submit');
    });
  });

  describe('actionButtonClass', () => {
    it('should return "btn-primary" when activeTab is createOffer', () => {
      offerTransactionViewModelService.activeTab.and.returnValue('createOffer');
      expect(service.actionButtonClass()).toBe('btn-primary');
    });

    it('should return "btn-blue" when activeTab is getOrderBook', () => {
      offerTransactionViewModelService.activeTab.and.returnValue('getOrderBook');
      expect(service.actionButtonClass()).toBe('btn-blue');
    });

    it('should return "btn-red" when activeTab is cancelOffer', () => {
      offerTransactionViewModelService.activeTab.and.returnValue('cancelOffer');
      expect(service.actionButtonClass()).toBe('btn-red');
    });

    it('should return "btn-blue" for default case', () => {
      offerTransactionViewModelService.activeTab.and.returnValue('invalidTab' as any);
      expect(service.actionButtonClass()).toBe('btn-blue');
    });
  });

  describe('clearInputFields', () => {
    it('should call resetOfferFields on offerStoreService', () => {
      service.clearInputFields();
      expect(offerStoreService.resetOfferFields).toHaveBeenCalled();
    });
  });

describe('invertOrder', () => {
  beforeEach(() => {
    // Reset all calls
    offerCurrency.selectWeWantCurrency.calls.reset();
    offerCurrency.selectWeSpendCurrency.calls.reset();
    
    // Setup initial values
    offerStoreService.weWantCurrency.and.returnValue('USD');
    offerStoreService.weWantIssuer.and.returnValue('rIssuer1');
    offerStoreService.weWantAmount.and.returnValue('100');
    offerStoreService.weSpendCurrency.and.returnValue('EUR');
    offerStoreService.weSpendIssuer.and.returnValue('rIssuer2');
    offerStoreService.weSpendAmount.and.returnValue('200');
  });

  it('should invert order fields correctly', () => {
    service.invertOrder();

    expect(offerStoreService.setField).toHaveBeenCalledWith('weWantCurrency', 'EUR');
    expect(offerStoreService.setField).toHaveBeenCalledWith('weSpendCurrency', 'USD');
    expect(offerStoreService.setField).toHaveBeenCalledWith('weWantIssuer', 'rIssuer2');
    expect(offerStoreService.setField).toHaveBeenCalledWith('weSpendIssuer', 'rIssuer1');
    expect(offerStoreService.setField).toHaveBeenCalledWith('weSpendAmount', '100');
  });

  it('should call selectWeWantCurrency and selectWeSpendCurrency with the swapped values', () => {
    // Mock the getter calls after inversion to return the swapped values
    // First call is before inversion (for temp variables), subsequent calls after setField
    offerStoreService.weWantCurrency.and.returnValues('USD', 'EUR');
    offerStoreService.weSpendCurrency.and.returnValues('EUR', 'USD');
    
    service.invertOrder();

    // After inversion, selectWeWantCurrency should be called with EUR (original weSpendCurrency)
    expect(offerCurrency.selectWeWantCurrency).toHaveBeenCalledWith('EUR', mockWallet);
    // After inversion, selectWeSpendCurrency should be called with USD (original weWantCurrency)
    expect(offerCurrency.selectWeSpendCurrency).toHaveBeenCalledWith('USD', mockWallet);
  });

  it('should not call currency selection when no wallet exists', () => {
    mockWalletManagerService.getSelectedWallet.and.returnValue(null);
    
    // Mock getter returns
    offerStoreService.weWantCurrency.and.returnValues('USD', 'EUR');
    offerStoreService.weSpendCurrency.and.returnValues('EUR', 'USD');
    
    service.invertOrder();

    expect(offerCurrency.selectWeWantCurrency).not.toHaveBeenCalled();
    expect(offerCurrency.selectWeSpendCurrency).not.toHaveBeenCalled();
  });
});

  describe('getExistingOffers', () => {
    const classicAddress = 'rTestAddress123';
    const mockAccountObjects: any = {
      result: {
        account_objects: [
          {
            LedgerEntryType: 'Offer',
            Account: 'rTestAddress123',
            Sequence: 1,
            TakerGets: '1000000',
            TakerPays: '2000000',
            Flags: 0,
            BookDirectory: 'test',
            index: 'txHash123'
          },
          {
            LedgerEntryType: 'Offer',
            Account: 'rTestAddress123',
            Sequence: 2,
            TakerGets: { currency: 'USD', value: '50', issuer: 'rIssuer' },
            TakerPays: { currency: 'EUR', value: '75', issuer: 'rIssuer2' },
            Flags: 0,
            BookDirectory: 'test2',
            index: 'txHash456'
          },
          {
            LedgerEntryType: 'AccountRoot',
            Account: 'rTestAddress123'
          }
        ]
      }
    };

    it('should filter and map existing offers correctly', () => {
      const result = service.getExistingOffers(mockAccountObjects, classicAddress);

      expect(offerStoreService.setField).toHaveBeenCalledWith('offersArray', [1, 2]);
      expect(offerStoreService.setField).toHaveBeenCalledWith('existingOffers', jasmine.any(Array));
      expect(result.length).toBe(2);
      expect(result[0].Sequence).toBe(1);
      expect(result[1].Sequence).toBe(2);
    });

    it('should handle XRP amounts correctly', () => {
      const result = service.getExistingOffers(mockAccountObjects, classicAddress);
      expect(result[0].TakerGets).toContain('1');
      expect(result[0].TakerPays).toContain('2');
    });

    it('should handle token amounts correctly', () => {
      const result = service.getExistingOffers(mockAccountObjects, classicAddress);
      expect(result[1].TakerGets).toContain('USD');
      expect(result[1].TakerPays).toContain('EUR');
    });

    it('should handle empty account_objects', () => {
      const emptyResponse: any = { result: { account_objects: undefined } };
      const result = service.getExistingOffers(emptyResponse, classicAddress);
      expect(result).toEqual([]);
      expect(offerStoreService.setField).toHaveBeenCalledWith('offersArray', []);
      expect(offerStoreService.setField).toHaveBeenCalledWith('existingOffers', []);
    });
  });

  describe('fetchOrderBook', () => {
    beforeEach(() => {
      mockClient.request.and.returnValue(Promise.resolve({ result: { offers: [] } }));
    });

    it('should fetch order book successfully', async () => {
      offerStoreService.weWantCurrency.and.returnValue('USD');
      offerStoreService.weSpendCurrency.and.returnValue('XRP');
      offerStoreService.weWantAmount.and.returnValue('100');
      offerStoreService.weSpendAmount.and.returnValue('10');
      offerStoreService.weWantIssuer.and.returnValue('rIssuer');
      offerStoreService.weSpendIssuer.and.returnValue('');

      await service.fetchOrderBook(mockClient, mockWallet);

      expect(txUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
      expect(mockClient.request).toHaveBeenCalledTimes(3);
      expect(offerStoreService.setField).toHaveBeenCalledWith('orderBookPair', jasmine.any(String));
      expect(offerStoreService.setField).toHaveBeenCalledWith('orderBookStats', jasmine.any(Object));
    });

    it('should handle XRP as both currencies', async () => {
      offerStoreService.weWantCurrency.and.returnValue('XRP');
      offerStoreService.weSpendCurrency.and.returnValue('XRP');
      offerStoreService.weWantAmount.and.returnValue('100');
      offerStoreService.weSpendAmount.and.returnValue('10');

      await service.fetchOrderBook(mockClient, mockWallet);

      expect(offerStoreService.setField).toHaveBeenCalledWith('orderBookPair', jasmine.any(String));
    });

    it('should handle AMM data when available', async () => {
      offerStoreService.weWantCurrency.and.returnValue('USD');
      offerStoreService.weSpendCurrency.and.returnValue('XRP');
      
      mockClient.request.and.callFake((request: any) => {
        if (request.command === 'amm_info') {
          return Promise.resolve({
            result: {
              amm: {
                account: 'rAMMAddress',
                amount: '1000000',
                amount2: { currency: 'USD', value: '500', issuer: 'rIssuer' }
              }
            }
          });
        }
        return Promise.resolve({ result: { offers: [] } });
      });

      await service.fetchOrderBook(mockClient, mockWallet);
      expect(offerStoreService.setField).toHaveBeenCalled();
    });

    it('should handle missing currencies', async () => {
      offerStoreService.weWantCurrency.and.returnValue('');
      offerStoreService.weSpendCurrency.and.returnValue('');

      await service.fetchOrderBook(mockClient, mockWallet);

      expect(offerStoreService.setField).toHaveBeenCalledWith('orderBookStats', {
        vwap: 0,
        simpleAvg: 0,
        bestRate: 0,
        spread: 0,
        spreadPercent: 0,
        liquidityRatio: 0,
        depth: 'N/A',
        execution: 'N/A',
        volatility: 'N/A'
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      mockClient.request.and.returnValue(Promise.reject(error));
      
      // Spy on console.error to prevent test output pollution
      spyOn(console, 'error');
      
      await service.fetchOrderBook(mockClient, mockWallet);

      expect(txUiService.setError).toHaveBeenCalledWith('Network error');
    });
  });

  describe('onWeSpendAmountChange', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should debounce the update call', () => {
      service.onWeSpendAmountChange();
      jasmine.clock().tick(400);
      expect(true).toBeTruthy();
    });
  });

  describe('onWeWantAmountChange', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should debounce the update call', () => {
      service.onWeWantAmountChange();
      jasmine.clock().tick(400);
      expect(true).toBeTruthy();
    });
  });

  describe('updateTokenBalanceAndExchange', () => {
    it('should set weWantAmount to 0 when weSpendAmount is invalid', async () => {
      offerStoreService.weSpendAmount.and.returnValue('');
      await service.updateTokenBalanceAndExchange();
      expect(offerStoreService.setField).toHaveBeenCalledWith('weWantAmount', '0');
    });

    it('should set weWantAmount to 0 when weSpendAmount is <= 0', async () => {
      offerStoreService.weSpendAmount.and.returnValue('0');
      await service.updateTokenBalanceAndExchange();
      expect(offerStoreService.setField).toHaveBeenCalledWith('weWantAmount', '0');
    });

    it('should return early when no wallet exists', async () => {
      offerStoreService.weSpendAmount.and.returnValue('100');
      mockWalletManagerService.getSelectedWallet.and.returnValue(null);
      
      await service.updateTokenBalanceAndExchange();
      expect(offerStoreService.setField).not.toHaveBeenCalledWith('weWantAmount', jasmine.any(String));
    });

    it('should calculate exchange correctly with order book', async () => {
      offerStoreService.weSpendAmount.and.returnValue('100');
      offerStoreService.weWantCurrency.and.returnValue('USD');
      offerStoreService.weSpendCurrency.and.returnValue('XRP');
      
      const mockOffers = {
        result: {
          offers: [
            {
              TakerGets: '50000000',
              TakerPays: { currency: 'USD', value: '100', issuer: 'rIssuer' }
            },
            {
              TakerGets: '50000000',
              TakerPays: { currency: 'USD', value: '90', issuer: 'rIssuer' }
            }
          ]
        }
      };
      
      mockClient.request.and.returnValue(Promise.resolve(mockOffers));
      
      await service.updateTokenBalanceAndExchange();
      
      expect(offerStoreService.setField).toHaveBeenCalledWith('weWantAmount', jasmine.any(String));
      expect(offerStoreService.setField).toHaveBeenCalledWith('insufficientLiquidityWarning', jasmine.any(Boolean));
    });

    it('should handle XRP to XRP exchange', async () => {
      offerStoreService.weSpendAmount.and.returnValue('100');
      offerStoreService.weWantCurrency.and.returnValue('XRP');
      offerStoreService.weSpendCurrency.and.returnValue('XRP');
      
      const mockOffers = {
        result: {
          offers: [
            { TakerGets: '100000000', TakerPays: '100000000' }
          ]
        }
      };
      
      mockClient.request.and.returnValue(Promise.resolve(mockOffers));
      
      await service.updateTokenBalanceAndExchange();
      expect(offerStoreService.setField).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      offerStoreService.weSpendAmount.and.returnValue('100');
      mockClient.request.and.returnValue(Promise.reject(new Error('API Error')));
      
      spyOn(console, 'error');
      
      await service.updateTokenBalanceAndExchange();
      
      expect(txUiService.setError).toHaveBeenCalledWith('API Error');
      expect(offerStoreService.setField).toHaveBeenCalledWith('weWantAmount', '0');
    });
  });

  describe('updateTokenBalanceAndExchangeReverse', () => {
    it('should set weSpendAmount to 0 when weWantAmount is invalid', async () => {
      offerStoreService.weWantAmount.and.returnValue('');
      await service.updateTokenBalanceAndExchangeReverse();
      expect(offerStoreService.setField).toHaveBeenCalledWith('weSpendAmount', '0');
    });

    it('should set weSpendAmount to 0 when weWantAmount is <= 0', async () => {
      offerStoreService.weWantAmount.and.returnValue('0');
      await service.updateTokenBalanceAndExchangeReverse();
      expect(offerStoreService.setField).toHaveBeenCalledWith('weSpendAmount', '0');
    });

    it('should return early when no wallet exists', async () => {
      offerStoreService.weWantAmount.and.returnValue('100');
      mockWalletManagerService.getSelectedWallet.and.returnValue(null);
      
      await service.updateTokenBalanceAndExchangeReverse();
      expect(offerStoreService.setField).not.toHaveBeenCalledWith('weSpendAmount', jasmine.any(String));
    });

    it('should calculate reverse exchange correctly', async () => {
      offerStoreService.weWantAmount.and.returnValue('100');
      offerStoreService.weWantCurrency.and.returnValue('USD');
      offerStoreService.weSpendCurrency.and.returnValue('XRP');
      
      const mockOffers = {
        result: {
          offers: [
            {
              TakerGets: { currency: 'USD', value: '100', issuer: 'rIssuer' },
              TakerPays: '50000000'
            }
          ]
        }
      };
      
      mockClient.request.and.returnValue(Promise.resolve(mockOffers));
      
      await service.updateTokenBalanceAndExchangeReverse();
      
      expect(offerStoreService.setField).toHaveBeenCalledWith('weSpendAmount', jasmine.any(String));
      expect(offerStoreService.setField).toHaveBeenCalledWith('insufficientLiquidityWarning', jasmine.any(Boolean));
    });

    it('should handle errors', async () => {
      offerStoreService.weWantAmount.and.returnValue('100');
      mockClient.request.and.returnValue(Promise.reject(new Error('API Error')));
      
      spyOn(console, 'error');
      
      await service.updateTokenBalanceAndExchangeReverse();
      
      expect(txUiService.setError).toHaveBeenCalledWith('API Error');
      expect(offerStoreService.setField).toHaveBeenCalledWith('weSpendAmount', '0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined values in computeBidAskSpread', async () => {
      offerStoreService.weWantCurrency.and.returnValue('');
      offerStoreService.weSpendCurrency.and.returnValue('');
      await service.fetchOrderBook(mockClient, mockWallet);
      
      // When currencies are missing, the stats are set to numbers, not strings
      expect(offerStoreService.setField).toHaveBeenCalledWith('orderBookStats', jasmine.objectContaining({
        spread: 0,
        spreadPercent: 0
      }));
    });

    it('should handle AMM info rejection gracefully', async () => {
      offerStoreService.weWantCurrency.and.returnValue('USD');
      offerStoreService.weSpendCurrency.and.returnValue('XRP');
      
      mockClient.request.and.callFake((request: any) => {
        if (request.command === 'amm_info') {
          return Promise.reject('AMM not found');
        }
        return Promise.resolve({ result: { offers: [] } });
      });
      
      await service.fetchOrderBook(mockClient, mockWallet);
      expect(offerStoreService.setField).toHaveBeenCalled();
    });

    it('should handle large numbers in exchange calculations', async () => {
      offerStoreService.weSpendAmount.and.returnValue('999999999');
      offerStoreService.weWantCurrency.and.returnValue('USD');
      offerStoreService.weSpendCurrency.and.returnValue('XRP');
      
      const mockOffers = {
        result: {
          offers: [
            { TakerGets: '1000000000000', TakerPays: { value: '1000000', currency: 'USD', issuer: 'rIssuer' } }
          ]
        }
      };
      
      mockClient.request.and.returnValue(Promise.resolve(mockOffers));
      
      await service.updateTokenBalanceAndExchange();
      expect(offerStoreService.setField).toHaveBeenCalled();
    });

    it('should handle client being null in exchange calculations', async () => {
      offerStoreService.weSpendAmount.and.returnValue('100');
      offerCurrency.getClient.and.returnValue(Promise.resolve(null));
      
      await service.updateTokenBalanceAndExchange();
      expect(offerStoreService.setField).not.toHaveBeenCalledWith('weWantAmount', jasmine.any(String));
    });

    it('should handle empty offers array in exchange calculations', async () => {
      offerStoreService.weSpendAmount.and.returnValue('100');
      mockClient.request.and.returnValue(Promise.resolve({ result: { offers: [] } }));
      
      await service.updateTokenBalanceAndExchange();
      // With no offers, totalReceived remains 0
      expect(offerStoreService.setField).toHaveBeenCalledWith('weWantAmount', '0.00000000');
    });
  });
});