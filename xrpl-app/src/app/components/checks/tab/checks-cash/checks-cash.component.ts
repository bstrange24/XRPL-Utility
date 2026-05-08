import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineStoreService } from '../../../../services/trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LucideAngularModule } from 'lucide-angular';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';

@Component({
     selector: 'app-checks-cash',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, ToggleSliderComponent, SelectSearchDropdownComponent, MatSlideToggleModule],
     templateUrl: './checks-cash.component.html',
     styleUrl: './checks-cash.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecksCashComponent {
     readonly checksTransactionViewModelService = inject(ChecksTransactionViewModelService);
     readonly txUiService = inject(TransactionUiService);
     readonly utilsService = inject(UtilsService);
     readonly trustlineStoreService = inject(TrustlineStoreService);
     readonly checkStoreService = inject(ChecksStoreService);

     @Input() showEnableTrustline = false;
     @Output() checkItems = new EventEmitter<SelectItem | null>();
     @Output() checkSelected = new EventEmitter<SelectItem | null>();
     @Output() selectedCheckItem = new EventEmitter<SelectItem | null>();

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }
}
