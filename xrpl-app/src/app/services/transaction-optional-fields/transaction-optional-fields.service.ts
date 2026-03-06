import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../services/util-service/utils.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TxEnvironmentService } from '../transaction-environment/tx-environment.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { PerformanceBaseComponent } from '../../components/shared/performance-base/performance-base.component';

@Injectable({
     providedIn: 'root',
})
export class TransactionOptionalFieldsService extends PerformanceBaseComponent {
     // private readonly txExecutor = inject(XrplTransactionExecutorService);
     // public readonly xrplTransactionService = inject(XrplTransactionService);
     // private readonly validationService = inject(ValidationService);
     // public readonly toastService = inject(ToastService);
     // public readonly utilsService = inject(UtilsService);
     // public readonly txUiService = inject(TransactionUiService);
     // public readonly txEnvironmentServiceService = inject(TxEnvironmentService);
     // public readonly transactionOptionalFieldsService = inject(TransactionOptionalFieldsService);
     // async setTxOptionalFields(client: xrpl.Client, checkTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
     //      if (txType === 'create') {
     //           // const expValue = this.expirationTimeField();
     //           // if (expValue && expValue != '' && this.enableExpirationDate()) {
     //           //      if (expValue?.trim()) {
     //           //           const checkExpiration = this.utilsService.toRippleTime(expValue);
     //           //           this.utilsService.setExpiration(checkTx, Number(checkExpiration));
     //           //      }
     //           // }
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
