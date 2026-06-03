import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencyFormSectionComponent } from './currency-form-section.component';
import { TrustlineViewModelService } from '../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('CurrencyFormSectionComponent', () => {
     let component: CurrencyFormSectionComponent;
     let fixture: ComponentFixture<CurrencyFormSectionComponent>;
     let trustlineViewModelService: any;

     // Mock data
     const mockCurrencyItems = [
          { id: 'XRP', display: 'XRP' },
          { id: 'USD', display: 'USD' },
     ];

     const mockIssuerItems = [
          { id: 'rIssuer1', display: 'Issuer 1' },
          { id: 'rIssuer2', display: 'Issuer 2' },
     ];

     const mockSelectedCurrency = { id: 'USD', display: 'USD' };
     const mockSelectedIssuer = { id: 'rIssuer1', display: 'Issuer 1' };

     beforeEach(async () => {
          trustlineViewModelService = {
               isIssuerForSelected: jasmine.createSpy('isIssuerForSelected').and.returnValue(false),
          };

          await TestBed.configureTestingModule({
               imports: [CurrencyFormSectionComponent],
               providers: [
                    { provide: TrustlineViewModelService, useValue: trustlineViewModelService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(CurrencyFormSectionComponent);
          component = fixture.componentInstance;

          // Set inputs
          component.currencyItems = mockCurrencyItems;
          component.issuerItems = mockIssuerItems;
          component.selectedCurrency = mockSelectedCurrency;
          component.selectedIssuer = mockSelectedIssuer;
          component.amount = 100;
          component.currencyBalance = '500';
          component.activeTab = 'setTrustline';
          component.trustlineAlreadyExist = false;
          component.isReadOnly = false;

          fixture.detectChanges();
     });

     afterEach(() => {
          trustlineViewModelService.isIssuerForSelected.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept layout input', () => {
               expect(component.layout).toBe('paired');
          });

          it('should accept currencyItems input', () => {
               expect(component.currencyItems).toEqual(mockCurrencyItems);
          });

          it('should accept issuerItems input', () => {
               expect(component.issuerItems).toEqual(mockIssuerItems);
          });

          it('should accept selectedCurrency input', () => {
               expect(component.selectedCurrency).toEqual(mockSelectedCurrency);
          });

          it('should accept selectedIssuer input', () => {
               expect(component.selectedIssuer).toEqual(mockSelectedIssuer);
          });

          it('should accept amount input', () => {
               expect(component.amount).toBe(100);
          });

          it('should accept currencyBalance input', () => {
               expect(component.currencyBalance).toBe('500');
          });

          it('should accept activeTab input', () => {
               expect(component.activeTab).toBe('setTrustline');
          });

          it('should accept trustlineAlreadyExist input', () => {
               expect(component.trustlineAlreadyExist).toBeFalse();
          });

          it('should accept isReadOnly input', () => {
               expect(component.isReadOnly).toBeFalse();
          });

          it('should update layout when changed', () => {
               component.layout = 'split';
               fixture.detectChanges();
               expect(component.layout).toBe('split');
          });
     });

     describe('Output emitters', () => {
          it('should have currencyChange emitter', () => {
               expect(component.currencyChange).toBeDefined();
               expect(component.currencyChange.emit).toBeDefined();
          });

          it('should emit currencyChange when called', () => {
               spyOn(component.currencyChange, 'emit');
               component.currencyChange.emit(mockSelectedCurrency);
               expect(component.currencyChange.emit).toHaveBeenCalledWith(mockSelectedCurrency);
          });

          it('should have issuerChange emitter', () => {
               expect(component.issuerChange).toBeDefined();
               expect(component.issuerChange.emit).toBeDefined();
          });

          it('should emit issuerChange when called', () => {
               spyOn(component.issuerChange, 'emit');
               component.issuerChange.emit(mockSelectedIssuer);
               expect(component.issuerChange.emit).toHaveBeenCalledWith(mockSelectedIssuer);
          });

          it('should have amountChange emitter', () => {
               expect(component.amountChange).toBeDefined();
               expect(component.amountChange.emit).toBeDefined();
          });

          it('should emit amountChange when called', () => {
               spyOn(component.amountChange, 'emit');
               component.amountChange.emit(150);
               expect(component.amountChange.emit).toHaveBeenCalledWith(150);
          });
     });

     describe('limitLabel', () => {
          it('should return "New Trustline Limit" for setTrustline when trustline does not exist', () => {
               component.activeTab = 'setTrustline';
               component.trustlineAlreadyExist = false;
               expect(component.limitLabel).toBe('New Trustline Limit');
          });

          it('should return "Current Trustline Limit" for setTrustline when trustline exists', () => {
               component.activeTab = 'setTrustline';
               component.trustlineAlreadyExist = true;
               expect(component.limitLabel).toBe('Current Trustline Limit');
          });

          it('should return "Current Limit" for removeTrustline', () => {
               component.activeTab = 'removeTrustline';
               expect(component.limitLabel).toBe('Current Limit');
          });

          it('should return "Token Amount" for issueCurrency', () => {
               component.activeTab = 'issueCurrency';
               expect(component.limitLabel).toBe('Token Amount');
          });

          it('should return "Token Amount" for clawbackTokens', () => {
               component.activeTab = 'clawbackTokens';
               expect(component.limitLabel).toBe('Token Amount');
          });

          it('should return "Token Amount" for addNewIssuers', () => {
               component.activeTab = 'addNewIssuers';
               expect(component.limitLabel).toBe('Token Amount');
          });

          it('should return "Token Amount" for create', () => {
               component.activeTab = 'create';
               expect(component.limitLabel).toBe('Token Amount');
          });

          it('should return "Token Amount" for cash', () => {
               component.activeTab = 'cash';
               expect(component.limitLabel).toBe('Token Amount');
          });

          it('should return "Token Amount" for cancel', () => {
               component.activeTab = 'cancel';
               expect(component.limitLabel).toBe('Token Amount');
          });
     });

     describe('onAmountInput', () => {
          let mockEvent: any;

          beforeEach(() => {
               mockEvent = { target: { value: '200' } };
          });

          it('should emit amountChange with numeric value', () => {
               spyOn(component.amountChange, 'emit');

               component.onAmountInput(mockEvent);

               expect(component.amountChange.emit).toHaveBeenCalledWith(200);
          });

          it('should handle decimal input', () => {
               spyOn(component.amountChange, 'emit');
               mockEvent.target.value = '100.5';

               component.onAmountInput(mockEvent);

               expect(component.amountChange.emit).toHaveBeenCalledWith(100.5);
          });

          it('should not emit for negative numbers', () => {
               spyOn(component.amountChange, 'emit');
               mockEvent.target.value = '-50';

               component.onAmountInput(mockEvent);

               expect(component.amountChange.emit).not.toHaveBeenCalled();
          });

          it('should not emit for non-numeric input', () => {
               spyOn(component.amountChange, 'emit');
               mockEvent.target.value = 'abc';

               component.onAmountInput(mockEvent);

               expect(component.amountChange.emit).not.toHaveBeenCalled();
          });

          // it('should handle empty input', () => {
          //      spyOn(component.amountChange, 'emit');
          //      mockEvent.target.value = '';

          //      component.onAmountInput(mockEvent);

          //      // Empty string becomes NaN, should not emit
          //      expect(component.amountChange.emit).not.toHaveBeenCalled();
          // });

          it('should handle zero value', () => {
               spyOn(component.amountChange, 'emit');
               mockEvent.target.value = '0';

               component.onAmountInput(mockEvent);

               expect(component.amountChange.emit).toHaveBeenCalledWith(0);
          });
     });

     describe('View model bindings', () => {
          it('should have isIssuerForSelected from viewModel', () => {
               trustlineViewModelService.isIssuerForSelected.and.returnValue(true);
               expect(component.trustlineViewModelService.isIssuerForSelected()).toBeTrue();
          });
     });

     describe('Template layout', () => {
          it('should use split layout when layout is split', () => {
               component.layout = 'split';
               fixture.detectChanges();
               expect(component.layout).toBe('split');
          });

          it('should use paired layout when layout is paired', () => {
               component.layout = 'paired';
               fixture.detectChanges();
               expect(component.layout).toBe('paired');
          });
     });

     describe('Read-only state', () => {
          it('should set isReadOnly to true', () => {
               component.isReadOnly = true;
               fixture.detectChanges();
               expect(component.isReadOnly).toBeTrue();
          });

          it('should set isReadOnly to false', () => {
               component.isReadOnly = false;
               fixture.detectChanges();
               expect(component.isReadOnly).toBeFalse();
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

          it('should handle null selectedCurrency', () => {
               component.selectedCurrency = null;
               fixture.detectChanges();
               expect(component.selectedCurrency).toBeNull();
          });

          it('should handle null selectedIssuer', () => {
               component.selectedIssuer = null;
               fixture.detectChanges();
               expect(component.selectedIssuer).toBeNull();
          });

          it('should handle amount as string', () => {
               component.amount = '250';
               fixture.detectChanges();
               expect(component.amount).toBe('250');
          });

          it('should handle amount as number', () => {
               component.amount = 250;
               fixture.detectChanges();
               expect(component.amount).toBe(250);
          });
     });
});
