import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { SortChangeEvent, SortControlComponent, SortOption } from '../../../shared/sort-control/sort-control.component';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { LoanBrokerViewModelService } from '../../../../services/loan-broker/loan-broker-view-model/loan-broker-view-model.service';
import { LoanBrokerUtilService } from '../../../../services/loan-broker/loan-broker-util/loan-broker-util.service';
import { LoanBrokerActionTypes, LoanBrokerDisplayItem } from '../../constants/loan-broker.types';

const LOAN_BROKER_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'loan broker',
     itemNamePlural: 'loan brokers',
     actionMap: {
          createBroker: 'created.',
          modifyBroker: 'that can be modified.',
          deleteBroker: 'that can be deleted.',
          coverWithdraw: 'available for withdrawal.',
          coverDeposit: 'available for deposit.',
          coverClawback: 'available for clawback.',
          modifyLoan: 'that can be modified.',
          defaultLoan: 'that can be defaulted.',
          impairLoan: 'that can be impaired.',
          unimpairLoan: 'that can be un-impaired.',
     },
};

type SortKey = 'brokerId' | 'vaultId' | 'owner' | 'managementFee';
type BrokerQuickFilterKey = 'all' | 'owned';

@Component({
     selector: 'app-loan-broker-summary',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule, SummaryContainerComponent, SummaryItemComponent, FormsModule, SortControlComponent, OverlayModule, TooltipLinkComponent, SummaryKeyValueComponent],
     templateUrl: './loan-broker-summary.component.html',
     styleUrl: './loan-broker-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanBrokerSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly loanBrokerUtilService = inject(LoanBrokerUtilService);
     public readonly loanBrokerViewModelService = inject(LoanBrokerViewModelService);
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
               console.log('Summary - infoData changed:', info?.brokerCount, 'brokersToShow:', info?.brokersToShow?.length);
               console.log('Summary - wallet address:', walletAddr);
               console.log('Summary - filteredBrokers:', this.filteredBrokers().length);
          });
     }

     // Inputs
     wallet = input<{ address: string } | null | undefined>();
     brokerLength = input.required<number>();
     tab = input.required<LoanBrokerActionTypes>();
     infoPanelExpanded = input<boolean>();
     info = input<string>();
     resetTrigger = input<number>(0);

     // Outputs
     toggleInfoPanel = output<void>();
     brokerSelected = output<any>();

     // Search and Filter State
     readonly searchQuery = signal<string>('');
     readonly activeQuickFilter = signal<BrokerQuickFilterKey>('all');
     readonly sortBy = signal<SortKey>('brokerId');
     readonly sortDirection = signal<'asc' | 'desc'>('asc');

     // Sort Options
     sortOptions: SortOption[] = [
          { key: 'brokerId', label: 'Broker ID' },
          { key: 'vaultId', label: 'Vault ID' },
          { key: 'owner', label: 'Owner' },
          { key: 'managementFee', label: 'Management Fee' },
     ];

     // Quick Filter Options
     quickFilters: { key: 'all' | 'owned'; label: string; icon: string; color: string }[] = [
          { key: 'all', label: 'All', icon: 'heroSquares2x2', color: 'blue' },
          { key: 'owned', label: 'Owned', icon: 'heroUser', color: 'green' },
     ];

     explorerUrl = this.txUiService.explorerUrl;

     private getOwner(broker: LoanBrokerDisplayItem): string {
          return broker.owner || broker.Account || '';
     }

     public getBrokerId(broker: LoanBrokerDisplayItem): string {
          return broker.LoanBrokerID || broker.id || broker.index || '';
     }

     private getVaultId(broker: LoanBrokerDisplayItem): string {
          return broker.VaultID || '';
     }

     private getManagementFee(broker: LoanBrokerDisplayItem): number {
          return broker.ManagementFeeRate ?? 0;
     }

     // Computed values
     infoData = computed(() => this.loanBrokerViewModelService.infoData());
     totalCount = computed(() => this.infoData()?.brokerCount ?? 0);
     hasActiveFilters = computed(() => this.searchQuery().length > 0 || this.activeQuickFilter() !== 'all');

     filteredBrokers = computed(() => {
          let brokers = [...(this.infoData()?.brokersToShow ?? [])];
          const query = this.searchQuery().trim().toLowerCase();
          const quickFilter = this.activeQuickFilter();
          const currentAddress = this.wallet()?.address;

          // Text Search
          if (query) {
               brokers = brokers.filter(broker => this.getBrokerId(broker).toLowerCase().includes(query) || this.getVaultId(broker).toLowerCase().includes(query) || this.getOwner(broker).toLowerCase().includes(query) || (broker.Data?.toLowerCase().includes(query) ?? false));
          }

          // Quick Filters
          if (quickFilter === 'owned') {
               if (currentAddress) {
                    brokers = brokers.filter(broker => this.getOwner(broker) === currentAddress);
               }
          }

          return brokers;
     });

     sortedBrokers = computed(() => {
          let items = [...this.filteredBrokers()];
          const sortField = this.sortBy();
          const direction = this.sortDirection();

          return items.sort((a, b) => {
               let valA: string | number = '';
               let valB: string | number = '';

               switch (sortField) {
                    case 'brokerId':
                         valA = this.getBrokerId(a);
                         valB = this.getBrokerId(b);
                         break;
                    case 'vaultId':
                         valA = this.getVaultId(a);
                         valB = this.getVaultId(b);
                         break;
                    case 'owner':
                         valA = this.getOwner(a);
                         valB = this.getOwner(b);
                         break;
                    case 'managementFee':
                         valA = this.getManagementFee(a);
                         valB = this.getManagementFee(b);
                         break;
               }

               if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA;
               }

               const cmp = String(valA).localeCompare(String(valB));
               return direction === 'asc' ? cmp : -cmp;
          });
     });

     filteredCount = computed(() => this.sortedBrokers().length);

     summaryText = computed(() => {
          const info = this.loanBrokerViewModelService.infoData();
          if (!info) return '';
          return this.summaryTextConfigService.buildSummaryText(info.walletName, info.brokerCount, this.tab(), LOAN_BROKER_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const count = this.infoData()?.brokerCount ?? 0;
          const tab = this.loanBrokerViewModelService.activeTab();
          const query = this.searchQuery();
          const quickFilter = this.activeQuickFilter();

          if (query && this.filteredBrokers().length === 0) {
               return `No loan brokers matching "${query}"`;
          }
          if (quickFilter === 'owned' && this.filteredBrokers().length === 0) {
               return `No owned loan brokers found`;
          }
          if (count === 0) {
               switch (tab) {
                    case 'createBroker':
                         return 'This wallet has not created any Loan Brokers yet.';
                    case 'modifyBroker':
                         return 'No Loan Brokers available to modify.';
                    case 'deleteBroker':
                         return 'No Loan Brokers available to delete.';
                    case 'coverWithdraw':
                         return 'No Loan Brokers available for withdrawal.';
                    case 'coverDeposit':
                         return 'No Loan Brokers available for deposit.';
                    case 'coverClawback':
                         return 'No Loan Brokers available for clawback.';
                    case 'modifyLoan':
                         return 'No Loans available to modify.';
                    case 'defaultLoan':
                         return 'No Loans available to default.';
                    case 'impairLoan':
                         return 'No Loans available to impair.';
                    case 'unimpairLoan':
                         return 'No impaired Loans available to un-impair.';
                    default:
                         return 'No loan brokers found.';
               }
          }
          return '';
     });

     emptyStateSubMessage = computed(() => {
          const tab = this.loanBrokerViewModelService.activeTab();
          const query = this.searchQuery();

          if (query && this.filteredBrokers().length === 0) return 'Try a different search term';
          if (tab === 'createBroker' && this.totalCount() === 0) return 'Use the Create Broker tab to generate one.';
          if (tab === 'modifyBroker' && this.totalCount() === 0) return 'Create a Loan Broker first to modify it.';
          if (tab === 'modifyLoan' && this.totalCount() === 0) return 'Create a Loan first to modify it.';
          if (tab === 'deleteBroker' && this.totalCount() === 0) return 'Create a Loan Broker first to delete it.';
          if (tab === 'defaultLoan' && this.totalCount() === 0) return 'Create a Loan first to default it.';
          if (tab === 'impairLoan' && this.totalCount() === 0) return 'Create a Loan first to impair it.';
          if (tab === 'unimpairLoan' && this.totalCount() === 0) return 'Create a Loan and impair it first.';
          if ((tab === 'coverWithdraw' || tab === 'coverDeposit' || tab === 'coverClawback') && this.totalCount() === 0) {
               return 'Create a Loan Broker first to manage its cover capital.';
          }

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
          const validKeys: SortKey[] = ['brokerId', 'vaultId', 'owner', 'managementFee'];
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

     onBrokerClick(broker: LoanBrokerDisplayItem) {
          if (!broker) return;
          if (this.tab() === 'createBroker') return;

          this.loanBrokerUtilService.onBrokerSelectedInUi(broker);
          this.brokerSelected.emit(broker);
          this.toggleInfoPanel.emit();
     }

     formatBrokerId(broker: LoanBrokerDisplayItem): string {
          const id = this.getBrokerId(broker);
          if (!id) return 'N/A';

          if (id.length > 16) {
               return `${id.slice(0, 8)}...${id.slice(-8)}`;
          }
          return id;
     }

     formatVaultId(broker: LoanBrokerDisplayItem): string {
          const id = this.getVaultId(broker);
          if (!id) return 'N/A';

          if (id.length > 16) {
               return `${id.slice(0, 8)}...${id.slice(-8)}`;
          }
          return id;
     }

     formatManagementFee(broker: LoanBrokerDisplayItem): string {
          const fee = this.getManagementFee(broker);
          if (fee === 0) return '0%';
          return `${fee / 1000}%`;
     }

     formatBrokerData(broker: LoanBrokerDisplayItem): string {
          if (!broker.Data) return '';
          return broker.Data;
     }

     getBrokerStatus(broker: LoanBrokerDisplayItem): { label: string; color: string } {
          const coverBalance = broker.CoverBalance ?? 0;
          const coverMin = broker.CoverRateMinimum ?? 0;

          if (coverBalance <= 0) {
               return { label: 'No Cover', color: 'gray' };
          }
          if (coverBalance > 0 && coverMin > 0 && coverBalance < coverMin) {
               return { label: 'Underfunded', color: 'red' };
          }
          if (coverBalance > 0 && coverMin > 0 && coverBalance >= coverMin) {
               return { label: 'Fully Funded', color: 'green' };
          }
          return { label: 'Active', color: 'blue' };
     }

     // getBrokerStatus(broker: LoanBrokerDisplayItem): { label: string; color: string } {
     //      const coverBalance = broker.CoverBalance ?? 0;
     //      const coverMin = broker.CoverRateMinimum ?? 0;

     //      if (coverBalance <= 0) {
     //           return { label: 'No Cover', color: 'gray' };
     //      }
     //      if (coverBalance > 0 && coverMin > 0 && coverBalance < coverMin) {
     //           return { label: 'Underfunded', color: 'red' };
     //      }
     //      if (coverBalance > 0 && coverMin > 0 && coverBalance >= coverMin) {
     //           return { label: 'Fully Funded', color: 'green' };
     //      }
     //      return { label: 'Active', color: 'blue' };
     // }
}
