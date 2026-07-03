import { inject, Injectable } from '@angular/core';
import { LoanBrokerConfig, LoanBrokerTxType } from '../../../components/loan-broker/constants/loan-broker.types';
import * as xrpl from 'xrpl';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { AppConstants } from '../../../core/app.constants';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { LoanBrokerTransactionBuilderService } from '../loan-broker-transaction-builder/loan-broker-transaction-builder.service';
import { LoanTransactionBuilderService } from '../../loan/loan-transaction-builder/loan-transaction-builder.service';

type LoanBrokerTxMeta = {
     buildTx: (args: { orchestrator: LoanBrokerTransactionOrchestratorService; client: xrpl.Client; env: any; wallet: any; broker: any; loan?: any }) => xrpl.Transaction | Promise<xrpl.Transaction>;
     simulationToastMessage: (args: { orchestrator: LoanBrokerTransactionOrchestratorService; broker: any; loan?: any }) => string;
     successMessage: (args: { orchestrator: LoanBrokerTransactionOrchestratorService; broker: any; loan?: any }) => string;
};

const LOAN_BROKER_META: Record<LoanBrokerTxType, LoanBrokerTxMeta> = {
     createBroker: {
          buildTx: ({ orchestrator, client, env, wallet, broker }) => orchestrator.loanBrokerTransactionBuilderService.buildLoanBrokerSetTx(env.wallet || wallet, env, broker, false),
          simulationToastMessage: ({ orchestrator, broker }) => `Simulated creating Loan Broker with Vault ID ${broker.vaultId || 'N/A'}`,
          successMessage: ({ orchestrator, broker }) => {
               const vaultId = broker.vaultId || '';
               const shortVaultId = vaultId.length > 16 ? `${vaultId.slice(0, 8)}...${vaultId.slice(-8)}` : vaultId;
               return `Successfully created Loan Broker for Vault ${shortVaultId}`;
          },
     },

     modifyBroker: {
          buildTx: ({ orchestrator, client, env, wallet, broker }) => orchestrator.loanBrokerTransactionBuilderService.buildLoanBrokerSetTx(env.wallet || wallet, env, broker, true),
          simulationToastMessage: ({ orchestrator, broker }) => `Simulated modifying Loan Broker ${broker.selectedBrokerId || 'N/A'}`,
          successMessage: ({ orchestrator, broker }) => {
               const brokerId = broker.selectedBrokerId || '';
               const shortBrokerId = brokerId.length > 16 ? `${brokerId.slice(0, 8)}...${brokerId.slice(-8)}` : brokerId;
               return `Successfully modified Loan Broker ${shortBrokerId}`;
          },
     },

     deleteBroker: {
          buildTx: ({ orchestrator, client, env, wallet, broker }) => orchestrator.loanBrokerTransactionBuilderService.buildLoanBrokerDeleteTx(env.wallet || wallet, env, broker),
          simulationToastMessage: ({ orchestrator, broker }) => `Simulated deleting Loan Broker ${broker.selectedBrokerId || 'N/A'}`,
          successMessage: ({ orchestrator, broker }) => {
               const brokerId = broker.selectedBrokerId || '';
               const shortBrokerId = brokerId.length > 16 ? `${brokerId.slice(0, 8)}...${brokerId.slice(-8)}` : brokerId;
               return `Successfully deleted Loan Broker ${shortBrokerId}`;
          },
     },

     coverDeposit: {
          buildTx: ({ orchestrator, client, env, wallet, broker }) => orchestrator.loanBrokerTransactionBuilderService.buildLoanBrokerCoverDepositTx(env.wallet || wallet, client, env, broker),
          simulationToastMessage: ({ orchestrator, broker }) => `Simulated depositing ${broker.debtMaximum || '0'} into Loan Broker cover`,
          successMessage: ({ orchestrator, broker }) => {
               const amount = broker.debtMaximum || '0';
               return `Successfully deposited ${amount} into Loan Broker cover`;
          },
     },

     coverWithdraw: {
          buildTx: ({ orchestrator, client, env, wallet, broker }) => orchestrator.loanBrokerTransactionBuilderService.buildLoanBrokerCoverWithdrawTx(env.wallet || wallet, client, env, broker, broker.destination, broker.destinationTag),
          simulationToastMessage: ({ orchestrator, broker }) => `Simulated withdrawing ${broker.debtMaximum || '0'} from Loan Broker cover`,
          successMessage: ({ orchestrator, broker }) => {
               const amount = broker.debtMaximum || '0';
               return `Successfully withdrew ${amount} from Loan Broker cover`;
          },
     },

     coverClawback: {
          buildTx: ({ orchestrator, client, env, wallet, broker }) => orchestrator.loanBrokerTransactionBuilderService.buildLoanBrokerCoverClawbackTx(env.wallet || wallet, client, env, broker),
          simulationToastMessage: ({ orchestrator, broker }) => `Simulated clawing back ${broker.debtMaximum || 'maximum'} from Loan Broker cover`,
          successMessage: ({ orchestrator, broker }) => {
               const amount = broker.debtMaximum || 'maximum allowed';
               return `Successfully clawed back ${amount} from Loan Broker cover`;
          },
     },

     modifyLoan: {
          buildTx: ({ orchestrator, env, wallet, loan }) => orchestrator.loanTransactionBuilderService.buildLoanSetTx(env.wallet || wallet, env, loan),
          simulationToastMessage: ({ orchestrator, loan }) => `Simulated modifying Loan ${loan.selectedLoanId || 'N/A'}`,
          successMessage: ({ orchestrator, loan }) => {
               const loanId = loan.selectedLoanId || '';
               const shortId = loanId.length > 16 ? `${loanId.slice(0, 8)}...${loanId.slice(-8)}` : loanId;
               return `Successfully modified Loan ${shortId}`;
          },
     },

     impairLoan: {
          buildTx: ({ orchestrator, env, wallet, loan }) => orchestrator.loanTransactionBuilderService.buildLoanManageTx(env.wallet || wallet, env, { ...loan, tfLoanImpair: true }),
          simulationToastMessage: ({ orchestrator, loan }) => `Simulated impairing Loan ${loan.selectedLoanId || 'N/A'}`,
          successMessage: ({ orchestrator, loan }) => {
               const loanId = loan.selectedLoanId || '';
               const shortId = loanId.length > 16 ? `${loanId.slice(0, 8)}...${loanId.slice(-8)}` : loanId;
               return `Successfully impaired Loan ${shortId}`;
          },
     },
     unimpairLoan: {
          buildTx: ({ orchestrator, env, wallet, loan }) => orchestrator.loanTransactionBuilderService.buildLoanManageTx(env.wallet || wallet, env, { ...loan, tfLoanUnimpair: true }),
          simulationToastMessage: ({ orchestrator, loan }) => `Simulated un-impairing Loan ${loan.selectedLoanId || 'N/A'}`,
          successMessage: ({ orchestrator, loan }) => {
               const loanId = loan.selectedLoanId || '';
               const shortId = loanId.length > 16 ? `${loanId.slice(0, 8)}...${loanId.slice(-8)}` : loanId;
               return `Successfully un-impaired Loan ${shortId}`;
          },
     },
     defaultLoan: {
          buildTx: ({ orchestrator, env, wallet, loan }) => orchestrator.loanTransactionBuilderService.buildLoanManageTx(env.wallet || wallet, env, { ...loan, tfLoanDefault: true }),
          simulationToastMessage: ({ orchestrator, loan }) => `Simulated defaulting Loan ${loan.selectedLoanId || 'N/A'}`,
          successMessage: ({ orchestrator, loan }) => {
               const loanId = loan.selectedLoanId || '';
               const shortId = loanId.length > 16 ? `${loanId.slice(0, 8)}...${loanId.slice(-8)}` : loanId;
               return `Successfully defaulted Loan ${shortId}`;
          },
     },
};

