import { Component, input, output, inject, ChangeDetectionStrategy, computed, signal, effect } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { FormsModule } from '@angular/forms';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { PermissionedDomainTab } from '../../constants/permissioned-domain.types';

export interface PermissionedDomainItem {
     index: string;
     Domain?: string;
     AcceptedCredentials: {
          CredentialType: string;
          Issuer: string;
     }[];
}

export interface CredentialGroup {
     issuer: string;
     types: string[];
}

type SortKey = 'index' | 'credentialCount';

@Component({
     selector: 'app-permissioned-domains-summary',
     standalone: true,
     imports: [NgIcon, FormsModule, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent, SortControlComponent],
     templateUrl: './permissioned-domains-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionedDomainsSummaryComponent {
     public copyUtilService = inject(CopyUtilService);
     private readonly txUiService = inject(TransactionUiService);
     public utilsService = inject(UtilsService);
     public permissionedDomainStoreService = inject(PermissionedDomainStoreService);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });
     }

     // Inputs
     info = input.required<
          | {
                 walletName: string;
                 permissionedDomainCount: number;
                 permissionedDomainsToShow: PermissionedDomainItem[];
            }
          | null
          | undefined
     >();

     tab = input.required<PermissionedDomainTab>();
     summaryMessage = input.required<string>();
     infoPanelExpanded = input<boolean>(false);
     resetTrigger = input<number>(0);

     // Computed
     infoData = computed(() => this.info() ?? null);
     domainCount = computed(() => this.infoData()?.permissionedDomainCount ?? 0);
     domains = computed(() => this.infoData()?.permissionedDomainsToShow ?? []);

     // Filters
     readonly searchQuery = signal<string>('');
     readonly activeQuickFilter = signal<'all' | 'hasCredentials' | 'noCredentials'>('all');
     readonly sortBy = signal<SortKey>('index');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'index', label: 'Domain ID' },
          { key: 'credentialCount', label: 'Credential Count' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'hasCredentials' | 'noCredentials'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All Domains', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'hasCredentials', label: 'Has Credentials', icon: 'heroCheckCircle', color: 'emerald' },
          { key: 'noCredentials', label: 'Empty Domains', icon: 'heroExclamationCircle', color: 'amber' },
     ];

     // Outputs
     toggleInfoPanel = output<void>();

     explorerUrl = this.txUiService.explorerUrl;
     hasDomains = computed(() => (this.info()?.permissionedDomainCount ?? 0) > 0);

     // Main Computed - Filtered Domains
     filteredDomains = computed(() => {
          let list = [...(this.infoData()?.permissionedDomainsToShow ?? [])];

          const query = this.searchQuery().trim().toLowerCase();
          const filter = this.activeQuickFilter();
          const sortField = this.sortBy();
          const direction = this.sortDirection();

          // 1. Text Search
          if (query) {
               list = list.filter(d => d.index?.toLowerCase().includes(query) || d.AcceptedCredentials?.some((c: any) => (c.CredentialType || '').toLowerCase().includes(query) || (c.Issuer || '').toLowerCase().includes(query)));
          }

          // 2. Quick Filters
          if (filter === 'hasCredentials') {
               list = list.filter(d => (d.AcceptedCredentials?.length ?? 0) > 0);
          } else if (filter === 'noCredentials') {
               list = list.filter(d => (d.AcceptedCredentials?.length ?? 0) === 0);
          }

          // 3. Sorting
          return [...list].sort((a, b) => {
               if (sortField === 'index') {
                    const cmp = (a.index || '').localeCompare(b.index || '');
                    return direction === 'asc' ? cmp : -cmp;
               } else {
                    const valA = a.AcceptedCredentials?.length ?? 0;
                    const valB = b.AcceptedCredentials?.length ?? 0;
                    return direction === 'asc' ? valA - valB : valB - valA;
               }
          });
     });

     filteredCount = computed(() => this.filteredDomains().length);
     totalCount = computed(() => this.infoData()?.permissionedDomainCount ?? 0);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.activeQuickFilter() !== 'all');

     summaryText = computed(() => {
          const info = this.info();
          if (!info) return '';
          const count = info.permissionedDomainCount;
          if (count === 0) return ' has not created any Permissioned Domains yet.';
          return ` has <strong>${count}</strong> permissioned domain${count === 1 ? '' : 's'}.`;
     });

     emptyStateMessage = computed(() => {
          const count = this.info()?.permissionedDomainCount ?? 0;
          const currentTab = this.tab();
          const query = this.searchQuery();
          const filter = this.activeQuickFilter();

          if (query && this.filteredDomains().length === 0) {
               return `No domains matching "${query}"`;
          }
          if (filter !== 'all' && this.filteredDomains().length === 0) {
               return `No domains with ${filter === 'hasCredentials' ? 'credentials' : 'empty domains'}`;
          }
          if (count === 0) {
               return currentTab === 'setPermissionedDomain' ? 'This wallet has no Permissioned Domains.' : 'This wallet has no Permissioned Domains to delete.';
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const currentTab = this.tab();
          const query = this.searchQuery();
          if (query && this.filteredDomains().length === 0) {
               return 'Try a different search term';
          }
          if (this.activeQuickFilter() !== 'all' && this.filteredDomains().length === 0) {
               return 'Try changing the filter';
          }
          if (this.totalCount() === 0) {
               return 'Use the Set tab to create one.';
          }
          return '';
     });

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     setQuickFilter(filter: 'all' | 'hasCredentials' | 'noCredentials') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['index', 'credentialCount'];
          if (validKeys.includes(event.key as SortKey)) {
               this.sortBy.set(event.key as SortKey);
               this.sortDirection.set(event.direction);
          }
     }

     clearAllFilters() {
          this.searchQuery.set('');
          this.activeQuickFilter.set('all');
     }

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;

          let colorClass = '';

          switch (filterKey) {
               case 'all':
                    colorClass = 'btn-filter-blue';
                    break;
               case 'hasCredentials':
                    colorClass = 'btn-filter-green'; // Using green for "Has"
                    break;
               case 'noCredentials':
                    colorClass = 'btn-filter-amber';
                    break;
               default:
                    colorClass = 'btn-filter-blue';
          }

          // Add active state
          if (isActive) {
               return `${colorClass} btn-filter-active`;
          }

          return colorClass;
     }

     // getQuickFilterClass(filterKey: string): string {
     //      const isActive = this.activeQuickFilter() === filterKey;
     //      const baseClass = 'px-4 py-2 text-sm font-medium rounded-2xl transition-all border hover:shadow-sm active:scale-[0.985] inline-flex items-center gap-2';

     //      switch (filterKey) {
     //           case 'hasCredentials':
     //                return `${baseClass} ${isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'border-gray-200 text-gray-600 hover:bg-emerald-50'}`;
     //           case 'noCredentials':
     //                return `${baseClass} ${isActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'border-gray-200 text-gray-600 hover:bg-amber-50'}`;
     //           default:
     //                return `${baseClass} ${isActive ? 'bg-blue-600 text-white border-blue-200' : 'border-gray-200 text-gray-600 hover:bg-blue-50'}`;
     //      }
     // }

     isSelected(domainIndex: string): boolean {
          if (this.tab() === 'setPermissionedDomain') return false;
          return domainIndex === this.permissionedDomainStoreService.selectedDomainId();
     }

     selectDomain(domain: PermissionedDomainItem) {
          if (this.tab() === 'setPermissionedDomain') return;
          this.toggleInfoPanel.emit();
          this.permissionedDomainStoreService.setField('selectedDomainId', domain.index);
     }

     groupCredentialsByIssuer(credentials: { CredentialType: string; Issuer: string }[]): CredentialGroup[] {
          if (!credentials || credentials.length === 0) return [];

          const groups = new Map<string, Set<string>>();
          credentials.forEach(cred => {
               const types = groups.get(cred.Issuer) ?? new Set();
               types.add(cred.CredentialType);
               groups.set(cred.Issuer, types);
          });

          return Array.from(groups.entries()).map(([issuer, types]) => ({
               issuer,
               types: Array.from(types),
          }));
     }

     clearSearch() {
          this.searchQuery.set('');
     }
}
