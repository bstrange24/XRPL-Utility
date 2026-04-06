import { Component, computed, DestroyRef, ElementRef, inject, ViewContainerRef, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TicketsViewModelService } from '../../../../services/tickets/tickets-view-model/tickets-view-model.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { TicketStore } from '../../../../services/tickets/tickets-store/tickets-store.service';
import { TicketsUtilService } from '../../../../services/tickets/tickets-util/tickets-util.service';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TemplatePortal } from '@angular/cdk/portal';

@Component({
  selector: 'app-tickets-delete',
  standalone: true,
  imports: [FormsModule, NgIcon, LucideAngularModule],
  templateUrl: './tickets-delete.component.html',
  styleUrl: './tickets-delete.component.css',
})
export class TicketsDeleteComponent {
      private ticketOverlayRef: OverlayRef | null = null;
       private readonly overlay = inject(Overlay);
       private readonly viewContainerRef = inject(ViewContainerRef);
       private readonly destroyRef = inject(DestroyRef);
  public xrplTxOptionsStore = inject(XrplTxOptionsStore);
  public ticketStore = inject(TicketStore);
  public ticketsUtilService = inject(TicketsUtilService);
  public ticketsViewModelService = inject(TicketsViewModelService);
  public txUiService = inject(TransactionUiService);

  @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
       @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
       @ViewChild('ticketDropdownInput') ticketDropdownInput!: ElementRef<HTMLInputElement>;
       @ViewChild('ticketDropdownTemplate') ticketDropdownTemplate!: TemplateRef<any>;

  // 👇 MOVE these methods from parent
  toggleTicketSelection(seq: string): void {
          this.xrplTxOptionsStore.updateField('selectedTicketSequences', list => (list.includes(seq) ? list.filter(t => t !== seq) : [...list, seq]));
     }

  
     clearAllSelections(): void {
          this.xrplTxOptionsStore.setField('selectedTicketSequences', []);
          this.xrplTxOptionsStore.setField('ticketCountField', '');
          this.txUiService.clearAllOptionsAndMessages();
     }

   toggleSelectAllTickets(): void {
          if (this.ticketsViewModelService.allTicketsSelected()) {
               this.xrplTxOptionsStore.setField('selectedTicketSequences', []);
          } else {
               this.xrplTxOptionsStore.setField('selectedTicketSequences', [...this.xrplTxOptionsStore.ticketArray()]);
          }
     }

  openTicketDropdown(): void {
          if (!this.ticketOverlayRef) {
               this.ticketOverlayRef = this.overlay.create({
                    hasBackdrop: true,
                    backdropClass: 'cdk-overlay-transparent-backdrop',
                    positionStrategy: this.overlay
                         .position()
                         .flexibleConnectedTo(this.ticketDropdownInput)
                         .withPositions([
                              {
                                   originX: 'start',
                                   originY: 'bottom',
                                   overlayX: 'start',
                                   overlayY: 'top',
                                   offsetY: 4,
                              },
                              {
                                   originX: 'start',
                                   originY: 'top',
                                   overlayX: 'start',
                                   overlayY: 'bottom',
                                   offsetY: -4,
                              },
                         ]),

                    scrollStrategy: this.overlay.scrollStrategies.reposition(),
                    width: this.ticketDropdownInput.nativeElement.offsetWidth,
               });

               this.ticketOverlayRef
                    .backdropClick()
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(() => this.closeTicketDropdown());
          }

          if (!this.ticketOverlayRef.hasAttached()) {
               this.ticketOverlayRef.attach(new TemplatePortal(this.ticketDropdownTemplate, this.viewContainerRef));
          }

          this.ticketStore.setField('highlightedTicketIndex', -1);
          // this.highlightedTicketIndex.set(-1);
     }

  closeTicketDropdown(): void {
          this.ticketOverlayRef?.dispose();
          this.ticketOverlayRef = null;
          this.ticketStore.setField('isTicketDropdownOpen', false);
          // this.isTicketDropdownOpen.set(false);
     }

  toggleTicketDropdown(): void {
          this.ticketOverlayRef?.hasAttached() ? this.closeTicketDropdown() : this.openTicketDropdown();
     }


  onTicketSearchInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.ticketStore.setField('ticketSearchQuery', value);
     }

   onTicketKeyDown(event: KeyboardEvent): void {
          const items = this.filteredTickets();
          if (items.length === 0) return;

          let index = this.ticketStore.highlightedTicketIndex();

          if (event.key === 'ArrowDown') {
               event.preventDefault();
               index = index < items.length - 1 ? index + 1 : index;
          } else if (event.key === 'ArrowUp') {
               event.preventDefault();
               index = index >= 0 ? index - 1 : items.length - 1;
          } else if (event.key === 'Enter' && index >= 0) {
               event.preventDefault();
               this.toggleTicketSelection(items[index]);
               return;
          } else if (event.key === 'Escape') {
               this.closeTicketDropdown();
               return;
          } else {
               return; // Allow typing in search
          }

          this.ticketStore.setField('highlightedTicketIndex', index);

          // CRITICAL: Scroll the highlighted item into view
          requestAnimationFrame(() => {
               const el = this.ticketOverlayRef?.overlayElement.querySelector('.ticket-item.highlighted') as HTMLElement;
               el?.scrollIntoView({ block: 'nearest' });
          });
     }

  filteredTickets = computed(() => {
          const tickets = this.xrplTxOptionsStore.ticketArray(); // string[]
          const q = this.ticketStore.ticketSearchQuery().trim().toLowerCase();
          if (!q) return tickets;
          return tickets.filter(
               (ticket: string) => ticket.toLowerCase().includes(q) // String comparison
          );
     });

}
