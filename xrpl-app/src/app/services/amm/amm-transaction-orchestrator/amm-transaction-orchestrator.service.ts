import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';

import { AMM_VALIDATION_RULES } from '../../../components/amm/constants/amm.constants';
import { AmmTxConfig, AmmTxType, PoolOptions } from '../../../components/amm/constants/amm.types';
import { AppConstants } from '../../../core/app.constants';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { AmmStoreService } from '../amm-store/amm-store.service';
import { AmmTransactionBuilderService } from '../amm-transaction-builder/amm-transaction-builder.service';

@Injectable({
     providedIn: 'root',
})
export class AmmTransactionOrchestratorService {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly toastService = inject(ToastService);
     private readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     private readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     private readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionBuilderService = inject(AmmTransactionBuilderService);
     private readonly xrplService = inject(XrplService);
     private readonly validator = inject(ValidationService);

     async executeAmmTx(type: AmmTxType, config: AmmTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { amm, account, txOptions, preFetchedEnv, wallet, extra } = config;
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
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               const validationInputs = {
                    ...amm,
                    weWantCurrencyField: amm.weWantCurrency,
                    weWantIssuerField: amm.weWantIssuer,
                    weWantAmountField: amm.weWantAmount,
                    weSpendCurrencyField: amm.weSpendCurrency,
                    weSpendIssuerField: amm.weSpendIssuer,
                    weSpendAmountField: amm.weSpendAmount,
                    firstPoolCurrencyField: amm.weWantCurrency,
                    firstPoolIssuerField: amm.weWantIssuer,
                    firstPoolAssetAmount: amm.weWantAmount,
                    secondPoolCurrencyField: amm.weSpendCurrency,
                    secondPoolIssuerField: amm.weSpendIssuer,
                    secondPoolAssetAmount: amm.weSpendAmount,
                    maximumTokenAmountField: amm.withdrawlLpTokenFromPoolField,
                    isTicket: txOptions?.isTicket,
                    selectedSingleTicket: txOptions?.selectedSingleTicket,
                    regularKey: {
                         isRegularKey: txOptions?.isRegularKeyAddress,
                         address: account?.regularKeyAddress,
                         seed: account?.regularKeySeed,
                    },
                    isRegularKey: {
                         isRegularKey: txOptions?.isRegularKeyAddress,
                         address: account?.regularKeyAddress,
                         seed: account?.regularKeySeed,
                    },
                    multiSign: {
                         enabled: txOptions?.useMultiSign,
                         seeds: typeof account?.multiSignSeeds === 'string' ? account.multiSignSeeds.split(/[\r\n,]+/).map((seed: string) => seed.trim()).filter(Boolean) : [],
                    },
                    multiSignAddresses: account?.multiSignAddress,
                    multiSignSeeds: account?.multiSignSeeds,
                    signingAccount: wallet.classicAddress,
               };
               const validationErrors = await this.validator.validate(AMM_VALIDATION_RULES[type], {
                    inputs: validationInputs,
                    client,
                    accountInfo: env.accountInfo,
               });
               if (validationErrors.length > 0) {
                    return { success: false, error: validationErrors.join('\n• '), validationError: true };
               }

               // Resolve the selected pool for operations that require an existing AMM.
               let lpToken: { currency: string; issuer: string; balance: string } | undefined;
               if (type === 'withdrawalFromAMM' || type === 'clawbackFromAMM' || type === 'deleteAMM' || type === 'swapViaAMM') {
                    const pool1Asset = this.ammTransactionBuilderService.toXRPLCurrency(amm.weWantCurrency, amm.weWantIssuer);
                    const pool2Asset = this.ammTransactionBuilderService.toXRPLCurrency(amm.weSpendCurrency, amm.weSpendIssuer);
                    try {
                         const ammResponse = await this.xrplService.getAMMInfo(client, pool1Asset, pool2Asset, type === 'withdrawalFromAMM' ? wallet.classicAddress : undefined, 'validated');
                         const ammInfo = ammResponse?.result?.amm;
                         if (!ammInfo) {
                              return { success: false, error: 'AMM pool not found for this asset pair.', validationError: true };
                         }

                         if (type === 'withdrawalFromAMM' && ammInfo.lp_token) {
                              lpToken = {
                                   issuer: ammInfo.lp_token.issuer || ammInfo.account,
                                   currency: ammInfo.lp_token.currency,
                                   balance: ammInfo.lp_token.value || '0',
                              };
                         }
                    } catch (error) {
                         console.error('Failed to load AMM pool:', error);
                         return { success: false, error: 'Failed to load AMM pool for this asset pair.', validationError: true };
                    }

                    if (type === 'withdrawalFromAMM' && !lpToken) {
                         return { success: false, error: 'No LP token balance found for this account in the selected AMM pool.', validationError: true };
                    }
               }

               // Validate LP token amount for withdraw
               if (type === 'withdrawalFromAMM' && lpToken) {
                    const lpBalance = Number.parseFloat(lpToken.balance);
                    const requestedValue = typeof amm.withdrawlLpTokenFromPoolField === 'string' ? amm.withdrawlLpTokenFromPoolField.replaceAll(',', '').trim() : '';
                    const requested = Number(requestedValue);
                    if (!Number.isFinite(lpBalance) || lpBalance < 0) {
                         return { success: false, error: 'Unable to determine LP token balance for this account.', validationError: true };
                    }
                    if (!requestedValue || !Number.isFinite(requested) || requested <= 0) {
                         return { success: false, error: 'LP token amount must be a positive number.', validationError: true };
                    }
                    if (requested > lpBalance) {
                         return { success: false, error: `Insufficient LP token balance. Available: ${lpToken.balance}`, validationError: true };
                    }
               }

               // Build transaction
               const depositOptions: PoolOptions = extra?.['depositOptions'] ?? { bothPools: true, firstPoolOnly: false, secondPoolOnly: false };
               const withdrawOptions: PoolOptions = extra?.['withdrawOptions'] ?? { bothPools: true, firstPoolOnly: false, secondPoolOnly: false };
               const destination: string = extra?.['destination'] || wallet.address;
               const effectiveWallet: xrpl.Wallet = env.wallet || wallet;

               let tx: xrpl.Transaction;
               switch (type) {
                    case 'createAMM':
                         tx = this.ammTransactionBuilderService.buildCreateAmmTx(effectiveWallet, amm, env);
                         break;
                    case 'depositToAMM':
                         tx = this.ammTransactionBuilderService.buildDepositToAmmTx(effectiveWallet, amm, env, depositOptions);
                         break;
                    case 'withdrawalFromAMM':
                         tx = this.ammTransactionBuilderService.buildWithdrawFromAmmTx(effectiveWallet, amm, env, withdrawOptions, lpToken!);
                         break;
                    case 'clawbackFromAMM':
                         tx = this.ammTransactionBuilderService.buildClawbackFromAmmTx(effectiveWallet, amm, env);
                         break;
                    case 'swapViaAMM': {
                         tx = this.ammTransactionBuilderService.buildSwapViaAmmTx(effectiveWallet, amm, env, destination);
                         break;
                    }
                    case 'deleteAMM':
                         tx = this.ammTransactionBuilderService.buildDeleteAmmTx(effectiveWallet, amm, env);
                         break;
                    default:
                         throw new Error(`Unknown AMM transaction type: ${type}`);
               }

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, amm, type, txOptions);

