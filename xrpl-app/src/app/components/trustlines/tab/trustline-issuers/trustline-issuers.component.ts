import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectSearchDropdownComponent, SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component'; // ← adjust path if needed
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import * as xrpl from 'xrpl';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-trustline-issuers',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, NgIcon, LucideAngularModule, FocusBorderDirective, SelectSearchDropdownComponent],
     templateUrl: './trustline-issuers.component.html',
     styleUrl: './trustline-issuers.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlineIssuersComponent {
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineViewModelService = inject(TrustlineViewModelService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly currencyStoreService = inject(CurrencyStoreService);

     @Input() isIdle: boolean = false;

     @Output() currencySelected = new EventEmitter<SelectItem | null>();
     @Output() issuerSelected = new EventEmitter<SelectItem | null>();

     // Helper Items
     readonly newCurrencyCodeHelperItems = AppConstants.NEW_CURRENCY_CODE_HELPER_ITEMS;
     readonly newIssuerHelperItems = AppConstants.NEW_ISSUER_HELPER_ITEMS;
     readonly removeCurrencyHelperItems = AppConstants.REMOVE_CURRENCY_HELPER_ITEMS;
     readonly removeIssuerHelperItems = AppConstants.REMOVE_ISSUER_HELPER_ITEMS;

     // UI Signals
     showNewCurrencyCodeHelper = signal(false);
     showNewIssuerHelper = signal(false);
     showRemoveCurrencyHelper = signal(false);
     showRemoveIssuerHelper = signal(false);

     hasValidCurrencyCode = computed(() => {
          const code = this.currencyStoreService.newCurrency()?.trim();

          if (!code) return false;

          if (code.toUpperCase() === 'XRP') {
               return false;
          }

          const isStandardCode = /^[A-Za-z0-9]{3}$/.test(code);
          const isHexCode = /^[A-Fa-f0-9]{40}$/.test(code);

          return isStandardCode || isHexCode;
     });

     hasInvalidCurrencyCode = computed(() => {
          const code = this.currencyStoreService.newCurrency()?.trim();

          if (!code) return false;

          return !this.hasValidCurrencyCode();
     });

     hasValidAddress = computed(() => {
          const addr = this.currencyStoreService.newIssuer()?.trim();
          if (!addr) return false;
          return xrpl.isValidAddress(addr);
     });

     isInvalidAddress = computed(() => {
          const addr = this.currencyStoreService.newIssuer()?.trim();
          if (!addr) return false;
          return !xrpl.isValidAddress(addr);
     });

     // Toggle Methods
     toggleNewCurrencyCodeHelper() {
          this.showNewCurrencyCodeHelper.set(!this.showNewCurrencyCodeHelper());
     }

     toggleNewIssuerHelper() {
          this.showNewIssuerHelper.set(!this.showNewIssuerHelper());
     }

     toggleRemoveCurrencyHelper() {
          this.showRemoveCurrencyHelper.set(!this.showRemoveCurrencyHelper());
     }

     toggleRemoveIssuerHelper() {
          this.showRemoveIssuerHelper.set(!this.showRemoveIssuerHelper());
     }
}
