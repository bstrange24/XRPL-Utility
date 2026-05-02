import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PaymentChannelRenewComponent } from './payment-channel-renew.component';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PaymentChannelRenewComponent', () => {
     let component: PaymentChannelRenewComponent;
     let fixture: ComponentFixture<PaymentChannelRenewComponent>;

     // Services
     let paymentChannelStoreService: any;
     let viewModel: any;
     let paymentChannelUtilService: any;

     // Writable signals
     let channelIDFieldSignal: WritableSignal<string>;
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
          channelIDFieldSignal = signal('');
          channelItemsSignal = signal(mockChannelItems);
          selectedChannelItemSignal = signal(mockSelectedChannelItem);
          selectedIsExpiredSignal = signal(false);

          paymentChannelStoreService = {
               channelIDField: channelIDFieldSignal,
               setField: jasmine.createSpy('setField'),
          };

          viewModel = {
               channelItems: channelItemsSignal,
               selectedChannelItem: selectedChannelItemSignal,
               selectedIsExpired: selectedIsExpiredSignal,
          };

          paymentChannelUtilService = {
               setChannelId: jasmine.createSpy('setChannelId'),
          };

          await TestBed.configureTestingModule({
               imports: [PaymentChannelRenewComponent],
               providers: [
                    { provide: PaymentChannelStoreService, useValue: paymentChannelStoreService },
                    { provide: PaymentChannelViewModelService, useValue: viewModel },
                    { provide: PaymentChannelUtilService, useValue: paymentChannelUtilService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
               schemas: [NO_ERRORS_SCHEMA],
          }).compileComponents();

          fixture = TestBed.createComponent(PaymentChannelRenewComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          paymentChannelUtilService.setChannelId.calls.reset();
          paymentChannelStoreService.setField.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Service injections', () => {
          it('should have viewModel injected', () => {
               expect(component.viewModel).toBe(viewModel);
          });

          it('should have paymentChannelUtilService injected', () => {
               expect(component.paymentChannelUtilService).toBe(paymentChannelUtilService);
          });

          it('should have paymentChannelStoreService injected', () => {
               expect(component.paymentChannelStoreService).toBe(paymentChannelStoreService);
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

          it('should have selectedIsExpired from viewModel', () => {
               selectedIsExpiredSignal.set(true);
               fixture.detectChanges();
               expect(component.viewModel.selectedIsExpired()).toBeTrue();
          });
     });

     describe('Store bindings', () => {
          it('should have channelIDField signal from store', () => {
               channelIDFieldSignal.set('test-channel-id-123');
               fixture.detectChanges();
               expect(component.paymentChannelStoreService.channelIDField()).toBe('test-channel-id-123');
          });

          // it('should update channelIDField when input changes', () => {
          //      const channelIdInput = fixture.debugElement.query(By.css('input[name="channelIDField"]'));
          //      if (channelIdInput) {
          //           channelIdInput.triggerEventHandler('ngModelChange', 'new-channel-id');
          //           expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('channelIDField', 'new-channel-id');
          //      }
          // });
     });

     describe('Template rendering', () => {
          it('should display channel select dropdown', () => {
               const dropdown = fixture.debugElement.query(By.css('app-select-search-dropdown'));
               expect(dropdown).toBeTruthy();
          });

          it('should display channel ID input field', () => {
               const channelIdInput = fixture.debugElement.query(By.css('input[name="channelIDField"]'));
               expect(channelIdInput).toBeTruthy();
          });

          it('should call setChannelId when channel is selected', () => {
               const dropdown = fixture.debugElement.query(By.css('app-select-search-dropdown'));
               if (dropdown) {
                    dropdown.triggerEventHandler('valueChange', mockSelectedChannelItem);
                    expect(paymentChannelUtilService.setChannelId).toHaveBeenCalledWith(mockSelectedChannelItem);
               }
          });

          it('should show label for channel selection', () => {
               const label = fixture.debugElement.query(By.css('label[for="selectChannelToRenew"]'));
               expect(label).toBeTruthy();
               expect(label.nativeElement.textContent).toContain('Select Payment Channel to Renew');
          });

          it('should show channel ID label', () => {
               const label = fixture.debugElement.query(By.css('label[for="channelID"]'));
               expect(label).toBeTruthy();
               expect(label.nativeElement.textContent).toContain('Channel ID');
          });
     });

     describe('Expired warning', () => {
          it('should not show expired warning when channel is not expired', () => {
               selectedIsExpiredSignal.set(false);
               fixture.detectChanges();

               const warning = fixture.debugElement.query(By.css('.bg-red-50'));
               expect(warning).toBeFalsy();
          });

          it('should show expired warning when channel is expired', () => {
               selectedIsExpiredSignal.set(true);
               fixture.detectChanges();

               const warning = fixture.debugElement.query(By.css('.bg-red-50'));
               expect(warning).toBeTruthy();
               expect(warning.nativeElement.textContent).toContain('This selected payment channel has expired');
          });
     });

     describe('Edge cases', () => {
          it('should handle empty channel items', () => {
               channelItemsSignal.set([]);
               fixture.detectChanges();

               const items = component.viewModel.channelItems();
               expect(items).toEqual([]);
          });

          it('should handle null selected channel item', () => {
               selectedChannelItemSignal.set(null);
               fixture.detectChanges();

               const selected = component.viewModel.selectedChannelItem();
               expect(selected).toBeNull();
          });

          it('should handle empty channel ID field', () => {
               channelIDFieldSignal.set('');
               expect(component.paymentChannelStoreService.channelIDField()).toBe('');
          });

          it('should handle long channel ID', () => {
               const longId = 'a'.repeat(100);
               channelIDFieldSignal.set(longId);
               fixture.detectChanges();
               expect(component.paymentChannelStoreService.channelIDField()).toBe(longId);
          });
     });
});
