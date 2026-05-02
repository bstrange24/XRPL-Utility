import { TestBed } from '@angular/core/testing';
import { DidTransactionBuilderService } from './did-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { DidUtilService } from '../did-util/did-util.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';

describe('DidTransactionBuilderService', () => {
     let service: DidTransactionBuilderService;
     let utilsServiceMock: any;
     let didUtilServiceMock: any;

     const mockWallet = { classicAddress: 'rTestWallet', address: 'rTestWallet' } as xrpl.Wallet;
     const mockEnv = {
          fee: '12',
          ledgerInfo: { lastIndex: 5000 },
     } as any;

     const mockHexData = '7b22646964223a226469643a6578616d706c65227d';

     beforeEach(() => {
          utilsServiceMock = {};

          didUtilServiceMock = {
               jsonToHex: jasmine.createSpy('jsonToHex').and.returnValue(mockHexData),
               validateAndConvertDidJson: jasmine.createSpy('validateAndConvertDidJson').and.returnValue({ success: true, hexData: mockHexData }),
          };

          TestBed.configureTestingModule({
               providers: [DidTransactionBuilderService, { provide: UtilsService, useValue: utilsServiceMock }, { provide: DidUtilService, useValue: didUtilServiceMock }],
          });

          service = TestBed.inject(DidTransactionBuilderService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('buildDidSetTransaction', () => {
          const mockDid = {
               didDocumentData: '{"did":"did:example:123"}',
               uriData: 'https://example.com/did',
               didData: '{"did":"did:example:456"}',
          };

          it('should build basic DIDSet transaction', () => {
               const tx = service.buildDidSetTransaction(mockWallet, mockEnv, {});

               expect(tx.TransactionType).toBe('DIDSet');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Fee).toBe(mockEnv.fee);
               expect(tx.LastLedgerSequence).toBe(mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should set DIDDocument when provided', () => {
               const tx = service.buildDidSetTransaction(mockWallet, mockEnv, mockDid);
               expect(tx.DIDDocument).toBe(mockHexData);
               expect(didUtilServiceMock.jsonToHex).toHaveBeenCalledWith(mockDid.didDocumentData);
          });

          it('should set URI when provided', () => {
               const tx = service.buildDidSetTransaction(mockWallet, mockEnv, mockDid);
               expect(tx.URI).toBe(mockHexData);
               expect(didUtilServiceMock.jsonToHex).toHaveBeenCalledWith(mockDid.uriData);
          });

          it('should set Data when didData is provided and valid', () => {
               const tx = service.buildDidSetTransaction(mockWallet, mockEnv, mockDid);
               expect(tx.Data).toBe(mockHexData);
               expect(didUtilServiceMock.validateAndConvertDidJson).toHaveBeenCalledWith(mockDid.didData, jasmine.any(Object));
          });

          it('should throw error when didData validation fails', () => {
               didUtilServiceMock.validateAndConvertDidJson.and.returnValue({ success: false, errors: 'Invalid DID format' });
               expect(() => service.buildDidSetTransaction(mockWallet, mockEnv, mockDid)).toThrowError('Invalid DID format');
          });

          it('should not set optional fields when not provided', () => {
               const tx = service.buildDidSetTransaction(mockWallet, mockEnv, {});
               expect(tx.DIDDocument).toBeUndefined();
               expect(tx.URI).toBeUndefined();
               expect(tx.Data).toBeUndefined();
          });

          it('should handle empty strings for optional fields', () => {
               const didWithEmpty = {
                    didDocumentData: '',
                    uriData: '',
                    didData: '',
               };
               const tx = service.buildDidSetTransaction(mockWallet, mockEnv, didWithEmpty);
               expect(tx.DIDDocument).toBeUndefined();
               expect(tx.URI).toBeUndefined();
               expect(tx.Data).toBeUndefined();
          });

          // it('should handle whitespace-only strings', () => {
          //      const didWithWhitespace = {
          //           didDocumentData: '   ',
          //           uriData: '   ',
          //           didData: '   ',
          //      };
          //      const tx = service.buildDidSetTransaction(mockWallet, mockEnv, didWithWhitespace);
          //      expect(tx.DIDDocument).toBeUndefined();
          //      expect(tx.URI).toBeUndefined();
          //      expect(tx.Data).toBeUndefined();
          // });
     });

     describe('buildDidDeleteTransaction', () => {
          it('should build basic DIDDelete transaction', () => {
               const tx = service.buildDidDeleteTransaction(mockWallet, mockEnv);

               expect(tx.TransactionType).toBe('DIDDelete');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Fee).toBe(mockEnv.fee);
               expect(tx.LastLedgerSequence).toBe(mockEnv.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should not include any optional fields', () => {
               const tx = service.buildDidDeleteTransaction(mockWallet, mockEnv);
               const txKeys = Object.keys(tx);
               expect(txKeys).toContain('TransactionType');
               expect(txKeys).toContain('Account');
               expect(txKeys).toContain('Fee');
               expect(txKeys).toContain('LastLedgerSequence');
               expect(txKeys.length).toBe(4);
          });
     });

     describe('Edge Cases', () => {
          it('should handle very long hex data', () => {
               const longHex = 'a'.repeat(1024);
               didUtilServiceMock.jsonToHex.and.returnValue(longHex);
               const mockDidWithLongData = {
                    didDocumentData: longHex,
               };
               const tx = service.buildDidSetTransaction(mockWallet, mockEnv, mockDidWithLongData);
               expect(tx.DIDDocument).toBe(longHex);
          });

          it('should handle special characters in DID data', () => {
               const specialChars = '!@#$%^&*()';
               didUtilServiceMock.jsonToHex.and.returnValue('7370656369616c');
               const mockDidWithSpecial = {
                    didData: specialChars,
               };
               const tx = service.buildDidSetTransaction(mockWallet, mockEnv, mockDidWithSpecial);
               expect(tx.Data).toBeDefined();
          });
     });
});
