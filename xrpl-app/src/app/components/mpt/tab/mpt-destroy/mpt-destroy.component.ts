import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-mpt-destroy',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, NgIcon, SelectSearchDropdownComponent],
     templateUrl: './mpt-destroy.component.html',
     styleUrl: './mpt-destroy.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptDestroyComponent {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly mptUtilService = inject(MptUtilService);

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
