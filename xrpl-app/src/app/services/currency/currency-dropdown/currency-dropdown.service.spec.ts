import { TestBed } from '@angular/core/testing';

import { CurrencyDropdownService } from './currency-dropdown.service';

describe('CurrencyDropdownService', () => {
  let service: CurrencyDropdownService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrencyDropdownService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
