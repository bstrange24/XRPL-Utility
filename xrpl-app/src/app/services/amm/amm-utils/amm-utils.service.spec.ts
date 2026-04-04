import { TestBed } from '@angular/core/testing';

import { AmmUtilsService } from './amm-utils.service';

describe('AmmUtilsService', () => {
  let service: AmmUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AmmUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
