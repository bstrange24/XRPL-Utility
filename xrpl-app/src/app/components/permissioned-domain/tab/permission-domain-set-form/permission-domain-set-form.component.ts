import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainUtilService } from '../../../../services/permissioned-domain/permissioned-domain-util/permissioned-domain-util.service';
import { SelectSearchDropdownComponent } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

@Component({
     selector: 'app-permission-domain-set-form',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './permission-domain-set-form.component.html',
     styleUrl: './permission-domain-set-form.component.css',
})
export class PermissionDomainSetFormComponent {
     permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     permissionedDomainUtilService = inject(PermissionedDomainUtilService);

     // Inputs
     view = input.required<any>(); // for actionButtonClass / actionButtonLabel
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     canSubmit = input<boolean>(false);

     // Outputs
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
}
