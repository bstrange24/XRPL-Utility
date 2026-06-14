import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AmmUtilsService } from '../../../../services/amm/amm-utils/amm-utils.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';

@Component({
     selector: 'amm-amount-fields',
     standalone: true,
     imports: [CommonModule, FieldHelperComponent, FormsModule, NgIcon],
     templateUrl: './amm-amount-fields.component.html',
     styleUrl: './amm-amount-fields.component.css',
})
export class AmmAmountFieldsComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);
     public readonly ammUtilsService = inject(AmmUtilsService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);

     readonly showAmount1HelperItems = AppConstants.AMM_AMOUNT1_HELPER_ITEMS;
     readonly showAmount2HelperItems = AppConstants.AMM_AMOUNT2_HELPER_ITEMS;

     showAmount1Helper = signal(false);
     showAmount2Helper = signal(false);

     // Toggle Methods
     toggleAsset1AmountHelper() {
          this.showAmount1Helper.set(!this.showAmount1Helper());
     }

     toggleAsset2AmountHelper() {
          this.showAmount2Helper.set(!this.showAmount2Helper());
     }
}
