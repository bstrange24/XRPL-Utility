import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { AmmTxType, AmmTxConfig, PoolOptions } from '../../../components/amm/constants/amm.types';
import { AppConstants } from '../../../core/app.constants';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { AmmStoreService } from '../amm-store/amm-store.service';
import { AmmTransactionBuilderService } from '../amm-transaction-builder/amm-transaction-builder.service';
import { XrplService } from '../../xrpl-services/xrpl.service';

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

               // Fetch LP token participation data for operations that need it
               let lpToken: { currency: string; issuer: string; balance: string } | undefined;
               if (type === 'withdrawalFromAMM' || type === 'clawbackFromAMM' || type === 'deleteAMM' || type === 'swapViaAMM') {
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
                         return { success: false, error: 'Unexpected AMM error occurred.', validationError: true };
                    }

                    if (!lpToken && type !== 'deleteAMM') {
                         return { success: false, error: 'No LP token found for this AMM pool.', validationError: true };
                    }
               }

               // Validate LP token amount for withdraw
               if (type === 'withdrawalFromAMM' && lpToken) {
                    const lpBalance = Number.parseFloat(lpToken.balance);
                    const requested = Number.parseFloat(amm.withdrawlLpTokenFromPoolField.replaceAll(',', ''));
                    if (requested > lpBalance) {
                         return { success: false, error: `Insufficient LP token balance. Available: ${lpToken.balance}`, validationError: true };
                    }
               }

               // Build transaction
               const depositOptions: PoolOptions = extra?.['depositOptions'] ?? { bothPools: true, firstPoolOnly: false, secondPoolOnly: false };
               const withdrawOptions: PoolOptions = extra?.['withdrawOptions'] ?? { bothPools: true, firstPoolOnly: false, secondPoolOnly: false };
               const destination: string = wallet.address;
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
                         tx = this.ammTransactionBuilderService.buildClawbackFromAmmTx(effectiveWallet, amm, env, lpToken!);
                         break;
                    case 'swapViaAMM': {
                         const input = this.ammTransactionBuilderService.toXRPLCurrency(amm.weWantCurrency, amm.weWantIssuer);
                         const output = this.ammTransactionBuilderService.toXRPLCurrency(amm.weSpendCurrency, amm.weSpendIssuer);

                         if (!input || !output) {
                              throw new Error('Missing swap input/output');
                         }

                         const ammState = await this.getAmmState(client, input, output);
                         const ob = await this.getOrderBookDepth(client, input, output);

                         const route = this.decideRoute(ammState, ob, Number.parseFloat(amm.withdrawlLpTokenFromPoolField.replaceAll(',', '')));
                         const plan = this.buildExecutionPlan(route, Number.parseFloat(amm.withdrawlLpTokenFromPoolField.replaceAll(',', '')));

                         await this.debugPoolLiquidity(client);

                         tx = await this.ammTransactionBuilderService.buildTx(amm, plan, effectiveWallet, input, output, env, destination, client);
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

     async debugPoolLiquidity(client: xrpl.Client) {
          try {
               const resp = await client.request({
                    command: 'amm_info',
                    asset: { currency: 'XRP' },
                    asset2: {
                         currency: 'JOE',
                         issuer: 'rhZmA5XVLvB2dRG3wadNgxHUc9JhfBpwUM',
                    },
               });

               const a = resp.result.amm;
               console.log('🔍 AMM LIQUIDITY DEBUG:');
               console.log('   XRP in pool :', a.amount ? Number(a.amount) / 1_000_000 : 'N/A');
               console.log('   JOE in pool :', a.amount2 || 'N/A');
               console.log('   LP tokens   :', a.lp_token?.value);
               console.log('   Trading fee :', a.trading_fee);

               return a;
          } catch (e) {
               console.error('Failed to get amm_info:', e);
               return null;
          }
     }

     async getAmmState(client: xrpl.Client, currencyA: any, currencyB: any) {
          const resp = await client.request({
               command: 'amm_info',
               asset: currencyA,
               asset2: currencyB,
          });

          const amm = resp.result.amm;

          return {
               liquidityA: amm.amount,
               liquidityB: amm.amount2,
               lpFeeBps: amm.trading_fee,
               price: this.getAmountValue(amm.amount2) / this.getAmountValue(amm.amount),
          };
     }

     getAmountValue(amount: xrpl.Amount): number {
          if (typeof amount === 'string') {
               return Number(amount) / 1_000_000; // XRP drops → XRP
          }

          if ('value' in amount) {
               return Number(amount.value);
          }

          throw new Error('Unknown XRPL Amount format');
     }

     async getOrderBookDepth(client: xrpl.Client, takerPays: any, takerGets: any) {
          const resp = await client.request({
               command: 'book_offers',
               taker_pays: takerPays,
               taker_gets: takerGets,
               limit: 50,
          });

          let total = 0;
          let weighted = 0;

          for (const offer of resp.result.offers) {
               const gets = this.getAmountValue(offer.TakerGets);
               const pays = this.getAmountValue(offer.TakerPays);

               const price = pays / gets;
               const size = gets;

               weighted += price * size;
               total += size;
          }

          return {
               avgPrice: total ? weighted / total : null,
               depth: total,
          };
     }

     decideRoute(amm: any, ob: any, amountIn: number) {
          const ammCapacity = Number(amm.liquidityA);
          const obCapacity = ob.depth;

          const ammPrice = amm.price;
          const obPrice = ob.avgPrice ?? ammPrice;

          const ammScore = ammCapacity > amountIn ? ammPrice : ammPrice * 1.02;
          const obScore = obCapacity > amountIn ? obPrice : obPrice * 1.03;

          const best = Math.min(ammScore, obScore);

          if (Math.abs(ammScore - obScore) < 0.005) {
               return 'HYBRID';
          }

          return best === ammScore ? 'AMM' : 'ORDERBOOK';
     }

     buildExecutionPlan(route: string, amountIn: number) {
          // For cross-currency payments (XRP -> non-XRP), we need tfPartialPayment
          // This is because the actual amount received may vary based on the exchange rate
          switch (route) {
               case 'AMM':
                    return {
                         type: 'AMM_ONLY',
                         useDeliverMin: true,
                         usePartial: true, // Always true for AMM routes with non-XRP destination
                    };

               case 'ORDERBOOK':
                    return {
                         type: 'BOOK_ONLY',
                         useDeliverMin: true,
                         usePartial: true, // Always true for order book routes with non-XRP destination
                    };

               case 'HYBRID':
                    return {
                         type: 'HYBRID',
                         useDeliverMin: true,
                         usePartial: true, // Always true for hybrid routes with non-XRP destination
                    };
          }
          return {
               type: 'AMM_ONLY',
               useDeliverMin: true,
               usePartial: true,
          };
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
