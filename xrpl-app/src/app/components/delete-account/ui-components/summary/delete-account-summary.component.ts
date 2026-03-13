import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { RouterModule } from '@angular/router';
import { DeleteAccountViewModelService } from '../../../../services/delete-account/delete-account-view-model/delete-account-view-model.service';

export interface BlockerItem {
     label: string;
     count: number;
     route: string;
     tab?: string;
}

@Component({
     selector: 'app-delete-account-summary',
     standalone: true,
     imports: [
          NgIcon,
          LucideAngularModule,
          RouterModule, // for [routerLink]
     ],
     templateUrl: './delete-account-summary.component.html',
     styleUrl: './delete-account-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAccountSummaryComponent {
     // ── Inputs ────────────────────────────────────────
     info = input.required<
          | {
                 walletName: string;
                 canDelete: boolean;
                 blockers: BlockerItem[];
                 balanceWarning: string | null;
            }
          | null
          | undefined
     >();

     infoPanelExpanded = input.required<boolean>();

     // ── Outputs ───────────────────────────────────────
     toggleInfoPanel = output<void>();

     // ── Injected services ─────────────────────────────
     public deleteAccountViewModelService = inject(DeleteAccountViewModelService);

     // ── Helpers ───────────────────────────────────────
     hasContent(): boolean {
          const i = this.info();
          if (!i) return false;
          return i.blockers.length > 0 || !i.canDelete || !!i.balanceWarning;
     }
}
