import { CommonModule } from '@angular/common';
import { Component, inject, input, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CredentialStore } from '../../../../../services/credentials/credential-store/credential-store.service';
import { PermissionedDomainStoreService } from '../../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../../services/util-service/utils.service';
import { XrplTxOptionsStore } from '../../../../shared/stores/xrpl-tx-options.store';

@Component({
     selector: 'app-credential-transaction-options',
     standalone: true,
     imports: [CommonModule, FormsModule],
     templateUrl: './credential-transaction-options.component.html',
     styleUrl: './credential-transaction-options.component.css',
})
export class CredentialTransactionOptionsComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);

     activeTab = input.required<'createCredential' | 'acceptCredential' | 'deleteCredential' | 'verifyCredential'>();
     @Input() wantsOptions: boolean = this.txUiService.wantsOptions();
}
