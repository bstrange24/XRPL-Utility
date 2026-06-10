import { Component, inject, effect, signal, computed, ViewContainerRef, ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { LucideAngularModule } from 'lucide-angular';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-cancel-offer',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     imports: [CommonModule, FormsModule, FieldHelperComponent, NgIcon, LucideAngularModule, OverlayModule],
     templateUrl: './cancel-offer.component.html',
     styleUrl: './cancel-offer.component.css',
})
export class CancelOfferTabComponent {
     public readonly offerStoreService = inject(OfferStoreService);
     public readonly view = inject(OfferTransactionViewModelService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly overlay = inject(Overlay);
     private readonly viewContainerRef = inject(ViewContainerRef);
     private readonly cdr = inject(ChangeDetectorRef);

     private offerOverlayRef: OverlayRef | null = null;

     private selectionChangeSubscription: any;

     @ViewChild('offerDropdownInput', { read: ElementRef, static: false })
     offerDropdownInput!: ElementRef<HTMLInputElement>;

     @ViewChild('offerDropdownTemplate', { static: false })
     offerDropdownTemplate!: TemplateRef<any>;

     readonly offerSearchQuery = signal<string>('');
     readonly selectedOfferSequences = signal<number[]>([]);
     readonly highlightedOfferIndex = signal<number>(-1);

     readonly cancelOfferSelectorHelperItems = AppConstants.CANCEL_OFFER_SELECTOR_HELPER_ITEMS;
     showCancelOfferSelectorHelper = signal(false);

     readonly filteredOffers = computed(() => {
          const query = this.offerSearchQuery().trim().toLowerCase();
          const allOffers = this.offerStoreService.existingOffers();
          if (!query) return allOffers;
          return allOffers.filter((offer: any) => offer.Sequence.toString().includes(query) || this.formatOfferDisplay(offer).toLowerCase().includes(query));
     });

     readonly allOffersSelected = computed(() => {
          const selected = this.selectedOfferSequences();
          const total = this.offerStoreService.existingOffers().length;
          return selected.length === total && total > 0;
     });

     readonly selectedOffers = computed(() => {
          const selectedSeqs = this.selectedOfferSequences();
          return this.offerStoreService.existingOffers().filter((offer: any) => selectedSeqs.includes(offer.Sequence));
     });

     constructor() {
          effect(() => {
               const sequences = this.selectedOfferSequences();
               if (sequences.length > 0) {
                    this.offerStoreService.setField('offerSequenceField', sequences.join(','));
                    this.offerStoreService.setField('selectedOffersToCancel', this.selectedOffers());
               } else {
                    this.offerStoreService.setField('offerSequenceField', '');
                    this.offerStoreService.setField('selectedOffersToCancel', []);
               }
          });
     }

     ngOnDestroy(): void {
          this.closeOfferDropdown();
          if (this.selectionChangeSubscription) {
               this.selectionChangeSubscription.unsubscribe();
          }
     }

     formatOfferDisplay(offer: any): string {
          const pays = this.view.formatAmount(offer.TakerPays);
          const gets = this.view.formatAmount(offer.TakerGets);
          return `Offer Sequence: ${offer.Sequence} - Gets: ${gets.value} ${gets.currency} → Pays: ${pays.value} ${pays.currency} - Issuer: ${pays.issuer}`;
     }

     formatOfferSequenceDisplay(offer: any): string {
          return `${offer.Sequence}`;
     }

     onOfferSearchInput(event: Event): void {
          this.offerSearchQuery.set((event.target as HTMLInputElement).value);
     }

     toggleOfferSelection(offer: any): void {
          const seq = offer.Sequence;
          this.selectedOfferSequences.update(list => (list.includes(seq) ? list.filter(s => s !== seq) : [...list, seq]));
     }

     toggleSelectAllOffers(): void {
          if (this.allOffersSelected()) {
               this.selectedOfferSequences.set([]);
          } else {
               this.selectedOfferSequences.set(this.offerStoreService.existingOffers().map((o: any) => o.Sequence));
               this.offerStoreService.setField('selectedOffersToCancel', this.selectedOfferSequences());
          }
     }

     clearAllOfferSelections(): void {
          this.selectedOfferSequences.set([]);
     }

     openOfferDropdown(): void {
          if (this.offerOverlayRef?.hasAttached()) return;
          const inputEl = this.offerDropdownInput?.nativeElement;
          if (!inputEl || !this.offerDropdownTemplate) return;

          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(inputEl)
               .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
               ]);

          this.offerOverlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.reposition(),
               width: inputEl.getBoundingClientRect().width,
          });

          this.offerOverlayRef.attach(new TemplatePortal(this.offerDropdownTemplate, this.viewContainerRef));
          this.offerOverlayRef.backdropClick().subscribe(() => this.closeOfferDropdown());
          this.highlightedOfferIndex.set(-1);
     }

     closeOfferDropdown(): void {
          this.offerOverlayRef?.dispose();
          this.offerOverlayRef = null;
     }

     toggleOfferDropdown(): void {
          this.offerOverlayRef?.hasAttached() ? this.closeOfferDropdown() : this.openOfferDropdown();
     }

     onOfferKeyDown(event: KeyboardEvent): void {
          const items = this.filteredOffers();
          if (items.length === 0) return;
          let index = this.highlightedOfferIndex();

          if (event.key === 'ArrowDown') {
               event.preventDefault();
               index = index < items.length - 1 ? index + 1 : index;
          } else if (event.key === 'ArrowUp') {
               event.preventDefault();
               index = index >= 0 ? index - 1 : items.length - 1;
          } else if (event.key === 'Enter' && index >= 0) {
               event.preventDefault();
               this.toggleOfferSelection(items[index]);
               return;
          } else if (event.key === 'Escape') {
               this.closeOfferDropdown();
               return;
          } else return;

          this.highlightedOfferIndex.set(index);
          setTimeout(() => {
               const el = document.querySelector('.offer-item.highlighted') as HTMLElement;
               el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
     }

     // Toggle Method
     toggleOfferSelectorHelper() {
          this.showCancelOfferSelectorHelper.set(!this.showCancelOfferSelectorHelper());
     }
}
