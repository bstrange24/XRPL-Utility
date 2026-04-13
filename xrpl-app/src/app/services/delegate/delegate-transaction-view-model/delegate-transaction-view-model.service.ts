import { computed, inject, Injectable, signal } from '@angular/core';
import { DelegateActionTypes } from '../../../components/delegate/constants/delegate.types';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { DelegateStoreService } from '../delegate-store/delegate-store.service';

@Injectable({
     providedIn: 'root',
})
export class DelegateTransactionViewModelService {
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly delegateStore = inject(DelegateStoreService);
     readonly activeTab = signal<DelegateActionTypes>('delegateCreate');

     infoData = computed(() => {
          const currentAddr = this.walletManagerService.getSelectedWallet()?.address;
          if (!currentAddr) return null;

          const wallet = this.walletManagerService.wallets().find(w => w.address === currentAddr);
          if (!wallet?.address) return null;

          const name = wallet.name || 'Selected wallet';
          const delegateActions = this.delegateStore.existingDelegations();
          const delegationCount = delegateActions.length;

          let message: string;

          if (delegationCount === 0) {
               message = `<code>${wallet?.address}</code> wallet has no delegations.`;
          } else {
               const delegationDescription = delegationCount === 1 ? 'delegation' : 'delegations';
               message = `<code>${wallet?.address}</code> wallet has <strong>${delegationCount}</strong> ${delegationDescription}.`;
          }

          return {
               address: wallet?.address,
               message,
               mode: this.activeTab(),
               delegationCount,
               existingDelegations: delegateActions,
          };
     });
}
