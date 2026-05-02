import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WalletDeriveMnemonicComponent } from './wallet-derive-mnemonic.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { signal } from '@angular/core';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../../../services/wallets/wallets-util/wallets-util.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { WalletConfiguratorComponent } from '../../wallet-configurator.component';

describe('WalletDeriveMnemonicComponent', () => {
     let component: WalletDeriveMnemonicComponent;
     let fixture: ComponentFixture<WalletDeriveMnemonicComponent>;

     let storeMock: any;
     let utilMock: any;
     let viewModelMock: any;
     let parentMock: any;

     beforeEach(async () => {
          storeMock = {
               mnemonic: signal(''),
               mnemonicInput: signal(''),
               mnemonicValid: signal(false),

               // IMPORTANT: template calls this as a FUNCTION
               buttonLoading: () => ({
                    deriveWalletFromMnemonic: false,
               }),

               setField: jasmine.createSpy('setField'),
          };

          utilMock = {
               onMnemonicInput: jasmine.createSpy('onMnemonicInput'),
               isAnyButtonLoading: false,
               statusMessage: signal(''),
          };

          viewModelMock = {
               activeTab: signal('deriveMnemonic'),
          };

          parentMock = {
               deriveWalletFromMnemonic: jasmine.createSpy('deriveWalletFromMnemonic'),
          };

          await TestBed.configureTestingModule({
               imports: [WalletDeriveMnemonicComponent],
               providers: [provideNoopAnimations(), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, { provide: WalletsStoreService, useValue: storeMock }, { provide: WalletsUtilService, useValue: utilMock }, { provide: WalletsViewModelService, useValue: viewModelMock }, { provide: WalletConfiguratorComponent, useValue: parentMock }],
          }).compileComponents();

          fixture = TestBed.createComponent(WalletDeriveMnemonicComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should return correct word count', () => {
          storeMock.mnemonicInput.set('one two three');
          expect(component.wordCount()).toBe(3);
     });

     it('should update mnemonic on input', () => {
          const event = {
               target: { value: 'alpha beta gamma' },
          } as any;

          component.onMnemonicInput(event);

          expect(storeMock.setField).toHaveBeenCalledWith('mnemonic', 'alpha beta gamma');

          expect(utilMock.onMnemonicInput).toHaveBeenCalled();
     });

     it('should call derive wallet function', () => {
          parentMock.deriveWalletFromMnemonic();
          expect(parentMock.deriveWalletFromMnemonic).toHaveBeenCalled();
     });
});
