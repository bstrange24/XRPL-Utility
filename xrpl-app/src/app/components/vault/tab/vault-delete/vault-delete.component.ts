// vault-delete.component.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { VaultStoreService } from '../../../../services/vault/vault-store/vault-store.service';
import { VaultViewModelService } from '../../../../services/vault/vault-view-model/vault-view-model.service';
import { VaultUtilService } from '../../../../services/vault/vault-util/vault-util.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-vault-delete',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, MatSlideToggleModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './vault-delete.component.html',
     styleUrl: './vault-delete.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultDeleteComponent {
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly vaultUtilService = inject(VaultUtilService);
     public readonly viewModel = inject(VaultViewModelService);
     private readonly walletManager = inject(WalletManagerService);

     // Helper Items for Vault
     readonly vaultSelectorHelperItems = AppConstants.VAULT_SELECTOR_HELPER_ITEMS;
     readonly vaultSequenceHelperItems = AppConstants.VAULT_SEQUENCE_HELPER_ITEMS;
     readonly vaultOwnerHelperItems = AppConstants.VAULT_OWNER_HELPER_ITEMS;
     readonly vaultAmountHelperItems = AppConstants.VAULT_AMOUNT_HELPER_ITEMS;
     readonly vaultWithdrawalPolicyHelperItems = AppConstants.VAULT_WITHDRAWAL_POLICY_HELPER_ITEMS;
     readonly vaultFlagsHelperItems = AppConstants.VAULT_FLAGS_HELPER_ITEMS;
     readonly vaultShareMPTIDHelperItems = AppConstants.VAULT_SHARED_MPT_ID_HELPER_ITEMS;
     readonly vaultDataHelperItems = AppConstants.VAULT_DATA_HELPER_ITEMS;

     // UI Signals
     showVaultSelectorHelper = signal(false);
     showVaultSequenceHelper = signal(false);
     showVaultOwnerHelper = signal(false);
     showVaultAmountHelper = signal(false);
     showVaultWithdrawalPolicyHelper = signal(false);
     showVaultFlagsHelper = signal(false);
     showVaultShareMPTIDHelper = signal(false);
     showVaultDataHelper = signal(false);
     canDeleteVaultChange = output<boolean>();

     constructor() {
          effect(() => {
               this.canDeleteVaultChange.emit(this.canDeleteVault());
          });
     }

     public get activeTab() {
          return this.viewModel.activeTab();
     }

     canDeleteVault = computed(() => {
          const hasSelection = !!this.vaultStoreService.selectedVaultId();
          return hasSelection;
     });

     public vaultItems() {
          const address = this.walletManager.getSelectedWallet()?.address || '';
          return this.vaultUtilService.vaultItems(this.vaultStoreService.existingVaults(), address);
     }

     public selectedVaultItem() {
          return this.vaultUtilService.selectedVaultItem(this.vaultItems(), this.vaultStoreService.selectedVaultId());
     }

     public getSelectedVault() {
          const selectedId = this.vaultStoreService.selectedVaultId();
          const vaults = this.vaultStoreService.existingVaults();

          if (!selectedId) return null;

          return vaults.find((v: any) => {
               // Use the vault ID (index) for matching
               return v.index === selectedId || v.id === selectedId;
          });
     }

     public selectedVaultAmount(): string {
          const vault = this.getSelectedVault();
          console.log('Selected vault for amount:', vault);

          if (!vault) return 'N/A';

          const asset = vault.Asset || vault.SendMax;
          const assetsMaximum = vault.AssetsMaximum;

          console.log('Asset:', asset);
          console.log('AssetsMaximum:', assetsMaximum);

          return this.vaultUtilService.formatVaultAmount(asset, assetsMaximum);
     }

     public selectedVaultAmountFull(): string {
          const vault = this.getSelectedVault();
          if (!vault) return 'N/A';

          const asset = vault.Asset || vault.SendMax;
          const assetsMaximum = vault.AssetsMaximum;

          const details = this.vaultUtilService.formatVaultAmountDetailed(asset, assetsMaximum);
          return details.fullDisplay;
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

     public selectedVaultAmoun23t(): string {
          const vault = this.getSelectedVault();
          if (!vault) return 'N/A';

          const sendMax = vault.Asset || vault.SendMax;
          return this.vaultUtilService.formatVaultAmount(sendMax);
     }

     public selectedVaultOwner(): string {
          const vault = this.getSelectedVault();
          return vault?.owner || vault?.Account || '';
     }

     public selectedVaultData(): string {
          const vault = this.getSelectedVault();
          if (!vault?.Data) return 'N/A';

          try {
               const decoded = this.vaultUtilService.decodeVaultData(vault.Data);
               return decoded || vault.Data;
          } catch {
               return vault.Data;
          }
     }

     public selectedVaultShareMPTID(): string {
          const vault = this.getSelectedVault();
          return vault?.ShareMPTID || 'N/A';
     }

     public selectedVaultWithdrawalPolicy(): number {
          const vault = this.getSelectedVault();
          return vault?.withdrawalPolicy ?? -1;
     }

     public selectedVaultFlags(): number {
          const vault = this.getSelectedVault();
          console.log('vault?.flags: ', vault?.flags);
          return vault?.flags ?? 0;
     }

     public getWithdrawalPolicyLabel(policy: number): string {
          switch (policy) {
               case 0:
                    return 'No Restrictions (0)';
               case 1:
                    return 'Owner Only (1)';
               case 2:
                    return 'Authorized Only (2)';
               default:
                    return `Unknown (${policy})`;
          }
     }

     public getFlag(flag: number): string {
          switch (flag) {
               case 65536:
                    return 'Private Vault (65536)';
               case 131072:
                    return 'Share NonTransferable (131072)';
               case 0:
                    return 'Default (0)';
               default:
                    return `Unknown (${flag})`;
          }
     }

     public onVaultSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.vaultStoreService.setField('selectedVaultId', null);
               this.vaultStoreService.setField('selectedVaultSequence', null);
               return;
          }

          // Find the vault by matching the ID
          const vault = this.vaultStoreService.existingVaults().find((v: any) => {
               const vaultId = v.index || v.id;
               return vaultId?.toString() === item.id;
          });

          if (vault) {
               // Store the vault ID (index) - this is the primary identifier
               const vaultId = vault.index || vault.id;
               console.log('Selected vault:', vault);
               console.log('Storing vault ID:', vaultId);

               this.vaultStoreService.setField('selectedVaultId', vaultId);
               this.vaultStoreService.setField('selectedVaultSequence', vault.VaultSequence || vault.Sequence);
          }
     }

     // Toggle Methods
     toggleVaultSelectorHelper() {
          this.showVaultSelectorHelper.set(!this.showVaultSelectorHelper());
     }

     toggleVaultSequenceHelper() {
          this.showVaultSequenceHelper.set(!this.showVaultSequenceHelper());
     }

     toggleVaultOwnerHelper() {
          this.showVaultOwnerHelper.set(!this.showVaultOwnerHelper());
     }

     toggleVaultAmountHelper() {
          this.showVaultAmountHelper.set(!this.showVaultAmountHelper());
     }

     toggleVaultWithdrawalPolicyHelper() {
          this.showVaultWithdrawalPolicyHelper.set(!this.showVaultWithdrawalPolicyHelper());
     }

     toggleVaultFlagsHelper() {
          this.showVaultFlagsHelper.set(!this.showVaultFlagsHelper());
     }

     toggleVaultShareMPTIDHelper() {
          this.showVaultShareMPTIDHelper.set(!this.showVaultShareMPTIDHelper());
     }

     toggleVaultDataHelper() {
          this.showVaultDataHelper.set(!this.showVaultDataHelper());
     }
}
