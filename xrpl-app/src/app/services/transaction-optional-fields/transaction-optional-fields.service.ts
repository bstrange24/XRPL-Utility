import { Injectable } from '@angular/core';

@Injectable({
     providedIn: 'root',
})
export class TransactionOptionalFieldsService {
     // async setTxOptionalFields(client: xrpl.Client, checkTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
     //      if (txType === 'create') {
     //           const expValue = this.expirationTimeField();
     //           if (expValue && expValue != '' && this.wantsExpiration()) {
     //                if (expValue?.trim()) {
     //                     const checkExpiration = this.utilsService.toRippleTime(expValue);
     //                     this.utilsService.setExpiration(checkTx, Number(checkExpiration));
     //                }
     //           }
     //           const invoiceIdField = this.txUiService.invoiceIdField();
     //           if (invoiceIdField) {
     //                this.utilsService.setInvoiceIdField(checkTx, invoiceIdField);
     //           }
     //           const sourceTagField = this.txUiService.sourceTagField();
     //           if (sourceTagField) {
     //                this.utilsService.setSourceTagField(checkTx, sourceTagField);
     //           }
     //           const destinationTagField = this.txUiService.destinationTagField();
     //           if (destinationTagField) {
     //                this.utilsService.setDestinationTag(checkTx, destinationTagField);
     //           }
     //      }
     //      const isTicket = this.txUiService.isTicket();
     //      if (isTicket) {
     //           const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
     //           if (ticket) {
     //                const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
     //                if (!exists) throw new Error(`Ticket ${ticket} not found`);
     //                this.utilsService.setTicketSequence(checkTx, ticket, true);
     //           }
     //      }
     //      const memoField = this.txUiService.memoField();
     //      if (this.txUiService.isMemoEnabled() && memoField) {
     //           this.utilsService.setMemoField(checkTx, memoField);
     //      }
     // }
}
