import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AnyVaultDisplayItem, VaultActionTypes, VaultInfoData } from '../../../components/vault/constants/vault.types';
import { ChecksStoreService } from '../../checks/checks-store/checks-store.service';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { MptStoreService } from '../../mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../mpt/mpt-util/mpt-util.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { AcccountDataService } from '../../account-data/acccount-data.service';
import { TransactionDropdownService } from '../../transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { SelectItem } from '../../shared/destination-dropdown/destination-dropdown.service';
// import { EscrowStoreService } from '../../escrow/escrow-store/escrow-store.service';
import * as xrpl from 'xrpl';
import { VaultStoreService } from '../vault-store/vault-store.service';
import { VaultCacheService } from '../vault-cache/vault-cache.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';

@Injectable({
     providedIn: 'root',
})
export class VaultViewModelService {
     public readonly checksStoreService = inject(ChecksStoreService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly mptUtilService = inject(MptUtilService);
     // public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly vaultCacheService = inject(VaultCacheService);
     private readonly xrplCacheService = inject(XrplCacheService);

     readonly selectedDestinationAddress = signal<string>('');
     readonly destinationSearchQuery = signal<string>('');
     readonly activeTab = signal<VaultActionTypes>('createVault');

     // Build destination computed signals once here using TransactionDropdownService
     private readonly _allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     private readonly _destinationMap = this.transactionDropdownService.destinationMap(this._allDestinations);
     private readonly _destinationItems = this.transactionDropdownService.destinationItems(this._allDestinations);
     private readonly _selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this._destinationMap, this._destinationItems);

     constructor() {
          effect(() => {
               const info = this.infoData();
               console.log('Info data changed:', info?.vaultCount, info?.vaultsToShow?.length);
          });
     }

     // Unwrapped accessors for templates
     destinationItems() {
          return this._destinationItems();
     }

     selectedDestinationItem() {
          return this._selectedDestinationItem();
     }

     destinationSearchQuery_value() {
          return this.destinationSearchQuery();
     }

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.currencyStoreService.balance();
     selectedIssuerAddress = computed(() => this.currencyStoreService.issuer());

     // Selected currency
     selectedCurrencyItem = computed(() => {
          const code = this.currencyStoreService.currency();
          if (!code) return null;
          return this.trustlineCurrencyService.currencyItems().find(item => item.id === code) || null;
     });

     // Selected issuer
     selectedIssuerItem = computed(() => {
          const addr = this.currencyStoreService.issuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     });

     readonly currentWalletData = computed(() => {
          const currentAddr = this.walletManagerService.getSelectedWallet()?.address;
          if (!currentAddr) return null;

          const wallet = this.walletManagerService.wallets().find(w => w.address === currentAddr);
          if (!wallet?.address) return null;

          return {
               address: wallet.address,
               name: wallet.name || wallet.address.slice(0, 10) + '...',
          };
     });

     readonly explorerLinks = computed(() => {
          const tab = this.activeTab();
          if (tab !== 'createVault') return null;

          const wallet = this.currentWalletData();
          if (!wallet) return null;

          const base = this.txUiService.explorerUrl();
          const addr = wallet.address;

          const links: string[] = [];

          // if (this.escrowStoreService.existingEscrow().length > 0) {
          //      links.push(`<a href="${base}account/${addr}/escrows" target="_blank" rel="noopener" class="xrpl-win-link">View Escrows</a>`);
          // }
          if (this.trustlineStoreService.existingIOUs().length > 0) {
               links.push(`<a href="${base}account/${addr}/tokens" target="_blank" rel="noopener" class="xrpl-win-link">View IOUs</a>`);
          }
          // if (this.escrowStoreService.existingIOUs().length > 0) {
          //      links.push(`<a href="${base}account/${addr}/tokens" target="_blank" rel="noopener" class="xrpl-win-link">View IOUs</a>`);
          // }
          if (this.mptStoreService.existingMpts().length > 0) {
               links.push(`<a href="${base}account/${addr}/mpts/owned" target="_blank" rel="noopener" class="xrpl-win-link">View MPTs</a>`);
          }

          return links.length > 0 ? links.join(' | ') : null;
     });

