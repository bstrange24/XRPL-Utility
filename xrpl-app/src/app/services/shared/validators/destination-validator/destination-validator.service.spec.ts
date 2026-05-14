import { TestBed } from '@angular/core/testing';

import { DestinationValidatorService } from './destination-validator.service';

describe('DestinationValidatorService', () => {
  let service: DestinationValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DestinationValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