@Injectable({
     providedIn: 'root',
})
export class LoanBrokerTransactionOrchestratorService {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly utilsService = inject(UtilsService);
     public readonly toastService = inject(ToastService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly loanBrokerTransactionBuilderService = inject(LoanBrokerTransactionBuilderService);
     public readonly loanTransactionBuilderService = inject(LoanTransactionBuilderService);

     async executeLoanBrokerTx(type: LoanBrokerTxType, config: LoanBrokerConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { broker, loan, account, txOptions, preFetchedEnv, wallet } = config;
          let env: any;
          let client: xrpl.Client;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               // Use pre-fetched env if provided, otherwise fetch
               env =
                    preFetchedEnv ??
                    (await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                         includeDestinationAccountInfo: type === 'coverWithdraw',
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) {
                    throw new Error('Required network data missing');
               }

               // Build transaction
               const meta = LOAN_BROKER_META[type];
               const tx = await meta.buildTx({
                    orchestrator: this,
                    client,
                    env,
                    wallet,
                    broker,
                    loan,
               });

               // Optional fields (memos, etc.)
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.extra, type, txOptions);

               // Balance checks
               let isInsufficientBalance;
               if (type === 'coverDeposit' || type === 'coverWithdraw') {
                    const amount = broker.debtMaximum || '0';
                    const amountValue = (tx as any).Amount;
                    const isXrpAmount = typeof amountValue === 'string' || (typeof amountValue === 'object' && !amountValue?.currency && !amountValue?.issuer && !amountValue?.mpt_issuance_id);
                    if (isXrpAmount) {
                         isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, amount);
                    } else {
                         isInsufficientBalance = { success: true, error: '' };
                    }
               } else {
                    // For other operations, just check enough for fee
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               }

               if (!isInsufficientBalance.success) {
                    return { success: false, error: isInsufficientBalance.error };
               }

               // Submit / simulate
               const submitOrSimResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet: env.wallet || wallet,
                    env,

                    mode: txOptions?.isSimulateEnabled ? 'simulate' : 'submit',
                    skipBalanceCheck: true,

                    ui: {
                         suppressIndividualFeedback: false,
                    },

                    signing: {
                         useMultiSign: txOptions?.useMultiSign,
                         multiSignAddress: account?.multiSignAddress,
                         multiSignSeeds: account?.multiSignSeeds,
                         isRegularKeyAddress: txOptions?.isRegularKeyAddress,
                         regularKeySeed: account?.regularKeySeed,
                         regularKeyAddress: account?.regularKeyAddress,
                    },

                    buildTx: () => tx as any,
               });

               if (!submitOrSimResult.success) {
                    return { success: false, error: submitOrSimResult.error };
               }

               txHash = submitOrSimResult.hash;

               // Simulated toast
               if (submitOrSimResult.mode === 'simulate') {
                    return this.handleSimulationSuccess(type, broker, txHash);
               }

               // Final validated outcome
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, broker });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, {
                    success: true,
                    hash: txHash,
               });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeLoanBrokerTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return {
                    success: false,
                    error: err.message || 'Unexpected error',
                    validationError: false,
               };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(type: LoanBrokerTxType, broker: any, hash?: string): { success: boolean; hash?: string } {
          const msg = LOAN_BROKER_META[type].simulationToastMessage({
               orchestrator: this,
               broker,
          });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
