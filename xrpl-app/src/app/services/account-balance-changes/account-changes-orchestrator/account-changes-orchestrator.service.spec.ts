import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountChangesOrchestratorService } from './account-changes-orchestrator.service';
import { AccountChangesStoreService } from '../account-changes-store/account-changes-store.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { AccountChangesViewModelService } from '../account-changes-view-model/account-changes-view-model.service';
import * as xrpl from 'xrpl';

describe('AccountChangesOrchestratorService', () => {
     let service: AccountChangesOrchestratorService;
     let storeMock: any;
     let txEnvironmentServiceMock: any;
     let txUiServiceMock: any;
     let xrplServiceMock: any;
     let xrplCacheMock: any;
     let xrplDateServiceMock: any;
     let viewMock: any;

     const mockAddress = 'rTestAddress123';
     const mockWallet = { classicAddress: mockAddress };
     const mockClient = { disconnect: jasmine.createSpy('disconnect') };

     // Helper to convert drops to XRP without spying
     const dropsToXrp = (drops: string): number => Number(drops) / 1000000;

     beforeEach(() => {
          storeMock = {
               loadingInitial: jasmine.createSpy('loadingInitial').and.returnValue(false),
               loadingMore: jasmine.createSpy('loadingMore').and.returnValue(false),
               hasMoreData: jasmine.createSpy('hasMoreData').and.returnValue(true),
               resetForNewLoad: jasmine.createSpy('resetForNewLoad'),
               setField: jasmine.createSpy('setField'),
               appendBalanceChanges: jasmine.createSpy('appendBalanceChanges'),
          };

          txEnvironmentServiceMock = {
               prepareTxEnvironment: jasmine.createSpy('prepareTxEnvironment').and.resolveTo({
                    wallet: mockWallet,
                    client: mockClient,
               }),
          };

          txUiServiceMock = {
               setError: jasmine.createSpy('setError'),
               setWarning: jasmine.createSpy('setWarning'),
               setInfoMessage: jasmine.createSpy('setInfoMessage'),
          };

          xrplServiceMock = {
               getAccountTransactions: jasmine.createSpy('getAccountTransactions'),
          };

          xrplCacheMock = {
               invalidateAccountCache: jasmine.createSpy('invalidateAccountCache'),
          };

          xrplDateServiceMock = {
               fromRippleTime: jasmine.createSpy('fromRippleTime').and.returnValue(new Date('2024-01-01T00:00:00Z')),
          };

          viewMock = {
               roundToEightDecimals: jasmine.createSpy('roundToEightDecimals').and.callFake((num: number) => Math.round(num * 100000000) / 100000000),
          };

          TestBed.configureTestingModule({
               providers: [AccountChangesOrchestratorService, { provide: AccountChangesStoreService, useValue: storeMock }, { provide: TxEnvironmentService, useValue: txEnvironmentServiceMock }, { provide: TransactionUiService, useValue: txUiServiceMock }, { provide: XrplService, useValue: xrplServiceMock }, { provide: XrplCacheService, useValue: xrplCacheMock }, { provide: XrplDateService, useValue: xrplDateServiceMock }, { provide: AccountChangesViewModelService, useValue: viewMock }],
          });

          service = TestBed.inject(AccountChangesOrchestratorService);
     });

     afterEach(() => {
          if (txUiServiceMock.setError) {
               txUiServiceMock.setError.calls.reset();
          }
          if (storeMock.setField) {
               storeMock.setField.calls.reset();
          }
          if (xrplServiceMock.getAccountTransactions) {
               xrplServiceMock.getAccountTransactions.calls.reset();
          }
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('loadBalanceChanges', () => {
          const mockTransactions = {
               result: {
                    transactions: [
                         {
                              hash: 'hash1',
                              tx_json: {
                                   TransactionType: 'Payment',
                                   Fee: '12000',
                                   Destination: 'rDest1',
                                   Account: 'rSender',
                                   date: 0,
                              },
                              meta: {
                                   AffectedNodes: [
                                        {
                                             ModifiedNode: {
                                                  LedgerEntryType: 'AccountRoot',
                                                  FinalFields: { Account: mockAddress, Balance: '2000000' },
                                                  PreviousFields: { Balance: '1000000' },
                                             },
                                        },
                                   ],
                              },
                         },
                    ],
                    marker: null,
               },
          };

          beforeEach(() => {
               xrplServiceMock.getAccountTransactions.and.resolveTo(mockTransactions);
          });

          it('should load balance changes successfully', async () => {
               await service.loadBalanceChanges(true);

               expect(storeMock.resetForNewLoad).toHaveBeenCalled();
               expect(txEnvironmentServiceMock.prepareTxEnvironment).toHaveBeenCalled();
               expect(xrplServiceMock.getAccountTransactions).toHaveBeenCalled();
               expect(storeMock.appendBalanceChanges).toHaveBeenCalled();
          });

          it('should not load when loadingInitial is true and reset is true', async () => {
               storeMock.loadingInitial.and.returnValue(true);
               await service.loadBalanceChanges(true);
               expect(txEnvironmentServiceMock.prepareTxEnvironment).not.toHaveBeenCalled();
          });

          it('should not load when loadingMore is true and reset is false', async () => {
               storeMock.loadingMore.and.returnValue(true);
               await service.loadBalanceChanges(false);
               expect(txEnvironmentServiceMock.prepareTxEnvironment).not.toHaveBeenCalled();
          });

          it('should handle empty transactions response', async () => {
               xrplServiceMock.getAccountTransactions.and.resolveTo({ result: { transactions: [] } });
               await service.loadBalanceChanges(true);
               expect(storeMock.setField).toHaveBeenCalledWith('hasMoreData', false);
          });

          it('should handle marker for pagination', async () => {
               xrplServiceMock.getAccountTransactions.and.resolveTo({
                    result: {
                         transactions: mockTransactions.result.transactions,
                         marker: 'nextMarker',
                    },
               });
               await service.loadBalanceChanges(true);
               expect(storeMock.setField).not.toHaveBeenCalledWith('hasMoreData', false);
          });

          it('should handle error when loading balance changes', async () => {
               xrplServiceMock.getAccountTransactions.and.rejectWith(new Error('Network error'));
               await service.loadBalanceChanges(true);
               expect(txUiServiceMock.setError).toHaveBeenCalledWith('Failed to load balance changes.');
          });

          it('should set loading states correctly', async () => {
               await service.loadBalanceChanges(true);
               expect(storeMock.setField).toHaveBeenCalledWith('loadingInitial', false);
          });
     });

     describe('invalidateCacheAndReload', () => {
          it('should invalidate cache and reload', () => {
               spyOn(service, 'loadBalanceChanges');
               service.invalidateCacheAndReload(mockAddress);
               expect(xrplCacheMock.invalidateAccountCache).toHaveBeenCalledWith(mockAddress);
               expect(service.loadBalanceChanges).toHaveBeenCalledWith(true);
          });
     });

     describe('processTransactions', () => {
          const testAddress = 'rTestAddress123';

          it('should process transactions and return balance changes', () => {
               const mockTxs = [
                    {
                         hash: 'hash1',
                         tx_json: {
                              TransactionType: 'Payment',
                              Fee: '12000',
                              Destination: 'rDest1',
                              date: 0,
                         },
                         meta: {
                              AffectedNodes: [
                                   {
                                        ModifiedNode: {
                                             LedgerEntryType: 'AccountRoot',
                                             FinalFields: { Account: testAddress, Balance: '2000000' },
                                             PreviousFields: { Balance: '1000000' },
                                        },
                                   },
                              ],
                         },
                    },
               ];

               const result = service.processTransactions(mockTxs, testAddress);

               expect(result.length).toBe(1);
               expect(result[0].change).toBe(1); // 1 XRP difference
               expect(result[0].currency).toBe('XRP');
               expect(result[0].fees).toBe(0.012); // 12000 drops = 0.012 XRP
               expect(result[0].type).toBe('Payment');
          });

          it('should skip transactions without meta', () => {
               const txsWithoutMeta = [
                    {
                         hash: 'hash2',
                         tx_json: { TransactionType: 'Payment', Fee: '12000' },
                         meta: null,
                    },
               ];
               const result = service.processTransactions(txsWithoutMeta, testAddress);
               expect(result.length).toBe(0);
          });

          it('should skip transactions without AffectedNodes', () => {
               const txsWithoutNodes = [
                    {
                         hash: 'hash3',
                         tx_json: { TransactionType: 'Payment', Fee: '12000' },
                         meta: { AffectedNodes: [] },
                    },
               ];
               const result = service.processTransactions(txsWithoutNodes, testAddress);
               expect(result.length).toBe(0);
          });

          it('should handle CreatedNode', () => {
               const txsWithCreatedNode = [
                    {
                         hash: 'hash4',
                         tx_json: {
                              TransactionType: 'Payment',
                              Fee: '12000',
                              Destination: 'rDest1',
                              date: 0,
                         },
                         meta: {
                              AffectedNodes: [
                                   {
                                        CreatedNode: {
                                             LedgerEntryType: 'AccountRoot',
                                             NewFields: { Account: testAddress, Balance: '1000000' },
                                        },
                                   },
                              ],
                         },
                    },
               ];

               const result = service.processTransactions(txsWithCreatedNode, testAddress);

               // CreatedNode: balanceBefore = 0, balanceAfter = 1 XRP
               expect(result.length).toBe(1);
               expect(result[0].balanceBefore).toBe(0);
               expect(result[0].balanceAfter).toBe(1);
               expect(result[0].change).toBe(1);
          });

          it('should handle DeletedNode', () => {
               const txsWithDeletedNode = [
                    {
                         hash: 'hash5',
                         tx_json: {
                              TransactionType: 'Payment',
                              Fee: '12000',
                              Destination: 'rDest1',
                              date: 0,
                         },
                         meta: {
                              AffectedNodes: [
                                   {
                                        DeletedNode: {
                                             LedgerEntryType: 'AccountRoot',
                                             FinalFields: { Account: testAddress, Balance: '1000000' },
                                        },
                                   },
                              ],
                         },
                    },
               ];

               const result = service.processTransactions(txsWithDeletedNode, testAddress);

               // DeletedNode: balanceBefore = 1 XRP, balanceAfter = 0
               expect(result.length).toBe(1);
               expect(result[0].balanceBefore).toBe(1);
               expect(result[0].balanceAfter).toBe(0);
               expect(result[0].change).toBe(-1);
          });

          it('should deduplicate transactions by hash', async () => {
               const duplicateTxs = {
                    result: {
                         transactions: [
                              {
                                   hash: 'duplicateHash',
                                   tx_json: { TransactionType: 'Payment', Fee: '12000', date: 0 },
                                   meta: {
                                        AffectedNodes: [
                                             {
                                                  ModifiedNode: {
                                                       LedgerEntryType: 'AccountRoot',
                                                       FinalFields: { Account: testAddress, Balance: '2000000' },
                                                       PreviousFields: { Balance: '1000000' },
                                                  },
                                             },
                                        ],
                                   },
                              },
                              {
                                   hash: 'duplicateHash',
                                   tx_json: { TransactionType: 'Payment', Fee: '12000', date: 0 },
                                   meta: {
                                        AffectedNodes: [
                                             {
                                                  ModifiedNode: {
                                                       LedgerEntryType: 'AccountRoot',
                                                       FinalFields: { Account: testAddress, Balance: '2000000' },
                                                       PreviousFields: { Balance: '1000000' },
                                                  },
                                             },
                                        ],
                                   },
                              },
                         ],
                         marker: null,
                    },
               };

               xrplServiceMock.getAccountTransactions.and.resolveTo(duplicateTxs);
               await service.loadBalanceChanges(true);

               expect(storeMock.appendBalanceChanges).toHaveBeenCalledTimes(1);
          });
     });

     describe('PAGE_SIZE constant', () => {
          it('should be 25', () => {
               expect((service as any).PAGE_SIZE).toBe(25);
          });
     });

     describe('Edge Cases', () => {
          it('should handle tx_json fallback to transaction', async () => {
               const txsWithTransaction = {
                    result: {
                         transactions: [
                              {
                                   hash: 'hash5',
                                   transaction: {
                                        TransactionType: 'Payment',
                                        Fee: '12000',
                                        Destination: 'rDest1',
                                        date: 0,
                                   },
                                   meta: {
                                        AffectedNodes: [
                                             {
                                                  ModifiedNode: {
                                                       LedgerEntryType: 'AccountRoot',
                                                       FinalFields: { Account: mockAddress, Balance: '2000000' },
                                                       PreviousFields: { Balance: '1000000' },
                                                  },
                                             },
                                        ],
                                   },
                              },
                         ],
                         marker: null,
                    },
               };

               xrplServiceMock.getAccountTransactions.and.resolveTo(txsWithTransaction);
               await service.loadBalanceChanges(true);

               expect(storeMock.appendBalanceChanges).toHaveBeenCalled();
          });

          it('should handle no hasMoreData', async () => {
               storeMock.hasMoreData.and.returnValue(false);
               await service.loadBalanceChanges(true);
               expect(xrplServiceMock.getAccountTransactions).not.toHaveBeenCalled();
          });
     });
});
