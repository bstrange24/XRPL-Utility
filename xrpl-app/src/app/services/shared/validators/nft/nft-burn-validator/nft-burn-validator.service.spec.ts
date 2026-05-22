import { TestBed } from '@angular/core/testing';

import { NftBurnValidatorService } from './nft-burn-validator.service';

describe('NftBurnValidatorService', () => {
  let service: NftBurnValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftBurnValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
