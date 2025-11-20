import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TransactionUiService {
     isSimulateEnabled = false;
     txHash: string | null = null;
     txHashes: string[] = [];
     isError: boolean = false;
     isSuccess: boolean = false;
     result: string = '';
     spinner: boolean = false;
     spinnerMessage: string = '';
     showToast: boolean = false;
     toastMessage: string = '';

     paymentTx: any[] = [];
     txResult: any[] = [];
     txErrorHashes: any[] = [];

     infoMessage: string | null = null;
     successMessage: string | null = null;
     warningMessage: string | null = null;
     errorMessage: string | null = null;

     // Called when user toggles the simulate slider
     toggleSimulate(enabled: boolean) {
          this.isSimulateEnabled = enabled;

          // Always clear hash when switching modes
          this.txHash = null;
          this.txHashes = [];

          // Optional: clean up previous messages
          this.infoMessage = null;
          this.successMessage = null;
          this.warningMessage = null;
          this.errorMessage = null;
          this.clearMessages();
     }

     clearMessages() {
          this.result = '';
          this.isError = false;
          this.isSuccess = false;
          this.txHash = '';
          this.txHashes = [];
          this.txResult = [];
          this.txErrorHashes = [];
          this.paymentTx = [];
          this.successMessage = '';
     }

     // set a warning
     setWarning(msg: string | null) {
          this.warningMessage = msg;
     }

     clearWarning() {
          this.setWarning(null);
     }

     async showSpinnerWithDelay(message: string, delayMs: number = 200) {
          this.spinner = true;
          this.updateSpinnerMessage(message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
     }

     updateSpinnerMessage(message: string) {
          this.spinnerMessage = message;
     }

     showToastMessage(message: string, duration: number = 2000) {
          this.toastMessage = message;
          this.showToast = true;
          setTimeout(() => {
               this.showToast = false;
          }, duration);
     }

     // Called when a real transaction succeeds
     setSuccess(message: string, hash?: string) {
          this.setSuccessProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError,
               isSuccess: this.isSuccess,
          });

          this.successMessage = message;
          this.errorMessage = null;

          // Only set a hash when simulate is OFF
          this.txHash = !this.isSimulateEnabled ? hash || null : null;
     }

     setSuccessProperties() {
          this.isSuccess = true;
          this.isError = false;
          this.spinner = false;
          // this.result = '';
     }

     // Called when an error occurs
     setError(message: string, hash?: string) {
          this.setErrorProperties();
          this.setErrorProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError,
               isSuccess: this.isSuccess,
          });
          this.errorMessage = message;
          this.successMessage = null;

          // Only set a hash if not simulated
          this.txHash = !this.isSimulateEnabled ? hash || null : null;
     }

     private setErrorProperties() {
          this.isSuccess = false;
          this.isError = true;
          this.spinner = false;
     }

     handleTransactionResult(event: { result: string; isError: boolean; isSuccess: boolean }) {
          this.result = event.result;
          this.isError = event.isError;
          this.isSuccess = event.isSuccess;
     }
}
