import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DelegateTransactionViewModelService } from '../../../../services/delegate/delegate-transaction-view-model/delegate-transaction-view-model.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { XRPLDelegate } from '../../constants/delegate.types';

@Component({
     selector: 'app-delegate-summary',
     standalone: true,
     imports: [SummaryContainerComponent, SummaryItemComponent],
     templateUrl: './delegate-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DelegateSummaryComponent {
     public readonly viewModel = inject(DelegateTransactionViewModelService);
     public readonly copyUtilService = inject(CopyUtilService);

     readonly info = this.viewModel.infoData;
     readonly tab = this.viewModel.activeTab;
     readonly delegations = computed<XRPLDelegate[]>(() => this.info()?.existingDelegations ?? []);
     readonly totalCount = computed(() => this.info()?.delegationCount ?? 0);

     onDelegationClick(delegation: XRPLDelegate): void {
          if (this.tab() !== 'delegateClear') return;
          const store = this.viewModel.delegateStore;
          store.setField('destination', delegation.Authorize || '');
          store.setField('selected', new Set<number>());
     }

     readonly summaryText = computed(() => {
          const count = this.totalCount();
          if (count === 0) return 'has no active delegations.';
          return `has <strong>${count}</strong> active ${count === 1 ? 'delegation' : 'delegations'}${this.tab() === 'delegateClear' ? ' that can be removed.' : '.'}`;
     });

     readonly emptyStateMessage = computed(() => (this.tab() === 'delegateClear' ? 'This wallet has no delegations to remove.' : 'This wallet has not delegated any permissions yet.'));

     readonly emptyStateSubMessage = computed(() => (this.tab() === 'delegateClear' ? 'Use the Grant Permissions tab to delegate actions to another account.' : 'Choose an account and the actions it may perform on your behalf.'));
}
