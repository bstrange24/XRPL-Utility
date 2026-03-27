import { inject, Injectable } from '@angular/core';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../util-service/utils.service';
import { AppConstants } from '../../../core/app.constants';

@Injectable({
     providedIn: 'root',
})
export class PaymentChannelTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);

     buildCreatePaymentChannelTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, paymentChannel: any): xrpl.PaymentChannelCreate {
          const tx: xrpl.PaymentChannelCreate = {
               TransactionType: 'PaymentChannelCreate',
               Account: wallet.classicAddress,
               Amount: xrpl.xrpToDrops(paymentChannel.amount),
               Destination: paymentChannel.destination,
               SettleDelay: Number.parseInt(paymentChannel.settleDelay),
               PublicKey: wallet.publicKey,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex! + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (paymentChannel.paymentChannelCancelAfterTimeField) {
               const cancelAfterTime = this.utilsService.toRippleTime(paymentChannel.paymentChannelCancelAfterTimeField);
               if (cancelAfterTime <= env.ledgerInfo.currentRippleTime) {
                    throw new Error('Channel expiration time must be in the future');
               }
               this.utilsService.setCancelAfter(tx, cancelAfterTime);
          }
          return tx;
     }

     buildFundPaymentChannelTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, paymentChannel: any): xrpl.PaymentChannelFund {
          const tx: xrpl.PaymentChannelFund = {
               TransactionType: 'PaymentChannelFund',
               Account: wallet.classicAddress,
               Channel: paymentChannel.channelIDField,
               Amount: xrpl.xrpToDrops(paymentChannel.amount),
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex! + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (paymentChannel.paymentChannelCancelAfterTimeField) {
               const cancelAfterTime = this.utilsService.toRippleTime(paymentChannel.paymentChannelCancelAfterTimeField);
               if (cancelAfterTime <= env.ledgerInfo.currentRippleTime) {
                    throw new Error('Channel expiration time must be in the future');
               }
               this.utilsService.setExpiration(tx, cancelAfterTime);
          }

          return tx;
     }

     buildClaimPaymentChannelTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, paymentChannel: any): xrpl.PaymentChannelClaim {
          const tx: xrpl.PaymentChannelClaim = {
               TransactionType: 'PaymentChannelClaim',
               Account: wallet.classicAddress,
               Channel: paymentChannel.channelIDField,
               Balance: xrpl.xrpToDrops(paymentChannel.amount),
               Signature: paymentChannel.channelClaimSignatureField,
               PublicKey: paymentChannel.publicKeyField || wallet.publicKey,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex! + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (paymentChannel.flags.claimAndClose) {
               tx.Flags = xrpl.PaymentChannelClaimFlags.tfClose;
          }
          return tx;
     }

     buildRenewPaymentChannelTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, paymentChannel: any): xrpl.PaymentChannelClaim {
          const tx: xrpl.PaymentChannelClaim = {
               TransactionType: 'PaymentChannelClaim',
               Account: wallet.classicAddress,
               Channel: paymentChannel.channelIDField,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex! + AppConstants.LAST_LEDGER_ADD_TIME,
               Flags: xrpl.PaymentChannelClaimFlags.tfRenew,
          };
          return tx;
     }

     buildClosePaymentChannelTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, paymentChannel: any): xrpl.PaymentChannelClaim {
          const tx: xrpl.PaymentChannelClaim = {
               TransactionType: 'PaymentChannelClaim',
               Account: wallet.classicAddress,
               Channel: paymentChannel.channelIDField,
               Flags: xrpl.PaymentChannelClaimFlags.tfClose,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex! + AppConstants.LAST_LEDGER_ADD_TIME,
          };
          return tx;
     }
}
