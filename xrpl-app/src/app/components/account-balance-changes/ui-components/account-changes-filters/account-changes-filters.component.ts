import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnDestroy, output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';
import flatpickr from 'flatpickr';
import { AccountChangesStoreService } from '../../../../services/account-balance-changes/account-changes-store/account-changes-store.service';
import { AccountChangesOrchestratorService } from '../../../../services/account-balance-changes/account-changes-orchestrator/account-changes-orchestrator.service';
import { AccountChangesViewModelService } from '../../../../services/account-balance-changes/account-changes-view-model/account-changes-view-model.service';
import { BalanceChangeDirection } from '../../constants/account-balance.types';

type ActiveFilterKey = 'search' | 'direction' | 'date' | 'type' | 'currency' | 'change' | 'fee';
type DatePreset = '24h' | '7d' | '30d' | 'all';

interface ActiveFilter {
     key: ActiveFilterKey;
     label: string;
}

@Component({
     selector: 'app-account-changes-filters',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, LucideAngularModule],
     templateUrl: './account-changes-filters.component.html',
     styleUrl: './account-changes-filters.component.css',
})
export class AccountChangesFiltersComponent implements AfterViewInit, OnDestroy {
     public readonly store = inject(AccountChangesStoreService);
     public readonly orchestrator = inject(AccountChangesOrchestratorService);
     public readonly viewModel = inject(AccountChangesViewModelService);
     @ViewChild('rangeInput', { static: true }) rangeInput!: ElementRef;
     private rangePicker: any;
     private searchTimer: ReturnType<typeof setTimeout> | undefined;

     readonly refresh = output<void>();
     readonly loadMore = output<void>();
     readonly datePresets: { value: DatePreset; label: string }[] = [
          { value: '24h', label: '24 hours' },
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' },
          { value: 'all', label: 'All time' },
     ];
     readonly directionOptions: { value: BalanceChangeDirection; label: string }[] = [
          { value: 'all', label: 'All' },
          { value: 'incoming', label: 'Incoming' },
          { value: 'outgoing', label: 'Outgoing' },
     ];
     readonly selectedDatePreset = signal<DatePreset | null>(null);
     readonly loadedCount = computed(() => this.store.balanceChanges().length);
     readonly matchedCount = computed(() => this.viewModel.filteredBalanceChanges().length);
     readonly activeFilters = computed<ActiveFilter[]>(() => {
          const filters: ActiveFilter[] = [];
          const search = this.store.filterValue();
          const direction = this.store.direction();
          const { start, end } = this.store.dateRange();
          const transactionType = this.store.transactionType();
          const currency = this.store.currency();
          const changeRange = this.store.changeRange();
          const feeRange = this.store.feeRange();

          if (search) filters.push({ key: 'search', label: `Search: ${search}` });
          if (direction !== 'all') filters.push({ key: 'direction', label: direction === 'incoming' ? 'Incoming' : 'Outgoing' });
          if (start || end) {
               const presetLabel = this.selectedDatePreset() === '24h' ? 'Last 24 hours' : this.selectedDatePreset() === '7d' ? 'Last 7 days' : this.selectedDatePreset() === '30d' ? 'Last 30 days' : null;
               filters.push({ key: 'date', label: presetLabel ? `Date: ${presetLabel}` : `Date: ${this.formatRangeDate(start)} – ${this.formatRangeDate(end)}` });
          }
          if (transactionType) filters.push({ key: 'type', label: `Type: ${transactionType}` });
          if (currency) filters.push({ key: 'currency', label: `Currency: ${currency}` });
          if (changeRange.min !== null || changeRange.max !== null) filters.push({ key: 'change', label: `Change: ${this.formatRangeValue(changeRange.min)} – ${this.formatRangeValue(changeRange.max)}` });
          if (feeRange.min !== null || feeRange.max !== null) filters.push({ key: 'fee', label: `Fee: ${this.formatRangeValue(feeRange.min)} – ${this.formatRangeValue(feeRange.max)} XRP` });
          return filters;
     });

