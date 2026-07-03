import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AppConstants } from '../../../../core/app.constants';
import { LoanStoreService } from '../../../../services/loan/loan-store/loan-store.service';
import { LoanUtilService } from '../../../../services/loan/loan-util/loan-util.service';
import { LoanViewModelService } from '../../../../services/loan/loan-view-model/loan-view-model.service';

@Component({
     selector: 'app-loan-unimpair',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent],
     templateUrl: './loan-unimpair.component.html',
     styleUrl: './loan-unimpair.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanUnimpairComponent {
     public readonly loanStoreService = inject(LoanStoreService);
     public readonly loanUtilService = inject(LoanUtilService);
     public readonly loanViewModelService = inject(LoanViewModelService);

     readonly loanSelectorHelperItems = AppConstants.LOAN_SELECTOR_HELPER_ITEMS || [];

     private isLoanSelectorTouched = signal(false);
     private isFormDirty = signal(false);

     readonly canUnimpairLoanChange = output<boolean>();

     showLoanSelectorHelper = signal(false);

     constructor() {
          effect(() => {
               this.canUnimpairLoanChange.emit(this.canUnimpairLoan());
          });
     }

     public loanItems() {
          const address = this.loanViewModelService.currentWalletData()?.address || '';
          const loans = this.loanStoreService.existingLoans();
          // Only show impaired loans for unimpair
          const impairedLoans = loans.filter(loan => loan.status === 'impaired' || loan.isImpaired);
          return this.loanUtilService.loanItems(impairedLoans);
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
          }
     }

     public selectedLoanBrokerId(): string {
          const loan = this.getSelectedLoan();
          return loan?.LoanBrokerID || '';
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

     public selectedLoanStatus(): string {
          const loan = this.getSelectedLoan();
          if (!loan) return 'unknown';
          if (loan.status) return loan.status;
          if (loan.isDefaulted) return 'defaulted';
          if (loan.isImpaired) return 'impaired';
          return 'active';
     }

     public isLoanImpaired(): boolean {
          return this.selectedLoanStatus() === 'impaired';
     }

     canUnimpairLoan = computed(() => {
          const hasLoanSelected = !!this.loanStoreService.selectedLoanId();
          if (!hasLoanSelected) return false;

          // Only impaired loans can be un-impaired
          if (!this.isLoanImpaired()) return false;

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          if (this.isLoanSelectorTouched() && !this.loanStoreService.selectedLoanId()) {
               errors.push('Please select an impaired loan to unimpair.');
          }

          if (this.loanStoreService.selectedLoanId() && !this.isLoanImpaired()) {
               errors.push('Only impaired loans can be un-impaired.');
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     toggleLoanSelectorHelper() {
          this.showLoanSelectorHelper.set(!this.showLoanSelectorHelper());
     }

     resetValidationState() {
          this.isLoanSelectorTouched.set(false);
          this.isFormDirty.set(false);
     }
}
