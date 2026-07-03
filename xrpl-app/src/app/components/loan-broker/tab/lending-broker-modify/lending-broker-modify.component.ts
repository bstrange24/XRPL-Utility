import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { AppConstants } from '../../../../core/app.constants';
import { LoanBrokerStoreService } from '../../../../services/loan-broker/loan-broker-store/loan-broker-store.service';
import { LoanBrokerUtilService } from '../../../../services/loan-broker/loan-broker-util/loan-broker-util.service';
import { LoanBrokerViewModelService } from '../../../../services/loan-broker/loan-broker-view-model/loan-broker-view-model.service';

@Component({
     selector: 'app-lending-broker-modify',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './lending-broker-modify.component.html',
     styleUrl: './lending-broker-modify.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LendingBrokerModifyComponent {
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly loanBrokerUtilService = inject(LoanBrokerUtilService);
     public readonly loanBrokerViewModelService = inject(LoanBrokerViewModelService);

     // Helper Items
     readonly brokerSelectorHelperItems = AppConstants.LOAN_BROKER_SELECTOR_HELPER_ITEMS || [];
     readonly dataHelperItems = AppConstants.LOAN_BROKER_DATA_HELPER_ITEMS || [];

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isBrokerSelectorTouched = signal(false);
     private isDataTouched = signal(false);
     private isFeeTouched = signal(false);
     private isDebtTouched = signal(false);
     private isCoverRateTouched = signal(false);
     private isFormDirty = signal(false);

     // Outputs
     readonly canModifyBrokerChange = output<boolean>();

     // UI Signals
     showBrokerSelectorHelper = signal(false);
     showDataHelper = signal(false);

     constructor() {
          effect(() => {
               this.canModifyBrokerChange.emit(this.canModifyBroker());
          });
     }

     // Form field accessors
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

     // Broker Selection
     public brokerItems() {
          const address = this.loanBrokerViewModelService.currentWalletData()?.address || '';
          const brokers = this.loanBrokerStoreService.existingBrokers();
          const activeTab = this.loanBrokerViewModelService.activeTab();
          return this.loanBrokerUtilService.brokerItems(brokers, activeTab, address);
     }
     // public brokerItems() {
     //      const address = this.loanBrokerViewModelService.currentWalletData()?.address || '';
     //      const brokers = this.loanBrokerStoreService.existingBrokers();
     //      return this.loanBrokerUtilService.brokerItems(brokers);
     // }

     public selectedBrokerItem() {
          return this.loanBrokerUtilService.selectedBrokerItem(this.brokerItems(), this.loanBrokerStoreService.selectedBrokerId());
     }

     public getSelectedBroker() {
          const selectedId = this.loanBrokerStoreService.selectedBrokerId();
          if (!selectedId) return null;

          const brokers = this.loanBrokerStoreService.existingBrokers();
          return this.loanBrokerUtilService.getBrokerById(brokers, selectedId);
     }

     public onBrokerSelected(item: SelectItem | null) {
          this.isBrokerSelectorTouched.set(true);
          this.isFormDirty.set(true);

          if (!item?.id) {
               this.loanBrokerStoreService.setField('selectedBrokerId', null);
               return;
          }

          const brokers = this.loanBrokerStoreService.existingBrokers();
          const broker = this.loanBrokerUtilService.getBrokerById(brokers, item.id);

          if (broker) {
               this.loanBrokerStoreService.setField('selectedBrokerId', item.id);

               // Pre-populate fields
               if (broker.VaultID !== undefined && broker.VaultID !== null) {
                    this.loanBrokerStoreService.setField('vaultId', broker.VaultID);
               }

               if (broker.Data) {
                    this.loanBrokerStoreService.setField('data', broker.Data);
               }
               if (broker.ManagementFeeRate !== undefined && broker.ManagementFeeRate !== null) {
                    this.loanBrokerStoreService.setField('managementFeeRate', broker.ManagementFeeRate);
               }
               if (broker.DebtMaximum) {
                    this.loanBrokerStoreService.setField('debtMaximum', broker.DebtMaximum);
               }
               if (broker.CoverRateMinimum !== undefined && broker.CoverRateMinimum !== null) {
                    this.loanBrokerStoreService.setField('coverRateMinimum', broker.CoverRateMinimum);
               }
               if (broker.CoverRateLiquidation !== undefined && broker.CoverRateLiquidation !== null) {
                    this.loanBrokerStoreService.setField('coverRateLiquidation', broker.CoverRateLiquidation);
               }
          }
     }

     // Selected broker getters
     public selectedBrokerVaultId(): string {
          const broker = this.getSelectedBroker();
          return broker?.VaultID || '';
     }

     public selectedBrokerLoanBrokerId(): string {
          const broker = this.getSelectedBroker();
          return broker?.LoanBrokerID || '';
     }

     public selectedBrokerOwner(): string {
          const broker = this.getSelectedBroker();
          return broker?.owner || broker?.Account || '';
     }

     public selectedBrokerManagementFee(): number | null {
          const broker = this.getSelectedBroker();
          return broker?.ManagementFeeRate ?? null;
     }

     public selectedBrokerDebtMaximum(): string {
          const broker = this.getSelectedBroker();
          return broker?.DebtMaximum || '';
     }

     public selectedBrokerCoverRateMinimum(): number | null {
          const broker = this.getSelectedBroker();
          return broker?.CoverRateMinimum ?? null;
     }

     public selectedBrokerCoverRateLiquidation(): number | null {
          const broker = this.getSelectedBroker();
          return broker?.CoverRateLiquidation ?? null;
     }

     // Validation methods
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
          return !this.isCoverRateValid();
     }

     public selectedBrokerManagementFeeDisplay = computed(() => {
          const fee = this.selectedBrokerManagementFee();
          if (fee === null || fee === undefined) return null;
          return fee / 1000;
     });

     public selectedBrokerCoverRateMinimumDisplay = computed(() => {
          const rate = this.selectedBrokerCoverRateMinimum();
          if (rate === null || rate === undefined) return null;
          return rate / 1000;
     });

     public selectedBrokerCoverRateLiquidationDisplay = computed(() => {
          const rate = this.selectedBrokerCoverRateLiquidation();
          if (rate === null || rate === undefined) return null;
          return rate / 1000;
     });

     // Check if any field has been modified
     hasChanges(): boolean {
          return !!this.data?.trim() || this.managementFeeRate !== null || !!this.debtMaximum?.trim() || this.coverRateMinimum !== null || this.coverRateLiquidation !== null;
     }

     // Computed validation
     canModifyBroker = computed(() => {
          const hasBrokerSelected = !!this.loanBrokerStoreService.selectedBrokerId();
          if (!hasBrokerSelected) return false;

          // At least one field must be modified
          if (!this.hasChanges()) return false;

          // Data validation
          if (this.data && !this.isDataValid()) return false;

          // Management Fee validation
          if (!this.isManagementFeeValid()) return false;

          // Debt Maximum validation
          if (!this.isDebtMaximumValid()) return false;

          // Cover Rate pair validation
          if (!this.isCoverRateValid()) return false;

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Broker selection
          if (this.isBrokerSelectorTouched() && !this.loanBrokerStoreService.selectedBrokerId()) {
               errors.push('Please select a Loan Broker to modify.');
          }

          if (this.isFormDirty() && this.loanBrokerStoreService.selectedBrokerId()) {
               // At least one modification
               if (!this.hasChanges()) {
                    errors.push('At least one field must be modified.');
               }

               // Data validation
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
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleBrokerSelectorHelper() {
          this.showBrokerSelectorHelper.set(!this.showBrokerSelectorHelper());
     }

     toggleDataHelper() {
          this.showDataHelper.set(!this.showDataHelper());
     }

     // Reset validation state
     resetValidationState() {
          this.isBrokerSelectorTouched.set(false);
          this.isDataTouched.set(false);
          this.isFeeTouched.set(false);
          this.isDebtTouched.set(false);
          this.isCoverRateTouched.set(false);
          this.isFormDirty.set(false);
     }
}
