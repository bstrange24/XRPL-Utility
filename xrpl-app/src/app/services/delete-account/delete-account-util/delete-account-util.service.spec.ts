import { TestBed } from '@angular/core/testing';

import { DeleteAccountUtilService } from './delete-account-util.service';

describe('DeleteAccountUtilService', () => {
  let service: DeleteAccountUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeleteAccountUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
