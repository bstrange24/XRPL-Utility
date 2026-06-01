import { TestBed } from '@angular/core/testing';

import { NetworkModalService } from './network-modal.service';

describe('NetworkModalService', () => {
  let service: NetworkModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NetworkModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
