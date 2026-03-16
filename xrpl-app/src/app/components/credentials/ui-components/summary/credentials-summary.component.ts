import { Component, input, output, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { CredentialItemVm } from '../../constants/credential.constants';

@Component({
     selector: 'app-credentials-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent],
     templateUrl: './credentials-summary.component.html',
     styleUrl: './credentials-summary.component.css',
})
export class CredentialsSummaryComponent {
     public copyUtilService = inject(CopyUtilService);
     private txUiService = inject(TransactionUiService);
     public credentialUtilService = inject(CredentialUtilService);

     // Inputs from parent (credentials page)
     wallet = input.required<{ address: string } | null | undefined>();
     view = input.required<{ walletName: string; summaryMessage: string }>();
     creds = input.required<{ list: CredentialItemVm[] }>();
     credsLength = input.required<number>();
     tab = input.required<'create' | 'accept' | 'delete' | 'verify'>();

     infoPanelExpanded = input.required<boolean>();
     toggleInfoPanel = output<void>();
     credentialSelected = output<CredentialItemVm>();
     explorerUrl = this.txUiService.explorerUrl;

     onCredentialClick(cred: CredentialItemVm) {
          this.credentialSelected.emit(cred);
     }

     selectCredential(cred: CredentialItemVm, source: 'list') {
          this.credentialUtilService.selectCredentialFromList(cred, this.tab(), this.wallet()?.address ?? '');
     }

     canSelectCredential(cred: CredentialItemVm): boolean {
          const walletAddress = this.wallet()?.address;
          if (!walletAddress) return false;

          if (this.tab() === 'create') return false;
          if (this.tab() === 'verify') return cred.Issuer === walletAddress;
          return true;
     }
}
