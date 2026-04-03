import { TestBed } from '@angular/core/testing';

import { NftUtilService } from './nft-util.service';

describe('NftUtilService', () => {
  let service: NftUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NftUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
