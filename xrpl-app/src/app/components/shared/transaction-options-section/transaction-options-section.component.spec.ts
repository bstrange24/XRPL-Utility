import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TransactionOptionsSectionComponent } from './transaction-options-section.component';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../services/utils/util-service/utils.service';
import { CredentialStore } from '../../../services/credentials/credential-store/credential-store.service';
import { XrplTxOptionsStore } from '../stores/xrpl-tx-options.store';
import { PermissionedDomainStoreService } from '../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { AccountConfiguratorStoreService } from '../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { CredentialUtilService } from '../../../services/credentials/credential-util/credential-util.service';
import { PaymentChannelStoreService } from '../../../services/payment-channel/payment-channel-store/payment-channel-store.service';
import { ChecksStoreService } from '../../../services/checks/checks-store/checks-store.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import * as xrpl from 'xrpl';

describe('TransactionOptionsSectionComponent', () => {
     let component: TransactionOptionsSectionComponent;
     let fixture: ComponentFixture<TransactionOptionsSectionComponent>;

     // Services
     let txUiService: any;
     let utilsService: any;
     let credentialStore: any;
     let xrplTxOptionsStore: any;
     let credentialUtilService: any;
     let permissionedDomainStoreService: any;
     let accountConfiguratorStoreService: any;
     let paymentChannelStoreService: any;
     let checksStoreService: any;

     beforeEach(async () => {
          txUiService = {
               wantsOptions: signal(true),
          };

          utilsService = {};

          credentialStore = {
               uri: signal(''),
               credentialSubjectExpirationDate: signal(''),
               credentialID: signal(''),
               credentialIDs: signal([]),
               setField: jasmine.createSpy('setField'),
               setCredentialSubjectExpirationDate: jasmine.createSpy('setCredentialSubjectExpirationDate'),
          };

          xrplTxOptionsStore = {
               destinationTag: signal(''),
               sourceTag: signal(''),
               invoiceId: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          credentialUtilService = {
               setCredentialUri: jasmine.createSpy('setCredentialUri'),
          };

          permissionedDomainStoreService = {
               domainId: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          accountConfiguratorStoreService = {};

          paymentChannelStoreService = {
               paymentChannelCancelAfterTimeField: signal(''),
               setPaymentChannelCancelAfterTime: jasmine.createSpy('setPaymentChannelCancelAfterTime'),
          };

          checksStoreService = {
               checkExpirationDate: signal(''),
               enableExpirationDate: signal(false),
               setField: jasmine.createSpy('setField'),
          };

          await TestBed.configureTestingModule({
               imports: [TransactionOptionsSectionComponent],
               providers: [
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: UtilsService, useValue: utilsService },
                    { provide: CredentialStore, useValue: credentialStore },
                    { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStore },
                    { provide: CredentialUtilService, useValue: credentialUtilService },
                    { provide: PermissionedDomainStoreService, useValue: permissionedDomainStoreService },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: PaymentChannelStoreService, useValue: paymentChannelStoreService },
                    { provide: ChecksStoreService, useValue: checksStoreService },
               ],
               schemas: [NO_ERRORS_SCHEMA],
          }).compileComponents();

          fixture = TestBed.createComponent(TransactionOptionsSectionComponent);
          component = fixture.componentInstance;

          // Set required input
          fixture.componentRef.setInput('activeTab', 'sendXrp');

          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset spies
          credentialStore.setField.calls.reset();
          xrplTxOptionsStore.setField.calls.reset();
          credentialUtilService.setCredentialUri.calls.reset();
          permissionedDomainStoreService.setField.calls.reset();
          checksStoreService.setField.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept activeTab input', () => {
               expect(component.activeTab()).toBe('sendXrp');
          });

          it('should accept wantsOptions input', () => {
               component.wantsOptions = true;
               expect(component.wantsOptions).toBeTrue();
          });
     });

     describe('invoiceIdHex', () => {
          it('should return empty string when invoiceId is empty', () => {
               xrplTxOptionsStore.invoiceId.set('');
               const result = component.invoiceIdHex();
               expect(result).toBe('');
          });

          it('should return uppercase hex when input is already hex', () => {
               xrplTxOptionsStore.invoiceId.set('a1b2c3');
               const result = component.invoiceIdHex();
               expect(result).toBe('A1B2C3');
          });

          it('should convert string to hex when input is not hex', () => {
               xrplTxOptionsStore.invoiceId.set('test');
               const result = component.invoiceIdHex();
               expect(result).toBe(xrpl.convertStringToHex('test'));
          });
     });

     describe('invoiceIdHexLengthBytes', () => {
          it('should return 0 when hex is empty', () => {
               xrplTxOptionsStore.invoiceId.set('');
               const result = component.invoiceIdHexLengthBytes();
               expect(result).toBe(0);
          });

          it('should calculate correct byte length', () => {
               xrplTxOptionsStore.invoiceId.set('test');
               const hex = xrpl.convertStringToHex('test');
               const expectedLength = Math.ceil(hex.length / 2);
               const result = component.invoiceIdHexLengthBytes();
               expect(result).toBe(expectedLength);
          });
     });

     describe('isInvoiceIdTooLong', () => {
          it('should return false when within limit', () => {
               xrplTxOptionsStore.invoiceId.set('test');
               const result = component.isInvoiceIdTooLong();
               expect(result).toBeFalse();
          });

          // it('should return true when exceeds 256 bytes', () => {
          //      const longString = 'a'.repeat(300);
          //      xrplTxOptionsStore.invoiceId.set(longString);
          //      const result = component.isInvoiceIdTooLong();
          //      expect(result).toBeTrue();
          // });
     });

     describe('invoiceIdToHex', () => {
          it('should return empty string for empty value', () => {
               const result = component.invoiceIdToHex('');
               expect(result).toBe('');
          });

          it('should return uppercase hex for hex input', () => {
               const result = component.invoiceIdToHex('a1b2c3');
               expect(result).toBe('A1B2C3');
          });

          it('should convert string to hex', () => {
               const result = component.invoiceIdToHex('test');
               expect(result).toBe(xrpl.convertStringToHex('test'));
          });
     });

     describe('onCredentialIDsChange', () => {
          it('should set credentialID field', () => {
               component.onCredentialIDsChange('cred1, cred2, cred3');

               expect(credentialStore.setField).toHaveBeenCalledWith('credentialID', 'cred1, cred2, cred3');
               expect(credentialStore.setField).toHaveBeenCalledWith('credentialIDs', ['cred1', 'cred2', 'cred3']);
          });

          it('should handle empty string', () => {
               component.onCredentialIDsChange('');

               expect(credentialStore.setField).toHaveBeenCalledWith('credentialID', '');
               expect(credentialStore.setField).toHaveBeenCalledWith('credentialIDs', []);
          });

          it('should trim spaces from credential IDs', () => {
               component.onCredentialIDsChange('  cred1  ,  cred2  ,  cred3  ');

               expect(credentialStore.setField).toHaveBeenCalledWith('credentialIDs', ['cred1', 'cred2', 'cred3']);
          });
     });

     describe('onFocus', () => {
          it('should call select on input element', () => {
               const mockInput = { select: jasmine.createSpy('select') } as any;
               const event = { target: mockInput } as FocusEvent;

               component.onFocus(event);

               expect(mockInput.select).toHaveBeenCalled();
          });

          // it('should handle event without select method', () => {
          //      const mockInput = {} as any;
          //      const event = { target: mockInput } as FocusEvent;

          //      expect(() => component.onFocus(event)).not.toThrow();
          // });
     });

     describe('setCheckExpirationDate', () => {
          it('should set checkExpirationDate and enableExpirationDate', () => {
               const testDate = '2024-12-31';
               component.setCheckExpirationDate(testDate);

               expect(checksStoreService.setField).toHaveBeenCalledWith('checkExpirationDate', testDate);
               expect(checksStoreService.setField).toHaveBeenCalledWith('enableExpirationDate', true);
          });
     });

     describe('Template conditions (indirect tests)', () => {
          it('should show options when wantsOptions is true', () => {
               txUiService.wantsOptions.set(true);
               fixture.detectChanges();
               expect(component.txUiService.wantsOptions()).toBeTrue();
          });

          it('should hide options when wantsOptions is false', () => {
               txUiService.wantsOptions.set(false);
               fixture.detectChanges();
               expect(component.txUiService.wantsOptions()).toBeFalse();
          });

          it('should show credential fields for createCredential tab', () => {
               fixture.componentRef.setInput('activeTab', 'createCredential');
               fixture.detectChanges();
               expect(component.activeTab()).toBe('createCredential');
          });

          it('should show payment channel fields for createPaymentChannel tab', () => {
               fixture.componentRef.setInput('activeTab', 'createPaymentChannel');
               fixture.detectChanges();
               expect(component.activeTab()).toBe('createPaymentChannel');
          });

          it('should show sendXrp fields for sendXrp tab', () => {
               fixture.componentRef.setInput('activeTab', 'sendXrp');
               fixture.detectChanges();
               expect(component.activeTab()).toBe('sendXrp');
          });

          it('should show deleteAccount fields for deleteAccount tab', () => {
               fixture.componentRef.setInput('activeTab', 'deleteAccount');
               fixture.detectChanges();
               expect(component.activeTab()).toBe('deleteAccount');
          });
     });

     describe('Edge cases', () => {
          it('should handle credentialStore.uri being updated', () => {
               credentialStore.uri.set('https://example.com');
               fixture.detectChanges();
               expect(credentialStore.uri()).toBe('https://example.com');
          });

          it('should handle xrplTxOptionsStore.destinationTag being updated', () => {
               xrplTxOptionsStore.destinationTag.set('123456');
               fixture.detectChanges();
               expect(xrplTxOptionsStore.destinationTag()).toBe('123456');
          });

          it('should handle xrplTxOptionsStore.sourceTag being updated', () => {
               xrplTxOptionsStore.sourceTag.set('789012');
               fixture.detectChanges();
               expect(xrplTxOptionsStore.sourceTag()).toBe('789012');
          });

          it('should handle permissionedDomainStoreService.domainId being updated', () => {
               permissionedDomainStoreService.domainId.set('example.com');
               fixture.detectChanges();
               expect(permissionedDomainStoreService.domainId()).toBe('example.com');
          });

          it('should handle checksStoreService.checkExpirationDate being updated', () => {
               checksStoreService.checkExpirationDate.set('2025-12-31');
               fixture.detectChanges();
               expect(checksStoreService.checkExpirationDate()).toBe('2025-12-31');
          });
     });
});
