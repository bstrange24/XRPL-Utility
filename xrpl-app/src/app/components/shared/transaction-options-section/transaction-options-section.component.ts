import { Component, inject, Input, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/util-service/utils.service';
import { CredentialStore } from '../../../services/credentials/credential-store/credential-store.service';
import { XrplTxOptionsStore } from '../stores/xrpl-tx-options.store';
import { PermissionedDomainStoreService } from '../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';

@Component({
     selector: 'app-transaction-options-section',
     standalone: true,
     imports: [CommonModule, FormsModule],
     templateUrl: './transaction-options-section.component.html',
     styleUrl: './transaction-options-section.component.css',
})
export class TransactionOptionsSectionComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);

     activeTab = input.required<'sendXrp' | 'createCredential' | 'acceptCredential' | 'deleteCredential' | 'verifyCredential' | 'cashCheck' | 'cancelCheck' | 'createCheck' | 'deleteAccount' | 'set' | 'delete' | 'accept' | 'verify' | 'setPermissionedDomain' | 'deletePermissionedDomain'>();
     @Input() wantsOptions: boolean = this.txUiService.wantsOptions();
}
