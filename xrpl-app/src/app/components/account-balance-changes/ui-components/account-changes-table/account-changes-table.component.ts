import { Component, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule } from 'lucide-angular';
import { AccountChangesStoreService } from '../../../../services/account-balance-changes/account-changes-store/account-changes-store.service';
import { AccountChangesViewModelService } from '../../../../services/account-balance-changes/account-changes-view-model/account-changes-view-model.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { BalanceChange } from '../../constants/account-balance.types';

@Component({
     selector: 'app-account-changes-table',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, ScrollingModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, LucideAngularModule],
     templateUrl: './account-changes-table.component.html',
     styleUrl: './account-changes-table.component.css',
})
export class AccountChangesTableComponent {
     public readonly store = inject(AccountChangesStoreService);
     public readonly viewModel = inject(AccountChangesViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly copyUtilService = inject(CopyUtilService);

     readonly scrolledToBottom = output<void>();

     onScroll(event: Event): void {
          if (this.store.loadingMore() || !this.store.hasMoreData()) return;
          const el = event.target as HTMLElement;
          if (el.scrollHeight - el.scrollTop <= el.clientHeight + 200) {
               this.scrolledToBottom.emit();
          }
     }

     copyToClipboard(text: string): void {
          this.copyUtilService.copyTxHash(text);
     }

     trackByHash(_: number, item: BalanceChange): string {
          return item.hash;
     }
}
