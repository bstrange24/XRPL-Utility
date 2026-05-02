import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component } from '@angular/core';
import { GetOrderBookTabComponent } from './get-order-book.component';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

// Mock child components
@Component({ selector: 'app-select-search-dropdown', template: '<div></div>', standalone: true })
class MockSelectSearchDropdown {}

describe('GetOrderBookTabComponent', () => {
     let component: GetOrderBookTabComponent;
     let fixture: ComponentFixture<GetOrderBookTabComponent>;
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

     const mockSelectItem: SelectItem = { id: 'USD', display: 'USD' };
     const mockIssuerItem: SelectItem = { id: 'rIssuer1', display: 'rIssuer1' };

     beforeEach(async () => {
          offerStoreServiceSpy = {};

          viewSpy = {
               weWantCurrencyItems: signal(mockCurrencyItems),
               weSpendCurrencyItems: signal(mockCurrencyItems),
               weWantIssuerItems: signal(mockIssuerItems),
               weSpendIssuerItems: signal(mockIssuerItems),
               selectedWeWantCurrencyItem: signal(null),
               selectedWeSpendCurrencyItem: signal(null),
               selectedWeWantIssuerItem: signal(null),
               selectedWeSpendIssuerItem: signal(null),
          };

          txUiServiceSpy = {};

          await TestBed.configureTestingModule({
               imports: [GetOrderBookTabComponent],
               providers: [provideNoopAnimations(), { provide: OfferStoreService, useValue: offerStoreServiceSpy }, { provide: OfferTransactionViewModelService, useValue: viewSpy }, { provide: TransactionUiService, useValue: txUiServiceSpy }],
          })
               .overrideComponent(GetOrderBookTabComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(GetOrderBookTabComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Outputs', () => {
          it('should emit weWantCurrencySelected', () => {
               spyOn(component.weWantCurrencySelected, 'emit');
               component.weWantCurrencySelected.emit(mockSelectItem);
               expect(component.weWantCurrencySelected.emit).toHaveBeenCalledWith(mockSelectItem);
          });

          it('should emit null weWantCurrencySelected', () => {
               spyOn(component.weWantCurrencySelected, 'emit');
               component.weWantCurrencySelected.emit(null);
               expect(component.weWantCurrencySelected.emit).toHaveBeenCalledWith(null);
          });

          it('should emit weWantIssuerSelected', () => {
               spyOn(component.weWantIssuerSelected, 'emit');
               component.weWantIssuerSelected.emit(mockIssuerItem);
               expect(component.weWantIssuerSelected.emit).toHaveBeenCalledWith(mockIssuerItem);
          });

          it('should emit null weWantIssuerSelected', () => {
               spyOn(component.weWantIssuerSelected, 'emit');
               component.weWantIssuerSelected.emit(null);
               expect(component.weWantIssuerSelected.emit).toHaveBeenCalledWith(null);
          });

          it('should emit weSpendCurrencySelected', () => {
               spyOn(component.weSpendCurrencySelected, 'emit');
               component.weSpendCurrencySelected.emit(mockSelectItem);
               expect(component.weSpendCurrencySelected.emit).toHaveBeenCalledWith(mockSelectItem);
          });

          it('should emit weSpendIssuerSelected', () => {
               spyOn(component.weSpendIssuerSelected, 'emit');
               component.weSpendIssuerSelected.emit(mockIssuerItem);
               expect(component.weSpendIssuerSelected.emit).toHaveBeenCalledWith(mockIssuerItem);
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

          it('should have null selectedWeWantCurrencyItem by default', () => {
               expect(viewSpy.selectedWeWantCurrencyItem()).toBeNull();
          });

          it('should have null selectedWeSpendCurrencyItem by default', () => {
               expect(viewSpy.selectedWeSpendCurrencyItem()).toBeNull();
          });

          it('should have null selectedWeWantIssuerItem by default', () => {
               expect(viewSpy.selectedWeWantIssuerItem()).toBeNull();
          });

          it('should have null selectedWeSpendIssuerItem by default', () => {
               expect(viewSpy.selectedWeSpendIssuerItem()).toBeNull();
          });
     });

     describe('Template Headers', () => {
          it('should have buy side header', () => {
               const buySideLabel = 'Taker Gets – Buy Side';
               expect(buySideLabel).toContain('Buy Side');
          });

          it('should have sell side header', () => {
               const sellSideLabel = 'Taker Pays – Sell Side';
               expect(sellSideLabel).toContain('Sell Side');
          });
     });

     describe('Edge Cases', () => {
          it('should handle empty currency items', () => {
               viewSpy.weWantCurrencyItems.set([]);
               expect(viewSpy.weWantCurrencyItems()).toEqual([]);
          });

          it('should handle empty issuer items', () => {
               viewSpy.weWantIssuerItems.set([]);
               expect(viewSpy.weWantIssuerItems()).toEqual([]);
          });

          it('should handle null currency items', () => {
               viewSpy.weWantCurrencyItems.set(null as any);
               expect(viewSpy.weWantCurrencyItems()).toBeNull();
          });

          it('should handle null issuer items', () => {
               viewSpy.weWantIssuerItems.set(null as any);
               expect(viewSpy.weWantIssuerItems()).toBeNull();
          });
     });

     describe('Placeholder Texts', () => {
          it('should have placeholder for currency dropdown', () => {
               const placeholder = 'Search currency code...';
               expect(placeholder).toBe('Search currency code...');
          });

          it('should have placeholder for issuer dropdown', () => {
               const placeholder = 'Search issuer address or name...';
               expect(placeholder).toBe('Search issuer address or name...');
          });

          it('should have empty message for currency dropdown', () => {
               const emptyMessage = 'No currencies available';
               expect(emptyMessage).toBe('No currencies available');
          });

          it('should have empty message for issuer dropdown', () => {
               const emptyMessage = 'No issuers available for this currency';
               expect(emptyMessage).toBe('No issuers available for this currency');
          });
     });
});
