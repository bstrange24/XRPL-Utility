import { Component, inject, Input, OnChanges, OnInit } from '@angular/core';
import { ParsedTransactionResult, TransactionParserService } from '../../../services/transaction-parser/transaction-parser.service';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { AppConstants } from '../../../core/app.constants';

@Component({
     selector: 'app-transaction-results',
     standalone: true,
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './transaction-results.component.html',
     styleUrl: './transaction-results.component.css',
})
export class TransactionResultsComponent implements OnInit, OnChanges {
     public readonly parser = inject(TransactionParserService);
     public readonly toastService = inject(ToastService);

     @Input() resultData: any;
     @Input() explorerUrl: string = '';

     parsedResult: ParsedTransactionResult | null = null;
     showAffectedAccounts = false;
     showRawData = false;

     constructor() {}

     ngOnInit() {
          this.parseResult();
     }

     ngOnChanges() {
          this.parseResult();
     }

     private parseResult() {
          if (this.resultData) {
               this.parsedResult = this.parser.parse(this.resultData, this.explorerUrl);
          }
     }

     shortenHash(hash: string): string {
          if (!hash) return '';
          return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
     }

     copyRawData() {
          if (this.parsedResult?.rawData) {
               navigator.clipboard.writeText(JSON.stringify(this.parsedResult.rawData, null, 2));
               this.toastService.success('Raw data copied to clipboard!', AppConstants.TOAST.INFO);
          }
     }

     downloadRawData() {
          if (this.parsedResult?.rawData) {
               const json = JSON.stringify(this.parsedResult?.rawData, null, 2);
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
