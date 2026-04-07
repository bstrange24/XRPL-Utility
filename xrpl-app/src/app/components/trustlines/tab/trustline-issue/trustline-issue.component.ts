import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

@Component({
     selector: 'app-trustline-issue',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './trustline-issue.component.html',
     styleUrl: './trustline-issue.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlineIssueComponent {
     public readonly viewModel = inject(TrustlineViewModelService);

     @Input() activeTab!: 'issueCurrency' | 'clawbackTokens';

     // Inputs passed from parent
     // @Input() destinationItems: any[] = [];
     // @Input() selectedDestinationItem: any = null;
     // @Input() searchQueryInput: any;

     // Two-way for destination tag
     @Input() destinationTag: string = '';
     @Output() destinationTagChange = new EventEmitter<string>();

     // Outputs for the dropdown
     // @Output() searchQueryChange = new EventEmitter<string>();
     // @Output() destinationChange = new EventEmitter<SelectItem | null>();

     view = input.required<any>(); // { actionButtonClass, actionButtonLabel, ... }
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     canSubmit = input<boolean>(false);

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();

     // Forward events to parent if needed
     handleSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
     }

     handleDestinationChange(item: any) {
          this.destinationChange.emit(item);
     }
}
