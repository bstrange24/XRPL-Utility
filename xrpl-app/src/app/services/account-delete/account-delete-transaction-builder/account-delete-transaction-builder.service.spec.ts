import { TestBed } from '@angular/core/testing';
import { AccountDeleteTransactionBuilderService } from './account-delete-transaction-builder.service';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';

describe('AccountDeleteTransactionBuilderService', () => {
     let service: AccountDeleteTransactionBuilderService;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [AccountDeleteTransactionBuilderService],
          });

          service = TestBed.inject(AccountDeleteTransactionBuilderService);
     });

     it('should create service', () => {
          expect(service).toBeTruthy();
     });

     it('should build AccountDelete transaction correctly', () => {
          const wallet: any = {
               classicAddress: 'rTEST123',
          };

          const env: PrepareTxEnvironmentResult = {
               fee: '10',
               ledgerInfo: {
                    lastIndex: 100,
               },
          } as any;

          const accountDelete: any = {
               destination: 'rDEST123',
          };

          const accountInfo: any = {
               result: {
                    account_data: {
                         Sequence: 42,
                    },
               },
          };

          const tx = service.buildAccountDeleteTx(wallet, env, accountDelete, accountInfo);

          expect(tx.TransactionType).toBe('AccountDelete');
          expect(tx.Account).toBe('rTEST123');
          expect(tx.Destination).toBe('rDEST123');
          expect(tx.Sequence).toBe(42);
          expect(tx.LastLedgerSequence).toBe(100 + AppConstants.LAST_LEDGER_ADD_TIME);
     });

     it('should not mutate inputs', () => {
          const wallet: any = { classicAddress: 'rA' };

          const env: PrepareTxEnvironmentResult = {
               fee: '10',
               ledgerInfo: { lastIndex: 5 },
          } as any;

          const accountDelete: any = { destination: 'rB' };

          const accountInfo: any = {
               result: {
                    account_data: {
                         Sequence: 1,
                    },
               },
          };

          const original = structuredClone(accountDelete);

          service.buildAccountDeleteTx(wallet, env, accountDelete, accountInfo);

          expect(accountDelete).toEqual(original);
     });

     it('should compute LastLedgerSequence correctly', () => {
          const wallet: any = { classicAddress: 'rX' };

          const env: PrepareTxEnvironmentResult = {
               fee: '10',
               ledgerInfo: { lastIndex: 999 },
          } as any;

          const accountDelete: any = { destination: 'rY' };

          const accountInfo: any = {
               result: {
                    account_data: { Sequence: 77 },
               },
          };

          const tx = service.buildAccountDeleteTx(wallet, env, accountDelete, accountInfo);

          expect(tx.LastLedgerSequence).toBe(999 + AppConstants.LAST_LEDGER_ADD_TIME);
     });
});
