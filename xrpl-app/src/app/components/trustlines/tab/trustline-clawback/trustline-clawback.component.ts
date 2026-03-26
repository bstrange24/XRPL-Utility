import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, input, Input, output, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { SelectSearchDropdownComponent, SelectItem } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

@Component({
     selector: 'app-trustline-clawback',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './trustline-clawback.component.html',
     styleUrl: './trustline-clawback.component.css',
})
export class TrustlineClawbackComponent {
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

     // Inputs from parent
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
