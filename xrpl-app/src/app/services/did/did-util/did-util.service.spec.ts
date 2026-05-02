import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { DidTransactionBuilderService } from '../did-transaction-builder/did-transaction-builder.service';
import { DidUtilService } from '../did-util/did-util.service';
import { DidStoreService } from '../did-store/did-store.service';
import { DidTransactionOrchestratorService } from '../did-transaction-orchestrator/did-transaction-orchestrator.service';
import * as xrpl from 'xrpl';
import { LogServiceService } from '../../shared/log-service/log-service.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
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
                    if (format === 'utf8') {
                         return str;
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

describe('DidTransactionOrchestratorService', () => {
     let service: DidTransactionOrchestratorService;

     let txEnvironmentServiceMock: jasmine.SpyObj<TxEnvironmentService>;
     let validatorMock: jasmine.SpyObj<ValidationService>;
     let xrplTransactionServiceMock: jasmine.SpyObj<XrplTransactionService>;
     let txUiServiceMock: jasmine.SpyObj<TransactionUiService>;
     let toastServiceMock: jasmine.SpyObj<ToastService>;
     let transactionOptionalFieldsServiceMock: jasmine.SpyObj<TransactionOptionalFieldsService>;
     let sufficentAccountBalanceServiceMock: jasmine.SpyObj<SufficentAccountBalanceService>;
     let xrplTransactionOrchestratorServiceMock: jasmine.SpyObj<XrplTransactionOrchestratorService>;
     let didTransactionBuilderServiceMock: jasmine.SpyObj<DidTransactionBuilderService>;
     let didUtilServiceMock: jasmine.SpyObj<DidUtilService>;
     let didStoreServiceMock: jasmine.SpyObj<typeof DidStoreService>;

     const mockWallet = { address: 'rTestWallet', classicAddress: 'rTestWallet', seed: 'seed123' } as any;
     const mockClient = {} as xrpl.Client;

     const mockEnv = {
          client: mockClient,
          wallet: mockWallet,
          accountInfo: { result: { account_data: { Sequence: 100 } } },
          fee: '12',
          ledgerInfo: { lastIndex: 5000 },
     } as any;

     const mockTxHash = 'txHash123';
     const mockTx = {
          TransactionType: 'DIDSet',
          Account: 'rTestWallet',
          Sequence: 100,
          Fee: '12',
     } as xrpl.DIDSet;

     const mockDid = {
          didDocumentData: '{"did":"did:example:123"}',
          uriData: 'https://example.com/did',
          didData: '{"did":"did:example:456"}',
     };

     const baseConfig = {
          did: mockDid,
          account: {},
          txOptions: { isSimulateEnabled: false },
          preFetchedEnv: null as any,
          wallet: mockWallet,
     };

     beforeEach(() => {
          txEnvironmentServiceMock = jasmine.createSpyObj('TxEnvironmentService', ['prepareTxEnvironment']);
          validatorMock = jasmine.createSpyObj('ValidationService', ['validate']);
          xrplTransactionServiceMock = jasmine.createSpyObj('XrplTransactionService', ['waitForFinalOutcome', 'processTxFinalResult', 'processTxError']);
          txUiServiceMock = jasmine.createSpyObj('TransactionUiService', ['resetCurrentStepToIdle', 'clearAllOptionsAndMessages', 'setTxResultSignal']);
          Object.defineProperty(txUiServiceMock, 'explorerUrl', {
               value: signal('https://testnet.xrpl.org/'),
               writable: true,
          });

          toastServiceMock = jasmine.createSpyObj('ToastService', ['success', 'error', 'info']);
          transactionOptionalFieldsServiceMock = jasmine.createSpyObj('TransactionOptionalFieldsService', ['setTxOptionalFields']);
          sufficentAccountBalanceServiceMock = jasmine.createSpyObj('SufficentAccountBalanceService', ['checkXrpBalance']);
          xrplTransactionOrchestratorServiceMock = jasmine.createSpyObj('XrplTransactionOrchestratorService', ['executeTx']);
          didTransactionBuilderServiceMock = jasmine.createSpyObj('DidTransactionBuilderService', ['buildDidSetTransaction', 'buildDidDeleteTransaction']);
          didUtilServiceMock = jasmine.createSpyObj('DidUtilService', ['validateAndConvertDidJson']);
          didStoreServiceMock = jasmine.createSpyObj('DidStoreService', ['setField', 'getField']);

          // Default successful returns
          txEnvironmentServiceMock.prepareTxEnvironment.and.resolveTo(mockEnv);
          validatorMock.validate.and.resolveTo([]);
          sufficentAccountBalanceServiceMock.checkXrpBalance.and.resolveTo({
               success: true,
               error: '',
          });
          transactionOptionalFieldsServiceMock.setTxOptionalFields.and.resolveTo();
          didTransactionBuilderServiceMock.buildDidSetTransaction.and.returnValue(mockTx);
          didTransactionBuilderServiceMock.buildDidDeleteTransaction.and.returnValue({
               ...mockTx,
               TransactionType: 'DIDDelete',
          } as xrpl.DIDDelete);

          xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({
               success: true,
               mode: 'submit',
               hash: mockTxHash,
               tx: mockTx,
               response: { result: { hash: mockTxHash } },
          } as any);

          TestBed.configureTestingModule({
               providers: [
                    DidTransactionOrchestratorService,
                    { provide: TxEnvironmentService, useValue: txEnvironmentServiceMock },
                    { provide: ValidationService, useValue: validatorMock },
                    { provide: XrplTransactionService, useValue: xrplTransactionServiceMock },
                    { provide: TransactionUiService, useValue: txUiServiceMock },
                    { provide: ToastService, useValue: toastServiceMock },
                    { provide: TransactionOptionalFieldsService, useValue: transactionOptionalFieldsServiceMock },
                    { provide: SufficentAccountBalanceService, useValue: sufficentAccountBalanceServiceMock },
                    { provide: XrplTransactionOrchestratorService, useValue: xrplTransactionOrchestratorServiceMock },
                    { provide: DidTransactionBuilderService, useValue: didTransactionBuilderServiceMock },
                    { provide: DidUtilService, useValue: didUtilServiceMock },
                    { provide: DidStoreService, useValue: didStoreServiceMock },
               ],
          });

          service = TestBed.inject(DidTransactionOrchestratorService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('executeDidTx', () => {
          it('should execute setDid successfully', async () => {
               const result = await service.executeDidTx('setDid', baseConfig as any);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe(mockTxHash);
               expect(didTransactionBuilderServiceMock.buildDidSetTransaction).toHaveBeenCalled();
          });

          it('should execute deleteDid successfully', async () => {
               const result = await service.executeDidTx('deleteDid', baseConfig as any);
               expect(result.success).toBeTrue();
               expect(didTransactionBuilderServiceMock.buildDidDeleteTransaction).toHaveBeenCalled();
          });

          it('should return validation error', async () => {
               validatorMock.validate.and.resolveTo(['Error 1', 'Error 2']);
               const result = await service.executeDidTx('setDid', baseConfig as any);
               expect(result.success).toBeFalse();
               expect(result.validationError).toBeTrue();
          });

          it('should handle insufficient balance', async () => {
               sufficentAccountBalanceServiceMock.checkXrpBalance.and.resolveTo({
                    success: false,
                    error: 'Insufficient XRP balance',
               });
               const result = await service.executeDidTx('setDid', baseConfig as any);
               expect(result.success).toBeFalse();
          });

          it('should handle execution error', async () => {
               xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({
                    success: false,
                    mode: 'submit',
                    error: 'Tx failed',
               } as any);
               const result = await service.executeDidTx('setDid', baseConfig as any);
               expect(result.success).toBeFalse();
          });

          it('should handle simulation mode', async () => {
               xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({
                    success: true,
                    mode: 'simulate',
                    hash: mockTxHash,
                    tx: mockTx,
                    response: {},
               } as any);

               const simulateConfig = { ...baseConfig, txOptions: { isSimulateEnabled: true } };
               const result = await service.executeDidTx('setDid', simulateConfig as any);
               expect(result.success).toBeTrue();
               expect(toastServiceMock.success).toHaveBeenCalled();
          });

          it('should handle prepareTxEnvironment failure', async () => {
               txEnvironmentServiceMock.prepareTxEnvironment.and.rejectWith(new Error('Env failed'));
               const result = await service.executeDidTx('setDid', baseConfig as any);
               expect(result.success).toBeFalse();
          });

          it('should handle unknown transaction type', async () => {
               const result = await service.executeDidTx('unknown' as any, baseConfig as any);
               expect(result.success).toBeFalse();
          });

          it('should call optional fields service', async () => {
               const configWithOptions = {
                    ...baseConfig,
                    txOptions: { isSimulateEnabled: false, memo: 'test' },
               };
               await service.executeDidTx('setDid', configWithOptions as any);
               expect(transactionOptionalFieldsServiceMock.setTxOptionalFields).toHaveBeenCalled();
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should handle setDid simulation', () => {
               const result = service.handleSimulationSuccess('setDid', mockDid, mockTxHash);
               expect(result.success).toBeTrue();
          });

          it('should handle deleteDid simulation', () => {
               const result = service.handleSimulationSuccess('deleteDid', mockDid, mockTxHash);
               expect(result.success).toBeTrue();
          });
     });

     describe('Edge cases', () => {
          it('should handle null did data', async () => {
               const badConfig = { ...baseConfig, did: null };
               const result = await service.executeDidTx('setDid', badConfig as any);
               expect(result.success).toBeFalse();
          });
     });
});

// ==================== DidUtilService Tests ====================
describe('DidUtilService', () => {
     let service: DidUtilService;
     let didStoreServiceMock: any;
     let utilsServiceMock: any;
     let copyUtilServiceMock: any;
     let downloadUtilServiceMock: any;
     let toastServiceMock: any;
     let txUiServiceMock: any;
     let walletManagerServiceMock: any;
     let logServiceMock: any;
     let didSchema: any;

     const mockDidSchema = {
          type: 'object',
          properties: {
               '@context': { type: 'string' },
               id: { type: 'string' },
          },
     };

     beforeEach(() => {
          didStoreServiceMock = {
               setField: jasmine.createSpy('setField'),
               existingDid: signal([]),
          };

          utilsServiceMock = {};
          copyUtilServiceMock = {};
          downloadUtilServiceMock = {};
          toastServiceMock = {};

          txUiServiceMock = {
               currentStep: signal('idle'),
               stepMessage: jasmine.createSpy('stepMessage').and.returnValue(''),
          };

          walletManagerServiceMock = {};
          logServiceMock = { logObjects: jasmine.createSpy('logObjects') };
          didSchema = mockDidSchema;

          TestBed.configureTestingModule({
               providers: [
                    DidUtilService,
                    { provide: DidStoreService, useValue: didStoreServiceMock },
                    { provide: UtilsService, useValue: utilsServiceMock },
                    { provide: CopyUtilService, useValue: copyUtilServiceMock },
                    { provide: DownloadUtilService, useValue: downloadUtilServiceMock },
                    { provide: ToastService, useValue: toastServiceMock },
                    { provide: TransactionUiService, useValue: txUiServiceMock },
                    { provide: WalletManagerService, useValue: walletManagerServiceMock },
                    { provide: LogServiceService, useValue: logServiceMock },
               ],
          });

          service = TestBed.inject(DidUtilService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('getExistingDid', () => {
          const mockAccountObjects: any = {
               result: {
                    account_objects: [
                         {
                              LedgerEntryType: 'DID',
                              index: 'did1',
                              DIDDocument: '446f63756d656e74',
                              Data: '44617461',
                              URI: '557269',
                         },
                         {
                              LedgerEntryType: 'DID',
                              index: 'did2',
                              DIDDocument: undefined,
                              Data: undefined,
                              URI: undefined,
                         },
                    ],
               },
          };

          it('should get existing DID objects and store them', () => {
               service.getExistingDid(mockAccountObjects);
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('existingDid', jasmine.any(Array));
               expect(logServiceMock.logObjects).toHaveBeenCalled();
          });

          it('should handle empty account objects', () => {
               const emptyObjects: any = { result: { account_objects: [] } };
               service.getExistingDid(emptyObjects);
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('existingDid', []);
          });
     });

     describe('onDidDataChange', () => {
          it('should update didData in store', () => {
               service.onDidDataChange('{"test":"data"}');
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('didData', '{"test":"data"}');
          });
     });

     describe('onUriDataChange', () => {
          it('should update uriData in store', () => {
               service.onUriDataChange('{"uri":"test"}');
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('uriData', '{"uri":"test"}');
          });
     });

     describe('onDidDocumentDataChange', () => {
          it('should update didDocumentData in store', () => {
               service.onDidDocumentDataChange('{"doc":"test"}');
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('didDocumentData', '{"doc":"test"}');
          });
     });

     describe('clearJsonField', () => {
          it('should clear document field', () => {
               service.clearJsonField('document');
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('didDocumentData', '');
          });

          it('should clear uri field', () => {
               service.clearJsonField('uri');
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('uriData', '');
          });

          it('should clear data field', () => {
               service.clearJsonField('data');
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('didData', '');
          });
     });

     describe('populateDidDefaultData', () => {
          it('should populate default DID data', () => {
               service.populateDidDefaultData();
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('didData', jasmine.any(String));
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('uriData', jasmine.any(String));
               expect(didStoreServiceMock.setField).toHaveBeenCalledWith('didDocumentData', jasmine.any(String));
          });
     });

     describe('Button labels', () => {
          it('should return "Set DID" when idle', () => {
               txUiServiceMock.currentStep.set('idle');
               expect(service.setDidButtonLabel()).toBe('Set DID');
          });

          it('should return "Delete DID" when idle', () => {
               txUiServiceMock.currentStep.set('idle');
               expect(service.deleteDidButtonLabel()).toBe('Delete DID');
          });

          it('should return waiting message when step is waiting_validation', () => {
               txUiServiceMock.currentStep.set('waiting_validation');
               expect(service.setDidButtonLabel()).toBe('Waiting for ledger validation...');
          });

          it('should return step message when step is processing', () => {
               txUiServiceMock.currentStep.set('processing');
               txUiServiceMock.stepMessage.and.returnValue('Processing...');
               expect(service.setDidButtonLabel()).toBe('Processing...');
          });
     });

     describe('validateAndConvertDidJson', () => {
          const strictDidSchema = {
               type: 'object',
               required: ['@context', 'id'],
               properties: {
                    '@context': { type: 'string', pattern: '^https://www.w3.org/ns/did/v1$' },
                    id: { type: 'string', pattern: '^did:xrpl:test:r' },
               },
               additionalProperties: false,
          };

          const validDidJson = {
               '@context': 'https://www.w3.org/ns/did/v1',
               id: 'did:xrpl:test:rTest',
          };

          it('should return error for invalid DID document', () => {
               const invalidDid = { invalid: 'object' };
               const result = service.validateAndConvertDidJson(JSON.stringify(invalidDid), strictDidSchema);
               expect(result.success).toBeFalse();
          });

          it('should return error for invalid DID document in array', () => {
               const invalidArray = [{ invalid: 'object' }, validDidJson];
               const result = service.validateAndConvertDidJson(JSON.stringify(invalidArray), strictDidSchema);
               expect(result.success).toBeFalse();
          });
     });

     describe('jsonToHex', () => {
          it('should convert object to hex', () => {
               const obj = { test: 'data' };
               const result = service.jsonToHex(obj);
               expect(result).toBeDefined();
               expect(typeof result).toBe('string');
          });

          it('should convert string to hex', () => {
               const str = '{"test":"data"}';
               const result = service.jsonToHex(str);
               expect(result).toBeDefined();
               expect(typeof result).toBe('string');
          });
     });

     describe('hexTojson', () => {
          it('should convert hex to JSON string', () => {
               const hex = '7b2274657374223a2264617461227d';
               const result = service.hexTojson(hex);
               expect(result).toBeDefined();
          });

          it('should convert object to hex then back to JSON', () => {
               const obj = { test: 'data' };
               const hex = service.jsonToHex(obj);
               const result = service.hexTojson(hex);
               expect(result).toBeDefined();
          });
     });
});

// import { TestBed } from '@angular/core/testing';
// import { signal } from '@angular/core';
// import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
// import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
// import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
// import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
// import { ToastService } from '../../utils/toast/toast.service';
// import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
// import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
// import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
// import { DidTransactionBuilderService } from '../did-transaction-builder/did-transaction-builder.service';
// import { DidUtilService } from '../did-util/did-util.service';
// import { DidStoreService } from '../did-store/did-store.service';
// import { DidTransactionOrchestratorService } from '../did-transaction-orchestrator/did-transaction-orchestrator.service';
// import * as xrpl from 'xrpl';

// // Mock Performance API
// beforeAll(() => {
//      const mockPerformance = {
//           mark: jasmine.createSpy('mark'),
//           measure: jasmine.createSpy('measure'),
//           clearMarks: jasmine.createSpy('clearMarks'),
//           clearMeasures: jasmine.createSpy('clearMeasures'),
//           getEntriesByName: jasmine.createSpy('getEntriesByName').and.returnValue([{ duration: 123.45 } as PerformanceEntry]),
//      };
//      Object.defineProperty(window, 'performance', {
//           value: mockPerformance,
//           configurable: true,
//           writable: true,
//      });
// });

// describe('DidTransactionOrchestratorService', () => {
//      let service: DidTransactionOrchestratorService;

//      let txEnvironmentServiceMock: jasmine.SpyObj<TxEnvironmentService>;
//      let validatorMock: jasmine.SpyObj<ValidationService>;
//      let xrplTransactionServiceMock: jasmine.SpyObj<XrplTransactionService>;
//      let txUiServiceMock: jasmine.SpyObj<TransactionUiService>;
//      let toastServiceMock: jasmine.SpyObj<ToastService>;
//      let transactionOptionalFieldsServiceMock: jasmine.SpyObj<TransactionOptionalFieldsService>;
//      let sufficentAccountBalanceServiceMock: jasmine.SpyObj<SufficentAccountBalanceService>;
//      let xrplTransactionOrchestratorServiceMock: jasmine.SpyObj<XrplTransactionOrchestratorService>;
//      let didTransactionBuilderServiceMock: jasmine.SpyObj<DidTransactionBuilderService>;
//      let didUtilServiceMock: jasmine.SpyObj<DidUtilService>;
//      let didStoreServiceMock: jasmine.SpyObj<typeof DidStoreService>;

//      const mockWallet = { address: 'rTestWallet', classicAddress: 'rTestWallet', seed: 'seed123' } as any;
//      const mockClient = {} as xrpl.Client; // minimal - real type has many props

//      const mockEnv = {
//           client: mockClient,
//           wallet: mockWallet,
//           accountInfo: { result: { account_data: { Sequence: 100 } } },
//           fee: '12',
//           ledgerInfo: { lastIndex: 5000 },
//      } as any;

//      const mockTxHash = 'txHash123';
//      const mockTx = {
//           TransactionType: 'DIDSet',
//           Account: 'rTestWallet',
//           Sequence: 100,
//           Fee: '12',
//      } as xrpl.DIDSet;

//      const mockDid = {
//           didDocumentData: '{"did":"did:example:123"}',
//           uriData: 'https://example.com/did',
//           didData: '{"did":"did:example:456"}',
//      };

//      const baseConfig = {
//           did: mockDid,
//           account: {},
//           txOptions: { isSimulateEnabled: false },
//           preFetchedEnv: null as any,
//           wallet: mockWallet,
//      };

//      beforeEach(() => {
//           txEnvironmentServiceMock = jasmine.createSpyObj('TxEnvironmentService', ['prepareTxEnvironment']);
//           validatorMock = jasmine.createSpyObj('ValidationService', ['validate']);
//           xrplTransactionServiceMock = jasmine.createSpyObj('XrplTransactionService', ['waitForFinalOutcome', 'processTxFinalResult', 'processTxError']);
//           txUiServiceMock = jasmine.createSpyObj('TransactionUiService', ['resetCurrentStepToIdle', 'clearAllOptionsAndMessages', 'setTxResultSignal']);
//           Object.defineProperty(txUiServiceMock, 'explorerUrl', {
//                value: signal('https://testnet.xrpl.org/'),
//                writable: true,
//           });

//           toastServiceMock = jasmine.createSpyObj('ToastService', ['success', 'error', 'info']);
//           transactionOptionalFieldsServiceMock = jasmine.createSpyObj('TransactionOptionalFieldsService', ['setTxOptionalFields']);
//           sufficentAccountBalanceServiceMock = jasmine.createSpyObj('SufficentAccountBalanceService', ['checkXrpBalance']);
//           xrplTransactionOrchestratorServiceMock = jasmine.createSpyObj('XrplTransactionOrchestratorService', ['executeTx']);
//           didTransactionBuilderServiceMock = jasmine.createSpyObj('DidTransactionBuilderService', ['buildDidSetTransaction', 'buildDidDeleteTransaction']);
//           didUtilServiceMock = jasmine.createSpyObj('DidUtilService', ['validateAndConvertDidJson']);
//           didStoreServiceMock = jasmine.createSpyObj('DidStoreService', ['setField', 'getField']);

//           // Default successful returns
//           txEnvironmentServiceMock.prepareTxEnvironment.and.resolveTo(mockEnv);
//           validatorMock.validate.and.resolveTo([]);
//           sufficentAccountBalanceServiceMock.checkXrpBalance.and.resolveTo({
//                success: true,
//                error: '',
//           });
//           transactionOptionalFieldsServiceMock.setTxOptionalFields.and.resolveTo();
//           didTransactionBuilderServiceMock.buildDidSetTransaction.and.returnValue(mockTx);
//           didTransactionBuilderServiceMock.buildDidDeleteTransaction.and.returnValue({
//                ...mockTx,
//                TransactionType: 'DIDDelete',
//           } as xrpl.DIDDelete);

//           // Full orchestrator response shape
//           xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({
//                success: true,
//                mode: 'submit',
//                hash: mockTxHash,
//                tx: mockTx,
//                response: { result: { hash: mockTxHash } },
//           } as any);

//           TestBed.configureTestingModule({
//                providers: [
//                     DidTransactionOrchestratorService,
//                     { provide: TxEnvironmentService, useValue: txEnvironmentServiceMock },
//                     { provide: ValidationService, useValue: validatorMock },
//                     { provide: XrplTransactionService, useValue: xrplTransactionServiceMock },
//                     { provide: TransactionUiService, useValue: txUiServiceMock },
//                     { provide: ToastService, useValue: toastServiceMock },
//                     { provide: TransactionOptionalFieldsService, useValue: transactionOptionalFieldsServiceMock },
//                     { provide: SufficentAccountBalanceService, useValue: sufficentAccountBalanceServiceMock },
//                     { provide: XrplTransactionOrchestratorService, useValue: xrplTransactionOrchestratorServiceMock },
//                     { provide: DidTransactionBuilderService, useValue: didTransactionBuilderServiceMock },
//                     { provide: DidUtilService, useValue: didUtilServiceMock },
//                     { provide: DidStoreService, useValue: didStoreServiceMock },
//                ],
//           });

//           service = TestBed.inject(DidTransactionOrchestratorService);
//      });

//      it('should create', () => {
//           expect(service).toBeTruthy();
//      });

//      describe('executeDidTx', () => {
//           it('should execute setDid successfully', async () => {
//                const result = await service.executeDidTx('setDid', baseConfig as any);
//                expect(result.success).toBeTrue();
//                expect(result.hash).toBe(mockTxHash);
//                expect(didTransactionBuilderServiceMock.buildDidSetTransaction).toHaveBeenCalled();
//           });

//           it('should execute deleteDid successfully', async () => {
//                const result = await service.executeDidTx('deleteDid', baseConfig as any);
//                expect(result.success).toBeTrue();
//                expect(didTransactionBuilderServiceMock.buildDidDeleteTransaction).toHaveBeenCalled();
//           });

//           it('should return validation error', async () => {
//                validatorMock.validate.and.resolveTo(['Error 1', 'Error 2']);
//                const result = await service.executeDidTx('setDid', baseConfig as any);
//                expect(result.success).toBeFalse();
//                expect(result.validationError).toBeTrue();
//           });

//           it('should handle insufficient balance', async () => {
//                sufficentAccountBalanceServiceMock.checkXrpBalance.and.resolveTo({
//                     success: false,
//                     error: 'Insufficient XRP balance',
//                });
//                const result = await service.executeDidTx('setDid', baseConfig as any);
//                expect(result.success).toBeFalse();
//           });

//           it('should handle execution error', async () => {
//                xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({
//                     success: false,
//                     mode: 'submit',
//                     error: 'Tx failed',
//                } as any);

//                const result = await service.executeDidTx('setDid', baseConfig as any);
//                expect(result.success).toBeFalse();
//           });

//           it('should handle simulation mode', async () => {
//                xrplTransactionOrchestratorServiceMock.executeTx.and.resolveTo({
//                     success: true,
//                     mode: 'simulate',
//                     hash: mockTxHash,
//                     tx: mockTx,
//                     response: {},
//                } as any);

//                const simulateConfig = { ...baseConfig, txOptions: { isSimulateEnabled: true } };
//                const result = await service.executeDidTx('setDid', simulateConfig as any);

//                expect(result.success).toBeTrue();
//                expect(toastServiceMock.success).toHaveBeenCalled();
//           });

//           it('should handle prepareTxEnvironment failure', async () => {
//                txEnvironmentServiceMock.prepareTxEnvironment.and.rejectWith(new Error('Env failed'));
//                const result = await service.executeDidTx('setDid', baseConfig as any);
//                expect(result.success).toBeFalse();
//           });

//           it('should handle unknown transaction type', async () => {
//                const result = await service.executeDidTx('unknown' as any, baseConfig as any);
//                expect(result.success).toBeFalse();
//           });

//           it('should call optional fields service', async () => {
//                const configWithOptions = {
//                     ...baseConfig,
//                     txOptions: { isSimulateEnabled: false, memo: 'test' },
//                };
//                await service.executeDidTx('setDid', configWithOptions as any);
//                expect(transactionOptionalFieldsServiceMock.setTxOptionalFields).toHaveBeenCalled();
//           });
//      });

//      describe('handleSimulationSuccess', () => {
//           it('should handle setDid simulation', () => {
//                const result = service.handleSimulationSuccess('setDid', mockDid, mockTxHash);
//                expect(result.success).toBeTrue();
//           });

//           it('should handle deleteDid simulation', () => {
//                const result = service.handleSimulationSuccess('deleteDid', mockDid, mockTxHash);
//                expect(result.success).toBeTrue();
//           });
//      });

//      describe('Edge cases', () => {
//           it('should handle null did data', async () => {
//                const badConfig = { ...baseConfig, did: null };
//                const result = await service.executeDidTx('setDid', badConfig as any);
//                expect(result.success).toBeFalse();
//           });
//      });
// });
