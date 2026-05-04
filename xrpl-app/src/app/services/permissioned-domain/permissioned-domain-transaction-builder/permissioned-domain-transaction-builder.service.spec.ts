import { TestBed } from '@angular/core/testing';
import { PermissionedDomainTransactionBuilderService } from './permissioned-domain-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';

// Mock Buffer for tests
(window as any).Buffer = {
     from: (str: string) => ({
          toString: (encoding: string) => {
               // Simple hex conversion for testing
               let hex = '';
               for (let i = 0; i < str.length; i++) {
                    const charCode = str.charCodeAt(i);
                    hex += charCode.toString(16).padStart(2, '0');
               }
               return hex;
          },
     }),
};
// Helper function to convert string to hex without Buffer
function stringToHex(str: string): string {
     let hex = '';
     for (let i = 0; i < str.length; i++) {
          const charCode = str.charCodeAt(i);
          hex += charCode.toString(16).padStart(2, '0');
     }
     return hex;
}

describe('PermissionedDomainTransactionBuilderService', () => {
     let service: PermissionedDomainTransactionBuilderService;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;

     const mockWallet: xrpl.Wallet = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          publicKey: 'test-public-key',
          privateKey: 'test-private-key',
     } as any;

     const mockEnv: PrepareTxEnvironmentResult = {
          fee: '12',
          ledgerInfo: {
               lastIndex: 1000,
          },
     } as any;

     beforeEach(() => {
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['someMethod']);

          TestBed.configureTestingModule({
               providers: [PermissionedDomainTransactionBuilderService, { provide: UtilsService, useValue: mockUtilsService }],
          });

          service = TestBed.inject(PermissionedDomainTransactionBuilderService);
     });

     describe('buildDeletePermissionedDomainTransaction', () => {
          it('should build a valid PermissionedDomainDelete transaction', () => {
               const permissionedDomain = {
                    selectedDomainId: 'domain123',
               };

               const tx = service.buildDeletePermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               expect(tx.TransactionType).toBe('PermissionedDomainDelete');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.DomainID).toBe('domain123');
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should handle different domain IDs', () => {
               const permissionedDomain = {
                    selectedDomainId: 'different-domain-456',
               };

               const tx = service.buildDeletePermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               expect(tx.DomainID).toBe('different-domain-456');
          });
     });

     describe('buildSetPermissionedDomainTransaction', () => {
          it('should build a valid PermissionedDomainSet transaction for new domain', () => {
               const permissionedDomain = {
                    setAcceptedCredentials: [
                         { issuer: 'rIssuer1', credentialType: 'credential1' },
                         { issuer: 'rIssuer2', credentialType: 'credential2' },
                    ],
                    domainMode: 'create',
               };

               const tx = service.buildSetPermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               expect(tx.TransactionType).toBe('PermissionedDomainSet');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
               expect(tx.AcceptedCredentials).toBeDefined();
               expect(tx.AcceptedCredentials?.length).toBe(2);
               expect(tx.DomainID).toBeUndefined();
          });

          it('should convert credentialType to hex correctly', () => {
               const permissionedDomain = {
                    setAcceptedCredentials: [{ issuer: 'rIssuer1', credentialType: 'testCredential' }],
               };

               const tx = service.buildSetPermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               const expectedHex = stringToHex('testCredential');
               expect(tx.AcceptedCredentials?.[0]?.Credential?.CredentialType).toBe(expectedHex);
               expect(tx.AcceptedCredentials?.[0]?.Credential?.Issuer).toBe('rIssuer1');
          });

          it('should handle empty credentials array', () => {
               const permissionedDomain = {
                    setAcceptedCredentials: [],
                    domainMode: 'create',
               };

               const tx = service.buildSetPermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               expect(tx.AcceptedCredentials).toEqual([]);
          });

          it('should handle undefined setAcceptedCredentials', () => {
               const permissionedDomain = {
                    domainMode: 'create',
               };

               const tx = service.buildSetPermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               expect(tx.AcceptedCredentials).toEqual([]);
          });

          it('should include DomainID when domainMode is update and domainId exists', () => {
               const permissionedDomain = {
                    setAcceptedCredentials: [{ issuer: 'rIssuer1', credentialType: 'credential1' }],
                    domainMode: 'update',
                    domainId: 'existing-domain-789',
               };

               const tx = service.buildSetPermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               expect(tx.DomainID).toBe('existing-domain-789');
               expect(tx.AcceptedCredentials).toBeDefined();
          });

          it('should not include DomainID when domainMode is update but domainId is missing', () => {
               const permissionedDomain = {
                    setAcceptedCredentials: [{ issuer: 'rIssuer1', credentialType: 'credential1' }],
                    domainMode: 'update',
               };

               const tx = service.buildSetPermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               expect(tx.DomainID).toBeUndefined();
          });

          it('should not include DomainID when domainMode is create', () => {
               const permissionedDomain = {
                    setAcceptedCredentials: [{ issuer: 'rIssuer1', credentialType: 'credential1' }],
                    domainMode: 'create',
                    domainId: 'some-id', // Should be ignored in create mode
               };

               const tx = service.buildSetPermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               expect(tx.DomainID).toBeUndefined();
          });

          it('should handle multiple credentials properly', () => {
               const permissionedDomain = {
                    setAcceptedCredentials: [
                         { issuer: 'rIssuer1', credentialType: 'type1' },
                         { issuer: 'rIssuer2', credentialType: 'type2' },
                         { issuer: 'rIssuer3', credentialType: 'type3' },
                    ],
               };

               const tx = service.buildSetPermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               expect(tx.AcceptedCredentials?.length).toBe(3);
               expect(tx.AcceptedCredentials?.[0]?.Credential?.Issuer).toBe('rIssuer1');
               expect(tx.AcceptedCredentials?.[1]?.Credential?.Issuer).toBe('rIssuer2');
               expect(tx.AcceptedCredentials?.[2]?.Credential?.Issuer).toBe('rIssuer3');
          });

          it('should handle special characters in credentialType', () => {
               const permissionedDomain = {
                    setAcceptedCredentials: [{ issuer: 'rIssuer1', credentialType: 'test@#$%' }],
               };

               const tx = service.buildSetPermissionedDomainTransaction(mockWallet, mockEnv, permissionedDomain);

               const expectedHex = stringToHex('test@#$%');
               expect(tx.AcceptedCredentials?.[0]?.Credential?.CredentialType).toBe(expectedHex);
          });
     });
});
