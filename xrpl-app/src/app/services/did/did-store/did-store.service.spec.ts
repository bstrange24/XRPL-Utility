import { TestBed } from '@angular/core/testing';
import { DidStoreService } from './did-store.service';

describe('DidStoreService (signalStore)', () => {
     let store: InstanceType<typeof DidStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(DidStoreService);
     });

     afterEach(() => {
          store.resetAll();
     });

     it('should initialize with default state', () => {
          const state = store.getAll();

          expect(state.didData).toBe('');
          expect(state.uriData).toBe('');
          expect(state.didDocumentData).toBe('');
          expect(state.createdDids).toBeFalse();
          expect(state.existingDid).toEqual([]);
          expect(state.regularKeySigningEnabled).toBeFalse();
     });

     it('should set a field using setField', () => {
          store.setField('didData', 'did:example:123');

          expect(store.getAll().didData).toBe('did:example:123');
     });

     it('should update a field using updateField (replace value)', () => {
          store.setField('existingDid', ['a', 'b']);

          store.updateField('existingDid', current => [...current, 'c']);

          expect(store.getAll().existingDid).toEqual(['a', 'b', 'c']);
     });

     it('should reset all fields using resetAll', () => {
          store.setField('didData', 'temp');
          store.setField('createdDids', true);

          store.resetAll();

          const state = store.getAll();

          expect(state.didData).toBe('');
          expect(state.createdDids).toBeFalse();
          expect(state.existingDid).toEqual([]);
     });

     it('should clear DID-related fields only', () => {
          store.setField('didData', 'abc');
          store.setField('uriData', 'uri');
          store.setField('didDocumentData', 'doc');
          store.setField('createdDids', true);

          store.clearDidFields();

          const state = store.getAll();

          expect(state.didData).toBe('');
          expect(state.uriData).toBe('');
          expect(state.didDocumentData).toBe('');

          // untouched fields should remain
          expect(state.createdDids).toBeTrue();
     });

     it('should return full snapshot using getAll', () => {
          store.setField('didData', 'did:test');
          store.setField('regularKeySigningEnabled', true);

          const snapshot = store.getAll();

          expect(snapshot).toEqual(
               jasmine.objectContaining({
                    didData: 'did:test',
                    regularKeySigningEnabled: true,
               })
          );
     });

     it('should not mutate unrelated fields when updating one field', () => {
          store.setField('uriData', 'initial-uri');

          store.updateField('uriData', current => current + '-updated');

          const state = store.getAll();

          expect(state.uriData).toBe('initial-uri-updated');
          expect(state.didData).toBe('');
     });
});
