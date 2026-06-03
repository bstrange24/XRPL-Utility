import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import * as xrpl from 'xrpl';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainUtilService } from '../../../../services/permissioned-domain/permissioned-domain-util/permissioned-domain-util.service';
import { PermissionedDomainViewModelService } from '../../../../services/permissioned-domain/permissioned-domain-view-model/permissioned-domain-view-model.service';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AppConstants } from '../../../../core/app.constants';
import { ToastService } from '../../../../services/utils/toast/toast.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { CREDENTIAL_TYPE_VALADATION } from '../../../credentials/constants/credential.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { CredentialValidatorService } from '../../../../services/shared/validators/credential-validator/credential-validator.service';

@Component({
     selector: 'app-permission-domain-set-form',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, ReactiveFormsModule, NgIcon, LucideAngularModule, SelectSearchDropdownComponent, FocusBorderDirective, InputIconsComponent, ValidationErrorsComponent],
     templateUrl: './permission-domain-set-form.component.html',
     styleUrl: './permission-domain-set-form.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionDomainSetFormComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
     public readonly permissionedDomainViewModelService = inject(PermissionedDomainViewModelService);
     public readonly credentialValidatorService = inject(CredentialValidatorService);
     public readonly toastService = inject(ToastService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     private readonly fb = inject(FormBuilder);

     readonly issuerHelperItems = AppConstants.CREDENTIAL_ISSUER_HELPER_ITEMS;
     readonly credentialTypeHelperItems = AppConstants.CREDENTIAL_TYPE_HELPER_ITEMS;

     view = input.required<any>();
     issuerInput = signal('');
     destinationItems = input.required<SelectItem[]>();
     wantsOptions = input.required<boolean>();
     canSubmit = input<boolean>(false);
     tab = input.required<string>();

     performAction = output<void>();
     clearFields = output<void>();
     canSetPermissionDomainChange = output<boolean>();
     toggleOptions = output<boolean>();

     form: FormGroup = this.fb.group({
          credentials: this.fb.array([]),
     });

     // UI State
     issuerItem = signal<SelectItem | null>(null);
     issuerAddress = computed(() => {
          return this.issuerItem()?.id?.trim() ?? '';
     });
     credentialType = signal('');
     isIssuerValid = signal(true);
     showIssuerHelper = signal(false);
     showCredentialTypeHelper = signal(false);

     private readonly optionsHasError = signal(false);
     private readonly optionsErrors = signal<string[]>([]);

     warningMessage = 'Updating will completely replace the existing AcceptedCredentials list for this domain.';
     readonly safeWarningMessage = computed(() => this.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;'));

     constructor() {
          /**
           * Auto-clear visual form if store resets.
           */
          effect(() => {
               const creds = this.permissionedDomainStoreService.getAll().setAcceptedCredentials ?? [];

               if (creds.length === 0) {
                    this.clearVisualForm();
               }
          });

          /**
           * Emit submit validity.
           */
          effect(() => {
               this.canSetPermissionDomainChange.emit(this.canSetDomain());
          });
     }

     isCredentialTypeValid = computed(() => {
          const type = this.credentialType().trim();

          if (!type) return true;

          return type.length <= CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH && CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_PATTERN.test(type);
     });

     isCredentialTypeInvalid = computed(() => {
          const type = this.credentialType().trim();

          if (!type) return false;

          return !this.isCredentialTypeValid();
     });

     credentialTypeErrorMessage = computed(() => {
          const type = this.credentialType().trim();

          if (!type) return '';

          if (type.length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) {
               return `Credential type must be ${CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH} characters or less`;
          }

          if (!CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_PATTERN.test(type)) {
               return 'Credential type can only contain letters, numbers, hyphens, and underscores';
          }

          return '';
     });

     pendingCredential = computed(() => {
          const issuer = this.issuerAddress();
          const credentialType = this.credentialType().trim();

          if (!issuer) return null;

          if (!xrpl.isValidAddress(issuer)) return null;

          if (!credentialType) return null;

          if (!this.isCredentialTypeValid()) return null;

          return {
               issuer,
               credentialType,
          };
     });

     isPendingCredentialDuplicate = computed(() => {
          const pending = this.pendingCredential();

          if (!pending) return false;

          return this.credentialsArray.value.some((cred: any) => cred.issuer === pending.issuer && cred.credentialType === pending.credentialType);
     });

     canAddCredential = computed(() => {
          if (!this.pendingCredential()) return false;

          if (this.credentialsArray.length >= CREDENTIAL_TYPE_VALADATION.MAX_CREDENTIALS) {
               return false;
          }

          if (this.isPendingCredentialDuplicate()) {
               return false;
          }

          return true;
     });

     canSetDomain = computed(() => {
          const hasAtLeastOneCredential = this.credentialsArray.length > 0 || !!this.pendingCredential();

          if (!hasAtLeastOneCredential) {
               return false;
          }

          if (this.permissionedDomainStoreService.domainMode() === 'update') {
               if (!this.permissionedDomainStoreService.domainId()) {
                    return false;
               }
          }

          if (this.validationErrorMessages().length > 0) {
               return false;
          }

          if (this.wantsOptions() && this.optionsHasError()) {
               return false;
          }

          return true;
     });

     hasRealValidationErrors = computed(() => {
          const errors = this.validationErrorMessages();

          // Filter out "empty required field" style messages if you have any
          return errors.length > 0;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          const issuerRaw = this.issuerInput().trim();
          const typeRaw = this.credentialType().trim();

          // Issuer error only if something is typed and invalid
          if (issuerRaw && !xrpl.isValidAddress(issuerRaw)) {
               errors.push('Issuer address is not a valid XRP address');
          }

          // Credential Type error only if something is typed and invalid
          if (typeRaw && this.isCredentialTypeInvalid()) {
               const msg = this.credentialTypeErrorMessage();
               if (msg) errors.push(msg);
          }

          // Max credentials
          if (this.credentialsArray.length > CREDENTIAL_TYPE_VALADATION.MAX_CREDENTIALS) {
               errors.push(`Maximum of ${CREDENTIAL_TYPE_VALADATION.MAX_CREDENTIALS} credentials allowed per domain`);
          }

          // Pending credential duplicate
          const pending = this.pendingCredential();
          if (pending && this.isPendingCredentialDuplicate()) {
               errors.push(`Credential "${pending.credentialType}" already exists for issuer ${pending.issuer.substring(0, 10)}...`);
          }

          // Duplicates in added list
          const seen = new Set<string>();
          for (const cred of this.credentialsArray.value) {
               const key = `${cred.issuer}|${cred.credentialType}`;
               if (seen.has(key)) {
                    errors.push(`Duplicate credential "${cred.credentialType}" detected`);
                    break;
               }
               seen.add(key);
          }

          // Options errors
          if (this.wantsOptions() && this.optionsHasError()) {
               errors.push(...this.optionsErrors());
          }

          return errors;
     });

     hasValidationErrors = computed(() => {
          return this.validationErrorMessages().length > 0;
     });

     isCredentialTypeLengthValid() {
          const trimmed = this.credentialType().trim();
          if (trimmed.length >= 64) {
               return `Credential type exceeds 64 character limit (currently ${trimmed.length} characters)`;
          }
          return '';
     }

     onIssuerValidationChange(isValid: boolean) {
          this.isIssuerValid.set(isValid);
     }

     onNewIssuerSelected(item: SelectItem | null) {
          this.issuerItem.set(item);
     }

     onCredentialTypeInput(event: Event) {
          const input = event.target as HTMLInputElement;

          let value = input.value.trim();

          if (value.length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) {
               value = value.slice(0, CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH);

               input.value = value;
          }

          this.credentialType.set(value);
     }

     clearCredentialType() {
          this.credentialType.set('');
     }

     get credentialsArray(): FormArray {
          return this.form.get('credentials') as FormArray;
     }

     addCredential() {
          const pending = this.pendingCredential();

          if (!pending) return;

          if (this.isPendingCredentialDuplicate()) {
               this.toastService.error(`Credential "${pending.credentialType}" already exists`, AppConstants.TOAST.ERROR);

               return;
          }

          const group = this.fb.group({
               issuer: [pending.issuer, [Validators.required]],
               credentialType: [pending.credentialType, [Validators.required]],
          });

          this.credentialsArray.push(group);

          this.syncToStore();

          this.resetInputFields();
     }

     removeCredential(index: number) {
          this.credentialsArray.removeAt(index);

          this.syncToStore();
     }

     private syncToStore() {
          const credentials = this.credentialsArray.value.map((c: any) => ({
               issuer: c.issuer,
               credentialType: c.credentialType,
          }));

          this.permissionedDomainStoreService.setField('setAcceptedCredentials', credentials);
     }

     private resetInputFields() {
          this.issuerItem.set(null);

          this.credentialType.set('');

          this.isIssuerValid.set(true);

          this.form.markAsUntouched();

          this.form.markAsPristine();
     }

     clearVisualForm() {
          while (this.credentialsArray.length > 0) {
               this.credentialsArray.removeAt(0);
          }

          this.resetInputFields();

          this.form.reset();
     }

     selectedUpdateDomain = computed(() => {
          const id = this.permissionedDomainStoreService.domainId();

          if (!id) return null;

          return this.permissionedDomainViewModelService.domainItems().find((d: { id: string }) => d.id === id) ?? null;
     });

     onUpdateDomainSelected(item: SelectItem | null) {
          this.permissionedDomainStoreService.setField('domainId', item?.id ?? '');
     }

     clearSelectedDomain() {
          this.permissionedDomainStoreService.setField('domainId', '');
     }

     onModeChange() {
          if (this.permissionedDomainStoreService.domainMode() === 'create') {
               this.clearSelectedDomain();
          }
     }

     hasAnyOptionEnabled = computed(() => {
          return this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled();
     });

     onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
          this.optionsHasError.set(validation.hasError);

          this.optionsErrors.set(validation.errors || []);
     }

     toggleIssuerHelper() {
          this.showIssuerHelper.set(!this.showIssuerHelper());
     }

     toggleCredentialTypeHelper() {
          this.showCredentialTypeHelper.set(!this.showCredentialTypeHelper());
     }

     getPendingCredential(): { issuer: string; credentialType: string } | null {
          const issuer = this.issuerAddress().trim();
          const credentialType = this.credentialType().trim();

          if (!issuer || !credentialType) {
               return null;
          }

          if (!xrpl.isValidAddress(issuer)) {
               return null;
          }

          if (!this.isCredentialTypeValid()) {
               return null;
          }

          return {
               issuer,
               credentialType,
          };
     }

     getAllCredentialsForSubmit(): Array<{ issuer: string; credentialType: string }> {
          const credentials = this.credentialsArray.controls.map(control => ({
               issuer: control.get('issuer')?.value,
               credentialType: control.get('credentialType')?.value,
          }));

          const pendingCredential = this.getPendingCredential();

          if (!pendingCredential) {
               return credentials;
          }

          const alreadyExists = credentials.some(credential => credential.issuer === pendingCredential.issuer && credential.credentialType === pendingCredential.credentialType);

          if (!alreadyExists) {
               credentials.push(pendingCredential);
          }

          return credentials;
     }
}
