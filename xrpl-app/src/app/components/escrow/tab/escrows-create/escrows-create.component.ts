import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { XrplExpirationInputComponent } from '../../../shared/xrpl-expiration-input/xrpl-expiration-input.component';
import { SelectSearchDropdownComponent, SelectItem } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { TrustlineCurrencyService } from '../../../../services/trustline-currency/trustline-util/trustline-currency.service';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../../../services/transaction-dropdown/transaction-dropdown.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { UtilsService } from '../../../../services/util-service/utils.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';

@Component({
     selector: 'app-escrows-create',
     standalone: true,
     imports: [CommonModule, FormsModule, MatSlideToggleModule, XrplExpirationInputComponent, SelectSearchDropdownComponent],
     templateUrl: './escrows-create.component.html',
     styleUrl: './escrows-create.component.css',
})
export class EscrowsCreateComponent {
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly viewModel = inject(EscrowTransactionViewModelService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);

     @Input() isConditional = false;

     public async onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          await this.trustlineUtilService.loadTrustlines(false);
          await this.trustlineCurrencyService.refreshCurrentBalance();
     }

     public async onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);
          if (this.currencyStoreService.currency() && address) {
               await this.trustlineUtilService.loadTrustlines(false);
               await this.trustlineCurrencyService.refreshCurrentBalance();
          }
     }

     public currencyItems() {
          return this.trustlineCurrencyService.currencyItems();
     }

     public selectedCurrencyItem() {
          const code = this.currencyStoreService.currency();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     }

     public issuerItems() {
          return this.trustlineCurrencyService.issuerItems();
     }

     public selectedIssuerItem() {
          const addr = this.currencyStoreService.issuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     }

     public mptItems() {
          return this.mptStoreService.existingMpts?.() || [];
     }

     public selectedMptItem() {
          return this.mptUtilService.computeSelectedMptItem(this.mptItems(), this.txUiService.mptIssuanceIdField());
     }

     public destinationItems() {
          return this.viewModel.destinationItems();
     }

     public selectedDestinationItem() {
          return this.viewModel.selectedDestinationItem();
     }

     public destinationSearchQuery() {
          return this.viewModel.destinationSearchQuery();
     }

     public handleSearchQueryChange(query: string) {
          this.viewModel.destinationSearchQuery.set(query);
     }

     public handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.viewModel.selectedDestinationAddress.set(addr);
          this.escrowStoreService.setField('destination', addr);
     }

     public onMptSelected(_item: any) {}

     public onFocus(event: Event) {
          (event.target as HTMLInputElement).select?.();
     }

     public toggleEscrowFinishAfterExpiration(enabled: boolean) {
          this.escrowStoreService.setField('enableEscrowFinishAfterExpirationDate', enabled);
     }

     public toggleEscrowCancelAfterExpiration(enabled: boolean) {
          this.escrowStoreService.setField('enableEscrowCancelAfterExpirationDate', enabled);
     }
}
