import { TestBed } from '@angular/core/testing';

import { CurrencyStoreService } from './currency-store.service';

describe('CurrencyStoreService', () => {
  let service: CurrencyStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrencyStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
