import { TestBed } from '@angular/core/testing';
import { TrustlineCurrencyService } from './trustline-currency.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import * as xrpl from 'xrpl';
import { signal } from '@angular/core';

// Mock classes to avoid type issues
class MockCurrencyStoreService {
     currency = jasmine.createSpy().and.returnValue('USD');
     issuer = jasmine.createSpy().and.returnValue('rIssuer');
     setCurrency = jasmine.createSpy();
     setIssuer = jasmine.createSpy();
     setField = jasmine.createSpy();
}

class MockWalletManagerService {
     getSelectedWallet = jasmine.createSpy();
     wallets = jasmine.createSpy().and.returnValue([]);
}

class MockStorageService {
     getKnownIssuers = jasmine.createSpy();
     setKnownIssuers = jasmine.createSpy();
}

class MockUtilsService {
     normalizeCurrencyCode = jasmine.createSpy().and.callFake((code: string) => code);
     normalizeAddress = jasmine.createSpy().and.callFake((addr: string) => addr);
     formatTokenBalance = jasmine.createSpy().and.callFake((value: string) => value);
     decodeIfNeeded = jasmine.createSpy().and.callFake((code: string) => code);
}

class MockTxEnvironmentService {
     prepareTxEnvironment = jasmine.createSpy();
}

