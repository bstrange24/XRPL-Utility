import { TestBed } from '@angular/core/testing';

import { TxEnvironmentServiceService } from './tx-environment-service.service';

describe('TxEnvironmentServiceService', () => {
  let service: TxEnvironmentServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TxEnvironmentServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
