import { TestBed } from '@angular/core/testing';

import { SufficentAccountBalanceService } from './sufficent-account-balance.service';

describe('SufficentAccountBalanceService', () => {
  let service: SufficentAccountBalanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SufficentAccountBalanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
