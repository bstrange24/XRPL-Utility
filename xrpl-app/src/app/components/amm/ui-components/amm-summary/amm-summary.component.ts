import { Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';

@Component({
     selector: 'app-amm-summary',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './amm-summary.component.html',
     styleUrl: './amm-summary.component.css',
})
export class AmmSummaryComponent {
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);
}
