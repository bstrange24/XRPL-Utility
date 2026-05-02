import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CredentialCreateComponent } from './credential-create.component';
import { CredentialStore } from '../../../../services/credentials/credential-store/credential-store.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('CredentialCreateComponent', () => {
     let component: CredentialCreateComponent;
     let fixture: ComponentFixture<CredentialCreateComponent>;

     // Services
     let credentialStore: any;
     let credentialUtilService: any;
     let connectionGuardService: any;
     let txUiService: any;

     // Mock data
     const mockView = {
          actionButtonClass: 'btn-primary',
          actionButtonLabel: 'Create Credential',
     };

     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     const mockSelectedDestinationItem = { id: 'rDest1', display: 'Destination 1' };
     const mockDestinationSearchQuery = '';

     beforeEach(async () => {
          credentialStore = {
               setField: jasmine.createSpy('setField'),
               getField: jasmine.createSpy('getField'),
          };

          credentialUtilService = {
               validateCredential: jasmine.createSpy('validateCredential'),
          };

          connectionGuardService = {
               isConnected: signal(true),
          };

          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org/'),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
          };

          await TestBed.configureTestingModule({
               imports: [CredentialCreateComponent],
               providers: [
                    { provide: CredentialStore, useValue: credentialStore },
                    { provide: CredentialUtilService, useValue: credentialUtilService },
                    { provide: ConnectionGuardService, useValue: connectionGuardService },
                    { provide: TransactionUiService, useValue: txUiService },
               ],
          })
               .overrideComponent(CredentialCreateComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(CredentialCreateComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('view', mockView);
          fixture.componentRef.setInput('destinationItems', mockDestinationItems);
          fixture.componentRef.setInput('selectedDestinationItem', mockSelectedDestinationItem);
          fixture.componentRef.setInput('destinationSearchQuery', mockDestinationSearchQuery);
          fixture.componentRef.setInput('canSubmit', false);

          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset any spies if needed
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept view input', () => {
               expect(component.view()).toEqual(mockView);
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

          it('should accept canSubmit input defaulting to false', () => {
               expect(component.canSubmit()).toBeFalse();
          });

          it('should update view input when changed', () => {
               const newView = { actionButtonLabel: 'New Label' };
               fixture.componentRef.setInput('view', newView);
               fixture.detectChanges();
               expect(component.view()).toEqual(newView);
          });

          it('should update destinationItems input when changed', () => {
               const newItems = [{ id: 'new', display: 'New' }];
               fixture.componentRef.setInput('destinationItems', newItems);
               fixture.detectChanges();
               expect(component.destinationItems()).toEqual(newItems);
          });

          it('should update selectedDestinationItem input when changed', () => {
               const newSelected = { id: 'new', display: 'New Selected' };
               fixture.componentRef.setInput('selectedDestinationItem', newSelected);
               fixture.detectChanges();
               expect(component.selectedDestinationItem()).toEqual(newSelected);
          });

          it('should update destinationSearchQuery input when changed', () => {
               fixture.componentRef.setInput('destinationSearchQuery', 'new search');
               fixture.detectChanges();
               expect(component.destinationSearchQuery()).toBe('new search');
          });

          it('should update canSubmit input when changed', () => {
               fixture.componentRef.setInput('canSubmit', true);
               fixture.detectChanges();
               expect(component.canSubmit()).toBeTrue();
          });
     });

     describe('Output signals', () => {
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

          it('should have optionsToggled output', () => {
               expect(component.optionsToggled).toBeDefined();
               expect(component.optionsToggled.emit).toBeDefined();
          });

          it('should emit optionsToggled when called', () => {
               spyOn(component.optionsToggled, 'emit');
               component.optionsToggled.emit(true);
               expect(component.optionsToggled.emit).toHaveBeenCalledWith(true);
          });
     });

     describe('EventEmitters', () => {
          it('should have currencySelected EventEmitter', () => {
               expect(component.currencySelected).toBeDefined();
               expect(component.currencySelected.emit).toBeDefined();
          });

          it('should emit currencySelected when called', () => {
               spyOn(component.currencySelected, 'emit');
               const mockCurrency = { id: 'USD', display: 'USD' } as SelectItem;
               component.currencySelected.emit(mockCurrency);
               expect(component.currencySelected.emit).toHaveBeenCalledWith(mockCurrency);
          });

          it('should emit currencySelected with null', () => {
               spyOn(component.currencySelected, 'emit');
               component.currencySelected.emit(null);
               expect(component.currencySelected.emit).toHaveBeenCalledWith(null);
          });

          it('should have issuerSelected EventEmitter', () => {
               expect(component.issuerSelected).toBeDefined();
               expect(component.issuerSelected.emit).toBeDefined();
          });

          it('should emit issuerSelected when called', () => {
               spyOn(component.issuerSelected, 'emit');
               const mockIssuer = { id: 'rIssuer', display: 'Issuer' } as SelectItem;
               component.issuerSelected.emit(mockIssuer);
               expect(component.issuerSelected.emit).toHaveBeenCalledWith(mockIssuer);
          });

          it('should emit issuerSelected with null', () => {
               spyOn(component.issuerSelected, 'emit');
               component.issuerSelected.emit(null);
               expect(component.issuerSelected.emit).toHaveBeenCalledWith(null);
          });
     });

     describe('handleSearchQueryChange', () => {
          it('should emit searchQueryChange with the query', () => {
               spyOn(component.searchQueryChange, 'emit');
               const query = 'test search';

               component.handleSearchQueryChange(query);

               expect(component.searchQueryChange.emit).toHaveBeenCalledWith(query);
          });

          it('should handle empty string', () => {
               spyOn(component.searchQueryChange, 'emit');

               component.handleSearchQueryChange('');

               expect(component.searchQueryChange.emit).toHaveBeenCalledWith('');
          });

          it('should handle long query strings', () => {
               spyOn(component.searchQueryChange, 'emit');
               const longQuery = 'a'.repeat(1000);

               component.handleSearchQueryChange(longQuery);

               expect(component.searchQueryChange.emit).toHaveBeenCalledWith(longQuery);
          });
     });

     describe('handleDestinationChange', () => {
          it('should emit destinationChange with the item', () => {
               spyOn(component.destinationChange, 'emit');
               const mockItem = { id: 'rDest123', display: 'Destination' };

               component.handleDestinationChange(mockItem);

               expect(component.destinationChange.emit).toHaveBeenCalledWith(mockItem);
          });

          it('should handle null item', () => {
               spyOn(component.destinationChange, 'emit');

               component.handleDestinationChange(null);

               expect(component.destinationChange.emit).toHaveBeenCalledWith(null);
          });

          it('should handle undefined item', () => {
               spyOn(component.destinationChange, 'emit');

               component.handleDestinationChange(undefined);

               expect(component.destinationChange.emit).toHaveBeenCalledWith(undefined);
          });
     });

     describe('Service injections', () => {
          it('should have connectionGuardService injected', () => {
               expect(component.connectionGuard).toBe(connectionGuardService);
          });

          it('should have credentialStore injected', () => {
               expect(component.credentialStore).toBe(credentialStore);
          });

          it('should have credentialUtilService injected', () => {
               expect(component.credentialUtilService).toBe(credentialUtilService);
          });

          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiService);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have view available for template', () => {
               expect(component.view()).toBeDefined();
               expect(component.view().actionButtonLabel).toBe('Create Credential');
          });

          it('should have destinationItems available for template', () => {
               expect(component.destinationItems()).toBeDefined();
               expect(component.destinationItems().length).toBe(2);
          });

          it('should have selectedDestinationItem available for template', () => {
               expect(component.selectedDestinationItem()).toBeDefined();
          });

          it('should have destinationSearchQuery available for template', () => {
               expect(component.destinationSearchQuery()).toBeDefined();
          });

          it('should have canSubmit available for template', () => {
               expect(component.canSubmit()).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle view input with missing properties', () => {
               const incompleteView = {};
               fixture.componentRef.setInput('view', incompleteView);
               fixture.detectChanges();

               expect(component.view()).toEqual(incompleteView);
          });

          it('should handle destinationItems as empty array', () => {
               fixture.componentRef.setInput('destinationItems', []);
               fixture.detectChanges();

               expect(component.destinationItems()).toEqual([]);
          });

          it('should handle selectedDestinationItem as null', () => {
               fixture.componentRef.setInput('selectedDestinationItem', null);
               fixture.detectChanges();

               expect(component.selectedDestinationItem()).toBeNull();
          });

          it('should handle rapid output emissions', () => {
               const searchSpy = spyOn(component.searchQueryChange, 'emit');
               const destSpy = spyOn(component.destinationChange, 'emit');

               for (let i = 0; i < 10; i++) {
                    component.handleSearchQueryChange(`query${i}`);
                    component.handleDestinationChange({ id: `dest${i}` });
               }

               expect(searchSpy).toHaveBeenCalledTimes(10);
               expect(destSpy).toHaveBeenCalledTimes(10);
          });
     });
});
