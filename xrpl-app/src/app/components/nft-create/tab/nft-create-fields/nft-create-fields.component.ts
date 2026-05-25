import { ChangeDetectionStrategy, Component, computed, effect, EventEmitter, inject, input, Input, output, Output, signal } from '@angular/core';
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
import { LucideAngularModule } from 'lucide-angular';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { NftCreateValidatorService } from '../../../../services/shared/validators/nft/nft-create-validator/nft-create-validator.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { NgIcon } from '@ng-icons/core';
import { UriValidatorService } from '../../../../services/shared/validators/uri-validator/uri-validator.service';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';
import { NftValidatorService } from '../../../../services/shared/validators/nft/nft-validator/nft-validator.service';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';

@Component({
     selector: 'app-nft-create-fields',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, FocusBorderDirective, FieldHelperComponent, ToggleSliderComponent, LucideAngularModule, SelectSearchDropdownComponent, XrplExpirationInputComponent, MatSlideToggleModule, CurrencyAmountFormComponent],
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
     public readonly nftCreateValidator = inject(NftCreateValidatorService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly uriValidatorService = inject(UriValidatorService);
     public readonly nftValidatorService = inject(NftValidatorService);

     // Preset values for quick selection
     readonly assetScalePresets = AppConstants.ASSET_SCALE_PRESETS;
     readonly taxonPresets = AppConstants.TAXON_PRESETS;
     readonly transferFeePresets = AppConstants.TRANSFER_RATE_PRESETS;

     // Helpler info
     readonly transferFeeHelperItems = AppConstants.TRANSFER_FEE_HELPER_ITEMS;
     readonly uriHelperItems = AppConstants.URI_HELPER_ITEMS;
     readonly minterHelperItems = AppConstants.MINTER_HELPER_ITEMS;
     readonly taxonHelperItems = AppConstants.TAXON_HELPER_ITEMS;
     readonly destinationHelperItems = AppConstants.DESTINATION_HELPER_ITEMS;

     readonly onlyXrpEnabled = computed(() => this.nftUtilService.nftFlags().onlyXrpNft ?? false);
     readonly lastIntendedDestination = input<string>('');
     readonly currentAddress = input<string>('');
     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly selectedDestinationAddr = input<string>();
     readonly searchQueryChange = output<string>();
     readonly destinationChange = output<any>();
     readonly selectedDestinationAddress = output<string>();

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canCreateNftChange.emit(this.nftCreateValidator.canCreateNft());
               this.validationErrorsChange.emit(this.nftValidatorService.getAllValidationErrors());
          });

          effect(() => {
               const enabled = this.onlyXrpEnabled();
               if (enabled) {
                    this.forceToXrp();
               } else {
                    this.restorePreviousCurrency();
               }
          });
     }

     // Outputs
     canCreateNftChange = output<boolean>();
     validationErrorsChange = output<string[]>();

     // Signals
     showUriHelper = signal(false);
     showMinterHelper = signal(false);
     showTaxonHelper = signal(false);
     showTransferFeeHelper = signal(false);
     showDestinationHelper = signal(false);
     isDestinationValid = signal(false);

     // Destination dropdown – passed from parent (keeps logic in the main page)
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
          this.trustlineCurrencyService.refreshCurrentBalance();
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

     get destination() {
          return this.nftCreateStoreService.destination();
     }

     set destination(value: string) {
          this.nftCreateStoreService.setField('destination', value);
     }

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
          this.nftValidatorService.setDestinationValidation(isValid);
     }

     onDestinationChange(item: SelectItem | null) {
          const address = item?.id || '';
          this.destination = address;
          this.selectedDestinationAddress.emit(address);
     }

     onSearchQueryChange(query: string) {
          this.searchQueryChange.emit(query);
          // Also update store in real-time for validation
          this.nftCreateStoreService.setField('destination', query);
     }

     setNftExpirationDate = (value: string): void => {
          this.nftCreateStoreService.setField('expiration', value);
     };

     setPresetTaxon(count: number) {
          this.nftCreateStoreService.setField('taxon', count.toString());
     }

     get taxon() {
          return this.nftCreateStoreService.taxon();
     }

     set taxon(value: string) {
          this.nftCreateStoreService.setField('taxon', value);
     }

     setPresetTransferFee(fee: number) {
          this.nftCreateStoreService.setField('transferFee', fee);
     }

     get transferFee() {
          return this.nftCreateStoreService.transferFee();
     }

     set transferFee(value: number) {
          this.nftCreateStoreService.setField('transferFee', value);
     }

     get nftMinterAddress() {
          return this.nftCreateStoreService.nfTokenMinterAddress();
     }

     set nftMinterAddress(value: string) {
          this.nftCreateStoreService.setField('nfTokenMinterAddress', value);
     }

     toggleTransferFeeHelper() {
          this.showTransferFeeHelper.set(!this.showTransferFeeHelper());
     }

     toggleUriHelper() {
          this.showUriHelper.update(v => !v);
     }

     toggleMinterHelper() {
          this.showMinterHelper.update(v => !v);
     }

     toggleTaxonHelper() {
          this.showTaxonHelper.update(v => !v);
     }

     toggleDestinationHelper() {
          this.showDestinationHelper.set(!this.showDestinationHelper());
     }
}
