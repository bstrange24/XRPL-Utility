import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, input, Input, output, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-trustline-clawback',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './trustline-clawback.component.html',
     styleUrl: './trustline-clawback.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlineClawbackComponent {
     public readonly viewModel = inject(TrustlineViewModelService);

     readonly clawbackDestinationHelperItems = AppConstants.CLAWBACK_DESTINATION_HELPER_ITEMS;

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

     // UI State
     showClawbackDestinationHelper = signal(false);

     handleSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
     }

     handleDestinationChange(item: any) {
          this.destinationChange.emit(item);
     }

     // Toggle Method
     toggleDestinationHelper() {
          this.showClawbackDestinationHelper.set(!this.showClawbackDestinationHelper());
     }
}
