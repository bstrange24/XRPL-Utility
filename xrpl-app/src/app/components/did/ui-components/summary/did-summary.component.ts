import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { animate, style, transition, trigger } from '@angular/animations';

export interface ExistingDid {
     index: string;
     URI?: string;
     Data?: string;
     DIDDocument?: string;
}

@Component({
     selector: 'app-did-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent],
     templateUrl: './did-summary.component.html',
     styleUrl: './did-summary.component.css',
     animations: [trigger('expandCollapse', [transition(':enter', [style({ height: 0, opacity: 0, overflow: 'hidden' }), animate('300ms ease-out', style({ height: '*', opacity: 1 }))]), transition(':leave', [animate('250ms ease-in', style({ height: 0, opacity: 0, overflow: 'hidden' }))])])],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);

     // Inputs
     info = input.required<
          | {
                 walletName: string;
                 mode: 'setDid' | 'deleteDid';
                 didCount: number;
                 existingDid: ExistingDid[];
            }
          | null
          | undefined
     >();

     infoPanelExpanded = input.required<boolean>();

     // Outputs
     toggleInfoPanel = output<void>();

     // Helpers
     explorerUrl = this.txUiService.explorerUrl;

     hasDid(): boolean {
          return this.info()?.existingDid?.length === 1;
     }

     getDid(): ExistingDid | undefined {
          return this.info()?.existingDid[0];
     }

     prettyJson(value: string | undefined): string {
          if (!value || value === 'N/A') return 'N/A';

          try {
               // Safely parse the JSON string that came from the ledger
               const parsed = JSON.parse(value);
               // Pretty-print with 2-space indentation
               return JSON.stringify(parsed, null, 2);
          } catch {
               // Fallback: if it's not valid JSON (should never happen), show raw
               return value;
          }
     }
}
