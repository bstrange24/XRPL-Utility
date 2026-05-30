import { computed, inject, Injectable } from '@angular/core';
import { XrplTxOptionsStore } from '../../../../components/shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorStoreService } from '../../../account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../utils/util-service/utils.service';
import { ConnectionGuardService } from '../../connection-guard/connection-guard.service';
import { PaymentChannelStoreService } from '../../../payment-channel/payment-channel-store/payment-channel-store.service';
import { EscrowStoreService } from '../../../escrow/escrow-store/escrow-store.service';
import { ChecksStoreService } from '../../../checks/checks-store/checks-store.service';
import { AppConstants } from '../../../../core/app.constants';

@Injectable({
     providedIn: 'root',
})
export class AmountValidatorService {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly checksStoreService = inject(ChecksStoreService);

     // Simplified validation - just amount and options now
     isAmountValid = computed(() => {
          const amount = this.accountConfiguratorStoreService.amount();

          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          if (Number.parseFloat(amount) > AppConstants.MAX_TOKEN_COUNT) {
               return false;
          }

          const numAmount = Number(amount);
          return Number.isFinite(numAmount) && numAmount > 0;
     });

     isAmountInvalid = computed(() => {
          const amount = this.accountConfiguratorStoreService.amount();

          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          const numAmount = Number(amount);
          return !Number.isFinite(numAmount) || numAmount <= 0;
     });

     isPaymentChannelAmountValid = computed(() => {
          const amount = this.paymentChannelStoreService.amount();

          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          const numAmount = Number(amount);
          return Number.isFinite(numAmount) && numAmount > 0;
     });

     isPaymentChannelAmountInvalid = computed(() => {
          const amount = this.paymentChannelStoreService.amount();

          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          const numAmount = Number(amount);
          return !Number.isFinite(numAmount) || numAmount <= 0;
     });

     isTicketCreateAmountValid = computed(() => {
          const amount = this.xrplTxOptionsStore.ticketCountField();

          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          const numAmount = Number(amount);
          // Must be a finite number AND between 1 and 250 inclusive
          return Number.isFinite(numAmount) && numAmount >= 1 && numAmount <= 250;
     });

     isTicketCreateAmountInvalid = computed(() => {
          const amount = this.xrplTxOptionsStore.ticketCountField();

          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          const numAmount = Number(amount);
          // Invalid if: not a finite number OR less than 1 OR greater than 250
          return !Number.isFinite(numAmount) || numAmount < 1 || numAmount > 250;
     });

     isCheckAmountValid = computed(() => {
          const amount = this.checksStoreService.amount();
          const totalCheckAmount = this.checksStoreService.totalCheckAmount();

          if (!amount || amount.trim().length === 0) {
               return false;
          }

          const numAmount = Number(amount);
          if (Number.isNaN(numAmount) || numAmount <= 0) {
               return false;
          }

          const numTotalCheckAmount = Number(totalCheckAmount);
          if (Number.isNaN(numAmount) || numAmount > numTotalCheckAmount) {
               return false;
          }

          // Must be finite AND greater than 0 AND less than max
          return Number.isFinite(numAmount) && numAmount > 0 && numAmount < AppConstants.MAX_TOKEN_COUNT;
     });

     isCheckAmountInvalid = computed(() => {
          const amount = this.checksStoreService.amount();

          // Empty or null amounts ARE invalid
          if (amount === null || amount === undefined || amount === '') {
               return true; // Changed from false to true
          }

          const numAmount = Number(amount);

          return !Number.isFinite(numAmount) || numAmount <= 0 || numAmount > AppConstants.MAX_TOKEN_COUNT;
     });

     isCheckCashAmountInvalid = computed(() => {
          const amount = this.checksStoreService.amount();
          const totalCheckAmount = this.checksStoreService.totalCheckAmount();

          const numTotalCheckAmount = Number(totalCheckAmount);
          const numAmount = Number(amount);
          if (Number.isNaN(numAmount) || numAmount > numTotalCheckAmount) {
               return true;
          }
          return false;
     });

