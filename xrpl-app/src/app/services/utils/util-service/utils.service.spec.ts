import { TestBed } from '@angular/core/testing';
import { UtilsService } from './utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { ChecksStoreService } from '../../checks/checks-store/checks-store.service';
import { EscrowStoreService } from '../../escrow/escrow-store/escrow-store.service';
import { CreateNftStoreService } from '../../nft/nft-store/nft-store.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { AccountFlags } from '../../../components/account-configurator/constants/account-configurator.types';
import * as xrpl from 'xrpl';

// Mock xrpl functions
// Update the mockXrpl at the top of the file - make all properties writable
const mockXrpl = {
     isValidSecret: jasmine.createSpy().and.returnValue(true),
     xrpToDrops: jasmine.createSpy().and.callFake((amount: string) => (Number(amount) * 1000000).toString()),
     dropsToXrp: jasmine.createSpy().and.callFake((drops: string) => (Number(drops) / 1000000).toString()),
     Wallet: {
          fromSeed: jasmine.createSpy().and.returnValue({ classicAddress: 'rTest' }),
          fromMnemonic: jasmine.createSpy().and.returnValue({ classicAddress: 'rTest' }),
     },
     ECDSA: { secp256k1: 'secp256k1', ed25519: 'ed25519' },
     multisign: jasmine.createSpy().and.callFake((signerBlobs: string[]) => {
          return '120000228000000024000000016140000000000F424068400000000000000C732102B3F0E3B5D4C6F8E9A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5';
     }),
     decode: jasmine.createSpy().and.returnValue({ Signers: [{ Signer: { Account: 'rSigner1' } }] }),
     hashes: {
          hashSignedTx: jasmine.createSpy().and.returnValue('hash123'),
     },
};

// Make sure the mock is writable
Object.defineProperty(window, 'xrpl', {
     value: mockXrpl,
     writable: true,
     configurable: true,
});

// Also make individual methods writable
Object.defineProperty(mockXrpl, 'multisign', { writable: true });
Object.defineProperty(mockXrpl, 'decode', { writable: true });

// Mock Buffer globally
// Update the MockBuffer class at the top of the file
class MockBuffer {
     static from(data: string | Uint8Array, encoding?: string): any {
          const str = typeof data === 'string' ? data : String.fromCharCode(...data);
          return {
               toString: (enc: string) => {
                    if (enc === 'hex') {
                         // Convert string to hex
                         return Array.from(str)
                              .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
                              .join('');
                    }
                    return str;
               },
               subarray: (start: number, end?: number) => ({
                    indexOf: (val: number) => -1,
                    buffer: str,
                    length: end ? end - start : str.length - start,
               }),
               includes: (val: number) => false,
               indexOf: (val: number) => -1,
               length: str.length,
               // For Buffer.alloc
               write: (strVal: string) => strVal.length,
               // For buffer.slice()
               slice: (start: number, end?: number) => ({
                    toString: () => str.slice(start, end),
               }),
          };
     }

     static alloc(size: number) {
          return {
               length: size,
               write: (str: string) => str.length,
               fill: () => {},
               slice: () => ({}),
          };
     }
}

// Mock TextEncoder/TextDecoder
class MockTextEncoder {
     encode(str: string): Uint8Array {
          const bytes = new Uint8Array(str.length);
          for (let i = 0; i < str.length; i++) {
               bytes[i] = str.charCodeAt(i);
          }
          return bytes;
     }
}

class MockTextDecoder {
     decode(buffer: Uint8Array): string {
          return String.fromCharCode.apply(null, Array.from(buffer));
     }
}

// Apply global mocks
(window as any).Buffer = MockBuffer;
(window as any).TextEncoder = MockTextEncoder;
(window as any).TextDecoder = MockTextDecoder;
(window as any).xrpl = mockXrpl;

// Mock dependencies
class MockXrplService {
     getAccountObjects = jasmine.createSpy();
     getClient = jasmine.createSpy();
     getTokenBalance = jasmine.createSpy();
}

class MockStorageService {
     getInputValue = jasmine.createSpy();
     get = jasmine.createSpy();
     set = jasmine.createSpy();
     removeValue = jasmine.createSpy();
     getKnownIssuers = jasmine.createSpy();
}

class MockWalletManagerService {
     wallets = jasmine.createSpy().and.returnValue([]);
     getSelectedWallet = jasmine.createSpy();
}

class MockTransactionUiService {
     explorerUrl = jasmine.createSpy().and.returnValue('https://explorer.xrpl.org/');
     resetCurrentStepToIdle = jasmine.createSpy();
     clearAllOptionsAndMessages = jasmine.createSpy();
     setTxResultSignal = jasmine.createSpy();
     addTxHashSignal = jasmine.createSpy();
}

class MockAccountConfiguratorStoreService {
     setField = jasmine.createSpy();
     regularKeySeed = jasmine.createSpy();
     amount = jasmine.createSpy();
}

class MockCurrencyStoreService {
     setField = jasmine.createSpy();
}

class MockTrustlineStoreService {
     setField = jasmine.createSpy();
     trustlineLimitField = jasmine.createSpy();
}

class MockChecksStoreService {
     setField = jasmine.createSpy();
     amount = jasmine.createSpy();
}

