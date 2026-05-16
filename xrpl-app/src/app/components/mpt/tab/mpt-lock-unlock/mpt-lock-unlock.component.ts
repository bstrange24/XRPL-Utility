import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-mpt-lock-unlock',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, SelectSearchDropdownComponent],
     templateUrl: './mpt-lock-unlock.component.html',
     styleUrl: './mpt-lock-unlock.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptLockUnlockComponent {
     public readonly mptStoreService = inject(MptStoreService);

     // Inputs from parent
     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);

     // Outputs to parent
     readonly selectedDestinationAddress = output<string>();
     readonly onMptSelected = output<SelectItem | null>(); // if needed

     // Local getters for cleaner template
     get lockAction() {
          return this.mptStoreService.lockAction();
     }

     setLockAction(action: 'lock' | 'unlock') {
          this.mptStoreService.setField('lockAction', action);
     }

     // Handle destination change
     onDestinationChange(item: SelectItem | null) {
          const address = item?.id || '';
          this.selectedDestinationAddress.emit(address);
     }

     // Optional: expose store directly if you prefer
     get mptIssuanceId() {
          return this.mptStoreService.mptIssuanceId();
     }

     setMptIssuanceId(value: string) {
          this.mptStoreService.setField('mptIssuanceId', value);
     }
}
