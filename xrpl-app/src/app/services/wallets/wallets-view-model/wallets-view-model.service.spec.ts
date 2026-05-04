import { TestBed } from '@angular/core/testing';
import { WalletsViewModelService } from './wallets-view-model.service';
import { WalletGeneratorActionTypes } from '../../../components/wallet-configurator/constants/wallet-generator.types';

describe('WalletsViewModelService', () => {
     let service: WalletsViewModelService;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [WalletsViewModelService],
          });

          service = TestBed.inject(WalletsViewModelService);
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });

          it('should initialize activeTab to "generate"', () => {
               expect(service.activeTab()).toBe('generate');
          });
     });

     describe('activeTab signal', () => {
          it('should allow updating activeTab value', () => {
               service.activeTab.set('deriveSeed');
               expect(service.activeTab()).toBe('deriveSeed');
          });

          it('should allow setting to different valid types', () => {
               const types: WalletGeneratorActionTypes[] = ['generate', 'deriveSeed', 'deriveMnemonic', 'deriveSecretNumbers', 'removeCustomWallets'];

               types.forEach(type => {
                    service.activeTab.set(type);
                    expect(service.activeTab()).toBe(type);
               });
          });
     });
});
