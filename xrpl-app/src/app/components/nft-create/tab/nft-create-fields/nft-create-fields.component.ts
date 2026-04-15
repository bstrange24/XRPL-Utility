import { ChangeDetectionStrategy, Component, computed, effect, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { NftTransactionOrchestrator } from '../../../../services/nft/nft-orchestrator/nft-orchestrator.service';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { XrplExpirationInputComponent } from '../../../shared/xrpl-expiration-input/xrpl-expiration-input.component';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { NftOffersTransactionViewModelService } from '../../../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { CurrencyAmountFormComponent } from '../../../shared/currency-amount-form/currency-amount-form.component';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';

@Component({
     selector: 'app-nft-create-fields',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, XrplExpirationInputComponent, MatSlideToggleModule, CurrencyAmountFormComponent, TransactionOptionsSectionComponent],
     templateUrl: './nft-create-fields.component.html',
     styleUrl: './nft-create-fields.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftCreateFieldsComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly nftOffersTransactionViewModelService = inject(NftOffersTransactionViewModelService);
     public readonly utilsService = inject(UtilsService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly nftCreateTransactionViewModelService = inject(NftTransactionViewModelService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftTransactionOrchestrator = inject(NftTransactionOrchestrator);

     readonly onlyXrpEnabled = computed(() => this.nftUtilService.nftFlags().onlyXrpNft ?? false);

     constructor() {
          // This effect now lives where the dropdown lives → instant reaction
          effect(
               () => {
                    const enabled = this.onlyXrpEnabled();
                    if (enabled) {
                         this.forceToXrp();
                    } else {
                         this.restorePreviousCurrency();
                    }
               },
               { allowSignalWrites: true }
          );
     }

     // Destination dropdown – passed from parent (keeps logic in the main page)
     @Input() destinationItems: SelectItem[] = [];
     @Input() selectedDestinationItem: SelectItem | null = null;
     @Input() destinationSearchQuery: string | null = null;
     @Output() destinationChanged = new EventEmitter<SelectItem | null>();
     @Output() currencySelected = new EventEmitter<SelectItem | null>();
     @Output() issuerSelected = new EventEmitter<SelectItem | null>();
     @Output() optionsToggled = new EventEmitter<boolean>();
     @Output() expirationToggled = new EventEmitter<boolean>();
     @Output() destinationSearchQueryChange = new EventEmitter<string>();
     @Output() destinationValueChange = new EventEmitter<SelectItem | null>();

     private forceToXrp() {
          const current = this.currencyStoreService.currency();

          if (current && current !== 'XRP') {
               this.previousNonXrpCurrency.set(current);
          }

          this.trustlineCurrencyService.selectCurrency('XRP');
          this.trustlineCurrencyService.refreshCurrentBalance(); // fire-and-forget
     }

     private restorePreviousCurrency() {
          const prev = this.previousNonXrpCurrency();
          if (prev && prev !== 'XRP') {
               this.trustlineCurrencyService.selectCurrency(prev);
               this.previousNonXrpCurrency.set(null);
          }
          this.trustlineCurrencyService.refreshCurrentBalance();
     }

     private readonly previousNonXrpCurrency = signal<string | null>(null);

     get onlyXrpEnabledSignal() {
          return this.nftUtilService.nftFlags().onlyXrpNft ?? false;
     }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }

     setNftExpirationDate = (value: string): void => {
          this.nftCreateStoreService.setField('expiration', value);
     };
}
