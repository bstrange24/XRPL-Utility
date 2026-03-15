import { computed, inject, Injectable, signal } from '@angular/core';
import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { AccountConfiguratorUtilService } from '../account-configurator-util/account-configurator-util.service';
import { ACCOUNT_CONFIG_ACTIONS, AccountConfigAction } from '../../../components/account-configurator/constants/account-configurator.types';

@Injectable({
     providedIn: 'root',
})
export class AccountConfiguratorViewModelService {
     private accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     private accountConfiguratorUtilService = inject(AccountConfiguratorUtilService);
     private walletManager = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     // readonly activeTab = signal<'modifyAccountFlags' | 'modifyDepositAuth' | 'modifyMetaData' | 'modifyMultiSigners' | 'modifyRegularKey'>('modifyAccountFlags');
     readonly activeTab = signal<AccountConfigAction>(ACCOUNT_CONFIG_ACTIONS.MODIFY_ACCOUNT_FLAGS);
     accountInfo = signal<any>(null);

     readonly infoData = computed(() => {
          const wallet = this.walletManager.getSelectedWallet();
          if (!wallet?.address) return null;
          if (!this.accountInfo()) return null;

          const walletName = wallet.name || 'selected';
          const accountFlags = this.accountInfo()?.result?.account_flags;

          // Base message parts
          const messageParts: string[] = [];

          // === Signing method detection ===
          const hasRegularKey = !!this.accountInfo()?.result?.account_data?.RegularKey;
          const masterKeyDisabled = accountFlags?.disableMasterKey;

          if (masterKeyDisabled) {
               if (this.accountConfiguratorStoreService.get('hasSignerList')) messageParts.push('Multi-signing enabled');
               if (hasRegularKey) messageParts.push('Regular Key configured');
               messageParts.push('Master key permanently disabled');
          } else {
               if (this.accountConfiguratorStoreService.get('hasSignerList')) messageParts.push('Multi-signing configured');
               if (hasRegularKey) messageParts.push('Regular Key configured');
               messageParts.push('Master key enabled');
          }

          // === Deposit Auth ===
          if (this.txUiService.depositAuthEnabled()) {
               const preauthCount = this.txUiService.depositAuthAddresses().filter(a => a.account).length;
               if (preauthCount > 0) {
                    messageParts.push(`Deposit Authorization enabled (${preauthCount} preauthorized account${preauthCount > 1 ? 's' : ''})`);
               } else {
                    messageParts.push('Deposit Authorization enabled');
               }
          }

          // === Irreversible flags ===
          const irreversible: string[] = [];
          if (accountFlags?.noFreeze) irreversible.push('No Freeze');
          if (accountFlags?.allowTrustLineClawback) irreversible.push('Clawback');

          return {
               walletName,
               hasSpecialConfig: messageParts.length > 0 || irreversible.length > 0,
               configItems: messageParts,
               irreversibleFlags: irreversible,
               hasIrreversible: irreversible.length > 0,
          };
     });
}
