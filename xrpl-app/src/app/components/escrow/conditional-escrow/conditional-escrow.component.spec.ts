import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ConditionalEscrowComponent } from './conditional-escrow.component';
import { EscrowBaseComponent } from '../escrow-base/escrow-base.component';

// Polyfill Buffer for tests
import { Buffer } from 'buffer';
import { EscrowStoreService } from '../../../services/escrow/escrow-store/escrow-store.service';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { UtilsService } from '../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../services/wallets/manager/wallet-manager.service';
(globalThis as any).Buffer = Buffer;

describe('ConditionalEscrowComponent', () => {
     let component: ConditionalEscrowComponent;
     let fixture: ComponentFixture<ConditionalEscrowComponent>;
     let escrowStoreService: any;
     let transactionUiService: any;
     let walletManagerService: any;
     let toastService: any;
     let utilsService: any;

     // Create mock wallets
     const mockWallets = signal([{ address: 'rTestAddress', classicAddress: 'rTestAddress', name: 'Test Wallet', seed: '' }]);
     const mockSelectedIndex = signal(0);
     const mockHasWallets = computed(() => mockWallets().length > 0);

     beforeEach(async () => {
          escrowStoreService = {
               setField: jasmine.createSpy('setField'),
               getField: jasmine.createSpy('getField'),
               condition: signal(''),
               fulfillment: signal(''),
               amount: signal(''),
               destination: signal(''),
               cancelAfter: signal(''),
               finishAfter: signal(''),
               resetEscrowFields: jasmine.createSpy('resetEscrowFields'),
          };

          transactionUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
               spinner: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org/'),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               setError: jasmine.createSpy('setError'),
               setInfoMessage: jasmine.createSpy('setInfoMessage'),
          };

          walletManagerService = {
               wallets: mockWallets.asReadonly(),
               selectedIndex: mockSelectedIndex.asReadonly(),
               hasWallets: mockHasWallets,
               currentWallet: computed(() => mockWallets()[mockSelectedIndex()] || {}),
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue({
                    address: 'rTestAddress',
                    classicAddress: 'rTestAddress',
                    name: 'Test Wallet',
                    seed: '',
               }),
               getSelectedIndex: jasmine.createSpy('getSelectedIndex').and.returnValue(0),
               setSelectedIndex: jasmine.createSpy('setSelectedIndex'),
               ensureWalletSelected: jasmine.createSpy('ensureWalletSelected').and.returnValue(true),
               isEditing: jasmine.createSpy('isEditing').and.returnValue(false),
               startEdit: jasmine.createSpy('startEdit'),
               saveEdit: jasmine.createSpy('saveEdit'),
               cancelEdit: jasmine.createSpy('cancelEdit'),
               deleteWallet: jasmine.createSpy('deleteWallet'),
               updateWallets: jasmine.createSpy('updateWallets'),
               addWallet: jasmine.createSpy('addWallet'),
               setWallets: jasmine.createSpy('setWallets'),
          };

          toastService = {
               error: jasmine.createSpy('error'),
               success: jasmine.createSpy('success'),
               info: jasmine.createSpy('info'),
          };

          utilsService = {
               formatAmount: jasmine.createSpy('formatAmount').and.callFake((val: any) => val),
               isValidAddress: jasmine.createSpy('isValidAddress').and.returnValue(true),
          };

          await TestBed.configureTestingModule({
               imports: [ConditionalEscrowComponent],
               providers: [
                    provideRouter([]),
                    {
                         provide: ActivatedRoute,
                         useValue: {
                              params: of({}),
                              queryParams: of({}),
                              fragment: of(null),
                              data: of({}),
                              paramMap: of(convertToParamMap({})),
                              queryParamMap: of(convertToParamMap({})),
                              snapshot: {
                                   params: {},
                                   queryParams: {},
                                   data: {},
                                   paramMap: convertToParamMap({}),
                                   queryParamMap: convertToParamMap({}),
                              },
                         },
                    },
                    { provide: EscrowStoreService, useValue: escrowStoreService },
                    { provide: TransactionUiService, useValue: transactionUiService },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: ToastService, useValue: toastService },
                    { provide: UtilsService, useValue: utilsService },
               ],
          })
               .overrideComponent(ConditionalEscrowComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(ConditionalEscrowComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          escrowStoreService.setField.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should override isConditional to true', () => {
          expect(component.isConditional).toBeTrue();
     });

     describe('Signals initialization', () => {
          it('should initialize conditionSignal as empty string', () => {
               expect(component.conditionSignal()).toBe('');
          });

          it('should initialize fulfillmentSignal as empty string', () => {
               expect(component.fulfillmentSignal()).toBe('');
          });
     });

     describe('setCondition', () => {
          it('should set conditionSignal value', () => {
               const testCondition = 'test-condition-123';
               component.setCondition(testCondition);

               expect(component.conditionSignal()).toBe(testCondition);
          });

          it('should call escrowStoreService.setField with condition', () => {
               const testCondition = 'test-condition-456';
               component.setCondition(testCondition);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('condition', testCondition);
          });

          it('should handle empty string', () => {
               component.setCondition('');

               expect(component.conditionSignal()).toBe('');
               expect(escrowStoreService.setField).toHaveBeenCalledWith('condition', '');
          });

          it('should handle long condition strings', () => {
               const longCondition = 'a'.repeat(1000);
               component.setCondition(longCondition);

               expect(component.conditionSignal()).toBe(longCondition);
               expect(escrowStoreService.setField).toHaveBeenCalledWith('condition', longCondition);
          });
     });

     describe('setFulfillment', () => {
          it('should set fulfillmentSignal value', () => {
               const testFulfillment = 'test-fulfillment-123';
               component.setFulfillment(testFulfillment);

               expect(component.fulfillmentSignal()).toBe(testFulfillment);
          });

          it('should call escrowStoreService.setField with fulfillment', () => {
               const testFulfillment = 'test-fulfillment-456';
               component.setFulfillment(testFulfillment);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('fulfillment', testFulfillment);
          });

          it('should handle empty string', () => {
               component.setFulfillment('');

               expect(component.fulfillmentSignal()).toBe('');
               expect(escrowStoreService.setField).toHaveBeenCalledWith('fulfillment', '');
          });
     });

     describe('generateCondition', () => {
          it('should generate condition and fulfillment strings', () => {
               const result = component.generateCondition();

               expect(result.condition).toBeDefined();
               expect(result.fulfillment).toBeDefined();
               expect(typeof result.condition).toBe('string');
               expect(typeof result.fulfillment).toBe('string');
               expect(result.condition.length).toBeGreaterThan(0);
               expect(result.fulfillment.length).toBeGreaterThan(0);
          });

          it('should generate uppercase hex strings', () => {
               const result = component.generateCondition();

               // Hex strings should only contain 0-9, A-F
               expect(result.condition).toMatch(/^[0-9A-F]+$/);
               expect(result.fulfillment).toMatch(/^[0-9A-F]+$/);
          });
     });

     describe('getCondition', () => {
          it('should call generateCondition', () => {
               spyOn(component, 'generateCondition').and.returnValue({
                    condition: 'generated-condition',
                    fulfillment: 'generated-fulfillment',
               });

               component.getCondition();

               expect(component.generateCondition).toHaveBeenCalled();
          });

          it('should set condition field in escrowStoreService', () => {
               spyOn(component, 'generateCondition').and.returnValue({
                    condition: 'generated-condition',
                    fulfillment: 'generated-fulfillment',
               });

               component.getCondition();

               expect(escrowStoreService.setField).toHaveBeenCalledWith('condition', 'generated-condition');
          });

          it('should set fulfillment field in escrowStoreService', () => {
               spyOn(component, 'generateCondition').and.returnValue({
                    condition: 'generated-condition',
                    fulfillment: 'generated-fulfillment',
               });

               component.getCondition();

               expect(escrowStoreService.setField).toHaveBeenCalledWith('fulfillment', 'generated-fulfillment');
          });
     });

     describe('clearInputFields (override)', () => {
          beforeEach(() => {
               component.setCondition('test-condition');
               component.setFulfillment('test-fulfillment');
               escrowStoreService.setField.calls.reset();
          });

          it('should clear conditionSignal', () => {
               (component as any).clearInputFields();

               expect(component.conditionSignal()).toBe('');
          });

          it('should clear fulfillmentSignal', () => {
               (component as any).clearInputFields();

               expect(component.fulfillmentSignal()).toBe('');
          });

          it('should clear condition in escrowStoreService', () => {
               (component as any).clearInputFields();

               expect(escrowStoreService.setField).toHaveBeenCalledWith('condition', '');
          });

          it('should clear fulfillment in escrowStoreService', () => {
               (component as any).clearInputFields();

               expect(escrowStoreService.setField).toHaveBeenCalledWith('fulfillment', '');
          });

          it('should call setField twice', () => {
               (component as any).clearInputFields();

               expect(escrowStoreService.setField).toHaveBeenCalledTimes(2);
          });
     });

     describe('Two-way binding functionality', () => {
          it('should update conditionSignal when setCondition is called', () => {
               component.setCondition('new-condition');
               expect(component.conditionSignal()).toBe('new-condition');
          });

          it('should update fulfillmentSignal when setFulfillment is called', () => {
               component.setFulfillment('new-fulfillment');
               expect(component.fulfillmentSignal()).toBe('new-fulfillment');
          });

          it('should sync conditionSignal with store', () => {
               const testValue = 'sync-condition';
               component.setCondition(testValue);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('condition', testValue);
          });

          it('should sync fulfillmentSignal with store', () => {
               const testValue = 'sync-fulfillment';
               component.setFulfillment(testValue);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('fulfillment', testValue);
          });
     });

     describe('Edge cases', () => {
          it('should handle setting condition with special characters', () => {
               const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
               component.setCondition(specialChars);

               expect(component.conditionSignal()).toBe(specialChars);
          });

          it('should handle setting fulfillment with special characters', () => {
               const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
               component.setFulfillment(specialChars);

               expect(component.fulfillmentSignal()).toBe(specialChars);
          });

          it('should handle hex values for condition', () => {
               const hexValue = 'A1B2C3D4E5F67890';
               component.setCondition(hexValue);

               expect(component.conditionSignal()).toBe(hexValue);
               expect(escrowStoreService.setField).toHaveBeenCalledWith('condition', hexValue);
          });

          it('should handle hex values for fulfillment', () => {
               const hexValue = 'F1E2D3C4B5A67890';
               component.setFulfillment(hexValue);

               expect(component.fulfillmentSignal()).toBe(hexValue);
               expect(escrowStoreService.setField).toHaveBeenCalledWith('fulfillment', hexValue);
          });

          it('should handle rapid successive updates', () => {
               for (let i = 0; i < 10; i++) {
                    component.setCondition(`condition-${i}`);
                    component.setFulfillment(`fulfillment-${i}`);
               }

               expect(component.conditionSignal()).toBe('condition-9');
               expect(component.fulfillmentSignal()).toBe('fulfillment-9');
               expect(escrowStoreService.setField).toHaveBeenCalledTimes(20);
          });
     });

     describe('Inheritance from EscrowBaseComponent', () => {
          it('should extend EscrowBaseComponent', () => {
               expect(component instanceof EscrowBaseComponent).toBeTrue();
          });

          it('should have access to escrowStoreService from base', () => {
               expect(component.escrowStoreService).toBe(escrowStoreService);
          });

          it('should have access to walletManagerService from base', () => {
               expect(component.walletManagerService).toBe(walletManagerService);
          });
     });
});
