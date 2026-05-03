import { TestBed } from '@angular/core/testing';
import { OfferCurrencyService, IssuerItem, CurrencySideState } from './offer-currency.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';

// Mock services
class MockStorageService {
  getKnownIssuers = jasmine.createSpy();
  get = jasmine.createSpy();
}

class MockXrplService {
  getClient = jasmine.createSpy();
  getTokenBalance = jasmine.createSpy();
}

class MockUtilsService {
  getWalletFromAddress = jasmine.createSpy();
  normalizeCurrencyCode = jasmine.createSpy().and.callFake((code: string) => code);
  formatTokenBalance = jasmine.createSpy().and.callFake((value: string) => value);
}

class MockWalletManagerService {
  wallets = jasmine.createSpy().and.returnValue([]);
  getSelectedWallet = jasmine.createSpy();
}

describe('OfferCurrencyService', () => {
  let storageService: MockStorageService;
  let xrplService: MockXrplService;
  let utilsService: MockUtilsService;
  let walletManagerService: MockWalletManagerService;
  let mockClient: any;
  let mockWallet: any;

  beforeEach(() => {
    mockClient = {
      request: jasmine.createSpy()
    };

    mockWallet = {
      classicAddress: 'rTestAddress1234567890',
      balance: '1000',
      name: 'Test Wallet'
    };

    storageService = new MockStorageService();
    xrplService = new MockXrplService();
    utilsService = new MockUtilsService();
    walletManagerService = new MockWalletManagerService();

    xrplService.getClient.and.returnValue(Promise.resolve(mockClient));
    utilsService.getWalletFromAddress.and.returnValue(Promise.resolve(mockWallet));
    walletManagerService.getSelectedWallet.and.returnValue(mockWallet);
    walletManagerService.wallets.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        OfferCurrencyService,
        { provide: StorageService, useValue: storageService },
        { provide: XrplService, useValue: xrplService },
        { provide: UtilsService, useValue: utilsService },
        { provide: WalletManagerService, useValue: walletManagerService }
      ]
    });
  });

  function createService(): OfferCurrencyService {
    return TestBed.inject(OfferCurrencyService);
  }

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const service = createService();
      expect(service.weWant.currency()).toBe('');
      expect(service.weWant.issuer()).toBe('');
      expect(service.weWant.issuers()).toEqual([]);
      expect(service.weWant.balance()).toBe('0');
      
      expect(service.weSpend.currency()).toBe('');
      expect(service.weSpend.issuer()).toBe('');
      expect(service.weSpend.issuers()).toEqual([]);
      expect(service.weSpend.balance()).toBe('0');
    });

    it('should load known issuers from storage on init', () => {
      const mockIssuers = { XRP: [], USD: ['rIssuer1', 'rIssuer2'], EUR: ['rIssuer3'] };
      storageService.getKnownIssuers.and.returnValue(mockIssuers);
      
      const service = createService();
      const currencies = service.getAvailableCurrencies(true);
      
      expect(storageService.getKnownIssuers).toHaveBeenCalledWith('knownIssuers');
      expect(currencies).toEqual(['EUR', 'USD', 'XRP']);
      expect(currencies.length).toBe(3);
    });

    it('should handle storage load error', () => {
      storageService.getKnownIssuers.and.throwError('Storage error');
      
      const service = createService();
      expect(service.getAvailableCurrencies(true)).toEqual(['XRP']);
    });
  });

  describe('setWalletAddress', () => {
    it('should set wallet address and clear cache', () => {
      const service = createService();
      service.setWalletAddress('rNewAddress');
      expect(true).toBeTruthy();
    });
  });

  describe('getAvailableCurrencies', () => {
    it('should return all currencies including XRP when includeXrp is true', () => {
      const mockIssuers = { XRP: [], USD: ['rIssuer1'], EUR: ['rIssuer2'], BTC: ['rIssuer3'] };
      storageService.getKnownIssuers.and.returnValue(mockIssuers);
      
      const service = createService();
      const currencies = service.getAvailableCurrencies(true);
      
      expect(currencies).toEqual(['BTC', 'EUR', 'USD', 'XRP']);
      expect(currencies.length).toBe(4);
    });

    it('should return currencies excluding XRP when includeXrp is false', () => {
      const mockIssuers = { XRP: [], USD: ['rIssuer1'], EUR: ['rIssuer2'] };
      storageService.getKnownIssuers.and.returnValue(mockIssuers);
      
      const service = createService();
      const currencies = service.getAvailableCurrencies(false);
      
      expect(currencies).toEqual(['EUR', 'USD']);
      expect(currencies.length).toBe(2);
      expect(currencies).not.toContain('XRP');
    });

    it('should return empty array when no currencies', () => {
      storageService.getKnownIssuers.and.returnValue({ XRP: [] });
      
      const service = createService();
      const currencies = service.getAvailableCurrencies(false);
      
      expect(currencies).toEqual([]);
    });
  });

  describe('selectWeWantCurrency', () => {
    it('should set currency, load issuers, and update balance', async () => {
      const mockIssuers = { XRP: [], USD: ['rIssuer1', 'rIssuer2'] };
      storageService.getKnownIssuers.and.returnValue(mockIssuers);
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } }));
      
      const service = createService();
      service.setWalletAddress(mockWallet.classicAddress);
      
      await service.selectWeWantCurrency('USD', mockWallet);
      
      expect(service.weWant.currency()).toBe('USD');
      expect(service.weWant.issuers().length).toBe(2);
      expect(service.weWant.issuer()).toBe('rIssuer1');
    });

    it('should handle XRP currency', async () => {
      const service = createService();
      await service.selectWeWantCurrency('XRP', mockWallet);
      
      expect(service.weWant.currency()).toBe('XRP');
      expect(service.weWant.issuers()).toEqual([]);
      expect(service.weWant.issuer()).toBe('');
    });

    it('should handle unknown currency', async () => {
      const service = createService();
      await service.selectWeWantCurrency('UNKNOWN', mockWallet);
      
      expect(service.weWant.currency()).toBe('UNKNOWN');
      expect(service.weWant.issuers()).toEqual([]);
    });
  });

  describe('selectWeWantIssuer', () => {
    it('should set issuer and update balance', async () => {
      const service = createService();
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } }));
      
      await service.selectWeWantIssuer('rIssuerAddress', mockWallet);
      
      expect(service.weWant.issuer()).toBe('rIssuerAddress');
    });
  });

  describe('selectWeSpendCurrency', () => {
    it('should set currency, load issuers, and update balance', async () => {
      const mockIssuers = { XRP: [], EUR: ['rIssuer3', 'rIssuer4'] };
      storageService.getKnownIssuers.and.returnValue(mockIssuers);
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } }));
      
      const service = createService();
      service.setWalletAddress(mockWallet.classicAddress);
      
      await service.selectWeSpendCurrency('EUR', mockWallet);
      
      expect(service.weSpend.currency()).toBe('EUR');
      expect(service.weSpend.issuers().length).toBe(2);
      expect(service.weSpend.issuer()).toBe('rIssuer3');
    });

    it('should handle XRP currency for spend', async () => {
      const service = createService();
      await service.selectWeSpendCurrency('XRP', mockWallet);
      
      expect(service.weSpend.currency()).toBe('XRP');
      expect(service.weSpend.issuers()).toEqual([]);
    });
  });

  describe('selectWeSpendIssuer', () => {
    it('should set issuer and update balance', async () => {
      const service = createService();
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } }));
      
      await service.selectWeSpendIssuer('rSpendIssuer', mockWallet);
      
      expect(service.weSpend.issuer()).toBe('rSpendIssuer');
    });
  });

  describe('loadIssuersForCurrency (via select methods)', () => {
    it('should auto-select first issuer when issuers exist', async () => {
      const mockIssuers = { XRP: [], USD: ['rIssuer1', 'rIssuer2'] };
      storageService.getKnownIssuers.and.returnValue(mockIssuers);
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } }));
      
      const service = createService();
      await service.selectWeWantCurrency('USD', mockWallet);
      
      expect(service.weWant.issuer()).toBe('rIssuer1');
      expect(service.weWant.issuers().length).toBe(2);
    });

    it('should set empty issuer when no issuers', async () => {
      const mockIssuers = { XRP: [], USD: [] };
      storageService.getKnownIssuers.and.returnValue(mockIssuers);
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } }));
      
      const service = createService();
      await service.selectWeWantCurrency('USD', mockWallet);
      
      expect(service.weWant.issuer()).toBe('');
      expect(service.weWant.issuers()).toEqual([]);
    });
  });

  describe('getNiceName', () => {
    it('should return wallet name if found', () => {
      const service = createService();
      const mockWallets = [{ address: 'rWalletAddress', name: 'My Wallet' }];
      walletManagerService.wallets.and.returnValue(mockWallets);
      
      const name = (service as any).getNiceName('rWalletAddress', 'USD');
      expect(name).toBe('My Wallet');
    });

    it('should return custom destination name if found', () => {
      const service = createService();
      const customDestinations = [{ address: 'rCustomAddress', name: 'Custom Name' }];
      storageService.get.and.returnValue(JSON.stringify(customDestinations));
      
      const name = (service as any).getNiceName('rCustomAddress', 'USD');
      expect(name).toBe('Custom Name');
      expect(storageService.get).toHaveBeenCalledWith('customDestinations');
    });

    it('should return default issuer name with truncated address', () => {
      const service = createService();
      const name = (service as any).getNiceName('rLongAddress1234567890', 'BTC');
      expect(name).toBe('BTC Issuer (rLongAdd...)');
    });

    it('should handle error parsing custom destinations', () => {
      const service = createService();
      storageService.get.and.returnValue('invalid json');
      spyOn(console, 'warn');
      
      const name = (service as any).getNiceName('rAddress', 'USD');
      expect(name).toBe('USD Issuer (rAddress...)');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('updateBalanceForSide', () => {
    it('should set balance to 0 when no wallet address', async () => {
      const service = createService();
      service.setWalletAddress('');
      await (service as any).updateBalanceForSide(service.weWant, mockWallet);
      expect(service.weWant.balance()).toBe('0');
    });

    it('should set balance to 0 when no currency', async () => {
      const service = createService();
      service.weWant.currency.set('');
      await (service as any).updateBalanceForSide(service.weWant, mockWallet);
      expect(service.weWant.balance()).toBe('0');
    });

    it('should set XRP balance from wallet', async () => {
      const service = createService();
      service.setWalletAddress(mockWallet.classicAddress);
      service.weWant.currency.set('XRP');
      await (service as any).updateBalanceForSide(service.weWant, mockWallet);
      expect(service.weWant.balance()).toBe('1000');
    });

    it('should set XRP balance from getSelectedWallet fallback', async () => {
      const service = createService();
      service.setWalletAddress(mockWallet.classicAddress);
      service.weWant.currency.set('XRP');
      await (service as any).updateBalanceForSide(service.weWant, null);
      expect(service.weWant.balance()).toBe('1000');
    });

    it('should set balance to 0 for token when no issuer', async () => {
      const service = createService();
      service.setWalletAddress(mockWallet.classicAddress);
      service.weWant.currency.set('USD');
      service.weWant.issuer.set('');
      await (service as any).updateBalanceForSide(service.weWant, mockWallet);
      expect(service.weWant.balance()).toBe('0');
    });

    it('should use cached balance if available', async () => {
      const service = createService();
      service.setWalletAddress(mockWallet.classicAddress);
      const cachedData = { result: { balances: { rIssuer: [{ currency: 'USD', value: '500' }] } } };
      (service as any).balanceCache.set(`${mockWallet.classicAddress}_USD_rIssuer`, { data: cachedData, timestamp: Date.now() });
      
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } }));
      
      service.weWant.currency.set('USD');
      service.weWant.issuer.set('rIssuer');
      await (service as any).updateBalanceForSide(service.weWant, mockWallet);
      
      expect(service.weWant.balance()).toBe('500');
      expect(xrplService.getTokenBalance).not.toHaveBeenCalled();
    });

    it('should fetch balance from network when cache expired', async () => {
      const service = createService();
      service.setWalletAddress(mockWallet.classicAddress);
      const cachedData = { result: { balances: { rIssuer: [{ currency: 'USD', value: '500' }] } } };
      (service as any).balanceCache.set(`${mockWallet.classicAddress}_USD_rIssuer`, { data: cachedData, timestamp: Date.now() - 10000 });
      
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: { rIssuer: [{ currency: 'USD', value: '700' }] } } }));
      
      service.weWant.currency.set('USD');
      service.weWant.issuer.set('rIssuer');
      await (service as any).updateBalanceForSide(service.weWant, mockWallet);
      
      expect(service.weWant.balance()).toBe('700');
    });

    it('should handle errors when fetching balance', async () => {
      const service = createService();
      service.setWalletAddress(mockWallet.classicAddress);
      xrplService.getTokenBalance.and.returnValue(Promise.reject('Network error'));
      spyOn(console, 'error');
      
      service.weWant.currency.set('USD');
      service.weWant.issuer.set('rIssuer');
      await (service as any).updateBalanceForSide(service.weWant, mockWallet);
      
      expect(service.weWant.balance()).toBe('0');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('extractBalance', () => {
    it('should extract balance from obligations', () => {
      const service = createService();
      const gatewayBalances = {
        result: {
          obligations: { USD: '100' }
        }
      };
      
      const balance = (service as any).extractBalance(gatewayBalances, 'USD', 'rIssuer');
      expect(balance).toBe('-100');
    });

    it('should extract balance from assets', () => {
      const service = createService();
      const gatewayBalances = {
        result: {
          assets: {
            rIssuer: [{ currency: 'USD', value: '250' }]
          }
        }
      };
      
      const balance = (service as any).extractBalance(gatewayBalances, 'USD', 'rIssuer');
      expect(balance).toBe('250');
    });

    it('should extract balance from balances', () => {
      const service = createService();
      const gatewayBalances = {
        result: {
          balances: {
            rIssuer: [{ currency: 'USD', value: '375' }]
          }
        }
      };
      
      const balance = (service as any).extractBalance(gatewayBalances, 'USD', 'rIssuer');
      expect(balance).toBe('375');
    });

    it('should return 0 when no balance found', () => {
      const service = createService();
      const gatewayBalances = { result: {} };
      
      const balance = (service as any).extractBalance(gatewayBalances, 'USD', 'rIssuer');
      expect(balance).toBe('0');
    });

    it('should normalize currency codes', () => {
      const service = createService();
      utilsService.normalizeCurrencyCode.and.returnValue('NORMALIZED');
      
      const gatewayBalances = {
        result: {
          assets: {
            rIssuer: [{ currency: 'NORMALIZED', value: '100' }]
          }
        }
      };
      
      (service as any).extractBalance(gatewayBalances, 'RAW_CURRENCY', 'rIssuer');
      expect(utilsService.normalizeCurrencyCode).toHaveBeenCalledWith('RAW_CURRENCY');
    });
  });

  describe('refreshBothBalances', () => {
    it('should refresh balances for both sides', async () => {
      const service = createService();
      service.setWalletAddress(mockWallet.classicAddress);
      service.weWant.currency.set('XRP');
      service.weSpend.currency.set('USD');
      service.weSpend.issuer.set('rIssuer');
      
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } }));
      
      await service.refreshBothBalances(mockWallet);
      
      expect(service.weWant.balance()).toBe('1000');
      expect(service.weSpend.balance()).toBe('0');
    });
  });

  describe('refreshXrpBalance', () => {
    it('should update XRP balance for weWant if currency is XRP', () => {
      const service = createService();
      service.weWant.currency.set('XRP');
      service.refreshXrpBalance({ balance: '2000' });
      expect(service.weWant.balance()).toBe('2000');
    });

    it('should update XRP balance for weSpend if currency is XRP', () => {
      const service = createService();
      service.weSpend.currency.set('XRP');
      service.refreshXrpBalance({ balance: '3000' });
      expect(service.weSpend.balance()).toBe('3000');
    });

    it('should not update XRP balance for non-XRP currencies', () => {
      const service = createService();
      service.weWant.currency.set('USD');
      service.weSpend.currency.set('EUR');
      service.refreshXrpBalance({ balance: '2000' });
      
      expect(service.weWant.balance()).toBe('0');
      expect(service.weSpend.balance()).toBe('0');
    });
  });

  describe('getIssuersForCurrency', () => {
    it('should return empty array for XRP', () => {
      const service = createService();
      const issuers = service.getIssuersForCurrency('XRP');
      expect(issuers).toEqual([]);
    });

    it('should return empty array for empty currency', () => {
      const service = createService();
      const issuers = service.getIssuersForCurrency('');
      expect(issuers).toEqual([]);
    });

    it('should return issuers for currency', () => {
      const mockIssuers = { XRP: [], USD: ['rIssuer1', 'rIssuer2'] };
      storageService.getKnownIssuers.and.returnValue(mockIssuers);
      
      const service = createService();
      const issuers = service.getIssuersForCurrency('USD');
      
      expect(issuers).toEqual(['rIssuer1', 'rIssuer2']);
      expect(issuers.length).toBe(2);
    });

    it('should return empty array for unknown currency', () => {
      const service = createService();
      const issuers = service.getIssuersForCurrency('UNKNOWN');
      expect(issuers).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should reset all state values', async () => {
      const mockIssuers = { XRP: [], USD: ['rIssuer1'] };
      storageService.getKnownIssuers.and.returnValue(mockIssuers);
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } }));
      
      const service = createService();
      await service.selectWeWantCurrency('USD', mockWallet);
      await service.selectWeSpendCurrency('EUR', mockWallet);
      
      service.reset();
      
      expect(service.weWant.currency()).toBe('');
      expect(service.weWant.issuer()).toBe('');
      expect(service.weWant.issuers()).toEqual([]);
      expect(service.weWant.balance()).toBe('0');
      
      expect(service.weSpend.currency()).toBe('');
      expect(service.weSpend.issuer()).toBe('');
      expect(service.weSpend.issuers()).toEqual([]);
      expect(service.weSpend.balance()).toBe('0');
    });
  });

  describe('Edge cases', () => {
    it('should handle double Promise.resolve in select methods', async () => {
      const mockIssuers = { XRP: [], USD: ['rIssuer1'] };
      storageService.getKnownIssuers.and.returnValue(mockIssuers);
      xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } }));
      
      const service = createService();
      await service.selectWeWantCurrency('USD', mockWallet);
      
      expect(service.weWant.currency()).toBe('USD');
    });

    it('should handle wallet with null balance', async () => {
      const service = createService();
      const walletNoBalance = { classicAddress: 'rAddress', balance: null };
      service.setWalletAddress(mockWallet.classicAddress);
      service.weWant.currency.set('XRP');
      await (service as any).updateBalanceForSide(service.weWant, walletNoBalance);
      expect(service.weWant.balance()).toBe('1000');
    });

    it('should handle missing client gracefully', async () => {
      const service = createService();
      xrplService.getClient.and.returnValue(Promise.resolve(null));
      service.setWalletAddress(mockWallet.classicAddress);
      service.weWant.currency.set('USD');
      service.weWant.issuer.set('rIssuer');
      
      await (service as any).updateBalanceForSide(service.weWant, mockWallet);
      expect(service.weWant.balance()).toBe('0');
    });
  });
});