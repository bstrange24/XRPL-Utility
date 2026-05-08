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
               const domainInput = this.permissionedDomainStoreService.domainId();
               if (domainInput && domainInput !== '') {
                    let domainHex: string;

                    if (/^[0-9A-Fa-f]+$/.test(domainInput)) {
                         // Already hex
                         domainHex = domainInput.toUpperCase();
                    } else {
                         // Convert string → hex
                         domainHex = xrpl.convertStringToHex(domainInput);
                    }

                    this.utilsService.setDomainId(tx, domainHex);
               }

               const credentials = this.credentialStore.credentialIDs();
               if (credentials && credentials.length > 0) {
                    tx.CredentialIDs = credentials;
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
               const memoField = this.xrplTxOptionsStore.memos();
               if (memoField && memoField.length > 0) {
                    this.utilsService.setMemoField1(tx, memoField);
               }
          }
     }
}
