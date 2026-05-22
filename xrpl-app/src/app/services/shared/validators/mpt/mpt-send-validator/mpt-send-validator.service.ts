import { computed, inject, Injectable, signal } from '@angular/core';
import { MptStoreService } from '../../../../mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MptUtilService } from '../../../../mpt/mpt-util/mpt-util.service';
import { XrplTransactionService } from '../../../../xrpl-transactions/xrpl-transaction.service';
import * as xrpl from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class MptSendValidatorService {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly mptUtil = inject(MptUtilService);
     public readonly xrplTransaction = inject(XrplTransactionService);
     private readonly dropdownDestinationIsValid = signal<boolean>(true);

     // MPT Selection Validation
     isMptSelectedValid = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();

          if (!issuanceId || issuanceId.trim().length === 0) {
               return false;
          }

          // Check if the MPT exists in the available items
          const mptItems = this.viewModel.mptItems();
          return mptItems.some(item => item.id === issuanceId);
     });

     isMptSelectedInvalid = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();

          if (!issuanceId || issuanceId.trim().length === 0) {
               return false;
          }

          return !this.isMptSelectedValid();
     });

     getMptSelectedErrorMessage = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();

          if (!issuanceId || issuanceId.trim().length === 0) {
               // return 'Please select an MPT to send.';
               return '';
          }

          if (!this.isMptSelectedValid()) {
               return 'Selected MPT not found in your holdings. Please select a valid MPT from the dropdown.';
          }

          return '';
     });

     // MPT Issuance ID Validation
     isMptIssuanceIdValid = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();

          if (!issuanceId || issuanceId.trim().length === 0) {
               return false;
          }

          // MPT Issuance ID should be a 48-character hex string
          const hexRegex = /^[0-9A-Fa-f]{48}$/;
          return hexRegex.test(issuanceId.trim());
     });

     isMptIssuanceIdInvalid = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();

          if (!issuanceId || issuanceId.trim().length === 0) {
               return false;
          }

          return !this.isMptIssuanceIdValid();
     });

     getMptIssuanceIdErrorMessage = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();

          if (!issuanceId || issuanceId.trim().length === 0) {
               return '';
          }

          if (!this.isMptIssuanceIdValid()) {
               return 'MPT Issuance ID must be a 48-character hexadecimal string.';
          }

          return '';
     });

     // Destination Validation
     isDestinationValid = computed(() => {
          const destination = this.mptStoreService.destination()?.trim();
          if (!destination) return false;

          // Trust the dropdown's validation first (this catches typed invalid addresses)
          if (!this.dropdownDestinationIsValid()) {
               return false;
          }

          if (!xrpl.isValidAddress(destination)) return false;

          const currentAddress = this.getCurrentAddress();
          if (currentAddress && destination === currentAddress) return false;

          return true;
     });

     isDestinationInvalid = computed(() => {
          const destination = this.mptStoreService.destination();

          if (!destination || destination.trim().length === 0) {
               return false;
          }

          return !this.isDestinationValid();
     });

     getDestinationErrorMessage = computed(() => {
          const destination = this.mptStoreService.destination()?.trim();
          if (!destination) return '';

          if (!this.dropdownDestinationIsValid()) {
               return 'Please enter a valid XRP address.';
          }

          if (!xrpl.isValidAddress(destination)) {
               return 'Please enter a valid XRP address.';
          }

          const currentAddress = this.getCurrentAddress();
          if (currentAddress && destination === currentAddress) {
               return 'You cannot send MPT to your own account.';
          }

          return '';
     });

     // Amount Validation
     isAmountValid = computed(() => {
          const amount = this.mptStoreService.amount();

          if (!amount || amount.trim().length === 0) {
               return '';
          }

          const numAmount = Number(amount);
          if (isNaN(numAmount) || numAmount <= 0) {
               return false;
          }

          // Check if amount doesn't exceed available balance
          const availableBalance = this.getAvailableBalance();
          if (numAmount > availableBalance) {
               return false;
          }

          // Check if amount doesn't exceed max allowed (10 quadrillion)
          if (numAmount > 10_000_000_000_000_000n) {
               return false;
          }

          return true;
     });

     isAmountInvalid = computed(() => {
          const amount = this.mptStoreService.amount();

          if (!amount || amount.trim().length === 0) {
               return '';
          }

          return !this.isAmountValid();
     });

     getAmountErrorMessage = computed(() => {
          const amount = this.mptStoreService.amount();
          const availableBalance = this.getAvailableBalance();

          if (!amount || amount.trim().length === 0) {
               return '';
          }

          const numAmount = Number(amount);
          if (isNaN(numAmount)) {
               return 'Amount must be a valid number.';
          }

          if (numAmount <= 0) {
               return 'Amount must be greater than 0.';
          }

          // if (numAmount > availableBalance) {
          //      return `Amount exceeds available balance (${availableBalance} tokens).`;
          // }

          if (numAmount > 10_000_000_000_000_000) {
               return 'Amount cannot exceed 10,000,000,000,000,000 tokens.';
          }

          return '';
     });

     // Check if destination is authorized to receive this MPT
     isDestinationAuthorized = computed(() => {
          const destination = this.mptStoreService.destination();
          const issuanceId = this.mptStoreService.mptIssuanceId();

          if (!destination || !issuanceId) {
               return false;
          }

          // This would check if the destination is authorized to hold this MPT
          // Implementation depends on your MPT data structure
          return true; // Placeholder - implement actual check
     });

     getAuthorizationWarning = computed(() => {
          if (!this.isDestinationValid()) return '';
          if (this.isDestinationAuthorized()) return '';

          const requiresAuth = this.doesMptRequireAuth();
          if (requiresAuth) {
               return 'Warning: The destination account may not be authorized to receive this MPT. The transaction may fail.';
          }
          return '';
     });

     // Helper methods
     private getAvailableBalance(): number {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId) return 0;

          const mptItems = this.viewModel.mptItems();
          const selectedMpt = mptItems.find(item => item.id === issuanceId);

          if (!selectedMpt) return 0;

          // Extract amount from display string (e.g., "MPT • 1000 held" -> "1000")
          const match = selectedMpt.display.match(/MPT • ([\d.]+)/);
          return match ? Number(match[1]) : 0;
     }

     private getCurrentAddress(): string {
          // This should be injected or passed from parent
          return '';
     }

     private doesMptRequireAuth(): boolean {
          // Check if the selected MPT requires authorization
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId) return false;

          // Implementation depends on your MPT data
          return false;
     }

     // Overall Form Validation
     canSendMpt = computed(() => {
          if (!this.isMptSelectedValid()) return false;
          if (!this.isDestinationValid()) return false;
          if (!this.isAmountValid()) return false;

          return true;
     });

     // Get all validation error messages
     getAllValidationErrors = computed(() => {
          const errors: string[] = [];

          const mptError = this.getMptSelectedErrorMessage();
          if (mptError) errors.push(`${mptError}`);

          const destinationError = this.getDestinationErrorMessage();
          if (destinationError) errors.push(`${destinationError}`);

          const amountError = this.getAmountErrorMessage();
          if (amountError) errors.push(`${amountError}`);

          const authWarning = this.getAuthorizationWarning();
          if (authWarning) errors.push(authWarning);

          return errors;
     });

     setDestinationValidation(isValid: boolean) {
          this.dropdownDestinationIsValid.set(isValid);
     }
}
