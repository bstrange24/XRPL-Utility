import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, input, Output, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CredentialStore } from '../../../../services/credentials/credential-store/credential-store.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { ConnectionGuardService } from '../../../../services/connection-guard/connection-guard.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';

@Component({
     selector: 'app-credential-create',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule],
     templateUrl: './credential-create.component.html',
     styleUrl: './credential-create.component.css',
})
export class CredentialCreateComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly txUiService = inject(TransactionUiService);

     // Inputs from parent
     view = input.required<any>(); // { actionButtonClass, actionButtonLabel, ... }
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     canSubmit = input<boolean>(false);

     @Output() currencySelected = new EventEmitter<SelectItem | null>();
     @Output() issuerSelected = new EventEmitter<SelectItem | null>();

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     optionsToggled = output<boolean>();

     // Forward events to parent if needed
     handleSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
     }

     handleDestinationChange(item: any) {
          this.destinationChange.emit(item);
     }
}
