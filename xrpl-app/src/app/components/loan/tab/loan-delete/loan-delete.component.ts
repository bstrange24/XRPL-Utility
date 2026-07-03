import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { AppConstants } from '../../../../core/app.constants';
import { LoanUtilService } from '../../../../services/loan/loan-util/loan-util.service';
import { LoanViewModelService } from '../../../../services/loan/loan-view-model/loan-view-model.service';
import { LoanStoreService } from '../../../../services/loan/loan-store/loan-store.service';
import { LoanBrokerStoreService } from '../../../../services/loan-broker/loan-broker-store/loan-broker-store.service';

@Component({
     selector: 'app-loan-delete',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent],
     templateUrl: './loan-delete.component.html',
     styleUrl: './loan-delete.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanDeleteComponent {
     public readonly loanStoreService = inject(LoanStoreService);
     public readonly loanUtilService = inject(LoanUtilService);
     public readonly loanViewModelService = inject(LoanViewModelService);
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);

     // Helper Items
     readonly loanSelectorHelperItems = AppConstants.LOAN_SELECTOR_HELPER_ITEMS || [];

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isBrokerIdTouched = signal(false);
     private isLoanSelectorTouched = signal(false);
     private isFormDirty = signal(false);

     // Confirmation state
     readonly confirmationChecked = signal(false);

     // Outputs
     readonly canDeleteLoanChange = output<boolean>();

     // UI Signals
     showLoanSelectorHelper = signal(false);

     constructor() {
          effect(() => {
               this.canDeleteLoanChange.emit(this.canDeleteLoan());
          });

          // Reset confirmation when loan selection changes
          effect(() => {
               // Track the selected loan ID
               const selectedId = this.loanStoreService.selectedLoanId();
               // Reset confirmation when loan changes
               this.confirmationChecked.set(false);
          });
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

     get loanBrokerId() {
          return this.loanStoreService.loanBrokerId();
     }

     set loanBrokerId(value: string) {
          this.isBrokerIdTouched.set(true);
          this.isFormDirty.set(true);
          this.loanStoreService.setField('loanBrokerId', value);
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
               // Reset confirmation when loan changes
               this.confirmationChecked.set(false);
          }
     }

     // Selected loan getters
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

     public selectedBrokerItem() {
          const selectedId = this.loanStoreService.loanBrokerId();
          if (!selectedId) return null;
          const items = this.brokerItems();
          return items.find((item: { id: string }) => item.id === selectedId) || null;
     }

     public brokerItems() {
          const brokers = this.loanBrokerStoreService.existingBrokers() || [];
          return brokers.map(broker => {
               const brokerId = broker.id || broker.index || '';
               const vaultId = broker.VaultID || '';
               const shortVaultId = vaultId.length > 16 ? `${vaultId.slice(0, 8)}...${vaultId.slice(-8)}` : vaultId;
               const owner = broker.owner || broker.Account || '';
               const shortOwner = owner.length > 12 ? `${owner.slice(0, 6)}...${owner.slice(-6)}` : owner;

               return {
                    id: brokerId,
                    label: `Broker ${brokerId.slice(0, 8)}...`,
                    secondaryLabel: `Vault: ${shortVaultId} | Owner: ${shortOwner}`,
                    display: `${brokerId.slice(0, 8)}... (Vault: ${shortVaultId})`,
                    vaultId: vaultId,
               };
          });
     }

     public onBrokerSelected(item: SelectItem | null) {
          this.isBrokerIdTouched.set(true);
          this.isFormDirty.set(true);

          if (!item?.id) {
               this.loanStoreService.setField('loanBrokerId', '');
               return;
          }

          this.loanStoreService.setField('loanBrokerId', item.id);
     }

     public parseFloat(value: any): number {
          return parseFloat(value);
     }

     // Check if loan can be deleted (not already closed)
     public isLoanAlreadyClosed(): boolean {
          return this.selectedLoanStatus() === 'closed';
     }

     // Computed validation
     canDeleteLoan = computed(() => {
          const hasLoanSelected = !!this.loanStoreService.selectedLoanId();
          if (!hasLoanSelected) return false;

          // Check if loan is already closed
          if (this.isLoanAlreadyClosed()) return false;

          // Confirmation must be checked
          if (!this.confirmationChecked()) return false;

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Loan selection
          if (this.isLoanSelectorTouched() && !this.loanStoreService.selectedLoanId()) {
               errors.push('Please select a loan to close.');
          }

          // Already closed
          if (this.loanStoreService.selectedLoanId() && this.isLoanAlreadyClosed()) {
               errors.push('This loan has already been closed.');
          }

          // Confirmation
          if (this.loanStoreService.selectedLoanId() && !this.isLoanAlreadyClosed() && !this.confirmationChecked()) {
               errors.push('Please confirm that you understand this action is permanent.');
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleLoanSelectorHelper() {
          this.showLoanSelectorHelper.set(!this.showLoanSelectorHelper());
     }

     // Reset validation state
     resetValidationState() {
          this.isLoanSelectorTouched.set(false);
          this.isFormDirty.set(false);
          this.confirmationChecked.set(false);
     }
}
