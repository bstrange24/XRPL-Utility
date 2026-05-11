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
import * as bip39 from 'bip39';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';

@Component({
     selector: 'app-wallet-derive-mnemonic',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, LucideAngularModule, OverlayModule, NgIcon],
     templateUrl: './wallet-derive-mnemonic.component.html',
     styleUrl: './wallet-derive-mnemonic.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletDeriveMnemonicComponent {
     @ViewChildren('mnemonicInput')
     mnemonicInputs!: QueryList<ElementRef<HTMLInputElement>>;

     public readonly walletConfiguratorComponent = inject(WalletConfiguratorComponent);
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsUtilService = inject(WalletsUtilService);
     public readonly walletsViewModelService = inject(WalletsViewModelService);

     readonly maxWords = 24;
     selectedWordCount = signal<number>(24);

     ngOnInit(): void {
          this.syncMnemonicFromStore();
     }

     // Listen to tab changes and reset state
     ngDoCheck(): void {
          // When returning to this tab, sync from store again
          if (this.walletsViewModelService.activeTab() === 'deriveMnemonic') {
               this.syncMnemonicFromStore();
          }
     }

     mnemonicWords = signal<string[]>(Array(24).fill(''));

     private syncMnemonicFromStore(): void {
          const storeValue = this.walletsStoreService.mnemonic();
          const parsed = this.parseMnemonic(storeValue);

          const filled = Array.from({ length: this.maxWords }, (_, i) => parsed[i] ?? '');
          this.mnemonicWords.set(filled);
     }

     onWordCountChange(value: number): void {
          this.selectedWordCount.set(Number(value));
          this.onSelectedWordCountChange();
     }

     onSelectedWordCountChange(): void {
          // Clear current mnemonic when word count changes
          this.clearMnemonic();

          // Focus on first input after reset
          setTimeout(() => {
               const inputs = this.mnemonicInputs.toArray();
               if (inputs.length > 0) {
                    inputs[0].nativeElement.focus();
               }
          }, 100);
     }

     onMnemonicWordInput(index: number, event: Event): void {
          const input = event.target as HTMLInputElement;
          const rawValue = input.value;
          let value = rawValue.toLowerCase().replace(/[^a-z]/g, '');

          this.mnemonicWords.update(words => {
               const updated = [...words];
               updated[index] = value;
               return updated;
          });

          this.updateMnemonic(this.mnemonicWords());

          const hadSpace = rawValue.includes(' ');

          // Auto advance on space
          if (hadSpace) {
               this.focusNext(index);
          }
     }

     onMnemonicWordPaste(index: number, event: ClipboardEvent): void {
          event.preventDefault();

          const pastedText = event.clipboardData?.getData('text') ?? '';

          if (!pastedText.trim()) {
               return;
          }

          // Split on spaces, commas, tabs, newlines
          const parsedWords = pastedText
               .trim()
               .toLowerCase()
               .split(/[\s,]+/)
               .map(word => word.replace(/[^a-z]/g, ''))
               .filter(Boolean);

          if (parsedWords.length === 0) {
               return;
          }

          this.mnemonicWords.update(words => {
               const updated = [...words];

               for (let i = 0; i < parsedWords.length; i++) {
                    const targetIndex = index + i;

                    if (targetIndex >= this.selectedWordCount()) {
                         break;
                    }

                    updated[targetIndex] = parsedWords[i];
               }

               return updated;
          });

          this.updateMnemonic(this.mnemonicWords());

          // Focus next empty field
          const nextIndex = Math.min(index + parsedWords.length, this.selectedWordCount() - 1);

          setTimeout(() => {
               const inputs = this.mnemonicInputs.toArray();

               if (inputs[nextIndex]) {
                    inputs[nextIndex].nativeElement.focus();
               }
          });
     }

     onMnemonicKeydown(index: number, event: KeyboardEvent): void {
          const input = event.target as HTMLInputElement;

          // Space or Enter advances
          if (event.key === ' ' || event.key === 'Enter') {
               event.preventDefault();

               // Get the current value
               const currentValue = input.value.toLowerCase().replace(/[^a-z]/g, '');

               // Auto-complete if it's a partial valid word (find first match)
               if (currentValue.length >= 2) {
                    const matchingWords = bip39.wordlists['english'].filter(word => word.startsWith(currentValue));
                    if (matchingWords.length === 1) {
                         // Auto-complete to the full word
                         this.mnemonicWords.update(words => {
                              const updated = [...words];
                              updated[index] = matchingWords[0];
                              return updated;
                         });
                         this.updateMnemonic(this.mnemonicWords());
                    }
               }

               if (index < this.selectedWordCount() - 1) {
                    this.focusNext(index);
               }
          }

          // Backspace navigation
          if (event.key === 'Backspace' && input.value.length === 0 && index > 0) {
               this.focusPrevious(index);
          }
     }

     onMnemonicPaste(value: string): void {
          const parsed = this.parseMnemonic(value);

          // Only take up to selectedWordCount words
          const truncated = parsed.slice(0, this.selectedWordCount());
          const parts = Array.from({ length: this.maxWords }, (_, i) => truncated[i] ?? '');

          this.mnemonicWords.set(parts);
          this.updateMnemonic(parts);
     }

     clearMnemonic(): void {
          this.walletsStoreService.setField('mnemonic', '');
          this.walletsStoreService.setField('mnemonicValid', false);
          this.mnemonicWords.set(Array(24).fill(''));
     }

     private updateMnemonic(parts: string[]): void {
          // Only include words up to selectedWordCount
          const relevantWords = parts.slice(0, this.selectedWordCount()).filter(Boolean);
          const normalized = relevantWords.join(' ').trim();

          this.walletsStoreService.setField('mnemonic', normalized);
          const isValid = this.validateMnemonic(normalized);
          this.walletsStoreService.setField('mnemonicValid', isValid);
     }

     private parseMnemonic(input: string): string[] {
          if (!input) return [];
          return input.trim().toLowerCase().split(/\s+/).filter(Boolean);
     }

     private validateMnemonic(mnemonic: string): boolean {
          if (!mnemonic || mnemonic.trim().length === 0) {
               return false;
          }

          const words = this.parseMnemonic(mnemonic);
          const wordCount = words.length;

          // Check exact word count matches selected
          if (wordCount !== this.selectedWordCount()) {
               return false;
          }

          // Check word count is valid
          if (wordCount < 12 || wordCount > 24 || wordCount % 3 !== 0) {
               return false;
          }

          const allWordsValid = words.every(word => bip39.wordlists['english'].includes(word));
          if (!allWordsValid) {
               return false;
          }

          try {
               return bip39.validateMnemonic(mnemonic);
          } catch (error) {
               console.error('Mnemonic validation error:', error);
               return false;
          }
     }

     private focusNext(index: number): void {
          const inputs = this.mnemonicInputs.toArray();
          if (index < inputs.length - 1 && index < this.selectedWordCount() - 1) {
               inputs[index + 1].nativeElement.focus();
          }
     }

     private focusPrevious(index: number): void {
          const inputs = this.mnemonicInputs.toArray();
          if (index > 0) {
               inputs[index - 1].nativeElement.focus();
          }
     }

     isValidMnemonicWord(word: string): boolean {
          if (!word) return false;
          return bip39.wordlists['english'].includes(word);
     }

     enteredWordCount = computed(() => {
          return this.parseMnemonic(this.walletsStoreService.mnemonic()).length;
     });

     isMnemonicValid = computed(() => {
          const mnemonic = this.walletsStoreService.mnemonic();
          if (!mnemonic?.trim()) return false;
          return this.walletsStoreService.mnemonicValid();
     });

     isMnemonicInvalid = computed(() => {
          const mnemonic = this.walletsStoreService.mnemonic();
          if (!mnemonic?.trim()) return false;
          return !this.walletsStoreService.mnemonicValid();
     });

     hasValidationErrors = computed(() => {
          return this.isMnemonicInvalid();
     });

     validationErrorMessage = computed(() => {
          const count = this.enteredWordCount();
          const mnemonic = this.walletsStoreService.mnemonic();

          if (!mnemonic?.trim()) {
               return '';
          }

          if (count !== this.selectedWordCount()) {
               return `Mnemonic must contain exactly ${this.selectedWordCount()} words. Current count: ${count}`;
          }

          const words = this.parseMnemonic(mnemonic);
          const invalidIndex = words.findIndex(word => !bip39.wordlists['english'].includes(word));

          if (invalidIndex !== -1) {
               return `Word ${invalidIndex + 1} "${words[invalidIndex]}" is not a valid BIP39 word.`;
          }

          try {
               if (!bip39.validateMnemonic(mnemonic)) {
                    return 'Invalid mnemonic phrase. The checksum is incorrect. Please verify the word order.';
               }
          } catch (error) {
               return 'Invalid mnemonic phrase. Please verify all words are correct BIP39 words.';
          }

          return '';
     });

     async deriveWalletFromMnemonic(): Promise<void> {
          await this.walletConfiguratorComponent.deriveWalletFromMnemonic();
     }
}
