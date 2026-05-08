import { Component, inject, output, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';
import { AccountChangesStoreService } from '../../../../services/account-balance-changes/account-changes-store/account-changes-store.service';
import { AccountChangesOrchestratorService } from '../../../../services/account-balance-changes/account-changes-orchestrator/account-changes-orchestrator.service';
import flatpickr from 'flatpickr';

@Component({
     selector: 'app-account-changes-filters',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, LucideAngularModule],
     templateUrl: './account-changes-filters.component.html',
     styleUrl: './account-changes-filters.component.css',
})
export class AccountChangesFiltersComponent implements AfterViewInit {
     public readonly store = inject(AccountChangesStoreService);
     public readonly orchestrator = inject(AccountChangesOrchestratorService);
     @ViewChild('rangeInput', { static: true }) rangeInput!: ElementRef;
     private rangePicker: any;

     readonly refresh = output<void>();

     private searchTimer: any;

     ngAfterViewInit() {
          this.rangePicker = flatpickr(this.rangeInput.nativeElement, {
               mode: 'range',
               dateFormat: 'Y-m-d',
               allowInput: false,
               clickOpens: true,
               appendTo: document.body,

               onChange: (selectedDates: Date[]) => {
                    const [start, end] = selectedDates;

                    this.setStartDate(start ? this.formatDate(start) : null);
                    this.setEndDate(end ? this.formatDate(end) : null);
               },
          });

          // Initialize with existing store values
          const range = this.store.dateRange();
          if (range.start || range.end) {
               this.rangePicker.setDate([range.start, range.end], false);
          }
     }

     private formatDate(date: Date): string {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
     }

     clearDateFilter() {
          this.setStartDate(null);
          this.setEndDate(null);

          if (this.rangePicker) {
               this.rangePicker.clear();
          }

          this.store.setField('dateRange', { start: null, end: null });
     }

     onSearchInput(value: string): void {
          clearTimeout(this.searchTimer);
          this.searchTimer = setTimeout(() => {
               this.store.setField('filterValue', value.trim().toLowerCase());
          }, 300);
     }

     clearFilter(): void {
          this.store.setField('filterValue', '');
     }

     clearAll(): void {
          this.clearFilter();
          this.clearDateFilter();
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
}
