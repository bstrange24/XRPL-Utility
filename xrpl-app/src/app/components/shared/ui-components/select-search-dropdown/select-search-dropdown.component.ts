import { Component, ElementRef, ViewChild, TemplateRef, ViewContainerRef, inject, input, output, signal, computed, ChangeDetectionStrategy, AfterViewInit, HostListener, OnDestroy, effect } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { dropDownAnimation } from '../../../../services/utils/animations/animations.service';
import { NgIcon } from '@ng-icons/core';

export interface SelectItem {
     id: string;
     display: string;
     secondary?: string;
     isCurrentAccount?: boolean;
     isCurrentCode?: boolean;
     isCurrentToken?: boolean;
     group?: string;
     pending?: boolean;
     showSecondaryInInput?: boolean;
     issuer?: string;
}

@Component({
     selector: 'app-select-search-dropdown',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './select-search-dropdown.component.html',
     styleUrl: './select-search-dropdown.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
     animations: [dropDownAnimation],
})
export class SelectSearchDropdownComponent implements AfterViewInit, OnDestroy {
     @ViewChild('inputEl', { static: true }) inputEl!: ElementRef<HTMLInputElement>;
     @ViewChild('dropdown') dropdownTpl!: TemplateRef<any>;
     private static openInstance: SelectSearchDropdownComponent | null = null;
     private readonly overlay = inject(Overlay);
     private readonly vcr = inject(ViewContainerRef);
     private overlayRef: OverlayRef | null = null;
     private portal!: TemplatePortal<any>;
     private isDropdownOpening = false;

     // Inputs / Outputs
     items = input.required<SelectItem[]>();
     showClearButton = input<boolean>(true);
     clearOnEscape = input<boolean>(true);
     closeWhenInvalid = input<boolean>(false);
     showInlineErrorMessage = input<boolean>(true);
     searchQueryInput = input<string>('');
     searchQueryChange = output<string>();
     value = input<SelectItem | null>(null);
     valueChange = output<SelectItem | null>();
     selected = output<SelectItem>();
     isValid = output<boolean>();
     validateXrpAddress = input<boolean>(false);
     customValidation = input<(value: string) => boolean>(() => true);
     customValidationMessage = input<string>('Invalid value');
     validateOn = input<'blur' | 'submit' | 'realtime'>('blur');
     validateNow = input<boolean>(false);
     showSecondaryInInput = input<boolean>(true);
     placeholder = input<string>('Search...');
     emptyMessage = input<string>('No items found');
     showShortAddress = input<boolean>(true);
     disabled = input<boolean>(false);
     disableCurrencySelection = input<boolean>(false);
     isDisabled = computed(() => this.disabled() || this.disableCurrencySelection());
     searchQuery = signal<string>('');
     highlightedIndex = signal(-1);
     isTouched = signal(false);
     wasSubmitted = signal(false);
     disableCurrentAccount = input<boolean>(true);

     constructor() {
          // Sync parent's [searchQueryInput] → internal writable searchQuery
          effect(() => {
               const external = this.searchQueryInput();
               this.searchQuery.set(external ?? '');
          });

          // Close dropdown ONLY when validation fails AND field loses focus
          effect(() => {
               // Only close on blur if the value is invalid and closeWhenInvalid is true
               const shouldClose = this.closeWhenInvalid() && this.isInvalidAndShouldClose() && !this.isDropdownOpening; // Prevent closing during typing
               if (shouldClose) {
                    this.close();
               }
          });

          // Emit validation status whenever it changes
          effect(() => {
               // Only emit false if there's an error AND we should show it
               const shouldShowError = this.showError();
               const isValid = !shouldShowError;
               this.isValid.emit(isValid);
          });

          // Watch for external submit trigger
          effect(() => {
               if (this.validateNow()) {
                    this.wasSubmitted.set(true);
               }
          });
     }

     // Computed: Get the current value (selected item or manual entry)
     getCurrentValue = computed(() => {
          const selected = this.value();

          // Selected item takes precedence
          if (selected?.id) {
               return selected.id;
          }

          return this.searchQuery().trim();
     });

