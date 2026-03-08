import { TestBed } from '@angular/core/testing';

import { PermissionedDomainUtilService } from './permissioned-domain-util.service';

describe('PermissionedDomainUtilService', () => {
  let service: PermissionedDomainUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PermissionedDomainUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
