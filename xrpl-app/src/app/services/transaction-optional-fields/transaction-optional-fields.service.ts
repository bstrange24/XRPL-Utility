import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../services/util-service/utils.service';
import { PerformanceBaseComponent } from '../../components/shared/performance-base/performance-base.component';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { Wallet } from '../wallets/manager/wallet-manager.service';

@Injectable({
     providedIn: 'root',
})
export class TransactionOptionalFieldsService extends PerformanceBaseComponent {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     async setTxOptionalFields(client: xrpl.Client, tx: any, wallet: Wallet, config: any, txType: string, txOptions: any) {
          const invoiceIdField = this.xrplTxOptionsStore.invoiceId();
          if (invoiceIdField) {
               this.utilsService.setInvoiceIdField(tx, invoiceIdField);
          }

          const sourceTagField = this.xrplTxOptionsStore.sourceTag();
          if (sourceTagField) {
               this.utilsService.setSourceTagField(tx, sourceTagField);
          }

          const destinationTagField = this.xrplTxOptionsStore.destinationTag();
          if (destinationTagField) {
               this.utilsService.setDestinationTag(tx, destinationTagField);
          }

          const domainId = config.domainId;
          if (domainId) {
               this.utilsService.setDomainId(tx, domainId);
          }

          const isTicket = this.xrplTxOptionsStore.isTicket();
          if (isTicket) {
               const ticket = this.xrplTxOptionsStore.selectedSingleTicket() || this.xrplTxOptionsStore.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(tx, ticket, true);
               }
          }

          if (this.xrplTxOptionsStore.isMemoEnabled()) {
               const memoField = this.xrplTxOptionsStore.memos();
               if (memoField && memoField.length > 0) {
                    this.utilsService.setMemoField1(tx, memoField);
               }
          }
     }
}
