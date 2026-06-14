import { CommonModule } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AmmUtilsService } from '../../../../services/amm/amm-utils/amm-utils.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { PoolOptions } from '../../constants/amm.types';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';

@Component({
     selector: 'amm-asset-issuer-fields',
     standalone: true,
     imports: [CommonModule, FieldHelperComponent, FormsModule, SelectSearchDropdownComponent, NgIcon],
     templateUrl: './amm-asset-issuer-fields.component.html',
     styleUrl: './amm-asset-issuer-fields.component.css',
})
export class AmmAssetIssuerFieldsComponent {
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
     readonly showAsset1HelperItems = AppConstants.AMM_ASSET1_HELPER_ITEMS;
     readonly showAsset2HelperItems = AppConstants.AMM_ASSET2_HELPER_ITEMS;
     readonly showIssuerAsset1HelperItems = AppConstants.AMM_ISSUER_ASSET1_HELPER_ITEMS;
     readonly showIssuerAsset2HelperItems = AppConstants.AMM_ISSUER_ASSET1_HELPER_ITEMS;

     // UI Signals
     showAsset1Helper = signal(false);
     showAsset2Helper = signal(false);
     showIssuerAsset1Helper = signal(false);
     showIssuerAsset2Helper = signal(false);

     // Toggle Methods
     toggleAsset1Helper() {
          this.showAsset1Helper.set(!this.showAsset1Helper());
     }

     toggleAsset2Helper() {
          this.showAsset2Helper.set(!this.showAsset2Helper());
     }

     toggleIssuerAsset1Helper() {
          this.showIssuerAsset1Helper.set(!this.showIssuerAsset1Helper());
     }

     toggleIssuerAsset2Helper() {
          this.showIssuerAsset2Helper.set(!this.showIssuerAsset2Helper());
     }
}
