import { TestBed } from '@angular/core/testing';
import { PermissionedDomainStoreService } from './permissioned-domain-store.service';

describe('PermissionedDomainStoreService (100% coverage)', () => {
     let store: InstanceType<typeof PermissionedDomainStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(PermissionedDomainStoreService);
     });

     afterEach(() => {
          store.resetAll();
     });

     // -------------------------
     // INITIAL STATE
     // -------------------------

     it('should initialize with default state', () => {
          const state = store.getAll();

          expect(state.createdPermissionedDomains).toEqual([]);
          expect(state.createdDomains).toEqual([]);
          expect(state.setAcceptedCredentials).toEqual([]);
          expect(state.selectedDomainId).toBe('');
          expect(state.credentialType).toBe('');
          expect(state.domainMode).toBe('create');
     });

     // -------------------------
     // setField
     // -------------------------

     it('should set string field', () => {
          store.setField('credentialType', 'KYC');

          expect(store.getAll().credentialType).toBe('KYC');
     });

     it('should set array field', () => {
          store.setField('createdDomains', [{ id: 1 }]);

          expect(store.getAll().createdDomains.length).toBe(1);
     });

     // -------------------------
     // updateField
     // -------------------------

     it('should update field using updater', () => {
          store.setField('credentialIssuer', 'issuer');

          store.updateField('credentialIssuer', val => val + '_updated');

          expect(store.getAll().credentialIssuer).toBe('issuer_updated');
     });

     it('should update array immutably', () => {
          store.setField('setAcceptedCredentials', ['a']);

          const before = store.getAll().setAcceptedCredentials;

          store.updateField('setAcceptedCredentials', arr => [...arr, 'b']);

          const after = store.getAll().setAcceptedCredentials;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });

     it('should handle no-op updater', () => {
          store.setField('subject', 'user');

          store.updateField('subject', v => v);

          expect(store.getAll().subject).toBe('user');
     });

     // -------------------------
     // resetDomainDropDown
     // -------------------------

     it('should reset only selectedDomainId', () => {
          store.setField('selectedDomainId', '123');
          store.setField('credentialType', 'type');

          store.resetDomainDropDown();

          const state = store.getAll();

          expect(state.selectedDomainId).toBe('');
          expect(state.credentialType).toBe('type'); // unchanged
     });

     // -------------------------
     // resetDomainFields
     // -------------------------

     it('should reset domain-related fields', () => {
          store.setField('selectedDomainId', '123');
          store.setField('credentialType', 'type');
          store.setField('setAcceptedCredentials', ['x']);
          store.setField('domainId', 'domain1');
          store.setField('subject', 'user'); // should NOT reset

          store.resetDomainFields();

          const state = store.getAll();

          expect(state.selectedDomainId).toBe('');
          expect(state.credentialType).toBe('');
          expect(state.setAcceptedCredentials).toEqual([]);
          expect(state.domainId).toBe('');
          expect(state.subject).toBe('user'); // unchanged
     });

     // -------------------------
     // resetAll
     // -------------------------

     it('should fully reset store', () => {
          store.setField('credentialType', 'dirty');
          store.setField('domainMode', 'edit');

          store.resetAll();

          const state = store.getAll();

          expect(state.credentialType).toBe('');
          expect(state.domainMode).toBe('create');
     });

     it('should deep clone state on resetAll', () => {
          const before = store.getAll().createdDomains;

          store.resetAll();

          const after = store.getAll().createdDomains;

          expect(before).not.toBe(after);
     });

     // -------------------------
     // getAll snapshot
     // -------------------------

     it('should return full snapshot', () => {
          store.setField('subject', 'alice');

          const snapshot = store.getAll();

          expect(snapshot.subject).toBe('alice');
     });

     // -------------------------
     // getAll catch branch (critical for 100%)
     // -------------------------

     it('should ignore failing functions in getAll', () => {
          (store as any).badFn = () => {
               throw new Error('fail');
          };

          const snapshot = store.getAll();

          expect(snapshot).toBeTruthy();
          expect(snapshot.domainMode).toBeDefined();
     });

     // -------------------------
     // edge cases
     // -------------------------

     it('should handle empty string updates', () => {
          store.setField('credentialIssuer', 'issuer');
          store.setField('credentialIssuer', '');

          expect(store.getAll().credentialIssuer).toBe('');
     });

     it('should preserve immutability for arrays', () => {
          store.setField('createdPermissionedDomains', [{ id: 1 }]);

          const before = store.getAll().createdPermissionedDomains;

          store.setField('createdPermissionedDomains', [...before, { id: 2 }]);

          const after = store.getAll().createdPermissionedDomains;

          expect(before.length).toBe(1);
          expect(after.length).toBe(2);
     });
});
