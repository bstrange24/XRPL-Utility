import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainUtilService } from '../../../../services/permissioned-domain/permissioned-domain-util/permissioned-domain-util.service';
import { SelectItem, SelectSearchDropdownComponent } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { PermissionedDomainViewModelService } from '../../../../services/permissioned-domain/permissioned-domain-view-model/permissioned-domain-view-model.service';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { WarningMessageComponent } from '../../../shared/ui-components/warning-message/warning-message/warning-message.component';

@Component({
     selector: 'app-permission-domain-set-form',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, ReactiveFormsModule, NgIcon, LucideAngularModule, WarningMessageComponent],
     templateUrl: './permission-domain-set-form.component.html',
     styleUrl: './permission-domain-set-form.component.css',
})
export class PermissionDomainSetFormComponent {
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);
     public readonly permissionedDomainViewModelService = inject(PermissionedDomainViewModelService);
     private readonly fb = inject(FormBuilder);

     // Inputs
     view = input.required<any>(); // for actionButtonClass / actionButtonLabel
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     canSubmit = input<boolean>(false);
     warningMessage = 'Updating will completely replace the existing AcceptedCredentials list for this domain.';
     readonly safeWarningMessage = computed(() => this.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');
     // domainMode = signal<'create' | 'update'>('create'); // default to create

     // Outputs
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();

     // NEW: Local reactive form with FormArray
     form: FormGroup;

     // Temporary values for "add new" row (two-way binding or controlled)
     newIssuer: string = '';
     newCredentialType: string = '';
     private _newIssuerItem: SelectItem | null = null; // track the full selected object
     domainMode = signal<'create' | 'update'>('create');

     constructor() {
          this.form = this.fb.group({
               credentials: this.fb.array([]), // ← dynamic list
          });
     }

     onNewIssuerSelected(item: SelectItem | null) {
          this._newIssuerItem = item;
          this.newIssuer = item?.id || '';
          console.log('Selected issuer:', this.newIssuer);
     }

     newIssuerSelectedItem() {
          return this._newIssuerItem;
     }

     get credentialsArray(): FormArray {
          return this.form.get('credentials') as FormArray;
     }

     addCredential() {
          if (!this.newIssuer || this.newCredentialType.trim() === '') {
               return;
          }

          const credGroup = this.fb.group({
               issuer: [this.newIssuer, [Validators.required]],
               credentialType: [this.newCredentialType.trim(), [Validators.required]],
          });

          this.credentialsArray.push(credGroup);

          this.newCredentialType = '';
          this.form.markAsUntouched();
          this.form.updateValueAndValidity();

          // syncing to store
          this.syncToStore();
     }

     clearIssuer() {
          this.newIssuer = '';
          this._newIssuerItem = null;
          // Optional: this.newCredentialType = ''; if you want to clear type too
     }

     removeCredential(index: number) {
          this.credentialsArray.removeAt(index);
          this.syncToStore();
     }

     private syncToStore() {
          // store needs the list for tx building:
          const creds = this.credentialsArray.value.map((c: any) => ({
               issuer: c.issuer,
               credentialType: c.credentialType,
          }));
          this.permissionedDomainStoreService.setField('setAcceptedCredentials', creds);
     }

     clearAfterSuccess() {
          // Clear the dynamic credentials list
          while (this.credentialsArray.length > 0) {
               this.credentialsArray.removeAt(0);
          }

          // Clear add-row inputs
          this.newIssuer = '';
          this.newCredentialType = '';
          this._newIssuerItem = null; // if using the selected item tracking

          this.form.reset();

          // If using store/service for temp form data:
          this.permissionedDomainStoreService.resetDomainFields(); // or specific resetAcceptedCredentials()
     }

     selectedUpdateDomain = computed(() => {
          const id = this.permissionedDomainStoreService.domainId();
          if (!id) return null;
          return this.permissionedDomainViewModelService.domainItems().find((d: { id: string }) => d.id === id) ?? null;
     });

     // Methods
     setDomainMode(mode: 'create' | 'update') {
          this.domainMode.set(mode);
          if (mode === 'create') {
               this.permissionedDomainStoreService.setField('domainId', '');
          }
     }

     onModeChange() {
          if (this.domainMode() === 'create') {
               this.permissionedDomainStoreService.setField('domainId', '');
               // ... other reset logic if needed
          }
          // You can also sync to store here if desired
          // this.permissionedDomainStoreService.setDomainMode(this.domainMode());
     }

     onUpdateDomainSelected(item: SelectItem | null) {
          const domainId = item?.id || null;
          this.permissionedDomainStoreService.setField('domainId', domainId!);
     }
}
