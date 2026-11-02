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
               existingDelegations: jasmine.createSpy('existingDelegations').and.returnValue([]),
               actions: jasmine.createSpy('actions').and.returnValue([
                    { id: 1, key: 'Payment' },
                    { id: 2, key: 'TrustSet' },
                    { id: 3, key: 'AccountSet' },
               ]),
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
                                   Account: 'rOwnerAddress',
                                   index: 'index1',
                                   Authorize: 'rAuthAddress1',
                                   Permissions: { some: 'permissions1' },
                                   Flags: 1,
                              },
                              {
                                   LedgerEntryType: 'Delegate',
                                   Account: 'rOwnerAddress',
                                   index: 'index2',
                                   Authorize: 'rAuthAddress2',
                                   Permissions: { some: 'permissions2' },
                                   Flags: 2,
                              },
                              {
                                   LedgerEntryType: 'Delegate',
                                   Account: 'rDifferentOwner',
                                   index: 'index3',
                                   Authorize: 'rAuthAddress3',
                                   Permissions: { some: 'permissions3' },
                                   Flags: 3,
                              },
                              {
                                   LedgerEntryType: 'Other',
                                   index: 'index4',
                                   OtherField: 'value',
                              },
                         ],
                    },
               };

               service.getExistingDelegations(accountObjects, 'rOwnerAddress');

               const expectedMapped = [
                    {
                         LedgerEntryType: 'Delegate',
                         Account: 'rOwnerAddress',
                         index: 'index1',
                         Authorize: 'rAuthAddress1',
                         Permissions: { some: 'permissions1' },
                         Flags: 1,
                    },
                    {
                         LedgerEntryType: 'Delegate',
                         Account: 'rOwnerAddress',
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

               service.getExistingDelegations(accountObjects, 'rOwnerAddress');

               expect(mockDelegateStore.setField).toHaveBeenCalledWith('existingDelegations', []);
               expect(mockLogService.logObjects).toHaveBeenCalledWith('existingDelegations', []);
          });

          it('should handle undefined account_objects', () => {
               const accountObjects = {
                    result: {
                         account_objects: undefined,
                    },
               };

               service.getExistingDelegations(accountObjects, 'rOwnerAddress');

               expect(mockDelegateStore.setField).toHaveBeenCalledWith('existingDelegations', []);
               expect(mockLogService.logObjects).toHaveBeenCalledWith('existingDelegations', []);
          });

          it('should only include Delegate entry types', () => {
               const accountObjects = {
                    result: {
                         account_objects: [
                              {
                                   LedgerEntryType: 'Delegate',
                                   Account: 'rOwnerAddress',
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
                                   Account: 'rOwnerAddress',
                                   index: 'delegate2',
                                   Authorize: 'rAuth2',
                                   Permissions: {},
                                   Flags: 1,
                              },
                         ],
                    },
               };

               service.getExistingDelegations(accountObjects, 'rOwnerAddress');

               const expectedMapped = [
                    {
                         LedgerEntryType: 'Delegate',
                         Account: 'rOwnerAddress',
                         index: 'delegate1',
                         Authorize: 'rAuth1',
                         Permissions: {},
                         Flags: 0,
                    },
                    {
                         LedgerEntryType: 'Delegate',
                         Account: 'rOwnerAddress',
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
                                   Account: 'rOwnerAddress',
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

               service.getExistingDelegations(accountObjects, 'rOwnerAddress');

               const expectedMapped = [
                    {
                         LedgerEntryType: 'Delegate',
                         Account: 'rOwnerAddress',
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

     describe('getSelectedActionIds', () => {
          it('returns only known permissions for the matching owner and delegate', () => {
               mockDelegateStore.existingDelegations.and.returnValue([
                    {
                         Account: 'rOwnerAddress',
                         Authorize: 'rDelegateAddress',
                         Permissions: [
                              { Permission: { PermissionValue: 'Payment' } },
                              { Permission: { PermissionValue: 'TrustSet' } },
                              { Permission: { PermissionValue: 'UnknownPermission' } },
                         ],
                    },
                    {
                         Account: 'rOtherOwner',
                         Authorize: 'rDelegateAddress',
                         Permissions: [{ Permission: { PermissionValue: 'AccountSet' } }],
                    },
               ]);

               expect(service.getSelectedActionIds('rOwnerAddress', 'rDelegateAddress')).toEqual(new Set([1, 2]));
          });

          it('returns no selected actions when there is no matching owner and delegate', () => {
               mockDelegateStore.existingDelegations.and.returnValue([
                    {
                         Account: 'rOwnerAddress',
                         Authorize: 'rDelegateAddress',
                         Permissions: [{ Permission: { PermissionValue: 'Payment' } }],
                    },
               ]);

               expect(service.getSelectedActionIds('rOwnerAddress', 'rOtherDelegate')).toEqual(new Set());
               expect(service.getSelectedActionIds('rOtherOwner', 'rDelegateAddress')).toEqual(new Set());
          });
     });
});
