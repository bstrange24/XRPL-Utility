import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { AppConstants } from '../../../../core/app.constants';
import { LoanStoreService } from '../../../../services/loan/loan-store/loan-store.service';
import { LoanUtilService } from '../../../../services/loan/loan-util/loan-util.service';
import { LoanViewModelService } from '../../../../services/loan/loan-view-model/loan-view-model.service';
import { LOAN_PAY_FLAGS_CONFIG } from '../../constants/loan.constants';
import { LoanBrokerStoreService } from '../../../../services/loan-broker/loan-broker-store/loan-broker-store.service';
import { VaultStoreService } from '../../../../services/vault/vault-store/vault-store.service';

@Component({
     selector: 'app-loan-pay',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './loan-pay.component.html',
     styleUrl: './loan-pay.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanPayComponent {
     public readonly loanStoreService = inject(LoanStoreService);
     public readonly loanUtilService = inject(LoanUtilService);
     public readonly loanViewModelService = inject(LoanViewModelService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly utilsService = inject(UtilsService);
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly vaultStoreService = inject(VaultStoreService);

     readonly loanPayFlagsConfig = LOAN_PAY_FLAGS_CONFIG;

     // Helper Items
     readonly loanSelectorHelperItems = AppConstants.LOAN_SELECTOR_HELPER_ITEMS || [];
     readonly paymentAmountHelperItems = AppConstants.LOAN_PAYMENT_AMOUNT_HELPER_ITEMS || [];

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isLoanSelectorTouched = signal(false);
     private isAmountTouched = signal(false);
     private isFlagTouched = signal(false);
     private isFormDirty = signal(false);

     // Outputs
     readonly canPayLoanChange = output<boolean>();

     // UI Signals
     showLoanSelectorHelper = signal(false);
     showPaymentAmountHelper = signal(false);

     constructor() {
          effect(() => {
               this.canPayLoanChange.emit(this.canPayLoan());
          });
     }

     // Form field accessors
     get paymentAmount() {
          return this.loanStoreService.paymentAmount();
     }

     set paymentAmount(value: string) {
          this.isAmountTouched.set(true);
          this.isFormDirty.set(true);
          this.loanStoreService.setField('paymentAmount', value);
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
               this.loanStoreService.setField('paymentAmount', '');
               return;
          }

          const loans = this.loanStoreService.existingLoans();
          const loan = this.loanUtilService.getLoanById(loans, item.id);

          if (loan) {
               this.loanStoreService.setField('selectedLoanId', item.id);
               this.loanStoreService.setField('loanBrokerId', loan?.LoanBrokerID || '');
               // Reset payment amount when loan changes
               this.loanStoreService.setField('paymentAmount', '');
               // Reset flags
               this.resetFlags();
          }
     }

     isAssetMPT = computed(() => {
          const selectedLoan = this.getSelectedLoan();
          if (!selectedLoan) return false;

          // Get the loan broker to check the asset type
          const brokers = this.loanBrokerStoreService.existingBrokers();
          const broker = brokers.find(b => (b.id || b.index) === selectedLoan.LoanBrokerID);
          if (!broker) return false;

          const vaults = this.vaultStoreService.existingVaults();
          const vault = vaults.find(v => (v.index || v.id) === broker.VaultID);
          if (!vault) return false;

          const asset = vault.Asset || vault.SendMax;
          return asset?.mpt_issuance_id ? true : false;
     });

     // Selected loan getters
     public selectedLoanBrokerId(): string {
          const loan = this.getSelectedLoan();
          return loan?.LoanBrokerID || '';
     }

     public selectedLoanPrincipalOutstanding(): string {
          const loan = this.getSelectedLoan();
          return loan?.PrincipalOutstanding ?? '';
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

     public selectedLoanRemainingBalance(): string {
          const loan = this.getSelectedLoan();
          if (!loan) return '0';
          return loan.remainingBalance || loan.PrincipalRequested || '0';
     }

     // Flag selection (radio group - only one can be selected)
     selectFlag(key: 'tfLoanOverpayment' | 'tfLoanFullPayment' | 'tfLoanLatePayment'): void {
          this.isFlagTouched.set(true);
          this.isFormDirty.set(true);

          // Reset all flags
          this.resetFlags();

          // Set the selected flag
          this.loanStoreService.setField(key, true);
     }

     private resetFlags(): void {
          this.loanStoreService.setField('tfLoanOverpayment', false);
          this.loanStoreService.setField('tfLoanFullPayment', false);
          this.loanStoreService.setField('tfLoanLatePayment', false);
     }

     // Amount validation
     isAmountValid(): boolean {
          const value = this.paymentAmount;
          if (!value) return false;
          if (this.amountValidatorService.isAmountInvalid()) return false;

          // Check for MPT fractional amounts
          if (this.isAssetMPT()) {
               const numValue = parseFloat(value);
               if (!Number.isInteger(numValue)) {
                    return false;
               }
          }

          return true;
     }
     // isAmountValid(): boolean {
     //      const value = this.paymentAmount;
     //      if (!value) return false;
     //      return !this.amountValidatorService.isAmountInvalid();
     // }

     isAmountInvalid(): boolean {
          const value = this.paymentAmount;
          if (!value) return false;
          return this.amountValidatorService.isAmountInvalid();
     }

     isAmountExceedsBalance(): boolean {
          const value = this.paymentAmount;
          if (!value) return false;
          const amountNum = parseFloat(value);
          if (isNaN(amountNum)) return false;

          const balance = this.selectedLoanRemainingBalance();
          const balanceNum = parseFloat(balance);
          if (isNaN(balanceNum)) return false;

          return amountNum > balanceNum;
     }

     public parseFloat(value: any): number {
          return parseFloat(value);
     }

     // Check if any flag is selected
     hasFlagSelected(): boolean {
          return this.loanStoreService.tfLoanOverpayment() || this.loanStoreService.tfLoanFullPayment() || this.loanStoreService.tfLoanLatePayment();
     }

     // Computed validation
     canPayLoan = computed(() => {
          const hasLoanSelected = !!this.loanStoreService.selectedLoanId();
          if (!hasLoanSelected) return false;

          const amount = this.paymentAmount;
          if (!amount || amount.trim().length === 0) return false;
          if (this.isAmountInvalid()) return false;

          const amountNum = parseFloat(amount);
          if (isNaN(amountNum) || amountNum <= 0) return false;

          // Check if amount exceeds remaining balance
          if (this.isAmountExceedsBalance()) return false;

          // At least one flag must be selected
          if (!this.hasFlagSelected()) return false;

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Loan selection
          if (this.isLoanSelectorTouched() && !this.loanStoreService.selectedLoanId()) {
               errors.push('Please select a loan to pay.');
          }

          // Amount validation
          if (this.isAmountTouched()) {
               const amount = this.paymentAmount;
               if (!amount || amount.trim().length === 0) {
                    errors.push('Please enter a payment amount.');
               } else if (this.isAmountInvalid()) {
                    errors.push('Invalid amount format.');
               } else {
                    const amountNum = parseFloat(amount);
                    if (isNaN(amountNum) || amountNum <= 0) {
                         errors.push('Amount must be greater than 0.');
                    }
                    if (this.isAmountExceedsBalance()) {
                         errors.push('Amount exceeds remaining balance.');
                    }
               }
          }

          if (this.isAssetMPT() && this.isAmountTouched()) {
               const amount = parseFloat(this.paymentAmount);
               if (!Number.isInteger(amount)) {
                    errors.push('MPT token payments must be whole numbers (no decimals).');
               }
          }

          // Flag selection
          if (this.isFlagTouched() && !this.hasFlagSelected()) {
               errors.push('Please select a payment type.');
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleLoanSelectorHelper() {
          this.showLoanSelectorHelper.set(!this.showLoanSelectorHelper());
     }

     toggleAmountHelper() {
          this.showPaymentAmountHelper.set(!this.showPaymentAmountHelper());
     }

     // Reset validation state
     resetValidationState() {
          this.isLoanSelectorTouched.set(false);
          this.isAmountTouched.set(false);
          this.isFlagTouched.set(false);
          this.isFormDirty.set(false);
          this.resetFlags();
     }
}
