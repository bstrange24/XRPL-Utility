import { TestBed } from '@angular/core/testing';

import { DelegateState } from '../delegate-store/delegate-store.service';
import { DelegateTransactionBuilderService } from './delegate-transaction-builder.service';

describe('DelegateTransactionBuilderService', () => {
     let service: DelegateTransactionBuilderService;

     const delegateState = (selected: number[]): DelegateState => ({
          actions: [
               { id: 1, key: 'Payment', txType: 'Payment', description: 'Make payments' },
               { id: 2, key: 'TrustSet', txType: 'TrustSet', description: 'Update trust lines' },
          ],
          selected: new Set(selected),
          delegateSelections: {},
          leftActions: [],
          rightActions: [],
          createdDelegations: false,
          existingDelegations: [],
          destination: 'rDelegateAddress',
          outstandingChecksCollapsed: false,
          isCollapsed: false,
     });

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [DelegateTransactionBuilderService],
          });
          service = TestBed.inject(DelegateTransactionBuilderService);
     });

     it('builds a DelegateSet transaction with the selected permissions and destination', () => {
          const tx = service.buildDelegateTx({ address: 'rOwnerAddress' }, delegateState([2]), 'delegateCreate');

          expect(tx.TransactionType).toBe('DelegateSet');
          expect(tx.Account).toBe('rOwnerAddress');
          expect(tx.Authorize).toBe('rDelegateAddress');
          expect(tx.Permissions).toEqual([{ Permission: { PermissionValue: 'TrustSet' } }]);
     });

     it('builds a DelegateSet transaction with no permissions when revoking a delegate', () => {
          const tx = service.buildDelegateTx({ address: 'rOwnerAddress' }, delegateState([1, 2]), 'delegateClear');

          expect(tx.Authorize).toBe('rDelegateAddress');
          expect(tx.Permissions).toEqual([]);
     });

     it('uses the classic address when a wallet has no address field', () => {
          const tx = service.buildDelegateTx({ classicAddress: 'rClassicAddress' }, delegateState([]), 'delegateClear');

          expect(tx.Account).toBe('rClassicAddress');
     });
});
