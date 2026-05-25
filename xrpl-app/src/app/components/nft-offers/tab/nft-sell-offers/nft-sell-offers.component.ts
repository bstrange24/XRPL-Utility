import { ChangeDetectionStrategy, Component, effect, EventEmitter, inject, Input, output, Output, signal } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { XrplExpirationInputComponent } from '../../../shared/xrpl-expiration-input/xrpl-expiration-input.component';
import { CurrencyAmountFormComponent } from '../../../shared/currency-amount-form/currency-amount-form.component';
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { NftOffersTransactionViewModelService } from '../../../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { NftTransactionOrchestrator } from '../../../../services/nft/nft-orchestrator/nft-orchestrator.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { NftOfferValidatorService } from '../../../../services/shared/validators/nft-offer/nft-offer-validator/nft-offer-validator.service';
import { NftSellService } from '../../../../services/shared/validators/nft-offer/nft-sell/nft-sell.service';
import { NftValidatorService } from '../../../../services/shared/validators/nft/nft-validator/nft-validator.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { NgIcon } from '@ng-icons/core';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { NftSellOfferService } from '../../../../services/shared/validators/nft-offer/nft-sell-offer/nft-sell-offer.service';

@Component({
     selector: 'app-nft-sell-offers',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, SelectSearchDropdownComponent, XrplExpirationInputComponent, MatSlideToggleModule, CurrencyAmountFormComponent, NgIcon, FocusBorderDirective, FieldHelperComponent],
     templateUrl: './nft-sell-offers.component.html',
     styleUrl: './nft-sell-offers.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftSellOffersComponent {
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
     public readonly nftOfferValidatorService = inject(NftOfferValidatorService);
     public readonly nftSellService = inject(NftSellService);
     public readonly nftValidatorService = inject(NftValidatorService);
     public readonly nftSellOfferService = inject(NftSellOfferService);

     // Helper info items
     readonly nftIdHelperItems = AppConstants.NFT_ID_HELPER_ITEMS;

     // Outputs
     canSellNftOfferChange = output<boolean>();
     validationErrorsChange = output<string[]>();

     // UI State
     showNftIdHelper = signal(false);
     isNftIdFocused = signal(false);

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

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canSellNftOfferChange.emit(this.nftSellOfferService.canSellNftOffer());
               this.validationErrorsChange.emit(this.nftOfferValidatorService.getAllValidationErrors());
          });
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

     onNftSelected(item: SelectItem | null) {   // called from child components
  const id = item?.id || '';
  this.nftCreateStoreService.setField('nftId', id);
}

     // Clear methods
     clearNftId() {
          this.nftCreateStoreService.setField('nftId', '');
     }

     // Helper toggles
     toggleNftIdHelper() {
          this.showNftIdHelper.set(!this.showNftIdHelper());
     }

     // Focus handlers
     onNftIdFocus() {
          this.isNftIdFocused.set(true);
     }

     onNftIdBlur() {
          this.isNftIdFocused.set(false);
     }

     // Get formatted balance display
     getFormattedBalance(): string {
          const balance = this.currencyStoreService.balance();
          const currency = this.currencyStoreService.currency();
          return `${Number(balance).toFixed(6)} ${currency}`;
     }
}
