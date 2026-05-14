import { computed, inject, Injectable } from '@angular/core';
import { XrplTxOptionsStore } from '../../../../components/shared/stores/xrpl-tx-options.store';

@Injectable({
     providedIn: 'root',
})
export class TagValidatorService {
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     // Maximum allowed value for tags (32-bit unsigned integer max)
     private readonly MAX_TAG_VALUE = 4294967295;

     // Destination Tag Methods
     onDestinationTagKeyPress(event: KeyboardEvent): void {
          this.onTagKeyPress(event);
     }

     onDestinationTagInput(event: Event): void {
          const input = event.target as HTMLInputElement;
          let value = this.sanitizeTagInput(input.value);

          // Validate against max value
          if (value && !isNaN(parseInt(value, 10))) {
               const numValue = parseInt(value, 10);
               if (numValue > this.MAX_TAG_VALUE) {
                    value = this.MAX_TAG_VALUE.toString();
               }
          }

          this.updateTagInput(input, value);
          this.xrplTxOptionsStore.setField('destinationTag', value || null);
     }

     onDestinationTagBlur(event: Event): void {
          const input = event.target as HTMLInputElement;
          let value = input.value.trim();

          if (value === '') {
               this.xrplTxOptionsStore.setField('destinationTag', null);
               return;
          }

          // Parse and validate on blur
          const numValue = parseInt(value, 10);
          if (isNaN(numValue) || numValue <= 0) {
               input.value = '';
               this.xrplTxOptionsStore.setField('destinationTag', null);
          } else if (numValue > this.MAX_TAG_VALUE) {
               input.value = this.MAX_TAG_VALUE.toString();
               this.xrplTxOptionsStore.setField('destinationTag', this.MAX_TAG_VALUE.toString());
          } else {
               // Remove leading zeros
               input.value = numValue.toString();
               this.xrplTxOptionsStore.setField('destinationTag', numValue.toString());
          }
     }

     // Source Tag Methods
     onSourceTagKeyPress(event: KeyboardEvent): void {
          this.onTagKeyPress(event);
     }

     onSourceTagInput(event: Event): void {
          const input = event.target as HTMLInputElement;
          let value = this.sanitizeTagInput(input.value);

          // Validate against max value
          if (value && !isNaN(parseInt(value, 10))) {
               const numValue = parseInt(value, 10);
               if (numValue > this.MAX_TAG_VALUE) {
                    value = this.MAX_TAG_VALUE.toString();
               }
          }

          this.updateTagInput(input, value);
          this.xrplTxOptionsStore.setField('sourceTag', value || null);
     }

     onSourceTagBlur(event: Event): void {
          const input = event.target as HTMLInputElement;
          let value = input.value.trim();

          if (value === '') {
               this.xrplTxOptionsStore.setField('sourceTag', null);
               return;
          }

          // Parse and validate on blur
          const numValue = parseInt(value, 10);
          if (isNaN(numValue) || numValue <= 0) {
               input.value = '';
               this.xrplTxOptionsStore.setField('sourceTag', null);
          } else if (numValue > this.MAX_TAG_VALUE) {
               input.value = this.MAX_TAG_VALUE.toString();
               this.xrplTxOptionsStore.setField('sourceTag', this.MAX_TAG_VALUE.toString());
          } else {
               // Remove leading zeros
               input.value = numValue.toString();
               this.xrplTxOptionsStore.setField('sourceTag', numValue.toString());
          }
     }

     // Shared helper methods for tag inputs
     private onTagKeyPress(event: KeyboardEvent): void {
          const key = event.key;
          const input = event.target as HTMLInputElement;
          const currentValue = input.value;
          const selectionStart = input.selectionStart || 0;
          const selectionEnd = input.selectionEnd || 0;

          // Allow: backspace, delete, tab, escape, enter
          if (key === 'Backspace' || key === 'Delete' || key === 'Tab' || key === 'Escape' || key === 'Enter') {
               return;
          }

          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          if ((event.ctrlKey === true || event.metaKey === true) && (key === 'a' || key === 'c' || key === 'v' || key === 'x')) {
               return;
          }

          // Allow: home, end, left, right, down, up
          if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown' || key === 'Home' || key === 'End') {
               return;
          }

          // Only allow digits (0-9)
          if (!/^\d$/.test(key)) {
               event.preventDefault();
               return;
          }

          // Check against max value while typing
          const newValue = currentValue.slice(0, selectionStart) + key + currentValue.slice(selectionEnd);
          if (newValue.length > this.MAX_TAG_VALUE.toString().length) {
               event.preventDefault();
               return;
          }

          // If value would exceed max, prevent it
          if (newValue && !isNaN(parseInt(newValue, 10))) {
               const numValue = parseInt(newValue, 10);
               if (numValue > this.MAX_TAG_VALUE) {
                    event.preventDefault();
                    return;
               }
          }
     }

     private sanitizeTagInput(value: string): string {
          // Remove any non-digit characters
          let sanitized = value.replace(/[^\d]/g, '');

          // Remove leading zeros (but keep single zero if that's the only character)
          if (sanitized.length > 1 && sanitized.startsWith('0')) {
               sanitized = sanitized.replace(/^0+/, '');
               if (sanitized === '') sanitized = '0';
          }

          // Handle empty or invalid
          if (sanitized === '' || sanitized === '0') {
               return '';
          }

          return sanitized;
     }

     private updateTagInput(input: HTMLInputElement, value: string): void {
          const cursorPosition = input.selectionStart;

          if (value !== input.value) {
               input.value = value;

               // Restore cursor position
               if (cursorPosition && cursorPosition <= value.length) {
                    input.setSelectionRange(cursorPosition, cursorPosition);
               } else if (cursorPosition && cursorPosition > value.length) {
                    input.setSelectionRange(value.length, value.length);
               }
          }
     }

     // Update your computed signals to handle the max value validation
     isDestinationTagValid = computed(() => {
          const tag = this.xrplTxOptionsStore.destinationTag();
          if (tag === null || tag === '' || tag === undefined) return true;
          const numTag = typeof tag === 'string' ? parseInt(tag, 10) : Number(tag);
          return Number.isFinite(numTag) && numTag > 0 && numTag <= this.MAX_TAG_VALUE;
     });

     isDestinationTagInvalid = computed(() => {
          const tag = this.xrplTxOptionsStore.destinationTag();
          if (tag === null || tag === '' || tag === undefined) return false;
          const numTag = typeof tag === 'string' ? parseInt(tag, 10) : Number(tag);
          return isNaN(numTag) || numTag <= 0 || numTag > this.MAX_TAG_VALUE;
     });

     isSourceTagValid = computed(() => {
          const tag = this.xrplTxOptionsStore.sourceTag();
          if (tag === null || tag === '' || tag === undefined) return true;
          const numTag = typeof tag === 'string' ? parseInt(tag, 10) : Number(tag);
          return Number.isFinite(numTag) && numTag > 0 && numTag <= this.MAX_TAG_VALUE;
     });

     isSourceTagInvalid = computed(() => {
          const tag = this.xrplTxOptionsStore.sourceTag();
          if (tag === null || tag === '' || tag === undefined) return false;
          const numTag = typeof tag === 'string' ? parseInt(tag, 10) : Number(tag);
          return isNaN(numTag) || numTag <= 0 || numTag > this.MAX_TAG_VALUE;
     });
}
