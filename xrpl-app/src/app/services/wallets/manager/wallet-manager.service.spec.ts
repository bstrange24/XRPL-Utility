import { TestBed } from '@angular/core/testing';

import { WalletManagerService } from './wallet-manager.service';

describe('WalletManagerService', () => {
  let service: WalletManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
