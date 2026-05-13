import { Component, input, output, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { expandCollapse } from '../../../../services/utils/animations/animations.service';
import { ExistingDid } from '../../constants/did.types';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';

@Component({
     selector: 'app-did-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent],
     templateUrl: './did-summary.component.html',
     styleUrl: './did-summary.component.css',
     animations: [expandCollapse],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);

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

     toggleInfoPanel = output<void>();

     explorerUrl = this.txUiService.explorerUrl;

     did = computed(() => this.info()?.existingDid?.[0]);

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

     copyIndex() {
          const d = this.did();
          if (d?.index) this.copyUtilService.copyAndToast(d.index, 'DID Index');
     }

     copyField(field: 'URI' | 'Data' | 'DIDDocument' | 'index') {
          const d = this.did();
          const value = d?.[field];
          if (value && value !== 'N/A') {
               this.copyUtilService.copyAndToast(value, `DID ${field}`);
          }
     }

     getSummaryText = computed(() => {
          return `<br><span class="text-xs text-gray-500">Only one DID can exist per account</span>`;
     });
}
