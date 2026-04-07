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

     copyToClipboard(address: any) {
          console.log('copyAndToast fired for:', performance.now());
          navigator.clipboard
               .writeText(address)
               .then(() => {
                    this.toast.success('Data copied to clipboard!');
               })
               .catch(err => {
                    console.error('Failed to copy data:', err);
                    this.toast.error('Failed to copy data. Please select and copy manually.');
               });
     }

     copyAddress(address: string) {
          navigator.clipboard
               .writeText(address)
               .then(() => {
                    this.toast.success('Address copied to clipboard!');
               })
               .catch(err => {
                    console.error('Failed to copy address:', err);
                    this.toast.error('Failed to copy address. Please select and copy manually.');
               });
     }

     copySeed(seed: string) {
          navigator.clipboard
               .writeText(seed)
               .then(() => {
                    this.toast.success('Seed copied to clipboard!');
               })
               .catch(err => {
                    console.error('Failed to copy seed:', err);
                    this.toast.error('Failed to copy seed. Please select and copy manually.');
               });
     }

     copyTxSignal() {
          const json = JSON.stringify(this.ui.txSignal(), null, 2);
          navigator.clipboard
               .writeText(json)
               .then(() => {
                    this.toast.success('Transaction JSON copied!');
               })
               .catch(err => {
                    console.error('Failed to copy JSON:', err);
                    this.toast.error('Failed to copy JSON. Please select and copy manually.');
               });
     }

     copyTx() {
          const json = JSON.stringify(this.ui.paymentTx, null, 2);
          navigator.clipboard
               .writeText(json)
               .then(() => {
                    this.toast.success('Transaction JSON copied!');
               })
               .catch(err => {
                    console.error('Failed to copy JSON:', err);
                    this.toast.error('Failed to copy JSON. Please select and copy manually.');
               });
     }

     copySignTx(txJson: any) {
          navigator.clipboard
               .writeText(txJson)
               .then(() => {
                    this.toast.success('Transaction JSON copied!');
               })
               .catch(err => {
                    console.error('Failed to copy JSON:', err);
                    this.toast.error('Failed to copy JSON. Please select and copy manually.');
               });
     }

     copyTxResultSignal() {
          const json = JSON.stringify(this.ui.txResultSignal(), null, 2);
          navigator.clipboard
               .writeText(json)
               .then(() => {
                    this.toast.success('Transaction Result JSON copied!');
               })
               .catch(err => {
                    console.error('Failed to copy JSON:', err);
                    this.toast.error('Failed to copy JSON. Please select and copy manually.');
               });
     }

     copyTxResult() {
          const json = JSON.stringify(this.ui.txResult, null, 2);
          navigator.clipboard
               .writeText(json)
               .then(() => {
                    this.toast.success('Transaction Result JSON copied!');
               })
               .catch(err => {
                    console.error('Failed to copy JSON:', err);
                    this.toast.error('Failed to copy JSON. Please select and copy manually.');
               });
     }

     copySignedTx(text: string) {
          navigator.clipboard
               .writeText(text)
               .then(() => {
                    this.toast.success('Copied Signed Tx to clipboard!');
               })
               .catch(err => {
                    console.error('Failed to copy signed Tx:', err);
                    this.toast.error('Failed to copy Signed Tx. Please select and copy manually.');
               });
     }

     copyTxHash(text: string) {
          navigator.clipboard
               .writeText(text)
               .then(() => {
                    this.toast.success('Copied Tx Hash to clipboard!');
               })
               .catch(err => {
                    console.error('Failed to copy Tx Hash:', err);
                    this.toast.error('Failed to copy Tx Hash. Please select and copy manually.');
               });
     }
}
