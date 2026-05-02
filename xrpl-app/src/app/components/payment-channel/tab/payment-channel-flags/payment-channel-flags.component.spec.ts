import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentChannelFlagsComponent } from './payment-channel-flags.component';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { icons, LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';

describe('PaymentChannelFlagsComponent', () => {
     let fixture: ComponentFixture<PaymentChannelFlagsComponent>;
     let component: PaymentChannelFlagsComponent;

     const flags = {
          claimAndClose: signal(false),
     };

     const mockStore = {
          flags,
          isCreatorMode: signal(true),
     };

     const mockViewModel = {
          activeTab: signal<'claimPaymentChannel' | 'renewPaymentChannel' | 'closePaymentChannel'>('claimPaymentChannel'),
     };

     const mockUtil = {
          toggleFlag: jasmine.createSpy('toggleFlag'),
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [PaymentChannelFlagsComponent, LucideAngularModule],
               providers: [
                    { provide: PaymentChannelStoreService, useValue: mockStore },
                    { provide: PaymentChannelViewModelService, useValue: mockViewModel },
                    { provide: PaymentChannelUtilService, useValue: mockUtil },
                    {
                         provide: LUCIDE_ICONS,
                         useValue: new LucideIconProvider(icons),
                         multi: true,
                    },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(PaymentChannelFlagsComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should render Payment Channel Flags header', () => {
          const el: HTMLElement = fixture.nativeElement;
          expect(el.textContent).toContain('Payment Channel Flags');
     });

     it('should render claim flag when activeTab is claimPaymentChannel', () => {
          mockViewModel.activeTab.set('claimPaymentChannel');
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          expect(el.textContent).toContain('Claim and Close');
     });

     it('should NOT render claim flag for other tabs', () => {
          mockViewModel.activeTab.set('closePaymentChannel');
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;

          // claim section should not exist
          expect(el.textContent).not.toContain('Claim and Close (tfClose)');
     });

     it('should toggle flag when checkbox is clicked (creator mode)', () => {
          mockStore.isCreatorMode.set(true);
          mockViewModel.activeTab.set('claimPaymentChannel');
          fixture.detectChanges();

          const checkbox = fixture.debugElement.query(By.css('input[type="checkbox"]'));
          expect(checkbox).not.toBeNull();

          checkbox.nativeElement.dispatchEvent(new Event('change'));

          expect(mockUtil.toggleFlag).toHaveBeenCalledWith('claimAndClose');
     });

     // it('should NOT toggle flag when not creator mode', () => {
     //      mockStore.isCreatorMode.set(false);
     //      mockViewModel.activeTab.set('claimPaymentChannel');
     //      fixture.detectChanges();

     //      const checkbox = fixture.debugElement.query(By.css('input[type="checkbox"]'));
     //      checkbox.nativeElement.dispatchEvent(new Event('change'));

     //      expect(mockUtil.toggleFlag).not.toHaveBeenCalled();
     // });

     it('should show Locked badge when not creator mode', () => {
          mockStore.isCreatorMode.set(false);
          mockViewModel.activeTab.set('claimPaymentChannel');
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          expect(el.textContent).toContain('Locked');
     });

     it('should show expired/locked alternative UI for non-creator mode text', () => {
          mockStore.isCreatorMode.set(false);
          mockStore.flags.claimAndClose.set(true);
          mockViewModel.activeTab.set('claimPaymentChannel');
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;

          expect(el.textContent).toContain('authorized you to close');
          expect(el.textContent).toContain('The channel will close automatically');
     });

     it('should render locked state for renewPaymentChannel', () => {
          mockViewModel.activeTab.set('renewPaymentChannel');
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;

          expect(el.textContent).toContain('Renew (reset expiration)');
          expect(el.textContent).toContain('Locked');
     });

     it('should render locked state for closePaymentChannel', () => {
          mockViewModel.activeTab.set('closePaymentChannel');
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;

          expect(el.textContent).toContain('Close Channel');
          expect(el.textContent).toContain('Locked');
     });

     it('should show correct flag hex value for claim mode', () => {
          mockViewModel.activeTab.set('claimPaymentChannel');
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          expect(el.textContent).toContain('0x00020000');
     });

     it('should show creator instructions when creator mode is enabled', () => {
          mockStore.isCreatorMode.set(true);
          mockViewModel.activeTab.set('claimPaymentChannel');
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;

          expect(el.textContent).toContain('Include this flag');
          expect(el.textContent).toContain('Only enable if you want');
     });
});
