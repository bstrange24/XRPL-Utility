import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { SelectSearchDropdownComponent, SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-checks-cancel',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './checks-cancel.component.html',
     styleUrl: './checks-cancel.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksCancelComponent {
     readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     @Output() checkItems = new EventEmitter<SelectItem | null>();
     @Output() checkSelected = new EventEmitter<SelectItem | null>();
     @Output() selectedCheckItem = new EventEmitter<SelectItem | null>();
}
