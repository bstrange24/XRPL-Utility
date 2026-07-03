import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, ViewChild } from '@angular/core';
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
import { MptValidatorService } from '../../../../services/shared/validators/mpt/mpt-validator/mpt-validator.service';
import { TagValidatorService } from '../../../../services/shared/validators/tag-validator/tag-validator.service';
import { TransactionDropdownService } from '../../../../services/transaction-dropdown/transaction-dropdown.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { AppConstants } from '../../../../core/app.constants';
import { UriValidatorService } from '../../../../services/shared/validators/uri-validator/uri-validator.service';
import { VaultStoreService } from '../../../../services/vault/vault-store/vault-store.service';
import { JsonEditorComponent } from '../../../shared/json-editor/json-editor.component';
import { VaultViewModelService } from '../../../../services/vault/vault-view-model/vault-view-model.service';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { DomainIdValidatorService } from '../../../../services/shared/validators/domain-id-validator/domain-id-validator.service';
import { VaultUtilService } from '../../../../services/vault/vault-util/vault-util.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';

@Component({
     selector: 'app-vault-set',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './vault-set.component.html',
     styleUrl: './vault-set.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultSetComponent {
     @ViewChild('jsonEditor') jsonEditor!: JsonEditorComponent;

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
     public readonly tagValidatorService = inject(TagValidatorService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly escrowValidatorService = inject(EscrowValidatorService);
     public readonly mptValidatorService = inject(MptValidatorService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly uriValidatorService = inject(UriValidatorService);
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly mptValidator = inject(MptValidatorService);
     public readonly vaultViewModelService = inject(VaultViewModelService);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly domainIdValidatorService = inject(DomainIdValidatorService);
     public readonly vaultUtilService = inject(VaultUtilService);
     public readonly walletManagerService = inject(WalletManagerService);

     // Helper Items
     readonly vaultSelectorHelperItems = AppConstants.VAULT_SELECTOR_HELPER_ITEMS;
     readonly vaultSequenceHelperItems = AppConstants.VAULT_SEQUENCE_HELPER_ITEMS;
     readonly vaultOwnerHelperItems = AppConstants.VAULT_OWNER_HELPER_ITEMS;
     readonly vaultAmountHelperItems = AppConstants.VAULT_AMOUNT_HELPER_ITEMS;
     readonly vaultWithdrawalPolicyHelperItems = AppConstants.VAULT_WITHDRAWAL_POLICY_HELPER_ITEMS;
     readonly vaultFlagsHelperItems = AppConstants.VAULT_FLAGS_HELPER_ITEMS;
     readonly vaultShareMPTIDHelperItems = AppConstants.VAULT_SHARED_MPT_ID_HELPER_ITEMS;
     readonly vaultDataHelperItems = AppConstants.VAULT_DATA_HELPER_ITEMS;
     readonly uriHelperItems = AppConstants.URI_HELPER_ITEMS;
     readonly assetsMaximumHelperItems = AppConstants.ASSETS_MAXIMUM_HELPER_ITEMS;
     readonly domainIdHelperItems = AppConstants.DOMAIN_ID_HELPER_ITEMS;

     // UI Signals
     showVaultSelectorHelper = signal(false);
     showVaultSequenceHelper = signal(false);
     showVaultOwnerHelper = signal(false);
     showVaultAmountHelper = signal(false);
     showVaultWithdrawalPolicyHelper = signal(false);
     showVaultFlagsHelper = signal(false);
     showVaultShareMPTIDHelper = signal(false);
     showVaultDataHelper = signal(false);
     showUriHelper = signal(false);
     showAssetsMaximumHelper = signal(false);
     showDomainIdHelper = signal(false);
     isFocused = signal(false);
     isFocusedAssetScale = signal(false);
     private isVaultSelectorTouched = signal(false);
     private isFormDirty = signal(false);

     // Outputs
     canModifyVaultChange = output<boolean>();
     performAction = output<void>();
     clearFields = output<void>();

     constructor() {
          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canModifyVaultChange.emit(this.canModifyVault());
          });
     }

     public get activeTab() {
          return this.vaultViewModelService.activeTab();
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
          const vaults = this.vaultStoreService.existingVaults();

          if (!selectedId) return null;

          return vaults.find((v: any) => {
               const vaultId = v.index || v.id;
               return vaultId === selectedId;
          });
     }

     public onVaultSelected(item: SelectItem | null) {
          this.isVaultSelectorTouched.set(true);
          this.isFormDirty.set(true);

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
               this.vaultStoreService.setField('selectedVaultId', vaultId);
               this.vaultStoreService.setField('selectedVaultSequence', vault.VaultSequence || vault.Sequence);

               // Pre-populate fields with existing values
               if (vault.data) {
                    try {
                         const decoded = this.vaultUtilService.decodeVaultData(vault.data);
                         this.vaultStoreService.setField('vaultMetaData', decoded);
                    } catch {
                         this.vaultStoreService.setField('vaultMetaData', vault.data);
                    }
               }

               // Store the current assets maximum for reference
               if (vault.AssetsMaximum) {
                    this.vaultStoreService.setField('currentAssetsMaximum', vault.AssetsMaximum);
               }
          }
     }

     onFieldChange(field: string) {
          this.isFormDirty.set(true);
     }

     // Getters for selected vault details
     public selectedVaultOwner(): string {
          const vault = this.getSelectedVault();
          return vault?.owner || vault?.Account || '';
     }

     public selectedVaultAmount(): string {
          const vault = this.getSelectedVault();
          if (!vault) return 'N/A';
          const asset = vault.Asset || vault.SendMax;
          return this.vaultUtilService.formatVaultAmount(asset, vault.AssetsMaximum);
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

     public getCurrentAssetsTotal(): string {
          const vault = this.getSelectedVault();
          if (!vault) return '0';
          return vault.AssetsTotal || '0';
     }

     // Form field accessors
     get vaultMetaData() {
          return this.vaultStoreService.vaultMetaData();
     }

     set vaultMetaData(value: string) {
          this.vaultStoreService.setField('vaultMetaData', value);
     }

     get assetsMaximum() {
          return this.vaultStoreService.assetsMaximum();
     }

     set assetsMaximum(value: string) {
          this.vaultStoreService.setField('assetsMaximum', value);
     }

     get domainId() {
          return this.vaultStoreService.domainId();
     }

     set domainId(value: string) {
          this.vaultStoreService.setField('domainId', value);
     }

     // Validation
     canModifyVault = computed(() => {
          const hasVaultSelected = !!this.vaultStoreService.selectedVaultId();
          if (!hasVaultSelected) return false;

          // At least one field should be modified
          if (this.isFormDirty()) {
               const hasMetaData = !!this.vaultStoreService.vaultMetaData()?.trim();
               const hasAssetsMaximum = !!this.vaultStoreService.assetsMaximum()?.trim();
               const hasDomainId = !!this.vaultStoreService.domainId()?.trim();

               if (!hasMetaData && !hasAssetsMaximum && !hasDomainId) {
                    return false;
               }

               // Validate assets maximum if provided
               if (hasAssetsMaximum) {
                    const amount = this.vaultStoreService.assetsMaximum();
                    if (this.amountValidatorService.isEscrowAmountInvalid()) {
                         return false;
                    }
                    // Check if the new maximum is valid (not less than current total unless 0)
                    const currentTotal = this.getCurrentAssetsTotal();
                    const newMax = parseFloat(amount);
                    const currentTotalNum = parseFloat(currentTotal);
                    if (!isNaN(newMax) && !isNaN(currentTotalNum) && newMax < currentTotalNum && newMax !== 0) {
                         return false;
                    }
               }

               // Validate domain ID if provided
               if (hasDomainId) {
                    if (this.domainIdValidatorService.hasInvalidDomainId()) {
                         return false;
                    }
               }

               // Validate metadata if provided
               if (hasMetaData) {
                    if (this.uriValidatorService.hasNftCreateInvalidUri()) {
                         return false;
                    }
               }
          }

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          if (this.isVaultSelectorTouched() && !this.vaultStoreService.selectedVaultId()) {
               errors.push('Please select a vault to modify.');
          }

          if (this.isFormDirty()) {
               const hasMetaData = !!this.vaultStoreService.vaultMetaData()?.trim();
               const hasAssetsMaximum = !!this.vaultStoreService.assetsMaximum()?.trim();
               const hasDomainId = !!this.vaultStoreService.domainId()?.trim();

               if (!hasMetaData && !hasAssetsMaximum && !hasDomainId) {
                    errors.push('At least one field must be modified.');
               }

               if (hasMetaData && this.uriValidatorService.hasNftCreateInvalidUri()) {
                    errors.push('Invalid URI format for metadata.');
               }

               if (hasAssetsMaximum) {
                    const amount = this.vaultStoreService.assetsMaximum();
                    if (this.amountValidatorService.isEscrowAmountInvalid()) {
                         errors.push('Invalid amount format for maximum assets.');
                    }
                    const currentTotal = this.getCurrentAssetsTotal();
                    const newMax = parseFloat(amount);
                    const currentTotalNum = parseFloat(currentTotal);
                    if (!isNaN(newMax) && !isNaN(currentTotalNum) && newMax < currentTotalNum && newMax !== 0) {
                         errors.push('Maximum asset amount cannot be less than current total unless set to 0.');
                    }
               }

               if (hasDomainId && this.domainIdValidatorService.hasInvalidDomainId()) {
                    errors.push('Invalid Domain ID format. Must be a valid hex string.');
               }
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
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

     toggleUriHelper() {
          this.showUriHelper.update(v => !v);
     }

     toggleAssetsMaximumHelper() {
          this.showAssetsMaximumHelper.set(!this.showAssetsMaximumHelper());
     }

     toggleDomainIdHelper() {
          this.showDomainIdHelper.set(!this.showDomainIdHelper());
     }

     clearField(field: 'vaultMetaData' | 'assetsMaximum' | 'domainId') {
          this.vaultStoreService.setField(field, '');
     }
}
