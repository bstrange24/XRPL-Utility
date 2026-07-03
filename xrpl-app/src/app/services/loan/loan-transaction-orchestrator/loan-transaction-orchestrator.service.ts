import { inject, Injectable } from '@angular/core';
import { AppConstants } from '../../../core/app.constants';
import { LoanConfig } from '../../../components/loan/constants/loan.types';
import { LoanTxTypes } from '../../../components/loan/constants/loan.constants';
import { LoanTransactionBuilderService } from '../loan-transaction-builder/loan-transaction-builder.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';

type LoanTxMeta = {
     buildTx: (args: { orchestrator: LoanTransactionOrchestratorService; env: any; wallet: any; loan: any; amount?: string; vault: any; loanBroker: any }) => xrpl.Transaction | Promise<xrpl.Transaction>;
     simulationToastMessage: (args: { orchestrator: LoanTransactionOrchestratorService; loan: any; amount?: string }) => string;
     successMessage: (args: { orchestrator: LoanTransactionOrchestratorService; loan: any; amount?: string }) => string;
};

const LOAN_META: Record<LoanTxTypes, LoanTxMeta> = {
     createLoan: {
          buildTx: ({ orchestrator, env, wallet, loan }) => orchestrator.loanTransactionBuilderService.buildLoanSetTx(env.wallet || wallet, env, loan),
          simulationToastMessage: ({ orchestrator, loan }) => `Simulated creating Loan with Broker ID ${loan.loanBrokerId || 'N/A'}`,
          successMessage: ({ orchestrator, loan }) => {
               const brokerId = loan.loanBrokerId || '';
               const shortId = brokerId.length > 16 ? `${brokerId.slice(0, 8)}...${brokerId.slice(-8)}` : brokerId;
               return `Successfully created Loan for Broker ${shortId}`;
          },
     },
     payLoan: {
          buildTx: ({ orchestrator, env, wallet, loan, vault, loanBroker, amount }) => {
               const loanAsset = loan.assetType || { currency: 'XRP' };
               return orchestrator.loanTransactionBuilderService.buildLoanPayTx(env.wallet || wallet, env, loan, vault, loanBroker, amount || '0', loanAsset);
          },
          simulationToastMessage: ({ orchestrator, loan, amount }) => `Simulated paying ${amount || '0'} on Loan ${loan.selectedLoanId || 'N/A'}`,
          successMessage: ({ orchestrator, loan, amount }) => {
               const loanId = loan.selectedLoanId || '';
               const shortId = loanId.length > 16 ? `${loanId.slice(0, 8)}...${loanId.slice(-8)}` : loanId;
               return `Successfully paid ${amount || '0'} on Loan ${shortId}`;
          },
     },
     deleteLoan: {
          buildTx: ({ orchestrator, env, wallet, loan }) => orchestrator.loanTransactionBuilderService.buildLoanDeleteTx(env.wallet || wallet, env, loan),
          simulationToastMessage: ({ orchestrator, loan }) => `Simulated closing Loan ${loan.selectedLoanId || 'N/A'}`,
          successMessage: ({ orchestrator, loan }) => {
               const loanId = loan.selectedLoanId || '';
               const shortId = loanId.length > 16 ? `${loanId.slice(0, 8)}...${loanId.slice(-8)}` : loanId;
               return `Successfully closed Loan ${shortId}`;
          },
     },
};

