import { TestBed } from '@angular/core/testing';
import { EscrowStoreService, EscrowState } from './escrow-store.service';

describe('EscrowStoreService', () => {
     let service: InstanceType<typeof EscrowStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(EscrowStoreService);
          service.resetAll();
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('initial state', () => {
          it('should have empty string fields', () => {
               expect(service.escrowSequenceNumber()).toBe('');
               expect(service.destination()).toBe('');
               expect(service.amount()).toBe('');
               expect(service.escrowOwner()).toBe('');
               expect(service.escrowIdSearchQuery()).toBe('');
               expect(service.outstandingEscrow()).toBe('');
               expect(service.condition()).toBe('');
               expect(service.fulfillment()).toBe('');
               expect(service.escrowCancelAfterExpirationDate()).toBe('');
               expect(service.escrowFinishAfterExpirationDate()).toBe('');
               expect(service.deliverMinAmount()).toBe('');
          });

          it('should have false boolean fields', () => {
               expect(service.isConditional!()).toBeFalse();
               expect(service.enableEscrowCancelAfterExpirationDate()).toBeFalse();
               expect(service.enableEscrowFinishAfterExpirationDate()).toBeFalse();
               expect(service.outstandingEscrowCollapsed()).toBeFalse();
               expect(service.useDeliverMin()).toBeFalse();
               expect(service.isEscrowOwner()).toBeFalse();
               expect(service.isCollapsed()).toBeFalse();
          });

          it('should have empty array fields', () => {
               expect(service.expiredOrFulfilledEscrows()).toEqual([]);
               expect(service.allEscrowsRaw()).toEqual([]);
               expect(service.finishEscrow()).toEqual([]);
               expect(service.existingEscrow()).toEqual([]);
               expect(service.existingIOUs()).toEqual([]);
               expect(service.existingMpts()).toEqual([]);
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
               service.setField('enableEscrowFinishAfterExpirationDate', true);
               expect(service.enableEscrowFinishAfterExpirationDate()).toBeTrue();
          });

          it('should set an array field', () => {
               const escrows = [{ id: '1' }, { id: '2' }];
               service.setField('existingEscrow', escrows);
               expect(service.existingEscrow()).toEqual(escrows);
          });

          it('should overwrite an existing value', () => {
               service.setField('escrowSequenceNumber', 'FIRST');
               service.setField('escrowSequenceNumber', 'SECOND');
               expect(service.escrowSequenceNumber()).toBe('SECOND');
          });
     });

     describe('setEscrowFinishAfterExpirationDate', () => {
          it('should set escrowFinishAfterExpirationDate', () => {
               service.setEscrowFinishAfterExpirationDate('2025-12-31T00:00');
               expect(service.escrowFinishAfterExpirationDate()).toBe('2025-12-31T00:00');
          });

          it('should clear escrowFinishAfterExpirationDate when empty string', () => {
               service.setEscrowFinishAfterExpirationDate('some-date');
               service.setEscrowFinishAfterExpirationDate('');
               expect(service.escrowFinishAfterExpirationDate()).toBe('');
          });
     });

     describe('setEscrowCancelAfterExpirationDate', () => {
          it('should set escrowCancelAfterExpirationDate', () => {
               service.setEscrowCancelAfterExpirationDate('2026-01-01T00:00');
               expect(service.escrowCancelAfterExpirationDate()).toBe('2026-01-01T00:00');
          });

          it('should clear escrowCancelAfterExpirationDate when empty string', () => {
               service.setEscrowCancelAfterExpirationDate('some-date');
               service.setEscrowCancelAfterExpirationDate('');
               expect(service.escrowCancelAfterExpirationDate()).toBe('');
          });
     });

     describe('updateField', () => {
          it('should update a string field using an updater function', () => {
               service.setField('amount', '5');
               service.updateField('amount', current => current + '0');
               expect(service.amount()).toBe('50');
          });

          it('should toggle a boolean field', () => {
               service.setField('enableEscrowFinishAfterExpirationDate', false);
               service.updateField('enableEscrowFinishAfterExpirationDate', current => !current);
               expect(service.enableEscrowFinishAfterExpirationDate()).toBeTrue();
          });

          it('should append to an array field', () => {
               service.setField('existingEscrow', [{ id: 'A' }]);
               service.updateField('existingEscrow', current => [...current, { id: 'B' }]);
               expect(service.existingEscrow().length).toBe(2);
               expect(service.existingEscrow()[1]).toEqual({ id: 'B' });
          });
     });

     describe('clearOptionalExpirationDate', () => {
          it('should clear both escrowCancelAfterExpirationDate and escrowFinishAfterExpirationDate', () => {
               service.setField('escrowCancelAfterExpirationDate', '2025-06-01T12:00');
               service.setField('escrowFinishAfterExpirationDate', '2025-07-01T12:00');
               service.clearOptionalExpirationDate();
               expect(service.escrowCancelAfterExpirationDate()).toBe('');
               expect(service.escrowFinishAfterExpirationDate()).toBe('');
          });
     });

     describe('resetChannelIdSelection', () => {
          it('should clear escrowSequenceNumber and amount', () => {
               service.setField('escrowSequenceNumber', 'SEQ123');
               service.setField('amount', '99');
               service.resetChannelIdSelection();
               expect(service.escrowSequenceNumber()).toBe('');
               expect(service.amount()).toBe('');
          });

          it('should not touch other fields', () => {
               service.setField('destination', 'rDEST');
               service.resetChannelIdSelection();
               expect(service.destination()).toBe('rDEST');
          });
     });

     describe('resetEscrowFields', () => {
          it('should reset all escrow form fields to defaults', () => {
               service.setField('escrowSequenceNumber', 'SEQ1');
               service.setField('escrowFinishAfterExpirationDate', '2026-01-01');
               service.setField('escrowCancelAfterExpirationDate', '2026-06-01');
               service.setField('enableEscrowFinishAfterExpirationDate', true);
               service.setField('enableEscrowCancelAfterExpirationDate', true);
               service.setField('destination', 'rDEST');
               service.setField('escrowOwner', 'rOWNER');
               service.setField('condition', 'COND');
               service.setField('fulfillment', 'FULFIL');
               service.setField('escrowIdSearchQuery', 'query');
               service.setField('outstandingEscrow', 'out');
               service.setField('amount', '5');
               service.setField('deliverMinAmount', '1');
               service.setField('useDeliverMin', true);
               service.setField('isEscrowOwner', true);
               service.setField('isCollapsed', true);
               service.resetEscrowFields();
               expect(service.escrowSequenceNumber()).toBe('');
               expect(service.escrowFinishAfterExpirationDate()).toBe('');
               expect(service.escrowCancelAfterExpirationDate()).toBe('');
               expect(service.enableEscrowFinishAfterExpirationDate()).toBeFalse();
               expect(service.enableEscrowCancelAfterExpirationDate()).toBeFalse();
               expect(service.destination()).toBe('');
               expect(service.escrowOwner()).toBe('');
               expect(service.condition()).toBe('');
               expect(service.fulfillment()).toBe('');
               expect(service.escrowIdSearchQuery()).toBe('');
               expect(service.outstandingEscrow()).toBe('');
               expect(service.amount()).toBe('');
               expect(service.deliverMinAmount()).toBe('');
               expect(service.useDeliverMin()).toBeFalse();
               expect(service.isEscrowOwner()).toBeFalse();
               expect(service.isCollapsed()).toBeFalse();
          });

          it('should not reset existingEscrow, existingIOUs, existingMpts, expiredOrFulfilledEscrows, allEscrowsRaw, finishEscrow', () => {
               service.setField('existingEscrow', [{ id: 'E' }]);
               service.setField('existingIOUs', [{ id: 'I' }]);
               service.setField('existingMpts', [{ id: 'M' }]);
               service.setField('expiredOrFulfilledEscrows', [{ id: 'X' }]);
               service.setField('allEscrowsRaw', [{ id: 'R' }]);
               service.setField('finishEscrow', [{ id: 'F' }]);
               service.resetEscrowFields();
               expect(service.existingEscrow()).toEqual([{ id: 'E' }]);
               expect(service.existingIOUs()).toEqual([{ id: 'I' }]);
               expect(service.existingMpts()).toEqual([{ id: 'M' }]);
               expect(service.expiredOrFulfilledEscrows()).toEqual([{ id: 'X' }]);
               expect(service.allEscrowsRaw()).toEqual([{ id: 'R' }]);
               expect(service.finishEscrow()).toEqual([{ id: 'F' }]);
          });
     });

     describe('resetAll', () => {
          it('should reset all fields to initial values', () => {
               service.setField('escrowSequenceNumber', 'SOME_SEQ');
               service.setField('existingEscrow', [{ id: 'X' }]);
               service.setField('enableEscrowFinishAfterExpirationDate', true);
               service.setField('amount', '999');
               service.resetAll();
               expect(service.escrowSequenceNumber()).toBe('');
               expect(service.existingEscrow()).toEqual([]);
               expect(service.enableEscrowFinishAfterExpirationDate()).toBeFalse();
               expect(service.amount()).toBe('');
          });

          it('should also reset preserved array fields', () => {
               service.setField('allEscrowsRaw', [{ id: 'R' }]);
               service.resetAll();
               expect(service.allEscrowsRaw()).toEqual([]);
          });
     });

     describe('getAll', () => {
          it('should return a snapshot of the current state', () => {
               service.setField('escrowSequenceNumber', 'SNAP_SEQ');
               service.setField('amount', '42');
               service.setField('destination', 'rSNAP');
               const snapshot: EscrowState = service.getAll();
               expect(snapshot.escrowSequenceNumber).toBe('SNAP_SEQ');
               expect(snapshot.amount).toBe('42');
               expect(snapshot.destination).toBe('rSNAP');
          });

          it('should include boolean and array fields', () => {
               service.setField('enableEscrowFinishAfterExpirationDate', true);
               service.setField('existingEscrow', [{ id: 'Z' }]);
               const snapshot = service.getAll();
               expect(snapshot.enableEscrowFinishAfterExpirationDate).toBeTrue();
               expect(snapshot.existingEscrow).toEqual([{ id: 'Z' }]);
          });

          it('snapshot reflects state at the time of the call', () => {
               service.setField('amount', '10');
               const snapshot = service.getAll();
               service.setField('amount', '99');
               expect(snapshot.amount).toBe('10');
          });
     });
});
