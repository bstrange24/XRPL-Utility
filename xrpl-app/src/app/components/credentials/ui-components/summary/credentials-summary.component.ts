import { Component, input, output, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { CredentialActionTypes, CredentialItemVm } from '../../constants/credential.types';

@Component({
     selector: 'app-credentials-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent],
     templateUrl: './credentials-summary.component.html',
     styleUrl: './credentials-summary.component.css',
})
export class CredentialsSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly credentialUtilService = inject(CredentialUtilService);

     // Inputs from parent (credentials page)
     wallet = input.required<{ address: string } | null | undefined>();
     view = input.required<{ walletName: string; summaryMessage: string }>();
     creds = input.required<{ list: CredentialItemVm[] }>();
     credsLength = input.required<number>();
     tab = input.required<CredentialActionTypes>();

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

          if (this.tab() === 'createCredential') return false;
          if (this.tab() === 'verifyCredential') return cred.Issuer === walletAddress;
          return true;
     }
}
