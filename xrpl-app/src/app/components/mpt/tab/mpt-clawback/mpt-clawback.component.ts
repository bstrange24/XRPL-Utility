import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { MptSendValidatorService } from '../../../../services/shared/validators/mpt/mpt-send-validator/mpt-send-validator.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { NgIcon } from '@ng-icons/core';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { MptAuthorizeValidatorService } from '../../../../services/shared/validators/mpt/mpt-authorize-validator/mpt-authorize-validator.service';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';

@Component({
     selector: 'app-mpt-clawback',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, NgIcon, FocusBorderDirective, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './mpt-clawback.component.html',
     styleUrl: './mpt-clawback.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptClawbackComponent {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly mptUtil = inject(MptUtilService);
     public readonly mptSendValidator = inject(MptSendValidatorService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly mptAuthorizeValidator = inject(MptAuthorizeValidatorService);
     public readonly utilsService = inject(UtilsService);

     // Helper Items
     readonly mptClawbackSelectHelperItems = AppConstants.MPT_CLAWBACK_SELECT_HELPER_ITEMS;
     readonly mptIssuanceIdHelperItems = AppConstants.MPT_ISSUANCE_ID_CLAWBACK_HELPER_ITEMS;
     readonly mptHolderHelperItems = AppConstants.MPT_HOLDER_HELPER_ITEMS;
     readonly mptClawbackAmountHelperItems = AppConstants.MPT_CLAWBACK_AMOUNT_HELPER_ITEMS;

     // Inputs from parent
     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly mptItems = input.required<SelectItem[]>();
     readonly currentAddress = input<string>('');
     readonly selectedDestinationAddr = input<string>();
     readonly lastIntendedDestination = input<string>('');

     // Outputs to parent
     readonly selectedDestinationAddress = output<string>();
     readonly selectedMPT = output<SelectItem | null>();
     readonly canSendMptChange = output<boolean>();
     readonly validationErrorsChange = output<string[]>();

     readonly clearFields = output<void>();
     readonly searchQueryChange = output<string>();
     readonly destinationChange = output<any>();
     readonly toggleOptions = output<boolean>();
     readonly canSendXrpChange = output<boolean>();
     readonly destinationSearchQuery = input<string>();

     // UI Signals
     showMptClawbackSelectHelper = signal(false);
     showMptIssuanceIdHelper = signal(false);
     showMptHolderHelper = signal(false);
     showMptClawbackAmountHelper = signal(false);
     isMptIssuanceIdFocused = signal(false);
     isDestinationValid = signal(false);
     isFocused = signal(false);

     // Preset amounts
     readonly amountPresets = [10, 100, 1000, 10000, 100000];
     // Preset examples for MPT Issuance ID
     readonly mptIdExamples = AppConstants.MPT_ID_EXAMPLES;

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canSendMptChange.emit(this.mptSendValidator.canSendMpt());
               this.validationErrorsChange.emit(this.mptSendValidator.getAllValidationErrors());
          });
     }

     set mptIssuanceId(value: string) {
          this.mptStoreService.setField('mptIssuanceId', value);
     }

     get amount() {
          return this.mptStoreService.amount();
     }

     set amount(value: string) {
          this.mptStoreService.setField('amount', value);
     }

     get destination() {
          return this.mptStoreService.destination();
     }

     set destination(value: string) {
          this.mptStoreService.setField('destination', value);
     }

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
          this.mptSendValidator.setDestinationValidation(isValid);
     }

     onDestinationChange(item: SelectItem | null) {
          const address = item?.id || '';
          this.destination = address;
          this.selectedDestinationAddress.emit(address);
     }

     onSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
          // Also update store in real-time for validation
          this.mptStoreService.setField('destination', query);
     }

     // MPT Issuance ID handlers
     get mptIssuanceId() {
          return this.mptStoreService.mptIssuanceId();
     }

     setMptIssuanceId(value: string) {
          this.mptStoreService.setField('mptIssuanceId', value);
     }

     onMptIssuanceIdBlur() {
          this.isMptIssuanceIdFocused.set(false);
          this.mptAuthorizeValidator.validateMptIssuanceId(this.mptIssuanceId);
     }

     onMptIssuanceIdFocus() {
          this.isMptIssuanceIdFocused.set(true);
     }

     clearMptIssuanceId() {
          this.setMptIssuanceId('');
     }

     setExampleMptId(example: string) {
          this.setMptIssuanceId(example);
     }

     onMptSelection(item: SelectItem | null) {
          if (!item?.id) {
               this.mptStoreService.setField('mptIssuanceId', '');
               this.mptStoreService.setField('amount', '');
               return;
          }

          this.mptIssuanceId = item.id;
          this.selectedMPT.emit(item);
     }

     clearField(field: 'mptIssuanceId' | 'amount' | 'destination') {
          if (field === 'mptIssuanceId') {
               this.mptIssuanceId = '';
          } else if (field === 'amount') {
               this.amount = '';
          } else if (field === 'destination') {
               this.destination = '';
          }
     }

     setPresetAmount(amount: number) {
          this.amount = amount.toString();
     }

     toggleMptHelper() {
          this.showMptClawbackSelectHelper.set(!this.showMptClawbackSelectHelper());
     }

     toggleMptIssuanceHelper() {
          this.showMptIssuanceIdHelper.set(!this.showMptIssuanceIdHelper());
     }

     toggleDestinationHelper() {
          this.showMptHolderHelper.set(!this.showMptHolderHelper());
     }

     toggleAmountHelper() {
          this.showMptClawbackAmountHelper.set(!this.showMptClawbackAmountHelper());
     }

     // Get available balance for selected MPT
     getAvailableBalance(): string {
          const selectedMpt = this.viewModel.mptItems().find(item => item.id === this.mptIssuanceId);
          if (!selectedMpt) return '0';

          // Extract amount from display string (e.g., "MPT • 1000 held" -> "1000")
          const match = new RegExp(/MPT • ([\d.]+)/).exec(selectedMpt.display);
          return match ? match[1] : '0';
     }

     formatAmountWithScale(amount: string): string {
          const selectedMpt = this.viewModel.mptItems().find(item => item.id === this.mptIssuanceId);
          if (!selectedMpt || !amount) return amount;

          // Get asset scale from the MPT item
          const assetScale = (selectedMpt as any).assetScale ?? 0;
          const numAmount = Number(amount);

          if (assetScale === 0) return amount;

          return this.mptUtil.formatMptAmount(numAmount.toString(), assetScale);
     }
}
