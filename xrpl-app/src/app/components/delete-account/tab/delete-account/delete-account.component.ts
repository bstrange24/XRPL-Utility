import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { SelectSearchDropdownComponent } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

@Component({
     selector: 'app-delete-account',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, TransactionOptionsSectionComponent],
     templateUrl: './delete-account.component.html',
     styleUrl: './delete-account.component.css',
})
export class DeleteAccountComponent {
     // Inputs from parent
     view = input.required<any>(); // for deleteBlockers(), deleteWalletButtonLabel()
     info = input.required<any>(); // for canDelete
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     wantsOptions = input.required<boolean>(); // txUiService.wantsOptions()
     canSubmit = input<boolean>(false);
     tab = input.required<string>(); // 'deleteAccount'

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     toggleOptions = output<boolean>();
}
