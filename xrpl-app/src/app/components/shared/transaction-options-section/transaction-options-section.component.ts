import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/util-service/utils.service';
import { CredentialStore } from '../../../services/credentials/credential-store/credential-store.service';

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

     activeTab = input.required<'sendXrp' | 'create' | 'cash' | 'cancel'>();
}
