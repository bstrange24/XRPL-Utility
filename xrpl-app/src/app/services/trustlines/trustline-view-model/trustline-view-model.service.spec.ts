import { TestBed } from '@angular/core/testing';

import { TrustlineViewModelService } from './trustline-view-model.service';

describe('TrustlineViewModelService', () => {
  let service: TrustlineViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrustlineViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
