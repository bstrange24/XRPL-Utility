import { TestBed } from '@angular/core/testing';
import { CredentialTransactionBuilderService } from './credential-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';

// Mock Buffer on window object
beforeAll(() => {
     (window as any).Buffer = {
          from: (str: string, encoding: string) => ({
               toString: (format: string) => {
                    if (format === 'hex') {
                         let hex = '';
                         for (let i = 0; i < str.length; i++) {
                              const charCode = str.charCodeAt(i);
                              hex += charCode.toString(16).padStart(2, '0');
                         }
                         return hex;
                    }
                    return str;
               },
          }),
     };
});

describe('CredentialTransactionBuilderService', () => {
     let service: CredentialTransactionBuilderService;
     let utilsServiceMock: any;

     const mockWallet = { classicAddress: 'rTestWallet', address: 'rTestWallet' } as xrpl.Wallet;
     const mockEnv = {
          fee: '12',
          ledgerInfo: { lastIndex: 5000 },
     } as any;

     const mockCredential = {
          subject: 'rSubject',
          credentialType: 'KYC-LEVEL-1',
          expirationDate: '2024-12-31T23:59:59',
          uri: 'https://example.com/credential',
     };

     const mockPreparedConfig = {
          expirationDate: '1704067199',
          uri: 'https://example.com/credential',
          credentialIssuer: 'rIssuer',
     };

     beforeEach(() => {
          utilsServiceMock = {
               setURI: jasmine.createSpy('setURI'),
               encodeIfNeeded: jasmine.createSpy('encodeIfNeeded').and.callFake((value: string) => value),
          };

          TestBed.configureTestingModule({
               providers: [CredentialTransactionBuilderService, { provide: UtilsService, useValue: utilsServiceMock }],
          });

          service = TestBed.inject(CredentialTransactionBuilderService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('buildCreateCredentialTx', () => {
          it('should build basic CredentialCreate transaction', () => {
               const tx = service.buildCreateCredentialTx(mockWallet, mockEnv, mockCredential, {});

               expect(tx.TransactionType).toBe('CredentialCreate');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Subject).toBe(mockCredential.subject);
               expect(tx.Fee).toBe(mockEnv.fee);
               expect(tx.LastLedgerSequence).toBe(mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should include Expiration when provided', () => {
               const tx = service.buildCreateCredentialTx(mockWallet, mockEnv, mockCredential, mockPreparedConfig);
               expect(tx.Expiration).toBe(Number(mockPreparedConfig.expirationDate));
          });

          it('should not include Expiration when not provided', () => {
               const tx = service.buildCreateCredentialTx(mockWallet, mockEnv, mockCredential, {});
               expect(tx.Expiration).toBeUndefined();
          });

          it('should set URI when provided', () => {
               service.buildCreateCredentialTx(mockWallet, mockEnv, mockCredential, mockPreparedConfig);
               expect(utilsServiceMock.setURI).toHaveBeenCalledWith(jasmine.any(Object), mockCredential.uri);
          });

          it('should not set URI when not provided', () => {
               const configWithoutUri = { ...mockPreparedConfig, uri: undefined };
               service.buildCreateCredentialTx(mockWallet, mockEnv, mockCredential, configWithoutUri);
               expect(utilsServiceMock.setURI).not.toHaveBeenCalled();
          });
     });

     describe('buildAcceptCredentialTx', () => {
          it('should build basic CredentialAccept transaction', () => {
               const tx = service.buildAcceptCredentialTx(mockWallet, mockEnv, mockCredential, mockPreparedConfig);

               expect(tx.TransactionType).toBe('CredentialAccept');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Issuer).toBe(mockPreparedConfig.credentialIssuer);
               expect(tx.Fee).toBe(mockEnv.fee);
               expect(tx.LastLedgerSequence).toBe(mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should handle empty preparedConfig', () => {
               const tx = service.buildAcceptCredentialTx(mockWallet, mockEnv, mockCredential, {});
               expect(tx.Issuer).toBeUndefined();
          });
     });

     describe('buildDeleteCredentialTx', () => {
          it('should build basic CredentialDelete transaction', () => {
               const tx = service.buildDeleteCredentialTx(mockWallet, mockEnv, mockCredential);

               expect(tx.TransactionType).toBe('CredentialDelete');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Subject).toBe(mockCredential.subject);
               expect(tx.Fee).toBe(mockEnv.fee);
               expect(tx.LastLedgerSequence).toBe(mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
          });
     });
});
