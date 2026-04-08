import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

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

     handleSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
     }

     handleDestinationChange(item: any) {
          this.destinationChange.emit(item);
     }
}
