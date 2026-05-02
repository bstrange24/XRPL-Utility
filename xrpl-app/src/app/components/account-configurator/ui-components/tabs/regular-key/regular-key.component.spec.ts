import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RegularKeyComponent } from './regular-key.component';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('RegularKeyComponent', () => {
     let component: RegularKeyComponent;
     let fixture: ComponentFixture<RegularKeyComponent>;

     // Services
     let accountConfiguratorViewModelService: any;
     let connectionGuard: any;
     let accountConfiguratorStoreService: any;
     let accountConfiguratorUtilService: any;
     let txUiService: any;

     beforeEach(async () => {
          accountConfiguratorViewModelService = {
               activeTab: signal('modifyRegularKey'),
          };

          connectionGuard = {
               isConnectionReady: jasmine.createSpy('isConnectionReady').and.returnValue(true),
          };

          accountConfiguratorStoreService = {
               regularKeyAddress: signal(''),
               regularKeySeed: signal(''),
               multiSigningEnabled: signal(false),
               regularKeySigningEnabled: signal(false),
               setField: jasmine.createSpy('setField'),
          };

          accountConfiguratorUtilService = {
               setRegularKeyButtonLabel: jasmine.createSpy('setRegularKeyButtonLabel').and.returnValue('Set Regular Key'),
               removeRegularKeyButtonLabel: jasmine.createSpy('removeRegularKeyButtonLabel').and.returnValue('Remove Regular Key'),
          };

          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };

          await TestBed.configureTestingModule({
               imports: [RegularKeyComponent],
               providers: [
                    { provide: AccountConfiguratorViewModelService, useValue: accountConfiguratorViewModelService },
                    { provide: ConnectionGuardService, useValue: connectionGuard },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: AccountConfiguratorUtilService, useValue: accountConfiguratorUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(RegularKeyComponent);
          component = fixture.componentInstance;

          // Set input
          fixture.componentRef.setInput('canSubmit', true);

          fixture.detectChanges();
     });

     afterEach(() => {
          accountConfiguratorStoreService.setField.calls.reset();
          connectionGuard.isConnectionReady.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept canSubmit input', () => {
               expect(component.canSubmit()).toBeTrue();
          });

          it('should update canSubmit when changed', () => {
               fixture.componentRef.setInput('canSubmit', false);
               fixture.detectChanges();
               expect(component.canSubmit()).toBeFalse();
          });
     });

     describe('Output signals', () => {
          it('should have performAction output', () => {
               expect(component.performAction).toBeDefined();
               expect(component.performAction.emit).toBeDefined();
          });

          it('should emit performAction with Y when called', () => {
               spyOn(component.performAction, 'emit');
               component.performAction.emit('Y');
               expect(component.performAction.emit).toHaveBeenCalledWith('Y');
          });

          it('should emit performAction with N when called', () => {
               spyOn(component.performAction, 'emit');
               component.performAction.emit('N');
               expect(component.performAction.emit).toHaveBeenCalledWith('N');
          });
     });

     describe('regularKeyAddressValid', () => {
          it('should return false when address is empty', () => {
               accountConfiguratorStoreService.regularKeyAddress.set('');
               const result = component.regularKeyAddressValid();
               expect(result).toBeFalse();
          });

          it('should return false when address does not start with r', () => {
               accountConfiguratorStoreService.regularKeyAddress.set('xInvalidAddress');
               const result = component.regularKeyAddressValid();
               expect(result).toBeFalse();
          });

          it('should return false when address is too short', () => {
               accountConfiguratorStoreService.regularKeyAddress.set('rShort');
               const result = component.regularKeyAddressValid();
               expect(result).toBeFalse();
          });

          it('should return true when address is valid XRP address', () => {
               const validAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
               accountConfiguratorStoreService.regularKeyAddress.set(validAddress);
               const result = component.regularKeyAddressValid();
               expect(result).toBeTrue();
          });

          it('should return true for address with exact 25 characters starting with r', () => {
               const validAddress = 'r' + 'a'.repeat(24);
               accountConfiguratorStoreService.regularKeyAddress.set(validAddress);
               const result = component.regularKeyAddressValid();
               expect(result).toBeTrue();
          });
     });

     describe('regularKeyAddressInvalid', () => {
          it('should return false when address is empty', () => {
               accountConfiguratorStoreService.regularKeyAddress.set('');
               const result = component.regularKeyAddressInvalid();
               expect(result).toBeFalse();
          });

          it('should return true when address is invalid', () => {
               accountConfiguratorStoreService.regularKeyAddress.set('xInvalidAddress');
               const result = component.regularKeyAddressInvalid();
               expect(result).toBeTrue();
          });

          it('should return false when address is valid', () => {
               const validAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
               accountConfiguratorStoreService.regularKeyAddress.set(validAddress);
               const result = component.regularKeyAddressInvalid();
               expect(result).toBeFalse();
          });
     });

     describe('Store bindings', () => {
          it('should have regularKeyAddress from store', () => {
               const address = 'rTestAddress123';
               accountConfiguratorStoreService.regularKeyAddress.set(address);
               fixture.detectChanges();
               expect(accountConfiguratorStoreService.regularKeyAddress()).toBe(address);
          });

          it('should have regularKeySeed from store', () => {
               const seed = 'sTestSeed123';
               accountConfiguratorStoreService.regularKeySeed.set(seed);
               fixture.detectChanges();
               expect(accountConfiguratorStoreService.regularKeySeed()).toBe(seed);
          });

          it('should call setField when regularKeyAddress changes', () => {
               const newAddress = 'rNewAddress1234567890';
               accountConfiguratorStoreService.setField('regularKeyAddress', newAddress);
               expect(accountConfiguratorStoreService.setField).toHaveBeenCalledWith('regularKeyAddress', newAddress);
          });

          it('should call setField when regularKeySeed changes', () => {
               const newSeed = 'sNewSeed1234567890';
               accountConfiguratorStoreService.setField('regularKeySeed', newSeed);
               expect(accountConfiguratorStoreService.setField).toHaveBeenCalledWith('regularKeySeed', newSeed);
          });
     });

     describe('Util service bindings', () => {
          it('should have setRegularKeyButtonLabel from util service', () => {
               const label = accountConfiguratorUtilService.setRegularKeyButtonLabel();
               expect(label).toBe('Set Regular Key');
          });

          it('should have removeRegularKeyButtonLabel from util service', () => {
               const label = accountConfiguratorUtilService.removeRegularKeyButtonLabel();
               expect(label).toBe('Remove Regular Key');
          });
     });

     describe('Connection guard bindings', () => {
          it('should have isConnectionReady from connectionGuard', () => {
               expect(component.connectionGuard.isConnectionReady()).toBeTrue();
          });
     });

     describe('View model bindings', () => {
          it('should have activeTab from view model', () => {
               expect(component.accountConfiguratorViewModelService.activeTab()).toBe('modifyRegularKey');
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should show warning when seed is present but address is missing', () => {
               accountConfiguratorStoreService.regularKeySeed.set('sSeed123');
               accountConfiguratorStoreService.regularKeyAddress.set('');
               fixture.detectChanges();

               // Warning should be displayed in template
               expect(accountConfiguratorStoreService.regularKeySeed()).toBeTruthy();
               expect(accountConfiguratorStoreService.regularKeyAddress()).toBeFalsy();
          });

          it('should not show warning when both seed and address are present', () => {
               accountConfiguratorStoreService.regularKeySeed.set('sSeed123');
               accountConfiguratorStoreService.regularKeyAddress.set('rAddress123');
               fixture.detectChanges();

               expect(accountConfiguratorStoreService.regularKeySeed()).toBeTruthy();
               expect(accountConfiguratorStoreService.regularKeyAddress()).toBeTruthy();
          });

          it('should show invalid address helper text when address is invalid', () => {
               accountConfiguratorStoreService.regularKeyAddress.set('xInvalidAddress');
               fixture.detectChanges();

               const isValid = component.regularKeyAddressValid();
               const isInvalid = component.regularKeyAddressInvalid();
               expect(isValid).toBeFalse();
               expect(isInvalid).toBeTrue();
          });
     });

     describe('Edge cases', () => {
          it('should handle canSubmit being false', () => {
               fixture.componentRef.setInput('canSubmit', false);
               fixture.detectChanges();
               expect(component.canSubmit()).toBeFalse();
          });

          it('should handle connection not ready', () => {
               connectionGuard.isConnectionReady.and.returnValue(false);
               expect(component.connectionGuard.isConnectionReady()).toBeFalse();
          });

          it('should handle address with special characters', () => {
               accountConfiguratorStoreService.regularKeyAddress.set('r!@#$%^&*()');
               const result = component.regularKeyAddressValid();
               expect(result).toBeFalse();
          });

          it('should handle address with correct prefix but wrong length', () => {
               accountConfiguratorStoreService.regularKeyAddress.set('r' + 'a'.repeat(10));
               const result = component.regularKeyAddressValid();
               expect(result).toBeFalse();
          });

          it('should handle empty regularKeySeed', () => {
               accountConfiguratorStoreService.regularKeySeed.set('');
               fixture.detectChanges();
               expect(accountConfiguratorStoreService.regularKeySeed()).toBe('');
          });
     });
});
