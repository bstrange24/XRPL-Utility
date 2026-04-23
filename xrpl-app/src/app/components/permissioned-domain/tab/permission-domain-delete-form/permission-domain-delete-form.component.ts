import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainViewModelService } from '../../../../services/permissioned-domain/permissioned-domain-view-model/permissioned-domain-view-model.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-permission-domain-delete-form',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './permission-domain-delete-form.component.html',
     styleUrl: './permission-domain-delete-form.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionDomainDeleteFormComponent {
     permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     permissionedDomainViewModelService = inject(PermissionedDomainViewModelService);

     // Inputs
     view = input.required<any>();
     canSubmit = input<boolean>(false);

     // Outputs
     performAction = output<void>();
     clearFields = output<void>();
     onDomainSelected = output<any>(); // pass the selected item up
}
