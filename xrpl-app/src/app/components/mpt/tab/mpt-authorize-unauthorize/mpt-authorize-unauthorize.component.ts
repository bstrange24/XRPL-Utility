import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { NgIcon } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { MptAuthorizeValidatorService } from '../../../../services/shared/validators/mpt/mpt-authorize-validator/mpt-authorize-validator.service';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';

@Component({
     selector: 'app-mpt-authorize-unauthorize',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, NgIcon, LucideAngularModule, SelectSearchDropdownComponent, FocusBorderDirective, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './mpt-authorize-unauthorize.component.html',
     styleUrl: './mpt-authorize-unauthorize.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptAuthorizeUnauthorizeComponent {
     private readonly mptStoreService = inject(MptStoreService);
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
     readonly onMptSelected = output<SelectItem | null>();
     readonly canAuthorizeChange = output<boolean>();
     readonly validationErrorsChange = output<string[]>();

     readonly clearFields = output<void>();
     readonly searchQueryChange = output<string>();
     readonly destinationChange = output<any>();
     readonly toggleOptions = output<boolean>();
     readonly canSendXrpChange = output<boolean>();
     readonly destinationSearchQuery = input<string>();

     // UI State
     showDestinationHelper = signal(false);
     showAmountHelper = signal(false);
     showMptHelper = signal(false);
     isMptIssuanceIdFocused = signal(false);
     isDestinationValid = signal(false);
     showMptActionHelper = signal(false);
     showMptDestinationHelper = signal(false);
     showMptIssuanceIdHelper = signal(false);

     // Preset examples for MPT Issuance ID
     readonly mptIdExamples = AppConstants.MPT_ID_EXAMPLES;
     readonly mptActionHelperItems = AppConstants.MPT_ACTION_HELPER_ITEMS;
     readonly mptDestinationHelperItems = AppConstants.MPT_DESTINATION_HELPER_ITEMS;
     readonly mptIssuanceIdHelperItems = AppConstants.MPT_ISSUANCE_ID_HELPER_ITEMS;

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

          // 1. Try local cache (current wallet)
          const localMpts = this.mptTransactionViewModelService?.infoData()?.mptsToShow || this.availableMpts();
          let mpt = localMpts.find(m => m.mpt_issuance_id === issuanceId || m.id === issuanceId);

          // 2. Fallback to validator's fresh fetch (works across wallets)
          if (!mpt) {
               mpt = this.mptAuthorizeValidator.mptDetails();
          }

          // 3. Fallback to validator's raw fetched object
          if (!mpt) {
               const fetched = this.mptAuthorizeValidator.fetchedMptDetails();
               if (fetched) mpt = fetched.node || fetched;
          }

          console.log('Final selectedMpt resolved:', mpt ? 'FOUND' : 'NULL', issuanceId);
          return mpt || null;
     });

     readonly selectedMpt2 = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId) return null;

          // Get the full MPT object from the summary data
          const mpts = this.mptTransactionViewModelService?.infoData()?.mptsToShow || this.availableMpts();
          console.log('Finding MPT for issuance ID:', issuanceId, 'in MPTs:', mpts);
          return mpts.find(m => m.mpt_issuance_id === issuanceId || m.id === issuanceId) || null;
     });

     readonly requiresIssuerAuth = computed(() => {
          const mpt = this.selectedMpt();
          if (!mpt) return false;

          // Check by flag name or numeric flags value
          const hasRequireAuth = mpt.flags?.includes?.('isRequireAuth') || mpt.flags?.includes?.('tfMPTRequireAuth') || !!(mpt.Flags & 0x00000004) || !!(mpt.flags & 0x00000004);

          return hasRequireAuth;
     });

     readonly isHolderAuthorized = computed(() => {
          const mpt = this.selectedMpt();
          if (!mpt) return false;

          // Check if the destination is already authorized
          const destination = this.mptStoreService.destination();
          if (!destination) return false;

          // This would come from your MPT data - check if the holder is authorized
          return mpt.isAuthorized === true || mpt.Authorized === true;
     });

     // Local getters for cleaner template
     get authAction() {
          return this.mptStoreService.authAction();
     }

     setAuthAction(action: 'authorize' | 'unauthorize') {
          this.mptStoreService.setField('authAction', action);
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
          this.mptStoreService.setField('destination', query);
     }

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

     // Toggle Methods
     toggleMptHelper() {
          this.showMptHelper.set(!this.showMptHelper());
     }

     toggleActionHelper() {
          this.showMptActionHelper.set(!this.showMptActionHelper());
     }

     toggleDestinationHelper() {
          this.showMptDestinationHelper.set(!this.showMptDestinationHelper());
     }

     toggleMptIssuanceIdHelper() {
          this.showMptIssuanceIdHelper.set(!this.showMptIssuanceIdHelper());
     }

     // Get MPT display info for the info box - now uses validator's formatted details
     getMptDisplayInfo() {
          // First try to get from validator (which includes XRPL fetched data)
          const formattedDetails = this.mptAuthorizeValidator.getFormattedMptDetails();
          if (formattedDetails) {
               return formattedDetails;
          }

          // Fallback to local MPT from cache
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
