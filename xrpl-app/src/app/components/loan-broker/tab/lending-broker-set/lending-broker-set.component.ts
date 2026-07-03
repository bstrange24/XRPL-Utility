import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { AppConstants } from '../../../../core/app.constants';
import { LoanBrokerStoreService } from '../../../../services/loan-broker/loan-broker-store/loan-broker-store.service';
import { LoanBrokerUtilService } from '../../../../services/loan-broker/loan-broker-util/loan-broker-util.service';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { VaultStoreService } from '../../../../services/vault/vault-store/vault-store.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { ToastService } from '../../../../services/utils/toast/toast.service';
import { VaultUtilService } from '../../../../services/vault/vault-util/vault-util.service';

@Component({
     selector: 'app-lending-broker-set',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, ValidationErrorsComponent, InputIconsComponent, SelectSearchDropdownComponent],
     templateUrl: './lending-broker-set.component.html',
     styleUrl: './lending-broker-set.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LendingBrokerSetComponent {
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly loanBrokerUtilService = inject(LoanBrokerUtilService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly utilsService = inject(UtilsService);
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly vaultUtilService = inject(VaultUtilService);

     public readonly walletManagerService = inject(WalletManagerService);
     public readonly toastService = inject(ToastService);

     // Helper Items
     readonly vaultIdHelperItems = AppConstants.LOAN_BROKER_VAULT_ID_HELPER_ITEMS || [];
     readonly brokerIdHelperItems = AppConstants.LOAN_BROKER_ID_HELPER_ITEMS || [];
     readonly dataHelperItems = AppConstants.LOAN_BROKER_DATA_HELPER_ITEMS || [];

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isVaultIdTouched = signal(false);
     private isBrokerIdTouched = signal(false);
     private isDataTouched = signal(false);
     private isFeeTouched = signal(false);
     private isDebtTouched = signal(false);
     private isCoverRateTouched = signal(false);
     private isFormDirty = signal(false);

     // Outputs
     readonly canCreateBrokerChange = output<boolean>();

     // UI Signals
     showVaultIdHelper = signal(false);
     showBrokerIdHelper = signal(false);
     showDataHelper = signal(false);

     constructor() {
          effect(() => {
               this.canCreateBrokerChange.emit(this.canCreateBroker());
          });
     }

     // Form field accessors
     get vaultId() {
          return this.loanBrokerStoreService.vaultId();
     }

     set vaultId(value: string) {
          this.isVaultIdTouched.set(true);
          this.isFormDirty.set(true);
          this.loanBrokerStoreService.setField('vaultId', value);
     }

     get loanBrokerId() {
          return this.loanBrokerStoreService.loanBrokerId();
     }

     set loanBrokerId(value: string) {
          this.isBrokerIdTouched.set(true);
          this.isFormDirty.set(true);
          this.loanBrokerStoreService.setField('loanBrokerId', value);
     }

     get data() {
          return this.loanBrokerStoreService.data();
     }

     set data(value: string) {
          this.isDataTouched.set(true);
          this.isFormDirty.set(true);
          this.loanBrokerStoreService.setField('data', value);
     }

     get managementFeeRate() {
          return this.loanBrokerStoreService.managementFeeRate();
     }

     set managementFeeRate(value: number | null) {
          this.isFeeTouched.set(true);
          this.isFormDirty.set(true);
          this.loanBrokerStoreService.setField('managementFeeRate', value);
     }

     get debtMaximum() {
          return this.loanBrokerStoreService.debtMaximum();
     }

     set debtMaximum(value: string) {
          this.isDebtTouched.set(true);
          this.isFormDirty.set(true);
          this.loanBrokerStoreService.setField('debtMaximum', value);
     }

     get coverRateMinimum() {
          return this.loanBrokerStoreService.coverRateMinimum();
     }

     set coverRateMinimum(value: number | null) {
          this.isCoverRateTouched.set(true);
          this.isFormDirty.set(true);
          this.loanBrokerStoreService.setField('coverRateMinimum', value);
     }

     get coverRateLiquidation() {
          return this.loanBrokerStoreService.coverRateLiquidation();
     }

     set coverRateLiquidation(value: number | null) {
          this.isCoverRateTouched.set(true);
          this.isFormDirty.set(true);
          this.loanBrokerStoreService.setField('coverRateLiquidation', value);
     }

     public selectedVaultItem() {
          return this.vaultUtilService.selectedVaultItem(this.vaultItems(), this.vaultStoreService.selectedVaultId());
     }

     public onVaultSelected(item: SelectItem | null) {
          if (!item) {
               this.vaultStoreService.setField('selectedVaultId', null);
               return;
          }

          const vault = this.vaultStoreService.existingVaults().find(v => v.index === item.id);
          if (vault) {
               const currentAddress = this.walletManagerService.getSelectedWallet()?.address;
               const vaultOwner = vault.owner || vault.Account;

               if (vaultOwner !== currentAddress) {
                    this.toastService.error('You cannot create a Loan Broker for a Vault you do not own. Only the Vault owner can create a Loan Broker.', AppConstants.TOAST.ERROR);
                    this.vaultStoreService.setField('selectedVaultId', null);
                    return;
               }

               this.loanBrokerStoreService.setField('vaultId', vault.index);
               this.vaultStoreService.setField('selectedVaultId', vault.index);
               this.vaultStoreService.setField('selectedVaultSequence', vault.VaultSequence || vault.Sequence);
          }
     }

     // public onVaultSelected(item: SelectItem | null) {
     //      if (!item) {
     //           this.vaultStoreService.setField('selectedVaultId', null);
     //           return;
     //      }

     //      const vault = this.vaultStoreService.existingVaults().find(v => v.index === item.id);
     //      if (vault) {
     //           // Check if the current wallet owns this vault
     //           const currentAddress = this.walletManagerService.getSelectedWallet()?.address;
     //           const vaultOwner = vault.owner || vault.Account;

     //           if (vaultOwner !== currentAddress) {
     //                this.toastService.error('You cannot create a Loan Broker for a Vault you do not own. Only the Vault owner can create a Loan Broker.', AppConstants.TOAST.ERROR);
     //                // Clear the selection
     //                this.vaultStoreService.setField('selectedVaultId', null);
     //                return;
     //           }

     //           // Proceed with selection
     //           this.loanBrokerStoreService.setField('vaultId', vault.index);
     //           this.vaultStoreService.setField('selectedVaultId', vault.index);
     //           this.vaultStoreService.setField('selectedVaultSequence', vault.VaultSequence || vault.Sequence);
     //      }
     // }

     public vaultItems() {
          const currentAddress = this.walletManagerService.getSelectedWallet()?.address;
          const allVaults = this.vaultStoreService.existingVaults();

          // Only show vaults owned by the current wallet
          const ownedVaults = allVaults.filter(vault => {
               const owner = vault.owner || vault.Account;
               return owner === currentAddress;
          });

          return this.vaultUtilService.vaultItems(ownedVaults, currentAddress || '');
     }

     async validateVaultOwnership(vaultId: string): Promise<boolean> {
          const currentAddress = this.walletManagerService.getSelectedWallet()?.address;
          const vault = this.vaultStoreService.existingVaults().find(v => v.id === vaultId);

          if (!vault) {
               this.toastService.error('Selected vault not found', AppConstants.TOAST.ERROR);
               return false;
          }

          const vaultOwner = vault.owner || vault.Account;
          if (vaultOwner !== currentAddress) {
               this.toastService.error('Only the Vault owner can create a Loan Broker for this Vault.', AppConstants.TOAST.ERROR);
               return false;
          }

          return true;
     }

     // In lending-broker-set.component.ts
     public coverRateMinDisplay = computed(() => {
          const val = this.coverRateMinimum;
          return val !== null ? val / 1000 : 0;
     });

     public coverRateLiquidDisplay = computed(() => {
          const val = this.coverRateLiquidation;
          return val !== null ? val / 1000 : 0;
     });

     // Validation methods
     isVaultIdValid(): boolean {
          const value = this.vaultId;
          if (!value) return false;
          return this.loanBrokerUtilService.validateVaultId(value);
     }

     isVaultIdInvalid(): boolean {
          const value = this.vaultId;
          if (!value) return false;
          return !this.isVaultIdValid();
     }

     isBrokerIdValid(): boolean {
          const value = this.loanBrokerId;
          if (!value) return true; // Optional
          return this.loanBrokerUtilService.validateBrokerId(value);
     }

     isBrokerIdInvalid(): boolean {
          const value = this.loanBrokerId;
          if (!value) return false;
          return !this.isBrokerIdValid();
     }

     isDataValid(): boolean {
          const value = this.data;
          if (!value) return true;
          return this.loanBrokerUtilService.validateData(value);
     }

     isDataInvalid(): boolean {
          const value = this.data;
          if (!value) return false;
          return !this.isDataValid();
     }

     isManagementFeeValid(): boolean {
          const value = this.managementFeeRate;
          if (value === null || value === undefined) return true;
          return this.loanBrokerUtilService.validateManagementFeeRate(value);
     }

     isDebtMaximumValid(): boolean {
          const value = this.debtMaximum;
          if (!value) return true;
          return this.loanBrokerUtilService.validateDebtMaximum(value);
     }

     isDebtMaximumInvalid(): boolean {
          const value = this.debtMaximum;
          if (!value) return false;
          return !this.isDebtMaximumValid();
     }

     isCoverRateValid(): boolean {
          const min = this.coverRateMinimum;
          const liquid = this.coverRateLiquidation;
          if (min === null && liquid === null) return true;
          return this.loanBrokerUtilService.validateCoverRatePair(min, liquid);
     }

     isCoverRatePairInvalid(): boolean {
          const min = this.coverRateMinimum;
          const liquid = this.coverRateLiquidation;
          if (min === null && liquid === null) return false;
          return !this.loanBrokerUtilService.validateCoverRatePair(min, liquid);
     }

     // Computed validation
     canCreateBroker = computed(() => {
          // Required: Vault ID
          if (!this.vaultId || !this.isVaultIdValid()) return false;

          // Optional: Loan Broker ID validation
          if (this.loanBrokerId && !this.isBrokerIdValid()) return false;

          // Optional: Data validation
          if (this.data && !this.isDataValid()) return false;

          // Optional: Management Fee validation
          if (!this.isManagementFeeValid()) return false;

          // Optional: Debt Maximum validation
          if (!this.isDebtMaximumValid()) return false;

          // Optional: Cover Rate pair validation
          if (!this.isCoverRateValid()) return false;

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Vault ID
          if (this.isVaultIdTouched()) {
               if (!this.vaultId) {
                    errors.push('Vault ID is required.');
               } else if (!this.isVaultIdValid()) {
                    errors.push('Vault ID must be a 64-character hex string.');
               }
          }

          // Loan Broker ID (optional)
          if (this.isBrokerIdTouched() && this.loanBrokerId && !this.isBrokerIdValid()) {
               errors.push('Loan Broker ID must be a 64-character hex string.');
          }

          // Data
          if (this.isDataTouched() && this.data && !this.isDataValid()) {
               errors.push('Data exceeds 512 bytes limit.');
          }

          // Management Fee
          if (this.isFeeTouched() && !this.isManagementFeeValid()) {
               errors.push('Management Fee Rate must be between 0 and 10000.');
          }

          // Debt Maximum
          if (this.isDebtTouched() && !this.isDebtMaximumValid()) {
               errors.push('Debt Maximum must be a non-negative value.');
          }

          // Cover Rates
          if (this.isCoverRateTouched() && !this.isCoverRateValid()) {
               errors.push('Cover Rate Minimum and Cover Rate Liquidation must both be zero or both be non-zero.');
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleVaultIdHelper() {
          this.showVaultIdHelper.set(!this.showVaultIdHelper());
     }

     toggleBrokerIdHelper() {
          this.showBrokerIdHelper.set(!this.showBrokerIdHelper());
     }

     toggleDataHelper() {
          this.showDataHelper.set(!this.showDataHelper());
     }

     // Reset validation state
     resetValidationState() {
          this.isVaultIdTouched.set(false);
          this.isBrokerIdTouched.set(false);
          this.isDataTouched.set(false);
          this.isFeeTouched.set(false);
          this.isDebtTouched.set(false);
          this.isCoverRateTouched.set(false);
          this.isFormDirty.set(false);
     }
}
