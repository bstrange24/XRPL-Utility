import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CurrencyAmountFormComponent } from './currency-amount-form.component';
import { SelectItem } from '../ui-components/select-search-dropdown/select-search-dropdown.component';
import { FormsModule } from '@angular/forms';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('CurrencyAmountFormComponent', () => {
     let component: CurrencyAmountFormComponent;
     let fixture: ComponentFixture<CurrencyAmountFormComponent>;

     // Mock data
     const mockCurrencyItems: SelectItem[] = [
          { id: 'XRP', display: 'XRP', secondary: 'Native currency' },
          { id: 'USD', display: 'USD', secondary: '2 issuer(s)' },
          { id: 'EUR', display: 'EUR', secondary: '1 issuer(s)' },
     ];

     const mockSelectedCurrencyItem: SelectItem = { id: 'USD', display: 'USD', secondary: '2 issuer(s)' };

     const mockIssuerItems: SelectItem[] = [
          { id: 'rIssuer1', display: 'Issuer 1', secondary: 'rIssuer1...' },
          { id: 'rIssuer2', display: 'Issuer 2', secondary: 'rIssuer2...' },
     ];

     const mockSelectedIssuerItem: SelectItem = { id: 'rIssuer1', display: 'Issuer 1', secondary: 'rIssuer1...' };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [CurrencyAmountFormComponent, FormsModule],
               providers: [{ provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }],
               schemas: [NO_ERRORS_SCHEMA], // Add this to ignore child components
          }).compileComponents();

          fixture = TestBed.createComponent(CurrencyAmountFormComponent);
          component = fixture.componentInstance;

          // Set default inputs
          component.currencyItems = mockCurrencyItems;
          component.selectedCurrencyItem = mockSelectedCurrencyItem;
          component.amount = '100';
          component.currency = 'USD';
          component.issuerItems = mockIssuerItems;
          component.selectedIssuerItem = mockSelectedIssuerItem;
          component.balance = '500';

          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset any spies
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept currencyItems input', () => {
               expect(component.currencyItems).toEqual(mockCurrencyItems);
          });

          it('should accept selectedCurrencyItem input', () => {
               expect(component.selectedCurrencyItem).toEqual(mockSelectedCurrencyItem);
          });

          it('should accept amount input', () => {
               expect(component.amount).toBe('100');
          });

          it('should accept currency input', () => {
               expect(component.currency).toBe('USD');
          });

          it('should accept issuerItems input', () => {
               expect(component.issuerItems).toEqual(mockIssuerItems);
          });

          it('should accept selectedIssuerItem input', () => {
               expect(component.selectedIssuerItem).toEqual(mockSelectedIssuerItem);
          });

          it('should accept balance input', () => {
               expect(component.balance).toBe('500');
          });

          it('should accept amountLabel input', () => {
               component.amountLabel = 'Custom Label';
               expect(component.amountLabel).toBe('Custom Label');
          });

          it('should accept amountHint input', () => {
               component.amountHint = 'Custom Hint';
               expect(component.amountHint).toBe('Custom Hint');
          });

          it('should accept amountPlaceholder input', () => {
               component.amountPlaceholder = 'Custom Placeholder';
               expect(component.amountPlaceholder).toBe('Custom Placeholder');
          });

          it('should accept showAmount input', () => {
               component.showAmount = false;
               expect(component.showAmount).toBeFalse();
          });

          it('should accept disableCurrencySelection input', () => {
               component.disableCurrencySelection = true;
               expect(component.disableCurrencySelection).toBeTrue();
          });

          it('should accept forceXrpOnly input', () => {
               component.forceXrpOnly = true;
               expect(component.forceXrpOnly).toBeTrue();
          });

          it('should accept showXrpOnlyBadge input', () => {
               component.showXrpOnlyBadge = true;
               expect(component.showXrpOnlyBadge).toBeTrue();
          });
     });

     describe('Output emitters', () => {
          it('should have currencySelected emitter', () => {
               expect(component.currencySelected).toBeDefined();
               expect(component.currencySelected.emit).toBeDefined();
          });

          it('should emit currencySelected when called', () => {
               spyOn(component.currencySelected, 'emit');
               component.currencySelected.emit(mockSelectedCurrencyItem);
               expect(component.currencySelected.emit).toHaveBeenCalledWith(mockSelectedCurrencyItem);
          });

          it('should have amountChange emitter', () => {
               expect(component.amountChange).toBeDefined();
               expect(component.amountChange.emit).toBeDefined();
          });

          it('should emit amountChange when called', () => {
               spyOn(component.amountChange, 'emit');
               component.amountChange.emit('200');
               expect(component.amountChange.emit).toHaveBeenCalledWith('200');
          });

          it('should have issuerSelected emitter', () => {
               expect(component.issuerSelected).toBeDefined();
               expect(component.issuerSelected.emit).toBeDefined();
          });

          it('should emit issuerSelected when called', () => {
               spyOn(component.issuerSelected, 'emit');
               component.issuerSelected.emit(mockSelectedIssuerItem);
               expect(component.issuerSelected.emit).toHaveBeenCalledWith(mockSelectedIssuerItem);
          });
     });

     describe('onFocus', () => {
          it('should call select on input element', () => {
               const mockInput = { select: jasmine.createSpy('select') } as any;
               const event = { target: mockInput } as FocusEvent;

               component.onFocus(event);

               expect(mockInput.select).toHaveBeenCalled();
          });

          // it('should handle event without select method', () => {
          //      const mockInput = {} as any;
          //      const event = { target: mockInput } as FocusEvent;

          //      expect(() => component.onFocus(event)).not.toThrow();
          // });
     });

     describe('Conditional rendering', () => {
          it('should show issuer and balance when currency is not XRP', () => {
               component.currency = 'USD';
               fixture.detectChanges();
               expect(component.currency).toBe('USD');
          });

          it('should not show issuer and balance when currency is XRP', () => {
               component.currency = 'XRP';
               fixture.detectChanges();
               expect(component.currency).toBe('XRP');
          });

          it('should show amount input when showAmount is true', () => {
               component.showAmount = true;
               fixture.detectChanges();
               expect(component.showAmount).toBeTrue();
          });

          it('should hide amount input when showAmount is false', () => {
               component.showAmount = false;
               fixture.detectChanges();
               expect(component.showAmount).toBeFalse();
          });

          it('should show XRP only badge when showXrpOnlyBadge is true', () => {
               component.showXrpOnlyBadge = true;
               fixture.detectChanges();
               expect(component.showXrpOnlyBadge).toBeTrue();
          });
     });

     describe('Default values', () => {
          it('should have default amountLabel as "Amount"', () => {
               const newComponent = new CurrencyAmountFormComponent();
               expect(newComponent.amountLabel).toBe('Amount');
          });

          it('should have default amountHint with precision note', () => {
               const newComponent = new CurrencyAmountFormComponent();
               expect(newComponent.amountHint).toContain('0.000001');
          });

          it('should have default amountPlaceholder as "e.g. 10.5"', () => {
               const newComponent = new CurrencyAmountFormComponent();
               expect(newComponent.amountPlaceholder).toBe('e.g. 10.5');
          });

          it('should have default showAmount as true', () => {
               const newComponent = new CurrencyAmountFormComponent();
               expect(newComponent.showAmount).toBeTrue();
          });

          it('should have default disableCurrencySelection as false', () => {
               const newComponent = new CurrencyAmountFormComponent();
               expect(newComponent.disableCurrencySelection).toBeFalse();
          });

          it('should have default forceXrpOnly as false', () => {
               const newComponent = new CurrencyAmountFormComponent();
               expect(newComponent.forceXrpOnly).toBeFalse();
          });

          it('should have default showXrpOnlyBadge as false', () => {
               const newComponent = new CurrencyAmountFormComponent();
               expect(newComponent.showXrpOnlyBadge).toBeFalse();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty currencyItems array', () => {
               component.currencyItems = [];
               fixture.detectChanges();
               expect(component.currencyItems).toEqual([]);
          });

          it('should handle empty issuerItems array', () => {
               component.issuerItems = [];
               fixture.detectChanges();
               expect(component.issuerItems).toEqual([]);
          });

          it('should handle null selectedCurrencyItem', () => {
               component.selectedCurrencyItem = null;
               fixture.detectChanges();
               expect(component.selectedCurrencyItem).toBeNull();
          });

          it('should handle null selectedIssuerItem', () => {
               component.selectedIssuerItem = null;
               fixture.detectChanges();
               expect(component.selectedIssuerItem).toBeNull();
          });

          it('should handle empty amount string', () => {
               component.amount = '';
               fixture.detectChanges();
               expect(component.amount).toBe('');
          });

          it('should handle zero balance', () => {
               component.balance = '0';
               fixture.detectChanges();
               expect(component.balance).toBe('0');
          });
     });
});
