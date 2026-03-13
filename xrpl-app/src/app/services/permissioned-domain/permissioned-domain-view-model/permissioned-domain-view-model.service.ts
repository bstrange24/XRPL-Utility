import { computed, inject, Injectable, signal } from '@angular/core';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { PermissionedDomainStoreService } from '../permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainUtilService } from '../permissioned-domain-util/permissioned-domain-util.service';
import { PermissionedDomainInfo, PermissionedDomainTab } from '../../../components/permissioned-domain/constants/permissioned-domain.constants';

@Injectable({
     providedIn: 'root',
})
export class PermissionedDomainViewModelService {
     private readonly walletManager = inject(WalletManagerService);
     private readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     private readonly permissionedDomainUtilService = inject(PermissionedDomainUtilService);

     readonly activeTab = signal<PermissionedDomainTab>('set');

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
               actionButtonLabel: this.permissionedDomainUtilService.actionButtonLabel(tab),
               actionButtonClass: this.permissionedDomainUtilService.actionButtonClass(tab),
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
}
