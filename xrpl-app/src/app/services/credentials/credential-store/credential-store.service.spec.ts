import { CredentialStore } from './credential-store.service';

describe('CredentialStore (strict)', () => {
     let store: InstanceType<typeof CredentialStore>;

     beforeEach(() => {
          store = new (CredentialStore as any)();
     });

     it('should set field generically', () => {
          store.setField('credentialID', '123');

          expect(store.credentialID()).toBe('123');
     });

     it('should set credential expiration via dedicated setter', () => {
          store.setCredentialSubjectExpirationDate('2026-01-01');

          expect(store.expirationDate()).toBe('2026-01-01');
     });

     it('should update field using updater function', () => {
          store.setField('credentialType', 'A');

          store.updateField('credentialType', current => current + 'B');

          expect(store.credentialType()).toBe('AB');
     });

     it('should clear optional expiration date', () => {
          store.setField('expirationDate', '2026');

          store.clearOptionalExpirationDate();

          expect(store.expirationDate()).toBe('');
     });

     it('should reset credential dropdown fields only', () => {
          store.setField('credentialID', 'A');
          store.setField('credentialType', 'B');
          store.setField('credentialIssuer', 'C');
          store.setField('selectedCredentials', {});

          store.resetCredentialIdDropDown();

          expect(store.credentialID()).toBe('');
          expect(store.credentialType()).toBe('');
          expect(store.credentialIssuer()).toBe('');
          expect(store.selectedCredentials()).toBeNull();
     });

     it('should reset credential form fields', () => {
          store.setField('credentialID', 'A');
          store.setField('subject', 'rSUB');
          store.setField('uri', 'https://x');

          store.resetCredentailFields();

          expect(store.credentialID()).toBe('');
          expect(store.subject()).toBe('');
          expect(store.uri()).toBe('');
          expect(store.credentialIDs()).toEqual([]);
     });

     it('should reset all state', () => {
          store.setField('credentialID', 'A');
          store.setField('subject', 'rSUB');

          store.resetAll();

          expect(store.credentialID()).toBe('');
          expect(store.subject()).toBe('');
          expect(store.expirationDate()).toBe('');
     });

     it('should return computed credentialSubjectExpirationDate correctly', () => {
          store.setField('expirationDate', '2026-05-01');

          const value = store.credentialSubjectExpirationDate();

          expect(value).toBe('2026-05-01');
     });

     it('should return full snapshot via getAll', () => {
          store.setField('credentialID', '123');
          store.setField('subject', 'rTEST');

          const snapshot = store.getAll();

          expect(snapshot.credentialID).toBe('123');
          expect(snapshot.subject).toBe('rTEST');
     });
});
