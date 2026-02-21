import { TestBed } from '@angular/core/testing';

import { TicketsUtilService } from './tickets-util.service';

describe('TicketsUtilService', () => {
  let service: TicketsUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TicketsUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
