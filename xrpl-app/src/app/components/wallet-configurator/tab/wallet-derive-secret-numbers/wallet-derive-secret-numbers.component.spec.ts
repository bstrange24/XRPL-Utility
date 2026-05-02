import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletDeriveSecretNumbersComponent } from './wallet-derive-secret-numbers.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { signal } from '@angular/core';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../../../services/wallets/wallets-util/wallets-util.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { WalletConfiguratorComponent } from '../../wallet-configurator.component';

describe('WalletDeriveSecretNumbersComponent', () => {
     let component: WalletDeriveSecretNumbersComponent;
     let fixture: ComponentFixture<WalletDeriveSecretNumbersComponent>;

     let storeMock: any;
     let utilMock: any;
     let viewModelMock: any;
     let parentMock: any;

     beforeEach(async () => {
          storeMock = {
               secretNumbers: signal(''),
               secretNumberInput: signal(''),
               secretNumberValid: signal(false),

               // IMPORTANT: template calls this as function()
               buttonLoading: () => ({
                    deriveWalletFromSecretNumbers: false,
               }),

               setField: jasmine.createSpy('setField'),
          };

          utilMock = {
               onSecretNumberInput: jasmine.createSpy('onSecretNumberInput'),
               isAnyButtonLoading: false,
          };

          viewModelMock = {
               activeTab: signal('deriveSecretNumbers'),
          };

          parentMock = {
               deriveWalletFromSecretNumbers: jasmine.createSpy('deriveWalletFromSecretNumbers'),
          };

          await TestBed.configureTestingModule({
               imports: [WalletDeriveSecretNumbersComponent],
               providers: [provideNoopAnimations(), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, { provide: WalletsStoreService, useValue: storeMock }, { provide: WalletsUtilService, useValue: utilMock }, { provide: WalletsViewModelService, useValue: viewModelMock }, { provide: WalletConfiguratorComponent, useValue: parentMock }],
          }).compileComponents();

          fixture = TestBed.createComponent(WalletDeriveSecretNumbersComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should update secret numbers on input', () => {
          const event = {
               target: { value: '123456, 654321' },
          } as any;

          component.onSecretNumberInput(event);

          expect(storeMock.setField).toHaveBeenCalledWith('secretNumbers', '123456, 654321');

          expect(utilMock.onSecretNumberInput).toHaveBeenCalled();
     });

     it('should return correct initial validity state', () => {
          expect(storeMock.secretNumberValid()).toBeFalse();
     });

     it('should call derive wallet function', () => {
          parentMock.deriveWalletFromSecretNumbers();
          expect(parentMock.deriveWalletFromSecretNumbers).toHaveBeenCalled();
     });
});
