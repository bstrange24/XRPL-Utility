import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AmmUtilsService } from '../../../../services/amm/amm-utils/amm-utils.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { NgIcon } from '@ng-icons/core';
import { AppConstants } from '../../../../core/app.constants';

@Component({
     selector: 'token-balance-fields',
     standalone: true,
     imports: [CommonModule, FieldHelperComponent, FormsModule, NgIcon],
     templateUrl: './amm-balance-fields.component.html',
     styleUrl: './amm-balance-fields.component.css',
})
export class AmmBalanceFieldsComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);
     public readonly ammUtilsService = inject(AmmUtilsService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);

     readonly showAsset1TotalBalanceHelperItems = AppConstants.AMM_ASSET1_TOTAL_BALANCE_HELPER_ITEMS;
     readonly showAsset2TotalBalanceHelperItems = AppConstants.AMM_ASSET2_TOTAL_BALANCE_HELPER_ITEMS;

     showAsset1TotalBalanceHelper = signal(false);
     showAsset2TotalBalanceHelper = signal(false);

     // Toggle Methods
     toggleAsset1TotalBalanceHelper() {
          this.showAsset1TotalBalanceHelper.set(!this.showAsset1TotalBalanceHelper());
     }

     toggleAsset2TotalBalanceHelper() {
          this.showAsset2TotalBalanceHelper.set(!this.showAsset2TotalBalanceHelper());
     }
}
