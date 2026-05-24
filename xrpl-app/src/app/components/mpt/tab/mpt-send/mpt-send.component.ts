import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, ViewChild } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { MptSendValidatorService } from '../../../../services/shared/validators/mpt/mpt-send-validator/mpt-send-validator.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { NgIcon } from '@ng-icons/core';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { MptAuthorizeValidatorService } from '../../../../services/shared/validators/mpt/mpt-authorize-validator/mpt-authorize-validator.service';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-mpt-send',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, SelectSearchDropdownComponent, FocusBorderDirective, NgIcon],
     templateUrl: './mpt-send.component.html',
     styleUrl: './mpt-send.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptSendComponent {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly mptUtil = inject(MptUtilService);
     public readonly mptSendValidator = inject(MptSendValidatorService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly mptAuthorizeValidator = inject(MptAuthorizeValidatorService);
     public readonly utilsService = inject(UtilsService);

     // Inputs from parent
     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly mptItems = input.required<SelectItem[]>();
     readonly currentAddress = input<string>('');
     readonly selectedDestinationAddr = input<string>();
     readonly lastIntendedDestination = input<string>('');

     // Outputs to parent
     readonly selectedDestinationAddress = output<string>();
     readonly onMptSelected = output<SelectItem | null>();
     readonly canSendMptChange = output<boolean>();
     readonly validationErrorsChange = output<string[]>();

     readonly clearFields = output<void>();
     readonly searchQueryChange = output<string>();
     readonly destinationChange = output<any>();
     readonly toggleOptions = output<boolean>();
     readonly canSendXrpChange = output<boolean>();
     readonly destinationSearchQuery = input<string>();

     // Helper Items
     readonly mptSelectHelperItems = AppConstants.MPT_SEND_SELECT_HELPER_ITEMS;
     readonly mptIssuanceIdHelperItems = AppConstants.MPT_ISSUANCE_ID_SEND_HELPER_ITEMS;
     readonly mptDestinationHelperItems = AppConstants.MPT_DESTINATION_SEND_HELPER_ITEMS;
     readonly mptAmountHelperItems = AppConstants.MPT_AMOUNT_SEND_HELPER_ITEMS;

     // UI State
     isMptIssuanceIdFocused = signal(false);
     isDestinationValid = signal(false);
     showMptSelectHelper = signal(false);
     showMptIssuanceIdHelper = signal(false);
     showMptDestinationHelper = signal(false);
     showMptAmountHelper = signal(false);

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
               // this.mptStoreService.setField('', '');
               this.mptStoreService.setField('mptIssuanceId', '');
               this.mptStoreService.setField('amount', '');
               return;
          }

          // if (item) {
          this.mptIssuanceId = item.id;
          // }
          this.onMptSelected.emit(item);
     }

     clearField(field: 'mptIssuanceId' | 'amount' | 'destination') {
          if (field === 'mptIssuanceId') {
               this.mptIssuanceId = '';
               this.amount = '';
          } else if (field === 'amount') {
               this.amount = '';
          } else if (field === 'destination') {
               this.destination = '';
               this.amount = '';
          }
     }

     setPresetAmount(amount: number) {
          this.amount = amount.toString();
     }

     toggleMptHelper() {
          this.showMptSelectHelper.set(!this.showMptSelectHelper());
     }

     toggleMptIssuanceHelper() {
          this.showMptIssuanceIdHelper.set(!this.showMptIssuanceIdHelper());
     }

     toggleDestinationHelper() {
          this.showMptDestinationHelper.set(!this.showMptDestinationHelper());
     }

     toggleAmountHelper() {
          this.showMptAmountHelper.set(!this.showMptAmountHelper());
     }

     // Get available balance for selected MPT
     getAvailableBalance(): string {
          const selectedMpt = this.viewModel.mptItems().find(item => item.id === this.mptIssuanceId);
          if (!selectedMpt) return '0';

          // Extract amount from display string (e.g., "MPT • 1000 held" -> "1000")
          const match = selectedMpt.display.match(/MPT • ([\d.]+)/);
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
