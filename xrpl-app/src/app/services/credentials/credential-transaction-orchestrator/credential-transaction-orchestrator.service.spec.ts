import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CredentialTransactionOrchestratorService } from './credential-transaction-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { CredentialTransactionBuilderService } from '../credential-transaction-builder/credential-transaction-builder.service';
import { CredentialUtilService } from '../credential-util/credential-util.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { CREDENTIAL_TX_TYPES } from '../../../components/credentials/constants/credential.constants';
import { AppConstants } from '../../../core/app.constants';

// Mock Buffer globally
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

// Mock Performance API
beforeAll(() => {
     const mockPerformance = {
          mark: jasmine.createSpy('mark'),
          measure: jasmine.createSpy('measure'),
          clearMarks: jasmine.createSpy('clearMarks'),
          clearMeasures: jasmine.createSpy('clearMeasures'),
          getEntriesByName: jasmine.createSpy('getEntriesByName').and.returnValue([{ duration: 123.45 } as PerformanceEntry]),
     };
     Object.defineProperty(window, 'performance', {
          value: mockPerformance,
          configurable: true,
          writable: true,
     });
});

describe('CredentialTransactionOrchestratorService', () => {
     let service: CredentialTransactionOrchestratorService;
     let txEnvironmentServiceMock: any;
     let validatorMock: any;
     let xrplTransactionServiceMock: any;
     let txUiServiceMock: any;
     let toastServiceMock: any;
     let transactionOptionalFieldsServiceMock: any;
     let sufficentAccountBalanceServiceMock: any;
     let xrplTransactionOrchestratorServiceMock: any;
     let credentialTransactionBuilderServiceMock: any;
     let credentialUtilServiceMock: any;
     let xrplDateServiceMock: any;

     const mockWallet = { address: 'rTestWallet', classicAddress: 'rTestWallet', seed: 'seed123' };
     const mockClient = { disconnect: jasmine.createSpy('disconnect') };
     const mockEnv = {
          client: mockClient,
          wallet: mockWallet,
          accountInfo: { result: { account_data: { Sequence: 100 } } },
          fee: '12',
          ledgerInfo: { lastIndex: 5000 },
          accountObjects: { result: { account_objects: [] } },
     };
     const mockTxHash = 'txHash123';
     const mockTx = { TransactionType: 'CredentialCreate', Sequence: 100 };

     const mockCredential = {
          subject: 'rSubject',
          credentialType: 'KYC-LEVEL-1',
          expirationDate: '2024-12-31T23:59:59',
          uri: 'https://example.com/credential',
          credentialID: 'cred123',
          credentialIssuer: 'rIssuer',
     };

     beforeEach(() => {
          txEnvironmentServiceMock = {
               prepareTxEnvironment: jasmine.createSpy('prepareTxEnvironment').and.resolveTo(mockEnv),
          };

          validatorMock = {
               validate: jasmine.createSpy('validate').and.resolveTo([]),
          };

          xrplTransactionServiceMock = {
               waitForFinalOutcome: jasmine.createSpy('waitForFinalOutcome').and.resolveTo({ success: true }),
               processTxFinalResult: jasmine.createSpy('processTxFinalResult'),
               processTxError: jasmine.createSpy('processTxError'),
          };

          txUiServiceMock = {
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               setTxResultSignal: jasmine.createSpy('setTxResultSignal'),
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          toastServiceMock = {
               success: jasmine.createSpy('success'),
               error: jasmine.createSpy('error'),
               info: jasmine.createSpy('info'),
          };

          transactionOptionalFieldsServiceMock = {
               setTxOptionalFields: jasmine.createSpy('setTxOptionalFields').and.resolveTo(),
          };

          sufficentAccountBalanceServiceMock = {
               checkXrpBalance: jasmine.createSpy('checkXrpBalance').and.resolveTo({ success: true }),
          };

          xrplTransactionOrchestratorServiceMock = {
               executeTx: jasmine.createSpy('executeTx').and.resolveTo({ success: true, hash: mockTxHash, mode: 'submit' }),
          };

          credentialTransactionBuilderServiceMock = {
               buildCreateCredentialTx: jasmine.createSpy('buildCreateCredentialTx').and.returnValue(mockTx),
               buildAcceptCredentialTx: jasmine.createSpy('buildAcceptCredentialTx').and.returnValue(mockTx),
               buildDeleteCredentialTx: jasmine.createSpy('buildDeleteCredentialTx').and.returnValue(mockTx),
          };

          credentialUtilServiceMock = {};

          xrplDateServiceMock = {
               toRippleTime: jasmine.createSpy('toRippleTime').and.returnValue(1704067199),
          };

          TestBed.configureTestingModule({
               providers: [
                    CredentialTransactionOrchestratorService,
                    { provide: TxEnvironmentService, useValue: txEnvironmentServiceMock },
                    { provide: ValidationService, useValue: validatorMock },
                    { provide: XrplTransactionService, useValue: xrplTransactionServiceMock },
                    { provide: TransactionUiService, useValue: txUiServiceMock },
                    { provide: ToastService, useValue: toastServiceMock },
                    { provide: TransactionOptionalFieldsService, useValue: transactionOptionalFieldsServiceMock },
                    { provide: SufficentAccountBalanceService, useValue: sufficentAccountBalanceServiceMock },
                    { provide: XrplTransactionOrchestratorService, useValue: xrplTransactionOrchestratorServiceMock },
                    { provide: CredentialTransactionBuilderService, useValue: credentialTransactionBuilderServiceMock },
                    { provide: CredentialUtilService, useValue: credentialUtilServiceMock },
                    { provide: XrplDateService, useValue: xrplDateServiceMock },
               ],
          });

          service = TestBed.inject(CredentialTransactionOrchestratorService);
     });

     afterEach(() => {
          if (txEnvironmentServiceMock.prepareTxEnvironment) {
               txEnvironmentServiceMock.prepareTxEnvironment.calls.reset();
          }
          if (validatorMock.validate) {
               validatorMock.validate.calls.reset();
          }
          if (xrplTransactionOrchestratorServiceMock.executeTx) {
               xrplTransactionOrchestratorServiceMock.executeTx.calls.reset();
          }
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('executeCredentialTx', () => {
          const baseConfig = {
               credential: mockCredential,
               account: {},
               txOptions: { isSimulateEnabled: false },
               preFetchedEnv: mockEnv,
               wallet: mockWallet,
          };

          describe('createCredential', () => {
               it('should execute createCredential transaction successfully', async () => {
                    const result = await service.executeCredentialTx('createCredential', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe(mockTxHash);
                    expect(credentialTransactionBuilderServiceMock.buildCreateCredentialTx).toHaveBeenCalled();
               });
          });

          describe('acceptCredentials', () => {
               it('should execute acceptCredentials transaction successfully', async () => {
                    const result = await service.executeCredentialTx('acceptCredentials', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(credentialTransactionBuilderServiceMock.buildAcceptCredentialTx).toHaveBeenCalled();
               });
          });

          describe('deleteCredentials', () => {
               it('should execute deleteCredentials transaction successfully', async () => {
                    const result = await service.executeCredentialTx('deleteCredentials', baseConfig as any);
                    expect(result.success).toBeTrue();
                    expect(credentialTransactionBuilderServiceMock.buildDeleteCredentialTx).toHaveBeenCalled();
               });
          });

          describe('Common behavior', () => {
               it('should return validation error when validation fails', async () => {
                    validatorMock.validate.and.resolveTo(['Error 1', 'Error 2']);
                    const result = await service.executeCredentialTx('createCredential', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Error 1');
               });

               it('should handle transaction execution error', async () => {
                    xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: false, error: 'Tx failed' });
                    const result = await service.executeCredentialTx('createCredential', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Tx failed');
               });

               it('should handle simulation mode', async () => {
                    const simulateConfig = {
                         ...baseConfig,
                         txOptions: { isSimulateEnabled: true },
                    };
                    xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({ success: true, mode: 'simulate', hash: mockTxHash });
                    const result = await service.executeCredentialTx('createCredential', simulateConfig as any);
                    expect(result.success).toBeTrue();
                    expect(toastServiceMock.success).toHaveBeenCalled();
               });

               // it('should handle missing network data', async () => {
               //      // The prepareTxEnvironment returns an env without required fields
               //      txEnvironmentServiceMock.prepareTxEnvironment.and.resolveTo({ client: mockClient });
               //      const result = await service.executeCredentialTx('createCredential', baseConfig as any);
               //      // The method throws an error which is caught and returns success: false
               //      expect(result.success).toBeFalse();
               //      expect(result.error).toBeDefined();
               // });

               it('should handle insufficient balance', async () => {
                    sufficentAccountBalanceServiceMock.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient balance' });
                    const result = await service.executeCredentialTx('createCredential', baseConfig as any);
                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient balance');
               });

               // it('should handle generic error', async () => {
               //      txEnvironmentServiceMock.prepareTxEnvironment.and.rejectWith(new Error('Network error'));
               //      const result = await service.executeCredentialTx('createCredential', baseConfig as any);
               //      // The error is caught, processTxError is called, and success is false
               //      expect(result.success).toBeFalse();
               //      expect(xrplTransactionServiceMock.processTxError).toHaveBeenCalled();
               // });
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should handle simulation success', () => {
               const result = service.handleSimulationSuccess('createCredential', mockCredential, mockTxHash);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe(mockTxHash);
               expect(toastServiceMock.success).toHaveBeenCalled();
          });
     });

     describe('prepareCredentialConfig', () => {
          it('should prepare config for createCredential with expiration date', async () => {
               const config = { ...mockCredential, expirationDate: '2024-12-31T23:59:59' };
               const result = await (service as any).prepareCredentialConfig('createCredential', config, mockEnv);
               expect(xrplDateServiceMock.toRippleTime).toHaveBeenCalled();
               expect(result.expirationDate).toBe('1704067199');
          });

          it('should enrich acceptCredentials config from ledger', async () => {
               const mockCredObject = {
                    LedgerEntryType: 'Credential',
                    index: 'cred123',
                    Subject: 'rSubjectFromLedger',
                    Issuer: 'rIssuerFromLedger',
                    CredentialType: 'KYC-LEVEL-1',
               };
               const envWithCred = {
                    ...mockEnv,
                    accountObjects: { result: { account_objects: [mockCredObject] } },
               };
               const config = { credentialID: 'cred123' };
               const result = await (service as any).prepareCredentialConfig('acceptCredentials', config, envWithCred);
               expect(result.subject).toBe('rSubjectFromLedger');
               expect(result.credentialIssuer).toBe('rIssuerFromLedger');
               expect(result.credentialType).toBe('KYC-LEVEL-1');
          });

          it('should enrich deleteCredentials config from ledger', async () => {
               const mockCredObject = {
                    LedgerEntryType: 'Credential',
                    index: 'cred123',
                    Subject: 'rSubjectFromLedger',
                    Issuer: 'rIssuerFromLedger',
                    CredentialType: 'KYC-LEVEL-1',
               };
               const envWithCred = {
                    ...mockEnv,
                    accountObjects: { result: { account_objects: [mockCredObject] } },
               };
               const config = { credentialID: 'cred123' };
               const result = await (service as any).prepareCredentialConfig('deleteCredentials', config, envWithCred);
               expect(result.subject).toBe('rSubjectFromLedger');
               expect(result.credentialIssuer).toBe('rIssuerFromLedger');
               expect(result.credentialType).toBe('KYC-LEVEL-1');
          });
     });
});
