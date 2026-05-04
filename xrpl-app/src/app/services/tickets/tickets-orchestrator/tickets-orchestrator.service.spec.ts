import { TestBed } from '@angular/core/testing';
import { TicketsOrchestratorService } from './tickets-orchestrator.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { ToastService } from '../../utils/toast/toast.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TicketsTransactionBuilderService } from '../tickets-transaction-builder/tickets-transaction-builder.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { TicketTxConfig } from '../../../components/tickets/constants/tickets.types';
import { AppConstants } from '../../../core/app.constants';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

describe('TicketsOrchestratorService', () => {
     let service: TicketsOrchestratorService;
     let mockTxEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let mockValidator: jasmine.SpyObj<ValidationService>;
     let mockToastService: jasmine.SpyObj<ToastService>;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockXrplTransactionService: jasmine.SpyObj<XrplTransactionService>;
     let mockTicketsTransactionBuilderService: jasmine.SpyObj<TicketsTransactionBuilderService>;
     let mockTransactionOptionalFieldsService: jasmine.SpyObj<TransactionOptionalFieldsService>;
     let mockSufficentAccountBalanceService: jasmine.SpyObj<SufficentAccountBalanceService>;
     let mockXrplTransactionOrchestratorService: jasmine.SpyObj<XrplTransactionOrchestratorService>;

     const mockWallet: any = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          address: 'rTestAddress1234567890',
          name: 'Test Wallet',
          publicKey: 'test-public-key',
          privateKey: 'test-private-key',
     };

     // Mock Ticket State
     const baseTicket: any = {
          ticketId: 'ticket123',
     };

     // Mock Ticket transactions
     const mockCreateTicketTx: any = {
          TransactionType: 'TicketCreate',
          Account: 'rTestAddress1234567890',
          TicketCount: 5,
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockDeleteTicketTx: any = {
          TransactionType: 'TicketCancel',
          Account: 'rTestAddress1234567890',
          TicketID: 'ticket123',
          Fee: '12',
          LastLedgerSequence: 1000,
     };

     const mockEnv: any = {
          client: { disconnect: jasmine.createSpy() },
          accountInfo: { Balance: '10000000' },
          fee: '12',
          ledgerInfo: { lastIndex: 1000 },
          accountObjects: { result: { account_objects: [] } },
          wallet: mockWallet,
     };

     beforeEach(() => {
          mockTxEnvironmentService = jasmine.createSpyObj('TxEnvironmentService', ['prepareTxEnvironment']);
          mockValidator = jasmine.createSpyObj('ValidationService', ['validate']);
          mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'successMultipleHashesWithTickets']);
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['someMethod']);
          mockTxUiService = jasmine.createSpyObj('TransactionUiService', ['resetCurrentStepToIdle', 'clearAllOptionsAndMessages', 'setTxResultSignal', 'explorerUrl', 'addTxResultSignal', 'currentStep']);
          mockXrplTransactionService = jasmine.createSpyObj('XrplTransactionService', ['waitForFinalOutcome', 'processTxFinalResult', 'processTxError']);
          mockTicketsTransactionBuilderService = jasmine.createSpyObj('TicketsTransactionBuilderService', ['buildCreateTicketTx', 'buildDeleteTicketTx']);
          mockTransactionOptionalFieldsService = jasmine.createSpyObj('TransactionOptionalFieldsService', ['setTxOptionalFields']);
          mockSufficentAccountBalanceService = jasmine.createSpyObj('SufficentAccountBalanceService', ['checkXrpBalance']);
          mockXrplTransactionOrchestratorService = jasmine.createSpyObj('XrplTransactionOrchestratorService', ['executeTx']);

          // Setup mock for currentStep
          mockTxUiService.currentStep = { set: jasmine.createSpy() } as any;

          mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(mockEnv);
          mockValidator.validate.and.resolveTo([]);
          mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: true, error: '' });
          mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
               success: true,
               hash: 'txHash123',
               mode: 'submit',
               tx: mockCreateTicketTx,
               response: {},
          });
          mockXrplTransactionService.waitForFinalOutcome.and.resolveTo({ meta: { TransactionResult: 'tesSUCCESS' } });
          mockXrplTransactionService.processTxFinalResult.and.returnValue();
          mockTxUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org/');

          // Setup mock returns for ticket transaction builders
          mockTicketsTransactionBuilderService.buildCreateTicketTx.and.returnValue(mockCreateTicketTx);
          mockTicketsTransactionBuilderService.buildDeleteTicketTx.and.returnValue(mockDeleteTicketTx);

          TestBed.configureTestingModule({
               providers: [
                    TicketsOrchestratorService,
                    { provide: TxEnvironmentService, useValue: mockTxEnvironmentService },
                    { provide: ValidationService, useValue: mockValidator },
                    { provide: ToastService, useValue: mockToastService },
                    { provide: UtilsService, useValue: mockUtilsService },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: XrplTransactionService, useValue: mockXrplTransactionService },
                    { provide: TicketsTransactionBuilderService, useValue: mockTicketsTransactionBuilderService },
                    { provide: TransactionOptionalFieldsService, useValue: mockTransactionOptionalFieldsService },
                    { provide: SufficentAccountBalanceService, useValue: mockSufficentAccountBalanceService },
                    { provide: XrplTransactionOrchestratorService, useValue: mockXrplTransactionOrchestratorService },
               ],
          });

          service = TestBed.inject(TicketsOrchestratorService);
     });

     // Helper to reset mocks between tests in a describe block
     function resetExecuteTxMock() {
          mockXrplTransactionOrchestratorService.executeTx.calls.reset();
          // Reset to default success response
          mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
               success: true,
               hash: 'txHash123',
               mode: 'submit',
               tx: mockCreateTicketTx,
               response: {},
          });
     }

     describe('executeTicketTx', () => {
          const baseAccount: any = {
               regularKeyAddress: '',
               regularKeySeed: '',
               multiSignAddress: '',
               multiSignSeeds: [],
          };

          const baseTxOptions: any = {
               isSimulateEnabled: false,
               useMultiSign: false,
               isRegularKeyAddress: false,
               ticketCountField: 5,
               selectedTicketSequences: [],
          };

          const baseConfig: TicketTxConfig = {
               ticket: baseTicket,
               account: baseAccount,
               txOptions: baseTxOptions,
               wallet: mockWallet,
          };

          beforeEach(() => {
               mockTxUiService.resetCurrentStepToIdle.and.callThrough();
               mockTxUiService.clearAllOptionsAndMessages.and.callThrough();
          });

          describe('createTicket', () => {
               it('should successfully create tickets', async () => {
                    const result = await service.executeTicketTx('createTicket', baseConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('txHash123');
                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalled();
                    expect(mockValidator.validate).toHaveBeenCalled();
                    expect(mockTicketsTransactionBuilderService.buildCreateTicketTx).toHaveBeenCalled();
                    expect(mockTransactionOptionalFieldsService.setTxOptionalFields).toHaveBeenCalled();
                    expect(mockSufficentAccountBalanceService.checkXrpBalance).toHaveBeenCalled();
                    expect(mockXrplTransactionOrchestratorService.executeTx).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).toHaveBeenCalled();
                    expect(mockXrplTransactionService.processTxFinalResult).toHaveBeenCalled();
               });

               it('should include tickets when fetching environment', async () => {
                    await service.executeTicketTx('createTicket', baseConfig);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).toHaveBeenCalledWith({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                         includeTickets: true,
                    });
               });
          });

          describe('deleteTicket', () => {
               beforeEach(() => {
                    resetExecuteTxMock();
               });

               it('should successfully delete a single ticket', async () => {
                    const configWithSequence = {
                         ...baseConfig,
                         txOptions: {
                              ...baseTxOptions,
                              selectedTicketSequences: ['ticket123'],
                         },
                    };

                    const result = await service.executeTicketTx('deleteTicket', configWithSequence);

                    expect(result.success).toBeTrue();
                    expect(result.deletedHashes).toBeDefined();
                    expect(mockTicketsTransactionBuilderService.buildDeleteTicketTx).toHaveBeenCalled();
               });

               it('should handle multiple ticket deletions', async () => {
                    const configWithSequences = {
                         ...baseConfig,
                         txOptions: {
                              ...baseTxOptions,
                              selectedTicketSequences: ['ticket123', 'ticket456', 'ticket789'],
                         },
                    };

                    // Reset and setup for multiple successes
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'txHash123',
                         mode: 'submit',
                         tx: mockDeleteTicketTx,
                         response: {},
                    });

                    const result = await service.executeTicketTx('deleteTicket', configWithSequences);

                    expect(result.success).toBeTrue();
                    expect(result.deletedHashes?.length).toBe(3);
                    expect(mockToastService.successMultipleHashesWithTickets).toHaveBeenCalled();
               });

               it('should handle partial failures in batch deletion', async () => {
                    const configWithSequences = {
                         ...baseConfig,
                         txOptions: {
                              ...baseTxOptions,
                              selectedTicketSequences: ['ticket123', 'ticket456'],
                         },
                    };

                    // Setup mock to return success for first call, failure for second
                    mockXrplTransactionOrchestratorService.executeTx.and.returnValues(Promise.resolve({ success: true, hash: 'hash1', mode: 'submit', tx: mockDeleteTicketTx, response: {} }), Promise.resolve({ success: false, error: 'Failed', mode: 'submit' }));

                    const result = await service.executeTicketTx('deleteTicket', configWithSequences);

                    // Service returns success true if at least one succeeds
                    expect(result.success).toBeTrue();
                    expect(result.deletedHashes?.length).toBe(1);
                    expect(mockToastService.error).toHaveBeenCalledWith('Failed to delete ticket ticket456: Failed');
               });

               it('should return error when all deletions fail', async () => {
                    const configWithSequences = {
                         ...baseConfig,
                         txOptions: {
                              ...baseTxOptions,
                              selectedTicketSequences: ['ticket123', 'ticket456'],
                         },
                    };

                    // Setup mock to return failure for all calls
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: false,
                         error: 'Failed',
                         mode: 'submit',
                    });

                    const result = await service.executeTicketTx('deleteTicket', configWithSequences);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('All ticket deletions failed.');
               });
          });

          describe('Environment Handling', () => {
               it('should use pre-fetched environment when provided', async () => {
                    const configWithEnv = { ...baseConfig, preFetchedEnv: mockEnv };
                    await service.executeTicketTx('createTicket', configWithEnv);

                    expect(mockTxEnvironmentService.prepareTxEnvironment).not.toHaveBeenCalled();
               });
          });

          describe('Error Handling', () => {
               it('should handle validation errors', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error 1', 'Validation error 2']);

                    const result = await service.executeTicketTx('createTicket', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.validationError).toBeTrue();
                    expect(result.error).toContain('Validation error');
                    expect(mockXrplTransactionOrchestratorService.executeTx).not.toHaveBeenCalled();
               });

               it('should handle missing required network data', async () => {
                    const invalidEnv = { ...mockEnv, accountInfo: null };
                    mockTxEnvironmentService.prepareTxEnvironment.and.resolveTo(invalidEnv);

                    const result = await service.executeTicketTx('createTicket', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toContain('Required network data missing');
               });

               it('should handle insufficient balance', async () => {
                    mockSufficentAccountBalanceService.checkXrpBalance.and.resolveTo({ success: false, error: 'Insufficient XRP balance' });

                    const result = await service.executeTicketTx('createTicket', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Insufficient XRP balance');
               });

               it('should handle transaction submission failure', async () => {
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: false,
                         error: 'Submission failed',
                         mode: 'submit',
                    });

                    const result = await service.executeTicketTx('createTicket', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Submission failed');
               });

               it('should handle unexpected errors', async () => {
                    mockTxEnvironmentService.prepareTxEnvironment.and.throwError('Unexpected error');

                    const result = await service.executeTicketTx('createTicket', baseConfig);

                    expect(result.success).toBeFalse();
                    expect(result.error).toBe('Unexpected error');
               });
          });

          describe('Simulation Mode', () => {
               it('should handle simulation mode for createTicket', async () => {
                    const simConfig = { ...baseConfig, txOptions: { ...baseTxOptions, isSimulateEnabled: true } };
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockCreateTicketTx,
                         response: {},
                    });

                    const result = await service.executeTicketTx('createTicket', simConfig);

                    expect(result.success).toBeTrue();
                    expect(result.hash).toBe('simHash');
                    expect(mockToastService.success).toHaveBeenCalled();
                    expect(mockXrplTransactionService.waitForFinalOutcome).not.toHaveBeenCalled();
               });

               it('should show correct simulation toast message for createTicket', async () => {
                    const simConfig = { ...baseConfig, txOptions: { ...baseTxOptions, isSimulateEnabled: true, ticketCountField: 5 } };
                    mockXrplTransactionOrchestratorService.executeTx.and.resolveTo({
                         success: true,
                         hash: 'simHash',
                         mode: 'simulate',
                         tx: mockCreateTicketTx,
                         response: {},
                    });

                    await service.executeTicketTx('createTicket', simConfig);

                    expect(mockToastService.success).toHaveBeenCalledWith('Simulated Creating 5 Tickets', AppConstants.TOAST.SUCCESS, false, 'simHash', 'https://explorer.xrpl.org/tx/');
               });
          });

          describe('Cleanup', () => {
               it('should reset UI state on success', async () => {
                    await service.executeTicketTx('createTicket', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
                    expect(mockTxUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
               });

               it('should reset UI state on error', async () => {
                    mockValidator.validate.and.resolveTo(['Validation error']);
                    await service.executeTicketTx('createTicket', baseConfig);

                    expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               });
          });
     });

     describe('handleSimulationSuccess', () => {
          it('should show success toast and reset UI', () => {
               const ticket = { ticketId: 'ticket123' };
               const txOptions = { ticketCountField: 5 };
               const hash = 'simHash';

               service.handleSimulationSuccess('createTicket', ticket, txOptions, hash);

               expect(mockTxUiService.resetCurrentStepToIdle).toHaveBeenCalled();
               expect(mockToastService.success).toHaveBeenCalled();
          });

          it('should return success true with hash', () => {
               const result = service.handleSimulationSuccess('createTicket', {}, {}, 'simHash');

               expect(result.success).toBeTrue();
               expect(result.hash).toBe('simHash');
          });
     });
});
