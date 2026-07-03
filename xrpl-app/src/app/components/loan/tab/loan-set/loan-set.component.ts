import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { AppConstants } from '../../../../core/app.constants';
import { LoanUtilService } from '../../../../services/loan/loan-util/loan-util.service';
import { LoanViewModelService } from '../../../../services/loan/loan-view-model/loan-view-model.service';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { LOAN_FLAGS_CONFIG } from '../../constants/loan.constants';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import * as xrpl from 'xrpl';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { LoanStoreService } from '../../../../services/loan/loan-store/loan-store.service';
import { LoanBrokerStoreService } from '../../../../services/loan-broker/loan-broker-store/loan-broker-store.service';
import { StorageService } from '../../../../services/shared/local-storage/storage.service';
import { VaultStoreService } from '../../../../services/vault/vault-store/vault-store.service';

@Component({
     selector: 'app-loan-set',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './loan-set.component.html',
     styleUrl: './loan-set.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanSetComponent {
     public readonly loanStoreService = inject(LoanStoreService);
     public readonly loanUtilService = inject(LoanUtilService);
     public readonly loanViewModelService = inject(LoanViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly storageService = inject(StorageService);
     public readonly vaultStoreService = inject(VaultStoreService);

     readonly loanFlagsConfig = LOAN_FLAGS_CONFIG;

     // Helper Items
     readonly brokerIdHelperItems = AppConstants.LOAN_BROKER_ID_HELPER_ITEMS || [];
     readonly principalHelperItems = AppConstants.LOAN_PRINCIPAL_HELPER_ITEMS || [];
     readonly counterpartyHelperItems = AppConstants.LOAN_COUNTERPARTY_HELPER_ITEMS || [];
     readonly dataHelperItems = AppConstants.LOAN_DATA_HELPER_ITEMS || [];

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isBrokerIdTouched = signal(false);
     private isPrincipalTouched = signal(false);
     private isCounterpartyTouched = signal(false);
     private isDataTouched = signal(false);
     private isFormDirty = signal(false);
     private isCounterpartyValid = signal(false);

     // Inputs from parent
     readonly wantsOptions = input<boolean>(true);
     canSubmit = input<boolean>(false);
     tab = input<string>();
     selectedDestinationAddress = input<string>();
     readonly currentAddress = input<string>('');
     readonly destinationSearchQuery = input<string>('');
     lastIntendedDestination = input<string>('');

     // Outputs
     readonly canCreateLoanChange = output<boolean>();
     readonly searchQueryChange = output<string>();
     destinationChange = output<any>();
     optionsToggled = output<boolean>();
     toggleOptions = output<boolean>();
     readonly counterpartyChange = output<any>();
     readonly clearFields = output<void>();

     // UI Signals
     showBrokerIdHelper = signal(false);
     showPrincipalHelper = signal(false);
     showCounterpartyHelper = signal(false);
     showDataHelper = signal(false);

     constructor() {
          effect(() => {
               this.canCreateLoanChange.emit(this.canCreateLoan());
          });
     }

     // Form field accessors
     get loanBrokerId() {
          return this.loanStoreService.loanBrokerId();
     }

     set loanBrokerId(value: string) {
          this.isBrokerIdTouched.set(true);
          this.isFormDirty.set(true);
          this.loanStoreService.setField('loanBrokerId', value);
     }

     get counterpartySeed() {
          return this.loanStoreService.counterpartySeed();
     }

     set counterpartySeed(value: string) {
          this.loanStoreService.setField('counterpartySeed', value);
     }

     get principalRequested() {
          return this.loanStoreService.principalRequested();
     }

     set principalRequested(value: string) {
          this.isPrincipalTouched.set(true);
          this.isFormDirty.set(true);
          this.loanStoreService.setField('principalRequested', value);
     }

     get data() {
          return this.loanStoreService.data();
     }

     set data(value: string) {
          this.isDataTouched.set(true);
          this.isFormDirty.set(true);
          this.loanStoreService.setField('data', value);
     }

     get loanOriginationFee() {
          return this.loanStoreService.loanOriginationFee();
     }

     set loanOriginationFee(value: string) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('loanOriginationFee', value);
     }

     get loanServiceFee() {
          return this.loanStoreService.loanServiceFee();
     }

     set loanServiceFee(value: string) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('loanServiceFee', value);
     }

     get latePaymentFee() {
          return this.loanStoreService.latePaymentFee();
     }

     set latePaymentFee(value: string) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('latePaymentFee', value);
     }

     get closePaymentFee() {
          return this.loanStoreService.closePaymentFee();
     }

     set closePaymentFee(value: string) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('closePaymentFee', value);
     }

     get overpaymentFee() {
          return this.loanStoreService.overpaymentFee();
     }

     set overpaymentFee(value: number | null) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('overpaymentFee', value);
     }

     get interestRate() {
          return this.loanStoreService.interestRate();
     }

     set interestRate(value: number | null) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('interestRate', value);
     }

     get lateInterestRate() {
          return this.loanStoreService.lateInterestRate();
     }

     set lateInterestRate(value: number | null) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('lateInterestRate', value);
     }

     get closeInterestRate() {
          return this.loanStoreService.closeInterestRate();
     }

     set closeInterestRate(value: number | null) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('closeInterestRate', value);
     }

     get overpaymentInterestRate() {
          return this.loanStoreService.overpaymentInterestRate();
     }

     set overpaymentInterestRate(value: number | null) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('overpaymentInterestRate', value);
     }

     get paymentTotal() {
          return this.loanStoreService.paymentTotal();
     }

     set paymentTotal(value: number | null) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('paymentTotal', value);
     }

     get paymentInterval() {
          return this.loanStoreService.paymentInterval();
     }

     set paymentInterval(value: number | null) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('paymentInterval', value);
     }

     get gracePeriod() {
          return this.loanStoreService.gracePeriod();
     }

     set gracePeriod(value: number | null) {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('gracePeriod', value);
     }

     // Validation methods
     isBrokerIdValid(): boolean {
          const value = this.loanBrokerId;
          if (!value) return false;
          return this.loanUtilService.validateLoanBrokerId(value);
     }

     isBrokerIdInvalid(): boolean {
          const value = this.loanBrokerId;
          if (!value) return false;
          return !this.isBrokerIdValid();
     }

     isCounterPartySeedValid(): boolean {
          const value = this.counterpartySeed;
          if (!value) return false;
          return xrpl.isValidSecret(value);
     }

     isCounterPartySeedInvalid(): boolean {
          const value = this.counterpartySeed;
          if (!value) return false;
          return !xrpl.isValidSecret(value);
     }

     isPrincipalValid(): boolean {
          const value = this.principalRequested;
          if (!value) return false;
          return !this.amountValidatorService.isAmountInvalid();
     }

     isPrincipalInvalid(): boolean {
          const value = this.principalRequested;
          if (!value) return false;
          return this.amountValidatorService.isAmountInvalid();
     }

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

     get principalRequestedXrp(): string {
          const drops = this.loanStoreService.principalRequested();
          if (!drops) return '0';
          try {
               return xrpl.dropsToXrp(drops).toString();
          } catch {
               return drops.toString();
          }
     }

     set principalRequestedXrp(value: string) {
          try {
               const drops = xrpl.xrpToDrops(value);
               this.loanStoreService.setField('principalRequested', drops);
          } catch {
               this.loanStoreService.setField('principalRequested', value);
          }
     }

     // Counterparty methods
     public destinationItems() {
          return this.loanViewModelService.destinationItems();
     }

     public selectedDestinationItem() {
          const selected = this.loanViewModelService.selectedDestinationItem();
          // console.log('🔍 [LoanSet] selectedDestinationItem:', selected);

          // If the view model doesn't have a selection but the store does, sync it
          if (!selected && this.loanStoreService.counterparty()) {
               const items = this.destinationItems();
               const found = items.find(item => item.id === this.loanStoreService.counterparty());
               if (found) {
                    this.loanViewModelService.selectedDestinationAddress.set(found.id);
                    return found;
               }
          }

          return selected;
     }

     public onSearchQueryChange(query: string) {
          console.log('🔍 [LoanSet] onSearchQueryChange:', query);
          this.loanViewModelService.destinationSearchQuery.set(query);
          this.searchQueryChange.emit(query);
     }

     public onCounterpartyChange(item: SelectItem | null) {
          this.isCounterpartyTouched.set(true);
          this.isFormDirty.set(true);

          if (!item) {
               this.loanStoreService.setField('counterparty', '');
               this.loanStoreService.setField('counterpartySeed', '');
               this.loanViewModelService.selectedDestinationAddress.set('');
               this.counterpartyChange.emit(null);
               return;
          }

          const addr = item?.id || '';

          // Try to find the wallet in stored wallets
          const environment = localStorage.getItem('selectedNetwork') || 'devnet';
          const storedWallets = this.storageService.get(`wallets_${environment}`);
          const networkWallets = typeof storedWallets === 'string' ? JSON.parse(storedWallets) : storedWallets || [];
          const wallet = networkWallets.find((w: { address: string }) => w.address === addr);
          const seed = wallet?.seed;

          // Store the borrower's address and seed
          this.loanStoreService.setField('counterparty', addr); // This is the borrower
          this.loanStoreService.setField('counterpartySeed', seed || '');
          this.loanViewModelService.selectedDestinationAddress.set(addr);
          this.counterpartyChange.emit(item);
     }

     // public onCounterpartyChange(item: SelectItem | null) {
     //      console.log('🔍 [LoanSet] onCounterpartyChange called with:', item);
     //      this.isCounterpartyTouched.set(true);
     //      this.isFormDirty.set(true);

     //      if (!item) {
     //           console.log('❌ [LoanSet] item is null, clearing counterparty');
     //           this.loanStoreService.setField('counterparty', '');
     //           this.loanViewModelService.selectedDestinationAddress.set('');
     //           this.counterpartyChange.emit(null);
     //           return;
     //      }

     //      const addr = item?.id || '';
     //      console.log('✅ [LoanSet] Setting counterparty to:', addr);
     //      console.log('✅ [LoanSet] Full item:', item);

     //      const environment = localStorage.getItem('selectedNetwork') || 'devnet';
     //      const storedWallets = this.storageService.get(`wallets_${environment}`);
     //      const networkWallets = typeof storedWallets === 'string' ? JSON.parse(storedWallets) : storedWallets || [];
     //      const wallet = networkWallets.find((w: { address: string }) => w.address === addr);
     //      const seed = wallet?.seed;

     //      console.log('selectedNetwork:', environment);
     //      console.log('networkWallets:', networkWallets);
     //      console.log('seed:', seed);

     //      this.loanStoreService.setField('counterparty', addr);
     //      this.loanStoreService.setField('counterpartySeed', seed);
     //      this.loanViewModelService.selectedDestinationAddress.set(addr);
     //      this.counterpartyChange.emit(item);
     // }

     public onDestinationValidationChange(isValid: boolean) {
          console.log('🔍 [LoanSet] onDestinationValidationChange:', isValid);
          this.isCounterpartyValid.set(isValid);
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

     // Add selected broker item
     public selectedBrokerItem() {
          const selectedId = this.loanStoreService.loanBrokerId();
          if (!selectedId) return null;
          const items = this.brokerItems();
          return items.find(item => item.id === selectedId) || null;
     }

     // Update onBrokerSelected method
     public onBrokerSelected(item: SelectItem | null) {
          this.isBrokerIdTouched.set(true);
          this.isFormDirty.set(true);

          if (!item?.id) {
               this.loanStoreService.setField('loanBrokerId', '');
               return;
          }

          this.loanStoreService.setField('loanBrokerId', item.id);
     }

     // Flag selection
     selectFlag(key: 'tfLoanOverpayment'): void {
          this.isFormDirty.set(true);
          this.loanStoreService.setField('tfLoanOverpayment', !this.loanStoreService.tfLoanOverpayment());
     }

     // Computed validation
     // In the canCreateLoan validation, make counterparty optional
     canCreateLoan = computed(() => {
          const brokerId = this.loanBrokerId;
          const principal = this.principalRequested;

          // Required fields
          if (!brokerId || !this.isBrokerIdValid()) return false;
          if (!principal || this.isPrincipalInvalid()) return false;

          // Data validation (optional)
          if (this.data && this.isDataInvalid()) return false;

          // Counterparty validation (optional - only validate if provided)
          if (this.loanStoreService.counterparty() && !this.isCounterpartyValid()) {
               return false;
          }

          return true;
     });
     // canCreateLoan = computed(() => {
     //      const brokerId = this.loanBrokerId;
     //      const principal = this.principalRequested;

     //      // Required fields
     //      if (!brokerId || !this.isBrokerIdValid()) return false;
     //      if (!principal || this.isPrincipalInvalid()) return false;

     //      // Data validation (optional)
     //      if (this.data && this.isDataInvalid()) return false;

     //      // Counterparty validation (optional)
     //      if (this.loanStoreService.counterparty() && !this.isCounterpartyValid()) return false;

     //      return true;
     // });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Broker ID
          if (this.isBrokerIdTouched()) {
               if (!this.loanBrokerId) {
                    errors.push('Loan Broker ID is required.');
               } else if (!this.isBrokerIdValid()) {
                    errors.push('Loan Broker ID must be a 64-character hex string.');
               }
          }

          // Principal
          if (this.isPrincipalTouched()) {
               if (!this.principalRequested) {
                    errors.push('Principal Requested is required.');
               } else if (this.isPrincipalInvalid()) {
                    errors.push('Invalid principal amount format.');
               }
          }

          // Counterparty
          if (this.isCounterpartyTouched() && this.loanStoreService.counterparty() && !this.isCounterpartyValid()) {
               errors.push('Invalid counterparty address.');
          }

          // Data
          if (this.isDataTouched() && this.data && this.isDataInvalid()) {
               errors.push('Data exceeds 512 bytes limit.');
          }

          // Add warning about counterparty signature requirement
          if (this.loanStoreService.counterparty() && this.isCounterpartyValid()) {
               errors.push('⚠️ Counterparty specified - they must sign this transaction.');
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleBrokerIdHelper() {
          this.showBrokerIdHelper.set(!this.showBrokerIdHelper());
     }

     togglePrincipalHelper() {
          this.showPrincipalHelper.set(!this.showPrincipalHelper());
     }

     toggleCounterpartyHelper() {
          this.showCounterpartyHelper.set(!this.showCounterpartyHelper());
     }

     toggleDataHelper() {
          this.showDataHelper.set(!this.showDataHelper());
     }

     // Reset validation state
     resetValidationState() {
          this.isBrokerIdTouched.set(false);
          this.isPrincipalTouched.set(false);
          this.isCounterpartyTouched.set(false);
          this.isDataTouched.set(false);
          this.isFormDirty.set(false);
          this.isCounterpartyValid.set(false);
     }
}
