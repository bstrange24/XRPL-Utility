import { Component, inject, Input, OnChanges, OnInit } from '@angular/core';
import { KeyDetail, ParsedTransactionPreview, TransactionPreviewParserService } from '../../../services/transaction-preview-parser/transaction-preview-parser.service';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { AppConstants } from '../../../core/app.constants';

@Component({
     selector: 'app-transaction-previewer',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './transaction-previewer.component.html',
     styleUrl: './transaction-previewer.component.css',
})
export class TransactionPreviewerComponent implements OnInit, OnChanges {
     public readonly parser = inject(TransactionPreviewParserService);
     public readonly toastService = inject(ToastService);

     @Input() transactionData: any;
     @Input() accountInfo?: any;

     parsedPreview: ParsedTransactionPreview | null = null;
     showRawData = false;

     get keyDetailGroups(): Array<{ title: string; details: KeyDetail[] }> {
          if (!this.parsedPreview) return [];

          const groups = [
               { title: 'Participants', details: [] as KeyDetail[] },
               { title: 'Amounts & assets', details: [] as KeyDetail[] },
               { title: 'Other details', details: [] as KeyDetail[] },
          ];

          for (const detail of this.parsedPreview.keyDetails) {
               const label = detail.label.toLowerCase();
               const group = !/sequence/.test(label) && /sender|receiver|destination|account|owner|issuer|buyer|seller|source|recipient|signer/.test(label)
                    ? groups[0]
                    : /amount|fee|currency|asset|price|limit|balance|rate|cost|xrp|token/.test(label)
                         ? groups[1]
                         : groups[2];
               group.details.push(detail);
          }

          return groups.filter(group => group.details.length > 0);
     }

     constructor() {}

     ngOnInit() {
          this.parsePreview();
     }

     ngOnChanges() {
          this.parsePreview();
     }

     private parsePreview() {
          if (this.transactionData) {
               this.parsedPreview = this.parser.parse(this.transactionData, this.accountInfo);
          }
     }

     getIconForType(transactionType: string): string {
          const icons: Record<string, string> = {
               Payment: '💸',
               OfferCreate: '📈',
               OfferCancel: '🗑️',
               AccountSet: '⚙️',
               TrustSet: '🤝',
               EscrowCreate: '🔒',
               EscrowFinish: '🔓',
               EscrowCancel: '🚫',
               PaymentChannelCreate: '📡',
               PaymentChannelClaim: '💵',
               PaymentChannelFund: '💰',
               SignerListSet: '✍️',
               NFTokenMint: '🎨',
               NFTokenBurn: '🔥',
               NFTokenCreateOffer: '💲',
               NFTokenAcceptOffer: '✅',
               NFTokenCancelOffer: '❌',
               PermissionedDomainCreate: '🏛️',
               PermissionedDomainSet: '📝',
               PermissionedDomainDelete: '🗑️',
               DidSet: '🆔',
               DidDelete: '❌',
          };
          return icons[transactionType] || '📄';
     }

     formatValue(value: any): string {
          if (typeof value === 'string' && value.length > 30) {
               return value.slice(0, 27) + '...';
          }
          return String(value);
     }

     copyRawData() {
          if (this.parsedPreview?.rawData) {
               navigator.clipboard.writeText(JSON.stringify(this.parsedPreview.rawData, null, 2));
               this.toastService.success('Raw data copied to clipboard!', AppConstants.TOAST.INFO);
          }
     }

     downloadRawData() {
          if (this.parsedPreview?.rawData) {
               const json = JSON.stringify(this.parsedPreview.rawData, null, 2);
               const blob = new Blob([json], { type: 'application/json' });
               const url = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url;
               a.download = `tx-result-${Date.now()}.json`;
               a.click();
               URL.revokeObjectURL(url);
               this.toastService.success('Raw data downloaded!', AppConstants.TOAST.INFO);
          }
     }
}
