import { TestBed } from '@angular/core/testing';

import { InvoiceIdValidatorService } from './invoice-id-validator.service';

describe('InvoiceIdValidatorService', () => {
  let service: InvoiceIdValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InvoiceIdValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
