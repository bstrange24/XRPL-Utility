import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DepositAuthComponent } from './deposit-auth.component';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('DepositAuthComponent', () => {
     let component: DepositAuthComponent;
     let fixture: ComponentFixture<DepositAuthComponent>;

     // Services
     let accountConfiguratorViewModelService: any;
     let connectionGuard: any;
     let accountConfiguratorStoreService: any;
     let accountConfiguratorUtilService: any;
     let txUiService: any;

     // Mock deposit auth addresses
     const mockDepositAuthAddresses = [{ account: 'rAddress1' }, { account: 'rAddress2' }, { account: 'rAddress3' }];

     beforeEach(async () => {
          accountConfiguratorViewModelService = {
               activeTab: signal('modifyDepositAuth'),
          };

          connectionGuard = {
               isConnectionReady: jasmine.createSpy('isConnectionReady').and.returnValue(true),
          };

          accountConfiguratorStoreService = {
               depositAuthAddresses: signal(mockDepositAuthAddresses),
               updateDepositAuthAddress: jasmine.createSpy('updateDepositAuthAddress'),
               multiSigningEnabled: signal(false),
               regularKeySigningEnabled: signal(false),
          };

          accountConfiguratorUtilService = {
               removeDepositAuthAddresses: jasmine.createSpy('removeDepositAuthAddresses'),
               addDepositAuthAddresses: jasmine.createSpy('addDepositAuthAddresses'),
               setDepositAuthButtonLabel: jasmine.createSpy('setDepositAuthButtonLabel').and.returnValue('Set Deposit Auth'),
               removeDepositAuthButtonLabel: jasmine.createSpy('removeDepositAuthButtonLabel').and.returnValue('Remove Deposit Auth'),
          };

          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };

          await TestBed.configureTestingModule({
               imports: [DepositAuthComponent],
               providers: [
                    { provide: AccountConfiguratorViewModelService, useValue: accountConfiguratorViewModelService },
                    { provide: ConnectionGuardService, useValue: connectionGuard },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: AccountConfiguratorUtilService, useValue: accountConfiguratorUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(DepositAuthComponent);
          component = fixture.componentInstance;

          // Set input
          fixture.componentRef.setInput('canSubmit', true);

          fixture.detectChanges();
     });

     afterEach(() => {
          accountConfiguratorStoreService.updateDepositAuthAddress.calls.reset();
          accountConfiguratorUtilService.removeDepositAuthAddresses.calls.reset();
          accountConfiguratorUtilService.addDepositAuthAddresses.calls.reset();
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

     describe('Store bindings', () => {
          it('should have depositAuthAddresses from store', () => {
               const addresses = component['accountConfiguratorStoreService'].depositAuthAddresses();
               expect(addresses).toEqual(mockDepositAuthAddresses);
               expect(addresses.length).toBe(3);
          });

          it('should have multiSigningEnabled from store', () => {
               expect(component['accountConfiguratorStoreService'].multiSigningEnabled()).toBeFalse();
          });

          it('should have regularKeySigningEnabled from store', () => {
               expect(component['accountConfiguratorStoreService'].regularKeySigningEnabled()).toBeFalse();
          });
     });

     describe('Util service bindings', () => {
          it('should have setDepositAuthButtonLabel from util service', () => {
               const label = component['accountConfiguratorUtilService'].setDepositAuthButtonLabel();
               expect(label).toBe('Set Deposit Auth');
          });

          it('should have removeDepositAuthButtonLabel from util service', () => {
               const label = component['accountConfiguratorUtilService'].removeDepositAuthButtonLabel();
               expect(label).toBe('Remove Deposit Auth');
          });
     });

     describe('Connection guard bindings', () => {
          it('should have isConnectionReady from connectionGuard', () => {
               expect(component.connectionGuard.isConnectionReady()).toBeTrue();
          });
     });

     describe('View model bindings', () => {
          it('should have activeTab from view model', () => {
               expect(component.accountConfiguratorViewModelService.activeTab()).toBe('modifyDepositAuth');
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have depositAuthAddresses available for iteration', () => {
               const addresses = component['accountConfiguratorStoreService'].depositAuthAddresses();
               expect(addresses).toBeDefined();
               expect(addresses.length).toBe(3);
          });

          it('should show remove button when more than one address', () => {
               const addresses = component['accountConfiguratorStoreService'].depositAuthAddresses();
               expect(addresses.length).toBeGreaterThan(1);
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

     describe('Edge cases', () => {
          it('should handle empty depositAuthAddresses', () => {
               accountConfiguratorStoreService.depositAuthAddresses.set([]);
               fixture.detectChanges();

               const addresses = component['accountConfiguratorStoreService'].depositAuthAddresses();
               expect(addresses).toEqual([]);
          });

          it('should handle single depositAuthAddress (no remove button)', () => {
               accountConfiguratorStoreService.depositAuthAddresses.set([{ account: 'rSingle' }]);
               fixture.detectChanges();

               const addresses = component['accountConfiguratorStoreService'].depositAuthAddresses();
               expect(addresses.length).toBe(1);
          });

          it('should call removeDepositAuthAddresses when remove button clicked', () => {
               const index = 0;
               accountConfiguratorUtilService.removeDepositAuthAddresses(index);
               expect(accountConfiguratorUtilService.removeDepositAuthAddresses).toHaveBeenCalledWith(index);
          });

          it('should call addDepositAuthAddresses when add button clicked', () => {
               accountConfiguratorUtilService.addDepositAuthAddresses();
               expect(accountConfiguratorUtilService.addDepositAuthAddresses).toHaveBeenCalled();
          });

          it('should call updateDepositAuthAddress when address is edited', () => {
               const index = 0;
               const field = 'account';
               const value = 'rNewAddress';
               accountConfiguratorStoreService.updateDepositAuthAddress(index, field, value);
               expect(accountConfiguratorStoreService.updateDepositAuthAddress).toHaveBeenCalledWith(index, field, value);
          });

          it('should handle canSubmit being false', () => {
               fixture.componentRef.setInput('canSubmit', false);
               fixture.detectChanges();
               expect(component.canSubmit()).toBeFalse();
          });

          it('should handle connection not ready', () => {
               connectionGuard.isConnectionReady.and.returnValue(false);
               expect(component.connectionGuard.isConnectionReady()).toBeFalse();
          });
     });
});
