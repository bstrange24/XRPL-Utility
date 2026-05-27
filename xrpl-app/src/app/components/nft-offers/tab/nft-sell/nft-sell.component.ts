import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { XrplExpirationInputComponent } from '../../../shared/xrpl-expiration-input/xrpl-expiration-input.component';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { CurrencyAmountFormComponent } from '../../../shared/currency-amount-form/currency-amount-form.component';
import { NftOffersTransactionViewModelService } from '../../../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { NftTransactionOrchestrator } from '../../../../services/nft/nft-orchestrator/nft-orchestrator.service';
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { NgIcon } from '@ng-icons/core';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { NftSellService } from '../../../../services/shared/validators/nft-offer/nft-sell/nft-sell.service';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { NftOfferValidatorService } from '../../../../services/shared/validators/nft-offer/nft-offer-validator/nft-offer-validator.service';
import { NftValidatorService } from '../../../../services/shared/validators/nft/nft-validator/nft-validator.service';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';

@Component({
     selector: 'app-nft-sell',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, SelectSearchDropdownComponent, XrplExpirationInputComponent, MatSlideToggleModule, CurrencyAmountFormComponent, NgIcon, FocusBorderDirective, FieldHelperComponent, ValidationErrorsComponent],
     templateUrl: './nft-sell.component.html',
     styleUrl: './nft-sell.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftSellComponent {
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

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canSellNftChange.emit(this.nftSellService.canSellNft());
               this.validationErrorsChange.emit(this.nftOfferValidatorService.getAllValidationErrors());
          });
     }

     // Helper info items
     readonly nftIdHelperItems = AppConstants.NFT_ID_HELPER_ITEMS;

     // Inputs
     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly destinationSearchQuery = input<string | null>(null);

     // Outputs
     readonly canSellNftChange = output<boolean>();
     readonly validationErrorsChange = output<string[]>();
     readonly nftSelected = output<any>();
     readonly destinationChanged = output<SelectItem | null>();
     readonly optionsToggled = output<boolean>();
     readonly expirationToggled = output<boolean>();
     readonly destinationSearchQueryChange = output<string>();
     readonly destinationValueChange = output<SelectItem | null>();
     readonly currencySelected = output<SelectItem | null>();
     readonly issuerSelected = output<SelectItem | null>();

     // UI State
     showOfferIndexHelper = signal(false);
     showNftIdHelper = signal(false);
     isNftIdFocused = signal(false);

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

     onNftSelected(item: SelectItem | null) {
          const id = item?.id || '';
          this.nftCreateStoreService.setField('nftId', id);
          this.nftSelected.emit(item); // ← Forward to parent
     }

     // Clear methods
     clearNftId() {
          this.nftCreateStoreService.setField('nftId', '');
     }

     // Helper toggles
     toggleNftIdHelper() {
          this.showNftIdHelper.set(!this.showNftIdHelper());
     }

     // Helper toggles
     toggleOfferIndexHelper() {
          this.showOfferIndexHelper.set(!this.showOfferIndexHelper());
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
