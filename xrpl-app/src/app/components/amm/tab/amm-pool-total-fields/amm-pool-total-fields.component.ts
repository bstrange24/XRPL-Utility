import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { AppConstants } from '../../../../core/app.constants';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AmmUtilsService } from '../../../../services/amm/amm-utils/amm-utils.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'amm-pool-total-fields',
     standalone: true,
     imports: [CommonModule, FieldHelperComponent, FormsModule, NgIcon],
     templateUrl: './amm-pool-total-fields.component.html',
     styleUrl: './amm-pool-total-fields.component.css',
})
export class AmmPoolTotalFieldsComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);
     public readonly ammUtilsService = inject(AmmUtilsService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);

     readonly showPoolTotalAmount1HelperItems = AppConstants.AMM_POOL1_TOTAL_AMOUNT_HELPER_ITEMS;
     readonly showPoolTotalAmount2HelperItems = AppConstants.AMM_POOL2_TOTAL_AMOUNT_HELPER_ITEMS;

     showPoolTotalAmount1Helper = signal(false);
     showPoolTotalAmount2Helper = signal(false);

     // Toggle Methods
     togglePoolTotal1AmountHelper() {
          this.showPoolTotalAmount1Helper.set(!this.showPoolTotalAmount1Helper());
     }

     togglePoolTotal2AmountHelper() {
          this.showPoolTotalAmount2Helper.set(!this.showPoolTotalAmount2Helper());
     }
}
