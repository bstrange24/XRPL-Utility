import { TestBed } from '@angular/core/testing';
import { TicketStore } from './tickets-store.service';

describe('TicketStore', () => {
     let service: InstanceType<typeof TicketStore>;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(TicketStore);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
