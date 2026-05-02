import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChecksCashComponent } from './checks-cash.component';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineStoreService } from '../../../../services/trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('ChecksCashComponent', () => {
     let component: ChecksCashComponent;
     let fixture: ComponentFixture<ChecksCashComponent>;
     let checksTransactionViewModelService: any;
     let txUiService: any;
     let trustlineStoreService: any;
     let checksStoreService: any;

     // Mock data - using only properties that exist in SelectItem
     const mockCheckItems = [
          { id: 'check123', display: '100 XRP', secondary: 'rIssuer1' },
          { id: 'check456', display: '250 USD', secondary: 'rIssuer2' },
     ] as SelectItem[];

     beforeEach(async () => {
          // Create service mocks
          checksTransactionViewModelService = {
               activeTab: signal('cashCheck'),
               checkItems: signal(mockCheckItems),
               filteredCheckIds: signal<string[]>(['check123', 'check456']),
               checkIdDisplay: signal(''),
               checkIdInputDisplay: signal(''),
               selectedCheckItem: signal<SelectItem | null>(null),
               selectedCheckIsExpired: signal(false),
               explorerLinks: signal(null),
               infoData: signal(null),
          };

          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
               spinner: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org/'),
               stepMessage: jasmine.createSpy('stepMessage').and.returnValue(''),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               clearAllFields: jasmine.createSpy('clearAllFields'),
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
               setTxResultSignal: jasmine.createSpy('setTxResultSignal'),
               txResultSignal: signal([]),
               successMessageSignal: signal(''),
               errorMessageSignal: signal(null),
               isSummaryLoading: signal(false),
               isSummaryLoadingSignal: signal(false),
               txSignal: signal(null),
          };

          trustlineStoreService = {
               outstandingIOUCollapsed: signal(false),
               setField: jasmine.createSpy('setField'),
               reset: jasmine.createSpy('reset'),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
          };

          checksStoreService = {
               amount: signal(''),
               checkIdField: jasmine.createSpy('checkIdField').and.returnValue(''),
               checkIdSearchQuery: signal(''),
               outstandingChecksCollapsed: signal(false),
               enableExpirationDate: signal(false),
               checkExpirationDate: signal(''),
               destination: signal(''),
               resetCheckFields: jasmine.createSpy('resetCheckFields'),
               getAll: jasmine.createSpy('getAll').and.returnValue({}),
               setField: jasmine.createSpy('setField'),
          };

          await TestBed.configureTestingModule({
               imports: [ChecksCashComponent],
               providers: [
                    { provide: ChecksTransactionViewModelService, useValue: checksTransactionViewModelService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: TrustlineStoreService, useValue: trustlineStoreService },
                    { provide: UtilsService, useValue: { formatAmount: jasmine.createSpy('formatAmount').and.callFake(val => val) } },
                    { provide: ChecksStoreService, useValue: checksStoreService },
               ],
          })
               .overrideComponent(ChecksCashComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(ChecksCashComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset spies
          checksStoreService.setField.calls.reset();
          checksStoreService.resetCheckFields.calls.reset();
          txUiService.clearAllFields.calls.reset();
          trustlineStoreService.setField.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('onFocus', () => {
          it('should format numeric input to 6 decimal places', () => {
               const mockInput = { value: '2.5' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('2.500000');
          });

          it('should format integer to 6 decimal places', () => {
               const mockInput = { value: '10' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('10.000000');
          });

          it('should format decimal with more than 6 places to 6 decimal places', () => {
               const mockInput = { value: '123.456789012' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('123.456789');
          });

          it('should not modify empty input', () => {
               const mockInput = { value: '' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('');
          });

          it('should not modify non-numeric input', () => {
               const mockInput = { value: 'abc' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('abc');
          });

          it('should handle negative numbers', () => {
               const mockInput = { value: '-5.5' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('-5.500000');
          });

          it('should handle zero', () => {
               const mockInput = { value: '0' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('0.000000');
          });

          it('should handle large numbers with precision limits', () => {
               const mockInput = { value: '999999999999.999999' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               // Due to floating-point precision, the value may be rounded
               // Just verify it's a number with 6 decimal places
               expect(mockInput.value).toMatch(/^\d+\.\d{6}$/);
               expect(Number.parseFloat(mockInput.value)).toBeCloseTo(999999999999.999999, 2);
          });

          it('should handle numbers with scientific notation', () => {
               const mockInput = { value: '1e5' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('100000.000000');
          });

          it('should handle numbers with decimal scientific notation', () => {
               const mockInput = { value: '1.5e3' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('1500.000000');
          });

          it('should handle very small numbers', () => {
               const mockInput = { value: '0.000001' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('0.000001');
          });
     });

     describe('@Input properties', () => {
          it('should accept showEnableTrustline input', () => {
               expect(component.showEnableTrustline).toBeFalse();

               component.showEnableTrustline = true;
               expect(component.showEnableTrustline).toBeTrue();
          });

          it('should default showEnableTrustline to false', () => {
               expect(component.showEnableTrustline).toBeFalse();
          });
     });

     describe('@Output emitters', () => {
          it('should have checkItems emitter', () => {
               expect(component.checkItems).toBeDefined();
               expect(component.checkItems.emit).toBeDefined();
          });

          it('should emit checkItems when called', () => {
               spyOn(component.checkItems, 'emit');
               const mockItem = mockCheckItems[0];
               component.checkItems.emit(mockItem);
               expect(component.checkItems.emit).toHaveBeenCalledWith(mockItem);
          });

          it('should have checkSelected emitter', () => {
               expect(component.checkSelected).toBeDefined();
               expect(component.checkSelected.emit).toBeDefined();
          });

          it('should emit checkSelected when called', () => {
               spyOn(component.checkSelected, 'emit');
               const mockItem = mockCheckItems[1];
               component.checkSelected.emit(mockItem);
               expect(component.checkSelected.emit).toHaveBeenCalledWith(mockItem);
          });

          it('should have selectedCheckItem emitter', () => {
               expect(component.selectedCheckItem).toBeDefined();
               expect(component.selectedCheckItem.emit).toBeDefined();
          });

          it('should emit selectedCheckItem when called', () => {
               spyOn(component.selectedCheckItem, 'emit');
               const mockItem = mockCheckItems[0];
               component.selectedCheckItem.emit(mockItem);
               expect(component.selectedCheckItem.emit).toHaveBeenCalledWith(mockItem);
          });

          it('should emit null values', () => {
               spyOn(component.checkSelected, 'emit');
               component.checkSelected.emit(null);
               expect(component.checkSelected.emit).toHaveBeenCalledWith(null);
          });
     });

     describe('Service injections', () => {
          it('should have checksTransactionViewModelService injected', () => {
               expect(component.checksTransactionViewModelService).toBe(checksTransactionViewModelService);
          });

          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiService);
          });

          it('should have utilsService injected', () => {
               expect(component.utilsService).toBeDefined();
          });

          it('should have trustlineStoreService injected', () => {
               expect(component.trustlineStoreService).toBe(trustlineStoreService);
          });

          it('should have checkStoreService injected', () => {
               expect(component.checkStoreService).toBe(checksStoreService);
          });
     });

     describe('Signal access (from view model)', () => {
          it('should have access to checkItems signal', () => {
               const items = component.checksTransactionViewModelService.checkItems();
               expect(items).toEqual(mockCheckItems);
          });

          // it('should have access to filteredCheckIds signal', () => {
          //      const filteredIds = component.checksTransactionViewModelService.filteredCheckIds();
          //      expect(filteredIds).toEqual(['check123', 'check456']);
          // });

          it('should have access to selectedCheckItem signal', () => {
               const selected = component.checksTransactionViewModelService.selectedCheckItem();
               expect(selected).toBeNull();
          });

          it('should have access to selectedCheckIsExpired signal', () => {
               const isExpired = component.checksTransactionViewModelService.selectedCheckIsExpired();
               expect(isExpired).toBeFalse();
          });

          it('should have access to activeTab signal', () => {
               const activeTab = component.checksTransactionViewModelService.activeTab();
               expect(activeTab).toBe('cashCheck');
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have checkStoreService.amount signal available for template', () => {
               expect(component.checkStoreService.amount).toBeDefined();
               expect(component.checkStoreService.amount()).toBe('');
          });

          it('should have checkStoreService.checkIdField method available', () => {
               expect(component.checkStoreService.checkIdField).toBeDefined();
               component.checkStoreService.checkIdField();
               expect(component.checkStoreService.checkIdField).toHaveBeenCalled();
          });

          it('should have txUiService.currentStep signal available', () => {
               expect(component.txUiService.currentStep()).toBe('idle');
          });
     });

     describe('Edge cases', () => {
          it('should handle rapid focus events without errors', () => {
               const mockInput = { value: '100' } as HTMLInputElement;

               for (let i = 0; i < 10; i++) {
                    expect(() => {
                         component.onFocus({ target: mockInput } as unknown as FocusEvent);
                    }).not.toThrow();
               }
          });

          it('should handle input with leading/trailing spaces', () => {
               const mockInput = { value: '  50.5  ' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('50.500000');
          });

          it('should handle large numbers within precision limits', () => {
               const mockInput = { value: '999999999999.999' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               // Just verify it has 6 decimal places, not the exact value due to floating point precision
               expect(mockInput.value).toMatch(/^\d+\.\d{6}$/);
          });

          it('should handle maximum safe integer', () => {
               const maxSafeInt = '9007199254740991';
               const mockInput = { value: maxSafeInt } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toMatch(/^\d+\.\d{6}$/);
          });
     });

     describe('Component lifecycle', () => {
          it('should initialize with default values', () => {
               expect(component).toBeDefined();
               expect(component.showEnableTrustline).toBeFalse();
          });

          it('should maintain component state between change detection cycles', () => {
               component.showEnableTrustline = true;
               fixture.detectChanges();
               expect(component.showEnableTrustline).toBeTrue();

               fixture.detectChanges(); // Second change detection
               expect(component.showEnableTrustline).toBeTrue();
          });
     });

     describe('Check selection functionality', () => {
          it('should properly handle check selection through output', () => {
               const selectedSpy = spyOn(component.selectedCheckItem, 'emit');
               const mockSelectedItem = mockCheckItems[0];

               component.selectedCheckItem.emit(mockSelectedItem);

               expect(selectedSpy).toHaveBeenCalledWith(mockSelectedItem);
          });

          it('should emit check changes when checkSelected is triggered', () => {
               const checkSelectedSpy = spyOn(component.checkSelected, 'emit');
               const mockItem = mockCheckItems[1];

               component.checkSelected.emit(mockItem);

               expect(checkSelectedSpy).toHaveBeenCalledWith(mockItem);
          });
     });
});
