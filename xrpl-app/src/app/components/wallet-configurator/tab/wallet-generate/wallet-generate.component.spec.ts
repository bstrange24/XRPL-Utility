import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletGenerateComponent } from './wallet-generate.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../../../services/wallets/wallets-util/wallets-util.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { WalletConfiguratorComponent } from '../../wallet-configurator.component';

describe('WalletGenerateComponent', () => {
     let component: WalletGenerateComponent;
     let fixture: ComponentFixture<WalletGenerateComponent>;

     let storeMock: any;
     let utilMock: any;
     let vmMock: any;
     let configMock: any;

     beforeEach(async () => {
          storeMock = {
               ed25519_encryption_type: signal(true),
               secp256k1_encryption_type: signal(false),

               buttonLoading: signal({
                    generateNewWalletFromSeed: false,
                    generateNewWalletFromMnemonic: false,
                    generateNewWalletFromSecretNumbers: false,
               }),
          };

          utilMock = {
               isAnyButtonLoading: false,
               setEncryption: jasmine.createSpy('setEncryption'),
          };

          vmMock = {
               activeTab: signal('generate'),
          };

          configMock = {
               generateNewAccount: jasmine.createSpy('generateNewAccount'),
               generateNewWalletFromMnemonic: jasmine.createSpy('generateNewWalletFromMnemonic'),
               generateNewWalletFromSecretNumbers: jasmine.createSpy('generateNewWalletFromSecretNumbers'),
          };

          await TestBed.configureTestingModule({
               imports: [WalletGenerateComponent],
               providers: [provideNoopAnimations(), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, { provide: WalletsStoreService, useValue: storeMock }, { provide: WalletsUtilService, useValue: utilMock }, { provide: WalletsViewModelService, useValue: vmMock }, { provide: WalletConfiguratorComponent, useValue: configMock }],
          }).compileComponents();

          fixture = TestBed.createComponent(WalletGenerateComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should call generateNewAccount', () => {
          configMock.generateNewAccount();
          expect(configMock.generateNewAccount).toHaveBeenCalled();
     });

     it('should call generateNewWalletFromMnemonic', () => {
          configMock.generateNewWalletFromMnemonic();
          expect(configMock.generateNewWalletFromMnemonic).toHaveBeenCalled();
     });

     it('should call generateNewWalletFromSecretNumbers', () => {
          configMock.generateNewWalletFromSecretNumbers();
          expect(configMock.generateNewWalletFromSecretNumbers).toHaveBeenCalled();
     });

     it('should toggle encryption to ED25519', () => {
          component.walletsUtilService.setEncryption('ed25519');
          expect(utilMock.setEncryption).toHaveBeenCalledWith('ed25519');
     });

     it('should toggle encryption to SECP256K1', () => {
          component.walletsUtilService.setEncryption('secp256k1');
          expect(utilMock.setEncryption).toHaveBeenCalledWith('secp256k1');
     });
});
