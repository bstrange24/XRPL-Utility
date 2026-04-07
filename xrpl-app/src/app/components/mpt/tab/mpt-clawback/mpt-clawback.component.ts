import { Component, inject, input, output } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
     selector: 'app-mpt-clawback',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './mpt-clawback.component.html',
     styleUrl: './mpt-clawback.component.css',
})
export class MptClawbackComponent {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);

     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly mptItems = input.required<SelectItem[]>();

     readonly selectedDestinationAddress = output<string>();
     readonly onMptSelected = output<SelectItem | null>();

     get mptIssuanceId() {
          return this.mptStoreService.mptIssuanceId();
     }
     set mptIssuanceId(value: string) {
          this.mptStoreService.setField('mptIssuanceId', value);
     }

     get amount() {
          return this.mptStoreService.amount();
     }

     set amount(value: string) {
          this.mptStoreService.setField('amount', value);
     }

     onDestinationChange(item: SelectItem | null) {
          this.selectedDestinationAddress.emit(item?.id || '');
     }

     onMptSelection(item: SelectItem | null) {
          this.onMptSelected.emit(item);
     }
}
