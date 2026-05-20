import { computed, inject, Injectable } from '@angular/core';
import { SignTransationStoreService } from '../../../sign-transactions/sign-transaction-store/sign-transation-store.service';
import { ToastService } from '../../../utils/toast/toast.service';
import { AppConstants } from '../../../../core/app.constants';

@Injectable({
     providedIn: 'root',
})
export class SignTransactionValidatorService {
     public readonly signTransationStoreService = inject(SignTransationStoreService);
     public readonly toastService = inject(ToastService);

     isValidBlob(blob: string): boolean {
          if (!blob) return false;

          // Check if it's non-empty and has reasonable length
          const trimmed = blob.trim();
          return trimmed.length > 0 && trimmed.length < 100000; // Max 100k chars
     }

     validateBlob() {
          const blob = this.signTransationStoreService.outputField();
          if (!blob) {
               this.toastService.warn('No signed transaction blob to validate', AppConstants.TOAST.WARN);
               return;
          }

          // Basic validation for XRPL transaction blob
          const trimmed = blob.trim();
          if (trimmed.length === 0) {
               this.toastService.error('Blob is empty', AppConstants.TOAST.ERROR);
          } else if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
               this.toastService.warn('Blob contains non-hex characters. This may not be a valid XRPL transaction blob.', AppConstants.TOAST.WARN);
          } else if (trimmed.length < 64) {
               this.toastService.warn('Blob seems too short for a valid XRPL transaction', AppConstants.TOAST.WARN);
          } else {
               this.toastService.success('Blob format looks valid', AppConstants.TOAST.SUCCESS);
          }
     }

     jsonIsValid = computed(() => {
          const txJson = this.signTransationStoreService.txJson();
          const error = this.signTransationStoreService.jsonEditorError();

          if (!txJson.trim()) return false;
          return !error || error.trim().length === 0;
     });
}
