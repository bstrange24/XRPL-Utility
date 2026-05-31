import { ChangeDetectionStrategy, Component, inject, input, output, computed, signal, effect } from '@angular/core';
import { AccountConfiguratorViewModelService } from '../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { NgIcon } from '@ng-icons/core';
import { ACCOUNT_ACTIONS } from '../../constants/account-configurator.constants';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';

export interface ConfigItem {
     id: string;
     text: string;
     isIrreversible?: boolean;
}

export interface AccountConfiguratorInfo {
     walletName: string;
     summaryMessage: string;
     configItems: ConfigItem[];
     hasSpecialConfig: boolean;
     hasIrreversible: boolean;
     irreversibleMessage?: string;
}

@Component({
     selector: 'app-account-configurator-summary',
     standalone: true,
     imports: [NgIcon, FormsModule, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent],
     templateUrl: './account-configurator-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountConfiguratorSummaryComponent {
     private readonly walletManager = inject(WalletManagerService);
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);
     public readonly copyUtilService = inject(CopyUtilService);
     readonly searchQuery = signal<string>('');
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     // Inputs
     info = input<AccountConfiguratorInfo | null>(null);
     infoPanelExpanded = input<boolean>();
     tab = input.required<ACCOUNT_ACTIONS>();
     resetTrigger = input<number>(0);

     // Outputs
     toggleInfoPanel = output<void>();

     // Computed reactive data
     infoData = computed(() => {
          const serviceData = this.accountConfiguratorViewModelService.infoData();

          return {
               totalItems: serviceData?.totalItems ?? 0,
               walletName: serviceData?.walletName ?? '',
               summaryMessage: serviceData?.summaryMessage ?? '',
               configItems: serviceData?.configItems ?? [],
               hasSpecialConfig: (serviceData?.configItems?.length ?? 0) > 0,
               hasIrreversible: serviceData?.configItems?.some(item => item.isIrreversible) ?? false,
               irreversibleMessage: serviceData?.irreversibleMessage || 'Irreversible configuration detected',
          };
     });

     summaryMessage = computed(() => {
          const info = this.infoData();
          if (!info) return ' loading account configuration...';
          return info.summaryMessage;
     });

     emptyStateMessage = computed(() => {
          const info = this.infoData();
          const query = this.searchQuery();

          if (!info) return 'Loading account configuration...';
          if (query) return `No items matching "${query}"`;
          if (!info.hasSpecialConfig) return 'No special account configuration detected.';
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const info = this.infoData();
          const query = this.searchQuery();

          if (!info) return 'Please wait while we load your account data';
          if (query) return 'Try a different search term';
          if (!info.hasSpecialConfig) return 'All flags are set to default values.';
          return '';
     });

     filteredConfigItems = computed(() => {
          const items = this.infoData()?.configItems ?? [];
          const query = this.searchQuery().trim().toLowerCase();

          if (!query) return items;
          return items.filter(item => item.text.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
     });

     itemCount = computed(() => this.infoData()?.configItems.length ?? 0);

     hasContent = computed(() => {
          const info = this.infoData();
          return info?.hasSpecialConfig ?? false;
     });

     clearSearch() {
          this.searchQuery.set('');
     }
}
