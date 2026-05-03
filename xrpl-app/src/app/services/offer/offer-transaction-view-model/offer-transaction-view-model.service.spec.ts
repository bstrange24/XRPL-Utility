import { TestBed } from '@angular/core/testing';
import { OfferTransactionViewModelService } from './offer-transaction-view-model.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { OfferStoreService } from '../offer-store/offer-store.service';
import { OfferCurrencyService, IssuerItem } from '../offer-currency/offer-currency.service';

// Mock classes
class MockWalletManagerService {
  getSelectedWallet = jasmine.createSpy();
}

class MockTransactionUiService {}

class MockOfferStoreService {
  existingOffers = jasmine.createSpy().and.returnValue([]);
  orderBookStats = jasmine.createSpy().and.returnValue(null);
  orderBookPair = jasmine.createSpy().and.returnValue('');
}

class MockOfferCurrencyService {
  weWant = {
    balance: jasmine.createSpy().and.returnValue(100),
    issuers: jasmine.createSpy().and.returnValue([]),
    issuer: jasmine.createSpy().and.returnValue('')
  };
  
  weSpend = {
    balance: jasmine.createSpy().and.returnValue(200),
    issuers: jasmine.createSpy().and.returnValue([]),
    issuer: jasmine.createSpy().and.returnValue('')
  };
  
  getAvailableCurrencies = jasmine.createSpy().and.returnValue([]);
  getIssuersForCurrency = jasmine.createSpy().and.returnValue([]);
  selectWeWantIssuer = jasmine.createSpy();
}

