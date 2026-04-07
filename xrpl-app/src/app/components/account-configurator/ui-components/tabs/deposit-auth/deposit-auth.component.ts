import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { NgIcon } from '@ng-icons/core';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';

@Component({
     selector: 'app-deposit-auth',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, NgIcon],
     templateUrl: './deposit-auth.component.html',
     styleUrl: './deposit-auth.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepositAuthComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     protected accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     protected accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     protected txUiService = inject(TransactionUiService);

     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();
}
