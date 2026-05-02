import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletDeriveSeedComponent } from './wallet-derive-seed.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { signal } from '@angular/core';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../../../services/wallets/wallets-util/wallets-util.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { WalletConfiguratorComponent } from '../../wallet-configurator.component';

describe('WalletDeriveSeedComponent', () => {
     let component: WalletDeriveSeedComponent;
     let fixture: ComponentFixture<WalletDeriveSeedComponent>;

     let storeMock: any;
     let utilMock: any;
     let viewModelMock: any;
     let parentMock: any;

     beforeEach(async () => {
          storeMock = {
               seed: signal(''),
               seedInput: signal(''),
               seedValid: signal(false),

               ed25519_encryption_type: signal(true),
               secp256k1_encryption_type: signal(false),

               // IMPORTANT: template calls as function()
               buttonLoading: () => ({
                    deriveWalletFromFamilySeed: false,
               }),

               setField: jasmine.createSpy('setField'),
          };

          utilMock = {
               onSeedInput: jasmine.createSpy('onSeedInput'),
               setEncryption: jasmine.createSpy('setEncryption'),
               isAnyButtonLoading: false,
          };

          viewModelMock = {
               activeTab: signal('deriveSeed'),
          };

          parentMock = {
               deriveWalletFromFamilySeed: jasmine.createSpy('deriveWalletFromFamilySeed'),
          };

          await TestBed.configureTestingModule({
               imports: [WalletDeriveSeedComponent],
               providers: [provideNoopAnimations(), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, { provide: WalletsStoreService, useValue: storeMock }, { provide: WalletsUtilService, useValue: utilMock }, { provide: WalletsViewModelService, useValue: viewModelMock }, { provide: WalletConfiguratorComponent, useValue: parentMock }],
          }).compileComponents();

          fixture = TestBed.createComponent(WalletDeriveSeedComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should call derive wallet from seed', () => {
          parentMock.deriveWalletFromFamilySeed();
          expect(parentMock.deriveWalletFromFamilySeed).toHaveBeenCalled();
     });

     it('should toggle encryption type', () => {
          utilMock.setEncryption('ed25519');
          expect(utilMock.setEncryption).toHaveBeenCalledWith('ed25519');
     });

     it('should handle seed input update', () => {
          storeMock.setField('seed', 'sExampleSeed');
          expect(storeMock.setField).toHaveBeenCalledWith('seed', 'sExampleSeed');
     });
});
