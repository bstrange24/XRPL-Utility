import { TestBed } from '@angular/core/testing';
import { CreateNftStoreService, NFtState } from './nft-store.service';

describe('CreateNftStoreService', () => {
     let store: InstanceType<typeof CreateNftStoreService>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(CreateNftStoreService);
     });

     const getState = (): NFtState => store.getAll();

     it('should initialize with default state', () => {
          const state = getState();

          expect(state.nftId).toBe('');
          expect(state.nftFlags).toBe(0);
          expect(state.initialURI).toContain('ipfs');
          expect(state.enableExpirationDate).toBeFalse();
          expect(state.existingNfts).toEqual([]);
     });

     it('should setField correctly', () => {
          store.setField('nftId', '123');
          store.setField('amount', '50');

          const state = getState();

          expect(state.nftId).toBe('123');
          expect(state.amount).toBe('50');
     });

     it('should updateField correctly', () => {
          store.setField('transferFee', 10);

          store.updateField('transferFee', (current: number) => current + 5);

          expect(getState().transferFee).toBe(15);
     });

     it('should setExpiration', () => {
          store.setExpiration('2026-01-01');

          expect(getState().expiration).toBe('2026-01-01');
     });

     it('should clearExpiration', () => {
          store.setExpiration('2026-01-01');
          store.clearExpiration();

          expect(getState().expiration).toBe('');
     });

     it('should resetNftIdSelection', () => {
          store.setField('nftId', 'id');
          store.setField('nftIndex', 'index');
          store.setField('nftCreator', 'creator');
          store.setField('amount', '100');

          store.resetNftIdSelection();

          const state = getState();

          expect(state.nftId).toBe('');
          expect(state.nftIndex).toBe('');
          expect(state.nftCreator).toBe('');
          expect(state.amount).toBe('');
     });

     it('should resetNftFields', () => {
          // populate values first
          store.setField('nftId', 'id');
          store.setField('nftIndex', 'index');
          store.setField('nftOfferId', 'offer');
          store.setField('taxon', 'tax');
          store.setField('nftCreator', 'creator');
          store.setField('expiration', 'date');
          store.setField('enableExpirationDate', true);
          store.setField('enableSellOnNftCreation', true);
          store.setField('minterAddress', 'minter');
          store.setField('issuerAddress', 'issuer');
          store.setField('nftCountField', '5');
          store.setField('destination', 'dest');
          store.setField('nftIdSearchQuery', 'query');
          store.setField('outstandingNfts', 'yes');
          store.setField('nfTokenMinterAddress', 'minter2');
          store.setField('nfTokenIssuerAddress', 'issuer2');
          store.setField('amount', '200');
          store.setField('transferFee', 25);
          store.setField('isNftOwner', true);
          store.setField('isCollapsed', true);

          store.resetNftFields();

          const state = getState();

          expect(state.nftId).toBe('');
          expect(state.nftIndex).toBe('');
          expect(state.nftOfferId).toBe('');
          expect(state.taxon).toBe('');
          expect(state.nftCreator).toBe('');
          expect(state.expiration).toBe('');
          expect(state.enableExpirationDate).toBeFalse();
          expect(state.enableSellOnNftCreation).toBeFalse();
          expect(state.minterAddress).toBe('');
          expect(state.issuerAddress).toBe('');
          expect(state.initialURI).toContain('ipfs');
          expect(state.nftCountField).toBe('');
          expect(state.destination).toBe('');
          expect(state.nftIdSearchQuery).toBe('');
          expect(state.outstandingNfts).toBe('');
          expect(state.nfTokenMinterAddress).toBe('');
          expect(state.nfTokenIssuerAddress).toBe('');
          expect(state.amount).toBe('');
          expect(state.transferFee).toBe(0);
          expect(state.isNftOwner).toBeFalse();
          expect(state.isCollapsed).toBeFalse();
     });

     it('should resetAll to initial state', () => {
          store.setField('nftId', 'modified');
          store.setField('amount', '999');

          store.resetAll();

          const state = getState();

          expect(state.nftId).toBe('');
          expect(state.amount).toBe('');
          expect(state.transferFee).toBe(0);
     });

     it('should return snapshot via getAll', () => {
          store.setField('nftId', 'snapshot-test');

          const snapshot = store.getAll();

          expect(snapshot.nftId).toBe('snapshot-test');
          expect(snapshot).toEqual(
               jasmine.objectContaining({
                    nftId: 'snapshot-test',
               })
          );
     });

     it('should handle multiple updates correctly', () => {
          store.setField('amount', '10');

          store.updateField('amount', (val: any) => String(Number(val) * 2));

          expect(getState().amount).toBe('20');
     });

     it('should not mutate unrelated fields when updating', () => {
          store.setField('nftId', 'id1');
          store.setField('amount', '50');

          store.updateField('amount', () => '100');

          const state = getState();

          expect(state.amount).toBe('100');
          expect(state.nftId).toBe('id1');
     });
});
