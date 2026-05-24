import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { NgIcon } from '@ng-icons/core';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';

@Component({
     selector: 'app-trustline-issue',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, FocusBorderDirective, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './trustline-issue.component.html',
     styleUrl: './trustline-issue.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlineIssueComponent {
     public readonly viewModel = inject(TrustlineViewModelService);
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     // === Helper Items ===
     readonly iouDestinationHelperItems = AppConstants.IOU_DESTINATION_HELPER_ITEMS;
     readonly iouDestinationTagHelperItems = AppConstants.IOU_DESTINATION_TAG_HELPER_ITEMS;

     @Input() activeTab!: 'issueCurrency' | 'clawbackTokens';
     @Input() destinationTag: string = '';

     @Output() destinationTagChange = new EventEmitter<string>();

     view = input.required<any>();
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     canSubmit = input<boolean>(false);

     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();

     isDestinationValid = signal(false);

     // UI Signals
     showIouDestinationHelper = signal(false);
     showIouDestinationTagHelper = signal(false);

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
     }

     isDestinationTagValid = computed(() => {
          const amount = this.xrplTxOptionsStore.destinationTag();
          if (amount === null || amount === '') return true;
          const numAmount = Number(amount);
          return Number.isFinite(numAmount) && numAmount > 0;
     });

     isDestinationTagInvalid = computed(() => {
          const amount = this.xrplTxOptionsStore.destinationTag();
          if (amount === null || amount === '') return false;
          const numAmount = parseFloat(amount);
          return isNaN(numAmount) || numAmount <= 0;
     });

     handleSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
     }

     handleDestinationChange(item: any) {
          this.destinationChange.emit(item);
     }

     // Toggle Methods
     toggleDestinationHelper() {
          this.showIouDestinationHelper.set(!this.showIouDestinationHelper());
     }

     toggleDestinationTagHelper() {
          this.showIouDestinationTagHelper.set(!this.showIouDestinationTagHelper());
     }
}
