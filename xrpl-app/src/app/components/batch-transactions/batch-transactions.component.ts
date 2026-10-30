import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import * as xrpl from 'xrpl';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { SignTransactionUtilService } from '../../services/sign-transactions/sign-transactions-util/sign-transaction-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { JsonEditorComponent } from '../shared/json-editor/json-editor.component';
import { BATCH_MODES, BatchMode, createBatchTransaction } from './batch-transactions.utils';

interface BatchInnerTransaction {
     id: number;
     transactionType: string;
     label: string;
     json: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
     return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Component({
     selector: 'app-batch-transactions',
     standalone: true,
     imports: [CommonModule, FormsModule, JsonEditorComponent, NgIcon],
     templateUrl: './batch-transactions.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchTransactionsComponent {
     @Output() readonly batchPrepared = new EventEmitter<xrpl.Batch | null>();

     readonly walletManager = inject(WalletManagerService);
     readonly batchModes = BATCH_MODES;
     readonly transactions = signal<BatchInnerTransaction[]>([]);
     readonly selectedMode = signal<BatchMode>('allOrNothing');
     readonly selectedTransactionType = signal('sendXrp');
     readonly showAdvancedJson = signal(false);
     readonly expandedTransactionId = signal<number | null>(null);
     readonly selectedModeDescription = computed(() => this.batchModes.find(mode => mode.value === this.selectedMode())?.description ?? '');
     readonly transactionTypeItems = computed(() => this.signTransactionUtilService.transactionTypeItems().filter(item => item.id !== 'batch' && this.signTransactionUtilService.supportsTransactionTemplate(item.id)));
     readonly innerTransactionsJson = computed(() => {
          try {
               return JSON.stringify(this.transactions().map(transaction => JSON.parse(transaction.json)), null, 2);
          } catch {
               return '';
          }
     });
     readonly hasInvalidTransactionJson = computed(() => this.transactions().some(transaction => {
          return !this.isTransactionJsonValid(transaction);
     }));
     readonly batchPreview = signal<xrpl.Batch | null>(null);
     readonly batchError = signal('');
     readonly advancedJsonError = signal('');
     readonly isAddingTransaction = signal(false);
     readonly isPreparing = signal(false);

     private readonly xrplService = inject(XrplService);
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly signTransactionUtilService = inject(SignTransactionUtilService);
     readonly copyUtilService = inject(CopyUtilService);
     private nextTransactionId = 1;

     onTransactionJsonChange(index: number, value: string): void {
          this.transactions.update(transactions => transactions.map((transaction, currentIndex) => currentIndex === index ? { ...transaction, json: value } : transaction));
          this.invalidatePreparedBatch();
     }

     isTransactionJsonValid(transaction: BatchInnerTransaction): boolean {
          try {
               const parsed: unknown = JSON.parse(transaction.json);
               return isRecord(parsed) && parsed['TransactionType'] === transaction.transactionType;
          } catch {
               return false;
          }
     }

     onModeChange(value: string): void {
          this.selectedMode.set(value as BatchMode);
          this.invalidatePreparedBatch();
     }

     async addTransaction(): Promise<void> {
          if (this.transactions().length >= 8) {
               this.batchError.set('A Batch can contain no more than 8 inner transactions.');
               return;
          }

          const wallet = this.walletManager.getSelectedWallet();
          if (!wallet?.classicAddress || !wallet.seed) {
               this.batchError.set('Select a wallet with a signing seed before adding a transaction.');
               return;
          }

          this.batchError.set('');
          this.isAddingTransaction.set(true);
          try {
               const environment = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeFee: true,
                    includeLedgerIndex: true,
               });
               if (!environment.accountInfo || environment.currentLedger === undefined || !environment.fee || !environment.wallet) {
                    throw new Error('Unable to prepare a transaction template for the selected wallet.');
               }

               const item = this.transactionTypeItems().find(option => option.id === this.selectedTransactionType());
               if (!item) throw new Error('Select a supported transaction type.');

               const templateJson = await this.signTransactionUtilService.buildTransactionText({
                    client: environment.client,
                    wallet: environment.wallet,
                    accountInfo: environment.accountInfo,
                    fee: environment.fee,
                    currentLedger: environment.currentLedger,
                    selectedTransaction: item.id,
               });
               const template: Record<string, unknown> = JSON.parse(templateJson);
               for (const field of ['Account', 'Sequence', 'TicketSequence', 'Fee', 'LastLedgerSequence', 'SigningPubKey', 'TxnSignature', 'Signers', 'BatchSigners']) {
                    delete template[field];
               }
               if (typeof template['Flags'] === 'string' && /^\d+$/.test(template['Flags'])) {
                    template['Flags'] = Number(template['Flags']);
               }

               this.transactions.update(transactions => [
                    ...transactions,
                    {
                         id: this.nextTransactionId++,
                         transactionType: String(template['TransactionType']),
                         label: item.display,
                         json: JSON.stringify(template, null, 2),
                    },
               ]);
               this.expandedTransactionId.set(this.transactions()[this.transactions().length - 1]?.id ?? null);
               this.invalidatePreparedBatch();
          } catch (error) {
               console.error('Failed to add Batch transaction template:', error);
               this.batchError.set(error instanceof Error ? error.message : 'Unable to add a transaction template.');
          } finally {
               this.isAddingTransaction.set(false);
          }
     }

