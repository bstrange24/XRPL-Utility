import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainViewModelService } from '../../../../services/permissioned-domain/permissioned-domain-view-model/permissioned-domain-view-model.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-permission-domain-delete-form',
     standalone: true,
     imports: [CommonModule, NgIcon, FormsModule, FieldHelperComponent, SelectSearchDropdownComponent, LucideAngularModule],
     templateUrl: './permission-domain-delete-form.component.html',
     styleUrl: './permission-domain-delete-form.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionDomainDeleteFormComponent {
     permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     permissionedDomainViewModelService = inject(PermissionedDomainViewModelService);

     readonly pDomainDeleteSelectorHelperItems = AppConstants.PDOMAIN_DELETE_SELECTOR_HELPER_ITEMS;
     readonly pDomainIdHelperItems = AppConstants.PDOMAIN_ID_HELPER_ITEMS;

     // Inputs
     view = input.required<any>();
     canSubmit = input<boolean>(false);

     // Outputs
     performAction = output<void>();
     clearFields = output<void>();
     onDomainSelected = output<any>(); // pass the selected item up

     // UI Signals
     showPDomainDeleteSelectorHelper = signal(false);
     showPDomainIdHelper = signal(false);

     // Toggle Methods
     togglePDomainSelectorHelper() {
          this.showPDomainDeleteSelectorHelper.set(!this.showPDomainDeleteSelectorHelper());
     }

     togglePDomainIdHelper() {
          this.showPDomainIdHelper.set(!this.showPDomainIdHelper());
     }
}
