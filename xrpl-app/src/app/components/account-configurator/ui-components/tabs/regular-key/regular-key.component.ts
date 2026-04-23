import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { NgIcon } from '@ng-icons/core';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionOptionsComponent } from '../../../../shared/transaction-options/transaction-options.component';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';

@Component({
     selector: 'app-regular-key',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, NgIcon, TransactionOptionsComponent],
     templateUrl: './regular-key.component.html',
     styleUrl: './regular-key.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegularKeyComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);
     protected accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     protected accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     protected txUiService = inject(TransactionUiService);

     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();

     regularKeyAddressValid(): boolean {
          const address = this.accountConfiguratorStoreService.regularKeyAddress();
          return !!address && address.startsWith('r') && address.length >= 25;
     }

     regularKeyAddressInvalid(): boolean {
          const address = this.accountConfiguratorStoreService.regularKeyAddress();
          return !!address && !this.regularKeyAddressValid();
     }
}
