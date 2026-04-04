import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { AmmTxType, AmmTxConfig, PoolOptions } from '../../../components/amm/constants/amm.types';
import { AppConstants } from '../../../core/app.constants';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { AMM_VALIDATION_RULES } from '../../../components/amm/constants/amm.constants';
import { AmmState, AmmStoreService } from '../amm-store/amm-store.service';
import { AmmTransactionBuilderService } from '../amm-transaction-builder/amm-transaction-builder.service';
import { XrplService } from '../../xrpl-services/xrpl.service';

type AmmValidationMeta = {
     buildValidationInputs: (args: { wallet: Wallet; env: any; amm: AmmState; account: any; txOptions: any }) => any;
};

const AMM_VALIDATION_META: Record<AmmTxType, AmmValidationMeta> = {
     createAMM: {
          buildValidationInputs: ({ wallet, env, amm, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               firstPoolAssetAmount: amm.weWantAmount,
               secondPoolAssetAmount: amm.weSpendAmount,
               firstPoolCurrencyField: amm.weWantCurrency,
               secondPoolCurrencyField: amm.weSpendCurrency,
               firstPoolIssuerField: amm.weWantIssuer,
               secondPoolIssuerField: amm.weSpendIssuer,
               tradingFeeField: amm.tradingFeeField,
          }),
     },
     depositToAMM: {
          buildValidationInputs: ({ wallet, env, amm, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               weWantCurrencyField: amm.weWantCurrency,
               weSpendCurrencyField: amm.weSpendCurrency,
               weWantIssuerField: amm.weWantIssuer,
               weSpendIssuerField: amm.weSpendIssuer,
               weWantAmountField: amm.weWantAmount,
               weSpendAmountField: amm.weSpendAmount,
          }),
     },
     withdrawlTokenFromAMM: {
          buildValidationInputs: ({ wallet, env, amm, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               weWantCurrencyField: amm.weWantCurrency,
               weSpendCurrencyField: amm.weSpendCurrency,
               weWantIssuerField: amm.weWantIssuer,
               weSpendIssuerField: amm.weSpendIssuer,
               weWantAmountField: amm.weWantAmount,
               weSpendAmountField: amm.weSpendAmount,
          }),
     },
     clawbackFromAMM: {
          buildValidationInputs: ({ wallet, env, amm, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               weWantCurrencyField: amm.weWantCurrency,
               weSpendCurrencyField: amm.weSpendCurrency,
               weWantIssuerField: amm.weWantIssuer,
               weSpendIssuerField: amm.weSpendIssuer,
               lpTokenAmountField: amm.withdrawlLpTokenFromPoolField,
          }),
     },
     swapViaAMM: {
          buildValidationInputs: ({ wallet, env, amm, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               weWantCurrencyField: amm.weWantCurrency,
               weSpendCurrencyField: amm.weSpendCurrency,
               weWantIssuerField: amm.weWantIssuer,
               weSpendIssuerField: amm.weSpendIssuer,
               weWantAmountField: amm.weWantAmount,
               weSpendAmountField: amm.weSpendAmount,
          }),
     },
     deleteAMM: {
          buildValidationInputs: ({ wallet, env, amm, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions?.isRegularKeyAddress,
                    address: account?.regularKeyAddress,
                    seed: account?.regularKeySeed,
               },
               env,
               weWantCurrencyField: amm.weWantCurrency,
               weSpendCurrencyField: amm.weSpendCurrency,
               weWantIssuerField: amm.weWantIssuer,
               weSpendIssuerField: amm.weSpendIssuer,
          }),
     },
};

@Injectable({
     providedIn: 'root',
})
export class AmmTransactionOrchestratorService {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly toastService = inject(ToastService);
     private readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     private readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     private readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionBuilderService = inject(AmmTransactionBuilderService);
     private readonly xrplService = inject(XrplService);

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

               // Validate
               const meta = AMM_VALIDATION_META[type];
               const validationInputs = meta.buildValidationInputs({ wallet, env, amm, account, txOptions });
               const errors = await this.validator.validate(AMM_VALIDATION_RULES[type], { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Fetch LP token participation data for operations that need it
               let lpToken: { currency: string; issuer: string; balance: string } | undefined;
               if (type === 'withdrawlTokenFromAMM' || type === 'clawbackFromAMM' || type === 'deleteAMM') {
                    const pool1Asset = this.ammTransactionBuilderService.toXRPLCurrency(amm.weWantCurrency, amm.weWantIssuer);
                    const pool2Asset = this.ammTransactionBuilderService.toXRPLCurrency(amm.weSpendCurrency, amm.weSpendIssuer);
                    try {
                         const ammResponse = await this.xrplService.getAMMInfo(client, pool1Asset, pool2Asset, wallet.classicAddress, 'validated');
                         if (ammResponse?.result?.amm) {
                              lpToken = {
                                   issuer: ammResponse.result.amm.account,
                                   currency: ammResponse.result.amm.lp_token.currency,
                                   balance: ammResponse.result.amm.lp_token.value,
                              };
                         }
                    } catch {
                         // AMM pool not found – builder will handle validation error
                    }

                    if (!lpToken && type !== 'deleteAMM') {
                         return { success: false, error: 'No LP token found for this AMM pool.', validationError: true };
                    }
               }

               // Validate LP token amount for withdraw
               if (type === 'withdrawlTokenFromAMM' && lpToken) {
                    const lpBalance = Number.parseFloat(lpToken.balance);
                    const requested = Number.parseFloat(amm.withdrawlLpTokenFromPoolField.replace(/,/g, ''));
                    if (requested > lpBalance) {
                         return { success: false, error: `Insufficient LP token balance. Available: ${lpToken.balance}`, validationError: true };
                    }
               }

               // Build transaction
               const depositOptions: PoolOptions = extra?.['depositOptions'] ?? { bothPools: true, firstPoolOnly: false, secondPoolOnly: false };
               const withdrawOptions: PoolOptions = extra?.['withdrawOptions'] ?? { bothPools: true, firstPoolOnly: false, secondPoolOnly: false };
               const destination: string = extra?.['destination'] ?? '';
               const effectiveWallet: xrpl.Wallet = env.wallet || wallet;

               let tx: xrpl.Transaction;
               switch (type) {
                    case 'createAMM':
                         tx = this.ammTransactionBuilderService.buildCreateAmmTx(effectiveWallet, amm, env);
                         break;
                    case 'depositToAMM':
                         tx = this.ammTransactionBuilderService.buildDepositToAmmTx(effectiveWallet, amm, env, depositOptions);
                         break;
                    case 'withdrawlTokenFromAMM':
                         tx = this.ammTransactionBuilderService.buildWithdrawFromAmmTx(effectiveWallet, amm, env, withdrawOptions, lpToken!);
                         break;
                    case 'clawbackFromAMM':
                         tx = this.ammTransactionBuilderService.buildClawbackFromAmmTx(effectiveWallet, amm, env, lpToken!);
                         break;
                    case 'swapViaAMM':
                         tx = this.ammTransactionBuilderService.buildSwapViaAmmTx(effectiveWallet, amm, env, destination);
                         break;
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
               withdrawlTokenFromAMM: 'Simulated AMM Withdraw successfully!',
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
               withdrawlTokenFromAMM: 'Withdrew from AMM successfully!',
               clawbackFromAMM: 'Clawback from AMM successful!',
               swapViaAMM: 'Swap via AMM successful!',
               deleteAMM: 'AMM deleted successfully!',
          };
          return map[type] ?? 'Transaction successful!';
     }
}
