import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { AmmTxType, AmmTxConfig } from '../../../components/amm/constants/amm.types';
import { NftOfferTxType } from '../../../components/nft-offers/constants/nft-offers.types';
import { AppConstants } from '../../../core/app.constants';
import { ChecksTransactionBuilderService } from '../../checks/checks-transaction-builder/checks-transaction-builder.service';
import { NftTransactionBuilderService } from '../../nft/nft-transaction-builder/nft-transaction-builder.service';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { AMM_TX_TYPES, AMM_VALIDATION_RULES } from '../../../components/amm/constants/amm.constants';
import { AmmStoreService } from '../amm-store/amm-store.service';

type NftOfferMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; amm: any; account: any; txOptions: any; currency: any }) => any;
     buildTx: (args: { orchestrator: AmmTransactionOrchestratorService; env: any; wallet: any; amm: any; currency: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: AmmTransactionOrchestratorService; amm: any }) => string;
     successMessage: (args: { orchestrator: AmmTransactionOrchestratorService; amm: any }) => string;
};

const NFT_META: Record<NftOfferTxType, NftOfferMeta> = {
     createAMM: {
          validationRule: AMM_VALIDATION_RULES[AMM_TX_TYPES.CREATE_AMM],
          buildValidationInputs: ({ wallet, env, amm, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               createAMM: { nftId: amm.nftId, nftOfferId: amm.nftOfferId },
          }),
          buildTx: ({ orchestrator, env, wallet, amm }) => orchestrator.nftTransactionBuilderService.buildBuyNftDataTx(env.wallet || wallet, env, amm),
          simulationToastMessage: ({ amm }) => `Simulated Buying NFT of ${amm.nftId}`,
          successMessage: ({ amm }) => {
               return `Successfully Bought NFT of ${amm.nftId}`;
          },
     },

     depositToAMM: {
          validationRule: AMM_VALIDATION_RULES[AMM_TX_TYPES.DEPOSIT_TO_AMM],
          buildValidationInputs: ({ wallet, env, amm, account, txOptions, currency }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               depositToAMM: { nftId: amm.nftId, currency },
          }),
          buildTx: ({ orchestrator, env, wallet, amm, currency }) => orchestrator.nftTransactionBuilderService.buildDepositToAmmDataTx(env.wallet || wallet, env, amm, currency),
          simulationToastMessage: ({ amm }) => `Simulated Depositing to AMM of ${amm.nftId}`,
          successMessage: ({ amm }) => {
               return `Successfully Deposited to AMM of ${amm.nftId}`;
          },
     },

     withdrawlTokenFromAMM: {
          validationRule: AMM_VALIDATION_RULES[AMM_TX_TYPES.WITHDRAWL_TOKEN_FROM_AMM],
          buildValidationInputs: ({ wallet, env, amm, account, txOptions, currency }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               withdrawlTokenFromAMM: { nftId: amm.nftId, nftOfferId: amm.nftOfferId, currency },
          }),
          buildTx: ({ orchestrator, env, wallet, amm, currency }) => orchestrator.nftTransactionBuilderService.buildWithdrawlTokenFromAmmDataTx(env.wallet || wallet, env, amm, currency),
          simulationToastMessage: ({ amm }) => `Simulated Withdrawing Token from AMM for ${amm.nftId}`,
          successMessage: ({ amm }) => `Successfully Withdrew Token from AMM for ${amm.nftId}`,
     },

     clawbackFromAMM: {
          validationRule: AMM_VALIDATION_RULES[AMM_TX_TYPES.CLAWBACK],
          buildValidationInputs: ({ wallet, env, amm, account, txOptions, currency }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               clawbackFromAMM: { nftId: amm.nftId, nftOfferId: amm.nftOfferId, currency },
          }),
          buildTx: ({ orchestrator, env, wallet, amm, currency }) => orchestrator.nftTransactionBuilderService.buildClawbackFromAmmDataTx(env.wallet || wallet, env, amm, currency),
          simulationToastMessage: ({ amm }) => `Simulated Clawback from AMM for ${amm.nftId}`,
          successMessage: ({ amm }) => `Successfully Clawed back from AMM for ${amm.nftId}`,
     },

     swapViaAMM: {
          validationRule: AMM_VALIDATION_RULES[AMM_TX_TYPES.SWAP],
          buildValidationInputs: ({ wallet, env, amm, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               swapViaAMM: { nftOfferId: amm.nftOfferId },
          }),
          buildTx: ({ orchestrator, env, wallet, amm }) => orchestrator.nftTransactionBuilderService.buildSwapViaAmmDataTx(env.wallet || wallet, env, amm),
          simulationToastMessage: ({ amm }) => `Simulated Swapping via AMM for ${amm.nftOfferId}`,
          successMessage: ({ amm }) => `Successfully Swapped via AMM for ${amm.nftOfferId}`,
     },

     swapViaAMM: {
          validationRule: AMM_VALIDATION_RULES[AMM_TX_TYPES.SWAP],
          buildValidationInputs: ({ wallet, env, amm, account, txOptions }) => ({
               wallet,
               network: {
                    accountInfo: env.accountInfo,
                    accountObjects: env.accountObjects,
                    fee: env.fee,
                    currentLedger: env.ledgerInfo.lastIndex,
               },
               regularKey: {
                    isRegularKey: txOptions.isRegularKeyAddress,
                    address: account.regularKeyAddress,
                    seed: account.regularKeySeed,
               },
               env,
               swapViaAMM: { nftOfferId: amm.nftOfferId },
          }),
          buildTx: ({ orchestrator, env, wallet, amm }) => orchestrator.nftTransactionBuilderService.buildSwapViaAmmDataTx(env.wallet || wallet, env, amm),
          simulationToastMessage: ({ amm }) => `Simulated Swapping via AMM for ${amm.nftOfferId}`,
          successMessage: ({ amm }) => `Successfully Swapped via AMM for ${amm.nftOfferId}`,
     },
};

