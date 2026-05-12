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

@Component({
     selector: 'app-permission-domain-set-form',
     standalone: true,
     imports: [CommonModule, FormsModule, ReactiveFormsModule, NgIcon, LucideAngularModule, SelectSearchDropdownComponent, FocusBorderDirective],
     templateUrl: './permission-domain-set-form.component.html',
     styleUrl: './permission-domain-set-form.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionDomainSetFormComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
     public readonly permissionedDomainViewModelService = inject(PermissionedDomainViewModelService);
     public readonly toastService = inject(ToastService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     private readonly fb = inject(FormBuilder);

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

     issuerItem = signal<SelectItem | null>(null);
     issuerAddress = computed(() => {
          return this.issuerItem()?.id?.trim() ?? '';
     });
     credentialType = signal('');
     isIssuerValid = signal(true);

     private optionsHasError = signal(false);
     private optionsErrors = signal<string[]>([]);

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
          if (this.hasValidationErrors()) {
               return false;
          }

          if (this.wantsOptions() && this.optionsHasError()) {
               return false;
          }

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          const issuerRaw = this.issuerInput().trim();

          if (issuerRaw && !xrpl.isValidAddress(issuerRaw)) {
               errors.push('Issuer address is not a valid XRP address');
          }

          if (this.credentialsArray.length > CREDENTIAL_TYPE_VALADATION.MAX_CREDENTIALS) {
               errors.push(`Maximum of ${CREDENTIAL_TYPE_VALADATION.MAX_CREDENTIALS} credentials allowed per domain`);
          }

          if (this.permissionedDomainStoreService.domainMode() === 'update') {
               if (!this.permissionedDomainStoreService.domainId()) {
                    errors.push('Please select a domain to update');
               }
          }

          const issuer = this.issuerAddress();
          if (issuer && !this.isIssuerValid()) {
               errors.push('Issuer address is not a valid XRP address');
          }

          if (this.credentialType().trim() && this.isCredentialTypeInvalid()) {
               const msg = this.credentialTypeErrorMessage();

               if (msg) {
                    errors.push(msg);
               }
          }

          const pending = this.pendingCredential();
          if (pending && this.isPendingCredentialDuplicate()) {
               errors.push(`Credential "${pending.credentialType}" already exists for issuer ${pending.issuer.substring(0, 10)}...`);
          }

          const seen = new Set<string>();
          for (const cred of this.credentialsArray.value) {
               const key = `${cred.issuer}|${cred.credentialType}`;

               if (seen.has(key)) {
                    errors.push(`Duplicate credential "${cred.credentialType}" detected`);
                    break;
               }

               seen.add(key);
          }

          if (this.wantsOptions() && this.optionsHasError()) {
               errors.push(...this.optionsErrors());
          }

          return errors;
     });

     hasValidationErrors = computed(() => {
          return this.validationErrorMessages().length > 0;
     });

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

// import { CommonModule } from '@angular/common';
// import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
// import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
// import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
// import { PermissionedDomainUtilService } from '../../../../services/permissioned-domain/permissioned-domain-util/permissioned-domain-util.service';
// import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
// import { PermissionedDomainViewModelService } from '../../../../services/permissioned-domain/permissioned-domain-view-model/permissioned-domain-view-model.service';
// import { LucideAngularModule } from 'lucide-angular';
// import { NgIcon } from '@ng-icons/core';
// import { AppConstants } from '../../../../core/app.constants';
// import { ToastService } from '../../../../services/utils/toast/toast.service';
// import * as xrpl from 'xrpl';
// import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
// import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
// import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
// import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
// import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
// import { CREDENTIAL_TYPE_VALADATION } from '../../../credentials/constants/credential.constants';

// @Component({
//      selector: 'app-permission-domain-set-form',
//      standalone: true,
//      imports: [CommonModule, FormsModule, NgIcon, SelectSearchDropdownComponent, ReactiveFormsModule, LucideAngularModule, FocusBorderDirective],
//      templateUrl: './permission-domain-set-form.component.html',
//      styleUrl: './permission-domain-set-form.component.css',
//      changeDetection: ChangeDetectionStrategy.OnPush,
// })
// export class PermissionDomainSetFormComponent {
//      public readonly connectionGuard = inject(ConnectionGuardService);
//      public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
//      public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
//      public readonly permissionedDomainViewModelService = inject(PermissionedDomainViewModelService);
//      public readonly toastService = inject(ToastService);
//      public readonly copyUtilService = inject(CopyUtilService);
//      public readonly txUiService = inject(TransactionUiService);
//      public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
//      private readonly fb = inject(FormBuilder);

//      // Inputs from parent
//      view = input.required<any>();
//      destinationItems = input.required<any[]>();
//      selectedDestinationItem = input.required<any>();
//      destinationSearchQuery = input.required<string>();
//      wantsOptions = input.required<boolean>();
//      canSubmit = input<boolean>(false);
//      tab = input.required<string>();
//      selectedDestinationAddress = input<string>();

//      warningMessage = 'Updating will completely replace the existing AcceptedCredentials list for this domain.';
//      readonly safeWarningMessage = computed(() => this.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

//      // Outputs to parent
//      performAction = output<void>();
//      clearFields = output<void>();
//      searchQueryChange = output<string>();
//      destinationChange = output<any>();
//      optionsToggled = output<boolean>();
//      toggleOptions = output<boolean>();
//      canSetPermissionDomainChange = output<boolean>();

//      form: FormGroup;
//      newCredentialType = signal('');
//      newIssuerItem = signal<SelectItem | null>(null);
//      newIssuer = computed(() => this.newIssuerItem()?.id ?? '');

//      // Validation signals
//      isIssuerValid = signal(true);
//      isCredentialTypeTouched = signal(false);
//      private optionsHasError = signal(false);
//      private optionsErrorMsg = signal('');
//      private optionsErrors = signal<string[]>([]);

//      constructor() {
//           this.form = this.fb.group({
//                credentials: this.fb.array([]),
//           });

//           // Auto-clear visual form whenever the store resets to empty
//           effect(() => {
//                const creds = this.permissionedDomainStoreService.getAll().setAcceptedCredentials ?? [];
//                if (creds.length === 0) {
//                     this.clearVisualForm();
//                }
//           });

//           // Emit overall validation status
//           effect(() => {
//                this.canSetPermissionDomainChange.emit(this.canSetDomain());
//           });
//      }

//      // Validation methods
//      onIssuerValidationChange(isValid: boolean) {
//           this.isIssuerValid.set(isValid);
//      }

//      isIssuerInvalid = computed(() => {
//           if (!this.newIssuer()) return false;
//           return !this.isIssuerValid();
//      });

//      onCredentialTypeChange() {
//           // Force trim to max length as defense
//           if (this.newCredentialType().length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) {
//                this.newCredentialType.set(this.newCredentialType().substring(0, CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH));
//           }
//      }

//      onCredentialTypeInput(event: Event) {
//           const input = event.target as HTMLInputElement;
//           let value = input.value;

//           // Trim whitespace and limit length
//           value = value.trim();
//           if (value.length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) {
//                value = value.slice(0, CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH);
//                input.value = value;
//           }

//           this.newCredentialType.set(value);
//      }

//      isCredentialTypeValid = computed(() => {
//           const type = this.newCredentialType()?.trim() ?? '';
//           if (!type) return true;
//           return type.length <= CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH && CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_PATTERN.test(type);
//      });

//      isCredentialTypeInvalid = computed(() => {
//           const type = this.newCredentialType()?.trim() ?? '';
//           if (!type) return false;
//           return !this.isCredentialTypeValid(); // remove the touched check for live feedback
//      });

//      credentialTypeErrorMessage = computed(() => {
//           const type = this.newCredentialType()?.trim() ?? '';
//           if (!type) return '';
//           if (type.length > CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH) {
//                return `Credential type must be ${CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_MAX_LENGTH} characters or less (currently ${type.length})`;
//           }
//           if (!CREDENTIAL_TYPE_VALADATION.CREDENTIAL_TYPE_PATTERN.test(type)) {
//                return 'Credential type can only contain letters, numbers, hyphens, and underscores';
//           }
//           return '';
//      });

//      canAddCredential = computed(() => {
//           // Check issuer
//           if (!this.newIssuer() || !xrpl.isValidAddress(this.newIssuer())) return false;
//           // Check credential type
//           if (!this.newCredentialType() || this.newCredentialType().trim() === '') return false;
//           if (!this.isCredentialTypeValid()) return false;
//           // Check limit
//           if (this.credentialsArray.length >= 10) return false;

//           const pendingCred = this.getPendingCredential();
//           if (pendingCred) {
//                // Check if pending credential already exists
//                const alreadyExists = this.credentialsArray.value.some((cred: any) => cred.issuer === pendingCred.issuer && cred.credentialType === pendingCred.credentialType);

//                if (alreadyExists) {
//                     return false;
//                }
//           }
//           return true;
//      });

//      canSetDomain = computed(() => {
//           // Check max limit
//           if (this.credentialsArray.length > 10) return false;

//           // For update mode, must have a domain selected
//           if (this.permissionedDomainStoreService.domainMode() === 'update') {
//                if (!this.permissionedDomainStoreService.domainId()) return false;
//           }

//           // Check for any pending credential that would be invalid
//           const pendingCred = this.getPendingCredential();
//           if (pendingCred !== null && pendingCred !== undefined) {
//                // If there's a pending credential, it means something is in the input fields
//                // But we haven't added it yet - check if it would cause duplicate
//                const wouldBeDuplicate = this.credentialsArray.value.some((cred: any) => cred.issuer === pendingCred.issuer && cred.credentialType === pendingCred.credentialType);
//                if (!wouldBeDuplicate) {
//                     // Pending credential would be added on submit
//                     return true;
//                }
//           }

//           // Check options validation if enabled
//           if (this.wantsOptions() && this.optionsHasError()) return false;

//           if (this.hasValidationErrors()) return false;

//           return true;
//      });

//      validationErrorMessages = computed(() => {
//           const errors: string[] = [];

//           // Check max credentials
//           if (this.credentialsArray.length > 10) {
//                errors.push('Maximum of 10 credentials allowed per domain');
//           }

//           if (this.credentialsArray.length === 10 && this.getPendingCredential()) {
//                errors.push('Maximum of 10 credentials allowed per domain - cannot add more');
//           }

//           // Update mode: must have domain selected
//           if (this.permissionedDomainStoreService.domainMode() === 'update') {
//                if (!this.permissionedDomainStoreService.domainId()) {
//                     errors.push('Please select a domain to update');
//                }
//           }

//           // Pending credential validation (if any)
//           const pendingCred = this.getPendingCredential();
//           if (pendingCred) {
//                // Check if pending credential already exists
//                const alreadyExists = this.credentialsArray.value.some((cred: any) => cred.issuer === pendingCred.issuer && cred.credentialType === pendingCred.credentialType);

//                if (alreadyExists) {
//                     errors.push(`Credential "${pendingCred.credentialType}" already exists for issuer ${pendingCred.issuer.substring(0, 10)}...`);
//                }
//           }

//           if (this.newIssuer() && !this.isIssuerValid()) {
//                errors.push('Issuer address is not a valid XRP address');
//           }

//           if (this.newCredentialType() && this.newCredentialType().trim() && this.isCredentialTypeInvalid()) {
//                const msg = this.credentialTypeErrorMessage();
//                if (msg) errors.push(msg);
//           }

//           // Check for duplicates in existing credentials
//           const seen = new Set<string>();
//           for (const cred of this.credentialsArray.value) {
//                const key = `${cred.issuer}|${cred.credentialType}`;
//                if (seen.has(key)) {
//                     errors.push(`Duplicate credential: "${cred.credentialType}" for issuer ${cred.issuer.substring(0, 10)}...`);
//                     break;
//                }
//                seen.add(key);
//           }

//           // Options errors
//           if (this.wantsOptions() && this.optionsHasError()) {
//                errors.push(...this.optionsErrors());
//           }

//           return errors;
//      });

//      hasValidationErrors = computed(() => {
//           return this.validationErrorMessages().length > 0;
//      });

//      clearVisualForm(): void {
//           while (this.credentialsArray.length > 0) {
//                this.credentialsArray.removeAt(0);
//           }

//           this.newCredentialType.set('');
//           // this._newIssuerItem = null;
//           this.newIssuerItem.set(null);
//           this.isIssuerValid.set(true);
//           this.isCredentialTypeTouched.set(false);

//           this.form.reset();
//           this.form.markAsPristine();
//           this.form.markAsUntouched();
//      }

//      clearCredentialType() {
//           this.newCredentialType.set('');
//           this.isCredentialTypeTouched.set(false);
//      }

//      clearSelectedDomain() {
//           this.permissionedDomainStoreService.setField('domainId', '');
//      }

//      getPendingCredential(): { issuer: string; credentialType: string } | null {
//           if (!this.newIssuer() || this.newCredentialType().trim() === '') {
//                return null;
//           }
//           if (!xrpl.isValidAddress(this.newIssuer())) {
//                return null;
//           }
//           if (!this.isCredentialTypeValid()) {
//                return null;
//           }
//           return {
//                issuer: this.newIssuer(),
//                credentialType: this.newCredentialType().trim(),
//           };
//      }

//      getAllCredentialsForSubmit(): Array<{ issuer: string; credentialType: string }> {
//           const fromList = this.credentialsArray.value.map((c: any) => ({
//                issuer: c.issuer,
//                credentialType: c.credentialType,
//           }));

//           const pending = this.getPendingCredential();
//           if (pending) {
//                const alreadyExists = fromList.some((c: { issuer: string; credentialType: string }) => c.issuer === pending.issuer && c.credentialType === pending.credentialType);
//                if (!alreadyExists) {
//                     fromList.push(pending);
//                }
//           }

//           return fromList;
//      }

//      onNewIssuerSelected(item: SelectItem | null) {
//           this.newIssuerItem.set(item);
//      }

//      get credentialsArray(): FormArray {
//           return this.form.get('credentials') as FormArray;
//      }

//      addCredential() {
//           const trimmedType = this.newCredentialType().trim();

//           const existingCred = this.credentialsArray.value.find((cred: { issuer: string; credentialType: string }) => cred?.issuer === this.newIssuer() && cred?.credentialType === trimmedType);

//           if (existingCred) {
//                this.toastService.error(`Credential "${trimmedType}" already exists for issuer "${this.newIssuer()}"`, AppConstants.TOAST.ERROR);
//                return;
//           }

//           const credGroup = this.fb.group({
//                issuer: [this.newIssuer(), [Validators.required]],
//                credentialType: [trimmedType, [Validators.required]],
//           });

//           this.credentialsArray.push(credGroup);

//           // Clear the form
//           this.newCredentialType.set('');
//           // this._newIssuerItem = null;
//           this.newIssuerItem.set(null);
//           this.isIssuerValid.set(true);
//           this.isCredentialTypeTouched.set(false);

//           this.form.markAsUntouched();
//           this.form.updateValueAndValidity();
//           this.syncToStore();
//      }

//      removeCredential(index: number) {
//           this.credentialsArray.removeAt(index);
//           this.syncToStore();
//      }

//      private syncToStore() {
//           const creds = this.credentialsArray.value.map((c: any) => ({
//                issuer: c.issuer,
//                credentialType: c.credentialType,
//           }));
//           this.permissionedDomainStoreService.setField('setAcceptedCredentials', creds);
//      }

//      selectedUpdateDomain = computed(() => {
//           const id = this.permissionedDomainStoreService.domainId();
//           if (!id) return null;
//           return this.permissionedDomainViewModelService.domainItems().find((d: { id: string }) => d.id === id) ?? null;
//      });

//      setDomainMode(mode: 'create' | 'update') {
//           this.permissionedDomainStoreService.setField('domainMode', mode);
//           if (mode === 'create') {
//                this.permissionedDomainStoreService.setField('domainId', '');
//           }
//      }

//      onModeChange() {
//           if (this.permissionedDomainStoreService.domainMode() === 'create') {
//                this.permissionedDomainStoreService.setField('domainId', '');
//           }
//      }

//      onUpdateDomainSelected(item: SelectItem | null) {
//           const domainId = item?.id || null;
//           this.permissionedDomainStoreService.setField('domainId', domainId ?? '');
//      }

//      hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled());

//      onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
//           this.optionsHasError.set(validation.hasError);
//           this.optionsErrorMsg.set(validation.message || '');
//           this.optionsErrors.set(validation.errors || []);
//      }
// }
