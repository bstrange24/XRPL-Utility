import { TestBed } from '@angular/core/testing';
import { WalletGeneratorService } from './wallet-generator.service';

describe('WalletGeneratorService', () => {
     let service: WalletGeneratorService;

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(WalletGeneratorService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });
});
