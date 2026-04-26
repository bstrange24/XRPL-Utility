import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TooltipLinkComponent } from '../../../shared/tooltip-link/tooltip-link.component';
import { CredentialActionTypes, CredentialItemVm } from '../../constants/credential.types';
import { SummaryContainerComponent } from '../../../shared/ui-components/summary/summary-container/summary-container.component';
import { SummaryItemComponent } from '../../../shared/ui-components/summary/summary-item/summary-item.component';
import { SummaryTextConfig, SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { SummaryKeyValueComponent } from '../../../shared/ui-components/summary/summary-key-value/summary-key-value.component';

const CREDENTIALS_SUMMARY_CONFIG: SummaryTextConfig = {
     itemName: 'credential',
     itemNamePlural: 'credentials',
     actionMap: {
          acceptCredential: 'awaiting acceptance.',
          createCredential: 'issued.',
          deleteCredential: 'available for deletion.',
          verifyCredential: 'available for verification.',
     },
     defaultAction: 'available.',
};

@Component({
     selector: 'app-credentials-summary',
     standalone: true,
     imports: [NgIcon, LucideAngularModule, TooltipLinkComponent, SummaryContainerComponent, SummaryItemComponent, SummaryKeyValueComponent],
     templateUrl: './credentials-summary.component.html',
     styleUrl: './credentials-summary.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialsSummaryComponent {
     public readonly copyUtilService = inject(CopyUtilService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly summaryTextConfigService = inject(SummaryTextConfigService);

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

     // Computed summary text using the builder service
     summaryText = computed(() => {
          const view = this.view();
          const count = this.credsLength();

          // Use the view's wallet name from the view input
          return this.summaryTextConfigService.buildSummaryText(view.walletName, count, this.tab(), CREDENTIALS_SUMMARY_CONFIG);
     });

     emptyStateMessage = computed(() => {
          const count = this.credsLength();
          const currentTab = this.tab();

          // Special case for verify tab with no credentials
          if (currentTab === 'verifyCredential' && count === 0) {
               return 'This wallet has not issued any credentials that can be verified here.';
          }

          switch (currentTab) {
               case 'acceptCredential':
                    return 'This wallet has no credentials to accept.';
               case 'createCredential':
                    return 'This wallet has not issued any credentials.';
               case 'deleteCredential':
                    return 'This wallet has no credentials to delete.';
               case 'verifyCredential':
                    return 'No credentials available for verification.';
               default:
                    return 'No credentials found.';
          }
     });

     emptyStateSubMessage = computed(() => {
          const currentTab = this.tab();
          const count = this.credsLength();

          // Special sub-message for verify tab
          if (currentTab === 'verifyCredential' && count === 0) {
               return 'Verification is usually performed by the issuer or an external verifier.';
          }

          return '';
     });

     onCredentialClick(cred: CredentialItemVm) {
          if (this.tab() === 'createCredential') {
               return;
          }

          this.credentialSelected.emit(cred);
     }

     selectCredential(cred: CredentialItemVm, _source: 'list') {
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
