import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectSearchDropdownComponent, SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component'; // ← adjust path if needed
import { TrustlineCurrencyService } from '../../../../services/trustline-currency/trustline-util/trustline-currency.service';
import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';

@Component({
     selector: 'app-trustline-issuers',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent],
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
}
