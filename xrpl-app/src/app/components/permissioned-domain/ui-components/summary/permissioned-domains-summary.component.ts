import { Component, input, output, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';

export interface PermissionedDomainItem {
     index: string;
     Domain?: string;
     AcceptedCredentials: {
          CredentialType: string;
          Issuer: string;
     }[];
}

@Component({
     selector: 'app-permissioned-domains-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent],
     templateUrl: './permissioned-domains-summary.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionedDomainsSummaryComponent {
     public copyUtilService = inject(CopyUtilService);
     private readonly txUiService = inject(TransactionUiService);
     public utilsService = inject(UtilsService);
     public permissionedDomainStoreService = inject(PermissionedDomainStoreService);

     // Inputs
     info = input.required<
          | {
                 walletName: string;
                 permissionedDomainCount: number;
                 permissionedDomainsToShow: PermissionedDomainItem[];
            }
          | null
          | undefined
     >();

     tab = input.required<'setPermissionedDomain' | 'deletePermissionedDomain'>();
     summaryMessage = input.required<string>();
     infoPanelExpanded = input<boolean>(false); // Made optional with default

     // Outputs
     toggleInfoPanel = output<void>();

     // Helpers
     explorerUrl = this.txUiService.explorerUrl;

     emptyStateMessage = computed(() => {
          const infoData = this.info();
          const count = infoData?.permissionedDomainCount || 0;

          if (count > 0) return '';

          const currentTab = this.tab();

          if (currentTab === 'setPermissionedDomain') {
               return 'This wallet has not created any Permissioned Domains yet.';
          } else {
               return 'This wallet has no Permissioned Domains to delete.';
          }
     });

     isSelected(domainIndex: string): boolean {
          if (this.tab() === 'setPermissionedDomain') {
               return false;
          }
          return domainIndex === this.permissionedDomainStoreService.selectedDomainId();
     }

     selectDomain(domain: PermissionedDomainItem) {
          // Don't allow selection on setPermissionedDomain tab (create tab)
          if (this.tab() === 'setPermissionedDomain') {
               return;
          }
          this.toggleInfoPanel.emit();
          this.permissionedDomainStoreService.setField('selectedDomainId', domain.index);
     }

     groupCredentialsByIssuer(credentials: { CredentialType: string; Issuer: string }[]) {
          if (!credentials || credentials.length === 0) return [];

          const groups = new Map<string, Set<string>>();

          credentials.forEach(cred => {
               const types = groups.get(cred.Issuer) ?? new Set();
               types.add(cred.CredentialType);
               groups.set(cred.Issuer, types);
          });

          return Array.from(groups.entries()).map(([issuer, types]) => ({
               issuer,
               types: Array.from(types),
          }));
     }
}
