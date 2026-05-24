import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, output, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { SelectSearchDropdownComponent, SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';

@Component({
     selector: 'app-checks-cancel',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, LucideAngularModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './checks-cancel.component.html',
     styleUrl: './checks-cancel.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksCancelComponent {
     readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);

     // Outputs
     checkItems = output<SelectItem | null>();
     checkSelected = output<SelectItem | null>();
     selectedCheckItem = output<SelectItem | null>();

     // Helper Items
     readonly checkCancelSelectorHelperItems = AppConstants.CHECK_CANCEL_SELECTOR_HELPER_ITEMS;
     readonly checkDestinationHelperItems = AppConstants.CHECK_DESTINATION_CANCEL_HELPER_ITEMS;
     readonly checkIssuerHelperItems = AppConstants.CHECK_ISSUER_CANCEL_HELPER_ITEMS;
     readonly checkIdHelperItems = AppConstants.CHECK_ID_HELPER_ITEMS;
     readonly checkAmountHelperItems = AppConstants.CHECK_AMOUNT_CANCEL_HELPER_ITEMS;

     // UI Signals
     showCheckCancelSelectorHelper = signal(false);
     showCheckDestinationHelper = signal(false);
     showCheckIssuerHelper = signal(false);
     showCheckIdHelper = signal(false);
     showCheckAmountHelper = signal(false);

     // Toggle Methods
     toggleCheckSelectorHelper() {
          this.showCheckCancelSelectorHelper.set(!this.showCheckCancelSelectorHelper());
     }

     toggleCheckDestinationHelper() {
          this.showCheckDestinationHelper.set(!this.showCheckDestinationHelper());
     }

     toggleCheckIssuerHelper() {
          this.showCheckIssuerHelper.set(!this.showCheckIssuerHelper());
     }

     toggleCheckIdHelper() {
          this.showCheckIdHelper.set(!this.showCheckIdHelper());
     }

     toggleCheckAmountHelper() {
          this.showCheckAmountHelper.set(!this.showCheckAmountHelper());
     }
}
