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
     details?: string[];
}

export interface DeleteAccountInfo {
     walletName: string;
     blockers: BlockerItem[];
     eligibilityIssues: BlockerItem[];
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
     info = input.required<{ walletName: string; canDelete: boolean; blockers: BlockerItem[]; eligibilityIssues: BlockerItem[]; balanceWarning: string | null } | null | undefined>();
     infoPanelExpanded = input<boolean>();
     tab = input<string>('delete');
     resetTrigger = input<unknown>();

     toggleInfoPanel = output<void>();

     public deleteAccountViewModelService = inject(AccountDeleteViewModelService);

     // Computed values for better reactivity
     hasContent = computed(() => {
          const i = this.info();
          if (!i) return false;
          return i.blockers.length > 0 || i.eligibilityIssues.length > 0 || !!i.balanceWarning;
     });

     issueCount = computed(() => {
          const i = this.info();
          if (!i) return 0;
          return i.blockers.length + i.eligibilityIssues.length + Number(!!i.balanceWarning);
     });

     emptyStateMessage = computed(() => {
          const infoData = this.info();
          if (!infoData) return 'Deletion status is unavailable.';

          return 'No deletion blockers or requirements need attention.';
     });

     summaryMessage = computed(() => {
          const infoData = this.info();
          if (!infoData) return '';

          if (this.issueCount() === 0) {
               return ' has no blockers preventing account deletion.';
          }

          const blockingObjects = infoData.blockers.reduce((count, blocker) => count + blocker.count, 0);
          const requirements = infoData.eligibilityIssues.length + Number(!!infoData.balanceWarning);
          const objectText = `${blockingObjects} blocking object${blockingObjects === 1 ? '' : 's'}`;
          const requirementText = `${requirements} deletion requirement${requirements === 1 ? '' : 's'}`;
          return ` has <strong>${objectText}</strong> and <strong>${requirementText}</strong> that need attention.`;
     });
}
