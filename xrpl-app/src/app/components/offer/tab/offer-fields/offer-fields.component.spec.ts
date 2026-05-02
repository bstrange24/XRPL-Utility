import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component, output } from '@angular/core';
import { OfferFieldsComponent } from './offer-fields.component';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

// Mock child components
@Component({ selector: 'app-create-offer', template: '<div>Mock Create Offer</div>', standalone: true })
class MockCreateOfferComponent {
     weWantCurrencySelected = output<SelectItem | null>();
     weWantIssuerSelected = output<SelectItem | null>();
     weSpendCurrencySelected = output<SelectItem | null>();
     weSpendIssuerSelected = output<SelectItem | null>();
     weWantAmountChange = output<void>();
     weSpendAmountChange = output<void>();
     invertOrder = output<void>();
}

@Component({ selector: 'app-get-order-book', template: '<div>Mock Get Order Book</div>', standalone: true })
class MockGetOrderBookComponent {
     weWantCurrencySelected = output<SelectItem | null>();
     weWantIssuerSelected = output<SelectItem | null>();
     weSpendCurrencySelected = output<SelectItem | null>();
     weSpendIssuerSelected = output<SelectItem | null>();
     invertOrder = output<void>();
}

@Component({ selector: 'app-cancel-offer', template: '<div>Mock Cancel Offer</div>', standalone: true })
class MockCancelOfferComponent {}

describe('OfferFieldsComponent', () => {
     let component: OfferFieldsComponent;
     let fixture: ComponentFixture<OfferFieldsComponent>;
     let viewSpy: any;

     const mockSelectItem: SelectItem = { id: 'USD', display: 'USD' };
     const mockIssuerItem: SelectItem = { id: 'rIssuer1', display: 'rIssuer1' };

     beforeEach(async () => {
          viewSpy = {};

          await TestBed.configureTestingModule({
               imports: [OfferFieldsComponent],
               providers: [provideNoopAnimations(), { provide: OfferTransactionViewModelService, useValue: viewSpy }],
          })
               .overrideComponent(OfferFieldsComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(OfferFieldsComponent);
          component = fixture.componentInstance;

          // Set required input
          fixture.componentRef.setInput('tab', 'createOffer');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should have tab input', () => {
               expect(component.tab()).toBe('createOffer');
          });

          it('should accept createOffer tab value', () => {
               fixture.componentRef.setInput('tab', 'createOffer');
               fixture.detectChanges();
               expect(component.tab()).toBe('createOffer');
          });

          it('should accept getOrderBook tab value', () => {
               fixture.componentRef.setInput('tab', 'getOrderBook');
               fixture.detectChanges();
               expect(component.tab()).toBe('getOrderBook');
          });

          it('should accept cancelOffer tab value', () => {
               fixture.componentRef.setInput('tab', 'cancelOffer');
               fixture.detectChanges();
               expect(component.tab()).toBe('cancelOffer');
          });
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

     describe('Service Injection', () => {
          it('should have view injected', () => {
               expect(component.view).toBe(viewSpy);
          });
     });

     describe('Template Conditional Rendering', () => {
          it('should show create-offer component when tab is createOffer', () => {
               fixture.componentRef.setInput('tab', 'createOffer');
               fixture.detectChanges();
               expect(component.tab()).toBe('createOffer');
          });

          it('should show get-order-book component when tab is getOrderBook', () => {
               fixture.componentRef.setInput('tab', 'getOrderBook');
               fixture.detectChanges();
               expect(component.tab()).toBe('getOrderBook');
          });

          it('should show cancel-offer component when tab is cancelOffer', () => {
               fixture.componentRef.setInput('tab', 'cancelOffer');
               fixture.detectChanges();
               expect(component.tab()).toBe('cancelOffer');
          });
     });

     describe('Edge Cases', () => {
          it('should handle unknown tab value', () => {
               fixture.componentRef.setInput('tab', 'unknownTab');
               fixture.detectChanges();
               expect(component.tab()).toBe('unknownTab');
          });

          it('should handle empty string tab', () => {
               fixture.componentRef.setInput('tab', '');
               fixture.detectChanges();
               expect(component.tab()).toBe('');
          });
     });
});
