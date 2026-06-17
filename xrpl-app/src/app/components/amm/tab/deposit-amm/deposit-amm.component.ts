import { CommonModule } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AmmUtilsService } from '../../../../services/amm/amm-utils/amm-utils.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { PoolOptions } from '../../constants/amm.types';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'deposit-amm',
     standalone: true,
     imports: [CommonModule, FieldHelperComponent, FormsModule, NgIcon],
     templateUrl: './deposit-amm.component.html',
     styleUrl: './deposit-amm.component.css',
})
export class DepositAmmComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);
     public readonly ammUtilsService = inject(AmmUtilsService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);

     // Helper Items
     readonly showLpTokenBalanceHelperItems = AppConstants.AMM_LP_TOKEN_BALANCE_HELPER_ITEMS;

     // Outputs to parent
     pool1CurrencySelected = output<SelectItem | null>();
     pool1IssuerSelected = output<SelectItem | null>();
     pool2CurrencySelected = output<SelectItem | null>();
     pool2IssuerSelected = output<SelectItem | null>();
     depositOptionChange = output<keyof PoolOptions>();
     withdrawOptionChange = output<keyof PoolOptions>();
     destinationSearchQueryChange = output<string>();
     destinationValueChange = output<SelectItem | null>();

     // UI Signals
     showLpTokenBalanceHelper = signal(false);

     selectDepositOption(key: keyof PoolOptions) {
          this.ammUtilsService.selectDepositOption(key);
          this.depositOptionChange.emit(key); // keep the emit if parent still needs it
     }

     toggleLpTokenBalanceHelper() {
          this.showLpTokenBalanceHelper.set(!this.showLpTokenBalanceHelper());
     }
}
