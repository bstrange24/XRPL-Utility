import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CredentialStore } from '../../../../services/credentials/credential-store/credential-store.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CredentialViewModelService } from '../../../../services/credentials/credential-view-model/credential-view-model.service';
import { NgIcon } from '@ng-icons/core';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-credential-delete',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, SelectSearchDropdownComponent, NgIcon, LucideAngularModule],
     templateUrl: './credential-delete.component.html',
     styleUrl: './credential-delete.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialDeleteComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly credentialViewModel = inject(CredentialViewModelService);

     // Helper Items
     readonly credentialDeleteSelectorHelperItems = AppConstants.CREDENTIAL_DELETE_SELECTOR_HELPER_ITEMS;
     readonly credentialIssuerHelperItems = AppConstants.CREDENTIAL_ISSUER_DELETE_HELPER_ITEMS;
     readonly credentialSubjectHelperItems = AppConstants.CREDENTIAL_SUBJECT_DELETE_HELPER_ITEMS;
     readonly credentialIdHelperItems = AppConstants.CREDENTIAL_ID_DELETE_HELPER_ITEMS;

     view = input.required<any>(); // contains selectedCredentialItem, etc.
     creds = input.required<any>(); // ← added: creds.dropdown
     canSubmit = input<boolean>(false);

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     selectCredential = output<{ item: any; source: 'dropdown' | 'list' }>(); // ← we'll emit this

     // UI Signals
     showCredentialDeleteSelectorHelper = signal(false);
     showCredentialIssuerHelper = signal(false);
     showCredentialSubjectHelper = signal(false);
     showCredentialIdHelper = signal(false);

     // Forward events to parent if needed
     handleSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
     }

     handleDestinationChange(item: any) {
          this.destinationChange.emit(item);
     }

     // Toggle Methods
     toggleCredentialSelectorHelper() {
          this.showCredentialDeleteSelectorHelper.set(!this.showCredentialDeleteSelectorHelper());
     }

     toggleCredentialIssuerHelper() {
          this.showCredentialIssuerHelper.set(!this.showCredentialIssuerHelper());
     }

     toggleCredentialSubjectHelper() {
          this.showCredentialSubjectHelper.set(!this.showCredentialSubjectHelper());
     }

     toggleCredentialIdHelper() {
          this.showCredentialIdHelper.set(!this.showCredentialIdHelper());
     }
}
