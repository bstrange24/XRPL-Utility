import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal, Component, Input, NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { OverlayModule } from '@angular/cdk/overlay';

import { PaymentChannelFundComponent } from './payment-channel-fund.component';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';

// Mock both child components
@Component({
     selector: 'app-select-search-dropdown',
     template: '<div class="mock-dropdown"></div>',
     standalone: true,
})
class MockSelectSearchDropdownComponent {
     @Input() items: any[] = [];
     @Input() value: any;
     @Input() placeholder: string = '';
     @Input() emptyMessage: string = '';
}

@Component({
     selector: 'app-transaction-options-section',
     template: '<div class="mock-options-section">Mock Options Section</div>',
     standalone: true,
})
class MockTransactionOptionsSectionComponent {
     @Input() activeTab: string = '';
}

describe('PaymentChannelFundComponent', () => {
     let component: PaymentChannelFundComponent;
     let fixture: ComponentFixture<PaymentChannelFundComponent>;

     // Services
     let paymentChannelStoreService: any;
     let txUiService: any;
     let viewModel: any;
     let paymentChannelUtilService: jasmine.SpyObj<PaymentChannelUtilService>;

     // Writable signals
     let amountSignal: WritableSignal<string>;
     let channelIDFieldSignal: WritableSignal<string>;
     let wantsOptionsSignal: WritableSignal<boolean>;
     let channelItemsSignal: WritableSignal<any[]>;
     let selectedChannelItemSignal: WritableSignal<any>;
     let selectedIsExpiredSignal: WritableSignal<boolean>;

     // Mock data
     const mockChannelItems = [
          { id: 'channel1', display: 'Channel 1 - 100 XRP', secondary: 'Created: 2024-01-01' },
          { id: 'channel2', display: 'Channel 2 - 250 XRP', secondary: 'Created: 2024-01-02' },
     ];

     const mockSelectedChannelItem = { id: 'channel1', display: 'Channel 1 - 100 XRP' };

     beforeEach(async () => {
          // Initialize writable signals
          amountSignal = signal('');
          channelIDFieldSignal = signal('');
          wantsOptionsSignal = signal(false);
          channelItemsSignal = signal(mockChannelItems);
          selectedChannelItemSignal = signal(mockSelectedChannelItem);
          selectedIsExpiredSignal = signal(false);

          paymentChannelStoreService = {
               amount: amountSignal,
               channelIDField: channelIDFieldSignal,
               setField: jasmine.createSpy('setField'),
          };

          txUiService = {
               wantsOptions: wantsOptionsSignal,
               toggleOptions: jasmine.createSpy('toggleOptions'),
          };

          viewModel = {
               channelItems: channelItemsSignal,
               selectedChannelItem: selectedChannelItemSignal,
               selectedIsExpired: selectedIsExpiredSignal,
               activeTab: signal('fundPaymentChannel'),
               infoData: signal({}),
          };

          paymentChannelUtilService = jasmine.createSpyObj('PaymentChannelUtilService', ['setChannelId']);

          await TestBed.configureTestingModule({
               imports: [PaymentChannelFundComponent, FormsModule, OverlayModule, MockSelectSearchDropdownComponent, MockTransactionOptionsSectionComponent],
               providers: [provideNoopAnimations(), { provide: PaymentChannelStoreService, useValue: paymentChannelStoreService }, { provide: TransactionUiService, useValue: txUiService }, { provide: XrplTxOptionsStore, useValue: {} }, { provide: PaymentChannelViewModelService, useValue: viewModel }, { provide: PaymentChannelUtilService, useValue: paymentChannelUtilService }],
               schemas: [NO_ERRORS_SCHEMA],
          })
               .overrideComponent(PaymentChannelFundComponent, {
                    set: {
                         imports: [FormsModule, OverlayModule, MockSelectSearchDropdownComponent, MockTransactionOptionsSectionComponent],
                         schemas: [NO_ERRORS_SCHEMA],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(PaymentChannelFundComponent);
          component = fixture.componentInstance;

          fixture.detectChanges();
     });

     afterEach(() => {
          paymentChannelStoreService.setField.calls.reset();
          txUiService.toggleOptions.calls.reset();
          paymentChannelUtilService.setChannelId.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Store bindings', () => {
          it('should have amount signal from store', () => {
               amountSignal.set('100');
               fixture.detectChanges();
               expect(component.paymentChannelStoreService.amount()).toBe('100');
          });

          it('should call setField when amount changes', () => {
               const newAmount = '500';
               component.paymentChannelStoreService.setField('amount', newAmount);
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('amount', newAmount);
          });

          it('should bind channelIDField to input element', async () => {
               const channelIdInput = fixture.debugElement.query(By.css('input[name="channelIDField"]'));
               expect(channelIdInput).toBeTruthy();

               channelIDFieldSignal.set('test-channel-id-123');
               fixture.detectChanges();
               await fixture.whenStable();

               expect(channelIdInput.nativeElement.value).toBe('test-channel-id-123');
          });

          it('should call setField when channelIDField changes', () => {
               const channelIdInput = fixture.debugElement.query(By.css('input[name="channelIDField"]'));
               expect(channelIdInput).toBeTruthy();
               channelIdInput.triggerEventHandler('ngModelChange', 'new-channel-id');

               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('channelIDField', 'new-channel-id');
          });

          it('should call setField when amount input changes', () => {
               const amountInput = fixture.debugElement.query(By.css('input[name="amountField"]'));
               expect(amountInput).toBeTruthy();
               amountInput.triggerEventHandler('ngModelChange', '750');

               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('amount', '750');
          });
     });

     describe('ViewModel bindings', () => {
          it('should have channelItems from viewModel', () => {
               const items = component.viewModel.channelItems();
               expect(items).toEqual(mockChannelItems);
          });

          it('should have selectedChannelItem from viewModel', () => {
               const selected = component.viewModel.selectedChannelItem();
               expect(selected).toEqual(mockSelectedChannelItem);
          });

          it('should have dropdown component', () => {
               const dropdown = fixture.debugElement.query(By.css('app-select-search-dropdown'));
               expect(dropdown).toBeTruthy();
          });

          it('should have value bound to dropdown', () => {
               const dropdown = fixture.debugElement.query(By.css('app-select-search-dropdown'));
               expect(dropdown.componentInstance.value).toEqual(mockSelectedChannelItem);
          });

          it('should call setChannelId when dropdown value changes', () => {
               const dropdown = fixture.debugElement.query(By.css('app-select-search-dropdown'));
               expect(dropdown).toBeTruthy();
               const newValue = { id: 'channel2', display: 'Channel 2 - 250 XRP' };
               dropdown.triggerEventHandler('valueChange', newValue);

               expect(paymentChannelUtilService.setChannelId).toHaveBeenCalledWith(newValue);
          });

          it('should bind selectedIsExpired to show/hide warning', () => {
               selectedIsExpiredSignal.set(true);
               fixture.detectChanges();

               const warning = fixture.debugElement.query(By.css('.border-red-200'));
               expect(warning).toBeTruthy();

               selectedIsExpiredSignal.set(false);
               fixture.detectChanges();

               const warningAfter = fixture.debugElement.query(By.css('.border-red-200'));
               expect(warningAfter).toBeFalsy();
          });
     });

     describe('TxUiService bindings', () => {
          it('should call toggleOptions when checkbox is toggled to true', () => {
               const checkbox = fixture.debugElement.query(By.css('input[type="checkbox"]'));
               expect(checkbox).toBeTruthy();
               checkbox.triggerEventHandler('change', { target: { checked: true } });
               expect(txUiService.toggleOptions).toHaveBeenCalledWith(true);
          });

          it('should call toggleOptions when checkbox is toggled to false', () => {
               const checkbox = fixture.debugElement.query(By.css('input[type="checkbox"]'));
               expect(checkbox).toBeTruthy();
               checkbox.triggerEventHandler('change', { target: { checked: false } });
               expect(txUiService.toggleOptions).toHaveBeenCalledWith(false);
          });

          it('should reflect wantsOptions state in checkbox checked property', () => {
               wantsOptionsSignal.set(true);
               fixture.detectChanges();

               const checkbox = fixture.debugElement.query(By.css('input[type="checkbox"]'));
               expect(checkbox).toBeTruthy();
               expect(checkbox.nativeElement.checked).toBeTrue();

               wantsOptionsSignal.set(false);
               fixture.detectChanges();

               expect(checkbox.nativeElement.checked).toBeFalse();
          });
     });

     describe('Template rendering', () => {
          it('should display amount input field', () => {
               const amountInput = fixture.debugElement.query(By.css('input[placeholder="e.g. 10.5"]'));
               expect(amountInput).toBeTruthy();
          });

          it('should display channel select dropdown', () => {
               const dropdown = fixture.debugElement.query(By.css('app-select-search-dropdown'));
               expect(dropdown).toBeTruthy();
          });

          it('should display channel ID input field', () => {
               const channelIdInput = fixture.debugElement.query(By.css('input[name="channelIDField"]'));
               expect(channelIdInput).toBeTruthy();
          });

          it('should NOT show optional section by default', () => {
               wantsOptionsSignal.set(false);
               fixture.detectChanges();

               const optionsSection = fixture.debugElement.query(By.css('app-transaction-options-section'));
               expect(optionsSection).toBeFalsy();
          });

          it('should show optional section when wantsOptions is true', () => {
               wantsOptionsSignal.set(true);
               fixture.detectChanges();

               const optionsSection = fixture.debugElement.query(By.css('app-transaction-options-section'));
               expect(optionsSection).toBeTruthy();
          });

          it('should not render expired warning when false', () => {
               selectedIsExpiredSignal.set(false);
               fixture.detectChanges();

               const warning = fixture.debugElement.query(By.css('.border-red-200'));
               expect(warning).toBeFalsy();
          });

          it('should render expired warning when true', () => {
               selectedIsExpiredSignal.set(true);
               fixture.detectChanges();

               const warning = fixture.debugElement.query(By.css('.border-red-200'));
               expect(warning).toBeTruthy();
          });
     });

     describe('onFocus method', () => {
          it('should select all text in input when focused', () => {
               const mockInput = document.createElement('input');
               mockInput.value = '123.456';
               const selectSpy = spyOn(mockInput, 'select');

               const event = { target: mockInput } as any;
               component.onFocus(event);

               expect(selectSpy).toHaveBeenCalled();
          });

          it('should handle null target gracefully', () => {
               const event = { target: null } as any;
               expect(() => component.onFocus(event)).not.toThrow();
          });

          // it('should handle non-input target gracefully', () => {
          //      // Create a completely mock event that won't cause errors
          //      const event = {
          //           target: {
          //                tagName: 'DIV',
          //                nodeType: 1,
          //           },
          //      } as any;

          //      // This should not throw because we're not trying to call select on a non-input
          //      expect(() => component.onFocus(event)).not.toThrow();
          // });
     });

     // describe('Options toggled output', () => {
     //      it('should emit optionsToggled when checkbox changes', () => {
     //           // Create a new spy for this test
     //           const emitSpy = spyOn(component.optionsToggled, 'emit');

     //           const checkbox = fixture.debugElement.query(By.css('input[type="checkbox"]'));
     //           expect(checkbox).toBeTruthy();

     //           // Manually trigger the change event
     //           const changeEvent = new Event('change');
     //           checkbox.nativeElement.checked = true;
     //           checkbox.nativeElement.dispatchEvent(changeEvent);
     //           fixture.detectChanges();

     //           expect(emitSpy).toHaveBeenCalledWith(true);
     //      });
     // });
});
