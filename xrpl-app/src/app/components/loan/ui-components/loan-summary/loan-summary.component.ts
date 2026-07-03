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
import { LoanActionTypes, LoanDisplayItem } from '../../constants/loan.types';
import { LoanViewModelService } from '../../../../services/loan/loan-view-model/loan-view-model.service';
import { LoanUtilService } from '../../../../services/loan/loan-util/loan-util.service';

const LOAN_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'loan',
     itemNamePlural: 'loans',
     actionMap: {
          createLoan: 'created.',
          payLoan: 'that can be paid.',
          deleteLoan: 'that can be deleted.',
     },
};

type SortKey = 'principal' | 'brokerId' | 'owner' | 'status' | 'interestRate';
type LoanQuickFilterKey = 'all' | 'active' | 'defaulted' | 'impaired' | 'closed';

@Component({
     selector: 'app-loan-summary',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent, FormsModule, SortControlComponent, OverlayModule, TooltipLinkComponent, SummaryKeyValueComponent],
     templateUrl: './loan-summary.component.html',
     styleUrl: './loan-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly loanUtilService = inject(LoanUtilService);
     public readonly loanViewModelService = inject(LoanViewModelService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);
     public readonly utilsService = inject(UtilsService);

     constructor() {
          // Auto-clear search when parent tells us to reset
          effect(() => {
               this.resetTrigger(); // track changes
               this.clearSearch();
          });

          effect(() => {
               const info = this.infoData();
               const walletAddr = this.wallet()?.address;
               console.log('Summary - infoData changed:', info?.loanCount, 'loansToShow:', info?.loansToShow?.length);
               console.log('Summary - wallet address:', walletAddr);
               console.log('Summary - filteredLoans:', this.filteredLoans().length);
          });
     }

     // Inputs
     wallet = input<{ address: string } | null | undefined>();
     loanLength = input.required<number>();
     tab = input.required<LoanActionTypes>();
     infoPanelExpanded = input<boolean>();
     info = input<string>();
     resetTrigger = input<number>(0);

     // Outputs
     toggleInfoPanel = output<void>();
     loanSelected = output<any>();

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly activeQuickFilter = signal<LoanQuickFilterKey>('all');
     readonly sortBy = signal<SortKey>('principal');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'principal', label: 'Principal' },
          { key: 'brokerId', label: 'Broker ID' },
          { key: 'owner', label: 'Owner' },
          { key: 'status', label: 'Status' },
          { key: 'interestRate', label: 'Interest Rate' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'active' | 'defaulted' | 'impaired' | 'closed'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'active', label: 'Active', icon: 'heroCheckCircle', color: 'green' },
          { key: 'defaulted', label: 'Defaulted', icon: 'heroExclamationTriangle', color: 'red' },
          { key: 'impaired', label: 'Impaired', icon: 'heroExclamationCircle', color: 'amber' },
          { key: 'closed', label: 'Closed', icon: 'heroXCircle', color: 'gray' },
     ];

     // Helper method for flag checking - handles both number and object flags
     hasOverpaymentFlag(flags: number | any | undefined): boolean {
          if (flags === undefined || flags === null) return false;

          // If flags is a number, check the bit
          if (typeof flags === 'number') {
               return (flags & 0x00010000) === 0x00010000;
          }

          // If flags is an object (LoanSetFlagsInterface), check the property
          if (typeof flags === 'object' && flags !== null) {
               return flags.tfLoanOverpayment === true;
          }

          return false;
     }

     explorerUrl = this.txUiService.explorerUrl;

     private getOwner(loan: LoanDisplayItem): string {
          return loan.owner || loan.Account || '';
     }

     private getBrokerId(loan: LoanDisplayItem): string {
          return loan.LoanBrokerID || '';
     }

     private getStatus(loan: LoanDisplayItem): string {
          return loan.status || 'active';
     }

     private getInterestRate(loan: LoanDisplayItem): number {
          return loan.InterestRate ?? 0;
     }

     // Computed values
     infoData = computed(() => this.loanViewModelService.infoData());
     totalCount = computed(() => this.infoData()?.loanCount ?? 0);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.activeQuickFilter() !== 'all');

     filteredLoans = computed(() => {
          let loans = [...(this.infoData()?.loansToShow ?? [])];
          const query = this.searchQuery().trim().toLowerCase();
          const quickFilter = this.activeQuickFilter();
          const currentAddress = this.wallet()?.address;

          // Text Search
          if (query) {
               loans = loans.filter(loan => this.getBrokerId(loan).toLowerCase().includes(query) || loan.PrincipalRequested?.toLowerCase().includes(query) || this.getOwner(loan).toLowerCase().includes(query) || this.getStatus(loan).toLowerCase().includes(query) || (loan.Data?.toLowerCase().includes(query) ?? false));
          }

          // Quick Filters
          if (quickFilter !== 'all') {
               loans = loans.filter(loan => this.getStatus(loan) === quickFilter);
          }

          return loans;
     });

     sortedLoans = computed(() => {
          let items = [...this.filteredLoans()];
          const sortField = this.sortBy();
          const direction = this.sortDirection();

          return items.sort((a, b) => {
               let valA: string | number = '';
               let valB: string | number = '';

               switch (sortField) {
                    case 'principal':
                         valA = parseFloat(a.PrincipalRequested || '0');
                         valB = parseFloat(b.PrincipalRequested || '0');
                         break;
                    case 'brokerId':
                         valA = this.getBrokerId(a);
                         valB = this.getBrokerId(b);
                         break;
                    case 'owner':
                         valA = this.getOwner(a);
                         valB = this.getOwner(b);
                         break;
                    case 'status':
                         valA = this.getStatus(a);
                         valB = this.getStatus(b);
                         break;
                    case 'interestRate':
                         valA = this.getInterestRate(a);
                         valB = this.getInterestRate(b);
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     filteredCount = computed(() => this.sortedLoans().length);

     summaryText = computed(() => {
          const info = this.loanViewModelService.infoData();
          if (!info) return '';
          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.loanCount, this.tab(), LOAN_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const count = this.infoData()?.loanCount ?? 0;
          const tab = this.loanViewModelService.activeTab();
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.filteredLoans().length === 0) {
               return `No loans matching "${query}"`;
          }
          if (quickFilter !== 'all' && this.filteredLoans().length === 0) {
               return `No ${quickFilter} loans found`;
          }
          if (count === 0) {
               switch (tab) {
                    case 'createLoan':
                         return 'This wallet has not created any Loans yet.';
                    case 'payLoan':
                         return 'No Loans available to pay.';
                    case 'deleteLoan':
                         return 'No Loans available to delete.';
                    default:
                         return 'No loans found.';
               }
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const tab = this.loanViewModelService.activeTab();
          const query = this.searchQuery();

          if (query && this.filteredLoans().length === 0) return 'Try a different search term';
          if (tab === 'createLoan' && this.totalCount() === 0) return 'Use the Create Loan tab to generate one.';

          if (tab === 'payLoan' && this.totalCount() === 0) return 'Create a Loan first to pay it.';
          if (tab === 'deleteLoan' && this.totalCount() === 0) return 'Create a Loan first to delete it.';

          return '';
     });

     getQuickFilterClass(filterKey: string): string {
          const isActive = this.activeQuickFilter() === filterKey;
          let colorClass = 'btn-filter-blue';

          switch (filterKey) {
               case 'all':
                    colorClass = 'btn-filter-blue';
                    break;
               case 'active':
                    colorClass = 'btn-filter-green';
                    break;
               case 'defaulted':
                    colorClass = 'btn-filter-red';
                    break;
               case 'impaired':
                    colorClass = 'btn-filter-amber';
                    break;
               case 'closed':
                    colorClass = 'btn-filter-gray';
                    break;
          }

          return isActive ? `${colorClass} ${colorClass}-active` : colorClass;
     }

     onSearchChange(value: string) {
          this.searchQuery.set(value);
     }

     setQuickFilter(filter: 'all' | 'active' | 'defaulted' | 'impaired' | 'closed') {
          this.activeQuickFilter.set(filter);
     }

     onSortChange(event: SortChangeEvent) {
          const validKeys: SortKey[] = ['principal', 'brokerId', 'owner', 'status', 'interestRate'];
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

     onLoanClick(loan: LoanDisplayItem) {
          if (!loan) return;
          if (this.tab() === 'createLoan') return;

          this.loanUtilService.onLoanSelectedInUi(loan);
          this.loanSelected.emit(loan);
          this.toggleInfoPanel.emit();
     }

     formatLoanId(loan: LoanDisplayItem): string {
          const id = loan.id || loan.index;
          if (!id) return 'N/A';

          if (typeof id === 'string' && id.length > 16) {
               return `${id.slice(0, 8)}...${id.slice(-8)}`;
          }
          return String(id);
     }

     formatBrokerId(loan: LoanDisplayItem): string {
          const id = loan.LoanBrokerID || '';
          if (!id) return 'N/A';

          if (id.length > 16) {
               return `${id.slice(0, 8)}...${id.slice(-8)}`;
          }
          return id;
     }

     parseFloat(value: any): number {
          return parseFloat(value);
     }
}
