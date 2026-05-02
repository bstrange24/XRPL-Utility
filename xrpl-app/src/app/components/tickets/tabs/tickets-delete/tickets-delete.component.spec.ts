import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketsDeleteComponent } from './tickets-delete.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroClock, heroChevronDown, heroInformationCircle, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { Overlay } from '@angular/cdk/overlay';

// ✅ IMPORTANT: match component imports exactly
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { TicketStore } from '../../../../services/tickets/tickets-store/tickets-store.service';
import { TicketsUtilService } from '../../../../services/tickets/tickets-util/tickets-util.service';
import { TicketsViewModelService } from '../../../../services/tickets/tickets-view-model/tickets-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';

// -------------------------
// Overlay Mock
// -------------------------
class MockOverlay {
     create() {
          return {
               hasAttached: () => false,
               attach: jasmine.createSpy('attach'),
               dispose: jasmine.createSpy('dispose'),
               backdropClick: () => ({
                    pipe: () => ({
                         subscribe: () => {},
                    }),
               }),
               overlayElement: document.createElement('div'),
          };
     }

     position() {
          return {
               flexibleConnectedTo: () => ({
                    withPositions: () => ({}),
               }),
          };
     }

     scrollStrategies = {
          reposition: () => ({}),
     };
}

describe('TicketsDeleteComponent', () => {
     let component: TicketsDeleteComponent;
     let fixture: ComponentFixture<TicketsDeleteComponent>;

     // ✅ Relaxed typing (avoids TS2749 + signal issues)
     let xrplStore: jasmine.SpyObj<any>;
     let ticketStore: jasmine.SpyObj<any>;
     let utilService: jasmine.SpyObj<any>;
     let viewModel: jasmine.SpyObj<any>;
     let txUi: jasmine.SpyObj<any>;

     beforeEach(async () => {
          xrplStore = jasmine.createSpyObj('XrplTxOptionsStore', ['updateField', 'setField', 'ticketArray', 'selectedTicketSequences']);

          ticketStore = jasmine.createSpyObj('TicketStore', ['setField', 'ticketSearchQuery', 'highlightedTicketIndex']);

          utilService = jasmine.createSpyObj('TicketsUtilService', ['convertToString']);
          viewModel = jasmine.createSpyObj('TicketsViewModelService', ['allTicketsSelected']);
          txUi = jasmine.createSpyObj('TransactionUiService', ['clearAllOptionsAndMessages']);

          // ---- Default behavior ----
          xrplStore.ticketArray.and.returnValue(['1', '2', '3']);
          xrplStore.selectedTicketSequences.and.returnValue([]);
          ticketStore.ticketSearchQuery.and.returnValue('');
          ticketStore.highlightedTicketIndex.and.returnValue(-1);
          utilService.convertToString.and.callFake((v: any) => String(v));
          viewModel.allTicketsSelected.and.returnValue(false);

          await TestBed.configureTestingModule({
               imports: [TicketsDeleteComponent],
               providers: [
                    provideNoopAnimations(),
                    { provide: Overlay, useClass: MockOverlay },

                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    provideIcons({
                         heroExclamationTriangle,
                         heroClock,
                         heroChevronDown,
                         heroInformationCircle,
                         heroMagnifyingGlass,
                    }),

                    // ✅ Proper DI tokens (no strings)
                    { provide: XrplTxOptionsStore, useValue: xrplStore },
                    { provide: TicketStore, useValue: ticketStore },
                    { provide: TicketsUtilService, useValue: utilService },
                    { provide: TicketsViewModelService, useValue: viewModel },
                    { provide: TransactionUiService, useValue: txUi },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(TicketsDeleteComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     // -------------------------
     // Selection
     // -------------------------
     it('should toggle ticket selection', () => {
          component.toggleTicketSelection('1');
          expect(xrplStore.updateField).toHaveBeenCalled();
     });

     // -------------------------
     // Clear All
     // -------------------------
     it('should clear all selections', () => {
          component.clearAllSelections();

          expect(xrplStore.setField).toHaveBeenCalledWith('selectedTicketSequences', []);
          expect(xrplStore.setField).toHaveBeenCalledWith('ticketCountField', '');
          expect(txUi.clearAllOptionsAndMessages).toHaveBeenCalled();
     });

     // -------------------------
     // Select All
     // -------------------------
     it('should clear when all selected', () => {
          viewModel.allTicketsSelected.and.returnValue(true);

          component.toggleSelectAllTickets();

          expect(xrplStore.setField).toHaveBeenCalledWith('selectedTicketSequences', []);
     });

     it('should select all when not selected', () => {
          viewModel.allTicketsSelected.and.returnValue(false);
          xrplStore.ticketArray.and.returnValue(['1', '2']);

          component.toggleSelectAllTickets();

          expect(xrplStore.setField).toHaveBeenCalledWith('selectedTicketSequences', ['1', '2']);
     });

     // -------------------------
     // Search
     // -------------------------
     it('should update search query', () => {
          const event = { target: { value: 'abc' } } as any;

          component.onTicketSearchInput(event);

          expect(ticketStore.setField).toHaveBeenCalledWith('ticketSearchQuery', 'abc');
     });

     // -------------------------
     // Filtering
     // -------------------------
     it('should return all tickets when query empty', () => {
          xrplStore.ticketArray.and.returnValue(['1', '2']);
          ticketStore.ticketSearchQuery.and.returnValue('');

          expect(component.filteredTickets()).toEqual(['1', '2']);
     });

     it('should filter tickets', () => {
          xrplStore.ticketArray.and.returnValue(['123', '456']);
          ticketStore.ticketSearchQuery.and.returnValue('12');

          expect(component.filteredTickets()).toEqual(['123']);
     });

     // -------------------------
     // Keyboard
     // -------------------------
     it('should handle ArrowDown', () => {
          const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
          spyOn(event, 'preventDefault');

          component.onTicketKeyDown(event);

          expect(ticketStore.setField).toHaveBeenCalled();
     });

     it('should close on Escape', () => {
          spyOn(component, 'closeTicketDropdown');

          const event = new KeyboardEvent('keydown', { key: 'Escape' });

          component.onTicketKeyDown(event);

          expect(component.closeTicketDropdown).toHaveBeenCalled();
     });

     // -------------------------
     // Dropdown
     // -------------------------
     it('should open dropdown', () => {
          component.openTicketDropdown();
          expect((component as any).ticketOverlayRef).toBeTruthy();
     });

     it('should close dropdown', () => {
          component.openTicketDropdown();
          component.closeTicketDropdown();

          expect((component as any).ticketOverlayRef).toBeNull();
     });

     it('should toggle dropdown', () => {
          spyOn(component, 'openTicketDropdown');
          spyOn(component, 'closeTicketDropdown');

          component.toggleTicketDropdown();

          expect(component.openTicketDropdown).toHaveBeenCalled();
     });
});
