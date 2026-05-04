import { TestBed } from '@angular/core/testing';
import { TicketsUtilService } from './tickets-util.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import * as xrpl from 'xrpl';
import { signal, WritableSignal } from '@angular/core';

// Mock classes to avoid type issues
class MockAccountConfiguratorStoreService {}
class MockXrplTxOptionsStore {}

describe('TicketsUtilService', () => {
     let service: TicketsUtilService;
     let txUiService: jasmine.SpyObj<TransactionUiService>;

     beforeEach(() => {
          // Create a mock currentStep signal
          const currentStepSignal = signal('idle');
          const stepMessageSpy = jasmine.createSpy().and.returnValue('Processing...');

          txUiService = jasmine.createSpyObj('TransactionUiService', ['stepMessage']);

          // Manually set the currentStep property
          Object.defineProperty(txUiService, 'currentStep', {
               get: () => currentStepSignal,
               set: (value: WritableSignal<string>) => {},
               configurable: true,
          });
          Object.defineProperty(txUiService, 'stepMessage', {
               get: () => stepMessageSpy,
               configurable: true,
          });

          const accountConfiguratorStoreService = new MockAccountConfiguratorStoreService();
          const xrplTxOptionsStore = new MockXrplTxOptionsStore();

          TestBed.configureTestingModule({
               providers: [TicketsUtilService, { provide: TransactionUiService, useValue: txUiService }, { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService }, { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStore }],
          });

          service = TestBed.inject(TicketsUtilService);
     });

     describe('createButtonLabel', () => {
          it('should return "Create Ticket(s)" when step is idle', () => {
               (txUiService.currentStep as WritableSignal<string>).set('idle');
               expect(service.createButtonLabel()).toBe('Create Ticket(s)');
          });

          it('should return "Create Ticket(s)" when step is waiting_validation', () => {
               (txUiService.currentStep as WritableSignal<string>).set('waiting_validation');
               expect(service.createButtonLabel()).toBe('Create Ticket(s)');
          });

          it('should return step message for other steps', () => {
               (txUiService.currentStep as WritableSignal<string>).set('signing');
               expect(service.createButtonLabel()).toBe('Processing...');
          });
     });

     describe('deleteButtonLabel', () => {
          it('should return "Delete Selected Ticket(s)" when step is idle', () => {
               (txUiService.currentStep as WritableSignal<string>).set('idle');
               expect(service.deleteButtonLabel()).toBe('Delete Selected Ticket(s)');
          });

          it('should return "Delete Selected Ticket(s)" when step is waiting_validation', () => {
               (txUiService.currentStep as WritableSignal<string>).set('waiting_validation');
               expect(service.deleteButtonLabel()).toBe('Delete Selected Ticket(s)');
          });

          it('should return step message for other steps', () => {
               (txUiService.currentStep as WritableSignal<string>).set('signing');
               expect(service.deleteButtonLabel()).toBe('Processing...');
          });
     });

     describe('getAllTicketsSelected', () => {
          it('should return computed signal that returns true when all tickets selected', () => {
               const ticketArray = ['1', '2', '3'];
               const selectedTicketSequences = ['1', '2', '3'];

               const result = service.getAllTicketsSelected(ticketArray, selectedTicketSequences);
               expect(result()).toBe(true);
          });

          it('should return computed signal that returns false when not all tickets selected', () => {
               const ticketArray = ['1', '2', '3'];
               const selectedTicketSequences = ['1', '2'];

               const result = service.getAllTicketsSelected(ticketArray, selectedTicketSequences);
               expect(result()).toBe(false);
          });

          it('should return computed signal that returns false when ticket array is empty', () => {
               const ticketArray: string[] = [];
               const selectedTicketSequences: string[] = [];

               const result = service.getAllTicketsSelected(ticketArray, selectedTicketSequences);
               expect(result()).toBe(false);
          });
     });

     describe('convertToString', () => {
          it('should convert number to string', () => {
               const result = service.convertToString(123);
               expect(result).toBe('123');
               expect(typeof result).toBe('string');
          });

          it('should convert string to string', () => {
               const result = service.convertToString('456');
               expect(result).toBe('456');
          });

          it('should convert object to string via toString method', () => {
               const obj = { toString: () => '789' };
               const result = service.convertToString(obj as any);
               expect(result).toBe('789');
          });
     });

     describe('filterAccountObjectsByTypes', () => {
          // Use any to bypass strict type checking for test data
          const mockAccountObjectsResponse: any = {
               result: {
                    account_objects: [
                         { LedgerEntryType: 'Ticket', TicketSequence: 1 },
                         { LedgerEntryType: 'Ticket', TicketSequence: 2 },
                         { LedgerEntryType: 'Offer', Flags: 0, Account: 'rTest', TakerPays: {}, TakerGets: {} },
                         { LedgerEntryType: 'PayChannel', Account: 'rTest', Amount: '0', Balance: '0', Destination: 'rDest', PublicKey: 'key', SettleDelay: 0 },
                         { LedgerEntryType: 'Ticket', TicketSequence: 5 },
                    ],
                    ledger_hash: 'test',
                    ledger_index: 123,
                    validated: true,
                    account: 'rTest',
               },
               id: 1,
               type: 'response',
               status: 'success',
          };

          it('should filter account objects by single type', () => {
               const result = service.filterAccountObjectsByTypes(mockAccountObjectsResponse, ['Ticket']);

               expect(result.result.account_objects.length).toBe(3);
               expect(result.result.account_objects[0].LedgerEntryType).toBe('Ticket');
               expect(result.result.account_objects[1].LedgerEntryType).toBe('Ticket');
               expect(result.result.account_objects[2].LedgerEntryType).toBe('Ticket');
          });

          it('should filter account objects by multiple types', () => {
               const result = service.filterAccountObjectsByTypes(mockAccountObjectsResponse, ['Ticket', 'Offer']);

               expect(result.result.account_objects.length).toBe(4);
               expect(result.result.account_objects[0].LedgerEntryType).toBe('Ticket');
               expect(result.result.account_objects[1].LedgerEntryType).toBe('Ticket');
               expect(result.result.account_objects[2].LedgerEntryType).toBe('Offer');
               expect(result.result.account_objects[3].LedgerEntryType).toBe('Ticket');
          });

          it('should return empty array when no objects match', () => {
               const result = service.filterAccountObjectsByTypes(mockAccountObjectsResponse, ['Escrow']);

               expect(result.result.account_objects.length).toBe(0);
          });

          it('should handle empty account_objects array', () => {
               const emptyResponse: any = {
                    result: {
                         account_objects: [],
                         ledger_hash: 'test',
                         ledger_index: 123,
                         validated: true,
                         account: 'rTest',
                    },
                    id: 1,
                    type: 'response',
                    status: 'success',
               };

               const result = service.filterAccountObjectsByTypes(emptyResponse, ['Ticket']);

               expect(result.result.account_objects.length).toBe(0);
          });

          it('should handle undefined account_objects', () => {
               const undefinedResponse: any = {
                    result: {
                         account_objects: undefined,
                         ledger_hash: 'test',
                         ledger_index: 123,
                         validated: true,
                         account: 'rTest',
                    },
                    id: 1,
                    type: 'response',
                    status: 'success',
               };

               const result = service.filterAccountObjectsByTypes(undefinedResponse, ['Ticket']);

               expect(result.result.account_objects.length).toBe(0);
          });

          it('should preserve all other properties of the response', () => {
               const result = service.filterAccountObjectsByTypes(mockAccountObjectsResponse, ['Ticket']);

               expect(result.result.ledger_hash).toBe('test');
               expect(result.result.ledger_index).toBe(123);
               expect(result.result.validated).toBe(true);
               expect(result.result.account).toBe('rTest');
               expect(result.id).toBe(1);
               expect(result.type).toBe('response');
               expect(result.status).toBe('success');
          });
     });
});
