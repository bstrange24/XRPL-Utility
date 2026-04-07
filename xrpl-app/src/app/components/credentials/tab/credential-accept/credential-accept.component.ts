import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CredentialStore } from '../../../../services/credentials/credential-store/credential-store.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { NgIcon } from '@ng-icons/core';
import { CredentialViewModelService } from '../../../../services/credentials/credential-view-model/credential-view-model.service';
import { ConnectionGuardService } from '../../../../services/connection-guard/connection-guard.service';

@Component({
     selector: 'app-credential-accept',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './credential-accept.component.html',
     styleUrl: './credential-accept.component.css',
})
export class CredentialAcceptComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly credentialStore = inject(CredentialStore);
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
