import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { AccountChangesStoreService } from '../account-changes-store/account-changes-store.service';
import { BalanceChange } from '../../../components/account-balance-changes/constants/account-balance.types';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { AccountChangesViewModelService } from '../account-changes-view-model/account-changes-view-model.service';

@Injectable({
     providedIn: 'root',
})
export class AccountChangesOrchestratorService {
     private readonly store = inject(AccountChangesStoreService);
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly xrplService = inject(XrplService);
     private readonly xrplCache = inject(XrplCacheService);
     private readonly xrplDateService = inject(XrplDateService);
     private readonly view = inject(AccountChangesViewModelService);

     private readonly PAGE_SIZE = 25;
     private readonly seenHashes = new Set<string>();
     private marker: unknown = undefined;

     async loadBalanceChanges(reset = true): Promise<void> {
          if (reset && this.store.loadingInitial()) return;
          if (!reset && this.store.loadingMore()) return;

          if (reset) {
               this.store.resetForNewLoad();
               this.marker = undefined;
               this.seenHashes.clear();
          } else {
               this.store.setField('loadingMore', true);
          }

          try {
               const env = await this.txEnvironmentService.prepareTxEnvironment({
                    includeAccountInfo: true,
                    forceRefresh: reset,
               });

               if (!this.store.hasMoreData()) return;

               const txResponse = await this.xrplService.getAccountTransactions(env.client, env.wallet.classicAddress, this.PAGE_SIZE, this.marker as string);

               const txs = txResponse?.result?.transactions ?? [];

               if (!txs.length) {
                    this.store.setField('hasMoreData', false);
                    return;
               }

               const pageHashes = new Set<string>();
               const unseenTransactions = txs.filter((transaction: any) => {
                    const hash = transaction.hash;
                    if (!hash || this.seenHashes.has(hash) || pageHashes.has(hash)) return false;
                    pageHashes.add(hash);
                    return true;
               });
               const newEntries = this.processTransactions(unseenTransactions, env.wallet.classicAddress);

               for (const hash of pageHashes) {
                    this.seenHashes.add(hash);
               }

               if (newEntries.length > 0) {
                    this.store.appendBalanceChanges(newEntries);
               }

               this.marker = txResponse.result.marker;
               if (!this.marker) {
                    this.store.setField('hasMoreData', false);
               }
          } catch (err) {
               console.error('[AccountChangesOrchestrator] Failed to load balance changes:', err);
               this.txUiService.setError('Failed to load balance changes.');
          } finally {
               this.store.setField('loadingInitial', false);
               this.store.setField('loadingMore', false);
          }
     }

     invalidateCacheAndReload(address: string): void {
          this.xrplCache.invalidateAccountCache(address);
          this.loadBalanceChanges(true);
     }