     readonly infoData = computed((): VaultInfoData | null => {
          const wallet = this.currentWalletData();
          if (!wallet) return null;

          const existingVaults = this.vaultStoreService.existingVaults() || [];
          const activeTab = this.activeTab();
          console.log('Computing infoData, vaults count:', existingVaults.length);
          console.log('Computing infoData, activeTab:', activeTab);

          const ownedVaults = [...(this.vaultStoreService.existingVaults() || [])];
          const allMpts = this.mptStoreService.existingMpts() || [];

          // 1. Enrich owned vaults (Wallet A)
          const enrichedOwned = ownedVaults.map(vault => {
               const shareId = vault.shareMPTID || (vault.currency === 'MPT' ? vault.issuer : null);
               const matchingMpt = shareId ? allMpts.find(m => m.MPTIssuanceID === shareId || m.id === shareId || m.mpt_issuance_id === shareId) : null;

               return {
                    ...vault,
                    myShareMpt: matchingMpt,
                    mySharesBalance: matchingMpt?.balance || '0',
                    isOwned: true,
               } as AnyVaultDisplayItem;
          });

          const knownVaultShareIds = new Set(ownedVaults.map(vault => vault.shareMPTID || (vault.currency === 'MPT' ? vault.issuer : null)).filter((id): id is string => !!id));

          // 2. Build participating vaults from MPTs only when the MPT issuance matches a known vault share issuance
          const participatingVaults = allMpts
               .filter(mpt => {
                    const issuanceId = mpt.mpt_issuance_id || mpt.MPTIssuanceID || mpt.id || '';
                    if (!issuanceId || !knownVaultShareIds.has(issuanceId)) {
                         return false;
                    }

                    const balance = mpt.balance || mpt.MPTAmount || '0';
                    return parseFloat(balance) > 0;
               })
               .map(mpt => {
                    const issuanceId = mpt.mpt_issuance_id || mpt.MPTIssuanceID || mpt.id || '';
                    const balance = mpt.balance || mpt.MPTAmount || '0';

                    return {
                         tab: this.activeTab(),
                         VaultSequence: 0,
                         Sequence: 0,
                         amount: balance,
                         amountDisplay: `${balance} Vault Shares`,
                         currency: 'MPT',
                         issuer: issuanceId,
                         destination: '',
                         sender: '',
                         owner: 'Unknown (via shares)',
                         id: issuanceId,
                         index: issuanceId,
                         data: '',
                         shareMPTID: issuanceId,
                         withdrawalPolicy: 0,
                         withdrawalPolicyName: 'Standard',
                         flags: '',
                         asset: '',
                         Asset: null,
                         AssetsMaximum: balance,
                         AssetsAvailable: balance,
                         AssetsTotal: balance,
                         Scale: 0,
                         txHash: '',
                         myShareMpt: mpt,
                         mySharesBalance: balance,
                         isOwned: false,
                         isParticipating: true,
                    } as AnyVaultDisplayItem;
               });

          const allVaultsToShow = [...enrichedOwned, ...participatingVaults];

          console.log('Owned vaults:', enrichedOwned.length);
          console.log('Participating via MPTs Length:', participatingVaults.length);
          console.log('Participating via MPTs:', participatingVaults);
          console.log('Total vaultsToShow:', allVaultsToShow.length);

          return {
               walletName: wallet.name,
               vaultCount: ownedVaults.length + participatingVaults.length,
               vaultsToShow: this.getVaultsForTab(allVaultsToShow, this.activeTab()),
               mpts: allMpts,
               links: this.explorerLinks(),
               activeTab: this.activeTab(),
          };
     });

     private getVaultsForTab(vaults: any[], tab: VaultActionTypes): AnyVaultDisplayItem[] {
          const currentAddress = this.currentWalletData()?.address;
          if (!currentAddress) return [];

          switch (tab) {
               case 'createVault':
               case 'deleteVault':
                    // Only vaults this wallet actually created/owns
                    return vaults.filter(v => v.isOwned === true && (v.owner === currentAddress || v.sender === currentAddress));

               default:
                    // For all other tabs (main view, deposit, withdraw, etc.)
                    // Show BOTH: vaults I own + vaults where I hold shares
                    return vaults.filter(v => v.isOwned === true || v.isParticipating === true);
          }
     }

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');
     mptItems = computed(() => this.mptUtilService.computeMptItems(this.mptStoreService.existingMpts()));

     selectedMptItem = computed(() => this.mptUtilService.computeSelectedMptItem(this.mptItems(), this.mptStoreService.mptIssuanceId()));

     selectedMPT(item: SelectItem | null) {
          this.mptStoreService.setField('mptIssuanceId', item?.id || '');
     }

     public async refreshMpts(forceRefresh = false): Promise<void> {
          if (!this.currentWalletData()) return;

          try {
               const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
               if (!env?.client) return;

               const walletAddress = this.currentWalletData()?.address;
               if (!walletAddress) return;

               // Option 1: Get MPTs from account_objects (MPTs held by the wallet)
               const response = await this.xrplCacheService.getMptTokens(env.client, walletAddress, '', true);

               const mptokens = response.result.account_objects || [];

               // Map MPTs to a consistent format
               const formattedMpts = mptokens.map((mpt: any) => ({
                    ...mpt,
                    id: mpt.MPTIssuanceID || mpt.mpt_issuance_id || mpt.id,
                    issuanceId: mpt.MPTIssuanceID || mpt.mpt_issuance_id || mpt.id,
                    balance: mpt.MPTAmount || mpt.balance || '0',
                    Account: mpt.Account || walletAddress,
                    owner: mpt.Account || walletAddress,
               }));

               // Also get MPTs from account objects for vaults (if needed)
               // This gets MPTs that the wallet has issued (as opposed to held)
               let issuedMpts: any[] = [];
               if (env.accountObjects) {
                    issuedMpts = (await this.mptUtilService.getMpts(env.accountObjects, walletAddress)) || [];
               }

               // Combine both sources, avoiding duplicates
               const allMpts = [...formattedMpts];
               issuedMpts.forEach((mpt: any) => {
                    const id = mpt.MPTIssuanceID || mpt.mpt_issuance_id || mpt.id;
                    const exists = allMpts.some((existing: any) => existing.MPTIssuanceID === id || existing.mpt_issuance_id === id || existing.id === id);
                    if (!exists) {
                         allMpts.push(mpt);
                    }
               });

               // Log what we found
               console.log('Total MPTs found:', allMpts.length);
               console.log(
                    'Share MPTs (with VaultID):',
                    allMpts.filter(m => m.VaultID || m.vault_id || m.VaultSequence)
               );

               this.mptStoreService.setField('existingMpts', allMpts);
          } catch (error) {
               console.error('refreshMpts failed', error);
          }
     }

     metadataByteLength = computed(() => {
          const meta = this.mptStoreService.metaData().trim();
          if (!meta) return 0;

          try {
               // Convert to hex (same as xrpl.convertStringToHex does)
               const hex = xrpl.convertStringToHex(meta);
               return hex.length / 2; // hex string: 2 chars = 1 byte
          } catch {
               return 0;
          }
     });

     metadataIsValid = computed(() => {
          return this.metadataByteLength() <= 1024;
     });
}
