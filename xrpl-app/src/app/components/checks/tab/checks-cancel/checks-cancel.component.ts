import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, output, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { SelectSearchDropdownComponent, SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-checks-cancel',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, SelectSearchDropdownComponent, NgIcon],
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
}
