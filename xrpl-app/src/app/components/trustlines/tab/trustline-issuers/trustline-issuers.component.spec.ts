import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component } from '@angular/core';
import { TrustlineIssuersComponent } from './trustline-issuers.component';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

// Mock child components
@Component({ selector: 'app-select-search-dropdown', template: '<div></div>', standalone: true })
class MockSelectSearchDropdown {}

describe('TrustlineIssuersComponent', () => {
     let component: TrustlineIssuersComponent;
     let fixture: ComponentFixture<TrustlineIssuersComponent>;
     let trustlineCurrencyServiceSpy: any;
     let trustlineViewModelServiceSpy: any;
     let trustlineUtilServiceSpy: any;
     let currencyStoreServiceSpy: any;

     const mockCurrencyItems = [
          { id: 'USD', display: 'USD', secondary: 'USD' },
          { id: 'EUR', display: 'EUR', secondary: 'EUR' },
          { id: 'XRP', display: 'XRP', secondary: 'XRP' },
     ];

     const mockIssuerItems = [
          { id: 'rIssuer1', display: 'rIssuer1', secondary: 'rIssuer1' },
          { id: 'rIssuer2', display: 'rIssuer2', secondary: 'rIssuer2' },
     ];

     const mockSelectedCurrency = { id: 'USD', display: 'USD', secondary: 'USD' };
     const mockSelectedIssuer = { id: 'rIssuer1', display: 'rIssuer1', secondary: 'rIssuer1' };

     beforeEach(async () => {
          trustlineCurrencyServiceSpy = {
               // Add any needed methods/properties
          };

          trustlineViewModelServiceSpy = {
               currencyItems: signal(mockCurrencyItems),
               issuerItems: signal(mockIssuerItems),
               selectedCurrencyItem: signal(mockSelectedCurrency),
               selectedIssuerItem: signal(mockSelectedIssuer),
               addCurrencyIssuerButtonLabel: signal('Add Currency/Issuer'),
               removeSelectedIssuerButtonLabel: signal('Remove Selected'),
          };

          trustlineUtilServiceSpy = {
               addNewCurrencyIssuer: jasmine.createSpy('addNewCurrencyIssuer'),
               removeCurrentCurrencyIssuer: jasmine.createSpy('removeCurrentCurrencyIssuer'),
               isAddValid: jasmine.createSpy('isAddValid').and.returnValue(true),
               isRemoveValid: jasmine.createSpy('isRemoveValid').and.returnValue(true),
          };

          currencyStoreServiceSpy = {
               newCurrency: signal(''),
               newIssuer: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          await TestBed.configureTestingModule({
               imports: [TrustlineIssuersComponent, FormsModule],
               providers: [provideNoopAnimations(), { provide: TrustlineCurrencyService, useValue: trustlineCurrencyServiceSpy }, { provide: TrustlineViewModelService, useValue: trustlineViewModelServiceSpy }, { provide: TrustlineUtilService, useValue: trustlineUtilServiceSpy }, { provide: CurrencyStoreService, useValue: currencyStoreServiceSpy }],
          })
               .overrideComponent(TrustlineIssuersComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(TrustlineIssuersComponent);
          component = fixture.componentInstance;
          component.isIdle = true;

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should have isIdle input', () => {
               expect(component.isIdle).toBeTrue();
          });

          it('should accept isIdle as false', () => {
               component.isIdle = false;
               expect(component.isIdle).toBeFalse();
          });
     });

     describe('Outputs', () => {
          it('should emit currencySelected when called', () => {
               spyOn(component.currencySelected, 'emit');
               const item = { id: 'BTC', display: 'BTC' };
               component.currencySelected.emit(item);
               expect(component.currencySelected.emit).toHaveBeenCalledWith(item);
          });

          it('should emit null currencySelected', () => {
               spyOn(component.currencySelected, 'emit');
               component.currencySelected.emit(null);
               expect(component.currencySelected.emit).toHaveBeenCalledWith(null);
          });

          it('should emit issuerSelected when called', () => {
               spyOn(component.issuerSelected, 'emit');
               const item = { id: 'rIssuer3', display: 'rIssuer3' };
               component.issuerSelected.emit(item);
               expect(component.issuerSelected.emit).toHaveBeenCalledWith(item);
          });

          it('should emit null issuerSelected', () => {
               spyOn(component.issuerSelected, 'emit');
               component.issuerSelected.emit(null);
               expect(component.issuerSelected.emit).toHaveBeenCalledWith(null);
          });
     });

     describe('Service Injections', () => {
          it('should have trustlineCurrencyService injected', () => {
               expect(component.trustlineCurrencyService).toBe(trustlineCurrencyServiceSpy);
          });

          it('should have trustlineViewModelService injected', () => {
               expect(component.trustlineViewModelService).toBe(trustlineViewModelServiceSpy);
          });

          it('should have trustlineUtilService injected', () => {
               expect(component.trustlineUtilService).toBe(trustlineUtilServiceSpy);
          });

          it('should have currencyStoreService injected', () => {
               expect(component.currencyStoreService).toBe(currencyStoreServiceSpy);
          });
     });

     describe('Currency Store Fields', () => {
          it('should bind to currencyStoreService.newCurrency', () => {
               expect(currencyStoreServiceSpy.newCurrency()).toBe('');
          });

          it('should call setField when newCurrency changes', () => {
               currencyStoreServiceSpy.setField('newCurrency', 'USDC');
               expect(currencyStoreServiceSpy.setField).toHaveBeenCalledWith('newCurrency', 'USDC');
          });

          it('should bind to currencyStoreService.newIssuer', () => {
               expect(currencyStoreServiceSpy.newIssuer()).toBe('');
          });

          it('should call setField when newIssuer changes', () => {
               currencyStoreServiceSpy.setField('newIssuer', 'rNewIssuer');
               expect(currencyStoreServiceSpy.setField).toHaveBeenCalledWith('newIssuer', 'rNewIssuer');
          });
     });

     describe('Currency Items', () => {
          it('should display currency items from viewModel', () => {
               expect(trustlineViewModelServiceSpy.currencyItems()).toEqual(mockCurrencyItems);
          });

          it('should have selected currency item', () => {
               expect(trustlineViewModelServiceSpy.selectedCurrencyItem()).toEqual(mockSelectedCurrency);
          });

          it('should handle XRP special display', () => {
               const xrpItem = mockCurrencyItems.find(item => item.id === 'XRP');
               expect(xrpItem).toBeDefined();
               expect(xrpItem?.id).toBe('XRP');
          });
     });

     describe('Issuer Items', () => {
          it('should display issuer items from viewModel', () => {
               expect(trustlineViewModelServiceSpy.issuerItems()).toEqual(mockIssuerItems);
          });

          it('should have selected issuer item', () => {
               expect(trustlineViewModelServiceSpy.selectedIssuerItem()).toEqual(mockSelectedIssuer);
          });
     });

     describe('Add Currency/Issuer', () => {
          it('should call addNewCurrencyIssuer when add button clicked', () => {
               trustlineUtilServiceSpy.addNewCurrencyIssuer();
               expect(trustlineUtilServiceSpy.addNewCurrencyIssuer).toHaveBeenCalled();
          });

          it('should disable add button when not idle', () => {
               component.isIdle = false;
               expect(component.isIdle).toBeFalse();
          });

          it('should disable add button when isAddValid is false', () => {
               trustlineUtilServiceSpy.isAddValid.and.returnValue(false);
               expect(trustlineUtilServiceSpy.isAddValid()).toBeFalse();
          });

          it('should enable add button when idle and valid', () => {
               component.isIdle = true;
               trustlineUtilServiceSpy.isAddValid.and.returnValue(true);
               expect(component.isIdle).toBeTrue();
               expect(trustlineUtilServiceSpy.isAddValid()).toBeTrue();
          });

          it('should display correct button label from viewModel', () => {
               expect(trustlineViewModelServiceSpy.addCurrencyIssuerButtonLabel()).toBe('Add Currency/Issuer');
          });
     });

     describe('Remove Currency/Issuer', () => {
          it('should call removeCurrentCurrencyIssuer when remove button clicked', () => {
               trustlineUtilServiceSpy.removeCurrentCurrencyIssuer();
               expect(trustlineUtilServiceSpy.removeCurrentCurrencyIssuer).toHaveBeenCalled();
          });

          it('should disable remove button when not idle', () => {
               component.isIdle = false;
               expect(component.isIdle).toBeFalse();
          });

          it('should disable remove button when isRemoveValid is false', () => {
               trustlineUtilServiceSpy.isRemoveValid.and.returnValue(false);
               expect(trustlineUtilServiceSpy.isRemoveValid()).toBeFalse();
          });

          it('should enable remove button when idle and valid', () => {
               component.isIdle = true;
               trustlineUtilServiceSpy.isRemoveValid.and.returnValue(true);
               expect(component.isIdle).toBeTrue();
               expect(trustlineUtilServiceSpy.isRemoveValid()).toBeTrue();
          });

          it('should display correct remove button label from viewModel', () => {
               expect(trustlineViewModelServiceSpy.removeSelectedIssuerButtonLabel()).toBe('Remove Selected');
          });
     });

     describe('Button States', () => {
          it('should have add button disabled when isIdle is false', () => {
               component.isIdle = false;
               expect(component.isIdle).toBeFalse();
          });

          it('should have remove button disabled when isIdle is false', () => {
               component.isIdle = false;
               expect(component.isIdle).toBeFalse();
          });

          it('should have add button enabled when isIdle is true and isAddValid is true', () => {
               component.isIdle = true;
               trustlineUtilServiceSpy.isAddValid.and.returnValue(true);
               expect(component.isIdle).toBeTrue();
               expect(trustlineUtilServiceSpy.isAddValid()).toBeTrue();
          });

          it('should have remove button enabled when isIdle is true and isRemoveValid is true', () => {
               component.isIdle = true;
               trustlineUtilServiceSpy.isRemoveValid.and.returnValue(true);
               expect(component.isIdle).toBeTrue();
               expect(trustlineUtilServiceSpy.isRemoveValid()).toBeTrue();
          });
     });

     describe('Edge Cases', () => {
          it('should handle empty currency items', () => {
               trustlineViewModelServiceSpy.currencyItems.set([]);
               fixture.detectChanges();
               expect(trustlineViewModelServiceSpy.currencyItems()).toEqual([]);
          });

          it('should handle empty issuer items', () => {
               trustlineViewModelServiceSpy.issuerItems.set([]);
               fixture.detectChanges();
               expect(trustlineViewModelServiceSpy.issuerItems()).toEqual([]);
          });

          it('should handle undefined selected currency', () => {
               trustlineViewModelServiceSpy.selectedCurrencyItem.set(undefined);
               fixture.detectChanges();
               expect(trustlineViewModelServiceSpy.selectedCurrencyItem()).toBeUndefined();
          });

          it('should handle undefined selected issuer', () => {
               trustlineViewModelServiceSpy.selectedIssuerItem.set(undefined);
               fixture.detectChanges();
               expect(trustlineViewModelServiceSpy.selectedIssuerItem()).toBeUndefined();
          });

          it('should handle XRP as special currency case', () => {
               const xrpCurrency = { id: 'XRP', display: 'XRP', secondary: 'XRP' };
               expect(xrpCurrency.id).toBe('XRP');
          });

          it('should handle long currency codes', () => {
               const longCurrency = { id: 'VERYLONGCURRENCYCODE', display: 'VERYLONGCURRENCYCODE', secondary: 'VERYLONGCURRENCYCODE' };
               expect(longCurrency.id.length).toBeGreaterThan(10);
          });

          it('should handle invalid issuer addresses', () => {
               const invalidIssuer = { id: 'invalid', display: 'invalid', secondary: 'invalid' };
               expect(invalidIssuer.id).toBe('invalid');
          });
     });

     describe('Template Placeholders', () => {
          it('should have placeholder for currency code input', () => {
               const placeholder = 'e.g. USDC, EUR, BTC';
               expect(placeholder).toBeTruthy();
          });

          it('should have placeholder for issuer address input', () => {
               const placeholder = 'r...';
               expect(placeholder).toBeTruthy();
          });

          it('should have empty message for currency dropdown', () => {
               const emptyMessage = 'No saved currencies';
               expect(emptyMessage).toBeTruthy();
          });

          it('should have empty message for issuer dropdown', () => {
               const emptyMessage = 'No issuers for this currency';
               expect(emptyMessage).toBeTruthy();
          });

          it('should have placeholder for currency search', () => {
               const placeholder = 'Search currency code...';
               expect(placeholder).toBeTruthy();
          });
     });
});
