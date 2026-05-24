import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CredentialStore } from '../../../../services/credentials/credential-store/credential-store.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { NgIcon } from '@ng-icons/core';
import { CredentialViewModelService } from '../../../../services/credentials/credential-view-model/credential-view-model.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-credential-accept',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, SelectSearchDropdownComponent, NgIcon, LucideAngularModule],
     templateUrl: './credential-accept.component.html',
     styleUrl: './credential-accept.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialAcceptComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly credentialViewModel = inject(CredentialViewModelService);

     view = input.required<any>(); // contains selectedCredentialItem, etc.
     creds = input.required<any>(); // ← added: creds.dropdown
     canSubmit = input<boolean>(false);

     // Helper Items
     readonly credentialSelectorHelperItems = AppConstants.CREDENTIAL_SELECTOR_HELPER_ITEMS;
     readonly credentialTypeHelperItems = AppConstants.CREDENTIAL_TYPE_ACCEPT_HELPER_ITEMS;
     readonly credentialIdHelperItems = AppConstants.CREDENTIAL_ID_HELPER_ITEMS;

     // UI Signals
     showCredentialSelectorHelper = signal(false);
     showCredentialTypeHelper = signal(false);
     showCredentialIdHelper = signal(false);

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     selectCredential = output<{ item: any; source: 'dropdown' | 'list' }>(); // ← we'll emit this

     // Forward events to parent if needed
     handleSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
     }

     handleDestinationChange(item: any) {
          this.destinationChange.emit(item);
     }

     // Toggle Methods
     toggleCredentialSelectorHelper() {
          this.showCredentialSelectorHelper.set(!this.showCredentialSelectorHelper());
     }

     toggleCredentialTypeHelper() {
          this.showCredentialTypeHelper.set(!this.showCredentialTypeHelper());
     }

     toggleCredentialIdHelper() {
          this.showCredentialIdHelper.set(!this.showCredentialIdHelper());
     }
}
