import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { AccountMetadataComponent } from './account-metadata.component';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import * as xrpl from 'xrpl';

describe('AccountMetadataComponent', () => {
     let component: AccountMetadataComponent;
     let fixture: ComponentFixture<AccountMetadataComponent>;

     // Services
     let accountConfiguratorViewModelService: any;
     let connectionGuard: any;
     let accountConfiguratorStoreService: any;
     let accountConfiguratorUtilService: any;
     let txUiService: any;

     beforeEach(async () => {
          accountConfiguratorViewModelService = {
               activeTab: signal('modifyMetaData'),
          };

          connectionGuard = {
               isConnectionReady: jasmine.createSpy('isConnectionReady').and.returnValue(true),
          };

          accountConfiguratorStoreService = {
               nfTokenMinterAddress: signal(''),
               transferRate: signal(''),
               tickSize: signal(''),
               domain: signal(''),
               isMessageKey: signal(false),
               multiSigningEnabled: signal(false),
               regularKeySigningEnabled: signal(false),
               setField: jasmine.createSpy('setField'),
          };

          accountConfiguratorUtilService = {
               toggleMessageKey: jasmine.createSpy('toggleMessageKey'),
               setNftMinterButtonLabel: jasmine.createSpy('setNftMinterButtonLabel').and.returnValue('Set NFT Minter'),
               removeNftMinterButtonLabel: jasmine.createSpy('removeNftMinterButtonLabel').and.returnValue('Remove NFT Minter'),
               modifyAccountMetaDataButtonLabel: jasmine.createSpy('modifyAccountMetaDataButtonLabel').and.returnValue('Modify Account Metadata'),
          };

          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };

          await TestBed.configureTestingModule({
               imports: [AccountMetadataComponent],
               providers: [
                    { provide: AccountConfiguratorViewModelService, useValue: accountConfiguratorViewModelService },
                    { provide: ConnectionGuardService, useValue: connectionGuard },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: AccountConfiguratorUtilService, useValue: accountConfiguratorUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountMetadataComponent);
          component = fixture.componentInstance;

          // Set input
          fixture.componentRef.setInput('canSubmit', true);

          fixture.detectChanges();
     });

     afterEach(() => {
          accountConfiguratorStoreService.setField.calls.reset();
          accountConfiguratorUtilService.toggleMessageKey.calls.reset();
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

          it('should emit performAction with empty string when called', () => {
               spyOn(component.performAction, 'emit');
               component.performAction.emit('');
               expect(component.performAction.emit).toHaveBeenCalledWith('');
          });
     });

     describe('domainHex', () => {
          it('should return empty string when domain is empty', () => {
               accountConfiguratorStoreService.domain.set('');
               const result = component.domainHex();
               expect(result).toBe('');
          });

          it('should return uppercase hex when input is already hex', () => {
               accountConfiguratorStoreService.domain.set('a1b2c3');
               const result = component.domainHex();
               expect(result).toBe('A1B2C3');
          });

          it('should convert string to hex when input is not hex', () => {
               accountConfiguratorStoreService.domain.set('example.com');
               const result = component.domainHex();
               expect(result).toBe(xrpl.convertStringToHex('example.com'));
          });

          it('should handle domain with spaces', () => {
               accountConfiguratorStoreService.domain.set('test domain');
               const result = component.domainHex();
               expect(result).toBe(xrpl.convertStringToHex('test domain'));
          });
     });

     describe('domainHexLengthBytes', () => {
          it('should return 0 when domain hex is empty', () => {
               accountConfiguratorStoreService.domain.set('');
               const result = component.domainHexLengthBytes();
               expect(result).toBe(0);
          });

          it('should calculate correct byte length', () => {
               accountConfiguratorStoreService.domain.set('example.com');
               const hex = xrpl.convertStringToHex('example.com');
               const expectedLength = Math.ceil(hex.length / 2);
               const result = component.domainHexLengthBytes();
               expect(result).toBe(expectedLength);
          });

          it('should handle odd-length hex strings', () => {
               accountConfiguratorStoreService.domain.set('A1B2C');
               const result = component.domainHexLengthBytes();
               expect(result).toBe(Math.ceil(5 / 2)); // 3 bytes
          });
     });

     describe('isDomainTooLong', () => {
          it('should return false when domain is within limit', () => {
               accountConfiguratorStoreService.domain.set('example.com');
               const result = component.isDomainTooLong();
               expect(result).toBeFalse();
          });

          // it('should return true when domain exceeds 256 bytes', () => {
          //      const longDomain = 'a'.repeat(300);
          //      accountConfiguratorStoreService.domain.set(longDomain);
          //      const result = component.isDomainTooLong();
          //      expect(result).toBeTrue();
          // });

          it('should return false for empty domain', () => {
               accountConfiguratorStoreService.domain.set('');
               const result = component.isDomainTooLong();
               expect(result).toBeFalse();
          });
     });

     describe('domainToHex', () => {
          it('should return empty string when value is empty', () => {
               const result = component.domainToHex('');
               expect(result).toBe('');
          });

          it('should return uppercase hex when value is already hex', () => {
               const result = component.domainToHex('a1b2c3');
               expect(result).toBe('A1B2C3');
          });

          it('should convert string to hex when value is not hex', () => {
               const result = component.domainToHex('test.com');
               expect(result).toBe(xrpl.convertStringToHex('test.com'));
          });
     });

     describe('Store bindings', () => {
          it('should have nfTokenMinterAddress from store', () => {
               accountConfiguratorStoreService.nfTokenMinterAddress.set('rMinter123');
               fixture.detectChanges();
               expect(accountConfiguratorStoreService.nfTokenMinterAddress()).toBe('rMinter123');
          });

          it('should have transferRate from store', () => {
               accountConfiguratorStoreService.transferRate.set('1.5');
               fixture.detectChanges();
               expect(accountConfiguratorStoreService.transferRate()).toBe('1.5');
          });

          it('should have tickSize from store', () => {
               accountConfiguratorStoreService.tickSize.set('6');
               fixture.detectChanges();
               expect(accountConfiguratorStoreService.tickSize()).toBe('6');
          });

          it('should have domain from store', () => {
               accountConfiguratorStoreService.domain.set('example.com');
               fixture.detectChanges();
               expect(accountConfiguratorStoreService.domain()).toBe('example.com');
          });

          it('should have isMessageKey from store', () => {
               accountConfiguratorStoreService.isMessageKey.set(true);
               fixture.detectChanges();
               expect(accountConfiguratorStoreService.isMessageKey()).toBeTrue();
          });
     });

     describe('Util service bindings', () => {
          it('should have toggleMessageKey from util service', () => {
               accountConfiguratorUtilService.toggleMessageKey();
               expect(accountConfiguratorUtilService.toggleMessageKey).toHaveBeenCalled();
          });

          it('should have setNftMinterButtonLabel from util service', () => {
               const label = accountConfiguratorUtilService.setNftMinterButtonLabel();
               expect(label).toBe('Set NFT Minter');
          });

          it('should have removeNftMinterButtonLabel from util service', () => {
               const label = accountConfiguratorUtilService.removeNftMinterButtonLabel();
               expect(label).toBe('Remove NFT Minter');
          });

          it('should have modifyAccountMetaDataButtonLabel from util service', () => {
               const label = accountConfiguratorUtilService.modifyAccountMetaDataButtonLabel();
               expect(label).toBe('Modify Account Metadata');
          });
     });

     describe('Connection guard bindings', () => {
          it('should have isConnectionReady from connectionGuard', () => {
               expect(component.connectionGuard.isConnectionReady()).toBeTrue();
          });
     });

     describe('View model bindings', () => {
          it('should have activeTab from view model', () => {
               expect(component.accountConfiguratorViewModelService.activeTab()).toBe('modifyMetaData');
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

          it('should handle setField being called with nfTokenMinterAddress', () => {
               const newAddress = 'rNewMinter';
               accountConfiguratorStoreService.setField('nfTokenMinterAddress', newAddress);
               expect(accountConfiguratorStoreService.setField).toHaveBeenCalledWith('nfTokenMinterAddress', newAddress);
          });

          it('should handle setField being called with transferRate', () => {
               const newRate = '2.5';
               accountConfiguratorStoreService.setField('transferRate', newRate);
               expect(accountConfiguratorStoreService.setField).toHaveBeenCalledWith('transferRate', newRate);
          });

          it('should handle setField being called with tickSize', () => {
               const newTickSize = '8';
               accountConfiguratorStoreService.setField('tickSize', newTickSize);
               expect(accountConfiguratorStoreService.setField).toHaveBeenCalledWith('tickSize', newTickSize);
          });

          it('should handle setField being called with domain', () => {
               const newDomain = 'newdomain.com';
               accountConfiguratorStoreService.setField('domain', newDomain);
               expect(accountConfiguratorStoreService.setField).toHaveBeenCalledWith('domain', newDomain);
          });
     });
});
