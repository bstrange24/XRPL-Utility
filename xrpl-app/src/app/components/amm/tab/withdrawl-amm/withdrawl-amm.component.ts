import { CommonModule } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AmmUtilsService } from '../../../../services/amm/amm-utils/amm-utils.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { PoolOptions } from '../../constants/amm.types';
import { AppConstants } from '../../../../core/app.constants';

@Component({
     selector: 'withdrawl-amm',
     standalone: true,
     imports: [CommonModule, FieldHelperComponent, FormsModule, NgIcon],
     templateUrl: './withdrawl-amm.component.html',
     styleUrl: './withdrawl-amm.component.css',
})
export class WithdrawlAmmComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);
     public readonly ammUtilsService = inject(AmmUtilsService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);

     // Outputs to parent
     pool1CurrencySelected = output<SelectItem | null>();
     pool1IssuerSelected = output<SelectItem | null>();
     pool2CurrencySelected = output<SelectItem | null>();
     pool2IssuerSelected = output<SelectItem | null>();
     depositOptionChange = output<keyof PoolOptions>();
     withdrawOptionChange = output<keyof PoolOptions>();
     destinationSearchQueryChange = output<string>();
     destinationValueChange = output<SelectItem | null>();

     // Helper Items
     readonly showLpWithdrawHelperItems = AppConstants.AMM_TRADING_FEE_HELPER_ITEMS;
     readonly showLpTokenBalanceHelperItems = AppConstants.AMM_LP_TOKEN_BALANCE_HELPER_ITEMS;
     readonly showLpHolderAddressHelperItems = AppConstants.AMM_LP_HOLDER_ADDRESS_HELPER_ITEMS;
     readonly showSwapDestinationHelperItems = AppConstants.AMM_SWAP_DESTINATION_HELPER_ITEMS;

     // UI Signals
     showLpWithdrawHelper = signal(false);
     showLpTokenBalanceHelper = signal(false);
     showLpHolderAddressHelper = signal(false);
     showSwapDestinationHelper = signal(false);

     // Toggle Methods
     toggleLpWithdrawHelper() {
          this.showLpWithdrawHelper.set(!this.showLpWithdrawHelper());
     }

     toggleLpTokenBalanceHelper() {
          this.showLpTokenBalanceHelper.set(!this.showLpTokenBalanceHelper());
     }

     toggleLpHolderAddressHelper() {
          this.showLpHolderAddressHelper.set(!this.showLpHolderAddressHelper());
     }

     toggleSwapDestinationHelper() {
          this.showSwapDestinationHelper.set(!this.showSwapDestinationHelper());
     }
}
