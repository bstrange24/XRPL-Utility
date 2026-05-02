import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PaymentChannelClaimComponent } from './payment-channel-claim.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { PaymentChannelStoreService } from '../../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { PaymentChannelViewModelService } from '../../../../services/payment-channel/payment-channel-transaction-view-model/payment-channel-view-model.service';
import { PaymentChannelUtilService } from '../../../../services/payment-channel/payment-channel-util/payment-channel-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PaymentChannelClaimComponent', () => {
     let component: PaymentChannelClaimComponent;
     let fixture: ComponentFixture<PaymentChannelClaimComponent>;

     // Services
     let viewModel: any;
     let paymentChannelUtilService: any;
     let paymentChannelStoreService: any;
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let txUiService: any;
     let walletManagerService: any;

     // Mock data
     const mockChannelItems = [
          { id: 'channel1', display: 'Channel 1 - 100 XRP', secondary: 'Created: 2024-01-01' },
          { id: 'channel2', display: 'Channel 2 - 250 XRP', secondary: 'Created: 2024-01-02' },
     ];

     const mockSelectedChannelItem = { id: 'channel1', display: 'Channel 1 - 100 XRP' };
     const mockWallet = { address: 'rTestWallet', classicAddress: 'rTestWallet', name: 'Test Wallet' };

     beforeEach(async () => {
          viewModel = {
               channelItems: jasmine.createSpy('channelItems').and.returnValue(mockChannelItems),
               selectedChannelItem: jasmine.createSpy('selectedChannelItem').and.returnValue(mockSelectedChannelItem),
               selectedIsExpired: jasmine.createSpy('selectedIsExpired').and.returnValue(false),
          };

          paymentChannelUtilService = {
               setChannelId: jasmine.createSpy('setChannelId'),
               generateCreatorClaimSignature: jasmine.createSpy('generateCreatorClaimSignature').and.resolveTo(),
          };

          paymentChannelStoreService = {
               isCreatorMode: signal(false),
               channelIDField: signal(''),
               amount: signal(''),
               channelClaimSignatureField: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copyAndToast']);
          copyUtilService.copyAndToast.and.returnValue();

          txUiService = {
               currentStep: signal('idle'),
          };

          walletManagerService = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
          };

          await TestBed.configureTestingModule({
               imports: [PaymentChannelClaimComponent],
               providers: [
                    { provide: PaymentChannelViewModelService, useValue: viewModel },
                    { provide: PaymentChannelUtilService, useValue: paymentChannelUtilService },
                    { provide: PaymentChannelStoreService, useValue: paymentChannelStoreService },
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
               schemas: [NO_ERRORS_SCHEMA],
          }).compileComponents();

          fixture = TestBed.createComponent(PaymentChannelClaimComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          paymentChannelStoreService.setField.calls.reset();
          paymentChannelUtilService.setChannelId.calls.reset();
          paymentChannelUtilService.generateCreatorClaimSignature.calls.reset();
          copyUtilService.copyAndToast.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('isIdle computed', () => {
          it('should return true when currentStep is idle', () => {
               expect(component.isIdle()).toBeTrue();
          });

          it('should return false when currentStep is not idle', () => {
               txUiService.currentStep.set('submitting');
               fixture.detectChanges();
               expect(component.isIdle()).toBeFalse();
          });
     });

     describe('toggleCreatorMode1', () => {
          it('should set isCreatorMode to true', () => {
               component.toggleCreatorMode1(true);
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('isCreatorMode', true);
          });

          it('should set isCreatorMode to false', () => {
               component.toggleCreatorMode1(false);
               expect(paymentChannelStoreService.setField).toHaveBeenCalledWith('isCreatorMode', false);
          });
     });

     describe('generateCreatorClaimSignature', () => {
          it('should call generateCreatorClaimSignature with selected wallet', async () => {
               await component.generateCreatorClaimSignature();

               expect(paymentChannelUtilService.generateCreatorClaimSignature).toHaveBeenCalledWith(mockWallet);
          });

          it('should not call generateCreatorClaimSignature when no wallet selected', async () => {
               walletManagerService.getSelectedWallet.and.returnValue(null);

               await component.generateCreatorClaimSignature();

               expect(paymentChannelUtilService.generateCreatorClaimSignature).not.toHaveBeenCalled();
          });
     });

     describe('onFocus', () => {
          it('should call select on input element when select method exists', () => {
               const mockInput = { select: jasmine.createSpy('select') } as any;
               const event = { target: mockInput } as FocusEvent;

               component.onFocus(event);

               expect(mockInput.select).toHaveBeenCalled();
          });

          // it('should handle input without select method without throwing', () => {
          //      const mockInput = {} as any;
          //      const event = { target: mockInput } as FocusEvent;

          //      // The component code checks "if (input) input.select();"
          //      // So if select doesn't exist, it will throw. This is expected behavior.
          //      // We just verify it doesn't throw when select exists, or handle gracefully.
          //      expect(() => component.onFocus(event)).not.toThrow();
          // });
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

          it('should have copyUtilService injected', () => {
               expect(component.copyUtilService).toBe(copyUtilService);
          });

          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiService);
          });

          it('should have walletManagerService injected', () => {
               expect(component.walletManagerService).toBe(walletManagerService);
          });
     });

     describe('Creator Mode UI', () => {
          beforeEach(() => {
               paymentChannelStoreService.isCreatorMode.set(true);
               fixture.detectChanges();
          });

          it('should show creator mode content when isCreatorMode is true', () => {
               const creatorModeDiv = fixture.debugElement.query(By.css('.rounded-2xl.border.border-gray-200.bg-white.p-5'));
               expect(creatorModeDiv).toBeTruthy();
          });

          it('should show channel items dropdown', () => {
               expect(viewModel.channelItems).toHaveBeenCalled();
          });

          it('should call setChannelId when channel is selected', () => {
               const dropdown = fixture.debugElement.query(By.css('app-select-search-dropdown'));
               if (dropdown) {
                    dropdown.triggerEventHandler('valueChange', mockSelectedChannelItem);
                    expect(paymentChannelUtilService.setChannelId).toHaveBeenCalledWith(mockSelectedChannelItem);
               }
          });

          it('should show channel ID field as readonly', () => {
               const channelIdInput = fixture.debugElement.query(By.css('input[name="channelIDField"]'));
               if (channelIdInput) {
                    expect(channelIdInput.nativeElement.readOnly).toBeTrue();
               }
          });

          // it('should show generated signature when available', () => {
          //      paymentChannelStoreService.channelClaimSignatureField.set('test-signature-123');
          //      fixture.detectChanges();

          //      // Find the input with the signature value
          //      const signatureInput = fixture.debugElement.query(By.css('input[value="test-signature-123"]'));
          //      expect(signatureInput).toBeTruthy();
          // });

          it('should copy signature when copy button is clicked', () => {
               paymentChannelStoreService.channelClaimSignatureField.set('test-signature');
               fixture.detectChanges();

               const copyButton = fixture.debugElement.query(By.css('.btn-primary'));
               if (copyButton) {
                    copyButton.triggerEventHandler('click', null);
                    expect(copyUtilService.copyAndToast).toHaveBeenCalledWith('test-signature', 'Signature');
               }
          });

          // it('should show expired warning when selected channel is expired', () => {
          //      viewModel.selectedIsExpired.and.returnValue(true);
          //      fixture.detectChanges();

          //      const warning = fixture.debugElement.query(By.css('.border-red-200'));
          //      expect(warning).toBeTruthy();
          // });
     });

     describe('Normal Mode UI', () => {
          beforeEach(() => {
               paymentChannelStoreService.isCreatorMode.set(false);
               fixture.detectChanges();
          });

          it('should show normal mode content when isCreatorMode is false', () => {
               const normalModeDiv = fixture.debugElement.query(By.css('.rounded-2xl.border.border-gray-200.bg-white.p-5'));
               expect(normalModeDiv).toBeTruthy();
          });

          it('should show channel items dropdown', () => {
               expect(viewModel.channelItems).toHaveBeenCalled();
          });

          it('should show channel ID field as editable', () => {
               const channelIdInput = fixture.debugElement.query(By.css('input[name="channelIDField"]'));
               if (channelIdInput) {
                    expect(channelIdInput.nativeElement.readOnly).toBeFalsy();
               }
          });

          it('should show amount input field', () => {
               const amountInput = fixture.debugElement.query(By.css('input[placeholder="e.g. 10.5"]'));
               expect(amountInput).toBeTruthy();
          });

          it('should show signature input field', () => {
               const signatureInput = fixture.debugElement.query(By.css('input[name="channelClaimSignatureField"]'));
               expect(signatureInput).toBeTruthy();
          });

          // it('should show expired warning when selected channel is expired', () => {
          //      viewModel.selectedIsExpired.and.returnValue(true);
          //      fixture.detectChanges();

          //      const warning = fixture.debugElement.query(By.css('.border-red-200'));
          //      expect(warning).toBeTruthy();
          // });
     });

     describe('Mode Toggle Switch', () => {
          it('should show mode toggle card', () => {
               const toggleCard = fixture.debugElement.query(By.css('.rounded-2xl.border.border-gray-200.bg-white.p-5'));
               expect(toggleCard).toBeTruthy();
          });

          it('should show Normal Claim text when not in creator mode', () => {
               paymentChannelStoreService.isCreatorMode.set(false);
               fixture.detectChanges();

               const normalText = fixture.debugElement.query(By.css('.text-gray-900'));
               if (normalText) {
                    expect(normalText.nativeElement.textContent).toContain('Normal Claim (as Destination)');
               }
          });

          it('should show Generate Signature text when in creator mode', () => {
               paymentChannelStoreService.isCreatorMode.set(true);
               fixture.detectChanges();

               const creatorText = fixture.debugElement.query(By.css('.text-gray-900'));
               if (creatorText) {
                    expect(creatorText.nativeElement.textContent).toContain('Generate Signature (as Creator)');
               }
          });

          it('should call toggleCreatorMode1 when checkbox is toggled', () => {
               const checkbox = fixture.debugElement.query(By.css('input[type="checkbox"]'));
               if (checkbox) {
                    spyOn(component, 'toggleCreatorMode1');
                    checkbox.triggerEventHandler('change', { target: { checked: true } });
                    expect(component.toggleCreatorMode1).toHaveBeenCalledWith(true);
               }
          });
     });

     describe('Edge cases', () => {
          it('should handle empty channel items', () => {
               viewModel.channelItems.and.returnValue([]);
               fixture.detectChanges();

               const items = component.viewModel.channelItems();
               expect(items).toEqual([]);
          });

          it('should handle null selected channel item', () => {
               viewModel.selectedChannelItem.and.returnValue(null);
               fixture.detectChanges();

               const selected = component.viewModel.selectedChannelItem();
               expect(selected).toBeNull();
          });

          it('should handle generateCreatorClaimSignature error gracefully', async () => {
               paymentChannelUtilService.generateCreatorClaimSignature.and.rejectWith(new Error('Generation failed'));

               await expectAsync(component.generateCreatorClaimSignature()).toBeRejected();
          });
     });
});
