import { computed, inject, Injectable, signal } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { AccountChangesStoreService } from '../account-changes-store/account-changes-store.service';

@Injectable({
     providedIn: 'root',
})
export class AccountChangesViewModelService {
     private readonly store = inject(AccountChangesStoreService);
     private readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     activeTab = signal<any>('accountBalance');

     readonly filteredBalanceChanges = computed(() => {
          const data = this.store.balanceChanges();
          const text = this.store.filterValue();
          const { start, end } = this.store.dateRange();

          return data.filter(item => {
               const inRange = this.isInDateRange(item.date, start, end);
               return (!text || item._searchIndex?.includes(text)) && inRange;
          });
     });

     readonly infoData = computed(() => {
          const wallet = this.walletManagerService.getSelectedWallet();
          const txs = this.filteredBalanceChanges();

          if (!wallet?.address) {
               return `No wallet selected.`;
          }

          const walletName = wallet.name || 'Selected wallet';

          if (txs.length === 0) {
               return `<code>${walletName}</code> has no recorded balance changes yet.`;
          }

          const spendable = Number(wallet.balance || 0).toFixed(6);
          return `<code>${walletName}</code> wallet has <strong class="object-count">${spendable} XRP</strong> available for sending. <br><strong>${txs.length}</strong> balance changes loaded.`;
     });

     getTypeColor(type: string): string {
          switch (type) {
               case 'Payment':
               case 'Payment Sent':
               case 'Payment Received':
                    return '#8BE684';

               case 'PermissionedDomainSet':
               case 'PDomainSet':
               case 'PDomainDelete':
               case 'PermissionedDomainDelete':
               case 'CredentialCreate':
               case 'CredentialAccept':
               case 'DepositPreauth':
               case 'EscrowFinish':
               case 'EscrowCreate':
               case 'EscrowCancel':
               case 'MPTokenIssuanceCreate':
               case 'MPTokenIssuanceSet':
               case 'NFTokenBurn':
               case 'PaymentChannelClaim':
               case 'PaymentChannelCreate':
               case 'AMMDelete':
               case 'CredentialDelete':
                    return '#f0874bff';

               case 'TicketCreate':
               case 'Batch':
               case 'TrustSet':
               case 'MPTokenAuthorize':
               case 'AMMWithdraw':
               case 'AMMCreate':
               case 'AMMDeposit':
               case 'Clawback':
                    return '#79BDD8';

               case 'SignerListSet':
               case 'DIDSet':
               case 'DIDDelete':
               case 'AccountSet':
               case 'AccountDelete':
               case 'SetRegularKey':
               case 'MPTokenIssuanceDestroy':
                    return '#BAD47B';

               case 'NFTokenMint':
               case 'NFTokenModify':
               case 'NFTokenCancelOffer':
               case 'NFTokenCreateOffer':
               case 'NFTokenAcceptOffer':
                    return '#ac7bd4ff';

               case 'CheckCancel':
               case 'CheckCash':
               case 'CheckCreate':
               case 'OfferCreate':
               case 'OfferCancel':
                    return '#9bc5a2ff';

               default:
                    return 'white';
          }
     }

     private isInDateRange(date: Date, start: Date | null, end: Date | null): boolean {
          const txTime = new Date(date).getTime();
          if (start && txTime < start.getTime()) return false;
          if (end && txTime > end.getTime()) return false;
          return true;
     }

     roundToEightDecimals(value: number): number {
          return Number.parseFloat(value.toFixed(8));
     }
}
