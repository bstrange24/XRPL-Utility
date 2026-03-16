import { computed, inject, Injectable, signal } from '@angular/core';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { PermissionedDomainStoreService } from '../permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainInfo, PermissionedDomainTab } from '../../../components/permissioned-domain/constants/permissioned-domain.types';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import * as xrpl from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class PermissionedDomainViewModelService {
     private readonly walletManager = inject(WalletManagerService);
     private readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly txUiService = inject(TransactionUiService);

     readonly activeTab = signal<PermissionedDomainTab>('setDomain');

     readonly infoData = computed<PermissionedDomainInfo | null>(() => {
          const wallet = this.walletManager.walletVm(); // or currentWallet signal if you have it
          if (!wallet?.address) return null;

          const tab = this.activeTab();
          const domains = this.permissionedDomainStoreService.get('createdPermissionedDomains') ?? [];

          return {
               walletName: wallet.name || 'Selected wallet',
               mode: tab,
               permissionedDomainCount: domains.length,
               permissionedDomainsToShow: domains,
               actionButtonLabel: this.actionButtonLabel(tab),
               actionButtonClass: this.actionButtonClass(tab),
          };
     });

     readonly summaryMessage = computed(() => {
          const info = this.infoData();
          if (!info) return '';

          const count = info.permissionedDomainCount;

          if (count === 0) {
               return 'has no permissioned domains.';
          }

          return `has issued <strong class="object-count">${count}</strong> permissioned domain${count === 1 ? '' : 's'}. `;
     });

     getCreatedPermissionedDomains(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'PermissionedDomain' && obj.Owner === sender)
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         AcceptedCredentials: obj.AcceptedCredentials
                              ? JSON.stringify(
                                     obj.AcceptedCredentials.map(
                                          (item: {
                                               Credential: {
                                                    CredentialType: any;
                                                    Issuer?: string; // Assuming Issuer exists in the original data
                                               };
                                          }) => ({
                                               ...item,
                                               Credential: {
                                                    ...item.Credential,
                                                    CredentialType: Buffer.from(item.Credential.CredentialType, 'hex').toString('utf8'),
                                                    Issuer: item.Credential.Issuer, // Adjust based on actual structure
                                               },
                                          })
                                     ),
                                     null,
                                     '\t'
                                )
                              : 'N/A',
                         Owner: obj.Owner,
                         Sequence: obj.Sequence,
                    };
               })
               .sort((a, b) => a.index.localeCompare(b.index));
          this.permissionedDomainStoreService.set('createdPermissionedDomains', mapped);
     }

     selectedDomainItem = computed(() => {
          const id = this.permissionedDomainStoreService.get('selectedDomainId');
          if (!id) return null;
          return this.domainItems().find((i: { id: any }) => i.id === id) || null;
     });

     domainItems = computed(() => {
          return this.permissionedDomainStoreService.get('createdPermissionedDomains').map((domain: { index: string; AcceptedCredentials: string | any[] }) => ({
               // return this.createdPermissionedDomains().map(domain => ({
               id: domain.index,
               display: domain.index.slice(0, 10) + '...' + domain.index.slice(-8),
               secondary: domain.AcceptedCredentials ? `Credentials: ${domain.AcceptedCredentials.length}` : 'No credentials',
               // secondary: domain.index,
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
          }));
     });

     actionButtonLabel(tab: 'setDomain' | 'deleteDomain') {
          switch (tab) {
               case 'setDomain':
                    return this.setPermissionedDomainButtonLabel();
               case 'deleteDomain':
                    return this.deletePermissionedDomainButtonLabel();
          }
     }

     actionButtonClass(tab: 'setDomain' | 'deleteDomain') {
          switch (tab) {
               case 'setDomain':
                    return 'btn-primary-blue';
               case 'deleteDomain':
                    return 'btn-primary-red';
          }
     }

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for confirmation...';
               return this.txUiService.stepMessage();
          });
     }

     readonly setPermissionedDomainButtonLabel = this.buildTxLabel('Set Permissioned Domain');
     readonly deletePermissionedDomainButtonLabel = this.buildTxLabel('Delete Permissioned Domain');
}
