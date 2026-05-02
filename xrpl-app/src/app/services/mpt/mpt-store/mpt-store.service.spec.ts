import { TestBed } from '@angular/core/testing';
import { MptStoreService, MptState } from './mpt-store.service';

describe('MptStoreService', () => {
     let store: any;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(MptStoreService);
     });

     const getState = (): MptState => store.getAll();

     it('should initialize with default state', () => {
          const state = getState();

          expect(state.mptIssuanceId).toBe('');
          expect(state.tokenCount).toBe(0);
          expect(state.assetScaleCache instanceof Map).toBeTrue();
          expect(state.isMptFlagModeEnabled).toBeFalse();
     });

     it('should setField correctly', () => {
          store.setField('mptIssuanceId', 'MPT-1');
          store.setField('amount', '100');

          const state = getState();

          expect(state.mptIssuanceId).toBe('MPT-1');
          expect(state.amount).toBe('100');
     });

     it('should updateField correctly', () => {
          store.setField('tokenCount', 10);

          store.updateField('tokenCount', (v: number) => v + 5);

          expect(getState().tokenCount).toBe(15);
     });

     it('should resetAll to initial state', () => {
          store.setField('mptIssuanceId', 'X');
          store.setField('amount', '999');

          store.resetAll();

          const state = getState();

          expect(state.mptIssuanceId).toBe('');
          expect(state.amount).toBe('');
          expect(state.tokenCount).toBe(0);
     });

     it('should resetChannelIdSelection', () => {
          store.setField('mptIssuanceId', 'ABC');
          store.setField('amount', '123');

          store.resetChannelIdSelection();

          const state = getState();

          expect(state.mptIssuanceId).toBe('');
          expect(state.amount).toBe('');
     });

     it('should resetMptFields correctly', () => {
          store.setField('destination', 'dest');
          store.setField('mptIdSearchQuery', 'query');
          store.setField('outstandingMpts', 'data');
          store.setField('outstandingMptsCollapsed', true);
          store.setField('deliverMinAmount', '50');
          store.setField('useDeliverMin', true);
          store.setField('isCheckOwner', true);
          store.setField('isCollapsed', true);
          store.setField('amount', '999');

          store.resetMptFields();

          const state = getState();

          expect(state.destination).toBe('');
          expect(state.mptIdSearchQuery).toBe('');
          expect(state.outstandingMpts).toBe('');
          expect(state.outstandingMptsCollapsed).toBeFalse();
          expect(state.deliverMinAmount).toBe('');
          expect(state.useDeliverMin).toBeFalse();
          expect(state.isCheckOwner).toBeFalse();
          expect(state.isCollapsed).toBeFalse();
          expect(state.amount).toBe('');
     });

     it('should handle assetScaleCache map correctly', () => {
          const state = getState();

          expect(state.assetScaleCache instanceof Map).toBeTrue();

          state.assetScaleCache.set('token1', 8);

          expect(state.assetScaleCache.get('token1')).toBe(8);
     });

     it('should return snapshot via getAll', () => {
          store.setField('mptIssuanceId', 'snap-test');

          const snapshot = store.getAll();

          expect(snapshot.mptIssuanceId).toBe('snap-test');
          expect(snapshot).toEqual(
               jasmine.objectContaining({
                    mptIssuanceId: 'snap-test',
               })
          );
     });

     it('should not mutate unrelated fields on update', () => {
          store.setField('mptIssuanceId', 'A');
          store.setField('tokenCount', 1);

          store.updateField('tokenCount', (v: number) => v + 1);

          const state = getState();

          expect(state.tokenCount).toBe(2);
          expect(state.mptIssuanceId).toBe('A');
     });
});
