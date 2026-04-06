import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { AccountChangesOrchestratorService } from '../../services/account-balance-changes/account-changes-orchestrator/account-changes-orchestrator.service';
import { AccountChangesStoreService } from '../../services/account-balance-changes/account-changes-store/account-changes-store.service';
import { AccountChangesViewModelService } from '../../services/account-balance-changes/account-changes-view-model/account-changes-view-model.service';
import { AccountChangesSummaryComponent } from './ui-components/account-changes-summary/account-changes-summary.component';
import { AccountChangesFiltersComponent } from './ui-components/account-changes-filters/account-changes-filters.component';
import { AccountChangesTableComponent } from './ui-components/account-changes-table/account-changes-table.component';

@Component({
     selector: 'app-account-changes',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, LucideAngularModule, NgIcon, NavbarComponent, WalletPanelComponent, WarningMessageComponent, AccountChangesSummaryComponent, AccountChangesFiltersComponent, AccountChangesTableComponent],
     templateUrl: './account-balance-changes.component.html',
     styleUrl: './account-balance-changes.component.css',
})
export class AccountChangesComponent extends PerformanceBaseComponent implements OnInit {
     public readonly walletManager = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly store = inject(AccountChangesStoreService);
     public readonly orchestrator = inject(AccountChangesOrchestratorService);
     public readonly viewModel = inject(AccountChangesViewModelService);

     ngOnInit(): void {
          this.orchestrator.loadBalanceChanges(true);
     }

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     onWalletSelected(wallet: Wallet): void {
          this.txUiService.currentWallet.set({ ...wallet });
          this.orchestrator.invalidateCacheAndReload(wallet.address);
     }

     onLoadMore(): void {
          this.orchestrator.loadBalanceChanges(false);
     }

     onRefresh(): void {
          this.orchestrator.loadBalanceChanges(true);
     }
}
