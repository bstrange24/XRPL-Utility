import { TestBed } from '@angular/core/testing';

import { TicketsViewModelService } from './tickets-view-model.service';

describe('TicketsViewModelService', () => {
  let service: TicketsViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TicketsViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
