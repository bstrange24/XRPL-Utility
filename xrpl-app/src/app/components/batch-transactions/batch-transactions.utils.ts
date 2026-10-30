import * as xrpl from 'xrpl';

export type BatchMode = 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent';

export const BATCH_MODES: ReadonlyArray<{ value: BatchMode; label: string; description: string }> = [
     { value: 'allOrNothing', label: 'All or Nothing', description: 'Apply the batch only if every inner transaction succeeds.' },
     { value: 'onlyOne', label: 'Only One', description: 'Apply only the first successful inner transaction.' },
     { value: 'untilFailure', label: 'Until Failure', description: 'Apply transactions in order until one fails.' },
     { value: 'independent', label: 'Independent', description: 'Apply each transaction independently, even if another fails.' },
];

const BATCH_MODE_FLAGS: Record<BatchMode, xrpl.BatchFlags> = {
     allOrNothing: xrpl.BatchFlags.tfAllOrNothing,
     onlyOne: xrpl.BatchFlags.tfOnlyOne,
     untilFailure: xrpl.BatchFlags.tfUntilFailure,
     independent: xrpl.BatchFlags.tfIndependent,
};

const INNER_BATCH_FLAG = 0x40000000;
const BUILDER_MANAGED_FIELDS = ['Account', 'Sequence', 'TicketSequence', 'Fee', 'SigningPubKey', 'TxnSignature', 'Signers', 'BatchSigners'];

function isRecord(value: unknown): value is Record<string, unknown> {
     return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createBatchTransaction(account: string, mode: BatchMode, innerTransactionsJson: string): xrpl.Batch {
     let parsedTransactions: unknown;

     try {
          parsedTransactions = JSON.parse(innerTransactionsJson);
     } catch {
          throw new Error('Enter valid JSON for the inner transactions.');
     }

     if (!Array.isArray(parsedTransactions) || parsedTransactions.length < 2 || parsedTransactions.length > 8) {
          throw new Error('A Batch must contain between 2 and 8 inner transactions.');
     }

     const rawTransactions: xrpl.Batch['RawTransactions'] = parsedTransactions.map((transaction, index) => {
          if (!isRecord(transaction) || typeof transaction['TransactionType'] !== 'string' || !transaction['TransactionType'].trim()) {
               throw new Error(`Inner transaction ${index + 1} must be an object with a TransactionType.`);
          }

          if (transaction['TransactionType'] === 'Batch') {
               throw new Error('Batch transactions cannot contain another Batch transaction.');
          }

          const managedField = BUILDER_MANAGED_FIELDS.find(field => field in transaction);
          if (managedField) {
               throw new Error(`Remove ${managedField} from inner transaction ${index + 1}; the Batch builder manages this field.`);
          }

          const flags = transaction['Flags'] ?? 0;
          if (typeof flags !== 'number' || !Number.isInteger(flags) || flags < 0 || flags > 0xffffffff) {
               throw new Error(`Flags in inner transaction ${index + 1} must be a non-negative 32-bit integer.`);
          }

          const rawTransaction = {
               ...transaction,
               Account: account,
               Flags: (flags | INNER_BATCH_FLAG) >>> 0,
          } as xrpl.Batch['RawTransactions'][number]['RawTransaction'];

          return { RawTransaction: rawTransaction };
     });

     return {
          TransactionType: 'Batch',
          Account: account,
          Flags: BATCH_MODE_FLAGS[mode],
          RawTransactions: rawTransactions,
     };
}