               // Balance check
               const balanceCheck = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!balanceCheck.success) return { success: false, error: balanceCheck.error };

               //  Submit / simulate
               const submitOrSimResult = await this.xrplTransactionOrchestratorService.executeTx({
                    client,
                    wallet: effectiveWallet,
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
                    const msg = this.getSimulationMessage(type);
                    this.txUiService.resetCurrentStepToIdle();
                    this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, txHash, this.txUiService.explorerUrl() + 'tx/');
                    return { success: true, hash: txHash };
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const successMsg = this.getSuccessMessage(type);
               this.xrplTransactionService.processTxFinalResult(finalResult, successMsg, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeAmmTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     private getSimulationMessage(type: AmmTxType): string {
          const map: Record<AmmTxType, string> = {
               createAMM: 'Simulated AMM Create successfully!',
               depositToAMM: 'Simulated AMM Deposit successfully!',
               withdrawalFromAMM: 'Simulated AMM Withdraw successfully!',
               clawbackFromAMM: 'Simulated AMM Clawback successfully!',
               swapViaAMM: 'Simulated AMM Swap successfully!',
               deleteAMM: 'Simulated AMM Delete successfully!',
          };
          return map[type] ?? 'Simulated transaction successfully!';
     }

     private getSuccessMessage(type: AmmTxType): string {
          const map: Record<AmmTxType, string> = {
               createAMM: 'AMM created successfully!',
               depositToAMM: 'Deposited to AMM successfully!',
               withdrawalFromAMM: 'Withdrew from AMM successfully!',
               clawbackFromAMM: 'Clawback from AMM successful!',
               swapViaAMM: 'Swap via AMM successful!',
               deleteAMM: 'AMM deleted successfully!',
          };
          return map[type] ?? 'Transaction successful!';
     }
}
