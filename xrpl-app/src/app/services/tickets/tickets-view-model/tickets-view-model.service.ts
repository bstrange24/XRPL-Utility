import { computed, inject, Injectable, signal } from '@angular/core';
import { TicketActionTypes } from '../../../components/tickets/constants/tickets.types';
import { ChecksStoreService } from '../../checks/checks-store/checks-store.service';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustline-currency/trustline-util/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TicketsUtilService } from '../tickets-util/tickets-util.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';

@Injectable({
     providedIn: 'root',
})
export class TicketsViewModelService {
     public readonly checksStoreService = inject(ChecksStoreService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly ticketsUtilService = inject(TicketsUtilService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     readonly activeTab = signal<TicketActionTypes>('createTicket');

     readonly infoData = computed(() => {
          const currentAddr = this.walletManagerService.getSelectedWallet()?.address;
          if (!currentAddr) return null;

          const wallet = this.walletManagerService.wallets().find(w => w.address === currentAddr);
          if (!wallet?.address) return null;

          const name = wallet.name || 'Selected wallet';
          const count = this.xrplTxOptionsStore.walletTicketCount();
          const label = this.activeTab() === 'createTicket' ? 'available Tickets for use.' : 'Tickets that can be deleted.';

          return `<code>${name}</code> wallet has <strong class="object-count">${count}</strong> ${label}`;
     });

     readonly hasWalletsSignal = this.walletManagerService.hasWallets;

     readonly allTicketsSelected = this.ticketsUtilService.getAllTicketsSelected(this.xrplTxOptionsStore.ticketArray(), this.xrplTxOptionsStore.selectedTicketSequences());

     readonly hasSelectedTickets = computed(() => this.xrplTxOptionsStore.selectedTicketSequences().length > 0);
}
