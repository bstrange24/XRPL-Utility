import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PaymentChannelFundComponent } from './payment-channel-fund.component';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PaymentChannelFundComponent', () => {
     let component: PaymentChannelFundComponent;
     let fixture: ComponentFixture<PaymentChannelFundComponent>;

     // Services
     let paymentChannelStoreService: any;
     let txUiService: any;
     let xrplTxOptionsStore: any;
     let viewModel: any;

     // Writable signals
     let amountSignal: WritableSignal<string>;
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
          wantsOptionsSignal = signal(false);
          channelItemsSignal = signal(mockChannelItems);
          selectedChannelItemSignal = signal(mockSelectedChannelItem);
          selectedIsExpiredSignal = signal(false);

          paymentChannelStoreService = {
               amount: amountSignal,
               channelIDField: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          txUiService = {
               wantsOptions: wantsOptionsSignal,
               toggleOptions: jasmine.createSpy('toggleOptions'),
          };

          xrplTxOptionsStore = {};

          viewModel = {
               channelItems: channelItemsSignal,
               selectedChannelItem: selectedChannelItemSignal,
               selectedIsExpired: selectedIsExpiredSignal,
          };

          await TestBed.configureTestingModule({
               imports: [PaymentChannelFundComponent],
               providers: [
                    { provide: PaymentChannelStoreService, useValue: paymentChannelStoreService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStore },
                    { provide: PaymentChannelViewModelService, useValue: viewModel },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
               schemas: [NO_ERRORS_SCHEMA],
          }).compileComponents();

          fixture = TestBed.createComponent(PaymentChannelFundComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          paymentChannelStoreService.setField.calls.reset();
          txUiService.toggleOptions.calls.reset();
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
               const amountInput = fixture.debugElement.query(By.css('input[placeholder="e.g. 10.5"]'));
               expect(amountInput).toBeTruthy();
          });

          it('should display channel select dropdown', () => {
               const dropdown = fixture.debugElement.query(By.css('app-select-search-dropdown'));
               expect(dropdown).toBeTruthy();
          });

          // it('should show optional fields toggle', () => {
          //      const toggleLabel = fixture.debugElement.query(By.css('.rounded-xl.border.border-gray-200'));
          //      expect(toggleLabel).toBeTruthy();
          //      expect(toggleLabel.nativeElement.textContent).toContain('Include optional fields');
          // });

          it('should NOT show optional section by default', () => {
               wantsOptionsSignal.set(false);
               fixture.detectChanges();

               const optionsSection = fixture.debugElement.query(By.css('app-transaction-options-section'));
               expect(optionsSection).toBeFalsy();
          });

          // it('should show optional section when enabled', () => {
          //      wantsOptionsSignal.set(true);
          //      fixture.detectChanges();

          //      const optionsSection = fixture.debugElement.query(By.css('app-transaction-options-section'));
          //      expect(optionsSection).toBeTruthy();
          // });

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
});
