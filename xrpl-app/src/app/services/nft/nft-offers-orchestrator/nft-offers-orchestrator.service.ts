import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { NftOfferTxConfig, NftOfferTxType } from '../../../components/nft-offers/constants/nft-offers.types';
import { ChecksTransactionBuilderService } from '../../checks/checks-transaction-builder/checks-transaction-builder.service';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { ValidationService } from '../../validation/transaction-validation-rule.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { NftTransactionBuilderService } from '../nft-transaction-builder/nft-transaction-builder.service';
import { NFT_OFFERS_TX_TYPES, NFT_OFFERS_VALIDATION_RULES } from '../../../components/nft-offers/constants/nft-offers.constants';
import { AppConstants } from '../../../core/app.constants';
import { Wallet } from '../../wallets/manager/wallet-manager.service';

type NftOfferMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; nft: any; account: any; txOptions: any; currency: any }) => any;
     buildTx: (args: { orchestrator: NftOffersOrchestratorService; env: any; wallet: any; nft: any; currency: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: NftOffersOrchestratorService; nft: any }) => string;
     successMessage: (args: { orchestrator: NftOffersOrchestratorService; nft: any }) => string;
};

const NFT_META: Record<NftOfferTxType, NftOfferMeta> = {
     buyNft: {
          validationRule: NFT_OFFERS_VALIDATION_RULES[NFT_OFFERS_TX_TYPES.BUY_NFT],
          buildValidationInputs: ({ wallet, env, nft, account, txOptions }) => ({
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
               buyNft: { nftId: nft.nftId, nftOfferId: nft.nftOfferId },
          }),
          buildTx: ({ orchestrator, env, wallet, nft }) => orchestrator.nftTransactionBuilderService.buildBuyNftDataTx(env.wallet || wallet, env, nft),
          simulationToastMessage: ({ nft }) => `Simulated Buying NFT of ${nft.nftId}`,
          successMessage: ({ nft }) => {
               return `Successfully Bought NFT of ${nft.nftId}`;
          },
     },

     sellNft: {
          validationRule: NFT_OFFERS_VALIDATION_RULES[NFT_OFFERS_TX_TYPES.SELL_NFT],
          buildValidationInputs: ({ wallet, env, nft, account, txOptions, currency }) => ({
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
               sellNft: { nftId: nft.nftId, currency },
          }),
          buildTx: ({ orchestrator, env, wallet, nft, currency }) => orchestrator.nftTransactionBuilderService.buildSellNftDataTx(env.wallet || wallet, env, nft, currency),
          simulationToastMessage: ({ nft }) => `Simulated Selling NFT of ${nft.nftId}`,
          successMessage: ({ nft }) => {
               return `Successfully Sold NFT of ${nft.nftId}`;
          },
     },

     buyNftOffer: {
          validationRule: NFT_OFFERS_VALIDATION_RULES[NFT_OFFERS_TX_TYPES.BUY_NFT_OFFER],
          buildValidationInputs: ({ wallet, env, nft, account, txOptions, currency }) => ({
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
               buyNftOffer: { nftId: nft.nftId, nftOfferId: nft.nftOfferId, currency },
          }),
          buildTx: ({ orchestrator, env, wallet, nft, currency }) => orchestrator.nftTransactionBuilderService.buildBuyNftOfferDataTx(env.wallet || wallet, env, nft, currency),
          simulationToastMessage: ({ nft }) => `Simulated Buying NFT Offer for ${nft.nftId}`,
          successMessage: ({ nft }) => `Successfully Bought NFT Offer for ${nft.nftId}`,
     },

     sellNftOffer: {
          validationRule: NFT_OFFERS_VALIDATION_RULES[NFT_OFFERS_TX_TYPES.SELL_NFT_OFFER],
          buildValidationInputs: ({ wallet, env, nft, account, txOptions, currency }) => ({
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
               sellNftOffer: { nftId: nft.nftId, nftOfferId: nft.nftOfferId, currency },
          }),
          buildTx: ({ orchestrator, env, wallet, nft, currency }) => orchestrator.nftTransactionBuilderService.buildSellNftOfferDataTx(env.wallet || wallet, env, nft, currency),
          simulationToastMessage: ({ nft }) => `Simulated Selling NFT Offer for ${nft.nftId}`,
          successMessage: ({ nft }) => `Successfully Sold NFT Offer for ${nft.nftId}`,
     },

     cancelNftOffer: {
          validationRule: NFT_OFFERS_VALIDATION_RULES[NFT_OFFERS_TX_TYPES.CANCEL_NFT_OFFER],
          buildValidationInputs: ({ wallet, env, nft, account, txOptions }) => ({
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
               cancelNftOffer: { nftOfferId: nft.nftOfferId },
          }),
          buildTx: ({ orchestrator, env, wallet, nft }) => orchestrator.nftTransactionBuilderService.buildCancelNftOfferDataTx(env.wallet || wallet, env, nft),
          simulationToastMessage: ({ nft }) => `Simulated Canceling NFT Offer for ${nft.nftOfferId}`,
          successMessage: ({ nft }) => `Successfully Canceled NFT Offer for ${nft.nftOfferId}`,
     },
};

@Injectable({
     providedIn: 'root',
})
export class NftOffersOrchestratorService {
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

     async executeNftOfferTx(type: NftOfferTxType, config: NftOfferTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { nft, account, currency, txOptions, preFetchedEnv, wallet } = config;
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

               const validationInputs = meta.buildValidationInputs({ wallet, env, nft, account, txOptions, currency });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, nft, currency });

               // Optional fields
               await this.transactionOptionalFieldsService.setTxOptionalFields(client, tx, wallet, config.nft, type, txOptions);

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
                    return this.handleSimulationSuccess(type, nft, txHash);
               }

               // Final validated outcome (preserved)
               const finalResult = await this.xrplTransactionService.waitForFinalOutcome(client, txHash!, (tx as any).LastLedgerSequence);
               this.txUiService.setTxResultSignal(finalResult);

               const message = meta.successMessage({ orchestrator: this, nft });
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

     handleSimulationSuccess(type: NftOfferTxType, nft: any, hash?: string) {
          const msg = NFT_META[type].simulationToastMessage({ orchestrator: this, nft });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
