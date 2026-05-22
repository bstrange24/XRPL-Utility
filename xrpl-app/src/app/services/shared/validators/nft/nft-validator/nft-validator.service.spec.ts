import { TestBed } from '@angular/core/testing';

import { NftValidatorService } from './nft-validator.service';

describe('NftValidatorService', () => {
  let service: NftValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
