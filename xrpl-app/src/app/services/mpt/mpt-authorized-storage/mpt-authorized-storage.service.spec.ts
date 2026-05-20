import { TestBed } from '@angular/core/testing';

import { MptAuthorizedStorageService } from './mpt-authorized-storage.service';

describe('MptAuthorizedStorageService', () => {
  let service: MptAuthorizedStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MptAuthorizedStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
