import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { TransactionOptionsComponent } from '../../../../shared/transaction-options/transaction-options.component';

@Component({
     selector: 'app-account-flags',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, TransactionOptionsComponent],
     templateUrl: './account-flags.component.html',
     styleUrl: './account-flags.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFlagsComponent {
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);
     public readonly connectionGuard = inject(ConnectionGuardService);
     protected accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     protected accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     protected txUiService = inject(TransactionUiService);

     configurationType = this.accountConfiguratorStoreService.configurationType;
     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();
}
