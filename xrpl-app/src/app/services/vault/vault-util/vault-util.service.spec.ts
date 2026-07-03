import { TestBed } from '@angular/core/testing';

import { VaultUtilService } from './vault-util.service';

describe('VaultUtilService', () => {
     let service: VaultUtilService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(VaultUtilService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     it('should preserve MPT amounts in vault summaries', () => {
          const asset = { mpt_issuance_id: '003242FC59F3707C3749F18AA7B586FDBFA30FF03CADF81E' };
          const result = service.formatVaultAmount(asset, '456120000');

          expect(result).toContain('456120000 MPT');
     });
});
