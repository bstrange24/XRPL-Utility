import { inject, Injectable, signal } from '@angular/core';
import { AccountConfiguratorStoreService } from '../account-configurator-store/Account-configurator-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { AccountConfiguratorUtilService } from '../account-configurator-util/account-configurator-util.service';

@Injectable({
  providedIn: 'root',
})
export class AccountConfiguratorViewModelService {
  private accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     private accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     private walletManager = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
          readonly activeTab = signal<'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey'>('modifyAccountFlags');

}
