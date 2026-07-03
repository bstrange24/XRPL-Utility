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
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';

@Component({
     selector: 'app-lending-broker-cover-clawback',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './lending-broker-cover-clawback.component.html',
     styleUrl: './lending-broker-cover-clawback.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LendingBrokerCoverClawbackComponent {
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly loanBrokerUtilService = inject(LoanBrokerUtilService);
     public readonly loanBrokerViewModelService = inject(LoanBrokerViewModelService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly utilsService = inject(UtilsService);

     // Helper Items
     readonly brokerSelectorHelperItems = AppConstants.LOAN_BROKER_SELECTOR_HELPER_ITEMS || [];
     readonly clawbackAmountHelperItems = AppConstants.LOAN_BROKER_CLAWBACK_AMOUNT_HELPER_ITEMS || [];

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isBrokerSelectorTouched = signal(false);
     private isAmountTouched = signal(false);
     private isFormDirty = signal(false);

     // Outputs
     readonly canCoverClawbackChange = output<boolean>();

     // UI Signals
     showBrokerSelectorHelper = signal(false);
     showClawbackAmountHelper = signal(false);

     constructor() {
          effect(() => {
               this.canCoverClawbackChange.emit(this.canCoverClawback());
          });
     }

     // Form field accessors
     get clawbackAmount() {
          return this.loanBrokerStoreService.debtMaximum(); // Reuse debtMaximum as clawback amount
     }

     set clawbackAmount(value: string) {
          this.isAmountTouched.set(true);
          this.isFormDirty.set(true);
          this.loanBrokerStoreService.setField('debtMaximum', value);
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
               if (broker.VaultID !== undefined && broker.VaultID !== null) {
                    this.loanBrokerStoreService.setField('vaultId', broker.VaultID);
               }

               this.loanBrokerStoreService.setField('selectedBrokerId', item.id);
               // Reset amount when broker changes
               this.loanBrokerStoreService.setField('debtMaximum', '');
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

     public selectedBrokerCoverBalance(): string | null {
          const broker = this.getSelectedBroker();
          if (!broker) return null;
          return broker.CoverBalance?.toString() || '0';
     }

     public selectedBrokerDebtTotal(): string | null {
          const broker = this.getSelectedBroker();
          if (!broker) return null;
          return broker.DebtMaximum?.toString() || '0';
     }

     public selectedBrokerCoverMinimum(): string | null {
          const broker = this.getSelectedBroker();
          if (!broker) return null;
          const min = broker.CoverRateMinimum;
          if (min === null || min === undefined) return null;
          return `${min / 1000}%`;
     }

     public selectedBrokerMinimumCoverRequired(): string | null {
          const broker = this.getSelectedBroker();
          if (!broker) return null;

          const debtTotal = this.selectedBrokerDebtTotal();
          const coverMin = broker.CoverRateMinimum;
          if (!debtTotal || coverMin === null || coverMin === undefined) return null;

          const debtNum = parseFloat(debtTotal);
          if (isNaN(debtNum)) return null;

          // CoverRateMinimum is in 1/10th basis points (1000 = 10%)
          // So divide by 100000 to get the actual percentage
          const result = (debtNum * coverMin) / 100000;
          return result.toString();
     }

     // public selectedBrokerMinimumCoverRequired(): string | null {
     //      const broker = this.getSelectedBroker();
     //      if (!broker) return null;
     //      // Calculate: DebtTotal * CoverRateMinimum
     //      const debtTotal = this.selectedBrokerDebtTotal();
     //      const coverMin = broker.CoverRateMinimum;
     //      if (!debtTotal || coverMin === null || coverMin === undefined) return null;

     //      const debtNum = parseFloat(debtTotal);
     //      if (isNaN(debtNum)) return null;

     //      const result = (debtNum * coverMin) / 100000; // CoverRateMinimum is in 1/10th basis points
     //      return result.toString();
     // }

     // Amount validation
     isAmountValid(): boolean {
          const value = this.clawbackAmount;
          if (!value) return true; // Empty is valid (means max allowed)
          return !this.amountValidatorService.isAmountInvalid();
     }

     isAmountInvalid(): boolean {
          const value = this.clawbackAmount;
          if (!value) return false;
          return this.amountValidatorService.isAmountInvalid();
     }

     public parseFloat(value: any): number {
          return parseFloat(value);
     }

     // Check if amount exceeds maximum allowed
     isAmountExceedsMaximum(): boolean {
          const amount = this.clawbackAmount;
          if (!amount) return false;

          const maxAllowed = this.selectedBrokerMinimumCoverRequired();
          if (!maxAllowed) return false;

          const amountNum = parseFloat(amount);
          const maxNum = parseFloat(maxAllowed);

          if (isNaN(amountNum) || isNaN(maxNum)) return false;
          return amountNum > maxNum;
     }

     // Computed validation
     canCoverClawback = computed(() => {
          // Either LoanBrokerID or Amount must be provided
          const hasBrokerSelected = !!this.loanBrokerStoreService.selectedBrokerId();
          const hasAmount = !!this.clawbackAmount && this.clawbackAmount.trim().length > 0;

          if (!hasBrokerSelected && !hasAmount) return false;

          // If amount is provided, validate it
          if (hasAmount) {
               if (this.isAmountInvalid()) return false;

               const amountNum = parseFloat(this.clawbackAmount);
               if (isNaN(amountNum) || amountNum < 0) return false;

               // Check if amount exceeds maximum allowed
               if (this.isAmountExceedsMaximum()) return false;
          }

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          const hasBrokerSelected = !!this.loanBrokerStoreService.selectedBrokerId();
          const hasAmount = !!this.clawbackAmount && this.clawbackAmount.trim().length > 0;

          // Either LoanBrokerID or Amount required
          if (this.isFormDirty() || this.isBrokerSelectorTouched() || this.isAmountTouched()) {
               if (!hasBrokerSelected && !hasAmount) {
                    errors.push('Either select a Loan Broker or specify the amount to clawback.');
               }
          }

          // Amount validation
          if (this.isAmountTouched() && hasAmount) {
               if (this.isAmountInvalid()) {
                    errors.push('Invalid amount format.');
               } else {
                    const amountNum = parseFloat(this.clawbackAmount);
                    if (isNaN(amountNum) || amountNum < 0) {
                         errors.push('Amount must be greater than or equal to 0.');
                    }
                    if (this.isAmountExceedsMaximum()) {
                         const maxAllowed = this.selectedBrokerMinimumCoverRequired();
                         errors.push(`Amount cannot exceed the minimum cover required of ${maxAllowed}.`);
                    }
               }
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleBrokerSelectorHelper() {
          this.showBrokerSelectorHelper.set(!this.showBrokerSelectorHelper());
     }

     toggleAmountHelper() {
          this.showClawbackAmountHelper.set(!this.showClawbackAmountHelper());
     }

     // Reset validation state
     resetValidationState() {
          this.isBrokerSelectorTouched.set(false);
          this.isAmountTouched.set(false);
          this.isFormDirty.set(false);
     }
}
