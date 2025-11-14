import { Injectable } from '@angular/core';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';

@Injectable({
     providedIn: 'root',
})
export class DownloadUtilService {
     constructor(public ui: TransactionUiService) {}

     downloadTxResult() {
          // const json = JSON.stringify(this.txResult, null, 2);
          const json = JSON.stringify(this.ui.txResult, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tx-result-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
     }

     downloadTx() {
          const json = JSON.stringify(this.ui.paymentTx, null, 2);
          // const json = JSON.stringify(this.paymentTx, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `payment-tx-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
     }
}
