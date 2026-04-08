import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CheckTransactionOrchestrator } from './checks-transaction-orchestrator.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { ChecksTransactionBuilderService } from '../checks-transaction-builder/checks-transaction-builder.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { AppConstants } from '../../../core/app.constants';

describe('CheckTransactionOrchestrator', () => {
     let service: CheckTransactionOrchestrator;
     let toastSpy: jasmine.SpyObj<any>;
     let txUiSpy: jasmine.SpyObj<any>;
     let validatorSpy: jasmine.SpyObj<any>;
     let txEnvSpy: jasmine.SpyObj<any>;
     let builderSpy: jasmine.SpyObj<any>;
     let balanceSpy: jasmine.SpyObj<any>;
     let orchestratorSpy: jasmine.SpyObj<any>;
     let xrplTxSpy: jasmine.SpyObj<any>;

     const mockWallet: any = { classicAddress: 'rTEST' };
     const mockEnv: any = {
          client: {},
          wallet: mockWallet,
          accountInfo: { result: { account_data: { Balance: '10000000' } } },
          fee: '12',
          ledgerInfo: { lastIndex: 5000, currentRippleTime: 100 },
     };

     beforeEach(() => {
          toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error']);
          txUiSpy = {
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               setTxResultSignal: jasmine.createSpy('setTxResultSignal'),
               explorerUrl: signal('https://explorer/'),
               currentStep: signal('idle'),
               stepMessage: jasmine.createSpy('stepMessage').and.returnValue(''),
          };
          validatorSpy = jasmine.createSpyObj('ValidationService', ['validate']);
          txEnvSpy = jasmine.createSpyObj('TxEnvironmentService', ['prepareTxEnvironment']);
          builderSpy = {
               buildCreateCheckTx: jasmine.createSpy('buildCreateCheckTx').and.returnValue({ TransactionType: 'CheckCreate', LastLedgerSequence: 6000 }),
               buildCashCheckTx: jasmine.createSpy('buildCashCheckTx').and.returnValue({ TransactionType: 'CheckCash', LastLedgerSequence: 6000 }),
               buildCancelCheckTx: jasmine.createSpy('buildCancelCheckTx').and.returnValue({ TransactionType: 'CheckCancel', LastLedgerSequence: 6000 }),
          };
          balanceSpy = jasmine.createSpyObj('SufficentAccountBalanceService', ['checkXrpBalance', 'checkTokenBalance']);
          balanceSpy.checkXrpBalance.and.resolveTo({ success: true });
          balanceSpy.checkTokenBalance.and.resolveTo({ success: true });
          orchestratorSpy = jasmine.createSpyObj('XrplTransactionOrchestratorService', ['executeTx']);
          orchestratorSpy.executeTx.and.resolveTo({ success: true, hash: 'TESTHASH', mode: 'submit' });
          xrplTxSpy = jasmine.createSpyObj('XrplTransactionService', ['waitForFinalOutcome', 'processTxFinalResult', 'processTxError']);
          xrplTxSpy.waitForFinalOutcome.and.resolveTo({ result: 'tesSUCCESS' });

          TestBed.configureTestingModule({
               providers: [
                    CheckTransactionOrchestrator,
                    { provide: ValidationService, useValue: validatorSpy },
                    { provide: TxEnvironmentService, useValue: txEnvSpy },
                    { provide: TransactionUiService, useValue: txUiSpy },
                    { provide: ToastService, useValue: toastSpy },
                    { provide: XrplTransactionService, useValue: xrplTxSpy },
                    { provide: ChecksTransactionBuilderService, useValue: builderSpy },
                    { provide: TransactionOptionalFieldsService, useValue: { setTxOptionalFields: jasmine.createSpy().and.resolveTo() } },
                    { provide: SufficentAccountBalanceService, useValue: balanceSpy },
                    { provide: XrplTransactionOrchestratorService, useValue: orchestratorSpy },
                    { provide: UtilsService, useValue: { encodeIfNeeded: (v: string) => v } },
               ],
          });
          service = TestBed.inject(CheckTransactionOrchestrator);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('handleSimulationSuccess', () => {
          it('should return success for createCheck simulation', () => {
               const check = { amount: '10', destination: 'rDEST' };
               const currency = { currencyCode: 'XRP' };
               const result = service.handleSimulationSuccess('createCheck', check, currency, 'HASH123');
               expect(result.success).toBeTrue();
               expect(result.hash).toBe('HASH123');
               expect(toastSpy.success).toHaveBeenCalled();
          });

          it('should return success for cashCheck simulation', () => {
               const check = { amount: '5', checkIdField: 'CHECKID' };
               const currency = { currencyCode: 'XRP' };
               const result = service.handleSimulationSuccess('cashCheck', check, currency, 'HASH456');
               expect(result.success).toBeTrue();
               expect(toastSpy.success).toHaveBeenCalled();
          });

          it('should return success for cancelCheck simulation', () => {
               const check = { checkIdField: 'CANCELID' };
               const currency = { currencyCode: 'XRP' };
               const result = service.handleSimulationSuccess('cancelCheck', check, currency, 'HASH789');
               expect(result.success).toBeTrue();
               expect(result.hash).toBe('HASH789');
          });

          it('should use check.checkIdField in cancelCheck simulation message', () => {
               const check = { checkIdField: 'MY_CHECK_ID' };
               const currency = { currencyCode: 'XRP' };
               service.handleSimulationSuccess('cancelCheck', check, currency);
               const toastMsg = toastSpy.success.calls.mostRecent().args[0] as string;
               expect(toastMsg).toContain('MY_CHECK_ID');
          });
     });

     describe('executeCredentialTx', () => {
          const baseConfig: any = {
               check: { amount: '10', destination: 'rDEST', checkIdField: 'CHECKID' },
               account: { regularKeyAddress: '', regularKeySeed: '' },
               txOptions: { isRegularKeyAddress: false, isSimulateEnabled: false },
               trustline: {},
               currency: { currency: 'XRP', currencyCode: 'XRP' },
               wallet: mockWallet,
               preFetchedEnv: mockEnv,
          };

          it('should return validationError when validator returns errors', async () => {
               validatorSpy.validate.and.resolveTo(['Amount is required']);
               const result = await service.executeCredentialTx('createCheck', baseConfig);
               expect(result.success).toBeFalse();
               expect(result.validationError).toBeTrue();
               expect(result.error).toContain('Amount is required');
          });

          it('should return error when required env data is missing', async () => {
               const configWithBadEnv: any = {
                    ...baseConfig,
                    preFetchedEnv: { client: {}, wallet: mockWallet, fee: '', ledgerInfo: null },
               };
               validatorSpy.validate.and.resolveTo([]);
               const result = await service.executeCredentialTx('createCheck', configWithBadEnv);
               expect(result.success).toBeFalse();
          });

          it('should return simulation success when simulate mode is on', async () => {
               validatorSpy.validate.and.resolveTo([]);
               orchestratorSpy.executeTx.and.resolveTo({ success: true, hash: 'SIMHASH', mode: 'simulate' });
               const config = { ...baseConfig, txOptions: { isSimulateEnabled: true } };
               const result = await service.executeCredentialTx('createCheck', config);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe('SIMHASH');
          });

          it('should return success on submit for createCheck', async () => {
               validatorSpy.validate.and.resolveTo([]);
               orchestratorSpy.executeTx.and.resolveTo({ success: true, hash: 'SUBMITHASH', mode: 'submit' });
               const result = await service.executeCredentialTx('createCheck', baseConfig);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe('SUBMITHASH');
          });

          it('should return success for cashCheck', async () => {
               validatorSpy.validate.and.resolveTo([]);
               orchestratorSpy.executeTx.and.resolveTo({ success: true, hash: 'CASHHASH', mode: 'submit' });
               const result = await service.executeCredentialTx('cashCheck', baseConfig);
               expect(result.success).toBeTrue();
          });

          it('should return success for cancelCheck', async () => {
               validatorSpy.validate.and.resolveTo([]);
               orchestratorSpy.executeTx.and.resolveTo({ success: true, hash: 'CANCELHASH', mode: 'submit' });
               const result = await service.executeCredentialTx('cancelCheck', baseConfig);
               expect(result.success).toBeTrue();
          });

          it('should return error when executeTx returns failure', async () => {
               validatorSpy.validate.and.resolveTo([]);
               orchestratorSpy.executeTx.and.resolveTo({ success: false, error: 'Ledger error' });
               const result = await service.executeCredentialTx('createCheck', baseConfig);
               expect(result.success).toBeFalse();
               expect(result.error).toBe('Ledger error');
          });
     });
});
