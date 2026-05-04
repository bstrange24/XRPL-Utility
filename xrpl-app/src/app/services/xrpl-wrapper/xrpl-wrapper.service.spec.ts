import { TestBed } from '@angular/core/testing';

import { XrplWrapperService } from './xrpl-wrapper.service';

describe('XrplWrapperService', () => {
     let service: XrplWrapperService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(XrplWrapperService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
