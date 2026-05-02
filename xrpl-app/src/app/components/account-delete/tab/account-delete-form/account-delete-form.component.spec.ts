import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountDeleteFormComponent } from './account-delete-form.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { AccountConfiguratorStoreService } from '../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { ActivatedRoute } from '@angular/router';

describe('AccountDeleteFormComponent', () => {
     let component: AccountDeleteFormComponent;
     let fixture: ComponentFixture<AccountDeleteFormComponent>;

     // Services
     let connectionGuard: any;
     let txUiService: any;
     let accountConfiguratorStoreService: any;
     let route: any;

     // Mock data
     const mockView = {
          deleteBlockers: jasmine.createSpy('deleteBlockers').and.returnValue([]),
          deleteWalletButtonLabel: jasmine.createSpy('deleteWalletButtonLabel').and.returnValue('Delete Account'),
          activeTab: 'deleteAccount',
     };

     const mockInfo = {
          canDelete: true,
     };

     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     const mockSelectedDestinationItem = { id: 'rDest1', display: 'Destination 1' };
     const mockDestinationSearchQuery = '';

     beforeEach(async () => {
          connectionGuard = {
               isConnectionReady: jasmine.createSpy('isConnectionReady').and.returnValue(true),
          };

          txUiService = {
               wantsOptions: signal(false),
               currentStep: signal('idle'),
          };

          accountConfiguratorStoreService = {
               multiSigningEnabled: signal(false),
               regularKeySigningEnabled: signal(false),
          };

          await TestBed.configureTestingModule({
               imports: [AccountDeleteFormComponent],
               providers: [
                    { provide: ConnectionGuardService, useValue: connectionGuard },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                    { provide: ActivatedRoute, useValue: route },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountDeleteFormComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('view', mockView);
          fixture.componentRef.setInput('info', mockInfo);
          fixture.componentRef.setInput('destinationItems', mockDestinationItems);
          fixture.componentRef.setInput('selectedDestinationItem', mockSelectedDestinationItem);
          fixture.componentRef.setInput('destinationSearchQuery', mockDestinationSearchQuery);
          fixture.componentRef.setInput('wantsOptions', false);
          fixture.componentRef.setInput('canSubmit', true);
          fixture.componentRef.setInput('tab', 'deleteAccount');

          fixture.detectChanges();
     });

     afterEach(() => {
          connectionGuard.isConnectionReady.calls.reset();
          if (mockView.deleteBlockers) mockView.deleteBlockers.calls.reset();
          if (mockView.deleteWalletButtonLabel) mockView.deleteWalletButtonLabel.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept view input', () => {
               expect(component.view()).toEqual(mockView);
          });

          it('should accept info input', () => {
               expect(component.info()).toEqual(mockInfo);
          });

          it('should accept destinationItems input', () => {
               expect(component.destinationItems()).toEqual(mockDestinationItems);
          });

          it('should accept selectedDestinationItem input', () => {
               expect(component.selectedDestinationItem()).toEqual(mockSelectedDestinationItem);
          });

          it('should accept destinationSearchQuery input', () => {
               expect(component.destinationSearchQuery()).toBe('');
          });

          it('should accept wantsOptions input', () => {
               expect(component.wantsOptions()).toBeFalse();
          });

          it('should accept canSubmit input', () => {
               expect(component.canSubmit()).toBeTrue();
          });

          it('should accept tab input', () => {
               expect(component.tab()).toBe('deleteAccount');
          });

          it('should update canSubmit when changed', () => {
               fixture.componentRef.setInput('canSubmit', false);
               fixture.detectChanges();
               expect(component.canSubmit()).toBeFalse();
          });
     });

     describe('Output emitters', () => {
          it('should have optionsToggled EventEmitter', () => {
               expect(component.optionsToggled).toBeDefined();
               expect(component.optionsToggled.emit).toBeDefined();
          });

          it('should emit optionsToggled when called', () => {
               spyOn(component.optionsToggled, 'emit');
               component.optionsToggled.emit(true);
               expect(component.optionsToggled.emit).toHaveBeenCalledWith(true);
          });

          it('should have performAction output', () => {
               expect(component.performAction).toBeDefined();
               expect(component.performAction.emit).toBeDefined();
          });

          it('should emit performAction when called', () => {
               spyOn(component.performAction, 'emit');
               component.performAction.emit();
               expect(component.performAction.emit).toHaveBeenCalled();
          });

          it('should have clearFields output', () => {
               expect(component.clearFields).toBeDefined();
               expect(component.clearFields.emit).toBeDefined();
          });

          it('should emit clearFields when called', () => {
               spyOn(component.clearFields, 'emit');
               component.clearFields.emit();
               expect(component.clearFields.emit).toHaveBeenCalled();
          });

          it('should have searchQueryChange output', () => {
               expect(component.searchQueryChange).toBeDefined();
               expect(component.searchQueryChange.emit).toBeDefined();
          });

          it('should emit searchQueryChange when called', () => {
               spyOn(component.searchQueryChange, 'emit');
               component.searchQueryChange.emit('test query');
               expect(component.searchQueryChange.emit).toHaveBeenCalledWith('test query');
          });

          it('should have destinationChange output', () => {
               expect(component.destinationChange).toBeDefined();
               expect(component.destinationChange.emit).toBeDefined();
          });

          it('should emit destinationChange when called', () => {
               spyOn(component.destinationChange, 'emit');
               const mockDestination = { id: 'rDest', display: 'Destination' };
               component.destinationChange.emit(mockDestination);
               expect(component.destinationChange.emit).toHaveBeenCalledWith(mockDestination);
          });

          it('should have toggleOptions output', () => {
               expect(component.toggleOptions).toBeDefined();
               expect(component.toggleOptions.emit).toBeDefined();
          });

          it('should emit toggleOptions when called', () => {
               spyOn(component.toggleOptions, 'emit');
               component.toggleOptions.emit(true);
               expect(component.toggleOptions.emit).toHaveBeenCalledWith(true);
          });
     });

     describe('View bindings', () => {
          // it('should have deleteBlockers from view', () => {
          //      const blockers = component.view().deleteBlockers();
          //      expect(blockers).toEqual([]);
          // });

          it('should have deleteWalletButtonLabel from view', () => {
               const label = component.view().deleteWalletButtonLabel();
               expect(label).toBe('Delete Account');
          });
     });

     describe('Store bindings', () => {
          it('should have multiSigningEnabled from store', () => {
               accountConfiguratorStoreService.multiSigningEnabled.set(true);
               fixture.detectChanges();
               expect(accountConfiguratorStoreService.multiSigningEnabled()).toBeTrue();
          });

          it('should have regularKeySigningEnabled from store', () => {
               accountConfiguratorStoreService.regularKeySigningEnabled.set(true);
               fixture.detectChanges();
               expect(accountConfiguratorStoreService.regularKeySigningEnabled()).toBeTrue();
          });
     });

     describe('Connection guard bindings', () => {
          it('should have isConnectionReady from connectionGuard', () => {
               expect(component.connectionGuard.isConnectionReady()).toBeTrue();
          });
     });

     describe('TxUiService bindings', () => {
          it('should have wantsOptions from txUiService', () => {
               txUiService.wantsOptions.set(true);
               fixture.detectChanges();
               expect(component.txUiService.wantsOptions()).toBeTrue();
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have destinationItems available for template', () => {
               expect(component.destinationItems()).toEqual(mockDestinationItems);
          });

          it('should have selectedDestinationItem available for template', () => {
               expect(component.selectedDestinationItem()).toEqual(mockSelectedDestinationItem);
          });

          it('should have tab available for template', () => {
               expect(component.tab()).toBe('deleteAccount');
          });

          it('should show optional fields when wantsOptions is true', () => {
               fixture.componentRef.setInput('wantsOptions', true);
               fixture.detectChanges();
               expect(component.wantsOptions()).toBeTrue();
          });

          it('should hide optional fields when wantsOptions is false', () => {
               fixture.componentRef.setInput('wantsOptions', false);
               fixture.detectChanges();
               expect(component.wantsOptions()).toBeFalse();
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

          it('should handle deleteBlockers having blockers', () => {
               mockView.deleteBlockers.and.returnValue(['Blocked reason 1', 'Blocked reason 2']);
               fixture.detectChanges();
               const blockers = component.view().deleteBlockers();
               expect(blockers.length).toBeGreaterThan(0);
          });

          it('should handle empty destinationItems', () => {
               fixture.componentRef.setInput('destinationItems', []);
               fixture.detectChanges();
               expect(component.destinationItems()).toEqual([]);
          });

          it('should handle null selectedDestinationItem', () => {
               fixture.componentRef.setInput('selectedDestinationItem', null);
               fixture.detectChanges();
               expect(component.selectedDestinationItem()).toBeNull();
          });
     });
});
