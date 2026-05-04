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

     describe('emptyStateMessage', () => {
          it('should return empty string when there are channels (count > 0)', () => {
               (viewModel.infoData as any).set({
                    channelCount: 5,
                    isCreatorMode: false,
               });

               const result = component.emptyStateMessage();
               expect(result).toBe('');
          });

          it('should return creator mode message for claimPaymentChannel when count is 0 and isCreatorMode is true', () => {
               (viewModel.activeTab as any).set('claimPaymentChannel');
               (viewModel.infoData as any).set({
                    channelCount: 0,
                    isCreatorMode: true,
               });

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no payment channels to generate signatures for.');
          });

          it('should return non-creator mode message for claimPaymentChannel when count is 0 and isCreatorMode is false', () => {
               (viewModel.activeTab as any).set('claimPaymentChannel');
               (viewModel.infoData as any).set({
                    channelCount: 0,
                    isCreatorMode: false,
               });

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no payment channels with claimable funds.');
          });

          it('should return renew message for renewPaymentChannel when count is 0', () => {
               (viewModel.activeTab as any).set('renewPaymentChannel');
               (viewModel.infoData as any).set({
                    channelCount: 0,
                    isCreatorMode: false,
               });

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no payment channels to renew.');
          });

          it('should return close message for closePaymentChannel when count is 0', () => {
               (viewModel.activeTab as any).set('closePaymentChannel');
               (viewModel.infoData as any).set({
                    channelCount: 0,
                    isCreatorMode: false,
               });

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no payment channels to close.');
          });

          it('should return fund message for fundPaymentChannel when count is 0', () => {
               (viewModel.activeTab as any).set('fundPaymentChannel');
               (viewModel.infoData as any).set({
                    channelCount: 0,
                    isCreatorMode: false,
               });

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no payment channels to fund.');
          });

          it('should return create message for createPaymentChannel when count is 0', () => {
               (viewModel.activeTab as any).set('createPaymentChannel');
               (viewModel.infoData as any).set({
                    channelCount: 0,
                    isCreatorMode: false,
               });

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has not created any payment channels.');
          });

          it('should return default message for unknown tab when count is 0', () => {
               (viewModel.activeTab as any).set('unknownTab');
               (viewModel.infoData as any).set({
                    channelCount: 0,
                    isCreatorMode: false,
               });

               const result = component.emptyStateMessage();
               expect(result).toBe('No payment channels found.');
          });

          it('should handle undefined infoData gracefully', () => {
               (viewModel.infoData as any).set(undefined);
               (viewModel.activeTab as any).set('claimPaymentChannel');

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no payment channels with claimable funds.');
          });

          it('should handle null infoData gracefully', () => {
               (viewModel.infoData as any).set(null);
               (viewModel.activeTab as any).set('claimPaymentChannel');

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no payment channels with claimable funds.');
          });

          it('should treat missing channelCount as 0', () => {
               (viewModel.infoData as any).set({
                    isCreatorMode: true,
               });
               (viewModel.activeTab as any).set('claimPaymentChannel');

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no payment channels to generate signatures for.');
          });

          it('should prioritize channelCount check before activeTab logic', () => {
               (viewModel.infoData as any).set({
                    channelCount: 3,
                    isCreatorMode: true,
               });
               (viewModel.activeTab as any).set('claimPaymentChannel');

               const result = component.emptyStateMessage();
               expect(result).toBe('');
          });
     });
});
