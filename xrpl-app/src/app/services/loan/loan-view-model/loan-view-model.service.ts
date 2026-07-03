import { computed, inject, Injectable, signal } from '@angular/core';
import { TransactionDropdownService } from '../../transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { LoanStoreService } from '../loan-store/loan-store.service';
import { LoanActionTypes, LoanDisplayItem, LoanInfoData } from '../../../components/loan/constants/loan.types';
import { LoanUtilService } from '../loan-util/loan-util.service';

@Injectable({
     providedIn: 'root',
})
export class LoanViewModelService {
     public readonly loanStoreService = inject(LoanStoreService);
     public readonly loanUtilService = inject(LoanUtilService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly utilsService = inject(UtilsService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);

     readonly activeTab = signal<LoanActionTypes>('createLoan');
     readonly selectedDestinationAddress = signal<string>('');
     readonly destinationSearchQuery = signal<string>('');

     // Destination dropdown signals
     private readonly _allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     private readonly _destinationMap = this.transactionDropdownService.destinationMap(this._allDestinations);
     private readonly _destinationItems = this.transactionDropdownService.destinationItems(this._allDestinations);
     private readonly _selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this._destinationMap, this._destinationItems);

     destinationItems() {
          return this._destinationItems();
     }

     selectedDestinationItem() {
          return this._selectedDestinationItem();
     }

     readonly currentWalletData = computed(() => {
          console.log('tab: ', this.activeTab());
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
          if (tab !== 'createLoan') return null;

          const wallet = this.currentWalletData();
          if (!wallet) return null;

          const base = this.txUiService.explorerUrl();
          const addr = wallet.address;

          const links: string[] = [];

          if (this.loanStoreService.existingLoans().length > 0) {
               links.push(`<a href="${base}account/${addr}/objects" target="_blank" rel="noopener" class="xrpl-win-link">View Loans</a>`);
          }

          return links.length > 0 ? links.join(' | ') : null;
     });

     readonly infoData = computed((): LoanInfoData | null => {
          const wallet = this.currentWalletData();
          if (!wallet) return null;

          const existingLoans = this.loanStoreService.existingLoans() || [];
          const activeTab = this.activeTab();

          return {
               walletName: wallet.name,
               loanCount: existingLoans.length,
               loansToShow: this.getLoansForTab(existingLoans, activeTab),
               links: this.explorerLinks(),
               activeTab: activeTab,
          };
     });

     private getLoansForTab(loans: LoanDisplayItem[], tab: LoanActionTypes): LoanDisplayItem[] {
          const currentAddress = this.currentWalletData()?.address;
          if (!currentAddress) return [];

          // switch (tab) {
          // case 'createLoan':
          // case 'modifyLoan':
          // case 'deleteLoan':
          //      return loans.filter(loan => loan.owner === currentAddress || loan.Account === currentAddress);

          // case 'payLoan':
          // case 'defaultLoan':
          //      return loans.filter(loan => loan.owner === currentAddress || loan.Account === currentAddress || loan.Counterparty === currentAddress);

          // default:
          //           return loans;
          // }
          return loans;
     }
}
