import { TestBed } from '@angular/core/testing';

import { RefershWalletsService } from './refersh-wallets.service';

describe('RefershWalletsService', () => {
  let service: RefershWalletsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RefershWalletsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
