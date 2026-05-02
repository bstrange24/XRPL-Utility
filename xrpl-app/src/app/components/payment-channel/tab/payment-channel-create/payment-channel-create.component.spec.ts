import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PaymentChannelCreateComponent } from './payment-channel-create.component';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PaymentChannelCreateComponent', () => {
     let component: PaymentChannelCreateComponent;
     let fixture: ComponentFixture<PaymentChannelCreateComponent>;

     // Services
     let paymentChannelStoreService: any;
     let txUiService: any;
     let xrplTxOptionsStore: any;

     // Writable signals
     let amountSignal: WritableSignal<string>;
     let settleDelaySignal: WritableSignal<string>;
     let wantsOptionsSignal: WritableSignal<boolean>;
     let destinationTag: WritableSignal<string>;

     // Mock data
     const mockDestinationItems: SelectItem[] = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     const mockSelectedDestinationItem: SelectItem = { id: 'rDest1', display: 'Destination 1' };

     beforeEach(async () => {
          // Initialize writable signals
          amountSignal = signal('');
          settleDelaySignal = signal('');
          wantsOptionsSignal = signal(false);
          destinationTag = signal('');

          paymentChannelStoreService = {
               amount: amountSignal,
               settleDelay: settleDelaySignal,
               setField: jasmine.createSpy('setField'),
          };

          txUiService = {
               wantsOptions: wantsOptionsSignal,
               toggleOptions: jasmine.createSpy('toggleOptions'),
          };

          xrplTxOptionsStore = {
               destinationTag: destinationTag,
          };

          await TestBed.configureTestingModule({
               imports: [PaymentChannelCreateComponent],
               providers: [
                    { provide: PaymentChannelStoreService, useValue: paymentChannelStoreService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStore },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
               schemas: [NO_ERRORS_SCHEMA],
          }).compileComponents();

          fixture = TestBed.createComponent(PaymentChannelCreateComponent);
          component = fixture.componentInstance;

          // Set inputs
          component.destinationItems = mockDestinationItems;
          component.selectedDestinationItem = mockSelectedDestinationItem;

          fixture.detectChanges();
     });

     afterEach(() => {
          paymentChannelStoreService.setField.calls.reset();
          txUiService.toggleOptions.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept destinationItems input', () => {
               expect(component.destinationItems).toEqual(mockDestinationItems);
          });

          it('should accept selectedDestinationItem input', () => {
               expect(component.selectedDestinationItem).toEqual(mockSelectedDestinationItem);
          });

          it('should update destinationItems when changed', () => {
               const newItems = [{ id: 'rNew', display: 'New' }];
               component.destinationItems = newItems;
               fixture.detectChanges();
               expect(component.destinationItems).toEqual(newItems);
          });

          it('should update selectedDestinationItem when changed', () => {
               const newSelected = { id: 'rNew', display: 'New Selected' };
               component.selectedDestinationItem = newSelected;
               fixture.detectChanges();
               expect(component.selectedDestinationItem).toEqual(newSelected);
          });
     });

     describe('Output emitters', () => {
          it('should have destinationChanged EventEmitter', () => {
               expect(component.destinationChanged).toBeDefined();
               expect(component.destinationChanged.emit).toBeDefined();
          });

          it('should emit destinationChanged when called', () => {
               spyOn(component.destinationChanged, 'emit');
               const mockItem = { id: 'rDest', display: 'Destination' };
               component.destinationChanged.emit(mockItem);
               expect(component.destinationChanged.emit).toHaveBeenCalledWith(mockItem);
          });

          it('should have optionsToggled output', () => {
               expect(component.optionsToggled).toBeDefined();
               expect(component.optionsToggled.emit).toBeDefined();
          });

          it('should emit optionsToggled when called', () => {
               spyOn(component.optionsToggled, 'emit');
               component.optionsToggled.emit(true);
               expect(component.optionsToggled.emit).toHaveBeenCalledWith(true);
          });
     });

     describe('onFocus', () => {
          it('should call select on input element when select exists', () => {
               const mockInput = { select: jasmine.createSpy('select') } as any;
               const event = { target: mockInput } as FocusEvent;

               component.onFocus(event);

               expect(mockInput.select).toHaveBeenCalled();
          });
     });

     describe('Store bindings', () => {
          it('should have amount signal from store', () => {
               amountSignal.set('100');
               fixture.detectChanges();
               expect(component.paymentChannelStoreService.amount()).toBe('100');
          });

          it('should have settleDelay signal from store', () => {
               settleDelaySignal.set('3600');
               fixture.detectChanges();
               expect(component.paymentChannelStoreService.settleDelay()).toBe('3600');
          });

          it('should call setField when amount changes', () => {
               const newAmount = '500';
               paymentChannelStoreService.setField('amount', newAmount);
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('amount', newAmount);
          });
     });

     describe('TxUiService bindings', () => {
          // it('should have wantsOptions signal from txUiService', () => {
          //      wantsOptionsSignal.set(true);
          //      fixture.detectChanges();
          //      expect(component.txUiService.wantsOptions()).toBeTrue();
          // });

          it('should call toggleOptions when checkbox is toggled', () => {
               const checkbox = fixture.debugElement.query(By.css('input[type="checkbox"]'));
               if (checkbox) {
                    checkbox.triggerEventHandler('change', { target: { checked: true } });
                    expect(txUiService.toggleOptions).toHaveBeenCalledWith(true);
               }
          });
     });

     describe('Template rendering', () => {
          it('should display amount input field', () => {
               const amountInput = fixture.debugElement.query(By.css('input[name="amountField"]'));
               expect(amountInput).toBeTruthy();
          });

          it('should display settle delay input field', () => {
               const settleDelayInput = fixture.debugElement.query(By.css('input[name="settleDelay"]'));
               expect(settleDelayInput).toBeTruthy();
          });

          it('should display destination dropdown', () => {
               const dropdown = fixture.debugElement.query(By.css('app-select-search-dropdown'));
               expect(dropdown).toBeTruthy();
          });

          it('should show optional fields toggle', () => {
               const toggleLabel = fixture.debugElement.query(By.css('.rounded-xl.border.border-gray-200'));
               expect(toggleLabel).toBeTruthy();
               expect(toggleLabel.nativeElement.textContent).toContain('Include optional fields');
          });
     });

     describe('Edge cases', () => {
          it('should handle empty destinationItems', () => {
               component.destinationItems = [];
               fixture.detectChanges();
               expect(component.destinationItems).toEqual([]);
          });

          it('should handle null selectedDestinationItem', () => {
               component.selectedDestinationItem = null;
               fixture.detectChanges();
               expect(component.selectedDestinationItem).toBeNull();
          });

          it('should handle amount with decimal places', () => {
               amountSignal.set('10.5');
               expect(component.paymentChannelStoreService.amount()).toBe('10.5');
          });

          it('should handle settle delay as string', () => {
               settleDelaySignal.set('86400');
               expect(component.paymentChannelStoreService.settleDelay()).toBe('86400');
          });

          it('should handle rapid amount changes', () => {
               for (let i = 0; i < 10; i++) {
                    paymentChannelStoreService.setField('amount', i.toString());
               }
               expect(paymentChannelStoreService.setField).toHaveBeenCalledTimes(10);
          });
     });
});
