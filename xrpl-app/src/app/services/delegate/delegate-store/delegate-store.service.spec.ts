import { TestBed } from '@angular/core/testing';
import { DelegateStoreService, DelegateState } from './delegate-store.service';

describe('DelegateStoreService', () => {
     let store: any;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(DelegateStoreService);
     });

     const getState = (): DelegateState => store.getAll();

     it('should initialize with default state', () => {
          const state = getState();

          expect(state.selected instanceof Set).toBeTrue();
          expect(state.selected.size).toBe(0);

          // expect(state.delegateSelections).toEqual({});
          expect(state.leftActions).toEqual([]);
          expect(state.rightActions).toEqual([]);
          expect(state.createdDelegations).toBeFalse();
     });

     it('should setField correctly', () => {
          store.setField('destination', 'rAddress');
          store.setField('createdDelegations', true);

          const state = getState();

          expect(state.destination).toBe('rAddress');
          expect(state.createdDelegations).toBeTrue();
     });

     it('should updateField correctly', () => {
          store.setField('destination', 'A');

          store.updateField('destination', (v: string) => v + 'B');

          expect(getState().destination).toBe('AB');
     });

     it('should resetAll to initial state', () => {
          store.setField('destination', 'temp');
          store.setField('createdDelegations', true);

          store.resetAll();

          const state = getState();

          expect(state.destination).toBe('');
          expect(state.createdDelegations).toBeFalse();
          expect(state.selected instanceof Set).toBeTrue();
          // expect(state.selected.size).toBe(0);
     });

     it('should resetChannelIdSelection correctly', () => {
          const selected = new Set<number>();
          selected.add(1);

          const selections: Record<string, Set<number>> = {
               test: new Set([1, 2]),
          };

          store.setField('selected', selected);
          store.setField('delegateSelections', selections);
          store.setField('leftActions', [{ id: 1 } as any]);
          store.setField('rightActions', [{ id: 2 } as any]);

          store.resetChannelIdSelection();

          const state = getState();

          expect(state.selected.size).toBe(0);
          expect(state.delegateSelections).toEqual({});
          expect(state.leftActions).toEqual([]);
          expect(state.rightActions).toEqual([]);
     });

     it('should resetCheckFields correctly', () => {
          store.setField('destination', 'abc');
          store.setField('isCollapsed', true);

          store.resetCheckFields();

          const state = getState();

          expect(state.destination).toBe('');
          expect(state.isCollapsed).toBeFalse();
     });

     it('should handle Set mutation correctly', () => {
          const state = getState();

          state.selected.add(10);
          state.selected.add(20);

          expect(state.selected.has(10)).toBeTrue();
          expect(state.selected.has(20)).toBeTrue();
     });

     it('should handle delegateSelections map correctly', () => {
          const state = getState();

          state.delegateSelections['wallet1'] = new Set([1, 2]);

          expect(state.delegateSelections['wallet1'].has(1)).toBeTrue();
     });

     it('should return snapshot via getAll', () => {
          store.setField('destination', 'snap');

          const snapshot = store.getAll();

          expect(snapshot.destination).toBe('snap');
          expect(snapshot).toEqual(
               jasmine.objectContaining({
                    destination: 'snap',
               })
          );
     });

     it('should not mutate unrelated fields on update', () => {
          store.setField('destination', 'X');
          store.setField('createdDelegations', true);

          store.updateField('destination', (v: string) => v + 'Y');

          const state = getState();

          expect(state.destination).toBe('XY');
          expect(state.createdDelegations).toBeTrue();
     });
});
