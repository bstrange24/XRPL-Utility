import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { EscrowValidatorService } from '../../../../services/shared/validators/escrow-validator/escrow-validator.service';
import { TransactionDropdownService } from '../../../../services/transaction-dropdown/transaction-dropdown.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { AppConstants } from '../../../../core/app.constants';
import { VaultStoreService } from '../../../../services/vault/vault-store/vault-store.service';
import { VaultViewModelService } from '../../../../services/vault/vault-view-model/vault-view-model.service';
import { VaultUtilService } from '../../../../services/vault/vault-util/vault-util.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { AccountConfiguratorStoreService } from '../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { VaultCacheService } from '../../../../services/vault/vault-cache/vault-cache.service';
import { XrplCacheService } from '../../../../services/xrpl-cache/xrpl-cache.service';
import { MPTokenObject } from '../../../mpt/constants/mpt.types';

@Component({
     selector: 'app-vault-clawback',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './vault-clawback.component.html',
     styleUrl: './vault-clawback.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultClawbackComponent {
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly viewModel = inject(EscrowTransactionViewModelService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly escrowValidatorService = inject(EscrowValidatorService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly vaultViewModelService = inject(VaultViewModelService);
     public readonly vaultUtilService = inject(VaultUtilService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     private readonly vaultCacheService = inject(VaultCacheService);
     private readonly xrplCacheService = inject(XrplCacheService);

     // Helper Items
     readonly vaultSelectorHelperItems = AppConstants.VAULT_SELECTOR_HELPER_ITEMS;
     readonly holderHelperItems = AppConstants.HOLDER_HELPER_ITEMS;
     readonly clawbackAmountHelperItems = AppConstants.CLAWBACK_AMOUNT_HELPER_ITEMS;
     readonly vaultOwnerHelperItems = AppConstants.VAULT_OWNER_HELPER_ITEMS;
     readonly vaultAmountHelperItems = AppConstants.VAULT_AMOUNT_HELPER_ITEMS;

     // UI Signals
     showVaultSelectorHelper = signal(false);
     showHolderHelper = signal(false);
     showClawbackAmountHelper = signal(false);
     showVaultOwnerHelper = signal(false);
     showVaultAmountHelper = signal(false);
     isFocused = signal(false);
     isLoadingHolders = signal(false);
     holderItemsSignal = signal<SelectItem[]>([]);

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isVaultSelectorTouched = signal(false);
     private isHolderTouched = signal(false);
     private isAmountTouched = signal(false);
     private isFormDirty = signal(false);

     readonly currentAddress = input<string>('');
     // Outputs
     canClawbackVaultChange = output<boolean>();
     performAction = output<void>();
     clearFields = output<void>();

     // Selected holder
     selectedHolder = signal<SelectItem | null>(null);

     constructor() {
          this.holderItemsSignal.set([]);

          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canClawbackVaultChange.emit(this.canClawbackVault());
          });

          effect(() => {
               const address = this.currentAddress();
               if (address) {
                    this.vaultCacheService.setWalletAddress(address);
               }
          });

          effect(() => {
               if (this.vaultStoreService.selectedVaultId()) {
                    // Optionally refresh MPTs to get latest holders
                    this.vaultViewModelService.refreshMpts();
               }
          });

          effect(() => {
               if (this.vaultStoreService.selectedVaultId()) {
                    // Trigger refresh
                    const vault = this.getSelectedVault();
                    if (vault) {
                         this.refreshHolders(vault);
                    }
               }
          });
     }

     public get activeTab() {
          return this.vaultViewModelService.activeTab();
     }

     // Helper method for parseFloat in template
     public parseFloat(value: any): number {
          return parseFloat(value);
     }

     // Helper method to check if amount is all (empty or 0)
     public isAllAmount(amount: string): boolean {
          return !amount || parseFloat(amount) === 0;
     }

     // Vault Selection
     public vaultItems() {
          const address = this.walletManagerService.getSelectedWallet()?.address || '';
          return this.vaultUtilService.vaultItems(this.vaultStoreService.existingVaults(), address);
     }

     public selectedVaultItem() {
          return this.vaultUtilService.selectedVaultItem(this.vaultItems(), this.vaultStoreService.selectedVaultId());
     }

     public getSelectedVault() {
          const selectedId = this.vaultStoreService.selectedVaultId();
          if (!selectedId) return null;

          // Check cache first
          const cached = this.vaultCacheService.getVault(selectedId);
          if (cached) return cached;

          // Then check store
          const vaults = this.vaultStoreService.existingVaults() || [];
          return vaults.find((v: any) => {
               const vaultId = v.index || v.id;
               return vaultId?.toString() === selectedId;
          });
     }

     async onVaultSelected(item: SelectItem | null) {
          // Mark as touched and dirty
          this.isVaultSelectorTouched.set(true);
          this.isFormDirty.set(true);

          if (!item?.id) {
               this.vaultStoreService.setField('selectedVaultId', null);
               this.vaultStoreService.setField('selectedVaultSequence', null);
               this.selectedHolder.set(null);
               return;
          }

          // Find the vault
          let vault = this.vaultStoreService.existingVaults().find((v: any) => {
               const vaultId = v.index || v.id;
               return vaultId?.toString() === item.id;
          });

          if (!vault) {
               vault = this.vaultCacheService.getVault(item.id);
          }

          if (vault) {
               const vaultId = vault.index || vault.id;
               this.vaultStoreService.setField('selectedVaultId', vaultId);
               this.vaultStoreService.setField('selectedVaultSequence', vault.VaultSequence || vault.Sequence);

               // Reset holder selection
               this.selectedHolder.set(null);
               this.vaultStoreService.setField('clawbackAmount', '');
               this.vaultStoreService.setField('holder', '');

               // Reset touched states for dependent fields
               this.isHolderTouched.set(false);
               this.isAmountTouched.set(false);

               // Show loading state
               this.isLoadingHolders.set(true);

               try {
                    // Refresh holders from ledger
                    await this.refreshHolders(vault);

                    // Force update of holder items
                    this.holderItemsSignal.set(this.holderItems());
               } finally {
                    this.isLoadingHolders.set(false);
               }
          }
     }

     async refreshHolders(vault: any): Promise<void> {
          const shareMPTID = vault.shareMPTID || vault.issuer;
          if (!shareMPTID) return;

          try {
               const env = await this.vaultViewModelService.txEnvironmentService.getValidatedEnvironment(false);
               if (!env?.client) return;

               // Get all destinations (wallets + custom destinations)
               const allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations)();

               // Fetch holders from ledger
               const holders = await this.fetchHoldersFromLedger(
                    shareMPTID,
                    allDestinations.map(d => d.address)
               );

               // Update the vault's shares in the store
               if (holders.length > 0) {
                    // Update existing vaults
                    const existingVaults = this.vaultStoreService.existingVaults();
                    const index = existingVaults.findIndex((v: any) => {
                         const vaultId = v.index || v.id;
                         return vaultId?.toString() === (vault.index || vault.id);
                    });

                    if (index !== -1) {
                         const updatedVaults = [...existingVaults];
                         updatedVaults[index] = {
                              ...updatedVaults[index],
                              Shares: holders.map(h => ({
                                   Holder: h.id,
                                   Amount: h.balance || '0',
                              })),
                         };
                         this.vaultStoreService.setField('existingVaults', updatedVaults);
                    }

                    // Update cache
                    this.vaultCacheService.setVault(vault.index || vault.id, {
                         ...vault,
                         Shares: holders.map(h => ({
                              Holder: h.id,
                              Amount: h.balance || '0',
                         })),
                    });
               }
          } catch (error) {
               console.error('Failed to refresh holders:', error);
          }
     }

     public holderItems(): SelectItem[] {
          const vault = this.getSelectedVault();
          if (!vault) return [];

          // Get all destinations (wallets + custom destinations)
          const allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations)();

          // Create a map of holder balances from vault shares (refreshed from ledger)
          const balanceMap = new Map<string, string>();
          if (vault.Shares && Array.isArray(vault.Shares)) {
               vault.Shares.forEach((share: any) => {
                    const address = share.Holder || share.Account;
                    const amount = share.Amount || share.value || '0';
                    if (address && parseFloat(amount) > 0) {
                         balanceMap.set(address, amount);
                    }
               });
          }

          // Build items from all destinations
          const items: SelectItem[] = [];
          const seenAddresses = new Set<string>();

          // First, add holders with balances (sorted by balance)
          const holdersWithBalance = Array.from(balanceMap.entries()).sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));

          holdersWithBalance.forEach(([address, amount]) => {
               if (!seenAddresses.has(address)) {
                    seenAddresses.add(address);
                    const formattedAmount = this.formatVaultAmount(amount, vault.Asset || vault.SendMax);
                    items.push({
                         id: address,
                         secondary: `Balance: ${formattedAmount}`,
                         display: `${address.slice(0, 8)}...${address.slice(-6)} (${formattedAmount})`,
                    });
               }
          });

          // Then, add other destinations without balances
          allDestinations.forEach(dest => {
               if (!seenAddresses.has(dest.address)) {
                    seenAddresses.add(dest.address);
                    items.push({
                         id: dest.address,
                         secondary: 'Balance: 0',
                         display: dest.name ? `${dest.name} (${dest.address.slice(0, 8)}...${dest.address.slice(-6)}) - No balance` : `${dest.address.slice(0, 8)}...${dest.address.slice(-6)} - No balance`,
                    });
               }
          });

          return items;
     }

     public holderItemsAll(): SelectItem[] {
          const vault = this.getSelectedVault();
          if (!vault) return [];

          // Get all destinations (wallets + custom destinations)
          const allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations)();

          // Get holders from vault shares
          const vaultHolders = this.getVaultHoldersFromShares(vault);

          // Combine destinations with vault holders
          const combinedItems: SelectItem[] = [];
          const seenAddresses = new Set<string>();

          // First, add vault holders (these are known depositors)
          vaultHolders.forEach(holder => {
               if (!seenAddresses.has(holder.id)) {
                    seenAddresses.add(holder.id);
                    combinedItems.push(holder);
               }
          });

          // Then add destinations (wallets + custom destinations)
          allDestinations.forEach(dest => {
               if (!seenAddresses.has(dest.address)) {
                    // Check if this destination has a balance in this vault
                    const balance = this.getHolderBalanceFromVault(vault, dest.address);
                    seenAddresses.add(dest.address);
                    combinedItems.push({
                         id: dest.address,
                         secondary: balance ? `Balance: ${balance}` : 'No balance',
                         display: dest.name ? `${dest.name} (${dest.address.slice(0, 8)}...${dest.address.slice(-6)})${balance ? ` - ${balance}` : ''}` : `${dest.address.slice(0, 8)}...${dest.address.slice(-6)}${balance ? ` - ${balance}` : ''}`,
                    });
               }
          });

          // Sort by balance (largest first)
          combinedItems.sort((a, b) => {
               const aBalance = parseFloat(a.secondary?.replace('Balance: ', '') || '0');
               const bBalance = parseFloat(b.secondary?.replace('Balance: ', '') || '0');
               return bBalance - aBalance;
          });

          return combinedItems;
     }

     private getVaultHoldersFromShares(vault: any): SelectItem[] {
          const holders: SelectItem[] = [];
          if (vault.Shares && Array.isArray(vault.Shares)) {
               vault.Shares.forEach((share: any) => {
                    const address = share.Holder || share.Account;
                    const amount = share.Amount || share.value || '0';
                    if (address) {
                         const formattedAmount = this.formatVaultAmount(amount, vault.Asset || vault.SendMax);
                         holders.push({
                              id: address,
                              secondary: `Balance: ${formattedAmount}`,
                              display: `${address.slice(0, 8)}...${address.slice(-6)} (${formattedAmount})`,
                         });
                    }
               });
          }
          return holders;
     }

     // Helper to get holder balance from vault
     private getHolderBalanceFromVault(vault: any, address: string): string | null {
          if (vault.Shares && Array.isArray(vault.Shares)) {
               const share = vault.Shares.find((s: any) => s.Holder === address || s.Account === address);
               if (share) {
                    return this.formatVaultAmount(share.Amount || share.value || '0', vault.Asset || vault.SendMax);
               }
          }
          return null;
     }

     // Update the formatVaultAmount method if needed
     private formatVaultAmount(amount: string | number, asset: any): string {
          const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
          if (isNaN(numAmount)) return '0';

          if (asset?.currency === 'XRP') {
               return `${numAmount} XRP`;
          } else if (asset?.mpt_issuance_id) {
               return `${numAmount} MPT`;
          } else if (asset?.currency && asset?.issuer) {
               const currency = this.utilsService.normalizeCurrencyCode(asset.currency);
               return `${numAmount} ${currency}`;
          }
          return `${numAmount}`;
     }

     async fetchHoldersFromLedger(shareMPTID: string, addressesToCheck: string[]): Promise<{ id: string; balance: string }[]> {
          try {
               const env = await this.vaultViewModelService.txEnvironmentService.getValidatedEnvironment(false);
               if (!env?.client) return [];

               const holders: { id: string; balance: string }[] = [];

               // Check each address for MPT balance
               for (const address of addressesToCheck) {
                    try {
                         const response = await this.xrplCacheService.getMptTokens(env.client, address, shareMPTID, true);

                         const mptokens = response.result.account_objects || [];

                         // Find the specific MPT for this vault
                         const mpt = mptokens.find((obj: any) => {
                              // Check if it's an MPToken and matches the issuance ID
                              return obj.LedgerEntryType === 'MPToken' && (obj.MPTokenIssuanceID || obj.mpt_issuance_id) === shareMPTID;
                         });

                         if (mpt) {
                              // Use type assertion to handle the MPT properties
                              const mptObj = mpt as any;
                              const balance = mptObj.MPTAmount || mptObj.balance || mptObj.Amount || '0';

                              if (parseFloat(balance) > 0) {
                                   holders.push({
                                        id: address,
                                        balance: balance,
                                   });
                              }
                         }
                    } catch (error) {
                         console.warn(`Failed to fetch MPT for ${address}:`, error);
                    }
               }

               return holders;
          } catch (error) {
               console.error('Failed to fetch holders from ledger:', error);
               return [];
          }
     }

     public selectedHolderItem() {
          if (!this.selectedHolder()) return null;
          return this.selectedHolder();
     }

     public onHolderSelected(item: SelectItem | null) {
          // Mark as touched and dirty
          this.isHolderTouched.set(true);
          this.isFormDirty.set(true);

          if (item) {
               this.selectedHolder.set(item);
               this.vaultStoreService.setField('holder', item.id);

               // If this is a new address (not in destinations), add it
               const allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations)();
               const exists = allDestinations.some(d => d.address === item.id);
               if (!exists) {
                    this.transactionDropdownService.addCustomDestinationIfNew(item.id);
               }
          } else {
               this.selectedHolder.set(null);
               this.vaultStoreService.setField('holder', '');
          }
     }

     public selectedVaultOwner(): string {
          const vault = this.getSelectedVault();
          return vault?.owner || vault?.Account || '';
     }

     public selectedVaultTotalAssets(): string {
          const vault = this.getSelectedVault();
          if (!vault) return 'N/A';

          // Get the total assets in the vault
          const total = vault.AssetsTotal || '0';
          const asset = vault.Asset || vault.SendMax;

          if (asset?.currency === 'XRP') {
               return `${total} XRP`;
          } else if (asset?.mpt_issuance_id) {
               return `${total} MPT`;
          } else if (asset?.currency && asset?.issuer) {
               const currency = this.utilsService.normalizeCurrencyCode(asset.currency);
               return `${total} ${currency}`;
          }
          return total;
     }

     public isMPToken(obj: any): obj is MPTokenObject {
          return obj && obj.LedgerEntryType === 'MPToken';
     }

     public getAssetType(): string {
          const vault = this.getSelectedVault();
          if (!vault) return 'Unknown';
          const asset = vault.Asset || vault.SendMax;
          if (!asset) return 'Unknown';

          if (asset?.currency === 'XRP') return 'XRP';
          if (asset?.mpt_issuance_id) return 'MPT';
          if (asset?.currency && asset?.issuer) return 'IOU';
          if (typeof asset === 'string') return 'XRP';
          return 'Unknown';
     }

     public getAssetDetails(): { currency: string; issuer: string; mptId: string } {
          const vault = this.getSelectedVault();
          if (!vault) return { currency: '', issuer: '', mptId: '' };
          const asset = vault.Asset || vault.SendMax;
          if (!asset) return { currency: '', issuer: '', mptId: '' };

          if (asset?.currency === 'XRP') {
               return { currency: 'XRP', issuer: '', mptId: '' };
          }
          if (asset?.mpt_issuance_id) {
               return { currency: 'MPT', issuer: '', mptId: asset.mpt_issuance_id };
          }
          if (asset?.currency && asset?.issuer) {
               return { currency: asset.currency, issuer: asset.issuer, mptId: '' };
          }
          return { currency: '', issuer: '', mptId: '' };
     }

     public selectedHolderBalance(): string | null {
          const holder = this.selectedHolder();
          if (!holder) return null;

          // Try to get the holder's balance from the vault shares
          const vault = this.getSelectedVault();
          if (!vault) return null;

          // Check if the vault has share information
          if (vault.Shares && Array.isArray(vault.Shares)) {
               const share = vault.Shares.find((s: any) => s.Holder === holder.id || s.Account === holder.id);
               if (share) {
                    return share.Amount || share.value || '0';
               }
          }

          return null;
     }

     public getHolderDisplay(holder: SelectItem | null): string {
          if (!holder) return '';
          return holder.display || holder.id || '';
     }

     // Form field accessors
     get clawbackAmount() {
          return this.vaultStoreService.clawbackAmount();
     }

     set clawbackAmount(value: string) {
          // Mark as touched and dirty
          this.isAmountTouched.set(true);
          this.isFormDirty.set(true);
          this.vaultStoreService.setField('clawbackAmount', value);
     }

     // Amount validation
     isAmountValid(): boolean {
          const amount = this.clawbackAmount;
          if (!amount) return true; // Empty is valid (means all)
          return !this.amountValidatorService.isEscrowAmountInvalid();
     }

     isAmountInvalid(): boolean {
          const amount = this.clawbackAmount;
          if (!amount) return false;
          return this.amountValidatorService.isEscrowAmountInvalid();
     }

     // Validation
     canClawbackVault = computed(() => {
          const hasVaultSelected = !!this.vaultStoreService.selectedVaultId();
          if (!hasVaultSelected) return false;

          const hasHolder = !!this.vaultStoreService.holder();
          if (!hasHolder) return false;

          // Amount validation (empty is valid - means all)
          const amount = this.vaultStoreService.clawbackAmount();
          if (amount && amount.trim().length > 0) {
               if (this.amountValidatorService.isEscrowAmountInvalid()) {
                    return false;
               }

               // Check if amount exceeds holder's balance
               const holderBalance = this.selectedHolderBalance();
               if (holderBalance) {
                    const amountNum = parseFloat(amount);
                    const balanceNum = parseFloat(holderBalance);
                    if (!isNaN(amountNum) && !isNaN(balanceNum) && amountNum > balanceNum) {
                         return false;
                    }
               }
          }

          return true;
     });

     // Updated validation with touched/dirty state
     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Only show vault selection error if touched
          if (this.isVaultSelectorTouched() && !this.vaultStoreService.selectedVaultId()) {
               errors.push('Please select a vault.');
          }

          // Only show holder selection error if touched
          if (this.isHolderTouched() && !this.vaultStoreService.holder()) {
               errors.push('Please select a holder account to clawback from.');
          }

          // Only show amount errors if touched
          if (this.isAmountTouched()) {
               const amount = this.vaultStoreService.clawbackAmount();
               if (amount && amount.trim().length > 0) {
                    if (this.amountValidatorService.isEscrowAmountInvalid()) {
                         errors.push('Invalid amount format.');
                    }

                    const holderBalance = this.selectedHolderBalance();
                    if (holderBalance) {
                         const amountNum = parseFloat(amount);
                         const balanceNum = parseFloat(holderBalance);
                         if (!isNaN(amountNum) && !isNaN(balanceNum) && amountNum > balanceNum) {
                              errors.push(`Amount exceeds holder's balance of ${holderBalance}.`);
                         }
                    }
               }
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleVaultSelectorHelper() {
          this.showVaultSelectorHelper.set(!this.showVaultSelectorHelper());
     }

     toggleHolderHelper() {
          this.showHolderHelper.set(!this.showHolderHelper());
     }

     toggleAmountHelper() {
          this.showClawbackAmountHelper.set(!this.showClawbackAmountHelper());
     }

     toggleVaultOwnerHelper() {
          this.showVaultOwnerHelper.set(!this.showVaultOwnerHelper());
     }

     toggleVaultAmountHelper() {
          this.showVaultAmountHelper.set(!this.showVaultAmountHelper());
     }

     clearField(field: 'clawbackAmount') {
          this.vaultStoreService.setField(field, '');
     }

     // Reset validation state when component initializes or tab changes
     resetValidationState() {
          this.isVaultSelectorTouched.set(false);
          this.isHolderTouched.set(false);
          this.isAmountTouched.set(false);
          this.isFormDirty.set(false);
     }
}
