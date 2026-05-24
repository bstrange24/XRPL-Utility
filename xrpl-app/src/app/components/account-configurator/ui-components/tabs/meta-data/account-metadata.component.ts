import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as xrpl from 'xrpl';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { NgIcon } from '@ng-icons/core';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { TransactionOptionsComponent } from '../../../../shared/transaction-options/transaction-options.component';
import { UtilsService } from '../../../../../services/utils/util-service/utils.service';
import { FocusBorderDirective } from '../../../../../services/shared/focus-border/focus-border.directive';
import { AppConstants } from '../../../../../core/app.constants';
import { FieldHelperComponent } from '../../../../shared/field-helper/field-helper.component';
import { ButtonTooltipComponent } from '../../../../shared/button-tooltip/button-tooltip.component';

@Component({
     selector: 'app-account-metadata',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, LucideAngularModule, NgIcon, TransactionOptionsComponent, FieldHelperComponent, ButtonTooltipComponent],
     templateUrl: './account-metadata.component.html',
     styleUrl: './account-metadata.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMetadataComponent {
     public readonly accountConfiguratorViewModelService = inject(AccountConfiguratorViewModelService);
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly utilsService = inject(UtilsService);
     protected accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     protected accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     protected txUiService = inject(TransactionUiService);

     // === Helper Constants ===
     readonly nftMinterHelperItems = AppConstants.NFT_MINTER_HELPER_ITEMS;
     readonly transferSettingsHelperItems = AppConstants.TRANSFER_SETTINGS_HELPER_ITEMS;
     readonly domainHelperItems = AppConstants.DOMAIN_HELPER_ITEMS;
     readonly messageKeyHelperItems = AppConstants.MESSAGE_KEY_HELPER_ITEMS;

     readonly performAction = output<'Y' | 'N' | ''>();
     canSubmit = input<boolean>();
     nftMinterFocused = signal(false);
     transferRateFocused = signal(false);
     tickSizeFocused = signal(false);
     domainFocused = signal(false);

     // UI State
     showNftMinterHelper = signal(false);
     showTransferSettingsHelper = signal(false);
     showDomainHelper = signal(false);
     showMessageKeyHelper = signal(false);

     // Computed signal: the final hex that will be sent
     readonly domainHex = computed(() => {
          const input = this.accountConfiguratorStoreService.domain()?.trim() ?? '';
          if (!input) return '';

          // If already hex → keep it (and uppercase for consistency)
          if (/^[0-9A-Fa-f]+$/.test(input)) {
               return input.toUpperCase();
          }

          // Otherwise convert string to hex
          return xrpl.convertStringToHex(input);
     });

     // Computed: length in bytes (hex chars / 2)
     readonly domainHexLengthBytes = computed(() => {
          const hex = this.domainHex();
          return hex ? Math.ceil(hex.length / 2) : 0;
     });

     // Check if domain is too long
     readonly isDomainTooLong = computed(() => this.domainHexLengthBytes() > 256);

     // Check if NFT minter address is valid
     isNftMinterValid = computed(() => {
          const address = this.accountConfiguratorStoreService.nfTokenMinterAddress();
          if (!address) return true; // Empty is valid (means no minter)
          return xrpl.isValidAddress(address);
     });

     isNftMinterInvalid = computed(() => {
          const address = this.accountConfiguratorStoreService.nfTokenMinterAddress();
          return !!address && !xrpl.isValidAddress(address);
     });

     // Check if Transfer Rate is valid
     isTransferRateValid = computed(() => {
          const rate = this.accountConfiguratorStoreService.transferRate();
          if (!rate) return true; // Empty is valid (0% fee)
          const numRate = Number.parseFloat(rate);
          return !isNaN(numRate) && numRate >= 0 && numRate <= 100;
     });

     isTransferRateInvalid = computed(() => {
          const rate = this.accountConfiguratorStoreService.transferRate();
          if (!rate) return false;
          const numRate = Number.parseFloat(rate);
          return isNaN(numRate) || numRate < 0 || numRate > 100;
     });

     // Check if Tick Size is valid
     isTickSizeValid = computed(() => {
          const tickSize = this.accountConfiguratorStoreService.tickSize();
          if (!tickSize) return true; // empty = valid (not set)
          const num = Number(tickSize); // better than parseInt
          return Number.isInteger(num) && num >= 3 && num <= 15;
     });

     isTickSizeInvalid = computed(() => {
          const tickSize = this.accountConfiguratorStoreService.tickSize();
          if (!tickSize) return false;
          const num = Number(tickSize);
          return !Number.isInteger(num) || num < 3 || num > 15;
     });

     // Check if any field has changed from its original value
     hasChanges = computed(() => {
          // Check if any metadata field is set
          const nftMinter = this.accountConfiguratorStoreService.nfTokenMinterAddress();
          const transferRate = this.accountConfiguratorStoreService.transferRate();
          const tickSize = this.accountConfiguratorStoreService.tickSize();
          const domain = this.accountConfiguratorStoreService.domain();
          const messageKey = this.accountConfiguratorStoreService.isMessageKey();

          return !!(nftMinter || transferRate || tickSize || domain || messageKey);
     });

     // Combined validation for Modify Metadata button
     canModifyMetadata = computed(() => {
          // Must have at least one field to modify
          if (!this.hasChanges()) return false;

          // NFT Minter validation
          if (this.isNftMinterInvalid()) return false;

          // Transfer Rate validation
          if (this.isTransferRateInvalid()) return false;

          // Tick Size validation
          if (this.isTickSizeInvalid()) return false;

          // Domain validation
          if (this.isDomainTooLong()) return false;

          return this.canSubmit() && this.connectionGuard.isConnectionReady();
     });

     // Check if there are any validation errors
     hasValidationErrors = computed(() => {
          if (this.isNftMinterInvalid()) return true;
          if (this.isTransferRateInvalid()) return true;
          if (this.isTickSizeInvalid()) return true;
          if (this.isDomainTooLong()) return true;
          return false;
     });

     // Get validation error message
     validationErrorMessage = computed(() => {
          const messages: string[] = [];
          if (this.isNftMinterInvalid()) {
               messages.push('NFT Minter address is invalid. Please enter a valid XRP address.');
          }
          if (this.isTransferRateInvalid()) {
               messages.push('Transfer Rate must be a number between 0 and 100.');
          }
          if (this.isTickSizeInvalid()) {
               messages.push('Tick Size must be a number between 3 and 15.');
          }
          if (this.isDomainTooLong()) {
               messages.push(`Domain exceeds 256 byte limit (current: ${this.domainHexLengthBytes()}/256 bytes). Please shorten the domain.`);
          }
          return messages;
     });

     // Helper method for template
     domainToHex(value: string): string {
          if (!value) return '';
          if (/^[0-9A-Fa-f]+$/.test(value)) return value.toUpperCase();
          return xrpl.convertStringToHex(value);
     }

     clearFields() {
          this.accountConfiguratorStoreService.setField('transferRate', '');
          this.accountConfiguratorStoreService.setField('tickSize', '');
          this.accountConfiguratorStoreService.setField('domain', '');
          this.accountConfiguratorStoreService.setField('isMessageKey', false);
          return;
     }

     clearMinterAddresField() {
          this.accountConfiguratorStoreService.setField('nfTokenMinterAddress', '');
          return;
     }

     // Toggle Methods
     toggleNftMinterHelper() {
          this.showNftMinterHelper.set(!this.showNftMinterHelper());
     }

     toggleTransferSettingsHelper() {
          this.showTransferSettingsHelper.set(!this.showTransferSettingsHelper());
     }

     toggleDomainHelper() {
          this.showDomainHelper.set(!this.showDomainHelper());
     }

     toggleMessageKeyHelper() {
          this.showMessageKeyHelper.set(!this.showMessageKeyHelper());
     }
}
