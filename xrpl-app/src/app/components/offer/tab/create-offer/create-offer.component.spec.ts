import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component } from '@angular/core';
import { CreateOfferTabComponent } from './create-offer.component';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';

// Mock child components
@Component({ selector: 'app-select-search-dropdown', template: '<div></div>', standalone: true })
class MockSelectSearchDropdown {}

@Component({ selector: 'lucide-icon', template: '<div></div>', standalone: true })
class MockLucideIcon {}

describe('CreateOfferTabComponent', () => {
     let component: CreateOfferTabComponent;
     let fixture: ComponentFixture<CreateOfferTabComponent>;
     let offerStoreServiceSpy: any;
     let viewSpy: any;
     let txUiServiceSpy: any;

     const mockCurrencyItems = [
          { id: 'USD', display: 'USD', secondary: 'USD' },
          { id: 'EUR', display: 'EUR', secondary: 'EUR' },
          { id: 'XRP', display: 'XRP', secondary: 'XRP' },
     ];

     const mockIssuerItems = [
          { id: 'rIssuer1', display: 'rIssuer1', secondary: 'rIssuer1' },
          { id: 'rIssuer2', display: 'rIssuer2', secondary: 'rIssuer2' },
     ];

     beforeEach(async () => {
          offerStoreServiceSpy = {
               weWantAmount: signal(''),
               weSpendAmount: signal(''),
               isPassive: signal(false),
               isFillOrKill: signal(false),
               isMarketOrder: signal(false),
               insufficientLiquidityWarning: signal(false),
               setField: jasmine.createSpy('setField'),
          };

          viewSpy = {
               weWantCurrencyItems: signal(mockCurrencyItems),
               weSpendCurrencyItems: signal(mockCurrencyItems),
               weWantIssuerItems: signal(mockIssuerItems),
               weSpendIssuerItems: signal(mockIssuerItems),
               selectedWeWantCurrencyItem: signal(null),
               selectedWeSpendCurrencyItem: signal(null),
               selectedWeWantIssuerItem: signal(null),
               selectedWeSpendIssuerItem: signal(null),
               weWantUserBalance: signal('100'),
               weSpendUserBalance: signal('200'),
          };

          txUiServiceSpy = {};

          await TestBed.configureTestingModule({
               imports: [CreateOfferTabComponent],
               providers: [provideNoopAnimations(), provideIcons({}), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, { provide: OfferStoreService, useValue: offerStoreServiceSpy }, { provide: OfferTransactionViewModelService, useValue: viewSpy }, { provide: TransactionUiService, useValue: txUiServiceSpy }],
          })
               .overrideComponent(CreateOfferTabComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(CreateOfferTabComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Outputs', () => {
          it('should emit weWantCurrencySelected', () => {
               spyOn(component.weWantCurrencySelected, 'emit');
               const item = { id: 'USD', display: 'USD' };
               component.weWantCurrencySelected.emit(item);
               expect(component.weWantCurrencySelected.emit).toHaveBeenCalledWith(item);
          });

          it('should emit weWantIssuerSelected', () => {
               spyOn(component.weWantIssuerSelected, 'emit');
               const item = { id: 'rIssuer1', display: 'rIssuer1' };
               component.weWantIssuerSelected.emit(item);
               expect(component.weWantIssuerSelected.emit).toHaveBeenCalledWith(item);
          });

          it('should emit weSpendCurrencySelected', () => {
               spyOn(component.weSpendCurrencySelected, 'emit');
               const item = { id: 'EUR', display: 'EUR' };
               component.weSpendCurrencySelected.emit(item);
               expect(component.weSpendCurrencySelected.emit).toHaveBeenCalledWith(item);
          });

          it('should emit weSpendIssuerSelected', () => {
               spyOn(component.weSpendIssuerSelected, 'emit');
               const item = { id: 'rIssuer2', display: 'rIssuer2' };
               component.weSpendIssuerSelected.emit(item);
               expect(component.weSpendIssuerSelected.emit).toHaveBeenCalledWith(item);
          });

          it('should emit weWantAmountChange', () => {
               spyOn(component.weWantAmountChange, 'emit');
               component.weWantAmountChange.emit();
               expect(component.weWantAmountChange.emit).toHaveBeenCalled();
          });

          it('should emit weSpendAmountChange', () => {
               spyOn(component.weSpendAmountChange, 'emit');
               component.weSpendAmountChange.emit();
               expect(component.weSpendAmountChange.emit).toHaveBeenCalled();
          });

          it('should emit invertOrder', () => {
               spyOn(component.invertOrder, 'emit');
               component.invertOrder.emit();
               expect(component.invertOrder.emit).toHaveBeenCalled();
          });
     });

     describe('Service Injections', () => {
          it('should have offerStoreService injected', () => {
               expect(component.offerStoreService).toBe(offerStoreServiceSpy);
          });

          it('should have view injected', () => {
               expect(component.view).toBe(viewSpy);
          });

          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiServiceSpy);
          });
     });

     describe('offerFlagsConfig', () => {
          it('should have three flags configured', () => {
               expect(component.offerFlagsConfig.length).toBe(3);
          });

          it('should have Passive flag', () => {
               const passiveFlag = component.offerFlagsConfig.find(f => f.key === 'isPassive');
               expect(passiveFlag).toBeDefined();
               expect(passiveFlag?.title).toBe('Passive');
          });

          it('should have Fill Or Kill flag', () => {
               const fillOrKillFlag = component.offerFlagsConfig.find(f => f.key === 'isFillOrKill');
               expect(fillOrKillFlag).toBeDefined();
               expect(fillOrKillFlag?.title).toBe('Fill Or Kill');
          });

          it('should have Immediate Or Cancel flag', () => {
               const marketOrderFlag = component.offerFlagsConfig.find(f => f.key === 'isMarketOrder');
               expect(marketOrderFlag).toBeDefined();
               expect(marketOrderFlag?.title).toBe('Immediate Or Cancel');
          });
     });

     describe('selectFlag', () => {
          beforeEach(() => {
               // Reset all flags before each test
               offerStoreServiceSpy.isPassive.set(false);
               offerStoreServiceSpy.isFillOrKill.set(false);
               offerStoreServiceSpy.isMarketOrder.set(false);
               offerStoreServiceSpy.setField.calls.reset();
          });

          it('should select Passive flag and clear others', () => {
               component.selectFlag('isPassive');

               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isPassive', false);
               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isFillOrKill', false);
               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isMarketOrder', false);
               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isPassive', true);
          });

          it('should select Fill Or Kill flag and clear others', () => {
               component.selectFlag('isFillOrKill');

               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isPassive', false);
               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isFillOrKill', false);
               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isMarketOrder', false);
               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isFillOrKill', true);
          });

          it('should select Immediate Or Cancel flag and clear others', () => {
               component.selectFlag('isMarketOrder');

               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isPassive', false);
               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isFillOrKill', false);
               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isMarketOrder', false);
               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isMarketOrder', true);
          });
     });

     describe('Template Data Binding', () => {
          it('should bind weWantAmount from store', () => {
               offerStoreServiceSpy.weWantAmount.set('100');
               expect(offerStoreServiceSpy.weWantAmount()).toBe('100');
          });

          it('should bind weSpendAmount from store', () => {
               offerStoreServiceSpy.weSpendAmount.set('50');
               expect(offerStoreServiceSpy.weSpendAmount()).toBe('50');
          });

          it('should show insufficient liquidity warning when true', () => {
               offerStoreServiceSpy.insufficientLiquidityWarning.set(true);
               expect(offerStoreServiceSpy.insufficientLiquidityWarning()).toBeTrue();
          });

          it('should not show insufficient liquidity warning when false', () => {
               offerStoreServiceSpy.insufficientLiquidityWarning.set(false);
               expect(offerStoreServiceSpy.insufficientLiquidityWarning()).toBeFalse();
          });
     });

     describe('View Model Data', () => {
          it('should provide weWantCurrencyItems', () => {
               expect(viewSpy.weWantCurrencyItems()).toEqual(mockCurrencyItems);
          });

          it('should provide weSpendCurrencyItems', () => {
               expect(viewSpy.weSpendCurrencyItems()).toEqual(mockCurrencyItems);
          });

          it('should provide weWantIssuerItems', () => {
               expect(viewSpy.weWantIssuerItems()).toEqual(mockIssuerItems);
          });

          it('should provide weSpendIssuerItems', () => {
               expect(viewSpy.weSpendIssuerItems()).toEqual(mockIssuerItems);
          });

          it('should provide weWantUserBalance', () => {
               expect(viewSpy.weWantUserBalance()).toBe('100');
          });

          it('should provide weSpendUserBalance', () => {
               expect(viewSpy.weSpendUserBalance()).toBe('200');
          });
     });

     describe('Flag State', () => {
          it('should show isPassive as false by default', () => {
               expect(offerStoreServiceSpy.isPassive()).toBeFalse();
          });

          it('should show isFillOrKill as false by default', () => {
               expect(offerStoreServiceSpy.isFillOrKill()).toBeFalse();
          });

          it('should show isMarketOrder as false by default', () => {
               expect(offerStoreServiceSpy.isMarketOrder()).toBeFalse();
          });

          it('should update flag state when selected', () => {
               component.selectFlag('isPassive');
               expect(offerStoreServiceSpy.setField).toHaveBeenCalledWith('isPassive', true);
          });
     });

     describe('Edge Cases', () => {
          it('should handle null currency items', () => {
               viewSpy.weWantCurrencyItems.set([]);
               expect(viewSpy.weWantCurrencyItems()).toEqual([]);
          });

          it('should handle null issuer items', () => {
               viewSpy.weWantIssuerItems.set([]);
               expect(viewSpy.weWantIssuerItems()).toEqual([]);
          });

          it('should handle empty amounts', () => {
               offerStoreServiceSpy.weWantAmount.set('');
               expect(offerStoreServiceSpy.weWantAmount()).toBe('');
          });

          it('should handle zero balances', () => {
               viewSpy.weWantUserBalance.set('0');
               expect(viewSpy.weWantUserBalance()).toBe('0');
          });
     });
});