@Injectable({
     providedIn: 'root',
})
export class LoanTransactionOrchestratorService {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly utilsService = inject(UtilsService);
     public readonly toastService = inject(ToastService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly loanTransactionBuilderService = inject(LoanTransactionBuilderService);

     private async handleCosignedLoan(client: xrpl.Client, wallet: xrpl.Wallet, counterpartySeed: string, tx: xrpl.Transaction, env: any, txOptions?: any, account?: any): Promise<{ success: boolean; hash?: string; error?: string }> {
          try {
               // Ensure the transaction has a sufficient fee
               const baseFee = parseInt(env.fee || '10');
               const minFee = baseFee * 2;

               const txToSign = { ...tx };

               if (!txToSign.Fee || parseInt(txToSign.Fee as string) < minFee) {
                    txToSign.Fee = minFee.toString();
               }

               if (!txToSign.Sequence) {
                    const accountInfo = await client.request({
                         command: 'account_info',
                         account: wallet.address,
                         ledger_index: 'validated',
                    });
                    txToSign.Sequence = accountInfo.result.account_data.Sequence;
               }

               // Step 1: First signer (the initiator - Vault Owner)
               const firstWallet = xrpl.Wallet.fromSeed(wallet.seed!); // Use the provided wallet directly
               const firstSigned = firstWallet.sign(txToSign);
               const firstTx = xrpl.decode(firstSigned.tx_blob);

               // Step 2: Create counterparty wallet from seed (Borrower)
               const counterpartyWallet = xrpl.Wallet.fromSeed(counterpartySeed);

               // Step 3: Counterparty signs using signLoanSetByCounterparty
               const fullySigned = xrpl.signLoanSetByCounterparty(counterpartyWallet, firstTx as any);

               console.log('fullySigned: ', fullySigned);

               // Step 4: Submit the cosigned transaction using the orchestrator
               // IMPORTANT: Use 'submit' mode (not 'simulate' if already signed)
               // The transaction is already signed, so we just need to submit it
               const submitResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet, // Pass the original wallet
                    env,

                    mode: txOptions?.isSimulateEnabled ? 'simulate' : 'submit',
                    skipBalanceCheck: true,
                    skipSigning: true, // NEW: Tell the orchestrator to skip signing

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

                    // Pass the already-signed transaction as the buildTx
                    buildTx: () => fullySigned.tx as any,

                    // Also pass the tx_blob directly to avoid re-signing
                    preSignedTxBlob: fullySigned.tx_blob,
               });

               if (!submitResult.success) {
                    return { success: false, error: submitResult.error };
               }

               return { success: true, hash: submitResult.hash };
          } catch (error: any) {
               console.error('Cosigning failed:', error);
               return { success: false, error: error.message || 'Cosigning failed' };
          }
     }

     async executeLoanTx(type: LoanTxTypes, config: LoanConfig, amount?: string): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { loan, account, vault, loanBroker, txOptions, preFetchedEnv, wallet } = config;
          let env: any;
          let client: xrpl.Client;
          let txHash: string | undefined;

          try {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               env =
                    preFetchedEnv ??
                    (await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         includeServerInfo: true,
                         includeDestinationAccountInfo: type === 'payLoan',
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               const meta = LOAN_META[type];

               // For createLoan with counterparty, handle cosigning specially
               if (type === 'createLoan' && loan.counterparty && loan.counterpartySeed) {
                    // Build the transaction
                    const baseTx = await this.loanTransactionBuilderService.buildLoanSetTx(wallet, env, loan, true);

                    console.log('Base transaction before autofill:', JSON.stringify(baseTx, null, 2));

                    // Autofill with type assertion
                    const autofilledTx = await client.autofill(baseTx as any);

                    console.log('Autofilled transaction:', JSON.stringify(autofilledTx, null, 2));

                    // Adjust fee
                    const baseFee = parseInt(env.fee || '12');
                    const minFee = baseFee * 5;

                    if (parseInt(autofilledTx.Fee as string) < minFee) {
                         autofilledTx.Fee = minFee.toString();
                         console.log(`Fee adjusted from ${baseTx.Fee} to ${autofilledTx.Fee}`);
                    }

                    console.log('Final transaction before cosigning:', JSON.stringify(autofilledTx, null, 2));

                    // Handle cosigned loan - this does the signing
                    const cosignResult = await this.handleCosignedLoan(client, wallet, loan.counterpartySeed, autofilledTx, env, txOptions, account);

                    if (cosignResult.success) {
                         this.toastService.success('Loan created successfully!', AppConstants.TOAST.SUCCESS);
                         return { success: true, hash: cosignResult.hash };
                    } else {
                         return { success: false, error: cosignResult.error };
                    }
               }

               // Regular flow for non-cosigned transactions
               const tx = await meta.buildTx({ orchestrator: this, env, wallet, loan, vault, loanBroker, amount });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.extra, type, txOptions);

               let isInsufficientBalance;
               if (type === 'payLoan') {
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, amount || '0');
               } else {
                    isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               }
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               // Submit / simulate using the orchestrator
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

               if (!submitOrSimResult.success) return { success: false, error: submitOrSimResult.error };

               txHash = submitOrSimResult.hash;

               // Simulated toast
               if (submitOrSimResult.mode === 'simulate') {
                    return this.handleSimulationSuccess(type, loan, amount, txHash);
               }

               // Final validated outcome
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, loan, amount });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeLoanTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(type: LoanTxTypes, loan: any, amount?: string, hash?: string): { success: boolean; hash?: string } {
          const msg = LOAN_META[type].simulationToastMessage({ orchestrator: this, loan, amount });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
