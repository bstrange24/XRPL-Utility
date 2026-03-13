import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { JsonPipe } from '@angular/common';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/util-service/utils.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';

export interface PermissionedDomainItem {
     index: string;
     Domain?: string;
     AcceptedCredentials: any; // better type if you have one
}

@Component({
     selector: 'app-permissioned-domains-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent, JsonPipe],
     templateUrl: './permissioned-domains-summary.component.html',
     styleUrl: './permissioned-domains-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionedDomainsSummaryComponent {
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

     tab = input.required<'set' | 'delete'>();

     summaryMessage = input.required<string>();
     infoPanelExpanded = input.required<boolean>();

     // Outputs
     toggleInfoPanel = output<void>();

     // Injected services
     public copyUtilService = inject(CopyUtilService);
     private txUiService = inject(TransactionUiService);
     public utilsService = inject(UtilsService);
     public permissionedDomainStoreService = inject(PermissionedDomainStoreService);

     // Helpers
     explorerUrl = this.txUiService.explorerUrl;

     isSelected(domainIndex: string): boolean {
          return this.tab() !== 'set' && domainIndex === this.permissionedDomainStoreService.get('selectedDomainId');
     }

     selectDomain(domain: PermissionedDomainItem) {
          if (this.tab() === 'set') return;
          this.permissionedDomainStoreService.set('selectedDomainId', domain.index);
     }

     getCursorStyle(): string | null {
          return this.tab() !== 'set' ? 'pointer' : null;
     }
}
