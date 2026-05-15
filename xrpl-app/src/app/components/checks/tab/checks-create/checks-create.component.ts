import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, input, Input, output, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { CheckUtilService } from '../../../../services/checks/checks-util/check-util.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';

@Component({
     selector: 'app-checks-create',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FocusBorderDirective, SelectSearchDropdownComponent, NgIcon, ToggleSliderComponent, LucideAngularModule, TransactionOptionsSectionComponent, MatSlideToggleModule],
     templateUrl: './checks-create.component.html',
     styleUrl: './checks-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksCreateComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly checksStoreService = inject(ChecksStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     public readonly utilsService = inject(UtilsService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly amountValidatorService = inject(AmountValidatorService);

     // Inputs from parent
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     wantsOptions = input.required<boolean>();
     canSubmit = input<boolean>(false);
     tab = input.required<string>();
     selectedDestinationAddress = input<string>();
     currentAddress = input<string>('');
     lastIntendedDestination = input<string>('');

     // Track destination validation status from dropdown
     isDestinationValid = signal(false);

     // Outputs to parent
     issuerSelected = output<SelectItem | null>();
     currencySelected = output<SelectItem | null>();
     canCreateCheckChange = output<boolean>();
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     optionsToggled = output<boolean>();
     toggleOptions = output<boolean>();
     canCreateCredentialChange = output<boolean>();

     private isSubjectValid = signal(false);
     private optionsHasError = signal(false);
     private optionsErrorMsg = signal('');
     private optionsErrors = signal<string[]>([]);

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

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
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

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }
}
