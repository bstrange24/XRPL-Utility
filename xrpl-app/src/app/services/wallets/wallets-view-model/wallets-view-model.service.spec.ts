import { TestBed } from '@angular/core/testing';

import { WalletsViewModelService } from './wallets-view-model.service';

describe('WalletsViewModelService', () => {
  let service: WalletsViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletsViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