     duplicateTransaction(index: number): void {
          const transactions = this.transactions();
          if (transactions.length >= 8) {
               this.batchError.set('A Batch can contain no more than 8 inner transactions.');
               return;
          }

          const original = transactions[index];
          const duplicate = { ...original, id: this.nextTransactionId++ };
          this.transactions.update(current => [...current.slice(0, index + 1), duplicate, ...current.slice(index + 1)]);
          this.expandedTransactionId.set(duplicate.id);
          this.invalidatePreparedBatch();
     }

     removeTransaction(index: number): void {
          const removed = this.transactions()[index];
          this.transactions.update(transactions => transactions.filter((_, currentIndex) => currentIndex !== index));
          if (this.expandedTransactionId() === removed?.id) this.expandedTransactionId.set(null);
          this.invalidatePreparedBatch();
     }

     moveTransaction(index: number, offset: -1 | 1): void {
          const destination = index + offset;
          const transactions = [...this.transactions()];
          if (destination < 0 || destination >= transactions.length) return;
          [transactions[index], transactions[destination]] = [transactions[destination], transactions[index]];
          this.transactions.set(transactions);
          this.invalidatePreparedBatch();
     }

     toggleTransactionEditor(id: number): void {
          this.expandedTransactionId.update(current => current === id ? null : id);
     }

     transactionSummary(transaction: BatchInnerTransaction): string {
          if (!this.isTransactionJsonValid(transaction)) return 'Invalid transaction JSON';
          const parsed = JSON.parse(transaction.json) as Record<string, unknown>;
          const fields = Object.entries(parsed).filter(([key]) => key !== 'TransactionType' && key !== 'Flags').slice(0, 2);
          return fields.map(([key, value]) => `${key}: ${typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}`).join(' · ') || 'No operation fields yet';
     }

     formatTransaction(index: number): void {
          const transaction = this.transactions()[index];
          try {
               const json = JSON.stringify(JSON.parse(transaction.json), null, 2);
               this.onTransactionJsonChange(index, json);
          } catch {
               this.batchError.set(`Fix the JSON in transaction ${index + 1} before formatting it.`);
          }
     }

     formatAllTransactions(): void {
          if (this.hasInvalidTransactionJson()) {
               this.batchError.set('Fix invalid transaction JSON before formatting the array.');
               return;
          }
          this.transactions.update(transactions => transactions.map(transaction => ({ ...transaction, json: JSON.stringify(JSON.parse(transaction.json), null, 2) })));
          this.invalidatePreparedBatch();
     }

     onAdvancedJsonChange(value: string): void {
          this.advancedJsonError.set('');
          try {
               const parsed: unknown = JSON.parse(value);
               if (!Array.isArray(parsed)) throw new Error('Enter a JSON array of transaction objects.');
               if (parsed.length > 8) throw new Error('A Batch can contain no more than 8 inner transactions.');

               const items = parsed.map((entry, index) => {
                    if (!isRecord(entry) || typeof entry['TransactionType'] !== 'string' || !entry['TransactionType'].trim()) {
                         throw new Error(`Transaction ${index + 1} must be an object with a TransactionType.`);
                    }
                    return {
                         id: this.nextTransactionId++,
                         transactionType: entry['TransactionType'],
                         label: entry['TransactionType'],
                         json: JSON.stringify(entry, null, 2),
                    };
               });
               this.transactions.set(items);
               this.expandedTransactionId.set(null);
               this.invalidatePreparedBatch();
          } catch (error) {
               this.advancedJsonError.set(error instanceof Error ? error.message : 'Enter a valid JSON array of transaction objects.');
               this.invalidatePreparedBatch();
          }
     }

     toggleAdvancedJson(): void {
          if (this.showAdvancedJson() && this.advancedJsonError()) return;
          this.showAdvancedJson.update(show => !show);
          this.advancedJsonError.set('');
     }

     async prepareBatch(): Promise<void> {
          this.batchError.set('');
          this.batchPreview.set(null);
          this.batchPrepared.emit(null);

          if (this.advancedJsonError()) {
               this.batchError.set('Fix the advanced JSON array before preparing the Batch.');
               return;
          }
          if (this.hasInvalidTransactionJson()) {
               this.batchError.set('Fix the invalid transaction JSON before preparing the Batch.');
               return;
          }

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

     private invalidatePreparedBatch(): void {
          this.batchPreview.set(null);
          this.batchError.set('');
          this.batchPrepared.emit(null);
     }
}
