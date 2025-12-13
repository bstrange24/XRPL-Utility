import { Component, ElementRef, ViewChild, TemplateRef, ViewContainerRef, inject, input, output, signal, computed, ChangeDetectionStrategy, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface SelectItem {
     id: string;
     display: string;
     secondary?: string;
     isCurrentAccount?: boolean;
     isCurrentCode?: boolean;
     isCurrentToken?: boolean;
     group?: string; // ← NEW: group name
     pending?: boolean;
     showSecondaryInInput?: boolean;
}

@Component({
     selector: 'app-select-search-dropdown',
     standalone: true,
     imports: [CommonModule, LucideAngularModule],
     templateUrl: './select-search-dropdown.component.html',
     styleUrl: './select-search-dropdown.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectSearchDropdownComponent implements AfterViewInit, OnDestroy {
     //  Component Registry ensures only ONE dropdown is open at a time.
     private static openInstance: SelectSearchDropdownComponent | null = null;

     private static closeAnyOther(instance: SelectSearchDropdownComponent) {
          if (this.openInstance && this.openInstance !== instance) {
               this.openInstance.close();
          }
          this.openInstance = instance;
     }

     // Inputs / Outputs
     @ViewChild('inputEl', { static: true })
     inputEl!: ElementRef<HTMLInputElement>;

     @ViewChild('dropdown')
     dropdownTpl!: TemplateRef<any>;

     items = input.required<SelectItem[]>();

     value = input<SelectItem | null>(null);
     valueChange = output<SelectItem | null>();
     selected = output<SelectItem>();
     showSecondaryInInput = input<boolean>(true); // default = true (show parentheses)

     placeholder = input<string>('Search...');
     emptyMessage = input<string>('No items found');
     showShortAddress = input<boolean>(true);

     // Overlay + state signals
     private readonly overlay = inject(Overlay);
     private readonly vcr = inject(ViewContainerRef);
     private overlayRef: OverlayRef | null = null;
     private portal!: TemplatePortal<any>;

     searchQuery = signal('');
     highlightedIndex = signal(-1);

     displayValue = computed(() => {
          if (this.searchQuery()) return this.searchQuery();

          const sel = this.value();
          if (!sel) return '';

          // Use the new input to decide
          if (this.showSecondaryInInput()) {
               const short = sel.secondary ? `${sel.secondary.slice(0, 7)}...${sel.secondary.slice(-7)}` : '';
               return short ? `${sel.display} (${short})` : sel.display;
          }

          // Otherwise: clean display only
          return sel.display;
     });

     // // Computed Display Value
     // displayValue = computed(() => {
     //      if (this.searchQuery()) return this.searchQuery();

     //      const sel = this.value();
     //      if (!sel) return '';

     //      // Only shorten if showShortAddress is true (default = yes)
     //      if (this.showShortAddress()) {
     //           const short = sel.secondary ? `${sel.secondary.slice(0, 7)}...${sel.secondary.slice(-7)}` : '';
     //           return short ? `${sel.display} (${short})` : sel.display;
     //      }

     //      // Otherwise: just show display name cleanly
     //      return sel.display;
     // });

     // OG
     // displayValue = computed(() => {
     //      if (this.searchQuery()) return this.searchQuery();

     //      const sel = this.value();
     //      if (sel) {
     //           const short = sel.secondary ? `${sel.secondary.slice(0, 7)}...${sel.secondary.slice(-7)}` : '';
     //           return short ? `${sel.display} (${short})` : sel.display;
     //      }
     //      return '';
     // });

     // Filtering
     filteredItems = computed(() => {
          const q = this.searchQuery().toLowerCase().trim();
          if (!q) return this.items();

          return this.items().filter(it => {
               return it.display.toLowerCase().includes(q) || (it.secondary ?? '').toLowerCase().includes(q);
          });
     });

     // Portal
     ngAfterViewInit() {
          this.portal = new TemplatePortal(this.dropdownTpl, this.vcr);
     }

     // Cleanup
     ngOnDestroy() {
          if (SelectSearchDropdownComponent.openInstance === this) {
               SelectSearchDropdownComponent.openInstance = null;
          }
          this.close();
     }

     // Public API: open, close, toggle
     open() {
          // Ensure only 1 dropdown open system-wide
          SelectSearchDropdownComponent.closeAnyOther(this);

          if (this.overlayRef?.hasAttached()) return;

          if (this.overlayRef) {
               this.overlayRef.dispose();
          }

          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(this.inputEl)
               .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
               ])
               .withPush(false);

          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.reposition(),
               width: this.inputEl.nativeElement.getBoundingClientRect().width,
          });

          this.overlayRef.attach(this.portal);

          this.overlayRef.backdropClick().subscribe(() => this.close());

          this.scrollToSelected();
     }

     toggle() {
          if (this.overlayRef?.hasAttached()) {
               this.close();
          } else {
               this.open();
          }
     }

     close() {
          this.overlayRef?.dispose();
          this.overlayRef = null;
          this.highlightedIndex.set(-1);

          if (SelectSearchDropdownComponent.openInstance === this) {
               SelectSearchDropdownComponent.openInstance = null;
          }
     }

     // Input Handling
     onInput(e: Event) {
          const value = (e.target as HTMLInputElement).value;
          this.searchQuery.set(value);
          this.open(); // force dropdown open on typing
     }

     // Selection
     onSelect(item: SelectItem) {
          if (item.isCurrentAccount) return; // block if needed

          this.valueChange.emit(item);
          this.selected.emit(item);

          this.searchQuery.set('');
          this.close();
     }

     // Keyboard Navigation
     onKeydown(e: KeyboardEvent) {
          const items = this.filteredItems();
          if (!items.length) return;
          if (!this.overlayRef?.hasAttached()) return;

          let index = this.highlightedIndex();

          switch (e.key) {
               case 'ArrowDown':
                    e.preventDefault();
                    index = index < items.length - 1 ? index + 1 : 0;
                    break;
               case 'ArrowUp':
                    e.preventDefault();
                    index = index <= 0 ? items.length - 1 : index - 1;
                    break;
               case 'Enter':
                    if (index >= 0) {
                         e.preventDefault();
                         const item = items[index];
                         if (!item.isCurrentAccount) this.onSelect(item);
                    }
                    return;
               case 'Escape':
                    this.close();
                    return;
               default:
                    return;
          }

          this.highlightedIndex.set(index);

          // Smooth scroll to highlighted
          requestAnimationFrame(() => {
               const el = this.overlayRef?.overlayElement.querySelector('.combobox-item.highlighted') as HTMLElement;
               el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          });
     }

     // Scroll to initially selected item
     private scrollToSelected() {
          const sel = this.value();
          if (!sel) return;

          const index = this.filteredItems().findIndex(i => i.id === sel.id);
          if (index === -1) return;

          this.highlightedIndex.set(index);

          setTimeout(() => {
               const el = this.overlayRef?.overlayElement.querySelector('.combobox-item.highlighted') as HTMLElement;
               el?.scrollIntoView({ block: 'nearest' });
          });
     }

     // outside click handler
     @HostListener('document:mousedown', ['$event'])
     handleOutsideClick(event: MouseEvent) {
          if (!this.overlayRef?.hasAttached()) return;

          const input = this.inputEl.nativeElement;
          const overlayEl = this.overlayRef.overlayElement;

          if (input.contains(event.target as Node)) return;
          if (overlayEl.contains(event.target as Node)) return;

          this.close();
     }
}
