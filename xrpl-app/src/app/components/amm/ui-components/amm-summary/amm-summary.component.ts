import { ChangeDetectionStrategy, Component, inject, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';

type SortKey = 'asset1' | 'asset2' | 'totalLiquidity' | 'lpTokens' | 'tradingFee' | 'userShare';
type QuickFilter = 'all' | 'myPools' | 'highLiquidity' | 'lowFee';

interface AMMPool {
     poolId: string;
     poolAccount: string;
     asset1: string;
     asset2: string;
     asset1Balance: string;
     asset2Balance: string;
     lpTokenBalance: string;
     tradingFee: number;
     isLiquidityProvider: boolean;
     userShare?: number;
     auctionSlot?: boolean;
     auctionTimeLeft?: string;
     totalLiquidity: number;
}

@Component({
     selector: 'app-amm-summary',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, FormsModule, NgIcon, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent, SortControlComponent],
     templateUrl: './amm-summary.component.html',
})
export class AmmSummaryComponent {
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly walletManagerService = inject(WalletManagerService);

     // Inputs
     readonly infoPanelExpanded = input<boolean>();
     readonly toggleInfoPanel = output<void>();
     readonly tab = input<any>();
     resetTrigger = input<number>(0);

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly activeQuickFilter = signal<QuickFilter>('all');
     readonly sortBy = signal<SortKey>('totalLiquidity');
     readonly sortDirection = signal<'asc' | 'desc'>('desc');
     readonly selectedPoolId = signal<string | null>(null);

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'asset1', label: 'Asset 1' },
          { key: 'asset2', label: 'Asset 2' },
          { key: 'totalLiquidity', label: 'Total Liquidity' },
          { key: 'lpTokens', label: 'LP Tokens' },
          { key: 'tradingFee', label: 'Trading Fee' },
          { key: 'userShare', label: 'Your Share' },
     ];

     // Quick Filter Options
     quickFilters: { key: QuickFilter; label: string; icon: string }[] = [
          { key: 'all', label: 'All Pools', icon: 'heroSquares2x2' },
          { key: 'myPools', label: 'My Pools', icon: 'heroUser' },
          { key: 'highLiquidity', label: 'High Liquidity', icon: 'heroChartBar' },
          { key: 'lowFee', label: 'Low Fee', icon: 'heroTag' },
     ];

     // Computed values
     infoData = computed(() => {
          const wallet = this.walletManagerService?.getSelectedWallet();
          if (!wallet?.address) return null;

          const pools = this.getAmmPools();
          const myPools = pools.filter(p => p.isLiquidityProvider);

          return {
               walletName: wallet.name || wallet.address.slice(0, 10) + '...',
               poolCount: pools.length,
               myPoolCount: myPools.length,
               hasActivePool: pools.length > 0,
               totalLiquidity: pools.reduce((sum, p) => sum + p.totalLiquidity, 0),
               pools: pools,
          };
     });

     // Filtered and Sorted Pools
     filteredPools = computed(() => {
          let pools = [...(this.infoData()?.pools ?? [])];
          const query = this.searchQuery().trim().toLowerCase();
          const quickFilter = this.activeQuickFilter();

          // Text Search
          if (query) {
               pools = pools.filter(pool => pool.poolId?.toLowerCase().includes(query) || pool.asset1?.toLowerCase().includes(query) || pool.asset2?.toLowerCase().includes(query) || pool.poolAccount?.toLowerCase().includes(query));
          }

          // Quick Filters
          switch (quickFilter) {
               case 'myPools':
                    pools = pools.filter(pool => pool.isLiquidityProvider);
                    break;
               case 'highLiquidity':
                    pools = pools.filter(pool => pool.totalLiquidity > 10000); // Adjust threshold as needed
                    break;
               case 'lowFee':
                    pools = pools.filter(pool => pool.tradingFee < 0.3);
                    break;
          }

          return pools;
     });

     sortedPools = computed(() => {
          let items = [...this.filteredPools()];
          const sortField = this.sortBy();
          const direction = this.sortDirection();

          return items.sort((a, b) => {
               let valA: string | number = '';
               let valB: string | number = '';

               switch (sortField) {
                    case 'asset1':
                         valA = a.asset1;
                         valB = b.asset1;
                         break;
                    case 'asset2':
                         valA = a.asset2;
                         valB = b.asset2;
                         break;
                    case 'totalLiquidity':
                         valA = a.totalLiquidity;
                         valB = b.totalLiquidity;
                         break;
                    case 'lpTokens':
                         valA = Number.parseFloat(a.lpTokenBalance);
                         valB = Number.parseFloat(b.lpTokenBalance);
                         break;
                    case 'tradingFee':
                         valA = a.tradingFee;
                         valB = b.tradingFee;
                         break;
                    case 'userShare':
                         valA = a.userShare || 0;
                         valB = b.userShare || 0;
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     filteredCount = computed(() => this.sortedPools().length);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.activeQuickFilter() !== 'all');

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     private getAmmPools(): AMMPool[] {
          // This should fetch all AMM pools the account participates in
          // For now, return the current pool if it exists
          const currentPool = this.ammStoreService;
          const pools: AMMPool[] = [];

          if (currentPool.assetPool1Balance() && currentPool.assetPool2Balance()) {
               const asset1Balance = Number.parseFloat(currentPool.assetPool1Balance());
               const asset2Balance = Number.parseFloat(currentPool.assetPool2Balance());
               const totalLiquidity = asset1Balance + asset2Balance;

               pools.push({
                    poolId: this.generatePoolId(currentPool.weWantCurrency(), currentPool.weSpendCurrency(), currentPool.weWantIssuer(), currentPool.weSpendIssuer()),
                    poolAccount: this.walletManagerService?.getSelectedWallet()?.address || '',
                    asset1: currentPool.weWantCurrency(),
                    asset2: currentPool.weSpendCurrency(),
                    asset1Balance: currentPool.assetPool1Balance(),
                    asset2Balance: currentPool.assetPool2Balance(),
                    lpTokenBalance: currentPool.lpTokenBalance() || '0',
                    tradingFee: Number.parseFloat(currentPool.tradingFeeField() || '0'),
                    isLiquidityProvider: Number.parseFloat(currentPool.lpTokenBalance() || '0') > 0,
                    userShare: this.calculateUserShare(Number.parseFloat(currentPool.lpTokenBalance() || '0'), totalLiquidity),
                    totalLiquidity: totalLiquidity,
               });
          }

          return pools;
     }

     private generatePoolId(asset1: string, asset2: string, issuer1: string, issuer2: string): string {
          // Generate a unique identifier for the pool
          return `${asset1}_${issuer1}_${asset2}_${issuer2}`.replace(/[^a-zA-Z0-9]/g, '_');
     }

     private calculateUserShare(lpTokens: number, totalLiquidity: number): number {
          if (totalLiquidity === 0) return 0;
          return (lpTokens / totalLiquidity) * 100;
     }

     getSummaryText(info: any): string {
          if (info.poolCount === 0) {
               return ` has no active AMM pools.`;
          }

          if (info.myPoolCount > 0) {
               return ` participates in <strong>${info.myPoolCount}</strong> AMM pool${info.myPoolCount === 1 ? '' : 's'} and has <strong>${info.poolCount}</strong> total pool${info.poolCount === 1 ? '' : 's'} available.`;
          }

          return ` has <strong>${info.poolCount}</strong> active AMM pool${info.poolCount === 1 ? '' : 's'} available for trading.`;
     }

     getButtonLabel(info: any): string {
          return `pool${info.poolCount === 1 ? '' : 's'}`;
     }

     getEmptyStateMessage(): string {
          const query = this.searchQuery();
          const filter = this.activeQuickFilter();

          if (query && this.filteredCount() === 0 && (this.infoData()?.poolCount ?? 0) > 0) {
               return `No pools matching "${query}"`;
          }

          switch (filter) {
               case 'myPools':
                    return 'You are not a liquidity provider in any AMM pool yet.';
               case 'highLiquidity':
                    return 'No high liquidity pools found.';
               case 'lowFee':
                    return 'No low fee pools found.';
               default:
                    return 'No AMM pools found.';
          }
     }

     getEmptyStateSubMessage(): string {
          const query = this.searchQuery();
          if (query && this.filteredCount() === 0 && (this.infoData()?.poolCount ?? 0) > 0) {
               return 'Try a different search term';
          }
          return '';
     }

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;
          const baseClass = 'px-4 py-2 text-sm font-medium rounded-2xl transition-all border hover:shadow-sm active:scale-[0.985] inline-flex items-center gap-2';

          switch (filterKey) {
               case 'myPools':
                    return `${baseClass} ${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-200 text-gray-600 hover:bg-green-50'}`;
               case 'highLiquidity':
                    return `${baseClass} ${isActive ? 'bg-blue-100 text-blue-700 border-blue-200' : 'border-gray-200 text-gray-600 hover:bg-blue-50'}`;
               case 'lowFee':
                    return `${baseClass} ${isActive ? 'bg-purple-100 text-purple-700 border-purple-200' : 'border-gray-200 text-gray-600 hover:bg-purple-50'}`;
               default:
                    return `${baseClass} ${isActive ? 'bg-blue-900 text-white border-gray-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`;
          }
     }

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     setQuickFilter(filter: QuickFilter) {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['asset1', 'asset2', 'totalLiquidity', 'lpTokens', 'tradingFee', 'userShare'];
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

     onPoolClick(pool: AMMPool) {
          this.selectedPoolId.set(pool.poolId);
          this.toggleInfoPanel.emit();

          // Optionally update the main form with this pool's data
          if (this.ammTransactionViewModelService) {
               this.ammTransactionViewModelService.pool1Currency.set(pool.asset1);
               this.ammTransactionViewModelService.pool2Currency.set(pool.asset2);
          }
     }
}
