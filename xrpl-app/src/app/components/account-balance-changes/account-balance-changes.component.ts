import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase'; // ← Import this

import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { ToastService } from '../../services/utils/toast/toast.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { ActivatedRoute } from '@angular/router';
import { StorageService } from '../../services/shared/local-storage/storage.service';

import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message.component';
import { AccountChangesSummaryComponent } from './ui-components/account-changes-summary/account-changes-summary.component';
import { AccountChangesFiltersComponent } from './ui-components/account-changes-filters/account-changes-filters.component';
import { AccountChangesTableComponent } from './ui-components/account-changes-table/account-changes-table.component';

import { AccountChangesOrchestratorService } from '../../services/account-balance-changes/account-changes-orchestrator/account-changes-orchestrator.service';
import { AccountChangesStoreService } from '../../services/account-balance-changes/account-changes-store/account-changes-store.service';
import { AccountChangesViewModelService } from '../../services/account-balance-changes/account-changes-view-model/account-changes-view-model.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';

@Component({
     selector: 'app-account-changes',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, LucideAngularModule, NgIcon, WarningMessageComponent, AccountChangesSummaryComponent, AccountChangesFiltersComponent, AccountChangesTableComponent],
     templateUrl: './account-balance-changes.component.html',
     styleUrl: './account-balance-changes.component.css',
     host: { class: 'balance-page-component' },
})
export class AccountChangesComponent extends WalletDestinationBase implements OnInit {
     public readonly store = inject(AccountChangesStoreService);
     public readonly orchestrator = inject(AccountChangesOrchestratorService);
     public readonly viewModel = inject(AccountChangesViewModelService);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);

          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          // Optional: initial load (the effect in base class will also trigger it)
          // this.loadBalanceChangesForCurrentWallet();
     }

     /** Called automatically when user switches wallet */
     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.loadBalanceChangesForCurrentWallet();
     }

     private async loadBalanceChangesForCurrentWallet(): Promise<void> {
          const wallet = this.walletManager.getSelectedWallet();
          if (wallet?.address) {
               this.orchestrator.invalidateCacheAndReload(wallet.address);
          }
     }

     // Required abstract methods (no-op for this page)
     protected refreshAccountObject(_env: any): void {}
     protected clearInputFields(): void {}

     // Keep your existing handlers
     onLoadMore(): void {
          this.orchestrator.loadBalanceChanges(false);
     }

     onRefresh(): void {
          this.orchestrator.loadBalanceChanges(true);
     }
}
