import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CredentialStore } from '../../../../services/credentials/credential-store/credential-store.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CredentialViewModelService } from '../../../../services/credentials/credential-view-model/credential-view-model.service';
import { NgIcon } from '@ng-icons/core';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';

@Component({
     selector: 'app-credential-verify',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './credential-verify.component.html',
     styleUrl: './credential-verify.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialVerifyComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly credentialViewModel = inject(CredentialViewModelService);

     view = input.required<any>();
     creds = input.required<any>();
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
