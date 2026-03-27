import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { SelectSearchDropdownComponent, SelectItem } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { XrplExpirationInputComponent } from '../../../shared/xrpl-expiration-input/xrpl-expiration-input.component';

@Component({
     selector: 'app-payment-channel-create',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, XrplExpirationInputComponent],
     templateUrl: './payment-channel-create.component.html',
     styleUrl: './payment-channel-create.component.css',
})
export class PaymentChannelCreateComponent {
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly txUiService = inject(TransactionUiService);

     // Destination dropdown – passed from parent (keeps logic in the main page)
     @Input() destinationItems: SelectItem[] = [];
     @Input() selectedDestinationItem: SelectItem | null = null;
     @Output() destinationChanged = new EventEmitter<SelectItem | null>();

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input) input.select();
     }
}
