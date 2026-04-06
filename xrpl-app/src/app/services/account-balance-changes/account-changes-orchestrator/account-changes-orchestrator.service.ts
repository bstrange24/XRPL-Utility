import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { BalanceChange } from '../../../models/interface-items.model';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { AccountChangesStoreService } from '../account-changes-store/account-changes-store.service';

@Injectable({
     providedIn: 'root',
})
export class AccountChangesOrchestratorService {
     private readonly store = inject(AccountChangesStoreService);
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly utilsService = inject(UtilsService);
     private readonly xrplService = inject(XrplService);
     private readonly xrplCache = inject(XrplCacheService);

     private readonly PAGE_SIZE = 25;
     private readonly seenHashes = new Set<string>();
     private marker: any = undefined;

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

               const txResponse = await this.xrplService.getAccountTransactions(env.client, env.wallet.classicAddress, this.PAGE_SIZE, this.marker);

               const txs = txResponse?.result?.transactions ?? [];

               if (!txs.length) {
                    this.store.setField('hasMoreData', false);
                    return;
               }

               const processed = this.processTransactions(txs, env.wallet.classicAddress);

               const newEntries: BalanceChange[] = [];
               for (const entry of processed) {
                    if (!this.seenHashes.has(entry.hash)) {
                         this.seenHashes.add(entry.hash);
                         newEntries.push(entry);
                    }
               }

               if (newEntries.length) {
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

               const timestamp = (tx.date + AppConstants.RIPPLE_EPOCH_OFFSET) * 1000;
               const date = new Date(timestamp);
               const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

               const hash = txWrapper.hash;
               const feeXrp = xrpl.dropsToXrp(tx.Fee);
               const type = tx.TransactionType;
               const counterparty = tx.Destination || tx.Account || 'XRPL';

               for (const node of meta.AffectedNodes) {
                    const modified = node.ModifiedNode || node.CreatedNode || node.DeletedNode;
                    if (!modified) continue;

                    if (modified.LedgerEntryType === 'AccountRoot' && modified.FinalFields?.Account === address) {
                         const prev = modified.PreviousFields?.Balance ?? modified.FinalFields.Balance;
                         const final = modified.FinalFields.Balance;

                         const prevXrp = xrpl.dropsToXrp(prev);
                         const finalXrp = xrpl.dropsToXrp(final);
                         const delta = this.utilsService.roundToEightDecimals(finalXrp - prevXrp);

                         processed.push({
                              date: utcDate,
                              hash,
                              type,
                              fees: Number(feeXrp),
                              change: delta,
                              currency: 'XRP',
                              balanceBefore: prevXrp,
                              balanceAfter: finalXrp,
                              counterparty,
                              _searchIndex: `${type} ${delta} XRP ${hash}`.toLowerCase(),
                         });
                    }
               }
          }

          return processed;
     }
}
