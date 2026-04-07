import { Component, inject, input, output } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
     selector: 'app-mpt-destroy',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './mpt-destroy.component.html',
     styleUrl: './mpt-destroy.component.css',
})
export class MptDestroyComponent {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);

     readonly mptItems = input.required<SelectItem[]>();

     readonly onMptSelected = output<SelectItem | null>();

     get mptIssuanceId() {
          return this.mptStoreService.mptIssuanceId();
     }
     set mptIssuanceId(value: string) {
          this.mptStoreService.setField('mptIssuanceId', value);
     }

     onMptSelection(item: SelectItem | null) {
          this.onMptSelected.emit(item);
     }
}