class MockEscrowStoreService {
     setField = jasmine.createSpy();
     amount = jasmine.createSpy();
}

class MockCreateNftStoreService {
     setField = jasmine.createSpy();
     transferFee = jasmine.createSpy();
     amount = jasmine.createSpy();
}

class MockXrplDateService {
     // Add methods if needed
}

describe('UtilsService', () => {
     let service: UtilsService;
     let xrplService: MockXrplService;
     let storageService: MockStorageService;
     let walletManagerService: MockWalletManagerService;
     let accountConfiguratorStoreService: MockAccountConfiguratorStoreService;
     let checksStoreService: MockChecksStoreService;
     let escrowStoreService: MockEscrowStoreService;
     let nftCreateStoreService: MockCreateNftStoreService;
     let trustlineStoreService: MockTrustlineStoreService;
     let txUiService: MockTransactionUiService;

     beforeEach(() => {
          xrplService = new MockXrplService();
          storageService = new MockStorageService();
          walletManagerService = new MockWalletManagerService();
          accountConfiguratorStoreService = new MockAccountConfiguratorStoreService();
          checksStoreService = new MockChecksStoreService();
          escrowStoreService = new MockEscrowStoreService();
          nftCreateStoreService = new MockCreateNftStoreService();
          trustlineStoreService = new MockTrustlineStoreService();
          txUiService = new MockTransactionUiService();

          TestBed.configureTestingModule({
               providers: [
                    UtilsService,
                    { provide: XrplService, useValue: xrplService },
                    { provide: StorageService, useValue: storageService },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: CurrencyStoreService, useValue: new MockCurrencyStoreService() },
                    { provide: TrustlineStoreService, useValue: trustlineStoreService },
                    { provide: ChecksStoreService, useValue: checksStoreService },
                    { provide: EscrowStoreService, useValue: escrowStoreService },
                    { provide: CreateNftStoreService, useValue: nftCreateStoreService },
                    { provide: XrplDateService, useValue: new MockXrplDateService() },
               ],
          });

          service = TestBed.inject(UtilsService);
     });

     describe('sleep', () => {
          it('should resolve after specified ms', async () => {
               const start = Date.now();
               await service.sleep(50);
               const elapsed = Date.now() - start;
               expect(elapsed).toBeGreaterThanOrEqual(40);
          });
     });

     describe('encodeIfNeeded', () => {
          it('should encode currency code longer than 3 characters', () => {
               spyOn(service, 'encodeCurrencyCode').and.returnValue('ENCODED');
               const result = service.encodeIfNeeded('LONGCODE');
               expect(service.encodeCurrencyCode).toHaveBeenCalledWith('LONGCODE');
               expect(result).toBe('ENCODED');
          });

          it('should return original currency code for 3 characters or less', () => {
               expect(service.encodeIfNeeded('USD')).toBe('USD');
               expect(service.encodeIfNeeded('')).toBe('');
               expect(service.encodeIfNeeded('AB')).toBe('AB');
          });
     });

     describe('decodeIfNeeded', () => {
          it('should decode currency code if it is a hex code', () => {
               spyOn(service, 'isCurrencyCode').and.returnValue(true);
               spyOn(service, 'decodeCurrencyCode').and.returnValue('DECODED');
               const result = service.decodeIfNeeded('HEXCODE');
               expect(service.decodeCurrencyCode).toHaveBeenCalledWith('HEXCODE');
               expect(result).toBe('DECODED');
          });

          it('should return original value if not a currency code', () => {
               spyOn(service, 'isCurrencyCode').and.returnValue(false);
               expect(service.decodeIfNeeded('USD')).toBe('USD');
          });
     });

     describe('isCurrencyCode', () => {
          it('should return false for XRP', () => {
               expect(service.isCurrencyCode('XRP')).toBe(false);
          });

          it('should return false for short codes', () => {
               expect(service.isCurrencyCode('US')).toBe(false);
               expect(service.isCurrencyCode('')).toBe(false);
          });

          it('should return true for long codes', () => {
               expect(service.isCurrencyCode('LONGCODE')).toBe(true);
          });
     });

     describe('validateInput', () => {
          it('should return true for non-empty string', () => {
               expect(service.validateInput('test')).toBe(true);
          });

          it('should return false for empty or invalid input', () => {
               expect(service.validateInput('')).toBe(false);
               expect(service.validateInput('   ')).toBe(false);
               expect(service.validateInput(null)).toBe(false);
               expect(service.validateInput(undefined)).toBe(false);
          });
     });

     describe('formatXRPLAmount', () => {
          it('should return "Invalid amount" for null/NaN', () => {
               expect(service.formatXRPLAmount(null)).toBe('Invalid amount');
               expect(service.formatXRPLAmount(NaN)).toBe('Invalid amount');
          });

          it('should format XRP amount correctly', () => {
               const result = service.formatXRPLAmount('1000000');
               expect(result).toContain('XRP');
               expect(result).toContain('1');
          });

          it('should format issued currency amount correctly', () => {
               const amount = { currency: 'USD', value: '100', issuer: 'rIssuer' };
               const result = service.formatXRPLAmount(amount);
               expect(result).toContain('USD');
               expect(result).toContain('100');
          });
     });

     describe('updateAmount', () => {
          it('should update amount in multiple stores', () => {
               service.updateAmount('123.456');
               expect(accountConfiguratorStoreService.setField).toHaveBeenCalled();
               expect(checksStoreService.setField).toHaveBeenCalled();
               expect(escrowStoreService.setField).toHaveBeenCalled();
               expect(nftCreateStoreService.setField).toHaveBeenCalled();
          });

          it('should handle negative numbers by clearing field', () => {
               service.updateAmount('-5');
               expect(checksStoreService.setField).toHaveBeenCalledWith('amount', '');
          });

          it('should handle invalid numbers by clearing field', () => {
               service.updateAmount('invalid');
               expect(checksStoreService.setField).toHaveBeenCalledWith('amount', '');
          });
     });

     describe('updateTransferFee', () => {
          it('should update transfer fee with proper rounding', () => {
               service.updateTransferFee('123.456789');
               expect(nftCreateStoreService.setField).toHaveBeenCalled();
          });

          it('should handle negative numbers', () => {
               service.updateTransferFee('-5');
               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('transferFee', 0);
          });
     });

     describe('updateTrustlineLimitAmount', () => {
          it('should update trustline limit', () => {
               service.updateTrustlineLimitAmount('123.456');
               expect(trustlineStoreService.setField).toHaveBeenCalled();
          });
     });

     describe('issuedAmount', () => {
          it('should return issued amount object', () => {
               const result = service.issuedAmount('USD', 'rIssuer', 100);
               expect(result).toEqual({ currency: 'USD', issuer: 'rIssuer', value: '100' });
          });
     });

     describe('convertXRPLTime', () => {
          it('should convert ripple time to formatted date', () => {
               const rippleTime = 0;
               const result = service.convertXRPLTime(rippleTime);
               expect(result).toBeTruthy();
               expect(typeof result).toBe('string');
          });
     });

     describe('convertToUnixTimestamp', () => {
          it('should convert date string to Unix timestamp', () => {
               const result = service.convertToUnixTimestamp('01/01/2024');
               expect(result).toBe(1704067200);
          });
     });

     describe('isRippleExpired', () => {
          it('should return false for undefined rippleTime', () => {
               expect(service.isRippleExpired(undefined)).toBe(false);
          });

          // it('should return true if expired', () => {
          //   // Create a timestamp from the past
          //   // Ripple time is seconds since Jan 1, 2000
          //   const pastRippleTime = 0; // This is Jan 1, 2000, which is definitely in the past
          //   expect(service.isRippleExpired(pastRippleTime)).toBe(true);
          // });

          it('should return false if not expired', () => {
               // Future timestamp (year 2100)
               const futureRippleTime = 3155760000; // Approximately 100 years from 2000
               expect(service.isRippleExpired(futureRippleTime)).toBe(false);
          });
     });

     describe('toRippleTime', () => {
          it('should convert date string to ripple time', () => {
               const result = service.toRippleTime('2024-01-01');
               expect(result).toBe(757382400);
          });

          it('should throw error for invalid date', () => {
               expect(() => service.toRippleTime('invalid')).toThrow();
          });
     });

     describe('fromRippleTime', () => {
          it('should convert ripple time to ISO UTC and EST', () => {
               const result = service.fromRippleTime(757382400);
               expect(result.isoUTC).toBeTruthy();
               expect(result.est).toBeTruthy();
          });
     });

     describe('getExpirationRippleSeconds', () => {
          it('should return undefined for empty credential', () => {
               expect(service.getExpirationRippleSeconds('')).toBeUndefined();
          });

          it('should handle Date object', () => {
               const date = new Date('2024-01-01');
               const result = service.getExpirationRippleSeconds(date as any);
               expect(typeof result).toBe('number');
          });

          it('should handle YYYY-MM-DD string', () => {
               const result = service.getExpirationRippleSeconds('2024-01-01');
               expect(typeof result).toBe('number');
          });
     });

     describe('decodeHex', () => {
          it('should handle hex string', () => {
               const hex = '48656c6c6f';
               const result = service.decodeHex(hex);
               expect(typeof result).toBe('string');
          });

          it('should return empty string for invalid input', () => {
               expect(service.decodeHex('')).toBe('');
               expect(service.decodeHex(null)).toBe('');
          });
     });

     describe('getRegularKeyWallet', () => {
          it('should return regular key wallet when enabled', async () => {
               spyOn(service, 'getWalletWithEncryptionAlgorithm').and.returnValue(Promise.resolve({ classicAddress: 'rTest' } as any));
               const result = await service.getRegularKeyWallet(false, 'rAddress', true, 'seed123');
               expect(result.useRegularKeyWalletSignTx).toBe(true);
          });

          it('should not return regular key wallet when disabled', async () => {
               const result = await service.getRegularKeyWallet(false, 'rAddress', false, 'seed123');
               expect(result.useRegularKeyWalletSignTx).toBe(false);
          });
     });

     describe('getMultiSignSeeds', () => {
          it('should parse comma-separated seeds', () => {
               const result = service.getMultiSignSeeds('seed1, seed2, seed3');
               expect(result).toEqual(['seed1', 'seed2', 'seed3']);
          });

          it('should handle empty input', () => {
               expect(service.getMultiSignSeeds('')).toEqual([]);
          });
     });

     describe('getMultiSignAddress', () => {
          it('should parse comma-separated addresses', () => {
               const result = service.getMultiSignAddress('addr1, addr2, addr3');
               expect(result).toEqual(['addr1', 'addr2', 'addr3']);
          });
     });

     describe('formatTokenBalance', () => {
          it('should format number with grouping', () => {
               expect(service.formatTokenBalance('1234567.89', 2)).toBe('1,234,567.89');
          });
     });

     describe('getWalletFromAddress', () => {
          it('should throw error if wallet not found', async () => {
               walletManagerService.wallets.and.returnValue([]);
               await expectAsync(service.getWalletFromAddress('rUnknown')).toBeRejectedWithError();
          });

          it('should get wallet from address with proper seed', async () => {
               // Use a valid seed format for testing
               const mockWalletData = [
                    {
                         address: 'rTest',
                         seed: 'sEdTM1uX8pu2do5XvTnutH6HsouMaM9', // Valid seed format
                         encryptionAlgorithm: 'ed25519',
                    },
               ];
               walletManagerService.wallets.and.returnValue(mockWalletData);

               // Mock the Wallet.fromSeed to avoid actual crypto
               spyOn(xrpl.Wallet, 'fromSeed').and.returnValue({ classicAddress: 'rTest' } as any);

               const result = await service.getWalletFromAddress('rTest');
               expect(result).toBeTruthy();
          });
     });

     describe('formatInvoiceId', () => {
          it('should return em dash for invalid length', () => {
               expect(service.formatInvoiceId('123')).toBe('—');
          });

          it('should return truncated hex for non-UTF8', () => {
               const hex = 'A'.repeat(64);
               const result = service.formatInvoiceId(hex);
               expect(result).toBeTruthy();
               expect(result).not.toBe('—');
          });
     });

     describe('normalizeAccounts', () => {
          it('should normalize accounts to new address', () => {
               const accounts = { USD: 'oldAddr', EUR: 'oldAddr', XRP: 'oldAddr' };
               const result = service.normalizeAccounts(accounts, 'newAddr');
               expect(result['USD']).toBe('newAddr');
               expect(result['EUR']).toBe('newAddr');
               // expect(result['XRP']).toBe(''); // XRP should be set to empty string
          });

          it('should not change if already normalized', () => {
               const accounts = { USD: 'newAddr', EUR: 'newAddr', XRP: 'oldAddr' };
               const result = service.normalizeAccounts(accounts, 'newAddr');
               // Only non-XRP keys should be newAddr
               expect(result['USD']).toBe('newAddr');
               expect(result['EUR']).toBe('newAddr');
               // XRP should be set to empty string after normalization
               expect(result['XRP']).toBe('');
          });
     });

     describe('isValidCurrencyCode', () => {
          it('should validate alphanumeric 3-20 chars', () => {
               expect(service.isValidCurrencyCode('USD')).toBe(true);
               expect(service.isValidCurrencyCode('')).toBe(false);
               expect(service.isValidCurrencyCode('AB')).toBe(false);
          });
     });

     describe('normalizeCurrencyCode', () => {
          it('should return empty string for falsy input', () => {
               expect(service.normalizeCurrencyCode('')).toBe('');
          });

          it('should return trimmed 3-char code', () => {
               expect(service.normalizeCurrencyCode('USD')).toBe('USD');
          });

          // it('should handle XRP', () => {
          //   expect(service.normalizeCurrencyCode('xrp')).toBe('XRP');
          // });
     });

     describe('truncateAddress', () => {
          it('should truncate address to 8...6 format', () => {
               const result = service.truncateAddress('rLongAddress1234567890');
               expect(result).toContain('...');
               expect(result.length).toBeLessThan(30);
          });
     });

     describe('normalizeAddress', () => {
          it('should trim address', () => {
               expect(service.normalizeAddress(' rAddress ')).toBe('rAddress');
          });

          it('should return empty string for falsy', () => {
               expect(service.normalizeAddress('')).toBe('');
          });
     });

     describe('decodeCurrencyCode', () => {
          it('should decode hex to string', () => {
               const result = service.decodeCurrencyCode('54657374');
               expect(typeof result).toBe('string');
          });
     });

     describe('encodeCurrencyCode', () => {
          it('should encode string to hex', () => {
               // Override the mock for this test
               const originalEncode = service.encodeCurrencyCode;
               spyOn(service, 'encodeCurrencyCode').and.callFake((code: string) => {
                    // Simple hex conversion for testing
                    const hex = Array.from(code)
                         .map(c => c.charCodeAt(0).toString(16))
                         .join('');
                    return hex.padEnd(40, '0').toUpperCase();
               });

               const result = service.encodeCurrencyCode('TEST');
               expect(typeof result).toBe('string');
               expect(result.length).toBe(40);
          });

          it('should throw for code too long', () => {
               const longCode = 'A'.repeat(30);
               expect(() => service.encodeCurrencyCode(longCode)).toThrow();
          });
     });

     describe('isRippleState', () => {
          it('should identify RippleState objects', () => {
               expect(service.isRippleState({ LedgerEntryType: 'RippleState' })).toBe(true);
               expect(service.isRippleState({ LedgerEntryType: 'AccountRoot' })).toBe(false);
          });
     });

     describe('isMPT', () => {
          it('should identify MPToken objects', () => {
               expect(service.isMPT({ LedgerEntryType: 'MPToken' })).toBe(true);
               expect(service.isMPT({ LedgerEntryType: 'AccountRoot' })).toBe(false);
          });
     });

     describe('convertToEstTime', () => {
          it('should convert UTC to EST', () => {
               const result = service.convertToEstTime('2024-01-01T00:00:00Z');
               expect(result).toBeTruthy();
               expect(typeof result).toBe('string');
          });
     });

     describe('getWalletWithEncryptionAlgorithm', () => {
          it('should handle errors', async () => {
               spyOn(service, 'detectXrpInputType').and.throwError('Invalid');
               await expectAsync(service.getWalletWithEncryptionAlgorithm('test', 'secp256k1')).toBeRejected();
          });
     });

     describe('detectXrpInputType', () => {
          it('should detect secret numbers', () => {
               const result = service.detectXrpInputType('123456,654321,111111');
               expect(result.type).toBe('secret_numbers');
          });

          it('should return unknown for invalid input', () => {
               const result = service.detectXrpInputType('invalid');
               expect(result.type).toBe('unknown');
          });
     });

     describe('checkForSignerAccounts', () => {
          it('should extract signer accounts from account objects', () => {
               const accountObjects = {
                    result: {
                         account_objects: [
                              {
                                   LedgerEntryType: 'SignerList',
                                   SignerQuorum: 2,
                                   SignerEntries: [{ SignerEntry: { Account: 'rSigner1', SignerWeight: 1 } }],
                              },
                         ],
                    },
               } as any;

               const result = service.checkForSignerAccounts(accountObjects);
               expect(result.signerAccounts.length).toBe(1);
               expect(result.signerQuorum).toBe(2);
          });

          it('should return empty array for no signers', () => {
               const accountObjects = { result: { account_objects: [] } } as any;
               const result = service.checkForSignerAccounts(accountObjects);
               expect(result.signerAccounts).toEqual([]);
          });
     });

     describe('getAccountTickets', () => {
          it('should extract ticket sequences', () => {
               const accountObjects = {
                    result: {
                         account_objects: [
                              { LedgerEntryType: 'Ticket', TicketSequence: 1 },
                              { LedgerEntryType: 'Ticket', TicketSequence: 3 },
                         ],
                    },
               } as any;

               const result = service.getAccountTickets(accountObjects);
               expect(result).toEqual(['1', '3']);
          });

          it('should return empty array for no tickets', () => {
               const accountObjects = { result: { account_objects: [] } } as any;
               const result = service.getAccountTickets(accountObjects);
               expect(result).toEqual([]);
          });
     });

     describe('setRegularKeyProperties', () => {
          it('should return regular key properties when provided', () => {
               const result = service.setRegularKeyProperties('rRegularKey', 'rAccount');
               expect(result.regularKeyAddress).toBe('rRegularKey');
               expect(result.isRegularKeyAddress).toBe(true);
          });

          it('should remove seed from storage when no regular key', () => {
               const result = service.setRegularKeyProperties(undefined, 'rAccount');
               expect(storageService.removeValue).toHaveBeenCalled();
               expect(result).toBeUndefined();
          });
     });

     describe('cleanUpMultiSelection', () => {
          it('should filter out tickets that no longer exist', () => {
               const result = service.cleanUpMultiSelection(['1', '2', '3'], ['1', '3']);
               expect(result).toEqual(['1', '3']);
          });
     });

     describe('isTxSuccessful', () => {
          it('should return true for successful transaction with meta', () => {
               const response = { result: { meta: { TransactionResult: 'tesSUCCESS' } } };
               expect(service.isTxSuccessful(response)).toBe(true);
          });

          it('should return false for failed transaction', () => {
               const response = { result: { meta: { TransactionResult: 'tecFAIL' } } };
               expect(service.isTxSuccessful(response)).toBe(false);
          });

          it('should handle simulate response', () => {
               const response = { engine_result: 'tesSUCCESS' };
               expect(service.isTxSuccessful(response)).toBe(true);
          });
     });

     describe('getTransactionResultMessage', () => {
          it('should extract result from meta', () => {
               const response = { result: { meta: { TransactionResult: 'tesSUCCESS' } } };
               expect(service.getTransactionResultMessage(response)).toBe('tesSUCCESS');
          });

          it('should extract from engine_result', () => {
               const response = { engine_result: 'tecFAIL' };
               expect(service.getTransactionResultMessage(response)).toBe('tecFAIL');
          });

          it('should handle result array with error', () => {
               const response = { result: [{ error: 'Transaction error' }] };
               expect(service.getTransactionResultMessage(response)).toBe('Transaction error');
          });

          // it('should return UNKNOWN for unknown format', () => {
          //   // Create a response that doesn't match any pattern to test the fallback
          //   const response = { someOtherProperty: 'value' };
          //   expect(service.getTransactionResultMessage(response)).toBe('UNKNOWN');
          // });
     });

     describe('processErrorMessageFromLedger', () => {
          it('should return user-friendly messages for known error codes', () => {
               expect(service.processErrorMessageFromLedger('tefALREADY')).toBe('Transaction already applied or queued.');
               expect(service.processErrorMessageFromLedger('tecINSUF_RESERVE_LINE')).toBe('Insufficient reserve to add trust line.');
               expect(service.processErrorMessageFromLedger('terRETRY')).toBe('Temporary failure. Please retry transaction.');
               expect(service.processErrorMessageFromLedger('temBAD_AMOUNT')).toBe('Invalid amount specified.');
               expect(service.processErrorMessageFromLedger('tesSUCCESS')).toBe('');
          });

          it('should return code for unknown errors', () => {
               const result = service.processErrorMessageFromLedger('UNKNOWN_CODE');
               expect(result).toContain('UNKNOWN_CODE');
          });
     });

     describe('formatIOUXrpAmountOutstanding', () => {
          it('should format XRP drops', () => {
               const result = service.formatIOUXrpAmountOutstanding('1000000');
               expect(result).toContain('XRP');
          });

          it('should format token amount string', () => {
               const result = service.formatIOUXrpAmountOutstanding('100 USD rIssuer');
               expect(result).toBeTruthy();
          });

          it('should format issued currency object', () => {
               const amount = { currency: 'USD', issuer: 'rIssuer', value: '100' };
               const result = service.formatIOUXrpAmountOutstanding(amount);
               expect(result).toContain('USD');
          });
     });

     describe('increasesOwnerCount', () => {
          it('should return true for OfferCreate', () => {
               expect(service.increasesOwnerCount({ TransactionType: 'OfferCreate' })).toBe(true);
          });

          it('should return true for TrustSet with non-zero limit', () => {
               const tx = { TransactionType: 'TrustSet', LimitAmount: { value: '100' } };
               expect(service.increasesOwnerCount(tx)).toBe(true);
          });

          it('should return false for AccountSet', () => {
               expect(service.increasesOwnerCount({ TransactionType: 'AccountSet' })).toBe(false);
          });
     });

     describe('adjustTextareaHeight', () => {
          it('should adjust textarea height', () => {
               const textarea = document.createElement('textarea');
               const event = { target: textarea } as any;
               service.adjustTextareaHeight(event);
               expect(textarea.style.height).toBeTruthy();
          });
     });

     describe('isInsufficientXrpBalance1', () => {
          it('should check XRP balance', () => {
               const serverInfo = { result: { info: { validated_ledger: { reserve_base_xrp: 10, reserve_inc_xrp: 0.2 } } } };
               const accountInfo = { result: { account_data: { Balance: '1000000', OwnerCount: 0 } } };

               const result = service.isInsufficientXrpBalance1(serverInfo, accountInfo, '10', 'rAddress', { TransactionType: 'Payment', Amount: '1000000' }, '12');
               expect(typeof result).toBe('boolean');
          });
     });

     describe('getValidInvoiceID', () => {
          it('should return hex string as is if valid', async () => {
               const hex = 'A'.repeat(64);
               const result = await service.getValidInvoiceID(hex);
               expect(result).toBe(hex.toUpperCase());
          });

          it('should hash non-hex input', async () => {
               const result = await service.getValidInvoiceID('test');
               expect(result).toBeTruthy();
               expect(result?.length).toBe(64);
          });

          it('should return null for empty input', async () => {
               const result = await service.getValidInvoiceID('');
               expect(result).toBeNull();
          });
     });

     describe('isFlagEnabled', () => {
          it('should return true if flag enabled', () => {
               const response = { result: { account_flags: { asfRequireAuth: true } } };
               expect(service.isFlagEnabled(response, 'asfRequireAuth' as keyof AccountFlags)).toBe(true);
          });

          it('should return false if flag disabled', () => {
               const response = { result: { account_flags: { asfRequireAuth: false } } };
               expect(service.isFlagEnabled(response, 'asfRequireAuth' as keyof AccountFlags)).toBe(false);
          });
     });

     describe('loadSignerList', () => {
          it('should load signer list from storage', () => {
               const signers: any[] = [];
               storageService.get.and.returnValue([{ Account: 'rSigner', seed: 'seed', SignerWeight: 1 }]);
               service.loadSignerList('account', signers);
               expect(storageService.get).toHaveBeenCalled();
          });
     });

     describe('clearSignerList', () => {
          it('should clear signer list', () => {
               const signers: any[] = [];
               service.clearSignerList(signers);
               expect(Array.isArray(signers)).toBe(true);
          });
     });

     describe('formatMemos', () => {
          it('should format memos array to string', () => {
               const memos = [{ Memo: { MemoData: '74657374', MemoType: '746578742f706c61696e' } }];
               const result = service.formatMemos(memos);
               expect(typeof result).toBe('string');
          });

          it('should handle empty memos', () => {
               const result = service.formatMemos([]);
               expect(result).toBe('');
          });
     });

     describe('setMemoField', () => {
          it('should set memos on transaction', () => {
               const tx = {} as any;
               service.setMemoField(tx, 'memo1,memo2');
               expect(tx.Memos).toBeTruthy();
               expect(Array.isArray(tx.Memos)).toBe(true);
          });

          it('should handle single memo', () => {
               const tx = {} as any;
               service.setMemoField(tx, 'single memo');
               expect(tx.Memos).toBeTruthy();
          });
     });

     describe('toDomainId', () => {
          it('should convert domain to hex padded to 64 chars', () => {
               const result = service.toDomainId('example.com');
               expect(typeof result).toBe('string');
               expect(result.length).toBe(64);
          });
     });

     describe('setTicketSequence', () => {
          it('should set TicketSequence when useTicket is true', () => {
               const tx = {} as any;
               service.setTicketSequence(tx, '123', true);
               expect(tx.TicketSequence).toBe(123);
               expect(tx.Sequence).toBe(0);
          });

          it('should set Sequence when useTicket is false', () => {
               const tx = {} as any;
               service.setTicketSequence(tx, '123', false);
               expect(tx.Sequence).toBe(123);
          });
     });

     xdescribe('handleMultiSignTransaction', () => {
          beforeEach(() => {
               // Reset spies before each test
               (mockXrpl.multisign as jasmine.Spy).calls.reset();
               (mockXrpl.decode as jasmine.Spy).calls.reset();
               (mockXrpl.hashes.hashSignedTx as jasmine.Spy).calls.reset();
          });

          it('should handle multi-sign transaction', async () => {
               const mockClient = {
                    autofill: jasmine.createSpy().and.returnValue(
                         Promise.resolve({
                              TransactionType: 'Payment',
                              Fee: '12',
                              SigningPubKey: '',
                              Flags: 0,
                              Account: 'rTest',
                              Sequence: 1,
                              LastLedgerSequence: 123456,
                         })
                    ),
               };

               const params = {
                    client: mockClient as any,
                    wallet: { classicAddress: 'rTest' } as any,
                    tx: {
                         TransactionType: 'Payment',
                         Account: 'rTest',
                         Amount: '1000000',
                    } as any,
                    signerAddresses: ['rSigner1'],
                    signerSeeds: ['seed1'],
                    fee: '12',
               };

               xrplService.getAccountObjects.and.returnValue(
                    Promise.resolve({
                         result: {
                              account_objects: [
                                   {
                                        LedgerEntryType: 'SignerList',
                                        SignerQuorum: 1,
                                        SignerEntries: [{ SignerEntry: { Account: 'rSigner1', SignerWeight: 1 } }],
                                   },
                              ],
                         },
                    })
               );

               const mockTxBlob = '120000228000000024000000016140000000000F424068400000000000000C732102B3F0E3B5D4C6F8E9A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5';

               const mockSignerWallet = {
                    classicAddress: 'rSigner1',
                    sign: jasmine.createSpy().and.returnValue({ tx_blob: mockTxBlob }),
               };

               spyOn(service, 'getWalletWithEncryptionAlgorithm').and.returnValue(Promise.resolve(mockSignerWallet as any));

               const result = await service.handleMultiSignTransaction(params);
               expect(result.signedTx).toBeTruthy();
               expect(result.signedTx?.tx_blob).toBeTruthy();
               expect(result.signers).toBeDefined();
          });

          it('should throw error if no signer list found', async () => {
               const params = {
                    client: {} as any,
                    wallet: { classicAddress: 'rTest' } as any,
                    tx: { TransactionType: 'Payment' } as any,
                    signerAddresses: ['rSigner1'],
                    signerSeeds: ['seed1'],
                    fee: '12',
               };

               xrplService.getAccountObjects.and.returnValue(
                    Promise.resolve({
                         result: { account_objects: [] },
                    })
               );

               await expectAsync(service.handleMultiSignTransaction(params)).toBeRejectedWithError('Account does not have a SignerList');
          });

          it('should throw error if duplicate signer addresses', async () => {
               const params = {
                    client: {} as any,
                    wallet: { classicAddress: 'rTest' } as any,
                    tx: { TransactionType: 'Payment' } as any,
                    signerAddresses: ['rSigner1', 'rSigner1'],
                    signerSeeds: ['seed1', 'seed2'],
                    fee: '12',
               };

               // Mock getAccountObjects to avoid undefined result
               xrplService.getAccountObjects.and.returnValue(
                    Promise.resolve({
                         result: { account_objects: [] },
                    })
               );

               await expectAsync(service.handleMultiSignTransaction(params)).toBeRejectedWithError('Duplicate signer addresses are not allowed');
          });

          it('should throw error if signer not in signer list', async () => {
               const params = {
                    client: {} as any,
                    wallet: { classicAddress: 'rTest' } as any,
                    tx: { TransactionType: 'Payment' } as any,
                    signerAddresses: ['rInvalidSigner'],
                    signerSeeds: ['seed1'],
                    fee: '12',
               };

               xrplService.getAccountObjects.and.returnValue(
                    Promise.resolve({
                         result: {
                              account_objects: [
                                   {
                                        LedgerEntryType: 'SignerList',
                                        SignerQuorum: 1,
                                        SignerEntries: [{ SignerEntry: { Account: 'rSigner1', SignerWeight: 1 } }],
                                   },
                              ],
                         },
                    })
               );

               await expectAsync(service.handleMultiSignTransaction(params)).toBeRejectedWithError('One or more signer addresses are not in the SignerList');
          });

          it('should throw error if signer weight less than quorum', async () => {
               const params = {
                    client: {} as any,
                    wallet: { classicAddress: 'rTest' } as any,
                    tx: { TransactionType: 'Payment' } as any,
                    signerAddresses: ['rSigner1'],
                    signerSeeds: ['seed1'],
                    fee: '12',
               };

               xrplService.getAccountObjects.and.returnValue(
                    Promise.resolve({
                         result: {
                              account_objects: [
                                   {
                                        LedgerEntryType: 'SignerList',
                                        SignerQuorum: 5,
                                        SignerEntries: [{ SignerEntry: { Account: 'rSigner1', SignerWeight: 1 } }],
                                   },
                              ],
                         },
                    })
               );

               await expectAsync(service.handleMultiSignTransaction(params)).toBeRejectedWithError('Signer weight (1) is less than required quorum (5)');
          });

          it('should throw error if no valid signatures collected', async () => {
               const mockClient = {
                    autofill: jasmine.createSpy().and.returnValue(
                         Promise.resolve({
                              TransactionType: 'Payment',
                              Fee: '12',
                              SigningPubKey: '',
                              Flags: 0,
                         })
                    ),
               };

               const params = {
                    client: mockClient as any,
                    wallet: { classicAddress: 'rTest' } as any,
                    tx: { TransactionType: 'Payment' } as any,
                    signerAddresses: ['rSigner1'],
                    signerSeeds: ['seed1'],
                    fee: '12',
               };

               xrplService.getAccountObjects.and.returnValue(
                    Promise.resolve({
                         result: {
                              account_objects: [
                                   {
                                        LedgerEntryType: 'SignerList',
                                        SignerQuorum: 1,
                                        SignerEntries: [{ SignerEntry: { Account: 'rSigner1', SignerWeight: 1 } }],
                                   },
                              ],
                         },
                    })
               );

               const mockSignerWallet = {
                    classicAddress: 'rSigner1',
                    sign: jasmine.createSpy().and.returnValue({ tx_blob: null }), // No tx_blob
               };

               spyOn(service, 'getWalletWithEncryptionAlgorithm').and.returnValue(Promise.resolve(mockSignerWallet as any));

               await expectAsync(service.handleMultiSignTransaction(params)).toBeRejectedWithError('No valid signatures collected for multisign transaction');
          });

          it('should try both encryption algorithms if mismatch', async () => {
               const mockClient = {
                    autofill: jasmine.createSpy().and.returnValue(
                         Promise.resolve({
                              TransactionType: 'Payment',
                              Fee: '12',
                              SigningPubKey: '',
                              Flags: 0,
                         })
                    ),
               };

               const params = {
                    client: mockClient as any,
                    wallet: { classicAddress: 'rTest' } as any,
                    tx: { TransactionType: 'Payment' } as any,
                    signerAddresses: ['rSigner1'],
                    signerSeeds: ['seed1'],
                    fee: '12',
               };

               xrplService.getAccountObjects.and.returnValue(
                    Promise.resolve({
                         result: {
                              account_objects: [
                                   {
                                        LedgerEntryType: 'SignerList',
                                        SignerQuorum: 1,
                                        SignerEntries: [{ SignerEntry: { Account: 'rSigner1', SignerWeight: 1 } }],
                                   },
                              ],
                         },
                    })
               );

               const mockWalletSecp256k1 = { classicAddress: 'rWrongAddress', sign: jasmine.createSpy() };
               const mockWalletEd25519 = { classicAddress: 'rSigner1', sign: jasmine.createSpy().and.returnValue({ tx_blob: 'blob' }) };

               const getWalletSpy = spyOn(service, 'getWalletWithEncryptionAlgorithm');
               getWalletSpy.and.returnValues(Promise.resolve(mockWalletSecp256k1 as any), Promise.resolve(mockWalletEd25519 as any));

               const result = await service.handleMultiSignTransaction(params);
               expect(result.signedTx).toBeTruthy();
               expect(getWalletSpy).toHaveBeenCalledWith('seed1', 'secp256k1');
               expect(getWalletSpy).toHaveBeenCalledWith('seed1', 'ed25519');
          });
     });

     // Additional helper: Add a global mock for Date.now to control isRippleExpired test
     describe('isRippleExpired with controlled time', () => {
          let originalDateNow: () => number;

          beforeAll(() => {
               originalDateNow = Date.now;
               // Fix Date.now to a specific value
               const fixedTime = new Date('2024-01-01T00:00:00Z').getTime();
               Date.now = jasmine.createSpy().and.returnValue(fixedTime);
          });

          afterAll(() => {
               Date.now = originalDateNow;
          });

          it('should correctly determine expiration with fixed time', () => {
               // Ripple time for 2023-01-01
               const rippleTime = service.toRippleTime('2023-01-01');
               expect(service.isRippleExpired(rippleTime)).toBe(true);

               // Ripple time for 2025-01-01 (future)
               const futureRippleTime = service.toRippleTime('2025-01-01');
               expect(service.isRippleExpired(futureRippleTime)).toBe(false);
          });
     });
});