     processTransactions(transactions: any[], address: string): BalanceChange[] {
          const processed: BalanceChange[] = [];

          for (const txWrapper of transactions) {
               const tx = txWrapper.tx_json || txWrapper.transaction;
               const meta = txWrapper.meta;
               if (!meta?.AffectedNodes) continue;

               const hash = txWrapper.hash;
               const feeXrp = xrpl.dropsToXrp(tx.Fee);
               const type = tx.TransactionType;
               const counterparty = tx.Destination || tx.Account || 'XRPL';
               const date = tx.date;

               for (const node of meta.AffectedNodes) {
                    const modified = node.ModifiedNode || node.CreatedNode || node.DeletedNode;
                    if (!modified) continue;

                    if (modified.LedgerEntryType === 'AccountRoot') {
                         const fields = node.CreatedNode ? modified.NewFields : modified.FinalFields;
                         const account = fields?.Account;
                         if (account !== address) continue;

                         const prevBalance = node.CreatedNode ? undefined : node.ModifiedNode ? modified.PreviousFields?.Balance : modified.FinalFields?.Balance;
                         const finalBalance = node.DeletedNode ? undefined : fields?.Balance;
                         const prevXrp = prevBalance ? xrpl.dropsToXrp(prevBalance) : 0;
                         const finalXrp = finalBalance ? xrpl.dropsToXrp(finalBalance) : 0;
                         const delta = this.view.roundToEightDecimals(finalXrp - prevXrp);

                         processed.push({
                              date: this.xrplDateService.fromRippleTime(date),
                              hash,
                              type,
                              fees: Number(feeXrp),
                              change: delta,
                              currency: 'XRP',
                              balanceBefore: prevXrp,
                              balanceAfter: finalXrp,
                              counterparty,
                              _searchIndex: `${type} ${delta} XRP ${feeXrp} ${hash} ${counterparty} ${prevXrp} ${finalXrp}`.toLowerCase(),
                         });
                         continue;
                    }

                    if (modified.LedgerEntryType === 'RippleState') {
                         const fields = node.CreatedNode ? modified.NewFields : modified.FinalFields;
                         const lowAccount = fields?.LowLimit?.issuer;
                         const highAccount = fields?.HighLimit?.issuer;
                         if (address !== lowAccount && address !== highAccount) continue;

                         const currentBalance = fields?.Balance;
                         const previousBalance = node.ModifiedNode ? modified.PreviousFields?.Balance ?? currentBalance : undefined;
                         const balanceBefore = Number(node.CreatedNode ? 0 : previousBalance?.value ?? currentBalance?.value ?? 0);
                         const balanceAfter = Number(node.DeletedNode ? 0 : currentBalance?.value ?? 0);
                         const isHighSide = address === highAccount;
                         const signedBefore = isHighSide ? -balanceBefore : balanceBefore;
                         const signedAfter = isHighSide ? -balanceAfter : balanceAfter;
                         const delta = this.view.roundToEightDecimals(signedAfter - signedBefore);
                         if (delta === 0) continue;

                         const rawCurrency = currentBalance?.currency ?? previousBalance?.currency;
                         if (!rawCurrency) continue;
                         const currency = this.normalizeCurrencyCode(rawCurrency);
                         const peer = isHighSide ? lowAccount : highAccount;

                         processed.push({
                              date: this.xrplDateService.fromRippleTime(date),
                              hash,
                              type,
                              fees: Number(feeXrp),
                              change: delta,
                              currency,
                              balanceBefore: signedBefore,
                              balanceAfter: signedAfter,
                              counterparty: peer || counterparty,
                              _searchIndex: `${type} ${delta} ${currency} ${feeXrp} ${hash} ${peer || counterparty} ${signedBefore} ${signedAfter}`.toLowerCase(),
                         });
                    }
               }
          }

          return processed;
     }

     private normalizeCurrencyCode(currency: string): string {
          if (!/^[a-fA-F0-9]{40}$/.test(currency)) return currency;
          const hex = currency.replace(/(00)+$/g, '');
          if (hex.startsWith('03')) return `LP Token ${hex}`;

          const decoded = xrpl.convertHexToString(hex).replace(/\0/g, '').trim();
          const isPrintable = /^[\x20-\x7E]+$/.test(decoded);
          return isPrintable && /[a-zA-Z0-9]{3,}/.test(decoded) && decoded.toLowerCase() !== 'xrp' ? decoded : currency;
     }
}

// import { inject, Injectable } from '@angular/core';
// import * as xrpl from 'xrpl';
// import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
// import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
// import { XrplService } from '../../xrpl-services/xrpl.service';
// import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
// import { AccountChangesStoreService } from '../account-changes-store/account-changes-store.service';
// import { BalanceChange } from '../../../components/account-balance-changes/constants/account-balance.types';
// import { XrplDateService } from '../../../core/xrpl-date.service';
// import { AccountChangesViewModelService } from '../account-changes-view-model/account-changes-view-model.service';

// @Injectable({
//      providedIn: 'root',
// })
// export class AccountChangesOrchestratorService {
//      private readonly store = inject(AccountChangesStoreService);
//      private readonly txEnvironmentService = inject(TxEnvironmentService);
//      private readonly txUiService = inject(TransactionUiService);
//      private readonly xrplService = inject(XrplService);
//      private readonly xrplCache = inject(XrplCacheService);
//      private readonly xrplDateService = inject(XrplDateService);
//      private readonly view = inject(AccountChangesViewModelService);

