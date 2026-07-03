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
import { VaultStoreService } from '../../../../services/vault/vault-store/vault-store.service';

@Component({
     selector: 'app-lending-broker-cover-deposit',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './lending-broker-cover-deposit.component.html',
     styleUrl: './lending-broker-cover-deposit.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LendingBrokerCoverDepositComponent {
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly loanBrokerUtilService = inject(LoanBrokerUtilService);
     public readonly loanBrokerViewModelService = inject(LoanBrokerViewModelService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly utilsService = inject(UtilsService);
     public readonly vaultStoreService = inject(VaultStoreService);

     // Helper Items
     readonly brokerSelectorHelperItems = AppConstants.LOAN_BROKER_SELECTOR_HELPER_ITEMS || [];
     readonly depositAmountHelperItems = AppConstants.LOAN_BROKER_DEPOSIT_AMOUNT_HELPER_ITEMS || [];

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isBrokerSelectorTouched = signal(false);
     private isAmountTouched = signal(false);
     private isFormDirty = signal(false);
     manualBrokerId = signal<string>('');
     isLoadingBroker = signal(false);
     brokerFetchError = signal<string | null>(null);

     // Outputs
     readonly canCoverDepositChange = output<boolean>();

     // UI Signals
     showBrokerSelectorHelper = signal(false);
     showDepositAmountHelper = signal(false);

     constructor() {
          effect(() => {
               this.canCoverDepositChange.emit(this.canCoverDeposit());
          });
     }

     // Form field accessors
     get depositAmount() {
          return this.loanBrokerStoreService.debtMaximum(); // Reuse debtMaximum as deposit amount
     }

     set depositAmount(value: string) {
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

     public selectedBrokerCoverMinimum(): string | null {
          const broker = this.getSelectedBroker();
          if (!broker) return null;
          // Get the cover rate minimum from the broker
          const min = broker.CoverRateMinimum;
          if (min === null || min === undefined) return null;
          // Convert from 1/10th basis points to percentage
          return `${min / 1000}%`;
     }

     public selectedBrokerAssetType(): string {
          const broker = this.getSelectedBroker();
          if (!broker) return 'Unknown';

          const vaultId = broker.VaultID;
          if (!vaultId) return 'Unknown';

          // Fetch vault from store or cache
          const vault = this.vaultStoreService.existingVaults().find(v => (v.index || v.id) === vaultId);

          if (!vault) return 'Unknown';

          const asset = vault.Asset || vault.SendMax;
          if (asset?.currency === 'XRP') return 'XRP';
          if (asset?.mpt_issuance_id) return 'MPT';
          if (asset?.currency && asset?.issuer) return 'IOU';
          return 'Unknown';
     }

     // public selectedBrokerAssetType(): string {
     //      const broker = this.getSelectedBroker();
     //      if (!broker) return 'Unknown';
     //      // This would need to be fetched from the vault
     //      return 'XRP'; // Placeholder
     // }

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

     // Amount validation
     isAmountValid(): boolean {
          const value = this.depositAmount;
          if (!value) return false;
          return !this.amountValidatorService.isAmountInvalid();
     }

     isAmountInvalid(): boolean {
          const value = this.depositAmount;
          if (!value) return false;
          return this.amountValidatorService.isAmountInvalid();
     }

     public parseFloat(value: any): number {
          return parseFloat(value);
     }

     // Computed validation
     canCoverDeposit = computed(() => {
          const hasBrokerSelected = !!this.loanBrokerStoreService.selectedBrokerId();
          if (!hasBrokerSelected) return false;

          const amount = this.depositAmount;
          if (!amount || amount.trim().length === 0) return false;
          if (this.isAmountInvalid()) return false;

          const amountNum = parseFloat(amount);
          if (isNaN(amountNum) || amountNum <= 0) return false;

          // Check if amount would exceed maximum allowed (if any)
          // This would need to be checked against the vault's capacity

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
               const amount = this.depositAmount;
               if (!amount || amount.trim().length === 0) {
                    errors.push('Please enter an amount to deposit.');
               } else if (this.isAmountInvalid()) {
                    errors.push('Invalid amount format.');
               } else {
                    const amountNum = parseFloat(amount);
                    if (isNaN(amountNum) || amountNum <= 0) {
                         errors.push('Amount must be greater than 0.');
                    }
                    // Add additional validation for maximum deposit if needed
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
          this.showDepositAmountHelper.set(!this.showDepositAmountHelper());
     }

     // Reset validation state
     resetValidationState() {
          this.isBrokerSelectorTouched.set(false);
          this.isAmountTouched.set(false);
          this.isFormDirty.set(false);
     }
}
