import { computed, inject, Injectable, signal } from '@angular/core';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { UtilsService } from '../../utils/util-service/utils.service';

@Injectable({
     providedIn: 'root',
})
export class SendXrpViewModelService {
     public readonly walletManager = inject(WalletManagerService);
     public readonly utilsService = inject(UtilsService);
     activeTab = signal<any>('sendXrp');

     constructor() {}

     // Current wallet
     currentWallet = computed(() => this.walletManager.walletVm());

     // Info data for template
     readonly infoData = computed(() => {
          const currentAddr = this.currentWallet()?.address;
          if (!currentAddr) return null;

          const wallet = this.walletManager.wallets().find(w => w.address === currentAddr);
          if (!wallet?.address) return null;

          const walletName = wallet.name || 'Selected wallet';

          if (!wallet.balance) {
               return `<code>${walletName}</code> wallet is ready to send XRP.`;
          }

          return `<code>${walletName}</code> wallet has <strong class="object-count">${wallet.balance} XRP</strong> available for sending.`;
     });
}
