import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { UtilsService } from '../utils/util-service/utils.service';
import { PerformanceBaseComponent } from '../../components/shared/performance-base/performance-base.component';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { Wallet } from '../wallets/manager/wallet-manager.service';
import { percentToTransferRate } from 'xrpl';
import { PermissionedDomainStoreService } from '../permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { CredentialStore } from '../credentials/credential-store/credential-store.service';

@Injectable({
     providedIn: 'root',
})
export class TransactionOptionalFieldsService extends PerformanceBaseComponent {
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly credentialStore = inject(CredentialStore);

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

          if (txType === 'updateMetaData') {
               if (config.tickSize) {
                    this.utilsService.setTickSize(tx, Number.parseInt(config.tickSize));
               }

               if (config.transferRate && config.transferRate == 0) {
                    this.utilsService.setTransferRate(tx, 0);
               } else if (config.transferRate) {
                    const transferRate = percentToTransferRate(config.transferRate + '%');
                    this.utilsService.setTransferRate(tx, transferRate);
               }

               if (config.isMessageKey && wallet.publicKey) {
                    this.utilsService.setMessageKey(tx, wallet.publicKey);
               }

               const domainInput = config.domain?.trim();
               if (domainInput) {
                    let domainHex: string;

                    if (/^[0-9A-Fa-f]+$/.test(domainInput)) {
                         // Already hex
                         domainHex = domainInput.toUpperCase();
                    } else {
                         // Convert string → hex
                         domainHex = xrpl.convertStringToHex(domainInput);
                    }

                    this.utilsService.setDomain(tx, domainHex);
               } else {
                    // Empty input will clear domain
                    tx.Domain = '';
               }
          }

          if (txType === 'sendXrp') {
               const invoiceIdInput = this.xrplTxOptionsStore.invoiceId();
               if (invoiceIdInput && invoiceIdInput !== '') {
                    let invoiceIdHex: string;

                    // // Validate it's already valid hex
                    // if (/^[0-9A-Fa-f]+$/.test(invoiceIdInput)) {
                    //      if (invoiceIdInput.length !== 64) {
                    //           throw new Error('InvoiceID must be exactly 64 hex characters (32 bytes)');
                    //      }
                    //      invoiceIdHex = invoiceIdInput.toUpperCase();
                    // } else {
                    //      // For InvoiceID, you typically DON'T convert strings to hex
                    //      // Instead, you'd hash the string or generate a proper ID
                    //      throw new Error('InvoiceID must be a valid 64-character hex string');
                    // }

                    tx.InvoiceID = invoiceIdInput;
               }

               const credentials = this.credentialStore.credentialIDs();
               if (credentials && credentials.length > 0) {
                    tx.CredentialIDs = credentials;
               }

               const domanId = this.permissionedDomainStoreService.domainId();
               if (domanId && domanId !== '') {
                    tx.DomainID = domanId;
               }
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
               const memos = this.xrplTxOptionsStore.memos();
               if (memos && memos.length > 0) {
                    // Check if it's the new format (objects with Memo property)
                    if (memos.length > 0 && typeof memos[0] === 'object' && memos[0].Memo && memos[0].Memo.MemoData !== '') {
                         this.utilsService.setEnhancedMemoField(tx, memos);
                    } else {
                         if (memos.length > 0 && memos[0].Memo && memos[0].Memo.MemoData !== '') {
                              // Legacy format (array of strings)
                              this.utilsService.setMemoField1(tx, memos);
                         }
                    }
               }
          }

          // if (this.xrplTxOptionsStore.isMemoEnabled()) {
          //      const memoField = this.xrplTxOptionsStore.memos();
          //      if (memoField && memoField.length > 0) {
          //           this.utilsService.setMemoField1(tx, memoField);
          //      }
          // }
     }
}
