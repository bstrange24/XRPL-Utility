import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, Input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { XrplExpirationInputComponent } from '../../../shared/xrpl-expiration-input/xrpl-expiration-input.component';
import { SelectSearchDropdownComponent, SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../../../services/transaction-dropdown/transaction-dropdown.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { TagValidatorService } from '../../../../services/shared/validators/tag-validator/tag-validator.service';
import { NgIcon } from '@ng-icons/core';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { EscrowValidatorService } from '../../../../services/shared/validators/escrow-validator/escrow-validator.service';
import { MptValidatorService } from '../../../../services/shared/validators/mpt/mpt-validator/mpt-validator.service';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';

@Component({
     selector: 'app-escrows-create',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, FocusBorderDirective, LucideAngularModule, NgIcon, MatSlideToggleModule, XrplExpirationInputComponent, SelectSearchDropdownComponent],
     templateUrl: './escrows-create.component.html',
     styleUrl: './escrows-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscrowsCreateComponent {
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly viewModel = inject(EscrowTransactionViewModelService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly tagValidatorService = inject(TagValidatorService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly escrowValidatorService = inject(EscrowValidatorService);
     public readonly mptValidatorService = inject(MptValidatorService);
     public readonly copyUtilService = inject(CopyUtilService);

     // Helper Items
     readonly escrowCurrencyCodeHelperItems = AppConstants.ESCROW_CURRENCY_CODE_HELPER_ITEMS;
     readonly escrowAmountHelperItems = AppConstants.ESCROW_AMOUNT_HELPER_ITEMS;
     readonly escrowIssuerHelperItems = AppConstants.ESCROW_ISSUER_HELPER_ITEMS;
     readonly escrowMptHelperItems = AppConstants.ESCROW_MPT_HELPER_ITEMS;
     readonly escrowDestinationHelperItems = AppConstants.ESCROW_DESTINATION_HELPER_ITEMS;
     readonly escrowDestTagHelperItems = AppConstants.ESCROW_DEST_TAG_HELPER_ITEMS;
     readonly escrowConditionHelperItems = AppConstants.ESCROW_CONDITION_HELPER_ITEMS;
     readonly escrowFulfillmentHelperItems = AppConstants.ESCROW_FULFILLMENT_HELPER_ITEMS;

     private readonly optionsHasError = signal(false);
     private readonly optionsErrorMsg = signal('');
     private readonly optionsErrors = signal<string[]>([]);

     @Input() isConditional = false;

     // Signals
     // Track destination validation status from dropdown
     isDestinationValid = signal(false);
     showEscrowCurrencyCodeHelper = signal(false);
     showEscrowAmountHelper = signal(false);
     showEscrowIssuerHelper = signal(false);
     showEscrowMptHelper = signal(false);
     showEscrowDestinationHelper = signal(false);
     showEscrowDestTagHelper = signal(false);
     showEscrowConditionHelper = signal(false);
     showEscrowFulfillmentHelper = signal(false);

     // Inputs from parent
     wantsOptions = input<boolean>(true);
     canSubmit = input<boolean>(false);
     tab = input<string>();
     selectedDestinationAddress = input<string>();
     currentAddress = input<string>('');
     lastIntendedDestination = input<string>('');

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     optionsToggled = output<boolean>();
     toggleOptions = output<boolean>();
     canCreateEscrowChange = output<boolean>();
     canFinishEscrowChange = output<boolean>();
     canCancelEscrowChange = output<boolean>();

     constructor() {
          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canCreateEscrowChange.emit(this.canCreateEscrow());
          });

          effect(() => {
               const wantsOptions = this.txUiService.wantsOptions();
               if (!wantsOptions) {
                    this.escrowStoreService.setEscrowCancelAfterExpirationDate('');
                    this.escrowStoreService.setEscrowFinishAfterExpirationDate('');
                    this.xrplTxOptionsStore.setIsExpirationEnabled(false);
               }
          });
     }

     ngOnDestroy(): void {
          this.escrowStoreService.setEscrowCancelAfterExpirationDate('');
          this.escrowStoreService.setEscrowFinishAfterExpirationDate('');
          this.xrplTxOptionsStore.setIsExpirationEnabled(false);
     }

     public async onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          if (currency === 'MPT') {
               await this.viewModel.refreshMpts(); // or this.base.refreshMpts() if you expose it
          } else {
               await this.trustlineUtilService.loadTrustlines(false);
               await this.trustlineCurrencyService.refreshCurrentBalance();
          }
     }

     public async onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);
          if (this.currencyStoreService.currency() && address) {
               await this.trustlineUtilService.loadTrustlines(false);
               await this.trustlineCurrencyService.refreshCurrentBalance();
          }
     }

     public currencyItems() {
          return this.trustlineCurrencyService.currencyItems();
     }

     public selectedCurrencyItem() {
          const code = this.currencyStoreService.currency();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     }

     public issuerItems() {
          return this.trustlineCurrencyService.issuerItems();
     }

     public selectedIssuerItem() {
          const addr = this.currencyStoreService.issuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     }

     public mptItems() {
          const mpts = this.mptStoreService.existingMpts?.() || [];
          return this.mptUtilService.computeMptItems(mpts);
     }

     public selectedMptItem() {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          return this.mptUtilService.computeSelectedMptItem(this.mptItems(), issuanceId);
     }

     public destinationItems() {
          return this.viewModel.destinationItems();
     }

     public selectedDestinationItem() {
          return this.viewModel.selectedDestinationItem();
     }

     public destinationSearchQuery() {
          return this.viewModel.destinationSearchQuery();
     }

     public handleSearchQueryChange(query: string) {
          this.viewModel.destinationSearchQuery.set(query);
     }

     public handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.viewModel.selectedDestinationAddress.set(addr);
          this.escrowStoreService.setField('destination', addr);
     }

     public onMptSelected(item: any) {
          if (!item) {
               this.mptStoreService.setField('mptIssuanceId', '');
               return;
          }

          this.mptStoreService.setField('mptIssuanceId', item.id || '');

          // Optional: nice feedback
          console.log('MPT Selected:', item.id);
     }

     public onFocus(event: Event) {
          (event.target as HTMLInputElement).select?.();
     }

     public toggleEscrowFinishAfterExpiration(enabled: boolean) {
          this.escrowStoreService.setField('enableEscrowFinishAfterExpirationDate', enabled);
     }

     public toggleEscrowCancelAfterExpiration(enabled: boolean) {
          this.escrowStoreService.setField('enableEscrowCancelAfterExpirationDate', enabled);
     }

     showClearFulfillmentButton(): boolean {
          return this.escrowValidatorService.hasInvalidFulfillment() || (this.escrowValidatorService.hasInvalidConditionFulfillmentPair() && !this.escrowValidatorService.hasInvalidCondition());
     }

     onOptionsToggled(enabled: boolean) {
          this.txUiService.toggleOptions(enabled);
          this.optionsToggled.emit(enabled);
     }

     onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
          this.optionsHasError.set(validation.hasError);
          this.optionsErrorMsg.set(validation.message || '');
          this.optionsErrors.set(validation.errors || []);
     }

     canCreateEscrow = computed(() => {
          // 1. Destination must be selected AND valid
          const destAddr = this.viewModel.selectedDestinationAddress?.() ?? '';
          if (!destAddr || !this.isDestinationValid()) return false;

          // 2. Amount must be > 0
          if (this.amountValidatorService.isEscrowAmountInvalid()) return false;

          // 3. Conditional escrow checks
          if (this.isConditional) {
               if (this.escrowValidatorService.hasInvalidCondition()) return false;
               if (this.escrowValidatorService.hasInvalidFulfillment()) return false;
               if (this.escrowValidatorService.hasInvalidConditionFulfillmentPair()) return false;
          }

          // 4. Expiration validation (if enabled)
          if (this.escrowStoreService.enableEscrowFinishAfterExpirationDate() && this.escrowValidatorService.hasInvalidEscrowFinishAfterExpiration()) {
               return false;
          }

          if (this.escrowStoreService.enableEscrowCancelAfterExpirationDate() && this.escrowValidatorService.hasInvalidEscrowCancelAfterExpiration()) {
               return false;
          }

          // 5. Options validation
          if (this.txUiService.wantsOptions() && this.optionsHasError()) return false;

          return true;
     });

     // canCreateEscrow = computed(() => {
     //      // Must have valid subject (XRP address)
     //      if (!this.isDestinationValid()) return false;

     //      // if (this.txUiService.wantsOptions() && this.xrplTxOptionsStore.isExpirationEnabled() && this.escrowStoreService.escrowCancelAfterExpirationDate()) {
     //      if (this.escrowValidatorService.hasInvalidEscrowCancelAfterExpiration()) {
     //           return false;
     //      }
     //      // }

     //      // if (this.txUiService.wantsOptions() && this.xrplTxOptionsStore.isExpirationEnabled() && this.escrowStoreService.escrowFinishAfterExpirationDate()) {
     //      if (this.escrowValidatorService.hasInvalidEscrowFinishAfterExpiration()) {
     //           return false;
     //      }

     //      if (this.amountValidatorService.isEscrowAmountInvalid()) {
     //           return false;
     //      }
     //      // }

     //      // Check options validation if enabled
     //      if (this.txUiService.wantsOptions() && this.optionsHasError()) return false;

     //      return true;
     // });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];
          const destAddr = this.viewModel.selectedDestinationAddress?.() ?? '';

          // Only show error if user has typed something but it's invalid
          if (destAddr && !this.isDestinationValid()) {
               errors.push('Destination address is invalid. Please enter a valid XRP address.');
          }

          // Amount error only if something was entered
          if (this.escrowStoreService.amount() && this.escrowStoreService.amount()!.trim() !== '' && this.amountValidatorService.isEscrowAmountInvalid()) {
               errors.push('Amount must be greater than 0.');
          }

          if (this.isConditional) {
               if (this.escrowValidatorService.hasInvalidCondition()) {
                    errors.push(this.escrowValidatorService.getConditionErrorMessage());
               }
               if (this.escrowValidatorService.hasInvalidFulfillment()) {
                    errors.push(this.escrowValidatorService.getFulfillmentErrorMessage());
               }
          }

          // Finish After (only if enabled)
          if (this.escrowStoreService.enableEscrowFinishAfterExpirationDate() && this.escrowValidatorService.hasInvalidEscrowFinishAfterExpiration()) {
               errors.push(this.escrowValidatorService.getFinishAfterErrorMessage());
          }

          // Cancel After (only if enabled)
          if (this.escrowStoreService.enableEscrowCancelAfterExpirationDate() && this.escrowValidatorService.hasInvalidEscrowCancelAfterExpiration()) {
               errors.push(this.escrowValidatorService.getCancelAfterErrorMessage());
          }

          if (this.txUiService.wantsOptions() && this.optionsHasError()) {
               errors.push(...this.optionsErrors());
          }

          return errors;
     });

     // validationErrorMessages = computed(() => {
     //      const errors: string[] = [];

     //      if (!this.isDestinationValid()) {
     //           errors.push('Destination address is invalid. Please enter a valid XRP address.');
     //      }

     //      if (this.amountValidatorService.isEscrowAmountInvalid()) {
     //           errors.push('Amount must be greater than 0.');
     //      }

     //      // Conditional escrow validations
     //      if (this.isConditional) {
     //           if (this.escrowValidatorService.hasInvalidCondition()) {
     //                errors.push(this.escrowValidatorService.getConditionErrorMessage());
     //           }
     //           if (this.escrowValidatorService.hasInvalidFulfillment()) {
     //                errors.push(this.escrowValidatorService.getFulfillmentErrorMessage());
     //           }
     //           if (this.escrowValidatorService.hasInvalidConditionFulfillmentPair()) {
     //                errors.push(this.escrowValidatorService.getConditionFulfillmentPairErrorMessage());
     //           }
     //      }

     //      if (this.escrowValidatorService.hasInvalidEscrowFinishAfterExpiration()) {
     //           errors.push(this.escrowValidatorService.getFinishAfterErrorMessage());
     //      }
     //      if (this.escrowValidatorService.hasInvalidEscrowCancelAfterExpiration()) {
     //           errors.push(this.escrowValidatorService.getCancelAfterErrorMessage());
     //      }

     //      return errors;
     // });

     validationErrorMessages1 = computed(() => {
          const errors: string[] = [];

          if (!this.isDestinationValid()) {
               errors.push('Destination address is invalid. Please enter a valid XRP address.');
          }

          if (this.amountValidatorService.isEscrowAmountInvalid()) {
               errors.push('Amount must be greater than 0.');
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled());

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
     }

     toggleCurrencyCodeHelper() {
          this.showEscrowCurrencyCodeHelper.set(!this.showEscrowCurrencyCodeHelper());
     }

     toggleAmountHelper() {
          this.showEscrowAmountHelper.set(!this.showEscrowAmountHelper());
     }

     toggleIssuerHelper() {
          this.showEscrowIssuerHelper.set(!this.showEscrowIssuerHelper());
     }

     toggleMptHelper() {
          this.showEscrowMptHelper.set(!this.showEscrowMptHelper());
     }

     toggleDestinationHelper() {
          this.showEscrowDestinationHelper.set(!this.showEscrowDestinationHelper());
     }

     toggleDestinationTagHelper() {
          this.showEscrowDestTagHelper.set(!this.showEscrowDestTagHelper());
     }

     toggleConditionHelper() {
          this.showEscrowConditionHelper.set(!this.showEscrowConditionHelper());
     }

     toggleFulfillmentHelper() {
          this.showEscrowFulfillmentHelper.set(!this.showEscrowFulfillmentHelper());
     }
}
