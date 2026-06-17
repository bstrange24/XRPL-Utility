import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AmmUtilsService } from '../../../../services/amm/amm-utils/amm-utils.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { PoolOptions } from '../../constants/amm.types';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { NgIcon } from '@ng-icons/core';
import { AmmAssetIssuerFieldsComponent } from '../amm-asset-issuer-fields/amm-asset-issuer-fields.component';
import { AmmBalanceFieldsComponent } from '../amm-balance-fields/amm-balance-fields.component';
import { AmmAmountFieldsComponent } from '../amm-amount-fields/amm-amount-fields.component';
import { DepositAmmComponent } from '../deposit-amm/deposit-amm.component';
import { WithdrawlAmmComponent } from '../withdrawl-amm/withdrawl-amm.component';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-amm-fields',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, SelectSearchDropdownComponent, NgIcon, AmmAssetIssuerFieldsComponent, AmmBalanceFieldsComponent, AmmAmountFieldsComponent, DepositAmmComponent, WithdrawlAmmComponent],
     templateUrl: './amm-fields.component.html',
     styleUrl: './amm-fields.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmmFieldsComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);
     public readonly ammUtilsService = inject(AmmUtilsService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);

     readonly amountHintMap: Record<string, { verb: string; preposition: string }> = {
          createAMM: { verb: 'seed', preposition: 'to create' },
          depositToAMM: { verb: 'deposit', preposition: 'into' },
          withdrawalFromAMM: { verb: 'withdraw', preposition: 'from' },
          clawbackFromAMM: { verb: 'claw back', preposition: 'from' },
          swapViaAMM: { verb: 'swap', preposition: 'through' },
     };

     // Inputs from parent (destination dropdown)
     tab = input.required<string>();
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();

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
     readonly showTradingFeeHelperItems = AppConstants.AMM_TRADING_FEE_HELPER_ITEMS;
     readonly showLpTokenBalanceHelperItems = AppConstants.AMM_LP_TOKEN_BALANCE_HELPER_ITEMS;
     readonly showLpHolderAddressHelperItems = AppConstants.AMM_LP_HOLDER_ADDRESS_HELPER_ITEMS;
     readonly showSwapDestinationHelperItems = AppConstants.AMM_SWAP_DESTINATION_HELPER_ITEMS;
     readonly showClawbackLpTokenHelperItems = AppConstants.AMM_CLAWBACK_LP_TOKEN_HELPER_ITEMS;
     readonly showClawbackHolderHelperItems = AppConstants.AMM_CLAWBACK_HOLDER_HELPER_ITEMS;

     // UI Signals
     showLpWithdrawHelper = signal(false);
     showTradingFeeHelper = signal(false);
     showLpTokenBalanceHelper = signal(false);
     showLpHolderAddressHelper = signal(false);
     showSwapDestinationHelper = signal(false);
     showClawbackLpTokenHelper = signal(false);
     showClawbackHolderHelper = signal(false);
     isDestinationValid = signal(false);

     // Toggle Methods
     toggleTradingFeeHelper() {
          this.showTradingFeeHelper.set(!this.showTradingFeeHelper());
     }

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

     toggleClawbackLpTokenHelper() {
          this.showClawbackLpTokenHelper.set(!this.showClawbackLpTokenHelper());
     }

     toggleClawbackHolderHelper() {
          this.showClawbackHolderHelper.set(!this.showClawbackHolderHelper());
     }

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
     }
}
