import { Injectable, signal, computed } from '@angular/core';
import { AmountValidatorService } from '../../shared/validators/amount-validator/amount-validator.service';

@Injectable({
     providedIn: 'root',
})
export class VaultDepositValidatorService {
     private readonly _action = signal<'deposit' | 'withdraw' | null>(null);
     private readonly _vaultId = signal<string | null>(null);
     private readonly _amount = signal<string>('');
     private readonly _holder = signal<string>('');
     private readonly _destination = signal<string>('');
     private readonly _isDestinationValid = signal<boolean>(false);
     private readonly _availableBalance = signal<string>('0');
     private readonly _availableSpace = signal<string>('0');
     private readonly _maxAmount = signal<string>('0');

     constructor(private amountValidator: AmountValidatorService) {}

     // Setters
     setAction(action: 'deposit' | 'withdraw' | null) {
          this._action.set(action);
     }

     setVaultId(vaultId: string | null) {
          this._vaultId.set(vaultId);
     }

     setAmount(amount: string) {
          this._amount.set(amount);
     }

     setHolder(holder: string) {
          this._holder.set(holder);
     }

     setDestination(destination: string) {
          this._destination.set(destination);
     }

     setDestinationValidation(isValid: boolean) {
          this._isDestinationValid.set(isValid);
     }

     setAvailableBalance(balance: string) {
          this._availableBalance.set(balance);
     }

     setAvailableSpace(space: string) {
          this._availableSpace.set(space);
     }

     setMaxAmount(max: string) {
          this._maxAmount.set(max);
     }

     // Getters
     get action() {
          return this._action();
     }

     get vaultId() {
          return this._vaultId();
     }

     get amount() {
          return this._amount();
     }

     get holder() {
          return this._holder();
     }

     get destination() {
          return this._destination();
     }

     get isDestinationValid() {
          return this._isDestinationValid();
     }

     // Validation Computed
     canDepositWithdraw = computed(() => {
          const action = this._action();
          const vaultId = this._vaultId();
          const amount = this._amount();
          const amountNum = parseFloat(amount);

          // Basic validations
          if (!action) return false;
          if (!vaultId) return false;
          if (!amount || amount.trim().length === 0) return false;

          // Check amount format
          if (this.amountValidator.isEscrowAmountInvalid()) {
               return false;
          }

          // Check if amount is positive
          if (isNaN(amountNum) || amountNum <= 0) {
               return false;
          }

          // Action-specific validations
          if (action === 'deposit') {
               const holder = this._holder();
               if (!holder) return false;

               // Check if amount exceeds available space
               const availableSpace = parseFloat(this._availableSpace());
               if (!isNaN(availableSpace) && amountNum > availableSpace) {
                    return false;
               }
          } else {
               const destination = this._destination();
               const isDestValid = this._isDestinationValid();
               if (!destination || !isDestValid) return false;

               // Check if amount exceeds available balance
               const availableBalance = parseFloat(this._availableBalance());
               if (!isNaN(availableBalance) && amountNum > availableBalance) {
                    return false;
               }
          }

          return true;
     });

     getActionErrorMessage = computed(() => {
          // if (!this._action()) {
          //      return 'Please select an action (Deposit or Withdraw).';
          // }
          return '';
     });

     getAmountErrorMessage = computed(() => {
          const amount = this._amount();
          if (!amount || amount.trim().length === 0) {
               return 'Please enter an amount.';
          }
          if (this.amountValidator.isEscrowAmountInvalid()) {
               return 'Invalid amount format. Please enter a valid number.';
          }

          const amountNum = parseFloat(amount);
          if (isNaN(amountNum) || amountNum <= 0) {
               return 'Amount must be greater than 0.';
          }

          const action = this._action();
          if (action === 'deposit') {
               const availableSpace = parseFloat(this._availableSpace());
               if (!isNaN(availableSpace) && amountNum > availableSpace) {
                    return `Amount exceeds available space of ${this._availableSpace()}.`;
               }
          } else if (action === 'withdraw') {
               const availableBalance = parseFloat(this._availableBalance());
               if (!isNaN(availableBalance) && amountNum > availableBalance) {
                    return `Amount exceeds available balance of ${this._availableBalance()}.`;
               }
          }

          return '';
     });

     getHolderErrorMessage = computed(() => {
          if (this._action() === 'deposit' && !this._holder()) {
               return 'Please select a holder account.';
          }
          return '';
     });

     getDestinationErrorMessage = computed(() => {
          if (this._action() === 'withdraw') {
               if (!this._destination()) {
                    return 'Please enter a destination address.';
               }
               if (!this._isDestinationValid()) {
                    return 'Please enter a valid destination address.';
               }
          }
          return '';
     });

     getVaultErrorMessage = computed(() => {
          if (!this._vaultId()) {
               return 'Please select a vault.';
          }
          return '';
     });

     getAllValidationErrors = computed(() => {
          const errors: string[] = [];

          const vaultError = this.getVaultErrorMessage();
          if (vaultError) errors.push(vaultError);

          const actionError = this.getActionErrorMessage();
          if (actionError) errors.push(actionError);

          const amountError = this.getAmountErrorMessage();
          if (amountError) errors.push(amountError);

          const holderError = this.getHolderErrorMessage();
          if (holderError) errors.push(holderError);

          const destinationError = this.getDestinationErrorMessage();
          if (destinationError) errors.push(destinationError);

          return errors;
     });

     // Reset
     reset() {
          this._action.set(null);
          this._vaultId.set(null);
          this._amount.set('');
          this._holder.set('');
          this._destination.set('');
          this._isDestinationValid.set(false);
          this._availableBalance.set('0');
          this._availableSpace.set('0');
          this._maxAmount.set('0');
     }
}
