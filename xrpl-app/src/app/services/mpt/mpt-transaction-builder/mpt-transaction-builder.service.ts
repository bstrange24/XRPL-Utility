import { inject, Injectable } from '@angular/core';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import * as xrpl from 'xrpl';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import { MptUtilService } from '../mpt-util/mpt-util.service';

@Injectable({
     providedIn: 'root',
})
export class MptTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly mptUtilService = inject(MptUtilService);

     buildCreateMptTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, mpt: any, account?: any, txOptions?: any): xrpl.MPTokenIssuanceCreate {
          const tx: xrpl.MPTokenIssuanceCreate = {
               TransactionType: 'MPTokenIssuanceCreate',
               Account: wallet.classicAddress,
               MaximumAmount: mpt.tokenCount.toString(),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (mpt.assetScale) {
               const assetScale = mpt.assetScale;
               if (assetScale < 0 || assetScale > 15) {
                    throw new Error('Tick size must be between 3 and 15.');
               }
               tx.AssetScale = assetScale;
          }

          if (this.mptUtilService.flags.canTransfer) {
               if (!mpt.transferFee && this.mptUtilService.flags.canTransfer) {
                    throw new Error('Transfer Fee is required when CanTransfer is enabled');
               }
               if (mpt.transferFee) {
                    // TransferFee is in 1/1000th of a percent (basis points / 10), so for 1%, input 1000
                    const transferFee = mpt.transferFee;
                    if (Number.isNaN(transferFee) || transferFee < 0 || transferFee > 50000) {
                         throw new Error('Transfer Fee must be a number between 0 and 50,000 (for 0% to 50%).');
                    }
                    tx.TransferFee = transferFee;
               }
          }

          if (mpt.metaData) {
               tx.MPTokenMetadata = xrpl.convertStringToHex(mpt.metaData);
          }

          if (this.mptUtilService.flags) {
               const flagsValue = this.mptUtilService.getFlagsValue(this.mptUtilService.flags);
               console.log('Creating MPT with Flags:', flagsValue.toString(16));
               tx.Flags = flagsValue;
          }

          return tx;
     }

     buildMptAuthorizeTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, mpt: any, account?: any, txOptions?: any): xrpl.MPTokenAuthorize {
          const tx: xrpl.MPTokenAuthorize = {
               TransactionType: 'MPTokenAuthorize',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: mpt.mptIssuanceId,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (mpt.authAction === 'unauthorize') tx.Flags = xrpl.MPTokenAuthorizeFlags.tfMPTUnauthorize;

          return tx;
     }

     buildMptLockTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, mpt: any, account?: any, txOptions?: any): xrpl.MPTokenIssuanceSet {
          const tx: xrpl.MPTokenIssuanceSet = {
               TransactionType: 'MPTokenIssuanceSet',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: mpt.mptIssuanceId,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
               Fee: env.fee,
          };

          if (mpt.lockAction === 'unlock') tx.Flags = xrpl.MPTokenIssuanceSetFlags.tfMPTUnlock;

          return tx;
     }

     buildMptSendTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, mpt: any, account?: any, txOptions?: any): xrpl.Payment {
          const tx: xrpl.Payment = {
               TransactionType: 'Payment',
               Account: wallet.classicAddress,
               Amount: {
                    mpt_issuance_id: mpt.mptIssuanceId,
                    value: mpt.amount.toString(),
               },
               Destination: mpt.destination,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
               Fee: env.fee,
          };

          return tx;
     }

     buildMptClawbackTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, mpt: any, account?: any, txOptions?: any): xrpl.Clawback {
          const amount: xrpl.ClawbackAmount = { value: mpt.amount.toString(), mpt_issuance_id: mpt.mptIssuanceId };
          const tx: xrpl.Clawback = {
               TransactionType: 'Clawback',
               Account: wallet.classicAddress,
               Amount: amount,
               Holder: mpt.destination,
               Fee: env.fee,
               Flags: 0,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          return tx;
     }

     buildMptDestroyTransaction(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, mpt: any, account?: any, txOptions?: any): xrpl.MPTokenIssuanceDestroy {
          const tx: xrpl.MPTokenIssuanceDestroy = {
               TransactionType: 'MPTokenIssuanceDestroy',
               Account: wallet.classicAddress,
               MPTokenIssuanceID: mpt.mptIssuanceId,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          return tx;
     }
}
