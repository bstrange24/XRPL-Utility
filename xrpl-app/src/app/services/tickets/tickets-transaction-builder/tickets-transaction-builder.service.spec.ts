import { TestBed } from '@angular/core/testing';
import { TicketsTransactionBuilderService } from './tickets-transaction-builder.service';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';

// Mock Buffer for tests
(window as any).Buffer = {
     from: (str: string) => ({
          toString: () => {
               let hex = '';
               for (let i = 0; i < str.length; i++) {
                    const charCode = str.charCodeAt(i);
                    hex += charCode.toString(16).padStart(2, '0');
               }
               return hex;
          },
     }),
};

describe('TicketsTransactionBuilderService', () => {
     let service: TicketsTransactionBuilderService;

     const mockWallet: xrpl.Wallet = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          publicKey: 'test-public-key',
          privateKey: 'test-private-key',
     } as any;

     const mockEnv: PrepareTxEnvironmentResult = {
          fee: '12',
          ledgerInfo: {
               lastIndex: 1000,
          },
     } as any;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [TicketsTransactionBuilderService],
          });

          service = TestBed.inject(TicketsTransactionBuilderService);
     });

     describe('buildCreateTicketTx', () => {
          it('should build a valid TicketCreate transaction', () => {
               const ticket = {};
               const preparedConfig = {};
               const txOptionsState = {
                    ticketCountField: '5',
               };

               const tx = service.buildCreateTicketTx(mockWallet, mockEnv, ticket, preparedConfig, txOptionsState);

               expect(tx.TransactionType).toBe('TicketCreate');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.TicketCount).toBe(5);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should handle different ticket count values', () => {
               const ticket = {};
               const preparedConfig = {};
               const txOptionsState = {
                    ticketCountField: '10',
               };

               const tx = service.buildCreateTicketTx(mockWallet, mockEnv, ticket, preparedConfig, txOptionsState);

               expect(tx.TicketCount).toBe(10);
          });

          it('should handle zero ticket count', () => {
               const ticket = {};
               const preparedConfig = {};
               const txOptionsState = {
                    ticketCountField: '0',
               };

               const tx = service.buildCreateTicketTx(mockWallet, mockEnv, ticket, preparedConfig, txOptionsState);

               expect(tx.TicketCount).toBe(0);
          });

          it('should parse string ticket count to number', () => {
               const ticket = {};
               const preparedConfig = {};
               const txOptionsState = {
                    ticketCountField: '25',
               };

               const tx = service.buildCreateTicketTx(mockWallet, mockEnv, ticket, preparedConfig, txOptionsState);

               expect(tx.TicketCount).toBe(25);
               expect(typeof tx.TicketCount).toBe('number');
          });
     });

     describe('buildDeleteTicketTx', () => {
          it('should build a valid AccountSet transaction for deleting ticket', () => {
               const ticket = {
                    ticketId: '12345',
               };
               const preparedConfig = {};
               const txOptionsState = {};

               const tx = service.buildDeleteTicketTx(mockWallet, mockEnv, ticket, preparedConfig, txOptionsState);

               expect(tx.TransactionType).toBe('AccountSet');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.TicketSequence).toBe(12345);
               expect(tx.Sequence).toBe(0);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should handle different ticket ID values', () => {
               const ticket = {
                    ticketId: '67890',
               };
               const preparedConfig = {};
               const txOptionsState = {};

               const tx = service.buildDeleteTicketTx(mockWallet, mockEnv, ticket, preparedConfig, txOptionsState);

               expect(tx.TicketSequence).toBe(67890);
          });

          it('should handle ticket ID as string and convert to number', () => {
               const ticket = {
                    ticketId: '99999',
               };
               const preparedConfig = {};
               const txOptionsState = {};

               const tx = service.buildDeleteTicketTx(mockWallet, mockEnv, ticket, preparedConfig, txOptionsState);

               expect(tx.TicketSequence).toBe(99999);
               expect(typeof tx.TicketSequence).toBe('number');
          });

          it('should handle large ticket ID numbers', () => {
               const ticket = {
                    ticketId: '999999999',
               };
               const preparedConfig = {};
               const txOptionsState = {};

               const tx = service.buildDeleteTicketTx(mockWallet, mockEnv, ticket, preparedConfig, txOptionsState);

               expect(tx.TicketSequence).toBe(999999999);
          });
     });
});
