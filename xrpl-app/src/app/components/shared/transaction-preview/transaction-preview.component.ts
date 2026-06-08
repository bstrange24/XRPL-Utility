import { ChangeDetectionStrategy, Component, ViewChild, ElementRef, effect, signal, inject, SimpleChanges, Input, OnChanges, OnInit } from '@angular/core';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../services/utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../../services/utils/download-util/download-util.service';
import { LucideAngularModule } from 'lucide-angular';
import { animate, style, transition, trigger } from '@angular/animations';
import { AppConstants } from '../../../core/app.constants';
import { PerformanceBaseComponent } from '../performance-base/performance-base.component';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-json';
import { TransactionResultsComponent } from '../transaction-results/transaction-results.component';
import { TransactionPreviewerComponent } from '../transaction-previewer/transaction-previewer.component';
import { ParsedTransactionPreview, TransactionPreviewParserService } from '../../../services/transaction-preview-parser/transaction-preview-parser.service';
import { AccountConfiguratorStoreService } from '../../../services/account-configurator/account-configurator-store/account-configurator-store.service';

@Component({
     selector: 'app-transaction-preview',
     standalone: true,
     imports: [LucideAngularModule, TransactionResultsComponent, TransactionPreviewerComponent],
     animations: [trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(100%)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(50%)' }))])])],
     templateUrl: './transaction-preview.component.html',
     styleUrl: './transaction-preview.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionPreviewComponent extends PerformanceBaseComponent implements OnInit, OnChanges {
     public readonly txUiService = inject(TransactionUiService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);

     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     url = signal<string>('');
     showRawPreview = false;

     toggleRawPreview() {
          this.showRawPreview = !this.showRawPreview;
     }

     copyRawTx(tx: any) {
          navigator.clipboard.writeText(JSON.stringify(tx, null, 2));
     }

     @Input() transactionData: any;
     @Input() accountInfo?: any;

     parsedPreview: ParsedTransactionPreview | null = null;

     ngOnInit() {
          this.parsePreview();
     }

     ngOnChanges(changes: SimpleChanges) {
          if (changes['transactionData'] || changes['accountInfo']) {
               this.parsePreview();
          }
     }

     private parsePreview() {
          console.log('Parsing transaction data for preview:', this.accountInfo);
          if (this.transactionData) {
               this.parsedPreview = this.parser.parse(this.transactionData, this.accountInfo);
          } else {
               this.parsedPreview = null;
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
          if (value === undefined || value === null) return '—';
          if (typeof value === 'string' && value.length > 30) {
               return value.slice(0, 27) + '...';
          }
          return String(value);
     }

     constructor(private readonly parser: TransactionPreviewParserService) {
          super();
          effect(() => {
               const tx = this.txUiService.txSignal();
               const result = this.txUiService.txResultSignal();

               queueMicrotask(() => {
                    if (this.paymentJson?.nativeElement) {
                         this.paymentJson.nativeElement.textContent = tx ? JSON.stringify(tx, null, 2) : '// No transaction';
                         Prism.highlightElement(this.paymentJson.nativeElement);
                    }
                    if (this.txResultJson?.nativeElement) {
                         this.txResultJson.nativeElement.textContent = result ? JSON.stringify(result, null, 2) : '// No result yet';
                         Prism.highlightElement(this.txResultJson.nativeElement);
                    }
               });
          });

          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url.set(AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET);
     }
}
