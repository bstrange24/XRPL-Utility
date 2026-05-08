import { computed, inject, Injectable, signal } from '@angular/core';
import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { ACCOUNT_CONFIG_ACTIONS, AccountConfigAction } from '../../../components/account-configurator/constants/account-configurator.types';
import { StorageService } from '../../shared/local-storage/storage.service';
import { FLAG_LABELS } from '../../../components/account-configurator/constants/account-configurator.flags';
import { ConfigItem } from '../../../components/account-configurator/ui-components/account-configurator-summary/account-configurator-summary.component';

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

          // Base message parts with irreversible flag
          const configItems: ConfigItem[] = [];

          // === Signing method detection ===
          const hasRegularKey = !!this.accountInfo()?.result?.account_data?.RegularKey;
          const masterKeyDisabled = accountFlags?.disableMasterKey;
          const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];

          if (masterKeyDisabled) {
               if (entries.length > 0) {
                    configItems.push({
                         id: `${wallet.address}-multi-signing`,
                         text: 'Multi-signing enabled',
                         isIrreversible: true,
                    });
               }
               if (hasRegularKey) {
                    configItems.push({
                         id: `${wallet.address}-regular-key`,
                         text: 'Regular Key configured',
                         isIrreversible: false,
                    });
               }
               configItems.push({
                    id: `${wallet.address}-master-key-disabled`,
                    text: 'Master key permanently disabled',
                    isIrreversible: true,
               });
          } else {
               if (entries.length > 0) {
                    configItems.push({
                         id: `${wallet.address}-multi-signing`,
                         text: 'Multi-signing configured',
                         isIrreversible: false,
                    });
               }
               if (hasRegularKey) {
                    configItems.push({
                         id: `${wallet.address}-regular-key`,
                         text: 'Regular Key configured',
                         isIrreversible: false,
                    });
               }
          }

          // === Deposit Auth ===
          if (this.accountConfiguratorStoreService.depositAuthEnabled()) {
               const preauthCount = this.accountConfiguratorStoreService.depositAuthAddresses().filter((a: { account: any }) => a.account).length;
               if (preauthCount > 0) {
                    configItems.push({
                         id: `${wallet.address}-deposit-auth`,
                         text: `Deposit Authorization enabled (${preauthCount} preauthorized account${preauthCount > 1 ? 's' : ''})`,
                         isIrreversible: false,
                    });
               } else {
                    configItems.push({
                         id: `${wallet.address}-deposit-auth`,
                         text: 'Deposit Authorization enabled',
                         isIrreversible: false,
                    });
               }
          }

          // AccountSet Features
          const accountSetFeatures: ConfigItem[] = [];
          if (this.accountInfo()?.result?.account_data?.TickSize) {
               accountSetFeatures.push({
                    id: `${wallet.address}-tick-size`,
                    text: 'Tick Size configured',
                    isIrreversible: false,
               });
          }
          if (this.accountInfo()?.result?.account_data?.TransferRate) {
               accountSetFeatures.push({
                    id: `${wallet.address}-transfer-rate`,
                    text: 'Transfer Rate configured',
                    isIrreversible: false,
               });
          }
          if (this.accountInfo()?.result?.account_data?.Domain) {
               accountSetFeatures.push({
                    id: `${wallet.address}-domain`,
                    text: 'Domain configured',
                    isIrreversible: false,
               });
          }
          // if (this.accountConfiguratorStoreService.isMessageKey()) {
          //      accountSetFeatures.push({
          //           id: `${wallet.address}-message-key`,
          //           text: 'Message Key configured',
          //           isIrreversible: false,
          //      });
          // }
          if (this.accountInfo()?.result?.account_data?.nfTokenMinterAddress) {
               accountSetFeatures.push({
                    id: `${wallet.address}-nft-minter`,
                    text: 'NFT Minter configured',
                    isIrreversible: false,
               });
          }

          configItems.push(...accountSetFeatures);

          // Account Flags (may be irreversible)
          if (this.getEnabledFlagsCount() > 0) {
               const enabledFlagLabels = this.enabledFlagLabels();

               const irreversibleFlags = [
                    'No Freeze',
                    'Clawback',
                    'Allow Trust Line Clawback', // ← Add this
               ];

               enabledFlagLabels.forEach((flag, index) => {
                    const isIrreversible = irreversibleFlags.includes(flag);

                    configItems.push({
                         id: `${wallet.address}-flag-${index}`,
                         text: flag,
                         isIrreversible: isIrreversible, // ← This must be boolean
                    });
               });
          }

          const hasIrreversible = configItems.some(item => item.isIrreversible);
          const irreversibleItems = configItems.filter(item => item.isIrreversible);
          const irreversibleMessage = irreversibleItems.length ? `Irreversible ${irreversibleItems.length === 1 ? 'setting' : 'settings'} enabled: ${irreversibleItems.map(i => i.text).join(', ')}` : null;

          const totalItems = configItems.length;
          const summaryMessage = totalItems === 0 ? ' has no special account configuration. All flags are in default state.' : ` has special account configuration (${totalItems} item${totalItems === 1 ? '' : 's'}).`;

          return {
               walletName,
               summaryMessage,
               hasSpecialConfig: totalItems > 0,
               configItems: configItems,
               irreversibleMessage,
               totalItems,
               hasIrreversible: hasIrreversible,
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
