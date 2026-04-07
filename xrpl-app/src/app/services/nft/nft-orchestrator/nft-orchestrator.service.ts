import { inject, Injectable } from '@angular/core';
import { NftCreateTxConfig, NftCreateTxType } from '../../../components/nft-create/constants/nft-create.types';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { NFT_CREATE_TX_TYPES, NFT_CREATE_VALIDATION_RULES } from '../../../components/nft-create/constants/nft-create.constants';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AppConstants } from '../../../core/app.constants';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { ChecksTransactionBuilderService } from '../../checks/checks-transaction-builder/checks-transaction-builder.service';
import { SufficentAccountBalanceService } from '../../sufficent-account-balance/sufficent-account-balance.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionOptionalFieldsService } from '../../transaction-optional-fields/transaction-optional-fields.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionOrchestratorService } from '../../xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { NftTransactionBuilderService } from '../nft-transaction-builder/nft-transaction-builder.service';

type NftCreateMeta = {
     validationRule: string;
     buildValidationInputs: (args: { wallet: Wallet; env: any; nft: any; account: any; txOptions: any }) => any;
     buildTx: (args: { orchestrator: NftTransactionOrchestrator; env: any; wallet: any; nft: any }) => xrpl.Transaction;
     simulationToastMessage: (args: { orchestrator: NftTransactionOrchestrator; nft: any }) => string;
     successMessage: (args: { orchestrator: NftTransactionOrchestrator; nft: any }) => string;
};

const NFT_META: Record<NftCreateTxType, NftCreateMeta> = {
     createNft: {
          validationRule: NFT_CREATE_VALIDATION_RULES[NFT_CREATE_TX_TYPES.CREATE],
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
               createNft: { amount: nft.amount, taxon: nft.taxon, nftFlags: nft.nftFlags, URI: nft.initialURI, transferfee: nft.transferFee, issuer: nft.issuer, expiration: nft.expiration },
          }),
          buildTx: ({ orchestrator, env, wallet, nft }) => orchestrator.nftTransactionBuilderService.buildCreateNftTx(env.wallet || wallet, env, nft),
          simulationToastMessage: ({ orchestrator, nft }) => `Simulated Sending NFT of ${nft.amount}`,
          successMessage: ({ orchestrator, nft }) => {
               return `Successfully Sent NFT of ${nft.amount}`;
          },
     },

     burnNft: {
          validationRule: NFT_CREATE_VALIDATION_RULES[NFT_CREATE_TX_TYPES.BURN],
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
               burnNft: { nftId: nft.nftId },
          }),
          buildTx: ({ orchestrator, env, wallet, nft }) => orchestrator.nftTransactionBuilderService.buildBurnNftTx(env.wallet || wallet, env, nft),
          simulationToastMessage: ({ orchestrator, nft }) => `Simulated Burning NFT of ${nft.amount}`,
          successMessage: ({ orchestrator, nft }) => {
               return `Successfully Burned NFT of ${nft.amount}`;
          },
     },

     updateNFTMetadata: {
          validationRule: NFT_CREATE_VALIDATION_RULES[NFT_CREATE_TX_TYPES.UPDATE_METADATA],
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
               updateNFTMetadata: { nftId: nft.nftId, nftOwnerAddress: nft.nftOwnerAddress, URI: nft.initialURI },
          }),
          buildTx: ({ orchestrator, env, wallet, nft }) => orchestrator.nftTransactionBuilderService.buildUpdateNftMetaDataTx(env.wallet || wallet, env, nft),
          simulationToastMessage: ({ nft }) => `Simulated Updating NFT Metadata for ${nft.nftId}`,
          successMessage: ({ nft }) => `Successfully Updated NFT Metadata for ${nft.nftId}`,
     },
};

@Injectable({ providedIn: 'root' })
export class NftTransactionOrchestrator extends PerformanceBaseComponent {
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

     async executeCreateNftTx(type: NftCreateTxType, config: NftCreateTxConfig): Promise<{ success: boolean; hash?: string; error?: string; validationError?: boolean; tx?: xrpl.Transaction; finalResult?: any }> {
          const { nft, account, txOptions, preFetchedEnv, wallet } = config;
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

               // Validation
               const meta = NFT_META[type];

               const validationInputs = meta.buildValidationInputs({ wallet, env, nft, account, txOptions });
               const errors = await this.validator.validate(meta.validationRule, { inputs: validationInputs, client, accountInfo: env.accountInfo });
               if (errors.length > 0) return { success: false, error: errors.join('\n• '), validationError: true };

               // Build transaction
               const tx = meta.buildTx({ orchestrator: this, env, wallet, nft });

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
               console.error(`[${type}] executeCreateNftTx failed:`, err);
               this.xrplTransactionService.processTxError(err);
               return { success: false, error: err.message || 'Unexpected error', validationError: false };
          } finally {
               this.txUiService.resetCurrentStepToIdle();
          }
     }

     handleSimulationSuccess(type: NftCreateTxType, nft: any, hash?: string) {
          const msg = NFT_META[type].simulationToastMessage({ orchestrator: this, nft });

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
