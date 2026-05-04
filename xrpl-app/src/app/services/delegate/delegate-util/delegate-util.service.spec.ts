import { TestBed } from '@angular/core/testing';
import { DelegateUtilService } from './delegate-util.service';
import { DelegateStoreService } from '../delegate-store/delegate-store.service';
import { LogServiceService } from '../../shared/log-service/log-service.service';

describe('DelegateUtilService', () => {
     let service: DelegateUtilService;
     let mockDelegateStore: any;
     let mockLogService: jasmine.SpyObj<LogServiceService>;

     beforeEach(() => {
          // Create a proper mock with setField method
          mockDelegateStore = {
               setField: jasmine.createSpy('setField'),
               updateField: jasmine.createSpy('updateField'),
               resetAll: jasmine.createSpy('resetAll'),
               getAll: jasmine.createSpy('getAll'),
          };

          mockLogService = jasmine.createSpyObj('LogServiceService', ['logObjects']);

          TestBed.configureTestingModule({
               providers: [DelegateUtilService, { provide: DelegateStoreService, useValue: mockDelegateStore }, { provide: LogServiceService, useValue: mockLogService }],
          });

          service = TestBed.inject(DelegateUtilService);
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });
     });

     describe('getExistingDelegations', () => {
          it('should filter and map delegate objects correctly', () => {
               const accountObjects = {
                    result: {
                         account_objects: [
                              {
                                   LedgerEntryType: 'Delegate',
                                   index: 'index1',
                                   Authorize: 'rAuthAddress1',
                                   Permissions: { some: 'permissions1' },
                                   Flags: 1,
                              },
                              {
                                   LedgerEntryType: 'Delegate',
                                   index: 'index2',
                                   Authorize: 'rAuthAddress2',
                                   Permissions: { some: 'permissions2' },
                                   Flags: 2,
                              },
                              {
                                   LedgerEntryType: 'Other',
                                   index: 'index3',
                                   OtherField: 'value',
                              },
                         ],
                    },
               };

               service.getExistingDelegations(accountObjects);

               const expectedMapped = [
                    {
                         LedgerEntryType: 'Delegate',
                         index: 'index1',
                         Authorize: 'rAuthAddress1',
                         Permissions: { some: 'permissions1' },
                         Flags: 1,
                    },
                    {
                         LedgerEntryType: 'Delegate',
                         index: 'index2',
                         Authorize: 'rAuthAddress2',
                         Permissions: { some: 'permissions2' },
                         Flags: 2,
                    },
               ];

               expect(mockDelegateStore.setField).toHaveBeenCalledWith('existingDelegations', expectedMapped);
               expect(mockLogService.logObjects).toHaveBeenCalledWith('existingDelegations', expectedMapped);
          });

          it('should handle empty account_objects', () => {
               const accountObjects = {
                    result: {
                         account_objects: [],
                    },
               };

               service.getExistingDelegations(accountObjects);

               expect(mockDelegateStore.setField).toHaveBeenCalledWith('existingDelegations', []);
               expect(mockLogService.logObjects).toHaveBeenCalledWith('existingDelegations', []);
          });

          it('should handle undefined account_objects', () => {
               const accountObjects = {
                    result: {
                         account_objects: undefined,
                    },
               };

               service.getExistingDelegations(accountObjects);

               expect(mockDelegateStore.setField).toHaveBeenCalledWith('existingDelegations', []);
               expect(mockLogService.logObjects).toHaveBeenCalledWith('existingDelegations', []);
          });

          it('should only include Delegate entry types', () => {
               const accountObjects = {
                    result: {
                         account_objects: [
                              {
                                   LedgerEntryType: 'Delegate',
                                   index: 'delegate1',
                                   Authorize: 'rAuth1',
                                   Permissions: {},
                                   Flags: 0,
                              },
                              {
                                   LedgerEntryType: 'AccountRoot',
                                   index: 'account1',
                                   Balance: '1000',
                              },
                              {
                                   LedgerEntryType: 'TrustSet',
                                   index: 'trust1',
                                   LimitAmount: {},
                              },
                              {
                                   LedgerEntryType: 'Delegate',
                                   index: 'delegate2',
                                   Authorize: 'rAuth2',
                                   Permissions: {},
                                   Flags: 1,
                              },
                         ],
                    },
               };

               service.getExistingDelegations(accountObjects);

               const expectedMapped = [
                    {
                         LedgerEntryType: 'Delegate',
                         index: 'delegate1',
                         Authorize: 'rAuth1',
                         Permissions: {},
                         Flags: 0,
                    },
                    {
                         LedgerEntryType: 'Delegate',
                         index: 'delegate2',
                         Authorize: 'rAuth2',
                         Permissions: {},
                         Flags: 1,
                    },
               ];

               expect(mockDelegateStore.setField).toHaveBeenCalledWith('existingDelegations', expectedMapped);
               expect(mockLogService.logObjects).toHaveBeenCalledWith('existingDelegations', expectedMapped);
          });

          it('should preserve all delegate properties', () => {
               const accountObjects = {
                    result: {
                         account_objects: [
                              {
                                   LedgerEntryType: 'Delegate',
                                   index: 'delegate1',
                                   Authorize: 'rAuthAddress',
                                   Permissions: {
                                        canDelegate: true,
                                        canProxy: false,
                                        maxAmount: '1000',
                                   },
                                   Flags: 5,
                                   ExtraField: 'extraValue', // Should not be included
                              },
                         ],
                    },
               };

               service.getExistingDelegations(accountObjects);

               const expectedMapped = [
                    {
                         LedgerEntryType: 'Delegate',
                         index: 'delegate1',
                         Authorize: 'rAuthAddress',
                         Permissions: {
                              canDelegate: true,
                              canProxy: false,
                              maxAmount: '1000',
                         },
                         Flags: 5,
                    },
               ];

               expect(mockDelegateStore.setField).toHaveBeenCalledWith('existingDelegations', expectedMapped);
          });
     });
});
