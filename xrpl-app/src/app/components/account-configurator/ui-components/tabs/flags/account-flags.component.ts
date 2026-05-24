import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { TransactionOptionsComponent } from '../../../../shared/transaction-options/transaction-options.component';
import { XrplAccountFlags } from '../../../constants/account-configurator.types';
import { NgIcon } from '@ng-icons/core';
import { FieldHelperComponent } from '../../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../../core/app.constants';

@Component({
     selector: 'app-account-flags',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, TransactionOptionsComponent, NgIcon, FieldHelperComponent],
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

     readonly configTemplatesHelperItems = AppConstants.CONFIG_TEMPLATES_HELPER_ITEMS;
     readonly accountFlagsHelperItems = AppConstants.ACCOUNT_FLAGS_HELPER_ITEMS;

     configurationType = this.accountConfiguratorStoreService.configurationType;
     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();

     // UI State signals
     showConfigTemplatesHelper = signal(false);
     showAccountFlagsHelper = signal(false);

     onFlagKeyDown(event: KeyboardEvent, key: keyof XrplAccountFlags) {
          if (event.key === ' ' || event.key === 'Enter') {
               event.preventDefault(); // prevents page scroll on space
               this.accountConfiguratorUtilService.toggleFlag(key);
          }
     }

     clearFlags() {
          this.accountConfiguratorUtilService.resetFlags();
          this.accountConfiguratorStoreService.setField('configurationType', null);
     }

     // Toggle methods
     toggleConfigTemplatesHelper() {
          this.showConfigTemplatesHelper.set(!this.showConfigTemplatesHelper());
     }

     toggleAccountFlagsHelper() {
          this.showAccountFlagsHelper.set(!this.showAccountFlagsHelper());
     }
}
