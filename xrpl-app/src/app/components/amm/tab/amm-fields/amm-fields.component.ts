import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectItem, SelectSearchDropdownComponent } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AmmUtilsService } from '../../../../services/amm/amm-utils/amm-utils.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { PoolOptions } from '../../constants/amm.types';
import { UtilsService } from '../../../../services/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';

@Component({
     selector: 'app-amm-fields',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
     templateUrl: './amm-fields.component.html',
     styleUrl: './amm-fields.component.css',
})
export class AmmFieldsComponent {
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
}
