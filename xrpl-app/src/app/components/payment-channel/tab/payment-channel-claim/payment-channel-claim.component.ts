import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-payment-channel-claim',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, SelectSearchDropdownComponent, MatSlideToggleModule],
     templateUrl: './payment-channel-claim.component.html',
     styleUrl: './payment-channel-claim.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentChannelClaimComponent {
     public readonly viewModel = inject(PaymentChannelViewModelService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly walletManagerService = inject(WalletManagerService);

     readonly isIdle = computed(() => this.txUiService.currentStep() === 'idle');

     toggleCreatorMode(input: HTMLInputElement): void {
          this.paymentChannelStoreService.setField('isCreatorMode', input.checked);
     }

     toggleCreatorMode1(isChecked: boolean): void {
          this.paymentChannelStoreService.setField('isCreatorMode', isChecked);
     }

     async generateCreatorClaimSignature(): Promise<void> {
          const wallet = this.walletManagerService.getSelectedWallet();
          if (!wallet) return;
          await this.paymentChannelUtilService.generateCreatorClaimSignature(wallet);
     }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input) input.select();
     }
}
