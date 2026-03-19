import { TestBed } from '@angular/core/testing';
import { AccountDeleteViewModelService } from './account-delete-view-model.service';

describe('AccountDeleteViewModelService', () => {
     let service: AccountDeleteViewModelService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(AccountDeleteViewModelService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
