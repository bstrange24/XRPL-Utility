import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AppConstants } from '../../../../core/app.constants';
import { LoanViewModelService } from '../../../../services/loan/loan-view-model/loan-view-model.service';
import { LoanUtilService } from '../../../../services/loan/loan-util/loan-util.service';
import { LoanStoreService } from '../../../../services/loan/loan-store/loan-store.service';

@Component({
     selector: 'app-loan-default',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent],
     templateUrl: './loan-default.component.html',
     styleUrl: './loan-default.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanDefaultComponent {
     public readonly loanStoreService = inject(LoanStoreService);
     public readonly loanUtilService = inject(LoanUtilService);
     public readonly loanViewModelService = inject(LoanViewModelService);

     readonly loanSelectorHelperItems = AppConstants.LOAN_SELECTOR_HELPER_ITEMS || [];

     private isLoanSelectorTouched = signal(false);
     private isFormDirty = signal(false);
     readonly confirmationChecked = signal(false);

     readonly canDefaultLoanChange = output<boolean>();

     showLoanSelectorHelper = signal(false);

     constructor() {
          effect(() => {
               this.canDefaultLoanChange.emit(this.canDefaultLoan());
          });

          effect(() => {
               const selectedId = this.loanStoreService.selectedLoanId();
               this.confirmationChecked.set(false);
          });
     }

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
               this.confirmationChecked.set(false);
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

     public selectedLoanRemainingBalance(): string {
          const loan = this.getSelectedLoan();
          if (!loan) return '0';
          return loan.remainingBalance || loan.PrincipalRequested || '0';
     }

     public selectedLoanStatus(): string {
          const loan = this.getSelectedLoan();
          if (!loan) return 'unknown';
          if (loan.status) return loan.status;
          if (loan.isDefaulted) return 'defaulted';
          if (loan.isImpaired) return 'impaired';
          return 'active';
     }

     public isLoanAlreadyDefaulted(): boolean {
          return this.selectedLoanStatus() === 'defaulted';
     }

     public isLoanAlreadyClosed(): boolean {
          return this.selectedLoanStatus() === 'closed';
     }

     canDefaultLoan = computed(() => {
          const hasLoanSelected = !!this.loanStoreService.selectedLoanId();
          if (!hasLoanSelected) return false;

          if (this.isLoanAlreadyDefaulted()) return false;
          if (this.isLoanAlreadyClosed()) return false;

          if (!this.confirmationChecked()) return false;

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          if (this.isLoanSelectorTouched() && !this.loanStoreService.selectedLoanId()) {
               errors.push('Please select a loan to default.');
          }

          if (this.loanStoreService.selectedLoanId()) {
               if (this.isLoanAlreadyDefaulted()) {
                    errors.push('This loan has already been defaulted.');
               }
               if (this.isLoanAlreadyClosed()) {
                    errors.push('This loan has already been closed.');
               }
               if (!this.isLoanAlreadyDefaulted() && !this.isLoanAlreadyClosed() && !this.confirmationChecked()) {
                    errors.push('Please confirm you want to default this loan.');
               }
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
          this.confirmationChecked.set(false);
     }
}
