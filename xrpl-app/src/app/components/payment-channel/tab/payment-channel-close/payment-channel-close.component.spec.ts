import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentChannelCloseComponent } from './payment-channel-close.component';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('PaymentChannelCloseComponent', () => {
     let fixture: ComponentFixture<PaymentChannelCloseComponent>;
     let component: PaymentChannelCloseComponent;

     const mockViewModel = {
          channelItems: signal([
               { id: '1', display: 'Channel 1' },
               { id: '2', display: 'Channel 2' },
          ]),
          selectedChannelItem: signal({ id: '1', display: 'Channel 1' }),
          activeTab: signal('closePaymentChannel'),
          selectedIsExpired: signal(false),
     };

     const mockUtil = {
          setChannelId: jasmine.createSpy('setChannelId'),
     };

     const mockStore = {
          channelIDField: '',
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [PaymentChannelCloseComponent],
               providers: [
                    { provide: PaymentChannelViewModelService, useValue: mockViewModel },
                    { provide: PaymentChannelUtilService, useValue: mockUtil },
                    { provide: PaymentChannelStoreService, useValue: mockStore },
                    {
                         provide: LUCIDE_ICONS,
                         useValue: new LucideIconProvider(icons),
                         multi: true,
                    },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(PaymentChannelCloseComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should render Payment Channel section title', () => {
          const el: HTMLElement = fixture.nativeElement;
          expect(el.textContent).toContain('Payment Channel Details');
     });

     it('should render select dropdown component', () => {
          const dropdown = fixture.debugElement.query(By.directive(SelectSearchDropdownComponent));
          expect(dropdown).not.toBeNull();
     });

     it('should pass items and selected value into dropdown', () => {
          const dropdown = fixture.debugElement.query(By.directive(SelectSearchDropdownComponent));

          expect(dropdown.componentInstance.items()).toEqual(mockViewModel.channelItems());
          expect(dropdown.componentInstance.value()).toEqual(mockViewModel.selectedChannelItem());
     });

     it('should call util service when channel selection changes', () => {
          const dropdown = fixture.debugElement.query(By.directive(SelectSearchDropdownComponent));

          const newValue = { id: '2', display: 'Channel 2' };
          dropdown.componentInstance.valueChange.emit(newValue as any);

          expect(mockUtil.setChannelId).toHaveBeenCalledWith(newValue);
     });

     it('should show expired warning when selectedIsExpired is true', () => {
          mockViewModel.selectedIsExpired.set(true);
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          expect(el.textContent).toContain('This selected payment channel has expired.');
     });

     it('should NOT show expired warning when selectedIsExpired is false', () => {
          mockViewModel.selectedIsExpired.set(false);
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          expect(el.textContent).not.toContain('This selected payment channel has expired.');
     });

     it('should render channel ID input field', () => {
          const input = fixture.debugElement.query(By.css('input[name="channelIDField"]'));
          expect(input).not.toBeNull();
     });

     it('should bind input to store channelIDField', () => {
          const input = fixture.debugElement.query(By.css('input[name="channelIDField"]')).nativeElement as HTMLInputElement;

          input.value = 'ABC123';
          input.dispatchEvent(new Event('input'));
          fixture.detectChanges();

          expect(mockStore.channelIDField).toBe('ABC123');
     });
});
