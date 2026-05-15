import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { EscrowStoreService } from '../../escrow/escrow-store/escrow-store.service';
import { PaymentChannelStoreService } from '../../payment-channel/payment-channel-store/payment-channel-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { CredentialStore } from '../../credentials/credential-store/credential-store.service';

@Injectable({
     providedIn: 'root',
})
export class RealTimeExpirationService implements OnDestroy {
     private readonly escrowStoreService = inject(EscrowStoreService);
     private readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     private readonly credentialStore = inject(CredentialStore);
     private intervalId: any = null;

     // Escrow Finish After Signals (Separate)
     public isEscrowFinishAfterExpired = signal(false);
     public escrowFinishAfterTimeRemaining = signal('');
     public escrowFinishAfterSecondsRemaining = signal(0);

     // Escrow Cancel After Signals (Separate)
     public isEscrowCancelAfterExpired = signal(false);
     public escrowCancelAfterTimeRemaining = signal('');
     public escrowCancelAfterSecondsRemaining = signal(0);

     // Payment Channel Signals
     public isPaymentChannelExpired = signal(false);
     public paymentChannelTimeRemaining = signal('');
     public paymentChannelSecondsRemaining = signal(0);

     // Credential Signals
     public isCredentialExpired = signal(false);
     public credentialTimeRemaining = signal('');
     public credentialSecondsRemaining = signal(0);

     constructor() {
          this.startRealTimeCheck();
     }

     private startRealTimeCheck() {
          this.intervalId = setInterval(() => {
               this.checkExpirations();
          }, 500);
     }

     private checkExpirations() {
          // Check Escrow Finish After
          const finishDate = this.escrowStoreService?.escrowFinishAfterExpirationDate();
          const finishEnabled = this.escrowStoreService?.enableEscrowFinishAfterExpirationDate();

          if (finishEnabled && finishDate) {
               this.updateEscrowFinishStatus(finishDate);
          } else {
               this.resetEscrowFinishStatus();
          }

          // Check Escrow Cancel After
          const cancelDate = this.escrowStoreService?.escrowCancelAfterExpirationDate();
          const cancelEnabled = this.escrowStoreService?.enableEscrowCancelAfterExpirationDate();

          if (cancelEnabled && cancelDate) {
               this.updateEscrowCancelStatus(cancelDate);
          } else {
               this.resetEscrowCancelStatus();
          }

          // Check Payment Channel
          const paymentChannelDate = this.paymentChannelStoreService?.paymentChannelCancelAfterTimeField();
          const paymentChannelEnabled = this.xrplTxOptionsStore?.isExpirationEnabled();

          if (paymentChannelEnabled && paymentChannelDate) {
               this.updatePaymentChannelStatus(paymentChannelDate);
          } else {
               this.resetPaymentChannelStatus();
          }

          // Check Credential Expiration
          const credentialDate = this.credentialStore?.credentialSubjectExpirationDate();
          const credentialEnabled = this.credentialStore?.enableExpirationDate();

          if (credentialEnabled && credentialDate) {
               this.updateCredentialExpirationStatus(credentialDate);
          } else {
               this.resetCredentialExpirationStatus();
          }
     }

     private updateEscrowFinishStatus(date: string) {
          const targetDate = new Date(date);
          const now = new Date();
          const isExpired = targetDate <= now;

          this.isEscrowFinishAfterExpired.set(isExpired);

          if (!isExpired) {
               const secondsRemaining = this.getSecondsRemaining(targetDate);
               this.escrowFinishAfterSecondsRemaining.set(secondsRemaining);
               this.escrowFinishAfterTimeRemaining.set(this.getTimeRemainingString(targetDate));
          } else {
               this.escrowFinishAfterSecondsRemaining.set(0);
               this.escrowFinishAfterTimeRemaining.set('Expired');
          }
     }

     private resetEscrowFinishStatus() {
          this.isEscrowFinishAfterExpired.set(false);
          this.escrowFinishAfterTimeRemaining.set('');
          this.escrowFinishAfterSecondsRemaining.set(0);
     }

     private updateEscrowCancelStatus(date: string) {
          const targetDate = new Date(date);
          const now = new Date();
          const isExpired = targetDate <= now;

          this.isEscrowCancelAfterExpired.set(isExpired);

          if (!isExpired) {
               const secondsRemaining = this.getSecondsRemaining(targetDate);
               this.escrowCancelAfterSecondsRemaining.set(secondsRemaining);
               this.escrowCancelAfterTimeRemaining.set(this.getTimeRemainingString(targetDate));
          } else {
               this.escrowCancelAfterSecondsRemaining.set(0);
               this.escrowCancelAfterTimeRemaining.set('Expired');
          }
     }

     private resetEscrowCancelStatus() {
          this.isEscrowCancelAfterExpired.set(false);
          this.escrowCancelAfterTimeRemaining.set('');
          this.escrowCancelAfterSecondsRemaining.set(0);
     }

     private updatePaymentChannelStatus(date: string) {
          const targetDate = new Date(date);
          const now = new Date();
          const isExpired = targetDate <= now;

          this.isPaymentChannelExpired.set(isExpired);

          if (!isExpired) {
               const secondsRemaining = this.getSecondsRemaining(targetDate);
               this.paymentChannelSecondsRemaining.set(secondsRemaining);
               this.paymentChannelTimeRemaining.set(this.getTimeRemainingString(targetDate));
          } else {
               this.paymentChannelSecondsRemaining.set(0);
               this.paymentChannelTimeRemaining.set('Expired');
          }
     }

     private resetPaymentChannelStatus() {
          this.isPaymentChannelExpired.set(false);
          this.paymentChannelTimeRemaining.set('');
          this.paymentChannelSecondsRemaining.set(0);
     }

     private updateCredentialExpirationStatus(date: string) {
          const targetDate = new Date(date);
          const now = new Date();
          const isExpired = targetDate <= now;

          this.isCredentialExpired.set(isExpired);

          if (!isExpired) {
               const secondsRemaining = this.getSecondsRemaining(targetDate);
               this.credentialSecondsRemaining.set(secondsRemaining);
               this.credentialTimeRemaining.set(this.getTimeRemainingString(targetDate));
          } else {
               this.credentialSecondsRemaining.set(0);
               this.credentialTimeRemaining.set('Expired');
          }
     }

     private resetCredentialExpirationStatus() {
          this.isCredentialExpired.set(false);
          this.credentialTimeRemaining.set('');
          this.credentialSecondsRemaining.set(0);
     }

     private getSecondsRemaining(targetDate: Date): number {
          const now = new Date();
          const diff = targetDate.getTime() - now.getTime();
          if (diff <= 0) return 0;
          return Math.floor(diff / 1000);
     }

     private getTimeRemainingString(targetDate: Date): string {
          const now = new Date();
          const diff = targetDate.getTime() - now.getTime();

          if (diff <= 0) return 'Expired';

          const seconds = Math.floor(diff / 1000);
          const minutes = Math.floor(seconds / 60);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);

          if (days > 0) return `${days}d ${hours % 24}h remaining`;
          if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
          if (minutes > 0) return `${minutes}m ${seconds % 60}s remaining`;
          return `${seconds}s remaining`;
     }

     public forceCheck() {
          this.checkExpirations();
     }

     ngOnDestroy() {
          if (this.intervalId) {
               clearInterval(this.intervalId);
               this.intervalId = null;
          }
     }
}
