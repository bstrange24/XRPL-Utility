import { TestBed } from '@angular/core/testing';

import { PermissionedDomainViewModelService } from './permissioned-domain-view-model.service';

describe('PermissionDomainViewModelService', () => {
     let service: PermissionedDomainViewModelService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(PermissionedDomainViewModelService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
