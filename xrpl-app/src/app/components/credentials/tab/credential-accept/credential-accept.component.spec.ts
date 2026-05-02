import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CredentialAcceptComponent } from './credential-accept.component';
import { CredentialStore } from '../../../../services/credentials/credential-store/credential-store.service';
import { CredentialViewModelService } from '../../../../services/credentials/credential-view-model/credential-view-model.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';

describe('CredentialAcceptComponent', () => {
     let component: CredentialAcceptComponent;
     let fixture: ComponentFixture<CredentialAcceptComponent>;

     // Services
     let credentialStore: any;
     let credentialViewModel: any;
     let connectionGuardService: any;

     // Mock data
     const mockView = {
          selectedCredentialItem: { id: 'cred1', display: 'Credential 1' },
          destinationSearchQuery: signal(''),
          selectedDestinationAddress: signal(''),
     };

     const mockCreds = {
          dropdown: [
               { id: 'cred1', display: 'Credential 1' },
               { id: 'cred2', display: 'Credential 2' },
          ],
     };

     beforeEach(async () => {
          credentialStore = {
               setField: jasmine.createSpy('setField'),
               getField: jasmine.createSpy('getField'),
          };

          credentialViewModel = {
               activeTab: signal('acceptCredential'),
               infoData: signal({ walletName: 'Test', credentialCount: 5 }),
          };

          connectionGuardService = {
               isConnected: signal(true),
          };

          await TestBed.configureTestingModule({
               imports: [CredentialAcceptComponent],
               providers: [
                    { provide: CredentialStore, useValue: credentialStore },
                    { provide: CredentialViewModelService, useValue: credentialViewModel },
                    { provide: ConnectionGuardService, useValue: connectionGuardService },
               ],
          })
               .overrideComponent(CredentialAcceptComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(CredentialAcceptComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('view', mockView);
          fixture.componentRef.setInput('creds', mockCreds);
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

          it('should accept creds input', () => {
               expect(component.creds()).toEqual(mockCreds);
          });

          it('should accept canSubmit input', () => {
               expect(component.canSubmit()).toBeFalse();
          });

          it('should update view input when changed', () => {
               const newView = { selectedCredentialItem: { id: 'new' } };
               fixture.componentRef.setInput('view', newView);
               fixture.detectChanges();
               expect(component.view()).toEqual(newView);
          });

          it('should update creds input when changed', () => {
               const newCreds = { dropdown: [] };
               fixture.componentRef.setInput('creds', newCreds);
               fixture.detectChanges();
               expect(component.creds()).toEqual(newCreds);
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

          it('should have selectCredential output', () => {
               expect(component.selectCredential).toBeDefined();
               expect(component.selectCredential.emit).toBeDefined();
          });

          it('should emit selectCredential when called with dropdown source', () => {
               spyOn(component.selectCredential, 'emit');
               const mockCredential = { item: { id: 'cred1' }, source: 'dropdown' as const };
               component.selectCredential.emit(mockCredential);
               expect(component.selectCredential.emit).toHaveBeenCalledWith(mockCredential);
          });

          it('should emit selectCredential when called with list source', () => {
               spyOn(component.selectCredential, 'emit');
               const mockCredential = { item: { id: 'cred1' }, source: 'list' as const };
               component.selectCredential.emit(mockCredential);
               expect(component.selectCredential.emit).toHaveBeenCalledWith(mockCredential);
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

          it('should have credentialViewModel injected', () => {
               expect(component.credentialViewModel).toBe(credentialViewModel);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have view available for template', () => {
               expect(component.view()).toBeDefined();
               expect(component.view().selectedCredentialItem).toBeDefined();
          });

          it('should have creds available for template', () => {
               expect(component.creds()).toBeDefined();
               expect(component.creds().dropdown).toBeDefined();
               expect(component.creds().dropdown.length).toBe(2);
          });

          it('should have canSubmit available for template', () => {
               expect(component.canSubmit()).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle view input with missing properties', () => {
               const incompleteView = { selectedCredentialItem: null };
               fixture.componentRef.setInput('view', incompleteView);
               fixture.detectChanges();

               expect(component.view()).toEqual(incompleteView);
          });

          it('should handle creds input with empty dropdown', () => {
               const emptyCreds = { dropdown: [] };
               fixture.componentRef.setInput('creds', emptyCreds);
               fixture.detectChanges();

               expect(component.creds().dropdown).toEqual([]);
          });

          it('should handle creds input without dropdown property', () => {
               const credsWithoutDropdown = {};
               fixture.componentRef.setInput('creds', credsWithoutDropdown);
               fixture.detectChanges();

               expect(component.creds()).toEqual(credsWithoutDropdown);
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
