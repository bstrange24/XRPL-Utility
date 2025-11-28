import { TestBed } from '@angular/core/testing';

import { TrustlineCurrencyService } from './trustline-currency.service';

describe('TrustlineCurrencyService', () => {
  let service: TrustlineCurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrustlineCurrencyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
