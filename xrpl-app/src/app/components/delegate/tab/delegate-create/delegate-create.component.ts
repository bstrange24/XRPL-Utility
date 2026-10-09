import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { DelegateAction } from '../../constants/delegate.types';

@Component({
     selector: 'app-delegate-create',
     standalone: true,
     imports: [CommonModule, FocusBorderDirective, SelectSearchDropdownComponent],
     templateUrl: './delegate-create.component.html',
     styleUrl: './delegate-create.component.css',
})
export class DelegateCreateComponent {
     destinationItems = input.required<SelectItem[]>();
     selectedDestinationItem = input<SelectItem | null>(null);
     destinationSearchQuery = input<string>('');
     actions = input.required<DelegateAction[]>();
     selectedActions = input.required<Set<number>>();
     destinationChange = output<string>();
     searchQueryChange = output<string>();
     actionToggle = output<number>();
}
