import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-payment-channel-close',
     standalone: true,
     imports: [CommonModule, FormsModule, FieldHelperComponent, NgIcon, LucideAngularModule, SelectSearchDropdownComponent],
     templateUrl: './payment-channel-close.component.html',
     styleUrl: './payment-channel-close.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelCloseComponent {
     public readonly viewModel = inject(PaymentChannelViewModelService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);

     // === Helper Items ===
     readonly closePaymentChannelDetailsHelperItems = AppConstants.CLOSE_PAYMENT_CHANNEL_DETAILS_HELPER_ITEMS;
     readonly channelSelectorHelperItems = AppConstants.CHANNEL_SELECTOR_HELPER_ITEMS;
     readonly channelIdHelperItems = AppConstants.PAYMENT_CHANNEL_ID_HELPER_ITEMS;

     // UI State
     showClosePaymentChannelDetailsHelper = signal(false);
     showChannelSelectorHelper = signal(false);
     showChannelIdHelper = signal(false);

     // Toggle Methods
     toggleClosePaymentChannelDetailsHelper() {
          this.showClosePaymentChannelDetailsHelper.set(!this.showClosePaymentChannelDetailsHelper());
     }

     toggleChannelSelectorHelper() {
          this.showChannelSelectorHelper.set(!this.showChannelSelectorHelper());
     }

     toggleChannelIdHelper() {
          this.showChannelIdHelper.set(!this.showChannelIdHelper());
     }
}
