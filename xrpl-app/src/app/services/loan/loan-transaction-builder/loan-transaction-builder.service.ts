import { inject, Injectable } from '@angular/core';
import { AppConstants } from '../../../core/app.constants';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import * as xrpl from 'xrpl';
import { LoanSet } from '../../../components/loan/constants/loan.types';
import { LoanStoreService } from '../loan-store/loan-store.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../utils/util-service/utils.service';

@Injectable({
     providedIn: 'root',
})
export class LoanTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly loanStoreService = inject(LoanStoreService);

     /**
      * Build LoanSet transaction with cosigning support
      */
     async buildLoanSetTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, loanState: any, hasCounterparty: boolean = false): Promise<xrpl.Transaction> {
          // Build flags
          let flags = 0;
          if (loanState.tfLoanOverpayment) {
               flags |= 0x00010000; // tfLoanOverpayment
          }

          const baseFee = parseInt(env.fee || '12');
          // Calculate fee - need at least 2x base fee for cosigned transactions
          // For cosigned transactions, fee needs to be higher
          // The fee should be: baseFee * (number_of_signatures + 1)
          // For a LoanSet with counterparty, we have 2 signatures
          const feeMultiplier = hasCounterparty ? 5 : 1;
          const fee = baseFee * feeMultiplier;

          // Build the base transaction
          const tx: LoanSet = {
               TransactionType: 'LoanSet',
               Account: wallet.address, // This must be the Vault Owner
               LoanBrokerID: loanState.loanBrokerId || '',
               PrincipalRequested: this.formatAmount(loanState.principalRequested || '0'),
               Flags: flags,
               Fee: fee.toString(),
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          // Add counterparty if specified
          if (loanState.counterparty && loanState.counterparty.trim().length > 0) {
               tx.Counterparty = loanState.counterparty; // This is the Borrower
          }

          // Optional fields - all amounts must be in drops
          if (loanState.data) {
               tx.Data = xrpl.convertStringToHex(loanState.data);
          }

          if (loanState.loanOriginationFee) {
               tx.LoanOriginationFee = this.formatAmount(loanState.loanOriginationFee);
          }

          if (loanState.loanServiceFee) {
               tx.LoanServiceFee = this.formatAmount(loanState.loanServiceFee);
          }

          if (loanState.latePaymentFee) {
               tx.LatePaymentFee = this.formatAmount(loanState.latePaymentFee);
          }

          if (loanState.closePaymentFee) {
               tx.ClosePaymentFee = this.formatAmount(loanState.closePaymentFee);
          }

          if (loanState.overpaymentFee !== null && loanState.overpaymentFee !== undefined) {
               tx.OverpaymentFee = loanState.overpaymentFee;
          }

          if (loanState.interestRate !== null && loanState.interestRate !== undefined) {
               tx.InterestRate = loanState.interestRate;
          }

          if (loanState.lateInterestRate !== null && loanState.lateInterestRate !== undefined) {
               tx.LateInterestRate = loanState.lateInterestRate;
          }

          if (loanState.closeInterestRate !== null && loanState.closeInterestRate !== undefined) {
               tx.CloseInterestRate = loanState.closeInterestRate;
          }

          if (loanState.overpaymentInterestRate !== null && loanState.overpaymentInterestRate !== undefined) {
               tx.OverpaymentInterestRate = loanState.overpaymentInterestRate;
          }

          if (loanState.paymentTotal !== null && loanState.paymentTotal !== undefined) {
               tx.PaymentTotal = loanState.paymentTotal;
          }

          if (loanState.paymentInterval !== null && loanState.paymentInterval !== undefined) {
               tx.PaymentInterval = loanState.paymentInterval;
          }

          if (loanState.gracePeriod !== null && loanState.gracePeriod !== undefined) {
               tx.GracePeriod = loanState.gracePeriod;
          }

          return tx as xrpl.Transaction;
     }

     /**
      * Format amount as drops for XRP
      * CRITICAL: All amounts in LoanSet must be in drops (1 XRP = 1,000,000 drops)
      */
     private formatAmount(amount: string): string {
          if (!amount || amount === '0') return '0';

          try {
               // Remove any commas, spaces, and trim
               const cleanAmount = amount.toString().trim().replace(/,/g, '').replace(/\s/g, '');

               // If it's already a number, return it as-is (it's already in drops)
               // The UI should be collecting values in drops
               const numAmount = parseFloat(cleanAmount);
               if (isNaN(numAmount) || numAmount < 0) {
                    return '0';
               }

               // For XRP, we want to keep the value as-is (it's already in drops)
               // Do NOT convert to drops again
               return cleanAmount;
          } catch (error) {
               console.warn('Failed to format amount:', amount, error);
               return amount;
          }
     }

     /**
      * Build LoanManage transaction
      */
     buildLoanManageTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, loanState: any): xrpl.Transaction {
          let flags = 0;
          if (loanState.tfLoanDefault) {
               flags |= 0x00010000; // tfLoanDefault
          }
          if (loanState.tfLoanImpair) {
               flags |= 0x00020000; // tfLoanImpair
          }
          if (loanState.tfLoanUnimpair) {
               flags |= 0x00040000; // tfLoanUnimpair
          }

          return {
               TransactionType: 'LoanManage',
               Account: wallet.address,
               LoanID: loanState.selectedLoanId || '',
               Flags: flags,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          } as xrpl.Transaction;
     }

     /**
      * Build LoanPay transaction
      */
     buildLoanPayTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, loanState: any, amount: string, assetType: string = 'XRP', vault: any, loanBroker: any): xrpl.Transaction {
          let flags = 0;
          if (loanState.tfLoanOverpayment) {
               flags |= 0x00010000;
          }
          if (loanState.tfLoanFullPayment) {
               flags |= 0x00020000;
          }
          if (loanState.tfLoanLatePayment) {
               flags |= 0x00040000;
          }

          const amountValue = this.buildPaymentAmount(assetType, loanState, loanBroker, amount);

          return {
               TransactionType: 'LoanPay',
               Account: wallet.address,
               LoanID: loanState.selectedLoanId || '',
               Amount: amountValue,
               Flags: flags,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          } as xrpl.Transaction;
     }

     private buildPaymentAmount(assetType: string, loanState: any, loanBroker: any, amount?: string): any {
          // Always use the provided amount if available, otherwise fall back to store
          // const paymentAmount = amount ?? loanState.paymentAmount;
          const paymentAmount = loanState.paymentAmount;

          if (!paymentAmount) {
               throw new Error('Payment amount is required');
          }

          if (assetType === 'XRP') {
               return xrpl.xrpToDrops(paymentAmount);
          } else if (assetType === 'MPT') {
               // MPT values must be integers (no decimals)
               const value = paymentAmount;
               // Ensure it's a whole number
               const integerValue = Math.floor(parseFloat(value));
               if (integerValue !== parseFloat(value)) {
                    throw new Error(`MPT amount must be a whole number, got ${value}`);
               }
               return {
                    mpt_issuance_id: loanState.vault?.Asset?.mpt_issuance_id ?? loanState.vault?.mpt_issuance_id,
                    value: integerValue.toString(),
               };
          } else {
               return {
                    currency: this.utilsService.encodeIfNeeded(loanState.currencyValue),
                    value: paymentAmount,
                    issuer: loanState.issuer,
               };
          }
     }

     private buildPaymentAmount234234(assetType: string, loanState: any): any {
          if (assetType === 'XRP') {
               return xrpl.xrpToDrops(loanState.paymentAmount);
          } else if (assetType === 'MPT') {
               const mptValue: any = {
                    mpt_issuance_id: loanState.vault.Asset.mpt_issuance_id,
                    value: loanState.paymentAmount,
               };
               return mptValue;
               // return {
               //      mpt_issuance_id: loanState.vault.Asset.mpt_issuance_id,
               //      value: loanState.paymentAmount,
               // };
          } else {
               return {
                    currency: this.utilsService.encodeIfNeeded(loanState.currencyValue),
                    value: loanState.paymentAmount,
                    issuer: loanState.issuer,
               };
               // return loanState.paymentAmount;
          }
     }

     /**
      * Build LoanDelete transaction
      */
     buildLoanDeleteTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, loanState: any): xrpl.Transaction {
          return {
               TransactionType: 'LoanDelete',
               Account: wallet.address,
               LoanID: loanState.selectedLoanId || '',
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          } as xrpl.Transaction;
     }
}
