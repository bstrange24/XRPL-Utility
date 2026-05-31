import { Component, input, output, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { RouterModule } from '@angular/router';
import { AccountDeleteViewModelService } from '../../../../services/account-delete/account-delete-view-model/account-delete-view-model.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';

export interface BlockerItem {
     label: string;
     count: number;
     route: string;
     tab?: string;
}

export interface DeleteAccountInfo {
     walletName: string;
     blockers: BlockerItem[];
     balanceWarning: string | null;
}

@Component({
     selector: 'app-account-delete-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, RouterModule, SummaryContainerComponent],
     templateUrl: './account-delete-summary.component.html',
     styleUrl: './account-delete-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeleteSummaryComponent {
     private readonly walletManager = inject(WalletManagerService);

     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     info = input.required<{ walletName: string; canDelete: boolean; blockers: BlockerItem[]; balanceWarning: string | null } | null | undefined>();
     infoPanelExpanded = input<boolean>();
     tab = input<string>('delete');

     toggleInfoPanel = output<void>();

     public deleteAccountViewModelService = inject(AccountDeleteViewModelService);

     // Computed values for better reactivity
     hasContent = computed(() => {
          const i = this.info();
          if (!i) return false;
          return i.blockers.length > 0 || !!i.balanceWarning;
     });

     emptyStateMessage = computed(() => {
          const infoData = this.info();
          if (!infoData) return 'No blocking objects detected.';

          if (infoData.blockers.length === 0 && !infoData.balanceWarning) {
               return 'This account has no blockers and is ready for deletion.';
          }

          if (infoData.blockers.length === 0 && infoData.balanceWarning) {
               return 'No blocking objects found, but balance issues remain.';
          }

          return `${infoData.blockers.length} blocking object${infoData.blockers.length === 1 ? '' : 's'} need to be resolved.`;
     });

     summaryMessage = computed(() => {
          const infoData = this.info();
          if (!infoData) return '';

          const count = infoData.blockers.length;

          if (count === 0 && !infoData.balanceWarning) {
               return ' has no blockers preventing account deletion.';
          }

          if (count === 0 && infoData.balanceWarning) {
               return ' has no blockers, but balance needs attention.';
          }

          return ` has <strong>${count}</strong> blocking object${count === 1 ? '' : 's'} that must be resolved.`;
     });
}
