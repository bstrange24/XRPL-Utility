import { Injectable } from '@angular/core';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';

@Injectable({ providedIn: 'root' })
export class CopyUtilService {
     constructor(public ui: TransactionUiService) {}

     copyAddress(address: string) {
          navigator.clipboard.writeText(address).then(() => {
               this.ui.showToastMessage('Address copied to clipboard!');
          });
     }

     copySeed(seed: string) {
          navigator.clipboard
               .writeText(seed)
               .then(() => {
                    this.ui.showToastMessage('Seed copied to clipboard!');
               })
               .catch(err => {
                    console.error('Failed to copy seed:', err);
                    this.ui.showToastMessage('Failed to copy. Please select and copy manually.');
               });
     }

     copyTx() {
          const json = JSON.stringify(this.ui.paymentTx, null, 2);
          // const json = JSON.stringify(this.paymentTx, null, 2);
          navigator.clipboard.writeText(json).then(() => {
               this.ui.showToastMessage('Transaction JSON copied!');
          });
     }

     copySignTx(txJson: any) {
          // const json = JSON.stringify(txJson, null, 2);
          // const json = JSON.stringify(this.paymentTx, null, 2);
          navigator.clipboard.writeText(txJson).then(() => {
               this.ui.showToastMessage('Transaction JSON copied!');
          });
     }

     copyTxResult() {
          // const json = JSON.stringify(this.txResult, null, 2);
          const json = JSON.stringify(this.ui.txResult, null, 2);
          navigator.clipboard.writeText(json).then(() => {
               this.ui.showToastMessage('Transaction Result JSON copied!');
          });
     }

     copySignedTx(text: string) {
          navigator.clipboard.writeText(text).then(() => {
               this.ui.showToastMessage('Copied Signed Tx to clipboard!');
          });
     }
}