     isEscrowAmountValid = computed(() => {
          const amount = this.escrowStoreService.amount();

          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          const numAmount = Number(amount);
          return Number.isFinite(numAmount) && numAmount > 0;
     });

     isEscrowAmountInvalid = computed(() => {
          const amount = this.escrowStoreService.amount();

          if (amount === null || amount === undefined || amount === '') {
               return false;
          }

          const numAmount = Number(amount);
          return !Number.isFinite(numAmount) || numAmount <= 0;
     });

     onAmountKeyPress(event: KeyboardEvent): void {
          const key = event.key;
          const input = event.target as HTMLInputElement;
          const currentValue = input.value;

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

          // Prevent multiple decimal points
          if (key === '.') {
               const decimalCount = (currentValue.match(/\./g) || []).length;
               if (decimalCount >= 1) {
                    event.preventDefault();
                    return;
               }
          }

          // Ensure it's a number or decimal point
          if (!/^[\d.]$/.test(key)) {
               event.preventDefault();
               return;
          }

          // Check for leading zeros
          if (currentValue.length === 1 && currentValue === '0' && key !== '.') {
               // Replace the single zero with the new digit
               // This will be handled in the input event
               return;
          }
     }

     // Add this method to handle input events and validate precision
     onAmountInput(event: Event, type: string): void {
          const input = event.target as HTMLInputElement;
          let value = input.value;

          // Remove any non-numeric characters except decimal point
          value = value.replace(/[^\d.]/g, '');

          // Handle leading zeros
          if (value.startsWith('0') && value.length > 1 && !value.startsWith('0.')) {
               // Remove leading zero if it's followed by another digit
               value = value.replace(/^0+/, '');
               if (value === '') value = '0';
               if (value.startsWith('.')) value = '0' + value;
          }

          // Ensure only one decimal point
          const parts = value.split('.');
          if (parts.length > 2) {
               value = parts[0] + '.' + parts.slice(1).join('');
          }

          // Limit decimal places to 6
          if (parts.length === 2 && parts[1].length > 6) {
               value = parts[0] + '.' + parts[1].slice(0, 6);
          }

          // Update the input value
          if (value !== input.value) {
               const cursorPosition = input.selectionStart;
               input.value = value;
               if (cursorPosition) {
                    const newPosition = Math.min(cursorPosition, value.length);
                    input.setSelectionRange(newPosition, newPosition);
               }
          }

          // Convert to number for validation
          let numericValue: number | null = null;
          if (value && value !== '.') {
               numericValue = Number.parseFloat(value);
               if (Number.isNaN(numericValue)) {
                    numericValue = null;
               }
          }

          // Update the store with the value
          // For empty or invalid values, pass empty string or null
          if (!value || value === '.' || (numericValue !== null && Number.isNaN(numericValue))) {
               this.utilsService.updateAmount('', type);
          } else if (numericValue !== null && !Number.isNaN(numericValue)) {
               // For valid numbers, update with the numeric value
               // But keep the string representation for display
               this.utilsService.updateAmount(numericValue.toString(), type);
          } else {
               this.utilsService.updateAmount(value, type);
          }
     }

     // Optional: Add a method to handle blur events for formatting
     onAmountBlur(event: FocusEvent, type: string): void {
          const input = event.target as HTMLInputElement;
          let value = input.value;

          if (value && value !== '.' && !Number.isNaN(Number.parseFloat(value))) {
               const num = Number.parseFloat(value);
               // Format with up to 6 decimal places, removing trailing zeros
               const formatted = num.toFixed(6).replace(/\.?0+$/, '');
               if (formatted !== value) {
                    input.value = formatted;
                    this.utilsService.updateAmount(formatted, type);
               }
          } else if (value === '.' || (value && Number.isNaN(Number.parseFloat(value)))) {
               // Clear invalid input
               input.value = '';
               this.utilsService.updateAmount('', '');
          }
     }

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }
}
