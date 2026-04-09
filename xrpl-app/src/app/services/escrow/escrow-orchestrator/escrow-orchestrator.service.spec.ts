import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowOrchestratorService } from './escrow-orchestrator.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { EscrowTransactionBuilderService } from '../escrow-transaction-builder/escrow-transaction-builder.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { EscrowUtilService } from '../escrow-util/escrow-util.service';
import { EscrowStoreService } from '../escrow-store/escrow-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';

describe('EscrowOrchestratorService', () => {
     let service: EscrowOrchestratorService;
     let toastSpy: jasmine.SpyObj<any>;
     let txUiSpy: any;
     let validatorSpy: jasmine.SpyObj<any>;
     let txEnvSpy: jasmine.SpyObj<any>;
     let builderSpy: any;
     let balanceSpy: jasmine.SpyObj<any>;
     let orchestratorSpy: jasmine.SpyObj<any>;
     let xrplTxSpy: jasmine.SpyObj<any>;

     const mockWallet: any = { classicAddress: 'rTEST', address: 'rTEST' };
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
               buildCreateEscrowTx: jasmine.createSpy('buildCreateEscrowTx').and.returnValue({ TransactionType: 'EscrowCreate', LastLedgerSequence: 6000 }),
               buildFinishEscrowTx: jasmine.createSpy('buildFinishEscrowTx').and.returnValue({ TransactionType: 'EscrowFinish', LastLedgerSequence: 6000 }),
               buildCancelEscrowTx: jasmine.createSpy('buildCancelEscrowTx').and.returnValue({ TransactionType: 'EscrowCancel', LastLedgerSequence: 6000 }),
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
                    EscrowOrchestratorService,
                    EscrowStoreService,
                    XrplTxOptionsStore,
                    { provide: ValidationService, useValue: validatorSpy },
                    { provide: TxEnvironmentService, useValue: txEnvSpy },
                    { provide: TransactionUiService, useValue: txUiSpy },
                    { provide: ToastService, useValue: toastSpy },
                    { provide: XrplTransactionService, useValue: xrplTxSpy },
                    { provide: EscrowTransactionBuilderService, useValue: builderSpy },
                    { provide: TransactionOptionalFieldsService, useValue: { setTxOptionalFields: jasmine.createSpy().and.resolveTo() } },
                    { provide: SufficentAccountBalanceService, useValue: balanceSpy },
                    { provide: XrplTransactionOrchestratorService, useValue: orchestratorSpy },
                    { provide: UtilsService, useValue: { encodeIfNeeded: (v: string) => v, toRippleTime: () => 200 } },
                    {
                         provide: EscrowUtilService,
                         useValue: {
                              escrowItems: jasmine.createSpy('escrowItems').and.returnValue([]),
                              selectedEscrowItem: jasmine.createSpy('selectedEscrowItem').and.returnValue(null),
                              isEscrowExpired: jasmine.createSpy('isEscrowExpired').and.returnValue(false),
                              onEscrowSelected: jasmine.createSpy('onEscrowSelected'),
                              onEscrowSelectedInUi: jasmine.createSpy('onEscrowSelectedInUi'),
                              checkEscrowStatus: jasmine.createSpy('checkEscrowStatus').and.returnValue({ canFinish: true, canCancel: false, reasonFinish: '', reasonCancel: '' }),
                              formatEscrowAmount: jasmine.createSpy('formatEscrowAmount').and.returnValue('1 XRP'),
                              validateEscrowCreate: jasmine.createSpy('validateEscrowCreate').and.returnValue({ valid: true, errors: [] }),
                              validateTimeEscrowUI: jasmine.createSpy('validateTimeEscrowUI').and.returnValue([]),
                              validateConditionalEscrowUI: jasmine.createSpy('validateConditionalEscrowUI').and.returnValue(''),
                              getExistingEscrows: jasmine.createSpy('getExistingEscrows').and.resolveTo([]),
                              getExpiredOrFulfilledEscrows: jasmine.createSpy('getExpiredOrFulfilledEscrows').and.resolveTo([]),
                              loadAllEscrows: jasmine.createSpy('loadAllEscrows').and.resolveTo([]),
                         },
                    },
                    {
                         provide: CurrencyStoreService,
                         useValue: { currency: signal('XRP'), issuer: signal(''), currencyCode: signal('XRP'), setField: jasmine.createSpy('setField') },
                    },
                    { provide: WalletManagerService, useValue: { getSelectedWallet: jasmine.createSpy().and.returnValue(mockWallet), wallets: signal([mockWallet]) } },
                    { provide: XrplDateService, useValue: { rippleToISO: (t: number) => new Date(t).toISOString(), isExpired: () => false } },
                    { provide: TrustlineCurrencyService, useValue: { currencyItems: signal([]), issuerItems: signal([]) } },
                    { provide: XrplCacheService, useValue: { getTxCached: jasmine.createSpy().and.resolveTo({}) } },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: CopyUtilService, useValue: {} },
               ],
          });
          service = TestBed.inject(EscrowOrchestratorService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('handleSimulationSuccess', () => {
          it('should return success for createEscrow simulation', () => {
               const escrow = { amount: '10', destination: 'rDEST' };
               const currency = { currencyCode: 'XRP' };
               const result = service.handleSimulationSuccess('createEscrow', escrow, currency, 'HASH123');
               expect(result.success).toBeTrue();
               expect(result.hash).toBe('HASH123');
               expect(toastSpy.success).toHaveBeenCalled();
          });

          it('should return success for finishEscrow simulation', () => {
               const escrow = { amount: '5', escrowSequenceNumber: 'SEQ1' };
               const currency = { currencyCode: 'XRP' };
               const result = service.handleSimulationSuccess('finishEscrow', escrow, currency, 'HASH456');
               expect(result.success).toBeTrue();
               expect(toastSpy.success).toHaveBeenCalled();
          });

          it('should return success for cancelEscrow simulation', () => {
               const escrow = { escrowSequenceNumber: 'CANCELSEQ' };
               const currency = { currencyCode: 'XRP' };
               const result = service.handleSimulationSuccess('cancelEscrow', escrow, currency, 'HASH789');
               expect(result.success).toBeTrue();
               expect(result.hash).toBe('HASH789');
          });

          it('should call resetCurrentStepToIdle', () => {
               service.handleSimulationSuccess('cancelEscrow', {}, {});
               expect(txUiSpy.resetCurrentStepToIdle).toHaveBeenCalled();
          });
     });

     describe('executeEscrowTx', () => {
          const baseConfig: any = {
               escrow: { amount: '10', destination: 'rDEST', escrowSequenceNumber: 'SEQ1', escrowOwner: 'rOWNER', condition: '', fulfillment: '', escrowFinishAfterExpirationDate: '', escrowCancelAfterExpirationDate: '' },
               account: { regularKeyAddress: '', regularKeySeed: '' },
               txOptions: { isRegularKeyAddress: false, isSimulateEnabled: false },
               trustline: {},
               currency: { currency: 'XRP', currencyCode: 'XRP' },
               wallet: mockWallet,
               preFetchedEnv: mockEnv,
          };

          it('should return validationError when validator returns errors', async () => {
               validatorSpy.validate.and.resolveTo(['Amount is required']);
               const result = await service.executeEscrowTx('createEscrow', baseConfig);
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
               const result = await service.executeEscrowTx('createEscrow', configWithBadEnv);
               expect(result.success).toBeFalse();
          });

          it('should return simulation success when simulate mode is on for createEscrow', async () => {
               validatorSpy.validate.and.resolveTo([]);
               orchestratorSpy.executeTx.and.resolveTo({ success: true, hash: 'SIMHASH', mode: 'simulate' });
               const config = { ...baseConfig, txOptions: { isSimulateEnabled: true } };
               const result = await service.executeEscrowTx('createEscrow', config);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe('SIMHASH');
          });

          it('should return success on submit for createEscrow', async () => {
               validatorSpy.validate.and.resolveTo([]);
               orchestratorSpy.executeTx.and.resolveTo({ success: true, hash: 'SUBMITHASH', mode: 'submit' });
               const result = await service.executeEscrowTx('createEscrow', baseConfig);
               expect(result.success).toBeTrue();
               expect(result.hash).toBe('SUBMITHASH');
          });

          it('should return success for finishEscrow', async () => {
               validatorSpy.validate.and.resolveTo([]);
               orchestratorSpy.executeTx.and.resolveTo({ success: true, hash: 'FINISHHASH', mode: 'submit' });
               const result = await service.executeEscrowTx('finishEscrow', baseConfig);
               expect(result.success).toBeTrue();
          });

          it('should return success for cancelEscrow', async () => {
               validatorSpy.validate.and.resolveTo([]);
               orchestratorSpy.executeTx.and.resolveTo({ success: true, hash: 'CANCELHASH', mode: 'submit' });
               const result = await service.executeEscrowTx('cancelEscrow', baseConfig);
               expect(result.success).toBeTrue();
          });

          it('should return error when executeTx returns failure', async () => {
               validatorSpy.validate.and.resolveTo([]);
               orchestratorSpy.executeTx.and.resolveTo({ success: false, error: 'Ledger error' });
               const result = await service.executeEscrowTx('createEscrow', baseConfig);
               expect(result.success).toBeFalse();
               expect(result.error).toBe('Ledger error');
          });
     });
});
