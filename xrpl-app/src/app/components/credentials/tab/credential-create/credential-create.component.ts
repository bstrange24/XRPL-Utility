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
import { CREDENTIAL_TYPE_VALADATION } from '../../constants/credential.constants';

@Component({
     selector: 'app-credential-create',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule, NgIcon, ToggleSliderComponent, LucideAngularModule, FocusBorderDirective],
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

     private isSubjectValid = signal(false);
     private optionsHasError = signal(false);
     private optionsErrorMsg = signal('');
     private optionsErrors = signal<string[]>([]);

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

     onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
          this.optionsHasError.set(validation.hasError);
          this.optionsErrorMsg.set(validation.message || '');
          this.optionsErrors.set(validation.errors || []);
     }

     // Credential Type Validation
     onCredentialTypeInput(event: Event) {
          const input = event.target as HTMLInputElement;
          let value = input.value;

          // Trim whitespace and limit length
          value = value.trim();
          if (value.length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) {
               value = value.slice(0, CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH);
               input.value = value;
          }

          this.credentialUtilService.setCredentialType(value);
     }

     isCredentialTypeValid = computed(() => {
          const type = this.credentialStore.credentialType()?.trim() ?? '';
          if (!type) return true;
          if (type.length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) return false;
          return CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_PATTERN.test(type);
     });

     isCredentialTypeInvalid = computed(() => {
          const type = this.credentialStore.credentialType()?.trim() ?? '';
          if (!type) return false; // Don't show error for empty field
          return !this.isCredentialTypeValid();
     });

     credentialTypeErrorMessage = computed(() => {
          const type = this.credentialStore.credentialType()?.trim() ?? '';
          if (!type) return '';
          if (type.length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) {
               return `Credential type must be ${CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH} characters or less (currently ${type.length})`;
          }
          if (!CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_PATTERN.test(type)) {
               return 'Credential type can only contain letters, numbers, hyphens, and underscores';
          }
          return '';
     });

     canCreateCredential = computed(() => {
          // Must have valid subject (XRP address)
          if (!this.isSubjectValid()) return false;

          // Credential type is optional but if provided must be valid
          const type = this.credentialStore.credentialType()?.trim() ?? '';
          if (type && !this.isCredentialTypeValid()) return false;

          // Check options validation if enabled
          if (this.txUiService.wantsOptions() && this.optionsHasError()) return false;

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Subject validation error
          if (!this.isSubjectValid()) {
               errors.push('Subject address is invalid. Please enter a valid XRP address.');
          }

          // Credential type validation error
          if (this.isCredentialTypeInvalid()) {
               errors.push(this.credentialTypeErrorMessage());
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
          if (this.isCredentialTypeInvalid()) return true;
          if (this.txUiService.wantsOptions() && this.optionsHasError()) return true;
          return false;
     });

     hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled());
}
