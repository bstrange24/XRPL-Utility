import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../../services/connection-guard/connection-guard.service';

@Component({
     selector: 'app-account-flags',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule],
     templateUrl: './account-flags.component.html',
     styleUrl: './account-flags.component.css',
})
export class AccountFlagsComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     protected accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     protected accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     protected txUiService = inject(TransactionUiService);

     configurationType = this.accountConfiguratorStoreService.configurationType;
     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();
}
