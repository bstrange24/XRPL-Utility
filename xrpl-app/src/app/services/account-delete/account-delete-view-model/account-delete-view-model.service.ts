import { computed, inject, Injectable, signal } from '@angular/core';
import * as xrpl from 'xrpl';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { AccountDeleteStoreService } from '../account-delete-store/account-delete-store.service';
import { BLOCKER_MAP } from '../../../components/account-delete/constants/account-delete.ui';
import { AccountDeleteTxType, Blocker } from '../../../components/account-delete/constants/account-delete.types';

@Injectable({
     providedIn: 'root',
})
export class AccountDeleteViewModelService {
     private readonly walletManager = inject(WalletManagerService);
     private readonly deleteAccountStoreService = inject(AccountDeleteStoreService);
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
          const blockingObjects = this.deleteAccountStoreService.blockingObjects()?.result?.account_objects ?? [];
          const selectedAddress = this.walletManager.getSelectedWallet()?.classicAddress;
          const arr: Blocker[] = [];
          for (const [type, count] of Object.entries(counts)) {
               const meta = BLOCKER_MAP[type] || { label: type, route: '#' };
               const details =
                    type === 'PayChannel'
                         ? blockingObjects
                                .filter((obj: any) => obj.LedgerEntryType === type)
                                .map((obj: any) => {
                                     const creator = obj.Account === selectedAddress ? 'created by this account' : `created by ${obj.Account ?? 'another account'}`;
                                     const destination = obj.Destination === selectedAddress ? 'destination is this account' : `destination ${obj.Destination ?? 'unknown'}`;
                                     return `${creator}; ${destination}`;
                                })
                         : undefined;
               arr.push({ label: meta.label, count, route: meta.route, tab: meta.tab, details });
          }
          return arr;
     });

     readonly eligibilityIssues = computed<Blocker[]>(() => {
          const acc = this.deleteAccountStoreService.accountInfo()?.result?.account_data;
          const srv = this.deleteAccountStoreService.serverInfo()?.result?.info?.validated_ledger;
          if (!acc) return [];

          const issues: Blocker[] = [];
          const currentLedger = Number(srv?.seq ?? 0);
          const sequence = Number(acc.Sequence ?? 0);

          if (acc.Sponsor && this.deleteAccountStoreService.destination() !== acc.Sponsor) {
               issues.push({ label: `Use the account sponsor (${acc.Sponsor}) as the deletion destination`, count: 1, route: '#' });
          }

          const ownerCount = Number(acc.OwnerCount ?? 0);
          if (ownerCount > 1000) {
               issues.push({ label: `Reduce owned objects to 1,000 or fewer (currently ${ownerCount})`, count: 1, route: '#' });
          }

          const sponsoringOwnerCount = Number(acc.SponsoringOwnerCount ?? 0);
          const sponsoringAccountCount = Number(acc.SponsoringAccountCount ?? 0);
          if (sponsoringOwnerCount > 0 || sponsoringAccountCount > 0) {
               issues.push({ label: 'Resolve active reserve sponsorships before deletion', count: 1, route: '#' });
          }

          if (!srv) return issues;

          if (sequence > 0 && currentLedger > 0) {
               const remaining = sequence + 255 - currentLedger;
               if (remaining > 0) {
                    issues.push({
                         label: `Wait ${remaining} more ledgers (~${Math.ceil((remaining * 4) / 60)} min) before deletion`,
                         count: 1,
                         route: '#',
                    });
               }
          }

          const mintedNftokens = Number(acc.MintedNFTokens ?? 0);
          const firstNftSequence = Number(acc.FirstNFTokenSequence ?? 0);
          if (mintedNftokens > 0 && firstNftSequence > 0 && currentLedger > 0) {
               const remaining = firstNftSequence + mintedNftokens + 255 - currentLedger;
               if (remaining > 0) {
                    issues.push({
                         label: `Wait ${remaining} more ledgers (~${Math.ceil((remaining * 4) / 60)} min) after the NFT remint window`,
                         count: 1,
                         route: '#',
                    });
               }
          }

          return issues;
     });

     readonly blockersList = computed<Blocker[]>(() => this.blockersFromObjects());

     readonly deleteInfo = computed(() => {
          const acc = this.deleteAccountStoreService.accountInfo()?.result?.account_data;
          const srv = this.deleteAccountStoreService.serverInfo()?.result?.info?.validated_ledger;
          if (!acc || !srv) return null;

          const reserveBase = Number(srv.reserve_base_xrp ?? 10); // e.g. 1 or 10
          const reserveInc = Number(srv.reserve_inc_xrp ?? 2); // usually 0.2
          const deleteFee = reserveInc; // AccountDelete burns one owner reserve (~0.2 XRP)

          return {
               reserveBase,
               reserveInc,
               deleteFee,
               minimumBalance: deleteFee,
          };
     });

     readonly balanceWarning = computed(() => {
          const info = this.deleteInfo();
          if (!info) return null;

          const balanceXrp = Number(xrpl.dropsToXrp(String(this.deleteAccountStoreService.accountInfo()?.result?.account_data?.Balance ?? 0)));

          if (balanceXrp < info.minimumBalance) {
               return `Balance too low. At least ${info.minimumBalance.toFixed(6)} XRP is required to cover the deletion fee.`;
          }
          return null;
     });

     readonly deleteBlockers = computed<Blocker[]>(() => {
          const balanceWarning = this.balanceWarning();
          return [
               ...this.blockersList(),
               ...this.eligibilityIssues(),
               ...(balanceWarning ? [{ label: balanceWarning, count: 1, route: '#' }] : []),
          ];
     });

     readonly canDelete = computed(() => this.deleteBlockers().length === 0);

     readonly infoData = computed(() => ({
          walletName: this.walletManager.getSelectedWallet()?.name || 'Selected wallet',
          canDelete: this.canDelete(),
          blockers: this.blockersList(),
          eligibilityIssues: this.eligibilityIssues(),
          balanceWarning: this.balanceWarning(),
          deleteInfo: this.deleteInfo(),
     }));

     readonly deleteWalletButtonLabel = computed(() => 'Delete Account');

     readonly summaryMessage = computed(() => {
          const info = this.infoData();
          if (info.canDelete) {
               return `<span> wallet <strong>can be deleted</strong> — no blockers found.</span>`;
          } else {
               return `<span> wallet has deletion blockers or requirements that must be resolved.</span>`;
          }
     });
}
