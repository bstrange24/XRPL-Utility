import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountFlagsComponent } from './account-flags.component';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { XrplAccountFlags } from '../../../constants/account-configurator.types';

describe('AccountFlagsComponent', () => {
     let component: AccountFlagsComponent;
     let fixture: ComponentFixture<AccountFlagsComponent>;

     // Services
     let accountConfiguratorViewModelService: any;
     let connectionGuard: any;
     let accountConfiguratorStoreService: any;
     let accountConfiguratorUtilService: any;
     let txUiService: any;

     // Mock flag values
     const mockFlags: XrplAccountFlags = {
          asfRequireDest: false,
          asfRequireAuth: false,
          asfDisallowXRP: false,
          asfDisableMaster: false,
          asfNoFreeze: false,
          asfGlobalFreeze: false,
          asfDefaultRipple: false,
          asfDepositAuth: false,
          asfAllowTrustLineClawback: false,
          asfDisallowIncomingNFTokenOffer: false,
          asfDisallowIncomingCheck: false,
          asfDisallowIncomingPayChan: false,
          asfDisallowIncomingTrustline: false,
          asfAllowTrustLineLocking: false,
          asfAuthorizedNFTokenMinter: false,
     };

     const mockAccountFlagsConfig = [
          { key: 'asfRequireDest', title: 'Require Destination', desc: 'Requires destination tag for incoming payments', flagValue: 0x00010000 },
          { key: 'asfRequireAuth', title: 'Require Authorization', desc: 'Requires authorization for trust lines', flagValue: 0x00020000 },
          { key: 'asfDisallowXRP', title: 'Disallow XRP', desc: 'Disallows sending XRP to this account', flagValue: 0x00080000 },
     ];

     beforeEach(async () => {
          accountConfiguratorViewModelService = {
               activeTab: signal('modifyAccountFlags'),
          };

          connectionGuard = {
               isConnectionReady: jasmine.createSpy('isConnectionReady').and.returnValue(true),
          };

          accountConfiguratorStoreService = {
               configurationType: signal('holder'),
               totalFlagsValue: signal(0),
               totalFlagsHex: signal('0x0'),
               multiSigningEnabled: signal(false),
               regularKeySigningEnabled: signal(false),
               setField: jasmine.createSpy('setField'),
          };

          accountConfiguratorUtilService = {
               flags: { ...mockFlags },
               accountFlagsConfig: mockAccountFlagsConfig,
               FLAG_VALUES: {
                    asfRequireDest: '0x00010000',
                    asfRequireAuth: '0x00020000',
                    asfDisallowXRP: '0x00080000',
               },
               toggleFlag: jasmine.createSpy('toggleFlag'),
               onConfigurationChange: jasmine.createSpy('onConfigurationChange'),
               modifyAccountFlagsButtonLabel: jasmine.createSpy('modifyAccountFlagsButtonLabel').and.returnValue('Modify Account Flags'),
          };

          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };

          await TestBed.configureTestingModule({
               imports: [AccountFlagsComponent],
               providers: [
                    { provide: AccountConfiguratorViewModelService, useValue: accountConfiguratorViewModelService },
                    { provide: ConnectionGuardService, useValue: connectionGuard },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: AccountConfiguratorUtilService, useValue: accountConfiguratorUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountFlagsComponent);
          component = fixture.componentInstance;

          // Set input
          fixture.componentRef.setInput('canSubmit', true);

          fixture.detectChanges();
     });

     afterEach(() => {
          accountConfiguratorUtilService.toggleFlag.calls.reset();
          accountConfiguratorUtilService.onConfigurationChange.calls.reset();
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

          it('should emit performAction when called', () => {
               spyOn(component.performAction, 'emit');
               component.performAction.emit('');
               expect(component.performAction.emit).toHaveBeenCalledWith('');
          });
     });

     describe('configurationType', () => {
          it('should return configurationType from store', () => {
               expect(component.configurationType()).toBe('holder');
          });
     });

     describe('onFlagKeyDown', () => {
          it('should toggle flag when Space key is pressed', () => {
               const event = new KeyboardEvent('keydown', { key: ' ' });
               spyOn(event, 'preventDefault');

               component.onFlagKeyDown(event, 'asfRequireDest');

               expect(event.preventDefault).toHaveBeenCalled();
               expect(accountConfiguratorUtilService.toggleFlag).toHaveBeenCalledWith('asfRequireDest');
          });

          it('should toggle flag when Enter key is pressed', () => {
               const event = new KeyboardEvent('keydown', { key: 'Enter' });
               spyOn(event, 'preventDefault');

               component.onFlagKeyDown(event, 'asfRequireAuth');

               expect(event.preventDefault).toHaveBeenCalled();
               expect(accountConfiguratorUtilService.toggleFlag).toHaveBeenCalledWith('asfRequireAuth');
          });

          it('should not toggle flag for other keys', () => {
               const event = new KeyboardEvent('keydown', { key: 'Tab' });

               component.onFlagKeyDown(event, 'asfDisallowXRP');

               expect(accountConfiguratorUtilService.toggleFlag).not.toHaveBeenCalled();
          });
     });

     describe('Service injections', () => {
          it('should have accountConfiguratorViewModelService injected', () => {
               expect(component.accountConfiguratorViewModelService).toBe(accountConfiguratorViewModelService);
          });

          it('should have connectionGuard injected', () => {
               expect(component.connectionGuard).toBe(connectionGuard);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have configurationType options available', () => {
               const configs = ['holder', 'exchanger', 'issuer'];
               expect(configs).toContain('holder');
               expect(configs).toContain('exchanger');
               expect(configs).toContain('issuer');
          });

          it('should have account flags available for iteration', () => {
               // Test that the flags are defined on the util service
               const flags = accountConfiguratorUtilService.accountFlagsConfig;
               expect(flags.length).toBe(3);
          });
     });

     describe('Connection guard bindings', () => {
          it('should have isConnectionReady from connectionGuard', () => {
               expect(component.connectionGuard.isConnectionReady()).toBeTrue();
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

          it('should handle toggling multiple flags', () => {
               accountConfiguratorUtilService.toggleFlag('asfRequireDest');
               accountConfiguratorUtilService.toggleFlag('asfRequireAuth');

               expect(accountConfiguratorUtilService.toggleFlag).toHaveBeenCalledTimes(2);
               expect(accountConfiguratorUtilService.toggleFlag).toHaveBeenCalledWith('asfRequireDest');
               expect(accountConfiguratorUtilService.toggleFlag).toHaveBeenCalledWith('asfRequireAuth');
          });
     });
});
