import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { EventEmitter } from '@angular/core';

describe('StorageService', () => {
     let service: StorageService;
     let localStorageMock: { [key: string]: string };

     beforeEach(() => {
          // Setup localStorage mock
          localStorageMock = {};
          spyOn(localStorage, 'getItem').and.callFake((key: string) => localStorageMock[key] || null);
          spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
               localStorageMock[key] = value;
          });
          spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
               delete localStorageMock[key];
          });
          spyOn(localStorage, 'clear').and.callFake(() => {
               localStorageMock = {};
          });

          TestBed.configureTestingModule({
               providers: [StorageService],
          });

          service = TestBed.inject(StorageService);
     });

     afterEach(() => {
          localStorageMock = {};
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });

          it('should have inputsCleared EventEmitter', () => {
               expect(service.inputsCleared).toBeDefined();
               expect(service.inputsCleared instanceof EventEmitter).toBe(true);
          });
     });

     describe('getNet', () => {
          it('should return default network when no selection in localStorage', () => {
               const result = service.getNet();
               expect(result.environment).toBe('devnet');
               expect(result.net).toBe(service.networkServers['devnet']);
          });

          it('should return saved network from localStorage', () => {
               localStorageMock['selectedNetwork'] = 'testnet';
               const result = service.getNet();
               expect(result.environment).toBe('testnet');
               expect(result.net).toBe(service.networkServers['testnet']);
          });

          it('should return custom server if saved', () => {
               localStorageMock['selectedNetwork'] = 'mainnet';
               localStorageMock['server'] = 'wss://custom.server.com';
               const result = service.getNet();
               expect(result.environment).toBe('mainnet');
               expect(result.net).toBe('wss://custom.server.com');
          });

          it('should handle undefined server in localStorage', () => {
               localStorageMock['selectedNetwork'] = 'mainnet';
               localStorageMock['server'] = 'undefined';
               const result = service.getNet();
               expect(result.net).toBe(service.networkServers['mainnet']);
          });
     });

     describe('setNet', () => {
          it('should save net and environment to localStorage', () => {
               service.setNet('wss://custom.server.com', 'custom');
               expect(localStorageMock['server']).toBe('wss://custom.server.com');
               expect(localStorageMock['selectedNetwork']).toBe('custom');
          });
     });

     describe('getNetworkColor', () => {
          it('should return color for devnet', () => {
               const color = service.getNetworkColor('devnet');
               expect(color).toBe('#10b981');
          });

          it('should return color for testnet', () => {
               const color = service.getNetworkColor('testnet');
               expect(color).toBe('#ff6719');
          });

          it('should return color for mainnet', () => {
               const color = service.getNetworkColor('mainnet');
               expect(color).toBe('rgb(115, 49, 55)');
          });

          it('should return default color for unknown network', () => {
               const color = service.getNetworkColor('unknown');
               expect(color).toBe('#1a1c21');
          });

          it('should be case insensitive', () => {
               const color = service.getNetworkColor('DEVNET');
               expect(color).toBe('#10b981');
          });
     });

     describe('getInputValue', () => {
          it('should return value from localStorage', () => {
               localStorageMock['testId'] = 'testValue';
               const result = service.getInputValue('testId');
               expect(result).toBe('testValue');
          });

          it('should return empty string when not found', () => {
               const result = service.getInputValue('nonexistent');
               expect(result).toBe('');
          });
     });

     describe('removeValue', () => {
          it('should remove value from localStorage', () => {
               localStorageMock['testId'] = 'testValue';
               service.removeValue('testId');
               expect(localStorageMock['testId']).toBeUndefined();
          });
     });

     describe('clearValues', () => {
          it('should clear all localStorage', () => {
               localStorageMock['key1'] = 'value1';
               localStorageMock['key2'] = 'value2';
               service.clearValues();
               expect(localStorageMock).toEqual({});
          });
     });

     describe('set', () => {
          it('should store JSON stringified value', () => {
               const value = { name: 'test', id: 123 };
               service.set('testKey', value);
               expect(localStorageMock['testKey']).toBe(JSON.stringify(value));
          });

          it('should remove item when value is undefined', () => {
               localStorageMock['testKey'] = 'oldValue';
               service.set('testKey', undefined);
               expect(localStorageMock['testKey']).toBeUndefined();
          });
     });

     describe('get', () => {
          it('should return parsed value from localStorage', () => {
               const value = { name: 'test', id: 123 };
               localStorageMock['testKey'] = JSON.stringify(value);
               const result = service.get('testKey');
               expect(result).toEqual(value);
          });

          it('should return null when key not found', () => {
               const result = service.get('nonexistent');
               expect(result).toBeNull();
          });
     });

     describe('setKnownIssuers', () => {
          it('should store known issuers with XRP always present', () => {
               const issuers = { USD: ['rIssuer1', 'rIssuer2'] };
               service.setKnownIssuers('issuersKey', issuers);
               const stored = JSON.parse(localStorageMock['issuersKey']);
               expect(stored.USD).toEqual(['rIssuer1', 'rIssuer2']);
               expect(stored.XRP).toEqual([]);
          });

          it('should not duplicate XRP if already present', () => {
               const issuers = { XRP: ['rIssuer1'], USD: ['rIssuer2'] };
               service.setKnownIssuers('issuersKey', issuers);
               const stored = JSON.parse(localStorageMock['issuersKey']);
               expect(stored.XRP).toEqual(['rIssuer1']);
               expect(stored.USD).toEqual(['rIssuer2']);
          });
     });

     describe('getKnownIssuers', () => {
          it('should return null when no data', () => {
               const result = service.getKnownIssuers('nonexistent');
               expect(result).toBeNull();
          });

          it('should return parsed known issuers', () => {
               const issuers = { USD: ['rIssuer1'], XRP: [] };
               localStorageMock['issuersKey'] = JSON.stringify(issuers);
               const result = service.getKnownIssuers('issuersKey');
               expect(result?.['USD']).toEqual(['rIssuer1']);
               expect(result?.['XRP']).toEqual([]);
          });

          it('should handle invalid JSON gracefully', () => {
               localStorageMock['invalidKey'] = 'invalid json';
               const result = service.getKnownIssuers('invalidKey');
               expect(result).toBeNull();
          });

          it('should convert non-array values to arrays', () => {
               const issuers = { USD: 'rIssuer1' };
               localStorageMock['issuersKey'] = JSON.stringify(issuers);
               const result = service.getKnownIssuers('issuersKey');
               expect(result?.['USD']).toEqual(['rIssuer1']);
               expect(result?.['XRP']).toEqual([]);
          });
     });

     describe('setKnownWhitelistAddress', () => {
          it('should store known whitelist address', () => {
               const whitelist = { address1: 'name1', address2: 'name2' };
               service.setKnownWhitelistAddress('whitelistKey', whitelist);
               expect(localStorageMock['whitelistKey']).toBe(JSON.stringify(whitelist));
          });
     });

     describe('getKnownWhitelistAddress', () => {
          it('should return null when no data', () => {
               const result = service.getKnownWhitelistAddress('nonexistent');
               expect(result).toBeNull();
          });

          it('should return parsed whitelist', () => {
               const whitelist = { address1: 'name1' };
               localStorageMock['whitelistKey'] = JSON.stringify(whitelist);
               const result = service.getKnownWhitelistAddress('whitelistKey');
               expect(result).toEqual(whitelist);
          });
     });

     describe('setInputValue', () => {
          it('should store input value', () => {
               service.setInputValue('inputId', 'inputValue');
               expect(localStorageMock['inputId']).toBe('inputValue');
          });
     });

     describe('getActiveNavLink', () => {
          it('should return empty string when not set', () => {
               const result = service.getActiveNavLink();
               expect(result).toBe('');
          });

          it('should return stored value', () => {
               localStorageMock['activeNavLink'] = '/dashboard';
               const result = service.getActiveNavLink();
               expect(result).toBe('/dashboard');
          });
     });

     describe('setActiveNavLink', () => {
          it('should set active nav link and clear others', () => {
               localStorageMock['activeEscrowLink'] = '/escrow';
               localStorageMock['activeAccountsLink'] = '/accounts';

               service.setActiveNavLink('/newLink');

               expect(localStorageMock['activeNavLink']).toBe('/newLink');
               expect(localStorageMock['activeEscrowLink']).toBeUndefined();
               expect(localStorageMock['activeAccountsLink']).toBeUndefined();
          });
     });

     describe('getActiveEscrowLink', () => {
          it('should return empty string when not set', () => {
               const result = service.getActiveEscrowLink();
               expect(result).toBe('');
          });

          it('should return stored value', () => {
               localStorageMock['activeEscrowLink'] = '/escrow/1';
               const result = service.getActiveEscrowLink();
               expect(result).toBe('/escrow/1');
          });
     });

     describe('setActiveEscrowLink', () => {
          it('should set active escrow link and clear others', () => {
               localStorageMock['activeNavLink'] = '/nav';
               localStorageMock['activeAccountsLink'] = '/accounts';

               service.setActiveEscrowLink('/escrow/new');

               expect(localStorageMock['activeEscrowLink']).toBe('/escrow/new');
               expect(localStorageMock['activeNavLink']).toBeUndefined();
               expect(localStorageMock['activeAccountsLink']).toBeUndefined();
          });
     });

     describe('getActiveAccountsLink', () => {
          it('should return empty string when not set', () => {
               const result = service.getActiveAccountsLink();
               expect(result).toBe('');
          });

          it('should return stored value', () => {
               localStorageMock['activeAccountsLink'] = '/accounts/1';
               const result = service.getActiveAccountsLink();
               expect(result).toBe('/accounts/1');
          });
     });

     describe('setActiveAccountsLink', () => {
          it('should set active accounts link and clear others', () => {
               localStorageMock['activeNavLink'] = '/nav';
               localStorageMock['activeEscrowLink'] = '/escrow';

               service.setActiveAccountsLink('/accounts/new');

               expect(localStorageMock['activeAccountsLink']).toBe('/accounts/new');
               expect(localStorageMock['activeNavLink']).toBeUndefined();
               expect(localStorageMock['activeEscrowLink']).toBeUndefined();
          });
     });

     describe('getActiveNftLink', () => {
          it('should return empty string when not set', () => {
               const result = service.getActiveNftLink();
               expect(result).toBe('');
          });

          it('should return stored value', () => {
               localStorageMock['activeNftLink'] = '/nft/1';
               const result = service.getActiveNftLink();
               expect(result).toBe('/nft/1');
          });
     });

     describe('getActiveMptLink', () => {
          it('should return empty string when not set', () => {
               const result = service.getActiveMptLink();
               expect(result).toBe('');
          });

          it('should return stored value', () => {
               localStorageMock['activeMptLink'] = '/mpt/1';
               const result = service.getActiveMptLink();
               expect(result).toBe('/mpt/1');
          });
     });
});
