import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../utils/util-service/utils.service';
import { LoanBrokerSet } from 'xrpl';
import { LoanBrokerDisplayItem } from '../../../components/loan-broker/constants/loan-broker.types';
import { AppConstants } from '../../../core/app.constants';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { LoanBrokerStoreService } from '../loan-broker-store/loan-broker-store.service';

@Injectable({
     providedIn: 'root',
})
export class LoanBrokerTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly xrplCacheService = inject(XrplCacheService);
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     private readonly xrplCache = inject(XrplCacheService);

     /**
      * Build LoanBrokerSet transaction (Create or Modify)
      */
     buildLoanBrokerSetTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, brokerState: any, isModify: boolean = false): xrpl.Transaction {
          const tx: LoanBrokerSet = {
               TransactionType: 'LoanBrokerSet',
               Account: wallet.address,
               VaultID: brokerState.vaultId || '',
               Fee: env.fee,
               // Flags: 0,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          // IMPORTANT: For modify operations, include the LoanBrokerID
          if (isModify && brokerState.selectedBrokerId) {
               tx.LoanBrokerID = brokerState.selectedBrokerId;
          }

          // Optional fields
          if (brokerState.loanBrokerId && !isModify) {
               // Only set LoanBrokerID on creation if explicitly provided
               tx.LoanBrokerID = brokerState.loanBrokerId;
          }

          if (brokerState.data) {
               tx.Data = xrpl.convertStringToHex(brokerState.data);
          }

          if (!isModify && brokerState.managementFeeRate !== null && brokerState.managementFeeRate !== undefined) {
               tx.ManagementFeeRate = brokerState.managementFeeRate;
          }

          if (brokerState.debtMaximum) {
               tx.DebtMaximum = brokerState.debtMaximum;
          }

          if (!isModify && brokerState.coverRateMinimum !== null && brokerState.coverRateMinimum !== undefined) {
               tx.CoverRateMinimum = brokerState.coverRateMinimum;
          }

          if (!isModify && brokerState.coverRateLiquidation !== null && brokerState.coverRateLiquidation !== undefined) {
               tx.CoverRateLiquidation = brokerState.coverRateLiquidation;
          }

          return tx as xrpl.Transaction;
     }

     /**
      * Build LoanBrokerDelete transaction
      */
     buildLoanBrokerDeleteTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, brokerState: any): xrpl.Transaction {
          return {
               TransactionType: 'LoanBrokerDelete',
               Account: wallet.address,
               LoanBrokerID: brokerState.selectedBrokerId || '',
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          } as xrpl.Transaction;
     }

     /**
      * Build LoanBrokerCoverDeposit transaction
      */
     async buildLoanBrokerCoverDepositTx(wallet: xrpl.Wallet, client: xrpl.Client, env: PrepareTxEnvironmentResult, brokerState: any): Promise<xrpl.Transaction> {
          const selectedBroker = this.findSelectedBroker(brokerState);
          if (!selectedBroker) {
               throw new Error('Selected Loan Broker not found');
          }

          const amount = brokerState.debtMaximum;
          this.validateAmount(amount);

          // Get the asset from the vault
          const asset = await this.getBrokerAsset(client, selectedBroker.VaultID);
          const amountValue = this.buildAmount(asset, amount);

          return {
               TransactionType: 'LoanBrokerCoverDeposit',
               Account: wallet.address,
               LoanBrokerID: brokerState.selectedBrokerId || '',
               Amount: amountValue,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          } as xrpl.Transaction;
     }

     /**
      * Build LoanBrokerCoverWithdraw transaction
      */
     async buildLoanBrokerCoverWithdrawTx(wallet: xrpl.Wallet, client: xrpl.Client, env: PrepareTxEnvironmentResult, brokerState: any, destinationAddress?: string, destinationTag?: number): Promise<xrpl.Transaction> {
          const selectedBroker = this.findSelectedBroker(brokerState);
          if (!selectedBroker) {
               throw new Error('Selected Loan Broker not found');
          }

          const amount = brokerState.debtMaximum; // Reusing debtMaximum as withdraw amount
          this.validateAmount(amount);

          // Get the asset type from the vault
          const asset = await this.getBrokerAsset(client, selectedBroker.VaultID);

          const amountValue = this.buildAmount(asset, amount);

          const tx: any = {
               TransactionType: 'LoanBrokerCoverWithdraw',
               Account: wallet.address,
               LoanBrokerID: brokerState.selectedBrokerId || '',
               Amount: amountValue,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          // Optional destination
          if (destinationAddress) {
               tx.Destination = destinationAddress;
          }

          // Optional destination tag
          if (destinationTag !== null && destinationTag !== undefined) {
               tx.DestinationTag = destinationTag;
          }

          return Promise.resolve(tx);
     }

     /**
      * Build LoanBrokerCoverClawback transaction
      */
     async buildLoanBrokerCoverClawbackTx(wallet: xrpl.Wallet, client: xrpl.Client, env: PrepareTxEnvironmentResult, brokerState: any): Promise<xrpl.Transaction> {
          const selectedBroker = this.findSelectedBroker(brokerState);
          const amount = brokerState.debtMaximum; // Reusing debtMaximum as clawback amount

          const tx: any = {
               TransactionType: 'LoanBrokerCoverClawback',
               Account: wallet.address,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          // LoanBrokerID is optional - include if selected
          if (selectedBroker) {
               tx.LoanBrokerID = brokerState.selectedBrokerId;
          }

          // Amount is optional - include if provided
          if (amount && amount.trim().length > 0 && parseFloat(amount) > 0) {
               const asset = selectedBroker ? await this.getBrokerAsset(client, selectedBroker.VaultID) : null;
               const amountValue = asset ? this.buildAmount(asset, amount) : { value: amount };
               tx.Amount = amountValue;
          }

          return Promise.resolve(tx);
     }

     /**
      * Helper: Find selected broker from store
      */
     private findSelectedBroker(brokerState: any): LoanBrokerDisplayItem | null {
          const selectedId = brokerState.selectedBrokerId;
          if (!selectedId) return null;

          // 1. Check existing brokers
          const brokers = brokerState.existingBrokers || [];
          let broker = brokers.find((b: any) => {
               const id = b.id || b.index;
               return id === selectedId;
          });

          // 2. If not found, check manually fetched broker
          if (!broker) {
               broker = brokerState.manuallyFetchedBroker;
          }

          return broker || null;
     }
     // private findSelectedBroker(brokerState: any): LoanBrokerDisplayItem | null {
     //      const selectedId = brokerState.selectedBrokerId;
     //      if (!selectedId) return null;

     //      const brokers = brokerState.existingBrokers || [];
     //      return (
     //           brokers.find((b: any) => {
     //                const id = b.id || b.index;
     //                return id === selectedId;
     //           }) || null
     //      );
     // }

     /**
      * Helper: Get broker asset from vault
      */
     private async getBrokerAsset(client: xrpl.Client, vaultId: string): Promise<any> {
          try {
               const result = await this.xrplCache.getVaultInfo(client, vaultId);

               const node = result.result.vault;
               if (node && node.LedgerEntryType === 'Vault') {
                    return node.Asset || { currency: 'XRP' };
               }
               return { currency: 'XRP' };
          } catch {
               return { currency: 'XRP' };
          }
     }
     // private getBrokerAsset(broker: LoanBrokerDisplayItem): any {
     //      // This would need to fetch the vault's asset
     //      // For now, return a default XRP asset
     //      return { currency: 'XRP' };
     // }

     /**
      * Helper: Validate amount
      */
     private validateAmount(amount: string): void {
          if (!amount || parseFloat(amount) <= 0) {
               throw new Error('Invalid amount');
          }
     }

     /**
      * Helper: Build amount object based on asset type
      */
     private buildAmount(asset: any, amount: string): any {
          if (asset?.currency === 'XRP') {
               return xrpl.xrpToDrops(amount);
          } else if (asset?.mpt_issuance_id) {
               return {
                    mpt_issuance_id: asset.mpt_issuance_id,
                    value: amount,
               };
          } else if (asset?.currency && asset?.issuer) {
               return {
                    currency: asset.currency,
                    issuer: asset.issuer,
                    value: amount,
               };
          } else {
               // Default to XRP if asset type unknown
               return xrpl.xrpToDrops(amount);
          }
     }
}
