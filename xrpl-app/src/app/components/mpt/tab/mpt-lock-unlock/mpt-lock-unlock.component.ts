import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { LucideAngularModule } from 'lucide-angular';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MptAuthorizeValidatorService } from '../../../../services/shared/validators/mpt/mpt-authorize-validator/mpt-authorize-validator.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';

@Component({
     selector: 'app-mpt-lock-unlock',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, NgIcon, LucideAngularModule, SelectSearchDropdownComponent, FocusBorderDirective, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './mpt-lock-unlock.component.html',
     styleUrl: './mpt-lock-unlock.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptLockUnlockComponent {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly mptTransactionViewModelService = inject(MptTransactionViewModelService);
     public readonly mptAuthorizeValidator = inject(MptAuthorizeValidatorService);

     // Inputs from parent
     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly availableMpts = input<any[]>([]);
     readonly currentAddress = input<string>('');
     readonly selectedDestinationAddr = input<string>();
     readonly lastIntendedDestination = input<string>('');

     // Outputs to parent
     readonly selectedDestinationAddress = output<string>();
     readonly selectedMPT = output<SelectItem | null>();
     readonly canAuthorizeChange = output<boolean>();
     readonly validationErrorsChange = output<string[]>();

     readonly clearFields = output<void>();
     readonly searchQueryChange = output<string>();
     readonly destinationChange = output<any>();
     readonly toggleOptions = output<boolean>();
     readonly canSendXrpChange = output<boolean>();
     readonly destinationSearchQuery = input<string>();

     // UI State
     showAmountHelper = signal(false);
     showMptHelper = signal(false);
     isMptIssuanceIdFocused = signal(false);
     isDestinationValid = signal(false);
     showMptLockActionHelper = signal(false);
     showMptDestinationHelper = signal(false);
     showMptIssuanceIdHelper = signal(false);

     // Preset examples for MPT Issuance ID
     readonly mptIdExamples = AppConstants.MPT_ID_EXAMPLES;
     readonly mptLockActionHelperItems = AppConstants.MPT_LOCK_ACTION_HELPER_ITEMS;
     readonly mptDestinationHelperItems = AppConstants.MPT_DESTINATION_LOCK_UNLOCK_HELPER_ITEMS;
     readonly mptIssuanceIdHelperItems = AppConstants.MPT_ISSUANCE_ID_LOCK_UNLOCK_HELPER_ITEMS;

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canAuthorizeChange.emit(this.mptAuthorizeValidator.canAuthorize());
               this.validationErrorsChange.emit(this.mptAuthorizeValidator.getAllValidationErrors());
          });
     }

     readonly selectedMpt = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId) return null;

          // Get the full MPT object from the summary data
          const mpts = this.mptTransactionViewModelService?.infoData()?.mptsToShow || this.availableMpts();
          return mpts.find(m => m.mpt_issuance_id === issuanceId || m.id === issuanceId) || null;
     });

     // Local getters for cleaner template
     get lockAction() {
          return this.mptStoreService.lockAction();
     }

     setLockAction(action: 'lock' | 'unlock') {
          this.mptStoreService.setField('lockAction', action);
     }

     get destination() {
          return this.mptStoreService.destination();
     }

     set destination(value: string) {
          this.mptStoreService.setField('destination', value);
     }

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
          this.mptAuthorizeValidator.setDestinationValidation(isValid);
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

     toggleMptHelper() {
          this.showMptHelper.set(!this.showMptHelper());
     }

     // Toggle Methods
     toggleActionHelper() {
          this.showMptLockActionHelper.set(!this.showMptLockActionHelper());
     }

     toggleDestinationHelper() {
          this.showMptDestinationHelper.set(!this.showMptDestinationHelper());
     }

     toggleMptIssuanceHelper() {
          this.showMptIssuanceIdHelper.set(!this.showMptIssuanceIdHelper());
     }

     // Get MPT display info for the info box
     getMptDisplayInfo() {
          const mpt = this.selectedMpt();
          if (!mpt) return null;

          return {
               id: mpt.mpt_issuance_id || mpt.id,
               assetScale: mpt.AssetScale || mpt.assetScale || 0,
               maxAmount: mpt.MaximumAmount || mpt.maximumAmount || mpt.formattedMaxAmount || 'Unlimited',
               outstanding: mpt.formattedAmount || mpt.formattedOutstanding || '0',
          };
     }
}
