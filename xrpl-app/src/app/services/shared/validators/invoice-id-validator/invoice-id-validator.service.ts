import { computed, inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { XrplTxOptionsStore } from '../../../../components/shared/stores/xrpl-tx-options.store';

@Injectable({
     providedIn: 'root',
})
export class InvoiceIdValidatorService {
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     INVOICE_ID_REGEX = /^[0-9A-F]{64}$/i;

     // Computed signal: the final hex that will be sent
     readonly invoiceIdHex = computed(() => {
          const input = this.xrplTxOptionsStore.invoiceId()?.trim() ?? '';

          if (!input) return '';

          return this.INVOICE_ID_REGEX.test(input) ? input.toUpperCase() : input;
     });

     isValidInvoiceId = computed(() => {
          const id = this.xrplTxOptionsStore.invoiceId()?.trim();

          return !id || this.INVOICE_ID_REGEX.test(id);
     });

     hasInvalidInvoiceId = computed(() => {
          const id = this.xrplTxOptionsStore.invoiceId()?.trim();

          return !!id && !this.INVOICE_ID_REGEX.test(id);
     });

     invoiceIdHexLength = computed(() => {
          const id = this.xrplTxOptionsStore.invoiceId();
          return id?.length || 0;
     });

     // Computed: length in bytes (hex chars / 2)
     readonly invoiceIdHexLengthBytes = computed(() => {
          const hex = this.invoiceIdHex();
          return hex ? Math.ceil(hex.length / 2) : 0;
     });

     readonly isInvoiceIdTooLong = computed(() => this.invoiceIdHexLengthBytes() > 256);

     invoiceIdToHex(value: string): string {
          if (!value) return '';
          if (/^[0-9A-Fa-f]+$/.test(value)) return value.toUpperCase();
          return xrpl.convertStringToHex(value);
     }
}
