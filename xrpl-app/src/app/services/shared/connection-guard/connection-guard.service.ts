import { Injectable, inject, signal, computed } from '@angular/core';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { ToastService } from '../../utils/toast/toast.service';
import { AppConstants } from '../../../core/app.constants';

@Injectable({
     providedIn: 'root',
})
export class ConnectionGuardService {
     private readonly xrplService = inject(XrplService);
     private readonly toastService = inject(ToastService);

     private readonly pendingOperations = signal<number>(0);
     readonly hasPendingOperations = computed(() => this.pendingOperations() > 0);

     /**
      * Check if connection is ready before executing a transaction
      * @throws Error if not connected
      */
     async checkConnectionAndExecute<T>(operation: () => Promise<T>, errorMessage?: string): Promise<T> {
          // Increment pending operations counter
          this.pendingOperations.update(count => count + 1);

          try {
               // Ensure we have a connection
               // const client = await this.xrplService.ensureConnection();

               // Execute the operation
               return await operation();
          } catch (error: any) {
               const message = errorMessage || 'Cannot perform transaction: No active network connection';
               console.error('Connection guard blocked operation:', error.message);

               // Show user-friendly toast
               this.toastService.error(`${message}. Please wait for connection to establish and try again.`, AppConstants.TOAST.ERROR, false);

               throw new Error(message);
          } finally {
               // Decrement pending operations counter
               this.pendingOperations.update(count => Math.max(0, count - 1));
          }
     }

     /**
      * Check if connection is ready synchronously (for UI blocking)
      */
     isConnectionReady(): boolean {
          return this.xrplService.isConnectionReady();
     }

     /**
      * Get current connection status for UI
      */
     getConnectionStatus() {
          return this.xrplService.getConnectionStatus();
     }
}
