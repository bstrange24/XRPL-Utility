import { TestBed } from '@angular/core/testing';

import { DidViewModelService } from './did-view-model.service';

describe('DidViewModelService', () => {
  let service: DidViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DidViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
