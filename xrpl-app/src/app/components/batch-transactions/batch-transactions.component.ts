import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import * as xrpl from 'xrpl';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { JsonEditorComponent } from '../shared/json-editor/json-editor.component';
import { BATCH_MODES, BatchMode, createBatchTransaction } from './batch-transactions.utils';

@Component({
     selector: 'app-batch-transactions',
     standalone: true,
     imports: [CommonModule, FormsModule, JsonEditorComponent, NgIcon],
     templateUrl: './batch-transactions.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchTransactionsComponent {
     @Output() readonly batchPrepared = new EventEmitter<xrpl.Batch | null>();
     @ViewChild('innerTransactionsEditor') innerTransactionsEditor!: JsonEditorComponent;

     readonly walletManager = inject(WalletManagerService);
     readonly batchModes = BATCH_MODES;
     readonly innerTransactionsJson = signal(
          JSON.stringify(
               [
                    { TransactionType: 'Payment', Destination: 'r...', Amount: '1000000' },
                    { TransactionType: 'Payment', Destination: 'r...', Amount: '2000000' },
               ],
               null,
               2,
          ),
     );
     readonly selectedMode = signal<BatchMode>('allOrNothing');
     readonly selectedModeDescription = computed(() => this.batchModes.find(mode => mode.value === this.selectedMode())?.description ?? '');
     readonly batchPreview = signal<xrpl.Batch | null>(null);
     readonly batchError = signal('');
     readonly isPreparing = signal(false);

     private readonly xrplService = inject(XrplService);
     readonly copyUtilService = inject(CopyUtilService);

     onInnerTransactionsChange(value: string): void {
          this.innerTransactionsJson.set(value);
          this.batchPreview.set(null);
          this.batchError.set('');
          this.batchPrepared.emit(null);
     }

     onModeChange(value: string): void {
          this.selectedMode.set(value as BatchMode);
          this.batchPreview.set(null);
          this.batchError.set('');
          this.batchPrepared.emit(null);
     }

     async prepareBatch(): Promise<void> {
          this.batchError.set('');
          this.batchPreview.set(null);
          this.batchPrepared.emit(null);

          const wallet = this.walletManager.getSelectedWallet();
          if (!wallet?.classicAddress || !wallet.seed) {
               this.batchError.set('Select a wallet with a signing seed before preparing a Batch.');
               return;
          }

          this.isPreparing.set(true);
          try {
               const batch = createBatchTransaction(wallet.classicAddress, this.selectedMode(), this.innerTransactionsJson());
               const client = await this.xrplService.getClient();
               const preparedBatch = await client.autofill(batch);
               this.batchPreview.set(preparedBatch);
               this.batchPrepared.emit(preparedBatch);
          } catch (error) {
               console.error('Failed to prepare Batch transaction:', error);
               this.batchError.set(error instanceof Error ? error.message : 'Unable to prepare the Batch transaction.');
          } finally {
               this.isPreparing.set(false);
          }
     }
}
