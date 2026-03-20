import { computed, inject, Injectable, signal } from '@angular/core';
import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { ACCOUNT_CONFIG_ACTIONS, AccountConfigAction } from '../../../components/account-configurator/constants/account-configurator.types';
import { StorageService } from '../../local-storage/storage.service';
import { FLAG_LABELS } from '../../../components/account-configurator/constants/account-configurator.flags';

@Injectable({
     providedIn: 'root',
})
export class AccountConfiguratorViewModelService {
     private readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     private readonly walletManager = inject(WalletManagerService);
     public readonly storageService = inject(StorageService);

     readonly activeTab = signal<AccountConfigAction>(ACCOUNT_CONFIG_ACTIONS.MODIFY_ACCOUNT_FLAGS);
     accountInfo = signal<any>(null);
     readonly enabledFlagLabels = computed(() => {
          const accountFlags = this.accountInfo()?.result?.account_flags;
          if (!accountFlags) return [];

          return Object.entries(accountFlags)
               .filter(([_, value]) => value === true)
               .map(([key]) => FLAG_LABELS[key] || key);
     });

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
          }

          // === Deposit Auth ===
          if (this.accountConfiguratorStoreService.depositAuthEnabled()) {
               const preauthCount = this.accountConfiguratorStoreService.depositAuthAddresses().filter((a: { account: any }) => a.account).length;
               if (preauthCount > 0) {
                    messageParts.push(`Deposit Authorization enabled (${preauthCount} preauthorized account${preauthCount > 1 ? 's' : ''})`);
               } else {
                    messageParts.push('Deposit Authorization enabled');
               }
          }

          const accountSetFeatures: string[] = [];
          if (this.accountInfo()?.result?.account_data?.TickSize) accountSetFeatures.push('Tick Size');
          if (this.accountInfo()?.result?.account_data?.TransferRate) accountSetFeatures.push('Transfer Rate');
          if (this.accountInfo()?.result?.account_data?.Domain) accountSetFeatures.push('Domain');
          if (this.accountConfiguratorStoreService.isMessageKey()) accountSetFeatures.push('Message Key');
          if (this.accountInfo()?.result?.account_data?.nfTokenMinterAddress) accountSetFeatures.push('NFT Minter');
          if (accountSetFeatures.length) {
               messageParts.push(`Account settings configured: ${accountSetFeatures.join(', ')}`);
          }

          // === Irreversible flags ===
          const irreversible: string[] = [];
          if (accountFlags?.noFreeze) irreversible.push('No Freeze');
          if (accountFlags?.allowTrustLineClawback) irreversible.push('Clawback');

          if (this.getEnabledFlagsCount() > 0) {
               const enabledFlagLabels = this.enabledFlagLabels();
               if (enabledFlagLabels.length > 0) {
                    messageParts.push(`Account flags configured: ${enabledFlagLabels.join(', ')}`);
               }
          }
          const irreversibleMessage = irreversible.length ? `Irreversible flags enabled: ${irreversible.join(', ')}` : null;
          const totalItems = messageParts.length + irreversible.length;
          const pluralSuffix = totalItems > 1 ? 's' : '';
          const summaryMessage = totalItems === 0 ? 'wallet has no special account configuration. All flags are in default state.' : `wallet has special account configuration (${totalItems} item${pluralSuffix}).`;

          const configItemsWithIds = messageParts.map((item, index) => ({
               id: `${wallet.address}-config-${index}-${item.substring(0, 10)}`,
               text: item,
          }));

          return {
               walletName,
               summaryMessage,
               hasSpecialConfig: totalItems > 0,
               configItems: configItemsWithIds,
               irreversibleMessage,
               hasIrreversible: irreversible.length > 0,
          };
     });

     getEnabledFlagsCount(): number {
          const accountFlags = this.accountInfo()?.result?.account_flags;
          if (!accountFlags) return 0;

          return Object.values(accountFlags).filter(value => value === true).length;
     }

     getEnabledFlags(): { label: string }[] {
          const accountFlags = this.accountInfo()?.result?.account_flags;
          if (!accountFlags) return [];

          const t = Object.entries(accountFlags)
               .filter(([_, value]) => value === true)
               .map(([key]) => ({
                    label: FLAG_LABELS[key] || key, // Fallback to key if no label found
               }));
          return t;
     }
}
