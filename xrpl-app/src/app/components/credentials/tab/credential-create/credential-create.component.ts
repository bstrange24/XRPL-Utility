import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CredentialStore } from '../../../../services/credentials/credential-store/credential-store.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { NgIcon } from '@ng-icons/core';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { CredentialValidatorService } from '../../../../services/shared/validators/credential-validator/credential-validator.service';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';

@Component({
     selector: 'app-credential-create',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, FieldHelperComponent, TransactionOptionsSectionComponent, MatSlideToggleModule, NgIcon, ToggleSliderComponent, LucideAngularModule, FocusBorderDirective, InputIconsComponent, ValidationErrorsComponent],
     templateUrl: './credential-create.component.html',
     styleUrl: './credential-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialCreateComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly credentialValidatorService = inject(CredentialValidatorService);

     readonly subjectHelperItems = AppConstants.SUBJECT_HELPER_ITEMS;
     readonly credentialTypeHelperItems = AppConstants.CREDENTIAL_TYPE_HELPER_ITEMS;
     readonly optionalFieldsHelperItems = AppConstants.OPTIONAL_FIELDS_HELPER_ITEMS;

     // Inputs from parent
     view = input.required<any>();
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     wantsOptions = input.required<boolean>();
     canSubmit = input<boolean>(false);
     tab = input.required<string>();
     selectedDestinationAddress = input<string>();
     currentAddress = input<string>('');
     lastIntendedDestination = input<string>('');

     // Track destination validation status from dropdown
     isDestinationValid = signal(false);

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     optionsToggled = output<boolean>();
     toggleOptions = output<boolean>();
     canCreateCredentialChange = output<boolean>();

     // UI State
     private readonly isSubjectValid = signal(false);
     private readonly optionsHasError = signal(false);
     private readonly optionsErrorMsg = signal('');
     private readonly optionsErrors = signal<string[]>([]);
     readonly showSubjectHelper = signal(false);
     readonly showCredentialTypeHelper = signal(false);
     readonly showOptionalFieldsHelper = signal(false);

     constructor() {
          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canCreateCredentialChange.emit(this.canCreateCredential());
          });
     }

     // Forward events to parent
     handleSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
     }

     handleDestinationChange(item: any) {
          this.destinationChange.emit(item);
     }

     onSubjectValidationChange(isValid: boolean) {
          this.isSubjectValid.set(isValid);
     }

     onOptionsToggled(enabled: boolean) {
          this.txUiService.toggleOptions(enabled);
          this.optionsToggled.emit(enabled);
     }

     toggleSubjectHelper() {
          this.showSubjectHelper.set(!this.showSubjectHelper());
     }

     toggleCredentialTypeHelper() {
          this.showCredentialTypeHelper.set(!this.showCredentialTypeHelper());
     }

     toggleOptionalFieldsHelper() {
          this.showOptionalFieldsHelper.set(!this.showOptionalFieldsHelper());
     }

     isCredentialTypeLengthValid() {
          return this.credentialValidatorService.isCredentialTypeLengthValid();
     }

     onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
          this.optionsHasError.set(validation.hasError);
          this.optionsErrorMsg.set(validation.message || '');
          this.optionsErrors.set(validation.errors || []);
     }

     canCreateCredential = computed(() => {
          const subjectValid = this.isSubjectValid(); // from dropdown
          const type = this.credentialStore.credentialType()?.trim() ?? '';

          // NEW: Require both fields to be non-empty + valid
          if (!subjectValid) return false;
          if (!type) return false; // ← empty Credential Type disables button

          // Only block on actual validation errors (not empty)
          if (this.credentialValidatorService.isCredentialTypeInvalid()) return false;

          if (this.txUiService.wantsOptions() && this.optionsHasError()) return false;

          return true;
     });

     shouldShowCredentialTypeError = computed(() => {
          const type = this.credentialStore.credentialType()?.trim() ?? '';
          return type.length > 0 && this.credentialValidatorService.isCredentialTypeInvalid();
     });

     isCredentialTypeValidForStyling = computed(() => {
          const type = this.credentialStore.credentialType()?.trim() ?? '';
          return type.length === 0 || this.credentialValidatorService.isCredentialTypeValid();
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Only show subject error if it's invalid (not just empty)
          if (!this.isSubjectValid() && this.selectedDestinationAddress()?.trim()) {
               errors.push('Subject address is invalid.');
          }

          // Credential type validation error
          if (this.credentialValidatorService.isCredentialTypeInvalid() || this.shouldShowCredentialTypeError()) {
               errors.push(this.credentialValidatorService.credentialTypeErrorMessage());
          }

          // Options errors (URI, expiration, etc.)
          if (this.txUiService.wantsOptions() && this.optionsHasError()) {
               errors.push(...this.optionsErrors());
          }

          return errors;
     });

     // Check if there are any validation errors
     hasValidationErrors = computed(() => {
          if (!this.isSubjectValid()) return true;
          if (this.credentialValidatorService.isCredentialTypeInvalid()) return true;
          if (this.txUiService.wantsOptions() && this.optionsHasError()) return true;
          return false;
     });

     hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled());
}
