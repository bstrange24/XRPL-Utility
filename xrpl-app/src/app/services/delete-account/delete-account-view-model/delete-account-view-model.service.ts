import { computed, inject, Injectable, signal } from '@angular/core';
import * as xrpl from 'xrpl';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { DeleteAccountStoreService } from '../delete-account-store/delete-account-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { AccountDeleteTxType, Blocker } from '../../../components/delete-account/constants/delete-account.types';
import { BLOCKER_MAP } from '../../../components/delete-account/constants/delete-account.ui';

@Injectable({
     providedIn: 'root',
})
export class DeleteAccountViewModelService {
     private readonly walletManager = inject(WalletManagerService);
     private readonly deleteAccountStoreService = inject(DeleteAccountStoreService);
     public readonly txUiService = inject(TransactionUiService);
     readonly activeTab = signal<AccountDeleteTxType>('deleteAccount');

     readonly accountObjectCounts = computed(() => {
          const blockingObjects = this.deleteAccountStoreService.blockingObjects()?.result?.account_objects ?? [];
          const counts: Record<string, number> = {};
          for (const obj of blockingObjects) {
               const type = obj.LedgerEntryType;
               counts[type] = (counts[type] || 0) + 1;
          }
          return counts;
     });

     readonly blockersFromObjects = computed(() => {
          const counts = this.accountObjectCounts();
          const arr: { label: string; count: number; route: string; tab?: string }[] = [];
          for (const [type, count] of Object.entries(counts)) {
               const meta = BLOCKER_MAP[type] || { label: type, route: '#' };
               arr.push({ label: meta.label, count, route: meta.route, tab: meta.tab });
          }
          return arr;
     });

     readonly blockersFromAccountData = computed(() => {
          const acc = this.deleteAccountStoreService.accountInfo()?.result?.account_data;
          if (!acc) return [];
          const arr: { label: string; count: number; route: string; tab?: string }[] = [];

          if (acc.RegularKey) {
               arr.push({ label: 'Regular Key', count: 1, route: '/account-configurator', tab: 'modifyRegularKey' });
          }
          if (acc.SignerList) {
               arr.push({ label: 'Signer List', count: 1, route: '/account-configurator', tab: 'modifySignerList' });
          }
          return arr;
     });

     readonly ledgerWaitBlocker = computed(() => {
          const acc = this.deleteAccountStoreService.accountInfo()?.result?.account_data;
          const srv = this.deleteAccountStoreService.serverInfo()?.result?.info?.validated_ledger;
          if (!acc || !srv) return [];
          const lastTxLedger = Number(acc.PreviousTxnLgrSeq ?? 0);
          const currentLedger = Number(srv?.seq ?? 0);
          if (lastTxLedger <= 0 || currentLedger <= 0) return [];
          const ledgersSince = currentLedger - lastTxLedger;
          const remaining = 256 - ledgersSince;
          if (remaining <= 0) return [];
          return [
               {
                    label: `Wait ${remaining} more ledgers (~${Math.ceil((remaining * 4) / 60)} min)`,
                    count: 1,
                    route: '#',
               },
          ];
     });

     readonly blockersList = computed<Blocker[]>(() => [...this.blockersFromObjects(), ...this.blockersFromAccountData(), ...this.ledgerWaitBlocker()]);

     readonly balanceWarning = computed(() => {
          const acc = this.deleteAccountStoreService.accountInfo()?.result?.account_data;
          const srv = this.deleteAccountStoreService.serverInfo()?.result?.info?.validated_ledger;
          if (!acc || !srv) return null;

          const balanceXrp = Number(xrpl.dropsToXrp(String(acc.Balance)));
          const reserveBase = Number(srv.reserve_base_xrp ?? 10);
          const reserveInc = Number(srv.reserve_inc_xrp ?? 2);
          const ownerCount = Number(acc.OwnerCount ?? 0);
          const deleteFee = 2;
          const reserveRequired = reserveBase + ownerCount * reserveInc;

          if (balanceXrp < reserveRequired + deleteFee) {
               return `Balance too low. Minimum ${(reserveRequired + deleteFee).toFixed(6)} XRP required.`;
          }
          return null;
     });

     readonly canDelete = computed(() => this.blockersList().length === 0 && !this.balanceWarning());

     readonly infoData = computed(() => ({
          walletName: this.walletManager.getSelectedWallet()?.name || 'Selected wallet',
          canDelete: this.canDelete(),
          blockers: this.blockersList(),
          balanceWarning: this.balanceWarning(),
     }));

     readonly deleteBlockers = computed(() => this.blockersList());

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for confirmation...';
               return this.txUiService.stepMessage();
          });
     }

     readonly deleteWalletButtonLabel = this.buildTxLabel('Delete Wallet');

     readonly summaryMessage = computed(() => {
          const info = this.infoData();
          if (info.canDelete) {
               return `<span> wallet <strong>can be deleted</strong> — no blockers found.</span>`;
          } else if (info.blockers.length === 0) {
               return `<span> wallet is ready for deletion (after final checks).</span>`;
          } else {
               return `<span> wallet has <strong>${info.blockers.length}</strong> configuration blocker${info.blockers.length === 1 ? '' : 's'} preventing deletion.</span>`;
          }
     });
}