@Injectable({
     providedIn: 'root',
})
export class AmmTransactionOrchestratorService {
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly toastService = inject(ToastService);
     public readonly checksTransactionBuilderService = inject(ChecksTransactionBuilderService);
     private readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     public readonly sufficentAccountBalanceService = inject(SufficentAccountBalanceService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly nftTransactionBuilderService = inject(NftTransactionBuilderService);
     public readonly ammStoreService = inject(AmmStoreService);

     async executeNftOfferTx(type: AmmTxType, config: AmmTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { amm, account, currency, txOptions, preFetchedEnv, wallet } = config;
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
                         includeNftSellOffers: type === 'buyNft' || type === 'buyNftOffer',
                         includeNftBuyOffers: type === 'sellNft' || type === 'sellNftOffer',
                    }));

               client = env.client;
               if (!env.accountInfo || !env.fee || !env.ledgerInfo?.lastIndex) throw new Error('Required network data missing');

               // Validation
               const meta = NFT_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, amm, account, txOptions, currency });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, amm, currency });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.amm, type, txOptions);

               // Balance checks (token vs xrp)
               let isInsufficientBalance = await this.sufficentAccountBalanceService.checkXrpBalance(env, tx, '0');
               if (!isInsufficientBalance.success) return { success: false, error: isInsufficientBalance.error };

               //  Submit / simulate
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
                    return this.handleSimulationSuccess(type, amm, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, amm });
               this.xrplTransactionService.processTxFinalResult(finalResult, message, { success: true, hash: txHash });

               return { success: true, hash: txHash };
          } catch (err: any) {
               console.error(`[${type}] executeNftOfferTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(type: NftOfferTxType, amm: any, hash?: string) {
          const msg = NFT_META[type].simulationToastMessage({ orchestrator: this, amm });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
