import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { NgIcon } from '@ng-icons/core';
import { MptAuthorizeValidatorService } from '../../../../services/shared/validators/mpt/mpt-authorize-validator/mpt-authorize-validator.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-mpt-destroy',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, NgIcon, LucideAngularModule, SelectSearchDropdownComponent, FocusBorderDirective],
     templateUrl: './mpt-destroy.component.html',
     styleUrl: './mpt-destroy.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptDestroyComponent {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly mptTransactionViewModelService = inject(MptTransactionViewModelService);
     public readonly mptAuthorizeValidator = inject(MptAuthorizeValidatorService);

     // Inputs from parent
     readonly destinationItems = input.required<SelectItem[]>();
     readonly mptItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly availableMpts = input<any[]>([]);
     readonly currentAddress = input<string>('');
     readonly selectedDestinationAddr = input<string>();
     readonly lastIntendedDestination = input<string>('');
     // Outputs to parent
     readonly selectedDestinationAddress = output<string>();
     readonly onMptSelected = output<SelectItem | null>();
     readonly validationErrorsChange = output<string[]>();
     readonly confirmDestroy = output<void>();
     readonly clearFields = output<void>();
     readonly searchQueryChange = output<string>();
     readonly destinationChange = output<any>();
     readonly toggleOptions = output<boolean>();
     readonly canSendXrpChange = output<boolean>();
     readonly destinationSearchQuery = input<string>();

     // Helper Items
     readonly mptDestroySelectHelperItems = AppConstants.MPT_DESTROY_SELECT_HELPER_ITEMS;
     readonly mptIssuanceIdHelperItems = AppConstants.MPT_DESTROY_ISSUANCE_ID_HELPER_ITEMS;

     // UI State
     showDestinationHelper = signal(false);
     showAmountHelper = signal(false);
     showMptHelper = signal(false);
     showMptDestroySelectHelper = signal(false);
     showMptIssuanceIdHelper = signal(false);
     isMptIssuanceIdFocused = signal(false);
     isDestinationValid = signal(false);

     // Preset examples for MPT Issuance ID
     readonly mptIdExamples = AppConstants.MPT_ID_EXAMPLES;

     constructor() {
          // Emit validation status changes
          effect(() => {
               // this.canAuthorizeChange.emit(this.mptAuthorizeValidator.canAuthorize());
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
     destroyWarningMessage = computed(() => {
          return this.mptUtilService.getDestroyWarningMessage();
     });

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

     onMptSelection(item: SelectItem | null) {
          if (!item?.id) {
               // this.mptStoreService.setField('', '');
               this.mptStoreService.setField('mptIssuanceId', '');
               return;
          }
          this.onMptSelected.emit(item);
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

     toggleDestinationHelper() {
          this.showDestinationHelper.set(!this.showDestinationHelper());
     }

     // Toggle Methods
     toggleMptSelectHelper() {
          this.showMptDestroySelectHelper.set(!this.showMptDestroySelectHelper());
     }

     toggleMptIssuanceHelper() {
          this.showMptIssuanceIdHelper.set(!this.showMptIssuanceIdHelper());
     }

     // Add computed for tracked holders
     trackedHolders = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId) return [];
          return this.mptStoreService.getAuthorizedHolders(issuanceId);
     });
}
