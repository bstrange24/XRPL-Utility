// components/transaction-preview/transaction-preview.component.ts
import { Component, ViewChild, ElementRef, effect, signal } from '@angular/core';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../services/toast/toast.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { AppConstants } from '../../core/app.constants';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
declare var Prism: any;

@Component({
     selector: 'app-transaction-preview',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     animations: [trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(100%)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(50%)' }))])])],
     templateUrl: './transaction-preview.component.html',
     styleUrl: './transaction-preview.component.css',
})
export class TransactionPreviewComponent {
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     url = signal<string>('');

     constructor(public txUiService: TransactionUiService, public copyUtilService: CopyUtilService, public downloadUtilService: DownloadUtilService, public toastService: ToastService, private xrplService: XrplService) {
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
