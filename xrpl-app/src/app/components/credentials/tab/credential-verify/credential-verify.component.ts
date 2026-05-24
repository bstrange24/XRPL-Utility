import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
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
     selector: 'app-credential-verify',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, SelectSearchDropdownComponent, NgIcon, LucideAngularModule],
     templateUrl: './credential-verify.component.html',
     styleUrl: './credential-verify.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialVerifyComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly credentialViewModel = inject(CredentialViewModelService);

     readonly credentialVerifySelectorHelperItems = AppConstants.CREDENTIAL_VERIFY_SELECTOR_HELPER_ITEMS;
     readonly credentialTypeHelperItems = AppConstants.CREDENTIAL_TYPE_HELPER_ITEMS;
     readonly credentialIdHelperItems = AppConstants.CREDENTIAL_ID_HELPER_ITEMS;

     view = input.required<any>();
     creds = input.required<any>();
     canSubmit = input<boolean>(false);

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     selectCredential = output<{ item: any; source: 'dropdown' | 'list' }>(); // ← we'll emit this

     // UI Signals
     showCredentialVerifySelectorHelper = signal(false);
     showCredentialTypeHelper = signal(false);
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
          this.showCredentialVerifySelectorHelper.set(!this.showCredentialVerifySelectorHelper());
     }

     toggleCredentialTypeHelper() {
          this.showCredentialTypeHelper.set(!this.showCredentialTypeHelper());
     }

     toggleCredentialIdHelper() {
          this.showCredentialIdHelper.set(!this.showCredentialIdHelper());
     }
}
