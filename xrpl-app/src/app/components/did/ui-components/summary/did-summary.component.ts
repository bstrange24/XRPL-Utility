import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/util-service/utils.service';
import { JsonPipe } from '@angular/common';

export interface ExistingDid {
     index: string;
     URI?: string;
     Data?: string;
     DIDDocument?: string;
}

@Component({
     selector: 'app-did-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent, JsonPipe],
     templateUrl: './did-summary.component.html',
     styleUrl: './did-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidSummaryComponent {
     // Inputs
     info = input.required<
          | {
                 walletName: string;
                 mode: 'set' | 'delete';
                 didCount: number;
                 existingDid: ExistingDid[];
            }
          | null
          | undefined
     >();

     infoPanelExpanded = input.required<boolean>();

     // Outputs
     toggleInfoPanel = output<void>();

     // Injected services
     public copyUtilService = inject(CopyUtilService);
     private txUiService = inject(TransactionUiService);
     public utilsService = inject(UtilsService);

     // Helpers
     explorerUrl = this.txUiService.explorerUrl;

     copyAndToast(text: string, label: string) {
          this.copyUtilService.copyAndToast(text, label);
     }

     hasDid(): boolean {
          return this.info()?.existingDid?.length === 1;
     }

     getDid(): ExistingDid | undefined {
          return this.info()?.existingDid[0];
     }
}
