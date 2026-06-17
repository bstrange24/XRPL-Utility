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
import { XrplCacheService } from '../../../../services/xrpl-cache/xrpl-cache.service';
import { XrplService } from '../../../../services/xrpl-services/xrpl.service';

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
     totalLiquidity: number;
     hasAuctionSlot?: boolean;
     auctionSlot?: {
          account: string;
          price: string;
          expiration: number;
          timeLeft?: string;
     };
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
     public readonly xrplCacheService = inject(XrplCacheService);
     public readonly xrplService = inject(XrplService);

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
     readonly isLoading = signal<boolean>(false);

     // Store fetched pools
     private readonly fetchedPools = signal<AMMPool[]>([]);

     isLiquidityProvider = computed(() => this.ammStoreService.isLiquidityProvider());
     isCreating = computed(() => this.ammTransactionViewModelService.activeTab() === 'createAMM');

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

          const pools = this.fetchedPools();
          const myPools = pools.filter(p => p.isLiquidityProvider);

          return {
               walletName: wallet.name || wallet.address.slice(0, 10) + '...',
               walletAddress: wallet.address,
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
                    pools = pools.filter(pool => pool.totalLiquidity > 10000);
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

          // Fetch pools when wallet changes or reset trigger changes
          effect(() => {
               this.resetTrigger();
               this.fetchWalletAmmPools();
          });
     }

     private async fetchWalletAmmPools(): Promise<void> {
          const wallet = this.walletManagerService?.getSelectedWallet();
          if (!wallet?.address) {
               this.fetchedPools.set([]);
               return;
          }

          this.isLoading.set(true);

          try {
               const pools: AMMPool[] = [];

               // Check if the current wallet has LP tokens or pool data
               const lpTokenBalance = this.ammStoreService.lpTokenBalance();
               const hasLP = lpTokenBalance && Number.parseFloat(lpTokenBalance) > 0;
               const hasPoolData = this.ammStoreService.assetPool1Balance() && Number.parseFloat(this.ammStoreService.assetPool1Balance() || '0') > 0;

               console.log('AMM Summary - Wallet:', wallet.address);
               console.log('AMM Summary - hasLP:', hasLP, 'lpTokenBalance:', lpTokenBalance);
               console.log('AMM Summary - hasPoolData:', hasPoolData);

               // Add the current pool if the wallet has LP tokens or pool data
               if ((hasLP || hasPoolData) && this.ammStoreService.weWantCurrency() && this.ammStoreService.weSpendCurrency()) {
                    const asset1Balance = Number.parseFloat(this.ammStoreService.assetPool1Balance() || '0');
                    const asset2Balance = Number.parseFloat(this.ammStoreService.assetPool2Balance() || '0');
                    const totalLiquidity = asset1Balance + asset2Balance;
                    // const auctionSlot = ammInfo?.auction_slot;

                    pools.push({
                         poolId: this.generatePoolId(this.ammStoreService.weWantCurrency(), this.ammStoreService.weSpendCurrency(), this.ammStoreService.weWantIssuer(), this.ammStoreService.weSpendIssuer()),
                         poolAccount: wallet.address,
                         asset1: this.ammStoreService.weWantCurrency(),
                         asset2: this.ammStoreService.weSpendCurrency(),
                         asset1Balance: this.ammStoreService.assetPool1Balance() || '0',
                         asset2Balance: this.ammStoreService.assetPool2Balance() || '0',
                         lpTokenBalance: lpTokenBalance || '0',
                         tradingFee: Number.parseFloat(this.ammStoreService.tradingFeeField() || '0'),
                         isLiquidityProvider: hasLP === true,
                         userShare: hasLP && totalLiquidity > 0 ? (Number.parseFloat(lpTokenBalance) / totalLiquidity) * 100 : 0,
                         totalLiquidity: totalLiquidity,
                         // hasAuctionSlot: !!auctionSlot,
                         // auctionSlot: auctionSlot
                         //      ? {
                         //             account: auctionSlot.account,
                         //             price: auctionSlot.price?.value ?? auctionSlot.price ?? '0',
                         //             expiration: Number(auctionSlot.expiration),
                         //             timeLeft: this.calculateTimeLeft(Number(auctionSlot.expiration)),
                         //        }
                         //      : undefined,
                    });

                    console.log('AMM Summary - Added pool:', pools[0]);
               }

               this.fetchedPools.set(pools);

               if (pools.length === 0) {
                    console.log(`No AMM pools found for wallet: ${wallet.address}`);
               } else {
                    console.log(`Found ${pools.length} AMM pool(s) for wallet: ${wallet.address}`);
               }
          } catch (error) {
               console.error('Failed to fetch AMM pools for wallet:', error);
               this.fetchedPools.set([]);
          } finally {
               this.isLoading.set(false);
          }
     }

     private generatePoolId(asset1: string, asset2: string, issuer1: string, issuer2: string): string {
          return `${asset1}_${issuer1}_${asset2}_${issuer2}`.replace(/[^a-zA-Z0-9]/g, '_');
     }

     private calculateTimeLeft(rippleTime: number): string {
          const rippleEpoch = 946684800; // 2000-01-01
          const expirationMs = (rippleTime + rippleEpoch) * 1000;

          const remaining = expirationMs - Date.now();

          if (remaining <= 0) {
               return 'Expired';
          }

          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

          return `${hours}h ${minutes}m`;
     }

     private formatBalance(balance: string): string {
          const num = Number.parseFloat(balance);
          if (Number.isNaN(num)) return '0';
          if (num > 1000000) return (num / 1000000).toFixed(2) + 'M';
          if (num > 1000) return (num / 1000).toFixed(2) + 'K';
          return num.toFixed(2);
     }

     getSummaryText(info: any): string {
          if (!info || info.poolCount === 0) {
               return ` has no active AMM participation.`;
          }

          if (info.myPoolCount > 0) {
               return ` is a liquidity provider in <strong>${info.myPoolCount}</strong> AMM pool${info.myPoolCount === 1 ? '' : 's'}.`;
          }

          return ` has interacted with <strong>${info.poolCount}</strong> AMM pool${info.poolCount === 1 ? '' : 's'}.`;
     }

     getButtonLabel(info: any): string {
          if (!info || info.poolCount === 0) return 'no pools';
          return `pool${info.poolCount === 1 ? '' : 's'}`;
     }

     getEmptyStateMessage(): string {
          const wallet = this.walletManagerService?.getSelectedWallet();

          if (!wallet?.address) {
               return 'No wallet selected';
          }

          if (this.isLoading()) {
               return 'Loading AMM pools...';
          }

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
                    return `This wallet has no AMM participation. Create an AMM or deposit to an existing pool to get started.`;
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
                    return `${baseClass} ${isActive ? 'bg-gray-900 text-white border-gray-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`;
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

          // Only update if the pool has valid assets
          if (pool.asset1 && pool.asset2 && this.ammTransactionViewModelService) {
               this.ammTransactionViewModelService.pool1Currency.set(pool.asset1);
               this.ammTransactionViewModelService.pool2Currency.set(pool.asset2);
          }
     }
}
