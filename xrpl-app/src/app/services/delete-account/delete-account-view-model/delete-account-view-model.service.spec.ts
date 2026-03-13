import { TestBed } from '@angular/core/testing';

import { DeleteAccountViewModelService } from './delete-account-view-model.service';

describe('DeleteAccountViewModelService', () => {
  let service: DeleteAccountViewModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeleteAccountViewModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
