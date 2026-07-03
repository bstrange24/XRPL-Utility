import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { AppConstants } from '../../../../core/app.constants';
import { LoanBrokerStoreService } from '../../../../services/loan-broker/loan-broker-store/loan-broker-store.service';
import { LoanBrokerUtilService } from '../../../../services/loan-broker/loan-broker-util/loan-broker-util.service';
import { LoanBrokerViewModelService } from '../../../../services/loan-broker/loan-broker-view-model/loan-broker-view-model.service';

@Component({
     selector: 'app-lending-broker-delete',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent],
     templateUrl: './lending-broker-delete.component.html',
     styleUrl: './lending-broker-delete.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LendingBrokerDeleteComponent {
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly loanBrokerUtilService = inject(LoanBrokerUtilService);
     public readonly loanBrokerViewModelService = inject(LoanBrokerViewModelService);

     // Helper Items
     readonly brokerSelectorHelperItems = AppConstants.LOAN_BROKER_SELECTOR_HELPER_ITEMS || [];

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isBrokerSelectorTouched = signal(false);
     private isFormDirty = signal(false);

     // Confirmation state
     readonly confirmationChecked = signal(false);
     readonly confirmationBrokerIdChecked = signal(false);

     // Outputs
     readonly canDeleteBrokerChange = output<boolean>();

     // UI Signals
     showBrokerSelectorHelper = signal(false);

     // Computed display values (handles null safely)
     public selectedBrokerManagementFeeDisplay = computed(() => {
          const fee = this.selectedBrokerManagementFee();
          if (fee === null || fee === undefined) return null;
          return fee / 1000;
     });

     constructor() {
          effect(() => {
               this.canDeleteBrokerChange.emit(this.canDeleteBroker());
          });

          // Reset confirmations when broker selection changes
          effect(() => {
               // Track the selected broker ID
               const selectedId = this.loanBrokerStoreService.selectedBrokerId();
               // Reset confirmations when broker changes
               this.confirmationChecked.set(false);
               this.confirmationBrokerIdChecked.set(false);
          });
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
               // Reset confirmations when broker changes
               this.confirmationChecked.set(false);
               this.confirmationBrokerIdChecked.set(false);
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

     // Helper to get the broker ID for display in confirmation
     public getBrokerIdForConfirmation(): string {
          const broker = this.getSelectedBroker();
          if (!broker) return '';
          return broker.LoanBrokerID || broker.id || broker.index || '';
     }

     // Computed validation
     canDeleteBroker = computed(() => {
          const hasBrokerSelected = !!this.loanBrokerStoreService.selectedBrokerId();
          if (!hasBrokerSelected) return false;

          // Both confirmations must be checked
          if (!this.confirmationChecked()) return false;
          if (!this.confirmationBrokerIdChecked()) return false;

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Broker selection
          if (this.isBrokerSelectorTouched() && !this.loanBrokerStoreService.selectedBrokerId()) {
               errors.push('Please select a Loan Broker to delete.');
          }

          // Confirmation
          // if (this.loanBrokerStoreService.selectedBrokerId()) {
          //      if (!this.confirmationChecked()) {
          //           errors.push('Please confirm that you understand this action is permanent.');
          //      }
          //      if (!this.confirmationBrokerIdChecked()) {
          //           const brokerId = this.getBrokerIdForConfirmation();
          //           errors.push(`Please confirm you want to delete Loan Broker: ${brokerId || 'selected'}`);
          //      }
          // }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleBrokerSelectorHelper() {
          this.showBrokerSelectorHelper.set(!this.showBrokerSelectorHelper());
     }

     // Reset validation state
     resetValidationState() {
          this.isBrokerSelectorTouched.set(false);
          this.isFormDirty.set(false);
          this.confirmationChecked.set(false);
          this.confirmationBrokerIdChecked.set(false);
     }
}
