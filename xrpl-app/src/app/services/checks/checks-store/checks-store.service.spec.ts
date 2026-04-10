import { TestBed } from '@angular/core/testing';
import { ChecksStoreService, CheckState } from './checks-store.service';

describe('ChecksStoreService', () => {
     let service: InstanceType<typeof ChecksStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(ChecksStoreService);
          service.resetAll();
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('initial state', () => {
          it('should have empty string fields', () => {
               expect(service.checkIdField()).toBe('');
               expect(service.destination()).toBe('');
               expect(service.amount()).toBe('');
               expect(service.checkCreator()).toBe('');
               expect(service.checkIdSearchQuery()).toBe('');
               expect(service.mptIssuanceIdField()).toBe('');
               expect(service.checkExpirationDate()).toBe('');
               expect(service.deliverMinAmount()).toBe('');
          });

          it('should have false boolean fields', () => {
               expect(service.enableExpirationDate()).toBeFalse();
               expect(service.outstandingChecksCollapsed()).toBeFalse();
               expect(service.useDeliverMin()).toBeFalse();
               expect(service.isCheckOwner()).toBeFalse();
               expect(service.isCollapsed()).toBeFalse();
          });

          it('should have empty array fields', () => {
               expect(service.cancellableChecks()).toEqual([]);
               expect(service.cashableChecks()).toEqual([]);
               expect(service.existingChecks()).toEqual([]);
               expect(service.existingIOUs()).toEqual([]);
          });
     });

     describe('setField', () => {
          it('should set a string field', () => {
               service.setField('destination', 'rABCDEF');
               expect(service.destination()).toBe('rABCDEF');
          });

          it('should set amount field', () => {
               service.setField('amount', '10.5');
               expect(service.amount()).toBe('10.5');
          });

          it('should set a boolean field', () => {
               service.setField('enableExpirationDate', true);
               expect(service.enableExpirationDate()).toBeTrue();
          });

          it('should set an array field', () => {
               const checks = [{ id: '1' }, { id: '2' }];
               service.setField('existingChecks', checks);
               expect(service.existingChecks()).toEqual(checks);
          });

          it('should overwrite an existing value', () => {
               service.setField('checkIdField', 'FIRST');
               service.setField('checkIdField', 'SECOND');
               expect(service.checkIdField()).toBe('SECOND');
          });
     });

     describe('setCheckExpirationDate', () => {
          it('should set checkExpirationDate', () => {
               service.setCheckExpirationDate('2025-12-31T00:00');
               expect(service.checkExpirationDate()).toBe('2025-12-31T00:00');
          });

          it('should clear checkExpirationDate when empty string', () => {
               service.setCheckExpirationDate('some-date');
               service.setCheckExpirationDate('');
               expect(service.checkExpirationDate()).toBe('');
          });
     });

     describe('updateField', () => {
          it('should update a string field using an updater function', () => {
               service.setField('amount', '5');
               service.updateField('amount', current => current + '0');
               expect(service.amount()).toBe('50');
          });

          it('should toggle a boolean field', () => {
               service.setField('enableExpirationDate', false);
               service.updateField('enableExpirationDate', current => !current);
               expect(service.enableExpirationDate()).toBeTrue();
          });

          it('should append to an array field', () => {
               service.setField('existingChecks', [{ id: 'A' }]);
               service.updateField('existingChecks', current => [...current, { id: 'B' }]);
               expect(service.existingChecks().length).toBe(2);
               expect(service.existingChecks()[1]).toEqual({ id: 'B' });
          });
     });

     describe('clearOptionalExpirationDate', () => {
          it('should set checkExpirationDate to empty string', () => {
               service.setField('checkExpirationDate', '2025-06-01T12:00');
               service.clearOptionalExpirationDate();
               expect(service.checkExpirationDate()).toBe('');
          });
     });

     describe('resetChannelIdSelection', () => {
          it('should clear checkIdField, mptIssuanceIdField and amount', () => {
               service.setField('checkIdField', 'ABC123');
               service.setField('mptIssuanceIdField', 'MPT_ID');
               service.setField('amount', '99');
               service.resetChannelIdSelection();
               expect(service.checkIdField()).toBe('');
               expect(service.mptIssuanceIdField()).toBe('');
               expect(service.amount()).toBe('');
          });

          it('should not touch other fields', () => {
               service.setField('destination', 'rDEST');
               service.resetChannelIdSelection();
               expect(service.destination()).toBe('rDEST');
          });
     });

     describe('resetCheckFields', () => {
          it('should reset all check form fields to defaults', () => {
               service.setField('checkIdField', 'ID1');
               service.setField('checkExpirationDate', '2026-01-01');
               service.setField('enableExpirationDate', true);
               service.setField('destination', 'rDEST');
               service.setField('checkIdSearchQuery', 'query');
               service.setField('mptIssuanceIdField', 'MPTID');
               service.setField('amount', '5');
               service.setField('deliverMinAmount', '1');
               service.setField('useDeliverMin', true);
               service.setField('isCheckOwner', true);
               service.setField('isCollapsed', true);
               service.resetCheckFields();
               expect(service.checkIdField()).toBe('');
               expect(service.checkExpirationDate()).toBe('');
               expect(service.enableExpirationDate()).toBeFalse();
               expect(service.destination()).toBe('');
               expect(service.checkIdSearchQuery()).toBe('');
               expect(service.mptIssuanceIdField()).toBe('');
               expect(service.amount()).toBe('');
               expect(service.deliverMinAmount()).toBe('');
               expect(service.useDeliverMin()).toBeFalse();
               expect(service.isCheckOwner()).toBeFalse();
               expect(service.isCollapsed()).toBeFalse();
          });

          it('should not reset existingChecks (not in resetCheckFields)', () => {
               service.setField('existingChecks', [{ id: 'X' }]);
               service.resetCheckFields();
               expect(service.existingChecks()).toEqual([{ id: 'X' }]);
          });
     });

     describe('resetAll', () => {
          it('should reset all fields to initial values', () => {
               service.setField('checkIdField', 'SOME_ID');
               service.setField('existingChecks', [{ id: 'X' }]);
               service.setField('enableExpirationDate', true);
               service.setField('amount', '999');
               service.resetAll();
               expect(service.checkIdField()).toBe('');
               expect(service.existingChecks()).toEqual([]);
               expect(service.enableExpirationDate()).toBeFalse();
               expect(service.amount()).toBe('');
          });
     });

     describe('getAll', () => {
          it('should return a snapshot of the current state', () => {
               service.setField('checkIdField', 'SNAP_ID');
               service.setField('amount', '42');
               service.setField('destination', 'rSNAP');
               const snapshot: CheckState = service.getAll();
               expect(snapshot.checkIdField).toBe('SNAP_ID');
               expect(snapshot.amount).toBe('42');
               expect(snapshot.destination).toBe('rSNAP');
          });

          it('should include boolean and array fields', () => {
               service.setField('enableExpirationDate', true);
               service.setField('existingChecks', [{ id: 'Z' }]);
               const snapshot = service.getAll();
               expect(snapshot.enableExpirationDate).toBeTrue();
               expect(snapshot.existingChecks).toEqual([{ id: 'Z' }]);
          });

          it('snapshot reflects state at the time of the call', () => {
               service.setField('amount', '10');
               const snapshot = service.getAll();
               service.setField('amount', '99');
               expect(snapshot.amount).toBe('10');
          });
     });
});
