import { TestBed } from '@angular/core/testing';

import { AcccountDataService } from './acccount-data.service';

describe('AcccountDataService', () => {
  let service: AcccountDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AcccountDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
