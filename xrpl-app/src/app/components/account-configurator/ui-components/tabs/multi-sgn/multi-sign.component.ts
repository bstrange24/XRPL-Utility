import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { NgIcon } from '@ng-icons/core';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { TransactionOptionsComponent } from '../../../../shared/transaction-options/transaction-options.component';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../../../../services/utils/util-service/utils.service';
import { AppConstants } from '../../../../../core/app.constants';
import { FieldHelperComponent } from '../../../../shared/field-helper/field-helper.component';
import { ButtonTooltipComponent } from '../../../../shared/button-tooltip/button-tooltip.component';

@Component({
     selector: 'app-multi-sign',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, NgIcon, TransactionOptionsComponent, ButtonTooltipComponent, FieldHelperComponent],
     templateUrl: './multi-sign.component.html',
     styleUrl: './multi-sign.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiSignComponent {
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly utilsService = inject(UtilsService);
     protected accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     protected accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     protected txUiService = inject(TransactionUiService);

     // === Helper Items ===
     readonly multiSignHelperItems = AppConstants.MULTI_SIGN_HELPER_ITEMS;

     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();
     focusedAccountIndex = signal<number | null>(null);
     focusedSeedIndex = signal<number | null>(null);
     focusedWeightIndex = signal<number | null>(null);
     quorumFocused = signal(false);
     protected xrpl = xrpl;

     // UI State
     showMultiSignHelper = signal(false);

     // Clear specific account field
     clearAccount(index: number, event: MouseEvent) {
          event.stopPropagation(); // Prevent event bubbling
          this.accountConfiguratorStoreService.updateSigner(index, 'Account', '');

          // Optional: Focus back on the input after clearing
          setTimeout(() => {
               const input = document.querySelector(`input[data-account-index="${index}"]`) as HTMLInputElement;
               if (input) {
                    input.focus();
               }
          }, 0);
     }

     // Clear specific seed field
     clearSeed(index: number, event: MouseEvent) {
          event.stopPropagation(); // Prevent event bubbling
          this.accountConfiguratorStoreService.updateSigner(index, 'seed', '');

          // Optional: Focus back on the input after clearing
          setTimeout(() => {
               const input = document.querySelector(`input[data-seed-index="${index}"]`) as HTMLInputElement;
               if (input) {
                    input.focus();
               }
          }, 0);
     }

     // Optional: Add keyboard support (Escape key to clear)
     //   onKeydown(event: KeyboardEvent, field: 'account' | 'seed', index: number) {
     //     if (event.key === 'Escape') {
     //       event.preventDefault();
     //       if (field === 'account') {
     //         this.clearAccount(index, event);
     //       } else {
     //         this.clearSeed(index, event);
     //       }
     //     }
     //   }

     isAddressValid(address: string): boolean {
          if (!address) return false;
          return xrpl.isValidAddress(address);
     }

     isAddressInvalid(address: string): boolean {
          return !!address && !xrpl.isValidAddress(address);
     }

     isSeedValid(secret: string): boolean {
          // if (!seed) return false;
          // return xrpl.isValidSecret(seed);
          if (!secret || secret.trim().length === 0) {
               return false;
          }

          const trimmedSecret = secret.trim();

          // Check if it's a mnemonic - reject it
          if (trimmedSecret.includes(' ') && /^[a-z\s]+$/i.test(trimmedSecret)) {
               console.warn('Mnemonics are not supported for regular keys. Please use a family seed (starts with "s") or secret numbers.');
               return false;
          }

          // Check if it's secret numbers (contains spaces and digits)
          if (trimmedSecret.includes(' ') && /^[\d\s]+$/.test(trimmedSecret)) {
               return xrpl.isValidSecret(trimmedSecret);
          }

          // Check if it's a family seed (starts with 's' and no spaces)
          if (!trimmedSecret.includes(' ') && trimmedSecret.startsWith('s')) {
               return xrpl.isValidSecret(trimmedSecret);
          }

          return xrpl.isValidSecret(trimmedSecret);
     }

     isSeedInvalid(seed: string): boolean {
          return !!seed && !this.isSeedValid(seed);
     }

     isMnemonic(secret: string): boolean {
          if (!secret) return false;
          const trimmed = secret.trim();
          return trimmed.includes(' ') && /^[a-z\s]+$/i.test(trimmed);
     }

     // Computed total signer weight
     totalSignerWeight = computed(() => {
          return this.accountConfiguratorStoreService.signers().reduce((total: number, signer: { SignerWeight: any }) => total + (Number(signer.SignerWeight) || 0), 0);
     });

     // Check if a signer is valid (has account and weight > 0)
     isSignerValid = computed(() => {
          const signers = this.accountConfiguratorStoreService.signers();
          if (signers.length === 0) return false;

          return signers.every((signer: { Account: string; SignerWeight: number; seed: string }) => {
               // Account must be valid
               const hasValidAccount = !!signer.Account && xrpl.isValidAddress(signer.Account);

               // Weight must be a positive number
               const hasValidWeight = Number(signer.SignerWeight) > 0;

               // Seed must be valid (for signing capability)
               const hasValidSeed = !!signer.seed && xrpl.isValidSecret(signer.seed);

               return hasValidAccount && hasValidWeight && hasValidSeed;
          });
     });

     // Check if any signer has invalid data
     hasInvalidSigners = computed(() => {
          const signers = this.accountConfiguratorStoreService.signers();
          return signers.some((signer: { Account: string; SignerWeight: number; seed: string }) => {
               // If account is provided but invalid
               if (signer.Account && !xrpl.isValidAddress(signer.Account)) return true;

               // If weight is invalid (not a positive number)
               if (signer.SignerWeight && Number(signer.SignerWeight) <= 0) return true;

               // If seed is provided but invalid
               if (signer.seed && !xrpl.isValidSecret(signer.seed)) return true;

               // If any required field is missing (account, weight, or seed)
               if (!signer.Account || !signer.SignerWeight || !signer.seed) return true;

               return false;
          });
     });

     // Check if quorum is valid
     isQuorumValid = computed(() => {
          const quorum = this.accountConfiguratorStoreService.signerQuorum();
          const totalWeight = this.totalSignerWeight();

          // Quorum must be at least 1
          if (quorum < 1) return false;

          // Quorum cannot exceed total weight
          if (quorum > totalWeight) return false;

          return true;
     });

     // Check if there are any signers
     hasSigners = computed(() => {
          return this.accountConfiguratorStoreService.signers().length > 0;
     });

     // Combined validation for Set Multi-Sign button
     canSetMultiSign = computed(() => {
          return this.canSubmit() && this.connectionGuard.isConnectionReady() && this.hasSigners() && !this.hasInvalidSigners() && this.isQuorumValid();
     });

     // Combined validation for Remove Multi-Sign button
     canRemoveMultiSign = computed(() => {
          return this.canSubmit() && this.connectionGuard.isConnectionReady();
     });

     hasUserInput = computed(() => {
          const signers = this.accountConfiguratorStoreService.signers();

          return signers.some((signer: { Account: string; seed: string; SignerWeight: number }) => {
               return !!signer.Account?.trim() || !!signer.seed?.trim();
          });
     });

     // Check if there are any validation errors to show
     hasValidationErrors = computed(() => {
          // Don't show validation on initial empty state
          if (!this.hasUserInput()) return false;
          if (!this.hasSigners()) return true;
          if (this.hasInvalidSigners()) return true;
          if (!this.isQuorumValid()) return true;
          return false;
     });

     // Get validation error message
     validationErrorMessage = computed(() => {
          if (!this.hasUserInput()) return [];
          if (!this.hasSigners()) {
               return 'Please add at least one signer.';
          }
          if (this.hasInvalidSigners()) {
               return 'Please fix invalid signer entries (valid account, positive weight, and valid seed required).';
          }
          if (!this.isQuorumValid()) {
               const quorum = this.accountConfiguratorStoreService.signerQuorum();
               const totalWeight = this.totalSignerWeight();
               if (quorum < 1) {
                    return 'Quorum must be at least 1.';
               }
               if (quorum > totalWeight) {
                    return `Quorum (${quorum}) exceeds total signer weight (${totalWeight}). Transactions cannot be authorized.`;
               }
          }
          return '';
     });

     // Toggle Method
     toggleMultiSignHelper() {
          this.showMultiSignHelper.set(!this.showMultiSignHelper());
     }

     clearFields() {
          this.accountConfiguratorStoreService.setField('signers', [{ Account: '', seed: '', SignerWeight: 1 }]);
     }
}
