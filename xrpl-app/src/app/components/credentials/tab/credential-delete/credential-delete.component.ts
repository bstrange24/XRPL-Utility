import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CredentialStore } from '../../../../services/credentials/credential-store/credential-store.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { SelectSearchDropdownComponent } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { CredentialViewModelService } from '../../../../services/credentials/credential-view-model/credential-view-model.service';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-credential-delete',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './credential-delete.component.html',
     styleUrl: './credential-delete.component.css',
})
export class CredentialDeleteComponent {
     public readonly credentialStore = inject(CredentialStore);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly credentialViewModel = inject(CredentialViewModelService);

     view = input.required<any>(); // contains selectedCredentialItem, etc.
     creds = input.required<any>(); // ← added: creds.dropdown
     canSubmit = input<boolean>(false);

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
}
