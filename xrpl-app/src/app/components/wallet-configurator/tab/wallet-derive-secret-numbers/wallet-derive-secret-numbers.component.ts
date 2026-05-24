import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, QueryList, signal, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../../../services/wallets/wallets-util/wallets-util.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { WalletConfiguratorComponent } from '../../wallet-configurator.component';
import { NgIcon } from '@ng-icons/core';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { ButtonTooltipComponent } from '../../../shared/button-tooltip/button-tooltip.component';

@Component({
     selector: 'app-wallet-derive-secret-numbers',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, LucideAngularModule, OverlayModule, NgIcon, ButtonTooltipComponent],
     templateUrl: './wallet-derive-secret-numbers.component.html',
     styleUrl: './wallet-derive-secret-numbers.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletDeriveSecretNumbersComponent {
     @ViewChildren('secretInput')
     secretInputs!: QueryList<ElementRef<HTMLInputElement>>;

     public readonly walletConfiguratorComponent = inject(WalletConfiguratorComponent);
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsUtilService = inject(WalletsUtilService);
     public readonly walletsViewModelService = inject(WalletsViewModelService);

     readonly emptyParts = Array(8).fill('');

     ngOnInit(): void {
          this.syncSecretNumbersFromStore();
     }

     ngDoCheck(): void {
          // When returning to this tab, sync from store again
          if (this.walletsViewModelService.activeTab() === 'deriveSecretNumbers') {
               this.syncSecretNumbersFromStore();
          }
     }

     secretNumberParts = signal<string[]>(Array(8).fill(''));

     private syncSecretNumbersFromStore(): void {
          const parsed = this.parseSecretNumbers(this.walletsStoreService.secretNumbers());

          const filled = Array.from({ length: 8 }, (_, i) => parsed[i] ?? '');

          this.secretNumberParts.set(filled);
     }

     onSecretPartInput(index: number, event: Event): void {
          const input = event.target as HTMLInputElement;

          // Numbers only
          let value = input.value.replace(/\D/g, '');

          // Max 6 digits
          value = value.slice(0, 6);

          this.secretNumberParts.update(parts => {
               const updated = [...parts];
               updated[index] = value;
               return updated;
          });

          this.updateSecretNumbers(this.secretNumberParts());

          // Auto advance
          if (value.length === 6) {
               this.focusNext(index);
          }
     }

     onSecretPartKeydown(index: number, event: KeyboardEvent): void {
          const input = event.target as HTMLInputElement;

          // Backspace navigation
          if (event.key === 'Backspace' && input.value.length === 0) {
               this.focusPrevious(index);
          }
     }

     onSecretNumbersPaste(value: string): void {
          const parsed = this.parseSecretNumbers(value);

          const parts = Array.from({ length: 8 }, (_, i) => parsed[i] ?? '');

          // Update local UI state
          this.secretNumberParts.set(parts);

          // Update store + validation
          this.updateSecretNumbers(parts);
     }

     onSecretPartPaste(index: number, event: ClipboardEvent): void {
          event.preventDefault();

          const pastedText = event.clipboardData?.getData('text') ?? '';

          if (!pastedText.trim()) {
               return;
          }

          // Support:
          // spaces
          // commas
          // tabs
          // newlines
          const parsedParts = pastedText
               .trim()
               .split(/[,\s]+/)
               .map(part => part.replace(/\D/g, '').slice(0, 6))
               .filter(Boolean);

          if (parsedParts.length === 0) {
               return;
          }

          this.secretNumberParts.update(parts => {
               const updated = [...parts];

               for (let i = 0; i < parsedParts.length; i++) {
                    const targetIndex = index + i;

                    if (targetIndex >= 8) {
                         break;
                    }

                    updated[targetIndex] = parsedParts[i];
               }

               return updated;
          });

          this.updateSecretNumbers(this.secretNumberParts());

          // Focus next logical field
          const nextIndex = Math.min(index + parsedParts.length, 7);

          setTimeout(() => {
               const inputs = this.secretInputs.toArray();

               if (inputs[nextIndex]) {
                    inputs[nextIndex].nativeElement.focus();
               }
          });
     }

     clearSecretNumbers(): void {
          // Clear the store
          this.walletsStoreService.setField('secretNumbers', '');
          this.walletsStoreService.setField('secretNumberValid', false);

          // Clear the local UI state
          this.secretNumberParts.set(Array(8).fill(''));
     }

     private updateSecretNumbers(parts: string[]): void {
          const normalized = parts.filter(Boolean).join(' ');

          this.walletsStoreService.setField('secretNumbers', normalized);

          const isValid = this.validateSecretNumbers(normalized);

          this.walletsStoreService.setField('secretNumberValid', isValid);
     }

     private focusNext(index: number): void {
          const inputs = this.secretInputs.toArray();

          if (index < inputs.length - 1) {
               inputs[index + 1].nativeElement.focus();
          }
     }

     private focusPrevious(index: number): void {
          const inputs = this.secretInputs.toArray();

          if (index > 0) {
               inputs[index - 1].nativeElement.focus();
          }
     }

     private parseSecretNumbers(input: string): string[] {
          if (!input) return [];

          return input
               .split(/[,\s]+/)
               .map(v => v.trim())
               .filter(Boolean);
     }

     private validateSecretNumbers(input: string): boolean {
          if (!input) return false;

          const parts = this.parseSecretNumbers(input);

          if (parts.length !== 8) {
               return false;
          }

          return parts.every(part => /^\d{6}$/.test(part));
     }

     isValidSecretPart(part: string): boolean {
          return /^\d{6}$/.test(part);
     }

     secretNumberCount = computed(() => {
          return this.parseSecretNumbers(this.walletsStoreService.secretNumbers()).length;
     });

     isSecretNumbersValid = computed(() => {
          return this.walletsStoreService.secretNumberValid();
     });

     isSecretNumbersInvalid = computed(() => {
          const value = this.walletsStoreService.secretNumbers();

          if (!value?.trim()) {
               return false;
          }

          return !this.walletsStoreService.secretNumberValid();
     });

     hasValidationErrors = computed(() => {
          return this.isSecretNumbersInvalid();
     });

     validationErrorMessage = computed(() => {
          const parts = this.parseSecretNumbers(this.walletsStoreService.secretNumbers());

          if (parts.length !== 8) {
               return `Secret numbers must contain exactly 8 values. Current count: ${parts.length}`;
          }

          const invalidIndex = parts.findIndex(part => !/^\d{6}$/.test(part));

          if (invalidIndex !== -1) {
               return `Secret number ${invalidIndex + 1} must contain exactly 6 digits.`;
          }

          return '';
     });
}
