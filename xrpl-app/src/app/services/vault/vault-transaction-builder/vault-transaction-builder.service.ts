import { inject, Injectable } from '@angular/core';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';
import { AppConstants } from '../../../core/app.constants';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';

@Injectable({
     providedIn: 'root',
})
export class VaultTransactionBuilderService {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplCacheService = inject(XrplCacheService);

     buildCreateVaultTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, escrow: any, currency: any, vault: any, mpt: any) {
          // Build flags
          let flags = 0;
          if (vault.tfVaultPrivate) {
               flags |= xrpl.VaultCreateFlags.tfVaultPrivate;
          }
          if (vault.tfVaultShareNonTransferable) {
               flags |= xrpl.VaultCreateFlags.tfVaultShareNonTransferable;
          }

          // Build the asset specification
          const asset = this.buildAssetSpecification(currency, mpt);

          const assetAmount = this.buildAssetAmount(asset, escrow.amount || '0');

          const tx: xrpl.VaultCreate = {
               TransactionType: 'VaultCreate',
               Account: wallet.address,
               Asset: asset,
               Flags: flags,
               AssetsMaximum: assetAmount,
               WithdrawalPolicy: vault.vaultStrategyFirstComeFirstServe ? xrpl.VaultWithdrawalPolicy.vaultStrategyFirstComeFirstServe : 0,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (vault.vaultMetaData) {
               tx.Data = xrpl.convertStringToHex(vault.vaultMetaData);
          }

          if (vault.assetScale !== undefined && vault.assetScale !== null) {
               tx.Scale = vault.assetScale;
          }

          if (vault.domainId) {
               tx.DomainID = vault.domainId;
          }

          return tx;
     }

     buildModifyVaultTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, escrow: any, currency: any, vault: any, mpt: any) {
          const asset = this.buildAssetSpecification(currency, mpt);
          const assetAmount = this.buildAssetAmount(asset, escrow.amount || '0');

          const tx: xrpl.VaultSet = {
               TransactionType: 'VaultSet',
               Account: wallet.address,
               VaultID: vault.selectedVaultId,
               Fee: env.fee,
               LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
          };

          if (vault.vaultMetaData) {
               tx.Data = xrpl.convertStringToHex(vault.vaultMetaData);
          }

          if (vault.domainId) {
               tx.DomainID = vault.domainId;
          }

          if (assetAmount !== '0' && assetAmount !== undefined && assetAmount !== null) {
               tx.AssetsMaximum = assetAmount as any;
          }

          return tx;
     }

     async buildVaultDepositTx(wallet: xrpl.Wallet, client: xrpl.Client, env: any, vaultState: any): Promise<xrpl.VaultDeposit> {
          const selectedVault = await this.findSelectedVault(client, vaultState);
          const asset = selectedVault.Asset || selectedVault.SendMax;
          const amount = vaultState.vaultAmount;

          this.validateAmount(amount);

          // Build the amount
          const amountValue = this.buildAmount(selectedVault.result ? selectedVault.result.vault.Asset : asset, amount);

          const tx: xrpl.VaultDeposit = {
               TransactionType: 'VaultDeposit',
               Account: wallet.classicAddress,
               VaultID: selectedVault.result ? selectedVault.result.vault.index : selectedVault.index,
               Amount: amountValue,
          };

          return tx;
     }

     async buildVaultWithdrawTx(wallet: xrpl.Wallet, client: xrpl.Client, env: any, vaultState: any): Promise<xrpl.VaultWithdraw> {
          const selectedVault = await this.findSelectedVault(client, vaultState);
          const asset = selectedVault.Asset || selectedVault.SendMax;
          const amount = vaultState.vaultAmount;

          this.validateAmount(amount);

          // Build the amount
          const amountValue = this.buildAmount(selectedVault.result ? selectedVault.result.vault.Asset : asset, amount);

          const tx: xrpl.VaultWithdraw = {
               TransactionType: 'VaultWithdraw',
               Account: wallet.classicAddress,
               VaultID: selectedVault.result ? selectedVault.result.vault.index : selectedVault.index,
               Amount: amountValue,
               Destination: vaultState.destination,
          };

          return tx;
     }

     async buildClawbackVaultTx(wallet: xrpl.Wallet, client: xrpl.Client, env: PrepareTxEnvironmentResult, escrow: any, currency: any, vaultState: any, mpt: any) {
          // Get the vault to determine asset type
          const selectedVault = await this.findSelectedVault(client, vaultState);
          const asset = selectedVault.Asset || selectedVault.SendMax;

          const amount = this.buildClawbackAmount(asset, vaultState.clawbackAmount);

          // Build transaction
          const tx: xrpl.VaultClawback = {
               TransactionType: 'VaultClawback',
               Account: wallet.address,
               VaultID: vaultState.selectedVaultId,
               Amount: amount,
               Holder: vaultState.holder,
          };

          return tx;
     }

     buildDeleteVaultTx(wallet: xrpl.Wallet, env: PrepareTxEnvironmentResult, vault: any) {
          const tx: xrpl.VaultDelete = {
               TransactionType: 'VaultDelete',
               Account: wallet.address,
               VaultID: vault.selectedVaultId,
          };
          return tx;
     }

     private buildAssetSpecification(currency: any, mpt: any): any {
          const currencyCode = currency.currency || 'XRP';

          if (currencyCode === 'XRP') {
               // For XRP, use the XRP type
               return { currency: 'XRP' };
          } else if (currencyCode === 'MPT') {
               // For MPT, use MPTCurrency
               return {
                    mpt_issuance_id: mpt.mptIssuanceId || '',
               };
          } else {
               // For IOU, use IssuedCurrency
               return {
                    currency: currencyCode,
                    issuer: currency.issuer || '',
               };
          }
     }

     async findSelectedVault(client: xrpl.Client, vaultState: any): Promise<any> {
          let vault = vaultState.existingVaults?.find((v: any) => (v.index || v.id) === vaultState.selectedVaultId);

          if (vault) {
               return vault;
          }

          if (!client) {
               throw new Error('Cannot fetch vault details - client not available');
          }

          try {
               vault = await this.xrplCacheService.getVaultInfo(client, vaultState.selectedVaultId);
               if (!vault) {
                    throw new Error('Selected vault not found');
               }
               return vault;
          } catch (error: any) {
               throw new Error(`Selected vault not found: ${error.message}`);
          }
     }

     private validateAmount(amount: string): void {
          if (!amount || parseFloat(amount) <= 0) {
               throw new Error('Invalid amount');
          }
     }

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
               throw new Error('Unknown asset type for vault transaction');
          }
     }

     private buildAssetAmount(asset: any, amount: string): any {
          if (!amount || amount === '0') {
               return '0';
          }

          if (asset?.currency === 'XRP') {
               return xrpl.xrpToDrops(amount);
          }

          return amount.toString().trim().replace(/,/g, '');
     }

     private convertToBaseUnits(amount: string, assetScale: number): string {
          if (!amount || amount === '0') return '0';

          // Remove any commas and trim whitespace
          const cleanAmount = amount.toString().trim().replace(/,/g, '');

          // Split into integer and decimal parts
          const parts = cleanAmount.split('.');
          let integerPart = parts[0];
          let decimalPart = parts[1] || '';

          // Remove leading zeros from integer part
          integerPart = integerPart.replace(/^0+/, '') || '0';

          // Pad or truncate decimal part to match asset scale
          if (decimalPart.length > assetScale) {
               // Truncate to asset scale (no rounding for blockchain precision)
               decimalPart = decimalPart.slice(0, assetScale);
          } else {
               // Pad with zeros to reach asset scale
               decimalPart = decimalPart.padEnd(assetScale, '0');
          }

          // Combine and remove leading zeros
          let baseUnits = integerPart + decimalPart;
          baseUnits = baseUnits.replace(/^0+/, '') || '0';

          console.log(`Converting ${cleanAmount} with scale ${assetScale} → ${baseUnits} base units`);

          return baseUnits;
     }

     private buildClawbackAmount(asset: any, amount: string): any {
          if (!amount || amount === '0') {
               return { value: '0' };
          }

          if (asset?.currency === 'XRP' || !asset) {
               return {
                    currency: 'XRP',
                    value: amount,
               };
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
               return {
                    currency: 'XRP',
                    value: amount,
               };
          }
     }
}
