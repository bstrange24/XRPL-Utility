import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { SelectSearchDropdownComponent } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

@Component({
     selector: 'app-account-delete',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, TransactionOptionsSectionComponent],
     templateUrl: './account-delete.component.html',
     styleUrl: './account-delete.component.css',
})
export class AccountDeleteComponent {
     // Inputs from parent
     view = input.required<any>(); // for deleteBlockers(), deleteWalletButtonLabel()
     info = input.required<any>(); // for canDelete
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     wantsOptions = input.required<boolean>();
     canSubmit = input<boolean>(false);
     tab = input.required<string>();

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     toggleOptions = output<boolean>();
}
