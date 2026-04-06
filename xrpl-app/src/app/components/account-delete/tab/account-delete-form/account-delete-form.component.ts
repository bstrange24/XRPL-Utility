import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, input, Output, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { SelectSearchDropdownComponent } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../services/connection-guard/connection-guard.service';

@Component({
     selector: 'app-account-delete-form',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule],
     templateUrl: './account-delete-form.component.html',
     styleUrl: './account-delete-form.component.css',
})
export class AccountDeleteFormComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly txUiService = inject(TransactionUiService);

     view = input.required<any>(); // for deleteBlockers(), deleteWalletButtonLabel()
     info = input.required<any>(); // for canDelete
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     wantsOptions = input.required<boolean>(); // txUiService.wantsOptions()
     canSubmit = input<boolean>(false);
     tab = input.required<string>(); // 'deleteAccount'
     @Output() optionsToggled = new EventEmitter<boolean>();

     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     toggleOptions = output<boolean>();
}
