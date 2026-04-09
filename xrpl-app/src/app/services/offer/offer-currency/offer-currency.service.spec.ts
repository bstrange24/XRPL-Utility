import { TestBed } from '@angular/core/testing';

import { OfferCurrencyService } from './offer-currency.service';

describe('OfferCurrencyService', () => {
  let service: OfferCurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OfferCurrencyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
