import { Injectable } from '@angular/core';
import { ToastService } from '../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';

@Injectable({ providedIn: 'root' })
export class CopyUtilService {
     constructor(
          public ui: TransactionUiService,
          private readonly toast: ToastService
     ) {}

     copyAndToast(value: any, label: string) {
          const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

          navigator.clipboard
               .writeText(text)
               .then(() => {
                    this.toast.success(`${label} copied`);
               })
               .catch(() => {
                    this.toast.error(`Failed to copy ${label}`);
               });
     }

     copyAddress(address: string) {
          this.copyAndToast(address, 'Address');
     }

     copySeed(seed: string) {
          this.copyAndToast(seed, 'Seed');
     }

     copyTxSignal() {
          this.copyAndToast(this.ui.txSignal(), 'Transaction JSON');
     }

     copySignTx(txJson: any) {
          this.copyAndToast(txJson, 'Transaction JSON');
     }

     copyTxResultSignal() {
          this.copyAndToast(this.ui.txResultSignal(), 'Transaction Result JSON');
     }

     copyTxResult() {
          this.copyAndToast(this.ui.txResult, 'Transaction Result JSON');
     }

     copySignedTx(text: string) {
          this.copyAndToast(text, 'Signed Tx');
     }

     copyTxHash(text: string) {
          this.copyAndToast(text, 'Tx Hash');
     }
}
