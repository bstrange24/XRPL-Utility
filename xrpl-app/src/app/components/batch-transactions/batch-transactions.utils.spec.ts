import * as xrpl from 'xrpl';
import { createBatchTransaction } from './batch-transactions.utils';

describe('createBatchTransaction', () => {
     const account = 'rUserBSM7T3b6nHX3Jjua62wgX9unH8s9b';
     const transactions = JSON.stringify([
          { TransactionType: 'Payment', Destination: 'rDEXfrontEnd23E44wKL3S6dj9FaXv', Amount: '1000' },
          { TransactionType: 'Payment', Destination: 'rDEXfrontEnd23E44wKL3S6dj9FaXv', Amount: '2000', Flags: 0x00020000 },
     ]);

     it('wraps transactions with the inner-batch flag and applies the selected mode', () => {
          const batch = createBatchTransaction(account, 'allOrNothing', transactions);

          expect(batch.TransactionType).toBe('Batch');
          expect(batch.Account).toBe(account);
          expect(batch.Flags).toBe(xrpl.BatchFlags.tfAllOrNothing);
          expect(batch.RawTransactions.length).toBe(2);
          expect(batch.RawTransactions[0].RawTransaction).toEqual(
               jasmine.objectContaining({
                    TransactionType: 'Payment',
                    Account: account,
                    Flags: 0x40000000,
               })
          );
          expect(batch.RawTransactions[1].RawTransaction['Flags']).toBe(0x40020000);
     });

     it('maps every execution mode to its XRPL Batch flag', () => {
          const modeFlags = [
               ['allOrNothing', xrpl.BatchFlags.tfAllOrNothing],
               ['onlyOne', xrpl.BatchFlags.tfOnlyOne],
               ['untilFailure', xrpl.BatchFlags.tfUntilFailure],
               ['independent', xrpl.BatchFlags.tfIndependent],
          ] as const;

          for (const [mode, flag] of modeFlags) {
               expect(createBatchTransaction(account, mode, transactions).Flags).toBe(flag);
          }
     });

     it('rejects batches outside the protocol transaction count', () => {
          expect(() => createBatchTransaction(account, 'allOrNothing', '[]')).toThrowError(/between 2 and 8/);
          expect(() => createBatchTransaction(account, 'allOrNothing', JSON.stringify(Array(9).fill({ TransactionType: 'Payment' })))).toThrowError(/between 2 and 8/);
     });

     it('rejects inner transaction fields managed by the batch builder', () => {
          const input = JSON.stringify([{ TransactionType: 'Payment', Sequence: 1 }, { TransactionType: 'Payment' }]);

          expect(() => createBatchTransaction(account, 'allOrNothing', input)).toThrowError(/Remove Sequence/);
     });

     it('rejects nested batches and invalid inner flags', () => {
          const nestedBatch = JSON.stringify([{ TransactionType: 'Batch' }, { TransactionType: 'Payment' }]);
          const invalidFlags = JSON.stringify([{ TransactionType: 'Payment', Flags: -1 }, { TransactionType: 'Payment' }]);

          expect(() => createBatchTransaction(account, 'allOrNothing', nestedBatch)).toThrowError(/cannot contain another Batch/);
          expect(() => createBatchTransaction(account, 'allOrNothing', invalidFlags)).toThrowError(/32-bit integer/);
     });
});
