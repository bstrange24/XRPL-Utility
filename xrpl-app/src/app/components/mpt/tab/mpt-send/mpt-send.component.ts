import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-mpt-send',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, SelectSearchDropdownComponent],
     templateUrl: './mpt-send.component.html',
     styleUrl: './mpt-send.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptSendComponent {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);

     // Inputs from parent
     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly mptItems = input.required<SelectItem[]>();

     // Outputs to parent
     readonly selectedDestinationAddress = output<string>();
     readonly onMptSelected = output<SelectItem | null>();

     // Local getters/setters for cleaner template
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
          const address = item?.id || '';
          this.selectedDestinationAddress.emit(address);
     }

     onMptSelection(item: SelectItem | null) {
          this.onMptSelected.emit(item);
     }
}
