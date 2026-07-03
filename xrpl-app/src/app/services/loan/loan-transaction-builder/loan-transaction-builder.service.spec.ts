import { TestBed } from '@angular/core/testing';
import { LoanTransactionBuilderService } from './loan-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { LoanStoreService } from '../loan-store/loan-store.service';
import * as xrpl from 'xrpl';

describe('LoanTransactionBuilderService', () => {
     let service: LoanTransactionBuilderService;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [LoanTransactionBuilderService, { provide: UtilsService, useValue: jasmine.createSpyObj('UtilsService', ['encodeIfNeeded']) }, { provide: XrplTransactionService, useValue: jasmine.createSpyObj('XrplTransactionService', ['someMethod']) }, { provide: LoanStoreService, useValue: jasmine.createSpyObj('LoanStoreService', ['someMethod']) }],
          });
          service = TestBed.inject(LoanTransactionBuilderService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     it('should honor the amount passed to LoanPay for XRP payments', () => {
          const wallet = { address: 'rWallet' } as any;
          const env = { fee: '12', ledgerInfo: { lastIndex: 100 } } as any;
          const loanState = { paymentAmount: '5', selectedLoanId: 'loan-1' } as any;

          const tx = service.buildLoanPayTx(wallet, env, loanState, '2.5', 'XRP') as any;

          expect(tx.Amount).toBe(xrpl.xrpToDrops('2.5'));
     });
});
