import { computed, inject, Injectable, signal } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { AccountChangesStoreService } from '../account-changes-store/account-changes-store.service';

@Injectable({
     providedIn: 'root',
})
export class AccountChangesViewModelService {
     private readonly walletManager = inject(WalletManagerService);
     private readonly store = inject(AccountChangesStoreService);
     private readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     readonly hasWallets = computed(() => this.walletManager.wallets().length > 0);
     activeTab = signal<any>('accountBalance');

     readonly filteredBalanceChanges = computed(() => {
          const data = this.store.balanceChanges();
          const text = this.store.filterValue();
          const { start, end } = this.store.dateRange();
          const direction = this.store.direction();
          const transactionType = this.store.transactionType();
          const currency = this.store.currency();
          const changeRange = this.store.changeRange();
          const feeRange = this.store.feeRange();

          return data.filter(item => {
               const inRange = this.isInDateRange(item.date, start, end);
               const matchesText = !text || item._searchIndex?.includes(text);
               const matchesDirection = direction === 'all' || (direction === 'incoming' && item.change > 0) || (direction === 'outgoing' && item.change < 0);
               const matchesType = !transactionType || item.type === transactionType;
               const matchesCurrency = !currency || item.currency === currency;
               const matchesChange = this.isWithinRange(item.change, changeRange.min, changeRange.max);
               const matchesFee = this.isWithinRange(item.fees, feeRange.min, feeRange.max);
               return matchesText && inRange && matchesDirection && matchesType && matchesCurrency && matchesChange && matchesFee;
          });
     });

     readonly transactionTypes = computed(() => [...new Set(this.store.balanceChanges().map(item => item.type))].sort((a, b) => a.localeCompare(b)));
     readonly currencies = computed(() => [...new Set(this.store.balanceChanges().map(item => item.currency))].sort((a, b) => a.localeCompare(b)));

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
               case 'PaymentChannelFund':
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
               case 'AMMBid':
               case 'AMMVote':
               case 'AMMClawback':
               case 'Clawback':
                    return '#79BDD8';

               case 'XChainCreateBridge':
               case 'XChainModifyBridge':
               case 'XChainCreateClaimID':
               case 'XChainAddClaimAttestation':
               case 'XChainAddAccountCreateAttestation':
                    return '#ac7bd4ff';

               case 'XChainCommit':
               case 'XChainAccountCreateCommit':
               case 'XChainClaim':
                    return '#8BE684';

               case 'LoanSet':
               case 'LoanDelete':
               case 'LoanOfferCreate':
               case 'LoanOfferCancel':
               case 'LoanTake':
               case 'LoanPay':
                    return '#BAD47B';

               case 'LoanBrokerCoverDeposit':
               case 'LoanBrokerCoverWithdraw':
               case 'LoanBrokerCoverClaim':
               case 'LoanBrokerCoverClose':
               case 'LoanBrokerCoverLiquidate':
               case 'LoanBrokerSet':
               case 'LoanManage':
               case 'LoanBrokerDelete':
               case 'LoanBrokerCoverCreate':
               case 'LoanBrokerCoverClawback':
                    return '#f0874bff';

               case 'VaultSet':
               case 'VaultCreate':
               case 'VaultModify':
               case 'VaultDeposit':
               case 'VaultWithdraw':
               case 'VaultClawback':
               case 'VaultDelete':
                    return '#79BDD8';

               case 'SignerListSet':
               case 'DIDSet':
               case 'DIDDelete':
               case 'AccountSet':
               case 'AccountDelete':
               case 'SetRegularKey':
               case 'MPTokenIssuanceDestroy':
               case 'DelegateSet':
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
                    return '#9CA3AF';
          }
     }

     private isInDateRange(date: Date, start: Date | null, end: Date | null): boolean {
          const txTime = new Date(date).getTime();
          if (start && txTime < start.getTime()) return false;
          if (end && txTime > end.getTime()) return false;
          return true;
     }

     private isWithinRange(value: number, min: number | null, max: number | null): boolean {
          return (min === null || value >= min) && (max === null || value <= max);
     }

     roundToEightDecimals(value: number): number {
          return Number.parseFloat(value.toFixed(8));
     }
}
