import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { SelectSearchDropdownComponent, SelectItem } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

@Component({
     selector: 'app-checks-cancel',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './checks-cancel.component.html',
     styleUrl: './checks-cancel.component.css',
})
export class ChecksCancelComponent {
     readonly viewModel = inject(ChecksTransactionViewModelService);
     @Output() checkSelected = new EventEmitter<SelectItem | null>();
}
