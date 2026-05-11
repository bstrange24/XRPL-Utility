import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { CredentialActionTypes, CredentialItemVm } from '../../constants/credential.types';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { FormsModule } from '@angular/forms';
import { ExpirationFilterInputComponent } from '../../../shared/expiration-filter-input/expiration-filter-input.component';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';

const CREDENTIALS_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'credential',
     itemNamePlural: 'credentials',
     actionMap: {
          acceptCredential: 'awaiting acceptance.',
          createCredential: 'issued.',
          deleteCredential: 'available for deletion.',
          verifyCredential: 'available for verification.',
     },
     defaultAction: 'available.',
};

type SortKey = 'expiration' | 'index' | 'type';

@Component({
     selector: 'app-credentials-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent, FormsModule, ExpirationFilterInputComponent, SortControlComponent],
     templateUrl: './credentials-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialsSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);

     // Filter State
     readonly searchQuery = signal<string>('');
     readonly expiresAfter = signal<string>('');
     readonly expiresBefore = signal<string>('');
     readonly activeQuickFilter = signal<'all' | 'accepted' | 'expired' | 'issued' | 'received'>('all');
     readonly sortBy = signal<SortKey>('expiration');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Inputs
     wallet = input<{ address: string } | null | undefined>();
     view = input.required<{ walletName: string; summaryMessage: string }>();
     creds = input.required<{ list: CredentialItemVm[] }>();
     credsLength = input.required<number>();
     tab = input.required<CredentialActionTypes>();
     explorerUrl = this.txUiService.explorerUrl;

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'expiration', label: 'Expiration Date' },
          { key: 'type', label: 'Credential Type' },
          { key: 'index', label: 'Credential ID' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'accepted' | 'expired' | 'issued' | 'received'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'accepted', label: 'Accepted', icon: 'heroCheckBadge', color: 'purple' },
          { key: 'expired', label: 'Expired', icon: 'heroExclamationCircle', color: 'red' },
          { key: 'issued', label: 'Issued by Me', icon: 'heroPlusCircle', color: 'green' },
          { key: 'received', label: 'Received by Me', icon: 'heroArrowDown', color: 'amber' },
     ];

     // Outputs
     toggleInfoPanel = output<void>();
     credentialSelected = output<CredentialItemVm>();

     // Computed values
     totalCount = computed(() => this.credsLength());
     hasActiveFilters = computed(() => this.searchQuery() || this.expiresAfter() || this.expiresBefore() || this.activeQuickFilter() !== 'all');

     // Filtered credentials
     filteredCreds = computed(() => {
          let list = this.creds().list || [];
          const query = this.searchQuery().trim().toLowerCase();
          const after = this.expiresAfter();
          const before = this.expiresBefore();
          const quick = this.activeQuickFilter();

          // Text Search
          if (query) {
               list = list.filter(cred => cred.index?.toLowerCase().includes(query) || cred.CredentialType?.toLowerCase().includes(query) || cred.Issuer?.toLowerCase().includes(query) || cred.Subject?.toLowerCase().includes(query));
          }

          // Date Range Filter
          if (after || before) {
               list = list.filter(cred => {
                    if (!cred.Expiration || cred.Expiration === 'N/A') return false;
                    const exp = new Date(cred.Expiration);
                    if (isNaN(exp.getTime())) return false;
                    if (after && exp < new Date(after)) return false;
                    if (before && exp > new Date(before)) return false;
                    return true;
               });
          }

          // Quick Filters
          if (quick !== 'all') {
               list = list.filter(cred => {
                    switch (quick) {
                         case 'accepted':
                              // return cred.accepted && !cred.expired;
                              // Show both pending (can be accepted) AND already accepted credentials
                              return true; // This will show all credentials since both pending and accepted are relevant
                         case 'expired':
                              return cred.expired;
                         case 'issued':
                              return cred.issuedByMe;
                         case 'received':
                              return !cred.issuedByMe;
                         default:
                              return true;
                    }
               });
          }

          // Sorting
          return [...list].sort((a, b) => {
               const sortField = this.sortBy();
               const direction = this.sortDirection();

               if (sortField === 'expiration') {
                    const dateA = this.getExpirationTimestamp(a.Expiration);
                    const dateB = this.getExpirationTimestamp(b.Expiration);
                    return direction === 'asc' ? dateA - dateB : dateB - dateA;
               }

               if (sortField === 'index') {
                    const indexA = a.index || '';
                    const indexB = b.index || '';
                    return direction === 'asc' ? indexA.localeCompare(indexB) : indexB.localeCompare(indexA);
               }

               if (sortField === 'type') {
                    const typeA = a.CredentialType || '';
                    const typeB = b.CredentialType || '';
                    return direction === 'asc' ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
               }

               return 0;
          });
     });

     filteredCount = computed(() => this.filteredCreds().length);

     // Computed summary text
     summaryText = computed(() => {
          const view = this.view();
          const count = this.credsLength();
          return this.summaryTextConfigService.buildSummaryText(view.walletName, count, this.tab(), CREDENTIALS_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const count = this.credsLength();
          const currentTab = this.tab();
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.filteredCreds().length === 0) {
               return `No credentials matching "${query}"`;
          }
          if (quickFilter !== 'all' && this.filteredCreds().length === 0) {
               return `No ${quickFilter} credentials found`;
          }

          if (currentTab === 'verifyCredential' && count === 0) {
               return 'This wallet has not issued any credentials that can be verified here.';
          }

          switch (currentTab) {
               case 'acceptCredential':
                    return 'This wallet has no credentials to accept.';
               case 'createCredential':
                    return 'This wallet has not issued any credentials.';
               case 'deleteCredential':
                    return 'This wallet has no credentials to delete.';
               case 'verifyCredential':
                    return 'No credentials available for verification.';
               default:
                    return 'No credentials found.';
          }
     });

     emptyStateSubMessage = computed(() => {
          const currentTab = this.tab();
          const count = this.credsLength();
          const query = this.searchQuery();

          if (query && this.filteredCreds().length === 0) {
               return 'Try a different search term';
          }
          if (currentTab === 'verifyCredential' && count === 0) {
               return 'Verification is usually performed by the issuer or an external verifier.';
          }
          if (currentTab !== 'acceptCredential' && count === 0) {
               return 'Use the Create tab to issue one.';
          }
          return '';
     });

     // Helper methods
     private getExpirationTimestamp(expiration: string | undefined): number {
          if (!expiration || expiration === 'N/A') {
               return Number.MAX_SAFE_INTEGER;
          }
          const timestamp = Date.parse(expiration);
          return isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
     }

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;
          const baseClass = 'px-4 py-2 text-sm font-medium rounded-2xl transition-all border hover:shadow-sm active:scale-[0.985] inline-flex items-center gap-2';

          switch (filterKey) {
               case 'accepted':
                    return `${baseClass} ${isActive ? 'bg-purple-100 text-purple-700 border-purple-200' : 'border-gray-200 text-gray-600 hover:bg-purple-50'}`;
               case 'expired':
                    return `${baseClass} ${isActive ? 'bg-red-100 text-red-700 border-red-200' : 'border-gray-200 text-gray-600 hover:bg-red-50'}`;
               case 'issued':
                    return `${baseClass} ${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'border-gray-200 text-gray-600 hover:bg-green-50'}`;
               case 'received':
                    return `${baseClass} ${isActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'border-gray-200 text-gray-600 hover:bg-amber-50'}`;
               default:
                    return `${baseClass} ${isActive ? 'bg-blue-600 text-white border-blue-200' : 'border-gray-200 text-gray-600 hover:bg-blue-50'}`;
          }
     }

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['expiration', 'index', 'type'];
          if (validKeys.includes(event.key as SortKey)) {
               this.sortBy.set(event.key as SortKey);
               this.sortDirection.set(event.direction);
          }
     }

     clearAllFilters() {
          this.searchQuery.set('');
          this.expiresAfter.set('');
          this.expiresBefore.set('');
          this.activeQuickFilter.set('all');
     }

     setQuickFilter(filter: 'all' | 'accepted' | 'expired' | 'issued' | 'received') {
          this.activeQuickFilter.set(filter);
     }

     onCredentialClick(cred: CredentialItemVm) {
          if (this.tab() === 'createCredential') return;
          this.credentialUtilService.selectCredentialFromList(cred, this.tab(), this.wallet()?.address ?? '');
     }
}