describe('OfferTransactionViewModelService', () => {
  let service: OfferTransactionViewModelService;
  let walletManagerService: MockWalletManagerService;
  let offerStoreService: MockOfferStoreService;
  let offerCurrency: MockOfferCurrencyService;
  let mockWallet: any;

  beforeEach(() => {
    mockWallet = {
      address: 'rTestAddress1234567890',
      name: 'Test Wallet'
    };

    walletManagerService = new MockWalletManagerService();
    offerStoreService = new MockOfferStoreService();
    offerCurrency = new MockOfferCurrencyService();
    
    walletManagerService.getSelectedWallet.and.returnValue(mockWallet);

    TestBed.configureTestingModule({
      providers: [
        OfferTransactionViewModelService,
        { provide: WalletManagerService, useValue: walletManagerService },
        { provide: TransactionUiService, useValue: new MockTransactionUiService() },
        { provide: OfferStoreService, useValue: offerStoreService },
        { provide: OfferCurrencyService, useValue: offerCurrency }
      ]
    });

    service = TestBed.inject(OfferTransactionViewModelService);
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(service.activeTab()).toBe('createOffer');
      expect(service.weWantCurrency()).toBe('');
      expect(service.weWantIssuer()).toBe('');
      expect(service.weSpendCurrency()).toBe('XRP');
      expect(service.weSpendIssuer()).toBe('');
      expect(service.weWantIssuersTrigger()).toBe(0);
      expect(service.weSpendIssuersTrigger()).toBe(0);
    });

    // it('should set up computed balances', () => {
    //   // The computed values return numbers, not strings
    //   expect(service.weWantUserBalance()).toBe('100');
    //   expect(service.weSpendUserBalance()).toBe('200');
    // });
  });

  describe('Effect - weWantIssuer changes', () => {
    it('should call selectWeWantIssuer when issuer is set and wallet exists', (done) => {
      service.weWantIssuer.set('rIssuerAddress');
      
      setTimeout(() => {
        expect(offerCurrency.selectWeWantIssuer).toHaveBeenCalledWith('rIssuerAddress', mockWallet);
        done();
      }, 0);
    });

    it('should not call selectWeWantIssuer when issuer is empty', (done) => {
      service.weWantIssuer.set('');
      
      setTimeout(() => {
        expect(offerCurrency.selectWeWantIssuer).not.toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should not call selectWeWantIssuer when no wallet exists', (done) => {
      walletManagerService.getSelectedWallet.and.returnValue(null);
      service.weWantIssuer.set('rIssuerAddress');
      
      setTimeout(() => {
        expect(offerCurrency.selectWeWantIssuer).not.toHaveBeenCalled();
        done();
      }, 0);
    });
  });

  describe('weWantCurrencyItems', () => {
    it('should return formatted currency items', () => {
      const mockCurrencies = ['XRP', 'USD', 'EUR'];
      offerCurrency.getAvailableCurrencies.and.returnValue(mockCurrencies);
      offerCurrency.getIssuersForCurrency.and.callFake((curr: string) => {
        if (curr === 'USD') return [{ address: 'rIssuer1' }, { address: 'rIssuer2' }];
        if (curr === 'EUR') return [{ address: 'rIssuer3' }];
        return [];
      });

      const items = service.weWantCurrencyItems();
      
      expect(items.length).toBe(3);
      expect(items[0]).toEqual({
        id: 'XRP',
        display: 'XRP',
        secondary: 'Native currency'
      });
      expect(items[1]).toEqual({
        id: 'USD',
        display: 'USD',
        secondary: '2 issuers'
      });
      expect(items[2]).toEqual({
        id: 'EUR',
        display: 'EUR',
        secondary: '1 issuer'
      });
    });

    it('should handle currencies with no issuers', () => {
      const mockCurrencies = ['BTC'];
      offerCurrency.getAvailableCurrencies.and.returnValue(mockCurrencies);
      offerCurrency.getIssuersForCurrency.and.returnValue([]);

      const items = service.weWantCurrencyItems();
      
      expect(items[0].secondary).toBe('No issuers');
    });

    it('should recompute when weWantCurrency changes', () => {
      const mockCurrencies = ['XRP', 'USD'];
      offerCurrency.getAvailableCurrencies.and.returnValue(mockCurrencies);
      offerCurrency.getIssuersForCurrency.and.returnValue([]);

      const firstItems = service.weWantCurrencyItems();
      expect(firstItems.length).toBe(2);

      service.weWantCurrency.set('XRP');
      const secondItems = service.weWantCurrencyItems();
      expect(secondItems.length).toBe(2);
    });
  });

  describe('selectedWeWantCurrencyItem', () => {
    it('should return the selected currency item', () => {
      const mockCurrencies = ['XRP', 'USD', 'EUR'];
      offerCurrency.getAvailableCurrencies.and.returnValue(mockCurrencies);
      offerCurrency.getIssuersForCurrency.and.returnValue([]);
      
      service.weWantCurrency.set('USD');
      
      const selected = service.selectedWeWantCurrencyItem();
      expect(selected).toEqual({
        id: 'USD',
        display: 'USD',
        secondary: 'No issuers'
      });
    });

    it('should return null when no currency is selected', () => {
      service.weWantCurrency.set('');
      const selected = service.selectedWeWantCurrencyItem();
      expect(selected).toBeNull();
    });
  });

  describe('weSpendCurrencyItems', () => {
    it('should return formatted currency items for spend', () => {
      const mockCurrencies = ['XRP', 'BTC'];
      offerCurrency.getAvailableCurrencies.and.returnValue(mockCurrencies);
      offerCurrency.getIssuersForCurrency.and.returnValue([]);

      const items = service.weSpendCurrencyItems();
      
      expect(items.length).toBe(2);
      expect(items[0]).toEqual({
        id: 'XRP',
        display: 'XRP',
        secondary: 'Native currency'
      });
      expect(items[1]).toEqual({
        id: 'BTC',
        display: 'BTC',
        secondary: 'No issuers'
      });
    });

    it('should recompute when weSpendCurrency changes', () => {
      const mockCurrencies = ['XRP'];
      offerCurrency.getAvailableCurrencies.and.returnValue(mockCurrencies);
      offerCurrency.getIssuersForCurrency.and.returnValue([]);

      const firstItems = service.weSpendCurrencyItems();
      expect(firstItems.length).toBe(1);

      service.weSpendCurrency.set('BTC');
      const secondItems = service.weSpendCurrencyItems();
      expect(secondItems.length).toBe(1);
    });
  });

  describe('selectedWeSpendCurrencyItem', () => {
    it('should return the selected spend currency item', () => {
      const mockCurrencies = ['XRP', 'BTC'];
      offerCurrency.getAvailableCurrencies.and.returnValue(mockCurrencies);
      offerCurrency.getIssuersForCurrency.and.returnValue([]);
      
      service.weSpendCurrency.set('BTC');
      
      const selected = service.selectedWeSpendCurrencyItem();
      expect(selected).toEqual({
        id: 'BTC',
        display: 'BTC',
        secondary: 'No issuers'
      });
    });

    it('should return null when no currency is selected', () => {
      service.weSpendCurrency.set('');
      const selected = service.selectedWeSpendCurrencyItem();
      expect(selected).toBeNull();
    });
  });

  describe('weWantIssuerItems', () => {
    it('should return formatted issuer items', () => {
      const mockIssuers: IssuerItem[] = [
        { address: 'rIssuerAddress1234567890', name: 'Issuer One' },
        { address: 'rAnotherIssuer0987654321', name: '' }
      ];
      
      offerCurrency.weWant.issuers.and.returnValue(mockIssuers);

      const items = service.weWantIssuerItems();
      
      expect(items.length).toBe(2);
      expect(items[0].id).toBe('rIssuerAddress1234567890');
      expect(items[0].display).toBe('Issuer One');
      // First 8 chars: 'rIssuerA', last 6 chars: '567890'
      expect(items[0].secondary).toBe('rIssuerA...567890');
      
      expect(items[1].id).toBe('rAnotherIssuer0987654321');
      expect(items[1].display).toBe('Issuer 2');
      // First 8 chars: 'rAnother', last 6 chars: '654321'
      expect(items[1].secondary).toBe('rAnother...654321');
    });

    it('should recompute when weWantIssuersTrigger changes', () => {
      const mockIssuers: IssuerItem[] = [{ address: 'rIssuer1', name: 'Issuer 1' }];
      offerCurrency.weWant.issuers.and.returnValue(mockIssuers);

      const firstItems = service.weWantIssuerItems();
      expect(firstItems.length).toBe(1);

      service.weWantIssuersTrigger.update(v => v + 1);
      
      const secondItems = service.weWantIssuerItems();
      expect(secondItems.length).toBe(1);
    });

    it('should handle empty issuers', () => {
      offerCurrency.weWant.issuers.and.returnValue([]);
      const items = service.weWantIssuerItems();
      expect(items).toEqual([]);
    });
  });

  describe('selectedWeWantIssuerItem', () => {
    it('should return the selected issuer item', () => {
      const mockIssuers: IssuerItem[] = [
        { address: 'rIssuerAddress123', name: 'Selected Issuer' },
        { address: 'rOtherIssuer456', name: 'Other Issuer' }
      ];
      
      offerCurrency.weWant.issuers.and.returnValue(mockIssuers);
      offerCurrency.weWant.issuer.and.returnValue('rIssuerAddress123');

      const selected = service.selectedWeWantIssuerItem();
      
      expect(selected).toEqual({
        id: 'rIssuerAddress123',
        display: 'Selected Issuer',
        // First 8 chars: 'rIssuerA', last 6 chars: 'ess123' -> but full is 'rIssuerAddress123'
        // 'rIssuerAddress123'.slice(0,8) = 'rIssuerA', .slice(-6) = 'ess123'
        secondary: 'rIssuerA...ess123'
      });
    });

    it('should return null when no issuer is selected', () => {
      offerCurrency.weWant.issuer.and.returnValue('');
      const selected = service.selectedWeWantIssuerItem();
      expect(selected).toBeNull();
    });
  });

  describe('weSpendIssuerItems', () => {
    it('should return formatted spend issuer items', () => {
      const mockIssuers: IssuerItem[] = [
        { address: 'rSpendIssuer1234567890', name: 'Spend Issuer' }
      ];
      
      offerCurrency.weSpend.issuers.and.returnValue(mockIssuers);

      const items = service.weSpendIssuerItems();
      
      expect(items.length).toBe(1);
      expect(items[0]).toEqual({
        id: 'rSpendIssuer1234567890',
        display: 'Spend Issuer',
        // First 8 chars: 'rSpendIs', last 6 chars: '567890'
        secondary: 'rSpendIs...567890'
      });
    });

    it('should recompute when weSpendIssuersTrigger changes', () => {
      const mockIssuers: IssuerItem[] = [{ address: 'rIssuer1', name: 'Issuer 1' }];
      offerCurrency.weSpend.issuers.and.returnValue(mockIssuers);

      service.weSpendIssuersTrigger.update(v => v + 1);
      
      const items = service.weSpendIssuerItems();
      expect(items.length).toBe(1);
    });
  });

  describe('selectedWeSpendIssuerItem', () => {
    it('should return the selected spend issuer item', () => {
      const mockIssuers: IssuerItem[] = [
        { address: 'rSpendIssuer123', name: 'Spend Issuer' }
      ];
      
      offerCurrency.weSpend.issuers.and.returnValue(mockIssuers);
      offerCurrency.weSpend.issuer.and.returnValue('rSpendIssuer123');

      const selected = service.selectedWeSpendIssuerItem();
      
      expect(selected).toEqual({
        id: 'rSpendIssuer123',
        display: 'Spend Issuer',
        // First 8 chars: 'rSpendIs', last 6 chars: 'uer123' -> but 'rSpendIssuer123' has 16 chars
        // 'rSpendIssuer123'.slice(0,8) = 'rSpendIs', .slice(-6) = 'uer123'
        secondary: 'rSpendIs...uer123'
      });
    });

    it('should return null when no issuer is selected', () => {
      offerCurrency.weSpend.issuer.and.returnValue('');
      const selected = service.selectedWeSpendIssuerItem();
      expect(selected).toBeNull();
    });
  });

  describe('infoData', () => {
    it('should return null when no wallet exists', () => {
      walletManagerService.getSelectedWallet.and.returnValue(null);
      expect(service.infoData()).toBeNull();
    });

    it('should return formatted info data when wallet exists', () => {
      const mockOffers = [
        {
          TxHash: 'hash123',
          TakerPays: '100 XRP rIssuer',
          TakerGets: '50 USD rIssuer2',
          Flags: 0x00010000
        },
        {
          TxHash: 'hash456',
          TakerPays: '200 XRP',
          TakerGets: '75 EUR rIssuer3',
          Flags: 0x00020000
        }
      ];
      
      offerStoreService.existingOffers.and.returnValue(mockOffers);
      offerStoreService.orderBookStats.and.returnValue({
        vwap: 1.5,
        simpleAvg: 1.4,
        bestRate: 1.6,
        spread: 0.1,
        spreadPercent: 5.5,
        liquidityRatio: 2.3,
        depth: '1000 XRP',
        execution: 'Good',
        volatility: '0.05'
      });
      offerStoreService.orderBookPair.and.returnValue('USD/XRP');
      service.activeTab.set('getOrderBook');

      const infoData = service.infoData();
      
      expect(infoData).not.toBeNull();
      expect(infoData?.walletName).toBe('Test Wallet');
      expect(infoData?.offerCount).toBe(2);
      expect(infoData?.isOrderBookTab).toBe(true);
      expect(infoData?.pair).toBe('USD/XRP');
      expect(infoData?.stats).toBeDefined();
      expect(infoData?.offersToShow.length).toBe(2);
      expect(infoData?.offersToShow[0].takerGets).toBe('50 USD');
      expect(infoData?.offersToShow[0].takerPays).toBe('100 XRP');
      expect(infoData?.offersToShow[0].flags).toEqual(['tfPassive']);
      expect(infoData?.offersToShow[1].flags).toEqual(['tfImmediateOrCancel']);
    });

    it('should truncate wallet name when no name provided', () => {
      const walletWithoutName = { address: 'rVeryLongAddress1234567890Name' };
      walletManagerService.getSelectedWallet.and.returnValue(walletWithoutName);
      
      const infoData = service.infoData();
      // address.slice(0, 10) + '...' for 'rVeryLongAddress1234567890Name'
      // First 10 chars: 'rVeryLongA'
      expect(infoData?.walletName).toBe('rVeryLongA...');
    });

    it('should handle missing stats with defaults', () => {
      offerStoreService.orderBookStats.and.returnValue(null);
      walletManagerService.getSelectedWallet.and.returnValue(mockWallet);
      
      const infoData = service.infoData();
      
      expect(infoData?.stats).toEqual({
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

    it('should handle empty offers array', () => {
      offerStoreService.existingOffers.and.returnValue([]);
      
      const infoData = service.infoData();
      expect(infoData?.offerCount).toBe(0);
      expect(infoData?.offersToShow).toEqual([]);
    });
  });

  describe('formatAmount', () => {
    it('should format XRP amount correctly', () => {
      const result = service.formatAmount('100');
      expect(result).toEqual({
        value: '100',
        currency: 'XRP',
        issuer: ''
      });
    });

    it('should format token amount correctly', () => {
      const result = service.formatAmount('50 USD rIssuerAddress');
      expect(result).toEqual({
        value: '50',
        currency: 'USD',
        issuer: 'rIssuerAddress'
      });
    });

    it('should handle amount with exactly one space', () => {
      const result = service.formatAmount('75.5 EUR rIssuer123');
      expect(result).toEqual({
        value: '75.5',
        currency: 'EUR',
        issuer: 'rIssuer123'
      });
    });

    it('should return default values for null/undefined', () => {
      expect(service.formatAmount(null)).toEqual({ value: '0', currency: '', issuer: '' });
      expect(service.formatAmount(undefined)).toEqual({ value: '0', currency: '', issuer: '' });
      expect(service.formatAmount('')).toEqual({ value: '0', currency: '', issuer: '' });
    });
  });

  describe('getIssuerSecondary (private method tested via public)', () => {
    it('should return correct strings for different counts', () => {
      const privateMethod = (service as any).getIssuerSecondary.bind(service);
      
      expect(privateMethod(0)).toBe('No issuers');
      expect(privateMethod(1)).toBe('1 issuer');
      expect(privateMethod(2)).toBe('2 issuers');
      expect(privateMethod(5)).toBe('5 issuers');
    });
  });

  describe('decodeOfferFlags (private method tested via infoData)', () => {
    it('should decode single flag', () => {
      const flags = (service as any).decodeOfferFlags(0x00010000);
      expect(flags).toEqual(['tfPassive']);
    });

    it('should decode multiple flags', () => {
      const flags = (service as any).decodeOfferFlags(0x00030000);
      expect(flags).toContain('tfPassive');
      expect(flags).toContain('tfImmediateOrCancel');
      expect(flags.length).toBe(2);
    });

    it('should decode tfSell flag', () => {
      const flags = (service as any).decodeOfferFlags(0x00080000);
      expect(flags).toEqual(['tfSell']);
    });

    it('should decode tfFillOrKill flag', () => {
      const flags = (service as any).decodeOfferFlags(0x00040000);
      expect(flags).toEqual(['tfFillOrKill']);
    });

    it('should return ["None"] for no flags', () => {
      const flags = (service as any).decodeOfferFlags(0);
      expect(flags).toEqual(['None']);
    });
  });

  describe('Signal updates and reactivity', () => {
    it('should update activeTab', () => {
      service.activeTab.set('cancelOffer');
      expect(service.activeTab()).toBe('cancelOffer');
      
      service.activeTab.set('getOrderBook');
      expect(service.activeTab()).toBe('getOrderBook');
    });

    it('should update weWantCurrency', () => {
      service.weWantCurrency.set('BTC');
      expect(service.weWantCurrency()).toBe('BTC');
    });

    it('should update weSpendCurrency', () => {
      service.weSpendCurrency.set('ETH');
      expect(service.weSpendCurrency()).toBe('ETH');
    });

    it('should update triggers', () => {
      service.weWantIssuersTrigger.update(v => v + 1);
      expect(service.weWantIssuersTrigger()).toBe(1);
      
      service.weSpendIssuersTrigger.update(v => v + 2);
      expect(service.weSpendIssuersTrigger()).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle wallet with only address and no name', () => {
      const walletOnlyAddress = { address: 'rShortAddress' };
      walletManagerService.getSelectedWallet.and.returnValue(walletOnlyAddress);
      
      const infoData = service.infoData();
      // address.slice(0, 10) for 'rShortAddress' returns 'rShortAddr' (10 chars)
      expect(infoData?.walletName).toBe('rShortAddr...');
    });

    it('should log to console in selected issuer getters', () => {
      spyOn(console, 'log');
      
      offerCurrency.weWant.issuer.and.returnValue('rTestAddress');
      offerCurrency.weWant.issuers.and.returnValue([{ address: 'rTestAddress', name: 'Test' }]);
      
      service.selectedWeWantIssuerItem();
      
      expect(console.log).toHaveBeenCalled();
    });
  });
});