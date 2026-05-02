import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { NgIcon } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';

@Component({
     selector: 'app-mpt-authorize-unauthorize',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, SelectSearchDropdownComponent],
     templateUrl: './mpt-authorize-unauthorize.component.html',
     styleUrl: './mpt-authorize-unauthorize.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptAuthorizeUnauthorizeComponent {
     private readonly mptStoreService = inject(MptStoreService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly mptTransactionViewModelService = inject(MptTransactionViewModelService);

     // Inputs from parent
     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);

     // Outputs to parent
     readonly selectedDestinationAddress = output<string>();
     readonly onMptSelected = output<SelectItem | null>(); // if needed

     readonly selectedMpt = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId) return null;

          // Get the full MPT object from the summary data
          const mpts = this.mptTransactionViewModelService?.infoData()?.mptsToShow || [];
          return mpts.find(m => m.mpt_issuance_id === issuanceId) || null;
     });

     readonly requiresIssuerAuth = computed(() => {
          const mpt = this.selectedMpt();
          if (!mpt) return false;

          // You can check by flag name or by numeric flags value
          return !!mpt.flags?.includes('isRequireAuth') || !!(mpt.flags && (Number.parseInt(mpt.flags) & 0x00000004) !== 0); // tfMPTRequireAuth = 0x00000004
     });

     // Local getters for cleaner template
     get authAction() {
          return this.mptStoreService.authAction();
     }

     setAuthAction(action: 'authorize' | 'unauthorize') {
          this.mptStoreService.setField('authAction', action);
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
