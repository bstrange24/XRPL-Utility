import { computed, inject, Injectable, signal } from '@angular/core';
import { MptActionTypes } from '../../../components/mpt/constants/mpt.types';
import { ChecksStoreService } from '../../checks/checks-store/checks-store.service';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { MptUtilService } from '../mpt-util/mpt-util.service';
import { MptStoreService } from '../mpt-store/mpt-store.service';
import * as xrpl from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class MptTransactionViewModelService {
     public readonly checksStoreService = inject(ChecksStoreService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly mptStoreService = inject(MptStoreService);

     readonly activeTab = signal<MptActionTypes>('createMpt');

     /** Memoize decoded MPT metadata by issuance ID to avoid repeated decoding. */
     private readonly _metadataCache = new Map<string, any>();

     private _decodeMetadata(mpt: any): any {
          const key = mpt.mpt_issuance_id || mpt.id || '';
          if (this._metadataCache.has(key)) return this._metadataCache.get(key);
          let decoded: any;
          try {
               if (mpt.MPTokenMetadata) {
                    decoded = xrpl.decodeMPTokenMetadata(mpt.MPTokenMetadata);
               }
          } catch {
               // leave decoded undefined
          }
          this._metadataCache.set(key, decoded);
          return decoded;
     }

     loadXls89Template() {
          this.mptStoreService.setField('metaData', JSON.stringify(this.mptStoreService.XLS89_TEMPLATE, null, 2));
     }

     infoData = computed(() => {
          const wallet = this.walletManagerService.getSelectedWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const explorerBase = this.txUiService.explorerUrl();
          const address = wallet.address;

          const mpts = this.mptStoreService.existingMpts();
          const count = mpts.length;

          const links = count > 0 ? `<a href="${explorerBase}account/${address}/mpts/owned" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View MPTs</a>` : '';

          // const mptsToShow = this.infoPanelExpanded();
          const mptsToShow = true
               ? this.mptStoreService.existingMpts().map(m => {
                      const decodedMetadata = this._decodeMetadata(m);

                      return {
                           mpt_issuance_id: m.mpt_issuance_id || 'We have issues',
                           id: m.id || 'We have big issues',
                           amount: m.amount,
                           isHolder: m.isHolder,
                           maxAmount: m.MaximumAmount,
                           outstanding: m.OutstandingAmount,
                           transferFee: m.TransferFee,
                           flags: this.mptUtilService.decodeMptFlagsForUi(m.Flags || 0),

                           // New clean fields - easy to use in template
                           ticker: decodedMetadata?.ticker ? decodedMetadata?.ticker : 'N/A',
                           usefulLinks: (decodedMetadata?.uris || []).map((link: { uri: any; u: any; title: any; t: any; c: any; category: any }) => ({
                                uri: link.uri || link.u || '',
                                title: link.title || link.t || link.c || 'Link',
                                category: link.category || '',
                           })),

                           // Optional: pre-formatted HTML string for displaying links nicely
                           linkHtml:
                                (decodedMetadata?.uris || []).length > 0
                                     ? (decodedMetadata?.uris || [])
                                            .map(
                                                 (link: { u: any; t: any; c: any }) => `
                     <a href="${link.u}" target="_blank" rel="noopener noreferrer" class="mpt-link">${link.t || link.c || 'Link'}</a>`
                                            )
                                            .join(' • ')
                                     : 'No links provided',

                           // If you still want the full original JSON string (for debugging)
                           MPTokenMetadataFull: JSON.stringify(decodedMetadata, null, '\t'),
                      };
                 })
               : [];

          return {
               walletName,
               mptCount: count,
               mptsToShow,
               links,
          };
     });

     // MPT Dropdown Items
     mptItems = computed(() => {
          const t = this.mptStoreService.existingMpts().map(m => {
               const type = m.LedgerEntryType === 'MPToken' ? 'MPToken' : 'MPTokenIssuance';
               let isHolder = false;
               if (type === 'MPToken') {
                    isHolder = true;
               }
               const amount = isHolder ? m.MPTAmount || '0' : m.OutstandingAmount || '0';

               const displayAmount = amount === '0' ? '0' : amount;

               return {
                    id: m.mpt_issuance_id ? m.mpt_issuance_id : m.id,
                    // display: `MPT • ${displayAmount} ${isHolder ? 'held' : 'issued'} • ${isHolder ? `${m.MaximumAmount} outstanding` : 'issued'}`,
                    display: `MPT • ${displayAmount} ${isHolder ? 'held' : 'issued'}`,
                    secondary: m.mpt_issuance_id ? m.mpt_issuance_id.slice(0, 15) + '...' + m.mpt_issuance_id.slice(-10) : m.id.slice(0, 12) + '...' + m.id.slice(-10),
                    isCurrentAccount: false,
                    isCurrentCode: false,
                    isCurrentToken: false,
               };
          });
          return t;
     });

     selectedMptItem = computed(() => {
          const id = this.mptStoreService.mptIssuanceId();
          if (!id) return null;
          return this.mptItems().find((i: { id: string }) => i.id === id) || null;
     });

     metadataByteLength = computed(() => {
          const meta = this.mptStoreService.metaData().trim();
          if (!meta) return 0;

          try {
               // Convert to hex (same as xrpl.convertStringToHex does)
               const hex = xrpl.convertStringToHex(meta);
               return hex.length / 2; // hex string: 2 chars = 1 byte
          } catch {
               return 0;
          }
     });

     metadataIsValid = computed(() => {
          return this.metadataByteLength() <= 1024;
     });
}
