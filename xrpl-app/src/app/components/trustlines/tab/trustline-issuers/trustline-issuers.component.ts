import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Input, Output } from '@angular/core';
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

@Component({
     selector: 'app-trustline-issuers',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, FocusBorderDirective, SelectSearchDropdownComponent],
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
}