//      private readonly PAGE_SIZE = 25;
//      private readonly seenHashes = new Set<string>();
//      private marker: unknown = undefined;

//      async loadBalanceChanges(reset = true): Promise<void> {
//           if (reset && this.store.loadingInitial()) return;
//           if (!reset && this.store.loadingMore()) return;

//           if (reset) {
//                this.store.resetForNewLoad();
//                this.marker = undefined;
//                this.seenHashes.clear();
//           } else {
//                this.store.setField('loadingMore', true);
//           }

//           try {
//                const env = await this.txEnvironmentService.prepareTxEnvironment({
//                     includeAccountInfo: true,
//                     forceRefresh: reset,
//                });

//                if (!this.store.hasMoreData()) return;

//                const txResponse = await this.xrplService.getAccountTransactions(env.client, env.wallet.classicAddress, this.PAGE_SIZE, this.marker as string);

//                const txs = txResponse?.result?.transactions ?? [];

//                if (!txs.length) {
//                     this.store.setField('hasMoreData', false);
//                     return;
//                }

//                const processed = this.processTransactions(txs, env.wallet.classicAddress);

//                const newEntries: BalanceChange[] = [];
//                for (const entry of processed) {
//                     if (!this.seenHashes.has(entry.hash)) {
//                          this.seenHashes.add(entry.hash);
//                          newEntries.push(entry);
//                     }
//                }

//                if (newEntries.length) {
//                     this.store.appendBalanceChanges(newEntries);
//                }

//                this.marker = txResponse.result.marker;
//                if (!this.marker) {
//                     this.store.setField('hasMoreData', false);
//                }
//           } catch (err) {
//                console.error('[AccountChangesOrchestrator] Failed to load balance changes:', err);
//                this.txUiService.setError('Failed to load balance changes.');
//           } finally {
//                this.store.setField('loadingInitial', false);
//                this.store.setField('loadingMore', false);
//           }
//      }

//      invalidateCacheAndReload(address: string): void {
//           this.xrplCache.invalidateAccountCache(address);
//           this.loadBalanceChanges(true);
//      }

//      processTransactions(transactions: any[], address: string): BalanceChange[] {
//           const processed: BalanceChange[] = [];

//           for (const txWrapper of transactions) {
//                const tx = txWrapper.tx_json || txWrapper.transaction;
//                const meta = txWrapper.meta;
//                if (!meta?.AffectedNodes) continue;

//                const hash = txWrapper.hash;
//                const feeXrp = xrpl.dropsToXrp(tx.Fee);
//                const type = tx.TransactionType;
//                const counterparty = tx.Destination || tx.Account || 'XRPL';

//                for (const node of meta.AffectedNodes) {
//                     const modified = node.ModifiedNode || node.CreatedNode || node.DeletedNode;
//                     if (!modified) continue;

//                     if (modified.LedgerEntryType === 'AccountRoot' && modified.FinalFields?.Account === address) {
//                          const prev = modified.PreviousFields?.Balance ?? modified.FinalFields.Balance;
//                          const final = modified.FinalFields.Balance;

//                          const prevXrp = xrpl.dropsToXrp(prev);
//                          const finalXrp = xrpl.dropsToXrp(final);
//                          const delta = this.view.roundToEightDecimals(finalXrp - prevXrp);

//                          processed.push({
//                               date: this.xrplDateService.fromRippleTime(tx.date),
//                               hash,
//                               type,
//                               fees: Number(feeXrp),
//                               change: delta,
//                               currency: 'XRP',
//                               balanceBefore: prevXrp,
//                               balanceAfter: finalXrp,
//                               counterparty,
//                               _searchIndex: `${type} ${delta} XRP ${hash}`.toLowerCase(),
//                          });
//                     }
//                }
//           }

//           return processed;
//      }
// }
