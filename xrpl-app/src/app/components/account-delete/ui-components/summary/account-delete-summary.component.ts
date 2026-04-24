import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { RouterModule } from '@angular/router';
import { AccountDeleteViewModelService } from '../../../../services/account-delete/account-delete-view-model/account-delete-view-model.service';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';

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
     info = input.required<{ walletName: string; canDelete: boolean; blockers: BlockerItem[]; balanceWarning: string | null } | null | undefined>();
     infoPanelExpanded = input.required<boolean>();

     toggleInfoPanel = output<void>();

     public deleteAccountViewModelService = inject(AccountDeleteViewModelService);

     hasContent(): boolean {
          const i = this.info();
          if (!i) return false;
          return i.blockers.length > 0 || !i.canDelete || !!i.balanceWarning;
     }

     getEmptyStateMessage(): string {
          const infoData = this.info();
          if (!infoData) return 'No blocking objects detected.';

          if (infoData.blockers.length === 0 && !infoData.balanceWarning) {
               return 'There are no blockers prohibiting account deletion.';
          }

          return '';
     }
}
