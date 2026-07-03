import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
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
     selector: 'app-lending-broker-cover-withdraw',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './lending-broker-cover-withdraw.component.html',
     styleUrl: './lending-broker-cover-withdraw.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LendingBrokerCoverWithdrawComponent {
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly loanBrokerUtilService = inject(LoanBrokerUtilService);
     public readonly loanBrokerViewModelService = inject(LoanBrokerViewModelService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly utilsService = inject(UtilsService);

     // Helper Items
     readonly brokerSelectorHelperItems = AppConstants.LOAN_BROKER_SELECTOR_HELPER_ITEMS || [];
     readonly withdrawAmountHelperItems = AppConstants.LOAN_BROKER_WITHDRAW_AMOUNT_HELPER_ITEMS || [];
     readonly destinationHelperItems = AppConstants.LOAN_BROKER_DESTINATION_HELPER_ITEMS || [];
     readonly destinationTagHelperItems = AppConstants.LOAN_BROKER_DESTINATION_TAG_HELPER_ITEMS || [];

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isBrokerSelectorTouched = signal(false);
     private isAmountTouched = signal(false);
     private isDestinationTouched = signal(false);
     private isDestinationTagTouched = signal(false);
     private isFormDirty = signal(false);
     private isDestinationValid = signal(false);
     manualBrokerId = signal<string>('');
     isLoadingBroker = signal(false);
     brokerFetchError = signal<string | null>(null);

     // Outputs
     readonly canCoverWithdrawChange = output<boolean>();
     readonly searchQueryChange = output<string>();
     readonly destinationChange = output<any>();
     readonly destinationTagChange = output<number | null>();

     // UI Signals
     showBrokerSelectorHelper = signal(false);
     showWithdrawAmountHelper = signal(false);
     showDestinationHelper = signal(false);
     showDestinationTagHelper = signal(false);

     // Inputs from parent
     readonly currentAddress = input<string>('');
     readonly destinationSearchQuery = input<string>('');

     // Computed values for null-safe template access
     public selectedDestinationItemSafe = computed(() => {
          return this.loanBrokerViewModelService.selectedDestinationItem();
     });

     public isDestinationSelected = computed(() => {
          return !!this.selectedDestinationItemSafe();
     });

     public selectedDestinationId = computed(() => {
          return this.selectedDestinationItemSafe()?.id || null;
     });

     public isDestinationCurrentWallet = computed(() => {
          const destId = this.selectedDestinationId();
          const currentAddr = this.currentAddress();
          return destId && currentAddr && destId === currentAddr;
     });

     constructor() {
          effect(() => {
               this.canCoverWithdrawChange.emit(this.canCoverWithdraw());
          });
     }

     // Form field accessors
     get withdrawAmount() {
          return this.loanBrokerStoreService.debtMaximum(); // Reuse debtMaximum as withdraw amount
     }

     set withdrawAmount(value: string) {
          this.isAmountTouched.set(true);
          this.isFormDirty.set(true);
          this.loanBrokerStoreService.setField('debtMaximum', value);
     }

     get destinationTag() {
          return this._destinationTag();
     }

     set destinationTag(value: number | null) {
          this.isDestinationTagTouched.set(true);
          this.isFormDirty.set(true);
          this._destinationTag.set(value);
          this.destinationTagChange.emit(value);
     }

     // Local signal for destination tag since we don't have it in the store yet
     private _destinationTag = signal<number | null>(null);

     // Broker Selection
     // public brokerItems() {
     //      const address = this.loanBrokerViewModelService.currentWalletData()?.address || '';
     //      const brokers = this.loanBrokerStoreService.existingBrokers();
     //      return this.loanBrokerUtilService.brokerItems(brokers);
     // }

     public brokerItems() {
          const address = this.loanBrokerViewModelService.currentWalletData()?.address || '';
          const brokers = this.loanBrokerStoreService.existingBrokers();
          const activeTab = this.loanBrokerViewModelService.activeTab();
          return this.loanBrokerUtilService.brokerItems(brokers, activeTab, address);
     }

     public selectedBrokerItem() {
          return this.loanBrokerUtilService.selectedBrokerItem(this.brokerItems(), this.loanBrokerStoreService.selectedBrokerId());
     }

     // public getSelectedBroker() {
     //      const selectedId = this.loanBrokerStoreService.selectedBrokerId();
     //      if (!selectedId) return null;

     //      const brokers = this.loanBrokerStoreService.existingBrokers();
     //      return this.loanBrokerUtilService.getBrokerById(brokers, selectedId);
     // }

     public getSelectedBroker() {
          const selectedId = this.loanBrokerStoreService.selectedBrokerId();
          if (!selectedId) return null;

          // 1. Check existing brokers (owned by this wallet)
          const brokers = this.loanBrokerStoreService.existingBrokers();
          let broker = brokers?.find((b: any) => {
               const id = b.id || b.index;
               return id === selectedId;
          });

          // 2. If not found, check manually fetched broker
          if (!broker) {
               const manuallyFetched = this.loanBrokerStoreService.manuallyFetchedBroker();
               broker = manuallyFetched ?? undefined; // Convert null to undefined
          }

          return broker || null;
     }

     isBrokerIdValid(): boolean {
          const id = this.manualBrokerId();
          if (!id) return false;
          return /^[0-9A-Fa-f]{64}$/.test(id);
     }

     isBrokerIdInvalid(): boolean {
          const id = this.manualBrokerId();
          if (!id) return false;
          return !this.isBrokerIdValid();
     }

     // Add handler for manual entry
     async onManualBrokerIdChange(value: string) {
          this.manualBrokerId.set(value);
          this.brokerFetchError.set(null);

          // Clear selection if empty
          if (!value || value.trim().length === 0) {
               this.loanBrokerStoreService.setField('selectedBrokerId', null);
               this.loanBrokerStoreService.setField('manuallyFetchedBroker', null);
               return;
          }

          // Validate hex format
          if (!/^[0-9A-Fa-f]+$/.test(value)) {
               this.brokerFetchError.set('Invalid Broker ID format - must be hexadecimal');
               return;
          }

          // Minimum length for a broker ID (64 chars)
          if (value.length < 64) {
               return;
          }

          this.isLoadingBroker.set(true);

          try {
               // First, check if it's in existing brokers (owned by this wallet)
               const existingBrokers = this.loanBrokerStoreService.existingBrokers() || [];
               let broker = existingBrokers.find((b: any) => {
                    const id = b.id || b.index;
                    return id === value;
               });

               // If not found locally, fetch from ledger
               if (!broker) {
                    const env = await this.loanBrokerViewModelService.txEnvironmentService.getValidatedEnvironment(false);
                    if (!env?.client) {
                         this.brokerFetchError.set('Unable to connect to network');
                         this.isLoadingBroker.set(false);
                         return;
                    }

                    const fetchedBroker = await this.loanBrokerUtilService.getBrokerByIdFromLedger(env.client, value);

                    if (!fetchedBroker) {
                         this.brokerFetchError.set('Broker not found on ledger');
                         this.isLoadingBroker.set(false);
                         return;
                    }

                    // Store the manually fetched broker separately
                    this.loanBrokerStoreService.setField('manuallyFetchedBroker', fetchedBroker);
                    broker = fetchedBroker;
               }

               // Success - set the selected broker
               if (broker) {
                    const brokerId = broker.id || broker.index;
                    this.loanBrokerStoreService.setField('selectedBrokerId', brokerId!);
                    this.brokerFetchError.set(null);
               }
          } catch (error: any) {
               console.error('Error fetching broker:', error);
               this.brokerFetchError.set(error.message || 'Failed to fetch broker details');
          } finally {
               this.isLoadingBroker.set(false);
          }
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
               this._destinationTag.set(null);
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

     // Destination methods
     public destinationItems() {
          return this.loanBrokerViewModelService.destinationItems();
     }

     public selectedDestinationItem() {
          return this.loanBrokerViewModelService.selectedDestinationItem();
     }

     public onDestinationChange(item: SelectItem | null) {
          this.isDestinationTouched.set(true);
          this.isFormDirty.set(true);

          if (!item) {
               this.loanBrokerViewModelService.selectedDestinationAddress.set('');
               this.destinationChange.emit(null);
               return;
          }

          const addr = item?.id || '';
          this.loanBrokerViewModelService.selectedDestinationAddress.set(addr);
          this.destinationChange.emit(item);
     }

     public onSearchQueryChange(query: string) {
          this.loanBrokerViewModelService.destinationSearchQuery.set(query);
          this.searchQueryChange.emit(query);
     }

     public onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
     }

     // Amount validation
     isAmountValid(): boolean {
          const value = this.withdrawAmount;
          if (!value) return false;
          return !this.amountValidatorService.isAmountInvalid();
     }

     isAmountInvalid(): boolean {
          const value = this.withdrawAmount;
          if (!value) return false;
          return this.amountValidatorService.isAmountInvalid();
     }

     isAmountExceedsBalance(): boolean {
          const value = this.withdrawAmount;
          if (!value) return false;
          const amountNum = parseFloat(value);
          if (isNaN(amountNum)) return false;

          const balance = this.selectedBrokerCoverBalance();
          if (!balance) return false;
          const balanceNum = parseFloat(balance);
          if (isNaN(balanceNum)) return false;

          return amountNum > balanceNum;
     }

     public parseFloat(value: any): number {
          return parseFloat(value);
     }

     // Destination validation
     isDestinationRequired(): boolean {
          // Destination is optional, but if provided it must be valid
          const dest = this.loanBrokerViewModelService.selectedDestinationAddress();
          if (!dest) return false;
          return !this.isDestinationValid();
     }

     // Destination Tag validation
     isDestinationTagValid(): boolean {
          const tag = this.destinationTag;
          if (tag === null || tag === undefined) return true;
          return tag >= 0 && tag <= 4294967295;
     }

     // Computed validation
     canCoverWithdraw = computed(() => {
          const hasBrokerSelected = !!this.loanBrokerStoreService.selectedBrokerId();
          if (!hasBrokerSelected) return false;

          const amount = this.withdrawAmount;
          if (!amount || amount.trim().length === 0) return false;
          if (this.isAmountInvalid()) return false;

          const amountNum = parseFloat(amount);
          if (isNaN(amountNum) || amountNum <= 0) return false;

          // Check if amount exceeds balance
          if (this.isAmountExceedsBalance()) return false;

          // Destination validation (optional but must be valid if provided)
          const dest = this.loanBrokerViewModelService.selectedDestinationAddress();
          if (dest && !this.isDestinationValid()) return false;

          // Destination Tag validation
          if (!this.isDestinationTagValid()) return false;

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Broker selection
          if (this.isBrokerSelectorTouched() && !this.loanBrokerStoreService.selectedBrokerId()) {
               errors.push('Please select a Loan Broker.');
          }

          // Amount validation
          if (this.isAmountTouched()) {
               const amount = this.withdrawAmount;
               if (!amount || amount.trim().length === 0) {
                    errors.push('Please enter an amount to withdraw.');
               } else if (this.isAmountInvalid()) {
                    errors.push('Invalid amount format.');
               } else {
                    const amountNum = parseFloat(amount);
                    if (isNaN(amountNum) || amountNum <= 0) {
                         errors.push('Amount must be greater than 0.');
                    }
                    if (this.isAmountExceedsBalance()) {
                         errors.push('Amount exceeds available First-Loss Capital balance.');
                    }
               }
          }

          // Destination validation (optional)
          if (this.isDestinationTouched()) {
               const dest = this.loanBrokerViewModelService.selectedDestinationAddress();
               if (dest && !this.isDestinationValid()) {
                    errors.push('Invalid destination address.');
               }
          }

          // Destination Tag validation
          if (this.isDestinationTagTouched() && !this.isDestinationTagValid()) {
               errors.push('Destination Tag must be between 0 and 4294967295.');
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleBrokerSelectorHelper() {
          this.showBrokerSelectorHelper.set(!this.showBrokerSelectorHelper());
     }

     toggleAmountHelper() {
          this.showWithdrawAmountHelper.set(!this.showWithdrawAmountHelper());
     }

     toggleDestinationHelper() {
          this.showDestinationHelper.set(!this.showDestinationHelper());
     }

     toggleDestinationTagHelper() {
          this.showDestinationTagHelper.set(!this.showDestinationTagHelper());
     }

     // Reset validation state
     resetValidationState() {
          this.isBrokerSelectorTouched.set(false);
          this.isAmountTouched.set(false);
          this.isDestinationTouched.set(false);
          this.isDestinationTagTouched.set(false);
          this.isFormDirty.set(false);
          this.isDestinationValid.set(false);
          this._destinationTag.set(null);
     }
}
