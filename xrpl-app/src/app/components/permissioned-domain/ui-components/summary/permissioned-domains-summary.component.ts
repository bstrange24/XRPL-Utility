import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/util-service/utils.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';

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
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent],
     templateUrl: './permissioned-domains-summary.component.html',
     styleUrl: './permissioned-domains-summary.component.css',
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
     infoPanelExpanded = input.required<boolean>();

     // Outputs
     toggleInfoPanel = output<void>();

     // Helpers
     explorerUrl = this.txUiService.explorerUrl;

     isSelected(domainIndex: string): boolean {
          return this.tab() !== 'setPermissionedDomain' && domainIndex === this.permissionedDomainStoreService.selectedDomainId();
     }

     selectDomain(domain: PermissionedDomainItem) {
          if (this.tab() === 'setPermissionedDomain') return;
          this.permissionedDomainStoreService.setField('selectedDomainId', domain.index);
     }

     getCursorStyle(): string | null {
          return this.tab() === 'setPermissionedDomain' ? null : 'pointer';
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
