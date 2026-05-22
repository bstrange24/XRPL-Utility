import { TestBed } from '@angular/core/testing';

import { NftModifyValidatorService } from './nft-modify-validator.service';

describe('NftModifyValidatorService', () => {
  let service: NftModifyValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftModifyValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
