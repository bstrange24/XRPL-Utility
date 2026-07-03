import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AppConstants } from '../../../../core/app.constants';
import { LoanStoreService } from '../../../../services/loan/loan-store/loan-store.service';
import { LoanUtilService } from '../../../../services/loan/loan-util/loan-util.service';
import { LoanViewModelService } from '../../../../services/loan/loan-view-model/loan-view-model.service';
import { LOAN_MANAGE_FLAGS_CONFIG } from '../../constants/loan.constants';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';

@Component({
     selector: 'app-loan-manage',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './loan-manage.component.html',
     styleUrl: './loan-manage.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanManageComponent {
     public readonly loanStoreService = inject(LoanStoreService);
     public readonly loanUtilService = inject(LoanUtilService);
     public readonly loanViewModelService = inject(LoanViewModelService);

     readonly loanManageFlagsConfig = LOAN_MANAGE_FLAGS_CONFIG;

     // Helper Items
     readonly loanSelectorHelperItems = AppConstants.LOAN_SELECTOR_HELPER_ITEMS || [];
     readonly dataHelperItems = AppConstants.LOAN_DATA_HELPER_ITEMS || [];

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isLoanSelectorTouched = signal(false);
     private isDataTouched = signal(false);
     private isFlagTouched = signal(false);
     private isFormDirty = signal(false);

     // Outputs
     readonly canModifyLoanChange = output<boolean>();

     // UI Signals
     showLoanSelectorHelper = signal(false);
     showDataHelper = signal(false);

     constructor() {
          effect(() => {
               this.canModifyLoanChange.emit(this.canModifyLoan());
          });
     }

     // Form field accessors
     get data() {
          return this.loanStoreService.data();
     }

     set data(value: string) {
          this.isDataTouched.set(true);
          this.isFormDirty.set(true);
          this.loanStoreService.setField('data', value);
     }

     // Loan Selection
     public loanItems() {
          const address = this.loanViewModelService.currentWalletData()?.address || '';
          const loans = this.loanStoreService.existingLoans();
          return this.loanUtilService.loanItems(loans);
     }

     public selectedLoanItem() {
          return this.loanUtilService.selectedLoanItem(this.loanItems(), this.loanStoreService.selectedLoanId());
     }

     public getSelectedLoan() {
          const selectedId = this.loanStoreService.selectedLoanId();
          if (!selectedId) return null;

          const loans = this.loanStoreService.existingLoans();
          return this.loanUtilService.getLoanById(loans, selectedId);
     }

     public onLoanSelected(item: SelectItem | null) {
          this.isLoanSelectorTouched.set(true);
          this.isFormDirty.set(true);

          if (!item?.id) {
               this.loanStoreService.setField('selectedLoanId', null);
               return;
          }

          const loans = this.loanStoreService.existingLoans();
          const loan = this.loanUtilService.getLoanById(loans, item.id);

          if (loan) {
               this.loanStoreService.setField('selectedLoanId', item.id);

               // Pre-populate data field if it exists
               if (loan.Data) {
                    this.loanStoreService.setField('data', loan.Data);
               }
          }
     }

     // Selected loan getters
     public selectedLoanBrokerId(): string {
          const loan = this.getSelectedLoan();
          return loan?.LoanBrokerID || '';
     }

     public selectedLoanPrincipalRequested(): string {
          const loan = this.getSelectedLoan();
          return loan?.PrincipalRequested || '0';
     }

     public selectedLoanPrincipalOutstanding(): string {
          const loan = this.getSelectedLoan();
          return loan?.PrincipalOutstanding || '0';
     }

     public selectedLoanOwner(): string {
          const loan = this.getSelectedLoan();
          return loan?.Borrower || loan?.Account || '';
     }

     public selectedLoanCounterparty(): string {
          const loan = this.getSelectedLoan();
          return loan?.Counterparty || '';
     }

     public selectedLoanInterestRate(): number {
          const loan = this.getSelectedLoan();
          return loan?.InterestRate ?? -1;
     }

     public selectedLoanStatus(): string {
          const loan = this.getSelectedLoan();
          if (!loan) return 'unknown';
          if (loan.status) return loan.status;
          if (loan.isDefaulted) return 'defaulted';
          if (loan.isImpaired) return 'impaired';
          return 'active';
     }

     // Flag selection (radio group - only one can be selected)
     selectFlag(key: 'tfLoanDefault' | 'tfLoanImpair' | 'tfLoanUnimpair'): void {
          this.isFlagTouched.set(true);
          this.isFormDirty.set(true);

          // Reset all flags
          this.loanStoreService.setField('tfLoanDefault', false);
          this.loanStoreService.setField('tfLoanImpair', false);
          this.loanStoreService.setField('tfLoanUnimpair', false);

          // Set the selected flag
          this.loanStoreService.setField(key, true);
     }

     // Data validation
     isDataValid(): boolean {
          const value = this.data;
          if (!value) return true;
          return this.loanUtilService.validateData(value);
     }

     isDataInvalid(): boolean {
          const value = this.data;
          if (!value) return false;
          return !this.isDataValid();
     }

     // Check if any flag is selected
     hasFlagSelected(): boolean {
          return this.loanStoreService.tfLoanDefault() || this.loanStoreService.tfLoanImpair() || this.loanStoreService.tfLoanUnimpair();
     }

     // Computed validation
     canModifyLoan = computed(() => {
          const hasLoanSelected = !!this.loanStoreService.selectedLoanId();
          if (!hasLoanSelected) return false;

          // Check if at least one modification is made
          const hasDataChange = !!this.loanStoreService.data()?.trim();
          const hasFlagSelected = this.hasFlagSelected();

          // At least one field must be modified OR a flag must be selected
          if (!hasDataChange && !hasFlagSelected) {
               return false;
          }

          // Validate data if provided
          if (hasDataChange && this.isDataInvalid()) {
               return false;
          }

          // Validate that impair and unimpair aren't both selected (handled by radio group)
          // But validate that default + impair aren't both selected
          if (this.loanStoreService.tfLoanDefault() && this.loanStoreService.tfLoanImpair()) {
               return false;
          }

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Loan selection
          if (this.isLoanSelectorTouched() && !this.loanStoreService.selectedLoanId()) {
               errors.push('Please select a loan to modify.');
          }

          if (this.isFormDirty() && this.loanStoreService.selectedLoanId()) {
               const hasDataChange = !!this.loanStoreService.data()?.trim();
               const hasFlagSelected = this.hasFlagSelected();

               // At least one modification
               if (!hasDataChange && !hasFlagSelected) {
                    errors.push('At least one field must be modified or a flag must be selected.');
               }

               // Data validation
               if (this.isDataTouched() && hasDataChange && this.isDataInvalid()) {
                    errors.push('Data exceeds 512 bytes limit.');
               }

               // Flag validation
               if (this.isFlagTouched() && !hasFlagSelected) {
                    errors.push('Please select a flag action.');
               }

               // Default and Impair cannot both be selected
               if (this.loanStoreService.tfLoanDefault() && this.loanStoreService.tfLoanImpair()) {
                    errors.push('Cannot default and impair a loan simultaneously.');
               }
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleLoanSelectorHelper() {
          this.showLoanSelectorHelper.set(!this.showLoanSelectorHelper());
     }

     toggleDataHelper() {
          this.showDataHelper.set(!this.showDataHelper());
     }

     // Reset validation state
     resetValidationState() {
          this.isLoanSelectorTouched.set(false);
          this.isDataTouched.set(false);
          this.isFlagTouched.set(false);
          this.isFormDirty.set(false);
     }
}
