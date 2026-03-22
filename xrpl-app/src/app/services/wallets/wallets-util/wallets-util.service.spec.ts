import { TestBed } from '@angular/core/testing';

import { WalletsUtilService } from './wallets-util.service';

describe('WalletsUtilService', () => {
  let service: WalletsUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletsUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