describe('TrustlineCurrencyService', () => {
     let service: TrustlineCurrencyService;
     let currencyStore: MockCurrencyStoreService;
     let walletManager: MockWalletManagerService;
     let storage: MockStorageService;
     let utils: MockUtilsService;
     let txEnvironmentService: MockTxEnvironmentService;
     let mockWallet: any;

     beforeEach(() => {
          currencyStore = new MockCurrencyStoreService();
          walletManager = new MockWalletManagerService();
          storage = new MockStorageService();
          utils = new MockUtilsService();
          txEnvironmentService = new MockTxEnvironmentService();

          mockWallet = {
               classicAddress: 'rTestAddress',
               address: 'rTestAddress',
               name: 'Test Wallet',
          };

          walletManager.getSelectedWallet.and.returnValue(mockWallet);
          walletManager.wallets.and.returnValue([mockWallet]);
          storage.getKnownIssuers.and.returnValue({ USD: ['rIssuer'], EUR: ['rEuroIssuer'] });

          TestBed.configureTestingModule({
               providers: [TrustlineCurrencyService, { provide: CurrencyStoreService, useValue: currencyStore }, { provide: WalletManagerService, useValue: walletManager }, { provide: StorageService, useValue: storage }, { provide: UtilsService, useValue: utils }, { provide: TxEnvironmentService, useValue: txEnvironmentService }],
          });

          service = TestBed.inject(TrustlineCurrencyService);
          service.load(); // Load initial data
     });

     describe('initialization', () => {
          it('should initialize with default values', () => {
               expect(service.preferXrpAsDefault()).toBe(false);
               expect(service.addMptInCurrencyDropdown()).toBe(false);
               expect(service.addXrpInCurrencyDropdown()).toBe(false);
               expect(service.totalFlagsValue()).toBe(0);
               expect(service.totalFlagsHex()).toBe('0x0');
          });
     });

     describe('currencies computed', () => {
          it('should return currencies including XRP and MPT when enabled', () => {
               service.addXrpInCurrencyDropdown.set(true);
               service.addMptInCurrencyDropdown.set(true);
               const currencies = service.currencies();
               expect(currencies).toContain('XRP');
               expect(currencies).toContain('MPT');
               expect(currencies).toContain('USD');
               expect(currencies).toContain('EUR');
          });

          it('should exclude XRP and MPT when disabled', () => {
               service.addXrpInCurrencyDropdown.set(false);
               service.addMptInCurrencyDropdown.set(false);
               const currencies = service.currencies();
               expect(currencies).not.toContain('XRP');
               expect(currencies).not.toContain('MPT');
               expect(currencies).toContain('USD');
               expect(currencies).toContain('EUR');
          });
     });

     describe('issuers computed', () => {
          it('should return issuers for selected currency', () => {
               const issuers = service.issuers();
               expect(issuers.length).toBe(1);
               expect(issuers[0].address).toBe('rIssuer');
          });

          it('should return empty array for XRP currency', () => {
               currencyStore.currency.and.returnValue('XRP');
               const issuers = service.issuers();
               expect(issuers).toEqual([]);
          });
     });

     describe('currencyItems computed', () => {
          it('should return formatted currency items', () => {
               service.addXrpInCurrencyDropdown.set(true);
               const items = service.currencyItems();
               expect(items.length).toBeGreaterThan(0);
               expect(items[0].id).toBeDefined();
               expect(items[0].display).toBeDefined();
               expect(items[0].secondary).toBeDefined();
               expect(items[0].isCurrentCode).toBeDefined();
          });
     });

     describe('issuerItems computed', () => {
          it('should return formatted issuer items', () => {
               const items = service.issuerItems();
               expect(items.length).toBe(1);
               expect(items[0].id).toBe('rIssuer');
               expect(items[0].secondary).toBe('rIssuer');
          });
     });

     describe('selectCurrency', () => {
          it('should select currency and first issuer', () => {
               service.selectCurrency('USD');
               expect(currencyStore.setCurrency).toHaveBeenCalledWith('USD');
               expect(currencyStore.setIssuer).toHaveBeenCalledWith('rIssuer');
          });

          it('should handle item object input', () => {
               service.selectCurrency({ id: 'USD' });
               expect(currencyStore.setCurrency).toHaveBeenCalledWith('USD');
          });

          // it('should handle currency with no issuers', () => {
          //      service.selectCurrency('EUR');
          //      expect(currencyStore.setCurrency).toHaveBeenCalledWith('EUR');
          //      expect(currencyStore.setIssuer).toHaveBeenCalledWith('');
          // });
     });

     describe('selectIssuer', () => {
          it('should select issuer', () => {
               service.selectIssuer('rNewIssuer');
               expect(currencyStore.setIssuer).toHaveBeenCalledWith('rNewIssuer');
          });

          it('should handle item object input', () => {
               service.selectIssuer({ id: 'rItemIssuer' });
               expect(currencyStore.setIssuer).toHaveBeenCalledWith('rItemIssuer');
          });
     });

     describe('addToken', () => {
          it('should add new token', () => {
               service.addToken('NEW', 'rNewIssuer');
               const issuers = service.getIssuersForCurrency('NEW');
               expect(issuers).toContain('rNewIssuer');
               expect(storage.setKnownIssuers).toHaveBeenCalled();
          });

          it('should not add duplicate token', () => {
               service.addToken('USD', 'rIssuer');
               const issuers = service.getIssuersForCurrency('USD');
               expect(issuers.filter((i: string) => i === 'rIssuer').length).toBe(1);
          });
     });

     describe('removeToken', () => {
          it('should remove specific issuer', () => {
               service.addToken('TEST', 'rTestIssuer');
               service.removeToken('TEST', 'rTestIssuer');
               const issuers = service.getIssuersForCurrency('TEST');
               expect(issuers).not.toContain('rTestIssuer');
          });

          it('should remove entire currency when no issuer specified', () => {
               service.removeToken('USD');
               const issuers = service.getIssuersForCurrency('USD');
               expect(issuers).toEqual([]);
          });
     });

     describe('getIssuersForCurrency', () => {
          it('should return issuers for currency', () => {
               const issuers = service.getIssuersForCurrency('USD');
               expect(issuers).toEqual(['rIssuer']);
          });

          it('should return empty array for unknown currency', () => {
               const issuers = service.getIssuersForCurrency('UNKNOWN');
               expect(issuers).toEqual([]);
          });
     });

     describe('setPreferXrpAsDefault', () => {
          it('should set preferXrpAsDefault', () => {
               service.setPreferXrpAsDefault(true);
               expect(service.preferXrpAsDefault()).toBe(true);
          });
     });

     describe('toggleFlag', () => {
          it('should toggle flag value', () => {
               expect(service.flags().tfSetfAuth).toBe(false);
               service.toggleFlag('tfSetfAuth');
               expect(service.flags().tfSetfAuth).toBe(true);
               service.toggleFlag('tfSetfAuth');
               expect(service.flags().tfSetfAuth).toBe(false);
          });
     });

     describe('updateFlagTotal', () => {
          it('should calculate total flags value', () => {
               service.flags.update(f => ({ ...f, tfSetfAuth: true, tfSetNoRipple: true }));
               service.updateFlagTotal();
               expect(service.totalFlagsValue()).toBe(0x00010000 | 0x00020000);
               expect(service.totalFlagsHex()).toBe('0x00030000');
          });
     });

     describe('clearFlagsValue', () => {
          it('should clear flags for non-remove tab', () => {
               service.flags.update(f => ({ ...f, tfSetfAuth: true }));
               service.clearFlagsValue('setTrustline');
               expect(service.flags().tfSetfAuth).toBe(false);
               expect(service.totalFlagsValue()).toBe(0);
               expect(service.totalFlagsHex()).toBe('0x0');
          });

          it('should not clear flags for remove tab', () => {
               service.flags.update(f => ({ ...f, tfSetfAuth: true }));
               service.clearFlagsValue('removeTrustline');
               expect(service.flags().tfSetfAuth).toBe(true);
          });
     });

     describe('setFlag', () => {
          it('should set specific flag value', () => {
               service.setFlag('tfSetfAuth', true);
               expect(service.flags().tfSetfAuth).toBe(true);
          });
     });

     describe('getTrustlineState', () => {
          const accountObjects: any = {
               result: {
                    account_objects: [
                         {
                              LedgerEntryType: 'RippleState',
                              Balance: { currency: 'USD', value: '100' },
                              LowLimit: { issuer: 'rWallet', value: '1000' },
                              HighLimit: { issuer: 'rIssuer', value: '0' },
                         },
                    ],
               },
          };

          it('should find trustline state', () => {
               const state = service.getTrustlineState(accountObjects, 'rWallet', 'rIssuer', 'USD');
               expect(state).toBeDefined();
          });

          it('should return undefined when not found', () => {
               const state = service.getTrustlineState(accountObjects, 'rUnknown', 'rIssuer', 'USD');
               expect(state).toBeUndefined();
          });
     });

     describe('getExistingIOUs', () => {
          const accountObjects: any = {
               result: {
                    account_objects: [
                         {
                              LedgerEntryType: 'RippleState',
                              Balance: { currency: 'USD', value: '100' },
                              LowLimit: { issuer: 'rWallet', value: '1000' },
                              HighLimit: { issuer: 'rIssuer', value: '0' },
                              Flags: 0,
                         },
                    ],
               },
          };

          it('should return mapped IOUs', () => {
               const result = service.getExistingIOUs(accountObjects, 'rWallet');
               expect(result.length).toBe(1);
               expect(result[0].currency).toBe('USD');
               expect(result[0].issuer).toBe('rIssuer');
          });
     });

     describe('hasTrustline', () => {
          const trustlines: any = {
               result: {
                    lines: [{ account: 'rIssuer', currency: 'USD', limit: '1000' }],
               },
          };

          it('should return true when trustline exists', async () => {
               const result = await service.hasTrustline(trustlines, 'USD', 'rIssuer');
               expect(result).toBe(true);
          });

          it('should return false when trustline does not exist', async () => {
               const result = await service.hasTrustline(trustlines, 'EUR', 'rEuroIssuer');
               expect(result).toBe(false);
          });
     });

     describe('refreshCurrentBalanceFromEnv', () => {
          const env: any = {
               accountInfo: { result: { account_data: { Balance: '1000000' } } },
               gatewayBalanceObject: { result: { balances: { rIssuer: [{ currency: 'USD', value: '500' }] } } },
          };

          it('should update XRP balance', async () => {
               currencyStore.currency.and.returnValue('XRP');
               await service.refreshCurrentBalanceFromEnv(env);
               expect(currencyStore.setField).toHaveBeenCalled();
          });

          it('should update token balance', async () => {
               currencyStore.currency.and.returnValue('USD');
               currencyStore.issuer.and.returnValue('rIssuer');
               await service.refreshCurrentBalanceFromEnv(env);
               expect(currencyStore.setField).toHaveBeenCalled();
          });
     });

     describe('refreshNonNativeCurrency', () => {
          it('should do nothing for XRP', () => {
               currencyStore.currency.and.returnValue('XRP');
               service.refreshNonNativeCurrency();
               expect(currencyStore.setCurrency).not.toHaveBeenCalled();
          });

          it('should select currency for non-XRP', () => {
               currencyStore.currency.and.returnValue('USD');
               service.refreshNonNativeCurrency();
               expect(currencyStore.setCurrency).toHaveBeenCalledWith('USD');
          });
     });
});
