import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { XrplExpirationInputComponent } from '../../../shared/xrpl-expiration-input/xrpl-expiration-input.component';

@Component({
     selector: 'app-payment-channel-fund',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule, XrplExpirationInputComponent],
     templateUrl: './payment-channel-fund.component.html',
     styleUrl: './payment-channel-fund.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelFundComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly viewModel = inject(PaymentChannelViewModelService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);

     optionsToggled = output<boolean>();

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input) input.select();
     }
}
