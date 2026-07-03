import { computed, inject, Injectable, signal } from '@angular/core';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { EscrowStoreService } from '../../escrow/escrow-store/escrow-store.service';
import { LogServiceService } from '../../shared/log-service/log-service.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';
import { AnyVaultDisplayItem, VaultActionTypes } from '../../../components/vault/constants/vault.types';
import { SelectItem } from '../../shared/destination-dropdown/destination-dropdown.service';
import { VaultStoreService } from '../vault-store/vault-store.service';
import { AppConstants } from '../../../core/app.constants';
import { VaultCacheService } from '../vault-cache/vault-cache.service';

@Injectable({
     providedIn: 'root',
})
export class VaultUtilService {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactions = inject(XrplTransactionService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly logService = inject(LogServiceService);
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly vaultCacheService = inject(VaultCacheService);

     onVaultSelectedInUi(vault: AnyVaultDisplayItem) {
          const vaultId = vault.index || vault.id;
          if (vaultId) {
               this.vaultStoreService.setField('selectedVaultId', vaultId);
               this.vaultStoreService.setField('selectedVaultSequence', vault.VaultSequence);
          }
     }

     onVaultSharedMptSelectedInUi(vault: AnyVaultDisplayItem) {
          const shareMPTID = vault.shareMPTID || '';
          if (shareMPTID) {
               this.vaultStoreService.setField('shareMpt', shareMPTID);
          }
     }

     private parseVaultAsset(asset: any): { amount: string; currency: string; issuer: string; amountDisplay: string } {
          let amount = '0';
          let currency = '';
          let issuer = '';
          let amountDisplay = '';

          // XRP - asset is { currency: 'XRP' }
          if (asset?.currency === 'XRP') {
               currency = 'XRP';
               amountDisplay = `XRP`;
          }
          // MPT - asset has mpt_issuance_id
          else if (asset?.mpt_issuance_id) {
               const mptId = asset.mpt_issuance_id;
               currency = 'MPT';
               issuer = mptId;
               amountDisplay = `MPT (${mptId.slice(0, 8)}...${mptId.slice(-8)})`;
          }
          // IOU - asset has currency and issuer
          else if (asset?.currency && asset?.issuer) {
               currency = this.utilsService.normalizeCurrencyCode(asset.currency);
               issuer = asset.issuer;
               amountDisplay = `${currency} (${issuer.slice(0, 6)}...${issuer.slice(-6)})`;
          }

          return { amount, currency, issuer, amountDisplay };
     }

     formatVaultAmount(asset: any, assetsMaximum?: any): string {
          if (!asset) return 'N/A';

          let maxAmount = '0';
          const isMptAsset = asset?.mpt_issuance_id || asset?.mptIssuanceId;

          if (assetsMaximum) {
               if (typeof assetsMaximum === 'string') {
                    maxAmount = assetsMaximum;
               } else if (typeof assetsMaximum === 'number') {
                    maxAmount = assetsMaximum.toString();
               } else if (assetsMaximum?.value) {
                    maxAmount = assetsMaximum.value;
               }
          } else {
               if (typeof asset === 'string') {
                    if (isMptAsset) {
                         maxAmount = asset;
                    } else {
                         try {
                              maxAmount = xrpl.dropsToXrp(asset).toString();
                         } catch {
                              maxAmount = asset;
                         }
                    }
               } else if (asset?.value) {
                    maxAmount = asset.value;
               }
          }

          if (asset?.currency === 'XRP') {
               return `${maxAmount} XRP`;
          } else if (isMptAsset) {
               const mptId = asset.mpt_issuance_id || asset.mptIssuanceId;
               const shortId = mptId.length > 16 ? `${mptId.slice(0, 8)}...${mptId.slice(-8)}` : mptId;
               return `${maxAmount} MPT (${shortId})`;
          }
          // IOU - asset has currency and issuer
          else if (asset?.currency && asset?.issuer) {
               const currency = this.utilsService.normalizeCurrencyCode(asset.currency);
               const issuer = asset.issuer;
               const shortIssuer = issuer.length > 12 ? `${issuer.slice(0, 6)}...${issuer.slice(-6)}` : issuer;
               return `${maxAmount} ${currency} (${shortIssuer})`;
          }
          // Fallback - if asset is a string (legacy format)
          else if (typeof asset === 'string') {
               try {
                    const xrpAmount = xrpl.dropsToXrp(asset);
                    return `${xrpAmount} XRP`;
               } catch {
                    return `${asset} (unknown)`;
               }
          }

          return 'N/A';
     }

     formatVaultAmountDetailed(asset: any, assetsMaximum?: any): { amount: string; currency: string; issuer: string; display: string; fullDisplay: string } {
          if (!asset) {
               return { amount: '0', currency: 'Unknown', issuer: '', display: 'N/A', fullDisplay: 'N/A' };
          }

          let amount = '0';
          let currency = 'Unknown';
          let issuer = '';
          let display = 'N/A';
          let fullDisplay = 'N/A';
          const isMptAsset = asset?.mpt_issuance_id || asset?.mptIssuanceId;

          if (assetsMaximum) {
               if (typeof assetsMaximum === 'string') {
                    amount = assetsMaximum;
               } else if (typeof assetsMaximum === 'number') {
                    amount = assetsMaximum.toString();
               } else if (assetsMaximum?.value) {
                    amount = assetsMaximum.value;
               }
          }

          if (asset?.currency === 'XRP') {
               currency = 'XRP';
               display = `${amount} XRP`;
               fullDisplay = `${amount} XRP`;
          } else if (isMptAsset) {
               currency = 'MPT';
               issuer = asset.mpt_issuance_id || asset.mptIssuanceId;
               const shortId = issuer.length > 16 ? `${issuer.slice(0, 8)}...${issuer.slice(-8)}` : issuer;
               display = `${amount} MPT (${shortId})`;
               fullDisplay = `${amount} MPT (${issuer})`;
          }
          // IOU
          else if (asset?.currency && asset?.issuer) {
               currency = this.utilsService.normalizeCurrencyCode(asset.currency);
               issuer = asset.issuer;
               const shortIssuer = issuer.length > 12 ? `${issuer.slice(0, 6)}...${issuer.slice(-6)}` : issuer;
               display = `${amount} ${currency} (${shortIssuer})`;
               fullDisplay = `${amount} ${currency} (${issuer})`;
          }
          // Legacy string format
          else if (typeof asset === 'string') {
               try {
                    amount = xrpl.dropsToXrp(asset).toString();
                    currency = 'XRP';
                    display = `${amount} XRP`;
                    fullDisplay = `${amount} XRP`;
               } catch {
                    display = `${asset} (unknown)`;
                    fullDisplay = `${asset} (unknown)`;
               }
          }

          return { amount, currency, issuer, display, fullDisplay };
     }

     private parseAssetsMaximum(assetsMaximum: any): string {
          if (!assetsMaximum) return '0';

          if (typeof assetsMaximum === 'string') {
               return assetsMaximum;
          }
          if (typeof assetsMaximum === 'number') {
               return assetsMaximum.toString();
          }
          if (assetsMaximum?.value) {
               return assetsMaximum.value;
          }
          return '0';
     }

     async getExistingVaults(vaultObjects: xrpl.AccountObjectsResponse, classicAddress: string, activeTab: VaultActionTypes): Promise<AnyVaultDisplayItem[]> {
          const filtered = (vaultObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'Vault');

          const mapped = await Promise.all(
               filtered.map(async (obj: any): Promise<AnyVaultDisplayItem> => {
                    console.log('vault: ', obj);
                    // Parse the Asset (currency type)
                    const asset = obj.Asset;
                    const { currency, issuer, amountDisplay: assetDisplay } = this.parseVaultAsset(asset);

                    // Parse the AssetsMaximum (the actual amount)
                    const maxAmount = this.parseAssetsMaximum(obj.AssetsMaximum);
                    const assetsAvailable = this.parseAssetsMaximum(obj.AssetsAvailable);
                    const assetsTotal = this.parseAssetsMaximum(obj.AssetsTotal);

                    // Build the full amount display
                    let fullAmountDisplay = '';
                    if (currency === 'XRP') {
                         fullAmountDisplay = `${maxAmount} XRP`;
                    } else if (currency === 'MPT') {
                         fullAmountDisplay = `${maxAmount} MPT`;
                    } else {
                         fullAmountDisplay = `${maxAmount} ${currency}`;
                    }

                    let vaultSequence: number | null = null;
                    if (obj.PreviousTxnID) {
                         try {
                              const sequenceTx = await this.xrplCache.getTxCached(obj.PreviousTxnID, 90);
                              vaultSequence = sequenceTx?.result?.tx_json?.Sequence ?? sequenceTx?.result?.tx_json?.TicketSequence ?? obj.Sequence ?? null;
                         } catch (error: any) {
                              console.warn(`Failed to fetch vault sequence for ${obj.PreviousTxnID}:`, error.message);
                              vaultSequence = obj.Sequence || null;
                         }
                    }

                    // Decode Data field if present (hex to string)
                    let decodedData = '';
                    if (obj.Data) {
                         try {
                              decodedData = xrpl.convertHexToString(obj.Data);
                         } catch {
                              decodedData = obj.Data;
                         }
                    }

                    // Get withdrawal policy name
                    const withdrawalPolicyNames: Record<number, string> = {
                         0: 'Standard',
                         1: 'First Come First Serve',
                         2: 'Pro-rata',
                         3: 'Fixed Amount',
                    };

                    return {
                         tab: activeTab,
                         VaultSequence: vaultSequence || obj.Sequence || 0,
                         Sequence: obj.Sequence || 0,
                         amount: maxAmount,
                         amountDisplay: fullAmountDisplay,
                         currency: currency,
                         issuer: issuer,
                         destination: obj.Destination || '',
                         sender: obj.Account || obj.Owner || '',
                         owner: obj.Owner || '',
                         id: obj.id || '',
                         data: decodedData,
                         shareMPTID: obj.ShareMPTID || '',
                         withdrawalPolicy: obj.WithdrawalPolicy || 0,
                         withdrawalPolicyName: withdrawalPolicyNames[obj.WithdrawalPolicy] || 'Unknown',
                         flags: this.formatFlag(obj.Flags), // || 0,
                         Asset: obj.Asset,
                         AssetsMaximum: obj.AssetsMaximum,
                         AssetsAvailable: assetsAvailable,
                         AssetsTotal: assetsTotal,
                         asset: JSON.stringify(obj.Asset || ''),
                         index: obj.index || '',
                         txHash: obj.PreviousTxnID || '',
                         assetsMaximum: obj.AssetsMaximum,
                         Scale: obj.Scale,
                    };
               })
          );

          mapped.sort((a, b) => (a.VaultSequence || 0) - (b.VaultSequence || 0));
          this.logService.logObjects('existingVaults', mapped);
          return mapped;
     }

     async getVaultById(client: xrpl.Client, vaultId: string): Promise<any | null> {
          try {
               const result = await this.xrplCache.getVaultInfo(client, vaultId);

               if (result.result?.vault) {
                    const vault = result.result.vault;
                    // Parse and format the vault data
                    const asset = vault.Asset || vault.SendMax;
                    const maxAmount = this.parseAssetsMaximum(vault.AssetsMaximum);
                    const assetsAvailable = this.parseAssetsMaximum(vault.AssetsAvailable);
                    const assetsTotal = this.parseAssetsMaximum(vault.AssetsTotal);

                    return {
                         id: vault.index || vault.id || '',
                         index: vault.index || vault.id || '',
                         VaultSequence: vault.VaultSequence || vault.Sequence || 0,
                         Sequence: vault.Sequence || 0,
                         amount: maxAmount,
                         owner: vault.Owner || vault.Account || '',
                         Account: vault.Owner || vault.Account || '',
                         Asset: asset,
                         AssetsMaximum: vault.AssetsMaximum,
                         AssetsAvailable: assetsAvailable,
                         AssetsTotal: assetsTotal,
                         Flags: vault.Flags || 0,
                         Shares: vault.shares || vault.Shares || [],
                         DomainID: vault.DomainID || '',
                         Data: vault.Data || '',
                         currency: asset?.currency === 'XRP' ? 'XRP' : asset?.mpt_issuance_id ? 'MPT' : asset?.currency ? 'IOU' : 'Unknown',
                         issuer: asset?.mpt_issuance_id || asset?.issuer || '',
                    };
               }
               return null;
          } catch (error: any) {
               console.error(`Failed to fetch vault ${vaultId}:`, error.message);
               return null;
          }
     }

     async refreshVaultAfterTransaction(client: xrpl.Client): Promise<void> {
          const selectedId = this.vaultStoreService.selectedVaultId();
          if (!selectedId) return;

          try {
               // Fetch fresh vault data
               const freshVault = await this.getVaultById(client, selectedId);
               if (freshVault) {
                    // Update cache
                    this.vaultCacheService.setVault(selectedId, freshVault);

                    // Update manually fetched vault if it exists
                    const manuallyFetched = this.vaultStoreService.manuallyFetchedVault();
                    if (manuallyFetched && String(manuallyFetched.index || manuallyFetched.id || '') === selectedId) {
                         this.vaultStoreService.setField('manuallyFetchedVault', freshVault);
                    }

                    // Update in existing vaults if found
                    const existingVaults = this.vaultStoreService.existingVaults() || [];
                    const index = existingVaults.findIndex((v: any) => String(v.index || v.id || '') === selectedId);
                    if (index !== -1) {
                         const updatedVaults = [...existingVaults];
                         updatedVaults[index] = freshVault;
                         this.vaultStoreService.setField('existingVaults', updatedVaults);
                    }
               }
          } catch (error) {
               console.error('Failed to refresh vault after transaction:', error);
          }
     }

     vaultItemsForDeposit(vaults: any[]): SelectItem[] {
          if (!vaults || vaults.length === 0) return [];

          return vaults.map(vault => {
               const vaultId = vault.index || vault.id || '';
               const asset = vault.Asset || vault.SendMax;
               const amount = this.formatVaultAmount(asset, vault.AssetsMaximum);
               const owner = vault.owner || vault.Account || vault.Owner || '';
               const shortOwner = owner.length > 12 ? `${owner.slice(0, 6)}...${owner.slice(-6)}` : owner;
               const shortId = vaultId.length > 16 ? `${vaultId.slice(0, 8)}...${vaultId.slice(-8)}` : vaultId;

               return {
                    id: vaultId,
                    label: `Vault ${shortId} - ${amount}`,
                    secondaryLabel: `Owner: ${shortOwner}`,
                    display: `${amount} (${shortOwner})`,
               };
          });
     }

     decodeVaultData(hexData: string): string {
          if (!hexData) return '';
          try {
               return xrpl.convertHexToString(hexData);
          } catch {
               return hexData;
          }
     }

     vaultItems(vaults: any[], currentAddress: string | null): SelectItem[] {
          if (!vaults || vaults.length === 0) return [];

          // If currentAddress is null, show all vaults (for deposits)
          // If currentAddress is provided, filter by owner (for delete/modify)
          let filteredVaults = vaults;
          if (currentAddress) {
               filteredVaults = vaults.filter(v => {
                    const owner = v.owner || v.Account || v.Owner;
                    return owner === currentAddress;
               });
          }

          return filteredVaults.map(vault => {
               const vaultId = vault.index || vault.id || '';
               const asset = vault.Asset || vault.SendMax;
               const amount = this.formatVaultAmount(asset, vault.AssetsMaximum);
               const owner = vault.owner || vault.Account || vault.Owner || '';
               const shortOwner = owner.length > 12 ? `${owner.slice(0, 6)}...${owner.slice(-6)}` : owner;
               const shortId = vaultId.length > 16 ? `${vaultId.slice(0, 8)}...${vaultId.slice(-8)}` : vaultId;

               // For deposits, show the owner to help identify the vault
               return {
                    id: vaultId,
                    label: `Vault ${shortId} - ${amount}`,
                    secondaryLabel: `Owner: ${shortOwner}`,
                    display: `${amount} (${shortOwner})`,
               };
          });
     }

     selectedVaultItem(items: SelectItem[], selectedVaultId: string | null): SelectItem | null {
          if (!selectedVaultId) return null;
          return items.find(item => item.id === selectedVaultId) || null;
     }

     getVaultHolders(vault: any): SelectItem[] {
          if (!vault) return [];

          // If the vault has share information
          if (vault.Shares && Array.isArray(vault.Shares)) {
               return vault.Shares.map((share: any) => ({
                    id: share.Holder || share.Account || '',
                    label: share.Holder || share.Account || '',
                    secondaryLabel: share.Amount ? `Balance: ${share.Amount}` : '',
                    display: share.Holder || share.Account || '',
               }));
          }

          return [];
     }

     formatClawbackAmount(amount: string | number, asset: any): string {
          if (!amount) return '0';

          const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;

          if (asset?.currency === 'XRP') {
               return `${amountNum} XRP`;
          } else if (asset?.mpt_issuance_id) {
               return `${amountNum} MPT`;
          } else if (asset?.currency && asset?.issuer) {
               const currency = this.utilsService.normalizeCurrencyCode(asset.currency);
               return `${amountNum} ${currency}`;
          }
          return `${amountNum}`;
     }

     async checkMptAuthorization(client: xrpl.Client, mptIssuanceId: string, walletAddress: string): Promise<boolean> {
          try {
               const response = await client.request({
                    command: 'account_objects',
                    account: walletAddress,
                    ledger_index: 'validated',
                    type: 'mptoken',
               });

               const mpts = response.result.account_objects || [];
               return mpts.some((mpt: any) => mpt.MPTokenIssuanceID === mptIssuanceId || mpt.mpt_issuance_id === mptIssuanceId);
          } catch {
               return false;
          }
     }

     // async checkMptAuthorization(client: xrpl.Client, mptIssuanceId: string, walletAddress: string): Promise<boolean> {
     //      try {
     //           // Query the MPT to check authorization
     //           const response = await client.request({
     //                command: 'ledger_entry',
     //                mpt_issuance_id: mptIssuanceId,
     //                ledger_index: 'validated',
     //           } as any);

     //           // const mpt = response.result?.mpt;
     //           // if (!mpt) {
     //           //      this.toastService.error('MPT not found on ledger', AppConstants.TOAST.ERROR);
     //           //      return false;
     //           // }

     //           // // Check if the wallet is authorized
     //           // const authorized = mpt.AuthorizedAccounts && Array.isArray(mpt.AuthorizedAccounts) && mpt.AuthorizedAccounts.some((acc: any) => acc.Account === walletAddress);

     //           // if (!authorized) {
     //           //      this.toastService.error(`Wallet ${walletAddress.slice(0, 8)}... is not authorized to hold this MPT. Please authorize first.`, AppConstants.TOAST.ERROR);
     //           //      return false;
     //           // }

     //           return true;
     //      } catch (error: any) {
     //           console.error('Error checking MPT authorization:', error);
     //           this.toastService.error('Failed to check MPT authorization', AppConstants.TOAST.ERROR);
     //           return false;
     //      }
     // }

     formatFlag(amount: any) {
          if (amount === 0) {
               return 0;
          } else if (amount === 65536) {
               return 'Vault Private';
          } else if (amount === 131072) {
               return 'Share Non Transferable';
          }

          return 1;
     }

     readonly createVaultButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create Vault';
          if (step === 'waiting_validation') return 'Create Vault';
          return this.txUiService.stepMessage();
     });

     readonly modifyVaultButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Modify Vault';
          if (step === 'waiting_validation') return 'Modify Vault';
          return this.txUiService.stepMessage();
     });

     readonly depositButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') {
               return this.vaultStoreService.vaultAction() === 'deposit' ? 'Deposit Vault' : 'Withdrawl Vault';
          }
          if (step === 'waiting_validation') return this.vaultStoreService.vaultAction() === 'deposit' ? 'Deposit Vault' : 'Withdrawl Vault';
          return this.txUiService.stepMessage();
     });

     readonly clawbackVaultButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Clawback Vault Assets';
          if (step === 'waiting_validation') return 'Clawback Vault Assets';
          return this.txUiService.stepMessage();
     });

     readonly deleteVaultButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Delete Vault';
          if (step === 'waiting_validation') return 'Delete Vault';
          return this.txUiService.stepMessage();
     });
}
