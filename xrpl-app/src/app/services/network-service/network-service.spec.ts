import { TestBed } from '@angular/core/testing';

import { NetworkServiceService } from './network-service.service';

describe('NetworkServiceService', () => {
     let service: NetworkService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(NetworkServiceService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
