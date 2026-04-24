import { TestBed } from '@angular/core/testing';

import { SummaryTextConfigService } from './summary-text-config.service';

describe('SummaryTextConfigService', () => {
  let service: SummaryTextConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SummaryTextConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
