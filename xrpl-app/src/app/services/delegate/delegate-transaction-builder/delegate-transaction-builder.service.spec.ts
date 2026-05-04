import { TestBed } from '@angular/core/testing';
import { DelegateTransactionBuilderService } from './delegate-transaction-builder.service';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';

// Mock classes
class MockTrustlineUtilService {}
class MockUtilsService {}
class MockXrplTransactionService {}

describe('DelegateTransactionBuilderService', () => {
     let service: DelegateTransactionBuilderService;
     let utilsService: MockUtilsService;
     let xrplTransactionService: MockXrplTransactionService;
     let trustlineUtilService: MockTrustlineUtilService;
     let mockWallet: any;
     let mockEnv: any;
     let mockDelegate: any;
     let mockAccount: any;
     let mockTxOptions: any;

     beforeEach(() => {
          utilsService = new MockUtilsService();
          xrplTransactionService = new MockXrplTransactionService();
          trustlineUtilService = new MockTrustlineUtilService();

          mockWallet = {
               address: 'rTestAddress1234567890',
               classicAddress: 'rTestAddress1234567890',
               publicKey: 'PUBKEY123',
               privateKey: 'PRIVKEY123',
          };

          mockEnv = {
               fee: '12',
               ledgerInfo: {
                    lastIndex: 123456,
                    currentRippleTime: 500000,
               },
          };

          mockDelegate = {
               ticketCountField: '5',
          };

          mockAccount = {
               multiSignAddress: 'rMultiSign',
               multiSignSeeds: ['seed1', 'seed2'],
          };

          mockTxOptions = {
               isSimulateEnabled: false,
               useMultiSign: false,
          };

          TestBed.configureTestingModule({
               providers: [DelegateTransactionBuilderService, { provide: UtilsService, useValue: utilsService }, { provide: XrplTransactionService, useValue: xrplTransactionService }, { provide: TrustlineUtilService, useValue: trustlineUtilService }],
          });

          service = TestBed.inject(DelegateTransactionBuilderService);
     });

     describe('buildDelegateTx', () => {
          it('should build a DelegateSet transaction', () => {
               const tx = service.buildDelegateTx(mockWallet, mockEnv, mockDelegate, mockAccount, mockTxOptions);

               expect(tx).toBeDefined();
               expect(tx.TransactionType).toBe('DelegateSet');
               expect(tx.Account).toBe(mockWallet.address);
               expect(tx.Authorize).toBe(mockDelegate.ticketCountField);
               expect(tx.Permissions).toEqual([]);
          });

          it('should handle different ticket count values as strings', () => {
               const testCases = ['1', '10', '100', '5', '0'];

               for (const ticketCount of testCases) {
                    const delegate = { ticketCountField: ticketCount };
                    const tx = service.buildDelegateTx(mockWallet, mockEnv, delegate, mockAccount, mockTxOptions);

                    expect(tx.Authorize).toBe(ticketCount);
               }
          });

          it('should use wallet address from provided wallet', () => {
               const customWallet = {
                    address: 'rCustomAddress123',
                    classicAddress: 'rCustomAddress123',
               };

               const tx = service.buildDelegateTx(customWallet, mockEnv, mockDelegate, mockAccount, mockTxOptions);

               expect(tx.Account).toBe('rCustomAddress123');
          });

          it('should always return empty Permissions array', () => {
               const tx = service.buildDelegateTx(mockWallet, mockEnv, mockDelegate, mockAccount, mockTxOptions);

               expect(tx.Permissions).toBeDefined();
               expect(Array.isArray(tx.Permissions)).toBe(true);
               expect(tx.Permissions.length).toBe(0);
          });

          it('should accept delegate with ticketCountField as string', () => {
               const delegateWithString = { ticketCountField: '99' };
               const tx = service.buildDelegateTx(mockWallet, mockEnv, delegateWithString, mockAccount, mockTxOptions);

               expect(tx.Authorize).toBe('99');
          });

          it('should handle undefined delegate fields', () => {
               const emptyDelegate = {};
               const tx = service.buildDelegateTx(mockWallet, mockEnv, emptyDelegate, mockAccount, mockTxOptions);

               expect(tx.Authorize).toBeUndefined();
               expect(tx.TransactionType).toBe('DelegateSet');
               expect(tx.Account).toBe(mockWallet.address);
          });

          it('should handle null delegate', () => {
               // The service will try to access ticketCountField on null
               // This will throw an error, so we expect it to fail
               expect(() => {
                    service.buildDelegateTx(mockWallet, mockEnv, null, mockAccount, mockTxOptions);
               }).toThrow();
          });

          it('should handle wallet with only address property', () => {
               const wallet = { address: 'rAddress1' };
               const tx = service.buildDelegateTx(wallet, mockEnv, mockDelegate, mockAccount, mockTxOptions);
               expect(tx.Account).toBe('rAddress1');
          });

          it('should handle wallet with classicAddress property', () => {
               const wallet = { classicAddress: 'rClassic3' };
               const tx = service.buildDelegateTx(wallet, mockEnv, mockDelegate, mockAccount, mockTxOptions);
               // The service uses wallet.address, so this would be undefined
               expect(tx.Account).toBeUndefined();
          });

          it('should preserve the transaction structure', () => {
               const tx = service.buildDelegateTx(mockWallet, mockEnv, mockDelegate, mockAccount, mockTxOptions);

               // Verify all expected properties exist using direct property checks
               expect(tx.TransactionType).toBeDefined();
               expect(tx.Account).toBeDefined();
               expect(tx.Authorize).toBeDefined();
               expect(tx.Permissions).toBeDefined();

               // Verify no unexpected extra properties
               const expectedProps = ['TransactionType', 'Account', 'Authorize', 'Permissions'];
               const actualProps = Object.keys(tx);

               // Every actual property should be in expected props
               for (const prop of actualProps) {
                    expect(expectedProps).toContain(prop);
               }
          });

          it('should work with different env objects', () => {
               const envVariants = [{ fee: '10' }, { fee: '12', ledgerInfo: { lastIndex: 100 } }, {}];

               for (const env of envVariants) {
                    const tx = service.buildDelegateTx(mockWallet, env, mockDelegate, mockAccount, mockTxOptions);
                    expect(tx.TransactionType).toBe('DelegateSet');
               }
          });

          it('should work with different account objects', () => {
               const accounts = [{ multiSignAddress: 'rMS1' }, { multiSignSeeds: ['s1', 's2'] }, {}, null];

               for (const account of accounts) {
                    const tx = service.buildDelegateTx(mockWallet, mockEnv, mockDelegate, account, mockTxOptions);
                    expect(tx.TransactionType).toBe('DelegateSet');
               }
          });

          it('should work with different txOptions', () => {
               const options = [{ isSimulateEnabled: true }, { useMultiSign: true }, { isSimulateEnabled: true, useMultiSign: true }, {}];

               for (const optionsObj of options) {
                    const tx = service.buildDelegateTx(mockWallet, mockEnv, mockDelegate, mockAccount, optionsObj);
                    expect(tx.TransactionType).toBe('DelegateSet');
               }
          });
     });
});
