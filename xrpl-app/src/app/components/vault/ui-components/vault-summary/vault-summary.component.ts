import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { VaultViewModelService } from '../../../../services/vault/vault-view-model/vault-view-model.service';
import { VaultActionTypes, AnyVaultDisplayItem } from '../../constants/vault.types';
import { VaultUtilService } from '../../../../services/vault/vault-util/vault-util.service';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { VaultStoreService } from '../../../../services/vault/vault-store/vault-store.service';

const VAULT_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'vault',
     itemNamePlural: 'vaults',
     actionMap: {
          createVault: 'created.',
          modifyVault: 'that can be modified.',
          depositVault: 'that can be deposited to.',
          clawbackVault: 'that has clawaback enabled.',
          deleteVault: 'that can be deleted.',
     },
};

type SortKey = 'amount' | 'owner' | 'sequence' | 'policy';
type VaultQuickFilterKey = 'all' | 'owned';

@Component({
     selector: 'app-vault-summary',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent, FormsModule, SortControlComponent, OverlayModule, TooltipLinkComponent, SummaryKeyValueComponent],
     templateUrl: './vault-summary.component.html',
     styleUrl: './vault-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly vaultUtilService = inject(VaultUtilService);
     public readonly vaultViewModelService = inject(VaultViewModelService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);
     public readonly utilsService = inject(UtilsService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly vaultStoreService = inject(VaultStoreService);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });

          effect(() => {
               const info = this.infoData();
               const walletAddr = this.wallet()?.address;
               console.log('Summary - infoData changed:', info?.vaultCount, 'vaultsToShow:', info?.vaultsToShow?.length);
               console.log('Summary - wallet address:', walletAddr);
               console.log('Summary - filteredVaults:', this.filteredVaults().length);
          });
     }

     // Inputs
     wallet = input<{ address: string } | null | undefined>();
     vaultLength = input.required<number>();
     tab = input.required<VaultActionTypes>();
     infoPanelExpanded = input<boolean>();
     info = input<string>();
     resetTrigger = input<number>(0);

     // Outputs
     toggleInfoPanel = output<void>();
     vaultSelected = output<any>();

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly activeQuickFilter = signal<VaultQuickFilterKey>('all');
     readonly sortBy = signal<SortKey>('sequence');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'amount', label: 'Amount' },
          { key: 'owner', label: 'Owner' },
          { key: 'sequence', label: 'Sequence' },
          { key: 'policy', label: 'Policy' },
     ];

     // Quick Filter Options (no expiration for vaults)
     quickFilters: { key: 'all' | 'owned'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'owned', label: 'Owned', icon: 'heroUser', color: 'green' },
     ];

     explorerUrl = this.txUiService.explorerUrl;

     private getOwner(vault: AnyVaultDisplayItem): string {
          return vault.owner || vault.sender || '';
     }

     // Computed values
     infoData = computed(() => this.vaultViewModelService.infoData());
     totalCount = computed(() => this.infoData()?.vaultCount ?? 0);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.activeQuickFilter() !== 'all');
     mptItems = computed(() => this.mptUtilService.computeMptItems(this.mptStoreService.existingMpts() || []) || []);

     getMyMptForVault(vault: AnyVaultDisplayItem) {
          const shareId = vault.shareMPTID || vault.issuer || '';
          if (!shareId) return undefined;
          return this.mptItems().find(m => m?.id === shareId);
     }

     filteredVaults = computed(() => {
          let vaults = [...(this.infoData()?.vaultsToShow ?? [])];
          const query = this.searchQuery().trim().toLowerCase();
          const quickFilter = this.activeQuickFilter();
          const currentAddress = this.wallet()?.address;

          // Text Search
          if (query) {
               vaults = vaults.filter(vault => vault.id?.toLowerCase().includes(query) || vault.amountDisplay?.toLowerCase().includes(query) || this.getOwner(vault).toLowerCase().includes(query) || vault.VaultSequence?.toString().toLowerCase().includes(query) || vault.data?.toLowerCase().includes(query) || vault.shareMPTID?.toLowerCase().includes(query));
          }

          // Quick Filters
          if (quickFilter === 'owned') {
               // If no current address, don't filter (show all)
               // OR return empty array based on your preference
               if (currentAddress) {
                    vaults = vaults.filter(vault => vault.owner === currentAddress);
               }
               // If no current address, we could either:
               // 1. Return all vaults (no filtering)
               // 2. Return empty array
               // Option 1 is usually better for UX
          }

          return vaults;
     });

     sortedVaults = computed(() => {
          let items = [...this.filteredVaults()];
          const sortField = this.sortBy();
          const direction = this.sortDirection();

          return items.sort((a, b) => {
               let valA: string | number = '';
               let valB: string | number = '';

               switch (sortField) {
                    case 'amount':
                         valA = parseFloat(a.amount || '0');
                         valB = parseFloat(b.amount || '0');
                         break;
                    case 'owner':
                         valA = this.getOwner(a);
                         valB = this.getOwner(b);
                         break;
                    case 'sequence':
                         valA = a.VaultSequence || 0;
                         valB = b.VaultSequence || 0;
                         break;
                    case 'policy':
                         valA = a.withdrawalPolicyName || a.withdrawalPolicy || '';
                         valB = b.withdrawalPolicyName || b.withdrawalPolicy || '';
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     filteredCount = computed(() => this.sortedVaults().length);

     summaryText = computed(() => {
          const info = this.vaultViewModelService.infoData();
          if (!info) return '';
          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.vaultCount, this.tab(), VAULT_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const count = this.infoData()?.vaultCount ?? 0;
          const tab = this.vaultViewModelService.activeTab();
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.filteredVaults().length === 0) {
               return `No vaults matching "${query}"`;
          }
          if (quickFilter === 'owned' && this.filteredVaults().length === 0) {
               return `No owned vaults found`;
          }
          if (count === 0) {
               switch (tab) {
                    case 'createVault':
                         return 'This wallet has not created any Vaults yet.';
                    case 'deleteVault':
                         return 'This wallet has no Vaults to delete.';
                    default:
                         return 'No vaults found.';
               }
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const tab = this.vaultViewModelService.activeTab();
          const query = this.searchQuery();

          if (query && this.filteredVaults().length === 0) return 'Try a different search term';
          if (tab === 'createVault' && this.totalCount() === 0) return 'Use the Create tab to generate one.';
          if (tab === 'deleteVault' && this.totalCount() === 0) return 'Create a vault first to delete it.';

          return '';
     });

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;
          let colorClass = filterKey === 'all' ? 'btn-filter-blue' : 'btn-filter-green';
          return isActive ? `${colorClass} ${colorClass}-active` : colorClass;
     }

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     setQuickFilter(filter: 'all' | 'owned') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['amount', 'owner', 'sequence'];
          if (validKeys.includes(event.key as SortKey)) {
               this.sortBy.set(event.key as SortKey);
               this.sortDirection.set(event.direction);
          }
     }

     clearAllFilters() {
          this.searchQuery.set('');
          this.activeQuickFilter.set('all');
     }

     clearSearch() {
          this.searchQuery.set('');
     }

     onVaultClick(vault: AnyVaultDisplayItem) {
          if (!vault) return;
          if (this.tab() === 'createVault') return;

          // Pass the vault ID (index) to the util service
          this.vaultUtilService.onVaultSelectedInUi(vault);
          this.vaultSelected.emit(vault);
          this.toggleInfoPanel.emit();
     }

     onSharedMPTClick(vault: AnyVaultDisplayItem) {
          if (!vault) return;
          if (this.tab() === 'createVault') return;

          // Pass the vault ID (index) to the util service
          this.vaultUtilService.onVaultSelectedInUi(vault);
          this.vaultSelected.emit(vault);
          this.toggleInfoPanel.emit();
     }

     formatVaultId(vault: AnyVaultDisplayItem): string {
          const id = vault.index || vault.id;
          if (!id) return 'N/A';

          // If it's a string, truncate it
          if (typeof id === 'string') {
               if (id.length > 16) {
                    return `${id.slice(0, 16)}...${id.slice(-16)}`;
               }
               return id;
          }

          // If it's a number, just return it as a string
          return String(id);
     }
}
