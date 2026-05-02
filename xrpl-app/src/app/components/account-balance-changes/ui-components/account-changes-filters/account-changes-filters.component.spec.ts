import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountChangesFiltersComponent } from './account-changes-filters.component';
import { AccountChangesStoreService } from '../../../../services/account-balance-changes/account-changes-store/account-changes-store.service';
import { AccountChangesOrchestratorService } from '../../../../services/account-balance-changes/account-changes-orchestrator/account-changes-orchestrator.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('AccountChangesFiltersComponent', () => {
     let component: AccountChangesFiltersComponent;
     let fixture: ComponentFixture<AccountChangesFiltersComponent>;
     let store: any;
     let orchestrator: any;

     // Mock date range
     const mockDateRange = { start: null, end: null };

     beforeEach(async () => {
          store = {
               filterValue: signal(''),
               dateRange: signal(mockDateRange),
               loadingInitial: signal(false),
               setField: jasmine.createSpy('setField'),
          };

          orchestrator = {};

          await TestBed.configureTestingModule({
               imports: [AccountChangesFiltersComponent],
               providers: [
                    { provide: AccountChangesStoreService, useValue: store },
                    { provide: AccountChangesOrchestratorService, useValue: orchestrator },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountChangesFiltersComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          // Clear any pending timers
          if ((component as any).searchTimer) {
               clearTimeout((component as any).searchTimer);
          }
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('refresh output', () => {
          it('should have refresh output', () => {
               expect(component.refresh).toBeDefined();
               expect(component.refresh.emit).toBeDefined();
          });

          it('should emit refresh when onRefresh is called', () => {
               spyOn(component.refresh, 'emit');
               component.onRefresh();
               expect(component.refresh.emit).toHaveBeenCalled();
          });
     });

     describe('onSearchInput', () => {
          it('should debounce search input and set filterValue in store', fakeAsync(() => {
               component.onSearchInput('test query');
               expect(store.setField).not.toHaveBeenCalled();

               tick(300);

               expect(store.setField).toHaveBeenCalledWith('filterValue', 'test query');
          }));

          it('should trim and lowercase search input', fakeAsync(() => {
               component.onSearchInput('  TEST QUERY  ');

               tick(300);

               expect(store.setField).toHaveBeenCalledWith('filterValue', 'test query');
          }));

          it('should handle empty string', fakeAsync(() => {
               component.onSearchInput('');

               tick(300);

               expect(store.setField).toHaveBeenCalledWith('filterValue', '');
          }));

          it('should clear previous timeout on rapid inputs', fakeAsync(() => {
               component.onSearchInput('a');
               tick(100);
               component.onSearchInput('ab');
               tick(100);
               component.onSearchInput('abc');

               tick(300);

               expect(store.setField).toHaveBeenCalledTimes(1);
               expect(store.setField).toHaveBeenCalledWith('filterValue', 'abc');
          }));
     });

     describe('clearFilter', () => {
          it('should clear filterValue in store', () => {
               component.clearFilter();
               expect(store.setField).toHaveBeenCalledWith('filterValue', '');
          });
     });

     describe('clearDateFilter', () => {
          it('should clear date range in store', () => {
               component.clearDateFilter();
               expect(store.setField).toHaveBeenCalledWith('dateRange', { start: null, end: null });
          });
     });

     describe('clearAll', () => {
          it('should clear both filter and date range', () => {
               spyOn(component, 'clearFilter');
               spyOn(component, 'clearDateFilter');

               component.clearAll();

               expect(component.clearFilter).toHaveBeenCalled();
               expect(component.clearDateFilter).toHaveBeenCalled();
          });
     });

     describe('setStartDate', () => {
          it('should set start date in store with UTC at beginning of day', () => {
               component.setStartDate('2024-01-15');

               const expectedDate = new Date(Date.UTC(2024, 0, 15, 0, 0, 0, 0));
               expect(store.setField).toHaveBeenCalledWith('dateRange', jasmine.objectContaining({ start: expectedDate }));
          });

          it('should set start date to null when value is null', () => {
               component.setStartDate(null);

               expect(store.setField).toHaveBeenCalledWith('dateRange', jasmine.objectContaining({ start: null }));
          });

          it('should preserve existing end date when setting start date', () => {
               const existingEnd = new Date(Date.UTC(2024, 0, 20, 23, 59, 59, 999));
               store.dateRange.set({ start: null, end: existingEnd });

               component.setStartDate('2024-01-15');

               expect(store.setField).toHaveBeenCalledWith('dateRange', jasmine.objectContaining({ end: existingEnd }));
          });
     });

     describe('setEndDate', () => {
          it('should set end date in store with UTC at end of day', () => {
               component.setEndDate('2024-01-15');

               const expectedDate = new Date(Date.UTC(2024, 0, 15, 23, 59, 59, 999));
               expect(store.setField).toHaveBeenCalledWith('dateRange', jasmine.objectContaining({ end: expectedDate }));
          });

          it('should set end date to null when value is null', () => {
               component.setEndDate(null);

               expect(store.setField).toHaveBeenCalledWith('dateRange', jasmine.objectContaining({ end: null }));
          });

          it('should preserve existing start date when setting end date', () => {
               const existingStart = new Date(Date.UTC(2024, 0, 10, 0, 0, 0, 0));
               store.dateRange.set({ start: existingStart, end: null });

               component.setEndDate('2024-01-15');

               expect(store.setField).toHaveBeenCalledWith('dateRange', jasmine.objectContaining({ start: existingStart }));
          });
     });

     describe('formatDate', () => {
          it('should format date as YYYY-MM-DD', () => {
               const date = new Date(2024, 0, 15);
               const formatted = (component as any).formatDate(date);
               expect(formatted).toBe('2024-01-15');
          });

          it('should pad month and day with zeros', () => {
               const date = new Date(2024, 0, 5);
               const formatted = (component as any).formatDate(date);
               expect(formatted).toBe('2024-01-05');
          });
     });

     describe('Store bindings', () => {
          it('should have filterValue from store', () => {
               store.filterValue.set('test');
               fixture.detectChanges();
               expect(store.filterValue()).toBe('test');
          });

          it('should have loadingInitial from store', () => {
               store.loadingInitial.set(true);
               fixture.detectChanges();
               expect(store.loadingInitial()).toBeTrue();
          });
     });

     describe('Edge cases', () => {
          it('should handle invalid date strings in setStartDate', () => {
               expect(() => component.setStartDate('invalid')).not.toThrow();
          });

          it('should handle invalid date strings in setEndDate', () => {
               expect(() => component.setEndDate('invalid')).not.toThrow();
          });
     });
});