     // Computed: XRP address validation
     isXrpAddressValid = computed(() => {
          if (!this.validateXrpAddress()) {
               return true;
          }

          const value = this.getCurrentValue();

          if (!value) {
               return true;
          }

          return xrpl.isValidAddress(value);
     });

     // Computed: Overall validation status (combines XRP validation and custom validation)
     // isValidValue = computed(() => {
     //      const value = this.getCurrentValue();
     //      if (!value) return true; // Empty is considered valid

     //      // Check XRP validation if enabled
     //      if (this.validateXrpAddress() && !this.isXrpAddressValid()) {
     //           return false;
     //      }

     //      // Check custom validation
     //      if (!this.customValidation()(value)) {
     //           return false;
     //      }

     //      return true;
     // });

     // Update isValidValue to include currency validation
     isValidValue = computed(() => {
          const value = this.getCurrentValue();
          if (!value) return true;

          // Check XRP validation if enabled
          if (this.validateXrpAddress() && !this.isXrpAddressValid()) {
               return false;
          }

          // Check currency validation if enabled
          if (this.validateCurrencyCode() && !this.isCurrencyCodeValid()) {
               return false;
          }

          // Check custom validation
          if (!this.customValidation()(value)) {
               return false;
          }

          return true;
     });

     // Computed: Whether to show the error message
     showError = computed(() => {
          // Check if validation is enabled and we have a value
          const hasValue = !!this.getCurrentValue();
          if (!hasValue) return false; // Don't show error for empty field

          // Check if the value is actually invalid
          const isActuallyInvalid = !this.isValidValue();
          if (!isActuallyInvalid) return false;

          // Determine if we should show the error based on validateOn setting
          switch (this.validateOn()) {
               case 'realtime':
                    return true;
               case 'blur':
                    return this.isTouched();
               case 'submit':
                    return this.wasSubmitted() || this.validateNow();
               default:
                    return this.isTouched() || this.wasSubmitted();
          }
     });

     // Computed: Error message to display
     validationErrorMessage = computed(() => {
          if (!this.showError()) return '';

          const value = this.getCurrentValue();
          if (!value) return '';

          // Check XRP validation first
          if (this.validateXrpAddress() && !this.isXrpAddressValid()) {
               return 'Please enter a valid XRP address';
          }

          // Check custom validation
          if (!this.customValidation()(value)) {
               return this.customValidationMessage();
          }

          return 'Invalid value';
     });

     // Computed: CSS classes for the input based on validation state
     inputClasses = computed(() => {
          const base = 'w-full bg-white border rounded-2xl px-3.5 py-3.5 text-sm ' + 'focus:outline-none focus:ring-0 focus:shadow-none transition-colors';

          // Always apply green focus border
          const focusBorder = 'focus:border-green-500';

          // Error state takes priority
          if (this.showError()) {
               return `${base} border-red-500 focus:border-red-500 bg-red-50`;
          }

          // Valid value → normal gray border when not focused, green only on focus
          if (this.isValidValue() && this.getCurrentValue()) {
               return `${base} border-gray-200 ${focusBorder}`;
          }

          // Default empty state
          return `${base} border-gray-200 ${focusBorder}`;
     });
     // inputClasses = computed(() => {
     //      const baseClasses = 'w-full bg-white border rounded-2xl px-3.5 py-3.5 text-sm focus:outline-none focus:ring-0 focus:shadow-none transition-colors';

     //      if (this.showError()) {
     //           return `${baseClasses} border-red-500 focus:border-red-500 bg-red-50`;
     //      }

     //      if (this.isValidValue() && this.getCurrentValue() && this.isTouched()) {
     //           return `${baseClasses} border-green-500 focus:border-green-500`;
     //      }

     //      return `${baseClasses} border-gray-100 focus:border-green-500`;
     // });

     // Computed
     displayValue = computed(() => {
          const q = this.searchQuery();
          if (q) return q;

          const sel = this.value();
          if (!sel) return '';

          if (this.showSecondaryInInput()) {
               const short = sel.secondary ? `${sel.secondary.slice(0, 7)}...${sel.secondary.slice(-7)}` : '';
               return short ? `${sel.display} (${short})` : sel.display;
          }

          if (this.showShortAddress()) {
               const short = sel.secondary ? `${sel.secondary.slice(0, 7)}...${sel.secondary.slice(-7)}` : '';
               return short ? `${sel.display} (${short})` : sel.display;
          }

          return sel.display;
     });

