import { TestBed } from '@angular/core/testing';

import { TicketsStoreService } from './tickets-store.service';

describe('TicketsStoreService', () => {
  let service: TicketsStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TicketsStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
