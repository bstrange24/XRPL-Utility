import { TestBed } from '@angular/core/testing';

import { NftCreateValidatorService } from './nft-create-validator.service';

describe('NftCreateValidatorService', () => {
  let service: NftCreateValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftCreateValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
