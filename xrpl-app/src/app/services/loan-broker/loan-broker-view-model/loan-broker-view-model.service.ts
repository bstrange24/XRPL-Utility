import { computed, inject, Injectable, signal } from '@angular/core';
import { LoanBrokerActionTypes, LoanBrokerDisplayItem, LoanBrokerInfoData } from '../../../components/loan-broker/constants/loan-broker.types';
import { LoanBrokerStoreService } from '../loan-broker-store/loan-broker-store.service';
import { LoanBrokerUtilService } from '../loan-broker-util/loan-broker-util.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../transaction-dropdown/transaction-dropdown.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { SelectItem } from '../../../components/shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';

@Injectable({
     providedIn: 'root',
})
export class LoanBrokerViewModelService {
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly loanBrokerUtilService = inject(LoanBrokerUtilService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly utilsService = inject(UtilsService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);

     readonly activeTab = signal<LoanBrokerActionTypes>('createBroker');
     readonly selectedDestinationAddress = signal<string>('');
     readonly selectedDestinationTag = signal<number | null>(null);
     readonly destinationSearchQuery = signal<string>('');

     // Destination dropdown signals
     private readonly _allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     private readonly _destinationMap = this.transactionDropdownService.destinationMap(this._allDestinations);
     private readonly _destinationItems = this.transactionDropdownService.destinationItems(this._allDestinations);
     private readonly _selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this._destinationMap, this._destinationItems);

     // Unwrapped accessors for templates
     destinationItems() {
          return this._destinationItems();
     }

     selectedDestinationItem() {
          return this._selectedDestinationItem();
     }

     readonly currentWalletData = computed(() => {
          const currentAddr = this.walletManagerService.getSelectedWallet()?.address;
          if (!currentAddr) return null;

          const wallet = this.walletManagerService.wallets().find(w => w.address === currentAddr);
          if (!wallet?.address) return null;

          return {
               address: wallet.address,
               name: wallet.name || wallet.address.slice(0, 10) + '...',
          };
     });

     readonly explorerLinks = computed(() => {
          const tab = this.activeTab();
          if (tab !== 'createBroker') return null;

          const wallet = this.currentWalletData();
          if (!wallet) return null;

          const base = this.txUiService.explorerUrl();
          const addr = wallet.address;

          const links: string[] = [];

          if (this.loanBrokerStoreService.existingBrokers().length > 0) {
               links.push(`<a href="${base}account/${addr}/loanbrokers" target="_blank" rel="noopener" class="xrpl-win-link">View Loan Brokers</a>`);
          }

          return links.length > 0 ? links.join(' | ') : null;
     });

     readonly infoData = computed((): LoanBrokerInfoData | null => {
          const wallet = this.currentWalletData();
          if (!wallet) return null;

          const existingBrokers = this.loanBrokerStoreService.existingBrokers() || [];
          const activeTab = this.activeTab();

          return {
               walletName: wallet.name,
               brokerCount: existingBrokers.length,
               brokersToShow: this.getBrokersForTab(existingBrokers, activeTab),
               links: this.explorerLinks(),
               activeTab: activeTab,
          };
     });

     private getBrokersForTab(brokers: LoanBrokerDisplayItem[], tab: LoanBrokerActionTypes): LoanBrokerDisplayItem[] {
          const currentAddress = this.currentWalletData()?.address;
          if (!currentAddress) return [];

          switch (tab) {
               case 'createBroker':
               case 'modifyBroker':
                    // Only brokers this wallet created/owns
                    // return brokers.filter(broker => broker.owner === currentAddress || broker.Account === currentAddress);
                    return brokers;
               default:
                    return brokers;
          }
     }
}