     ngAfterViewInit(): void {
          this.rangePicker = flatpickr(this.rangeInput.nativeElement, {
               mode: 'range',
               dateFormat: 'Y-m-d',
               allowInput: false,
               clickOpens: true,
               appendTo: document.body,
               onChange: (selectedDates: Date[]) => {
                    const [start, end] = selectedDates;
                    this.selectedDatePreset.set(null);
                    this.setStartDate(start ? this.formatDate(start) : null);
                    this.setEndDate(end ? this.formatDate(end) : null);
               },
          });

          const range = this.store.dateRange();
          if (range.start || range.end) {
               this.rangePicker.setDate([range.start, range.end].filter((date): date is Date => date !== null), false);
          }
     }

     ngOnDestroy(): void {
          if (this.searchTimer) clearTimeout(this.searchTimer);
          this.rangePicker?.destroy();
     }

     onSearchInput(value: string): void {
          if (this.searchTimer) clearTimeout(this.searchTimer);
          this.searchTimer = setTimeout(() => {
               this.store.setField('filterValue', value.trim().toLowerCase());
          }, 300);
     }

     clearFilter(): void {
          if (this.searchTimer) clearTimeout(this.searchTimer);
          this.store.setField('filterValue', '');
     }

     clearDateFilter(): void {
          this.selectedDatePreset.set(null);
          this.store.setField('dateRange', { start: null, end: null });
          this.rangePicker?.clear();
     }

     clearAll(): void {
          this.clearFilter();
          this.clearDateFilter();
          this.store.setField('direction', 'all');
          this.store.setField('transactionType', '');
          this.store.setField('currency', '');
          this.store.setField('changeRange', { min: null, max: null });
          this.store.setField('feeRange', { min: null, max: null });
     }

     clearActiveFilter(key: ActiveFilterKey): void {
          switch (key) {
               case 'search':
                    this.clearFilter();
                    break;
               case 'direction':
                    this.store.setField('direction', 'all');
                    break;
               case 'date':
                    this.clearDateFilter();
                    break;
               case 'type':
                    this.store.setField('transactionType', '');
                    break;
               case 'currency':
                    this.store.setField('currency', '');
                    break;
               case 'change':
                    this.store.setField('changeRange', { min: null, max: null });
                    break;
               case 'fee':
                    this.store.setField('feeRange', { min: null, max: null });
                    break;
          }
     }

     setDatePreset(preset: DatePreset): void {
          this.selectedDatePreset.set(preset);
          if (preset === 'all') {
               this.store.setField('dateRange', { start: null, end: null });
               this.rangePicker?.clear();
               return;
          }

          const end = new Date();
          const start = new Date(end);
          const durationInDays = preset === '24h' ? 1 : preset === '7d' ? 7 : 30;
          start.setTime(end.getTime() - durationInDays * 24 * 60 * 60 * 1000);
          this.store.setField('dateRange', { start, end });
          this.rangePicker?.setDate([start, end], false);
     }

     setDirection(direction: BalanceChangeDirection): void {
          this.store.setField('direction', direction);
     }

     setChangeRangeBound(bound: 'min' | 'max', value: number | null): void {
          this.store.setField('changeRange', { ...this.store.changeRange(), [bound]: value });
     }

     setFeeRangeBound(bound: 'min' | 'max', value: number | null): void {
          this.store.setField('feeRange', { ...this.store.feeRange(), [bound]: value });
     }

     openDatePicker(): void {
          this.rangePicker?.open();
     }

     setStartDate(value: string | null): void {
          if (!value) {
               this.store.setField('dateRange', { ...this.store.dateRange(), start: null });
               return;
          }
          const [year, month, day] = value.split('-').map(Number);
          const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
          this.store.setField('dateRange', { ...this.store.dateRange(), start });
     }

     setEndDate(value: string | null): void {
          if (!value) {
               this.store.setField('dateRange', { ...this.store.dateRange(), end: null });
               return;
          }
          const [year, month, day] = value.split('-').map(Number);
          const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
          this.store.setField('dateRange', { ...this.store.dateRange(), end });
     }

     onRefresh(): void {
          this.refresh.emit();
     }

     private formatDate(date: Date): string {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
     }

     private formatRangeDate(date: Date | null): string {
          return date ? date.toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'Any';
     }

     private formatRangeValue(value: number | null): string {
          return value === null ? 'Any' : String(value);
     }
}
