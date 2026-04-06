import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, output, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { SelectSearchDropdownComponent, SelectItem } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';

@Component({
     selector: 'app-payment-channel-create',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule],
     templateUrl: './payment-channel-create.component.html',
     styleUrl: './payment-channel-create.component.css',
})
export class PaymentChannelCreateComponent {
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     // Destination dropdown – passed from parent (keeps logic in the main page)
     @Input() destinationItems: SelectItem[] = [];
     @Input() selectedDestinationItem: SelectItem | null = null;
     @Output() destinationChanged = new EventEmitter<SelectItem | null>();
     optionsToggled = output<boolean>();

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input) input.select();
     }
}