     filteredItems = computed(() => {
          const q = this.searchQuery().toLowerCase().trim();
          if (!q) return this.items();

          return this.items().filter(item => item.display.toLowerCase().includes(q) || (item.secondary ?? '').toLowerCase().includes(q));
     });

     // Lifecycle
     ngAfterViewInit() {
          this.portal = new TemplatePortal(this.dropdownTpl, this.vcr);
     }

     ngOnDestroy() {
          if (SelectSearchDropdownComponent.openInstance === this) {
               SelectSearchDropdownComponent.openInstance = null;
          }
          this.close();
     }

     isInvalidAndShouldClose = computed(() => {
          const value = this.getCurrentValue();
          if (!value) return false; // Don't close on empty

          // Check if the value is invalid
          const isInvalid = !this.isValidValue();

          // Only close if we're showing errors (field has been touched/submitted)
          const shouldShowError = this.showError();

          return isInvalid && shouldShowError;
     });

     onItemMouseDown(event: MouseEvent, item: SelectItem) {
          event.preventDefault();

          if (item.isCurrentAccount || item.isCurrentCode || item.isCurrentToken) {
               return;
          }

          this.onSelect(item);
     }

     validateCurrencyCode = input<boolean>(false);

     // Add currency validation computed
     isCurrencyCodeValid = computed(() => {
          if (!this.validateCurrencyCode()) return true;

          const value = this.getCurrentValue();
          if (!value) return true;

          // Get the display value (currency code)
          const currency = this.value()?.display || this.searchQuery();
          if (!currency) return true;

          // Validate currency code
          if (currency.length < 3 || currency.length > 40) return false;

          const validPattern = /^[A-Za-z0-9.\-_%?*@!^&~<>|{}=]+$/;
          if (!validPattern.test(currency)) return false;

          // Standard currency codes (3 uppercase letters) are valid
          if (/^[A-Z]{3}$/.test(currency)) return true;

          // Hex format (40 chars) is valid
          if (currency.length === 40 && /^[A-Fa-f0-9]{40}$/.test(currency)) return true;

          return false;
     });

     // Dropdown control
     open() {
          if (this.isDisabled()) return;

          this.isDropdownOpening = true;
          SelectSearchDropdownComponent.closeAnyOther(this);

          if (this.overlayRef?.hasAttached()) {
               this.isDropdownOpening = false;
               return;
          }

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

          setTimeout(() => {
               this.isDropdownOpening = false;
          }, 200);

          this.scrollToSelected();
     }

     toggle() {
          if (this.isDisabled()) return;

          // If dropdown is open, close it
          if (this.overlayRef?.hasAttached()) {
               this.close();
          }
          // If dropdown is closed, try to open it (will be prevented if invalid)
          else {
               this.open();
          }
     }

     toggleWithFocus() {
          if (this.isDisabled()) return;

          if (this.overlayRef?.hasAttached()) {
               this.close();
          } else {
               this.open();
               // Force focus on input so border turns green
               setTimeout(() => this.inputEl.nativeElement.focus(), 10);
          }
     }

     private static closeAnyOther(instance: SelectSearchDropdownComponent) {
          if (this.openInstance && this.openInstance !== instance) {
               this.openInstance.close();
          }
          this.openInstance = instance;
     }

     close(skipTouchMarking: boolean = false) {
          this.overlayRef?.dispose();
          this.overlayRef = null;
          this.highlightedIndex.set(-1);

          // Mark as touched when closing, but not if we're in the middle of typing
          if (!skipTouchMarking && !this.isTouched() && !this.isDropdownOpening) {
               this.isTouched.set(true);
          }

          // Always emit current state when closing
          this.searchQueryChange.emit(this.searchQuery());

          if (SelectSearchDropdownComponent.openInstance === this) {
               SelectSearchDropdownComponent.openInstance = null;
          }
     }

