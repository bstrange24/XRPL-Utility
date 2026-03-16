import { computed, inject, Injectable, signal } from '@angular/core';
import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { ACCOUNT_CONFIG_ACTIONS, AccountConfigAction } from '../../../components/account-configurator/constants/account-configurator.types';
import { StorageService } from '../../local-storage/storage.service';

@Injectable({
     providedIn: 'root',
})
export class AccountConfiguratorViewModelService {
     private readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     private readonly walletManager = inject(WalletManagerService);
     public readonly storageService = inject(StorageService);

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

          const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];

          if (masterKeyDisabled) {
               if (entries.length > 0) messageParts.push('Multi-signing enabled');
               if (hasRegularKey) messageParts.push(`Regular Key configured`);
               messageParts.push('Master key permanently disabled');
          } else {
               if (entries.length > 0) messageParts.push('Multi-signing configured');
               if (hasRegularKey) messageParts.push(`Regular Key configured`);
               messageParts.push('Master key enabled');
          }

          // === Deposit Auth ===
          if (this.accountConfiguratorStoreService.get('depositAuthEnabled')) {
               const preauthCount = this.accountConfiguratorStoreService.get('depositAuthAddresses').filter((a: { account: any }) => a.account).length;
               if (preauthCount > 0) {
                    messageParts.push(`Deposit Authorization enabled (${preauthCount} preauthorized account${preauthCount > 1 ? 's' : ''})`);
               } else {
                    messageParts.push('Deposit Authorization enabled');
               }
          }

          const accountSetFeatures: string[] = [];
          if (this.accountConfiguratorStoreService.get('tickSize')) accountSetFeatures.push('Tick Size');
          if (this.accountConfiguratorStoreService.get('transferRate')) accountSetFeatures.push('Transfer Rate');
          if (this.accountConfiguratorStoreService.get('domain')) accountSetFeatures.push('Domain');
          if (this.accountConfiguratorStoreService.get('isMessageKey')) accountSetFeatures.push('Message Key');
          if (this.accountConfiguratorStoreService.get('isNFTokenMinterEnabled')) accountSetFeatures.push('NFT Minter');
          if (accountSetFeatures.length) {
               messageParts.push(`Account settings configured: ${accountSetFeatures.join(', ')}`);
          }

          // === Irreversible flags ===
          const irreversible: string[] = [];
          if (accountFlags?.noFreeze) irreversible.push('No Freeze');
          if (accountFlags?.allowTrustLineClawback) irreversible.push('Clawback');

          const irreversibleMessage = irreversible.length ? `Irreversible flags enabled: ${irreversible.join(', ')}` : null;
          const totalItems = messageParts.length + irreversible.length;
          const summaryMessage = totalItems === 0 ? 'wallet has no special account configuration. All flags are in default state.' : `wallet has special account configuration (${totalItems} item${totalItems > 1 ? 's' : ''}).`;

          return {
               walletName,
               summaryMessage,
               hasSpecialConfig: totalItems > 0,
               configItems: messageParts,
               irreversibleMessage,
               hasIrreversible: irreversible.length > 0,
          };
     });
}
