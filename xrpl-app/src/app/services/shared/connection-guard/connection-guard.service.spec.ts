import { TestBed } from '@angular/core/testing';

import { ConnectionGuardService } from './connection-guard.service';

describe('ConnectionGuardService', () => {
  let service: ConnectionGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConnectionGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
