import { TestBed } from '@angular/core/testing';
import { NetworkService } from './network-service';

describe('NetworkService', () => {
     let service: NetworkService;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [NetworkService],
          });

          service = TestBed.inject(NetworkService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('networkChanged', () => {
          it('should have initial value undefined', () => {
               expect(service.networkChanged()).toBeUndefined();
          });

          it('should emit network value when announceNetworkChange is called', () => {
               const testNetwork = 'Mainnet';

               service.announceNetworkChange(testNetwork);

               expect(service.networkChanged()).toBe(testNetwork);
          });

          it('should emit multiple network values sequentially', () => {
               service.announceNetworkChange('Testnet');
               expect(service.networkChanged()).toBe('Testnet');

               service.announceNetworkChange('Devnet');
               expect(service.networkChanged()).toBe('Devnet');

               service.announceNetworkChange('Mainnet');
               expect(service.networkChanged()).toBe('Mainnet');
          });

          it('should emit empty string values', () => {
               service.announceNetworkChange('');

               expect(service.networkChanged()).toBe('');
          });

          it('should emit network values in order', () => {
               const networks = ['Network1', 'Network2', 'Network3'];

               for (const network of networks) {
                    service.announceNetworkChange(network);
                    expect(service.networkChanged()).toBe(network);
               }
          });

          it('should handle multiple subscribers', () => {
               const service2 = TestBed.inject(NetworkService);
               const testNetwork = 'Mainnet';

               service.announceNetworkChange(testNetwork);

               expect(service.networkChanged()).toBe(testNetwork);
               expect(service2.networkChanged()).toBe(testNetwork);
          });
     });
});