     // Event handlers
     onInput(e: Event) {
          const value = (e.target as HTMLInputElement).value;

          // If user starts typing, clear selected item
          if (this.value()) {
               this.valueChange.emit(null);
          }

          this.searchQuery.set(value);
          this.searchQueryChange.emit(value);

          this.open();
     }

     onSelect(item: SelectItem) {
          // Don't allow selection of disabled items
          if (item.isCurrentAccount || item.isCurrentCode || item.isCurrentToken) return;

          // If validating XRP addresses, check if the selected item is valid
          if (this.validateXrpAddress() && item.id && !xrpl.isValidAddress(item.id)) {
               // Don't select invalid addresses
               return;
          }

          this.valueChange.emit(item);
          this.selected.emit(item);

          this.searchQuery.set('');
          this.searchQueryChange.emit('');

          this.isTouched.set(true);

          this.inputEl.nativeElement.blur();

          this.close();
     }

     onBlur() {
          this.isTouched.set(true);

          // Close dropdown and validate on blur
          setTimeout(() => {
               if (this.overlayRef?.hasAttached()) {
                    this.close();
               }
          }, 150); // Small delay to allow click events on dropdown items
     }

     onKeydown(e: KeyboardEvent) {
          const items = this.filteredItems();

          // Handle Escape key to clear input
          if (e.key === 'Escape' && this.clearOnEscape()) {
               e.preventDefault();
               if (this.getCurrentValue()) {
                    this.clearInput(e);
               } else {
                    this.close();
               }
               return;
          }

          // Always handle keyboard navigation if dropdown is open
          if (this.overlayRef?.hasAttached() && items.length > 0) {
               let index = this.highlightedIndex();

               switch (e.key) {
                    case 'ArrowDown':
                         e.preventDefault();
                         index = index < items.length - 1 ? index + 1 : 0;
                         this.highlightedIndex.set(index);
                         this.scrollToHighlighted();
                         break;
                    case 'ArrowUp':
                         e.preventDefault();
                         index = index <= 0 ? items.length - 1 : index - 1;
                         this.highlightedIndex.set(index);
                         this.scrollToHighlighted();
                         break;
                    case 'Enter':
                         if (index >= 0 && index < items.length) {
                              e.preventDefault();
                              const item = items[index];
                              if (!item.isCurrentAccount && !item.isCurrentCode && !item.isCurrentToken) {
                                   this.onSelect(item);
                              }
                         }
                         break;
                    case 'Tab':
                         this.close();
                         break;
               }
          }
     }

     private scrollToHighlighted() {
          requestAnimationFrame(() => {
               const el = this.overlayRef?.overlayElement.querySelector('.combobox-item.highlighted') as HTMLElement;
               if (el) {
                    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
               }
          });
     }

     private scrollToSelected() {
          const sel = this.value();
          if (!sel) return;

          const index = this.filteredItems().findIndex(i => i.id === sel.id);
          if (index === -1) return;

          this.highlightedIndex.set(index);

          setTimeout(() => {
               const el = this.overlayRef?.overlayElement.querySelector('.combobox-item.highlighted') as HTMLElement;
               el?.scrollIntoView({ block: 'nearest' });
          }, 0);
     }

     // Public method to trigger validation (for form submission)
     triggerValidation(): boolean {
          this.wasSubmitted.set(true);
          this.isTouched.set(true);
          return this.isValidValue();
     }

     // Public method to get current value and validation state
     getValidationState(): { value: string; isValid: boolean; errorMessage: string; showError: boolean } {
          return {
               value: this.getCurrentValue(),
               isValid: this.isValidValue(),
               errorMessage: this.validationErrorMessage(),
               showError: this.showError(),
          };
     }

     // Clear method
     clearInput(event: Event) {
          event.stopPropagation();

          // Clear the search query
          this.searchQuery.set('');
          this.searchQueryChange.emit('');

          // Clear the selected value
          if (this.value()) {
               this.valueChange.emit(null);
          }

          // Focus the input after clearing
          this.inputEl.nativeElement.blur();

          // Close dropdown if open
          if (this.overlayRef?.hasAttached()) {
               this.close(true);
          }

          // Mark as touched so validation runs
          if (!this.isTouched()) {
               this.isTouched.set(true);
          }
     }
}
