import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PaymentChannelSummaryComponent } from './payment-channel-summary.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';

import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('PaymentChannelSummaryComponent (logic)', () => {
     let component: PaymentChannelSummaryComponent;
     let fixture: ComponentFixture<PaymentChannelSummaryComponent>;

     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let viewModel: jasmine.SpyObj<PaymentChannelViewModelService>;
     let paymentChannelUtilService: jasmine.SpyObj<PaymentChannelUtilService>;

     const mockChannel = {
          id: 'ABC123',
          totalAmount: '100',
          remaining: '50',
          balance: '50',
          settleDelay: 10,
          isExpired: false,
          isOwner: true,
          destination: 'rDEST',
          sender: 'rSRC',
          expiration: null,
          status: 'active',
          canClose: true,
     } as any;

     beforeEach(async () => {
          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copyAndToast']);

          viewModel = jasmine.createSpyObj('PaymentChannelViewModelService', [], {
               infoData: signal({
                    walletName: 'test',
                    activeTab: 'claimPaymentChannel',
                    channelCount: 1,
                    channelsToShow: [],
                    headerMessage: '',
                    isCreatorMode: false,
               }),
               activeTab: signal('claimPaymentChannel'),
          });

          paymentChannelUtilService = jasmine.createSpyObj('PaymentChannelUtilService', ['selectedPaymentChannelId']);

          await TestBed.configureTestingModule({
               imports: [PaymentChannelSummaryComponent],
               providers: [
                    provideNoopAnimations(),
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },

                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: PaymentChannelViewModelService, useValue: viewModel },
                    { provide: PaymentChannelUtilService, useValue: paymentChannelUtilService },

                    {
                         provide: TransactionUiService,
                         useValue: {
                              explorerUrl: signal('https://explorer.test/'),
                         },
                    },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(PaymentChannelSummaryComponent);
          component = fixture.componentInstance;
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should emit channel and toggle panel when NOT createPaymentChannel', () => {
          const emitSpy = jasmine.createSpy('emit');

          component.paymentChannelSelected = { emit: emitSpy } as any;
          component.toggleInfoPanel = { emit: jasmine.createSpy('toggle') } as any;

          component.onPaymentChannelClick(mockChannel);

          expect(emitSpy).toHaveBeenCalledWith(mockChannel);
          expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
     });

     // it('should NOT toggle panel when createPaymentChannel tab', () => {
     //      (component as any).viewModel.activeTab = signal('createPaymentChannel');

     //      const emitSpy = jasmine.createSpy('emit');
     //      component.paymentChannelSelected = { emit: emitSpy } as any;
     //      component.toggleInfoPanel = { emit: jasmine.createSpy('toggle') } as any;

     //      component.onPaymentChannelClick(mockChannel);

     //      expect(component.toggleInfoPanel.emit).not.toHaveBeenCalled();
     // });
});
