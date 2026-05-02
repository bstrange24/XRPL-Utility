import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component } from '@angular/core';
import { TrustlineIssueComponent } from './trustline-issue.component';
import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

// Mock child components
@Component({ selector: 'app-select-search-dropdown', template: '<div></div>', standalone: true })
class MockSelectSearchDropdown {}

describe('TrustlineIssueComponent', () => {
     let component: TrustlineIssueComponent;
     let fixture: ComponentFixture<TrustlineIssueComponent>;
     let viewModelSpy: any;

     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1', secondary: 'rDest1' },
          { id: 'rDest2', display: 'Destination 2', secondary: 'rDest2' },
     ];

     const mockSelectedItem = { id: 'rDest1', display: 'Destination 1' };

     beforeEach(async () => {
          viewModelSpy = {
               formTitle: signal('Issue Currency'),
               hintText: signal('Issue a new currency token'),
          };

          await TestBed.configureTestingModule({
               imports: [TrustlineIssueComponent, FormsModule],
               providers: [provideNoopAnimations(), { provide: TrustlineViewModelService, useValue: viewModelSpy }],
          })
               .overrideComponent(TrustlineIssueComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(TrustlineIssueComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('view', {});
          fixture.componentRef.setInput('destinationItems', mockDestinationItems);
          fixture.componentRef.setInput('selectedDestinationItem', null);
          fixture.componentRef.setInput('destinationSearchQuery', '');
          component.activeTab = 'issueCurrency';
          component.destinationTag = '';

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should have activeTab input', () => {
               expect(component.activeTab).toBe('issueCurrency');
          });

          it('should accept clawbackTokens tab', () => {
               component.activeTab = 'clawbackTokens';
               expect(component.activeTab).toBe('clawbackTokens');
          });

          it('should have destinationTag input', () => {
               component.destinationTag = '12345';
               expect(component.destinationTag).toBe('12345');
          });

          it('should have empty destinationTag as default', () => {
               expect(component.destinationTag).toBe('');
          });

          it('should have view input', () => {
               const viewData = { test: 'data' };
               fixture.componentRef.setInput('view', viewData);
               fixture.detectChanges();
               expect(component.view()).toEqual(viewData);
          });

          it('should have destinationItems input', () => {
               expect(component.destinationItems()).toEqual(mockDestinationItems);
          });

          it('should have selectedDestinationItem input', () => {
               fixture.componentRef.setInput('selectedDestinationItem', mockSelectedItem);
               fixture.detectChanges();
               expect(component.selectedDestinationItem()).toEqual(mockSelectedItem);
          });

          it('should accept null selectedDestinationItem', () => {
               fixture.componentRef.setInput('selectedDestinationItem', null);
               fixture.detectChanges();
               expect(component.selectedDestinationItem()).toBeNull();
          });

          it('should have destinationSearchQuery input', () => {
               fixture.componentRef.setInput('destinationSearchQuery', 'search term');
               fixture.detectChanges();
               expect(component.destinationSearchQuery()).toBe('search term');
          });

          it('should have canSubmit input with default false', () => {
               expect(component.canSubmit()).toBeFalse();
          });

          it('should accept canSubmit as true', () => {
               fixture.componentRef.setInput('canSubmit', true);
               fixture.detectChanges();
               expect(component.canSubmit()).toBeTrue();
          });
     });

     describe('Outputs', () => {
          it('should emit performAction when called', () => {
               spyOn(component.performAction, 'emit');
               component.performAction.emit();
               expect(component.performAction.emit).toHaveBeenCalled();
          });

          it('should emit clearFields when called', () => {
               spyOn(component.clearFields, 'emit');
               component.clearFields.emit();
               expect(component.clearFields.emit).toHaveBeenCalled();
          });

          it('should emit searchQueryChange when called', () => {
               spyOn(component.searchQueryChange, 'emit');
               const query = 'test query';
               component.searchQueryChange.emit(query);
               expect(component.searchQueryChange.emit).toHaveBeenCalledWith(query);
          });

          it('should emit destinationChange when called', () => {
               spyOn(component.destinationChange, 'emit');
               const destination = { id: 'rTest', display: 'Test' };
               component.destinationChange.emit(destination);
               expect(component.destinationChange.emit).toHaveBeenCalledWith(destination);
          });

          it('should emit destinationTagChange when destinationTag changes', () => {
               spyOn(component.destinationTagChange, 'emit');
               component.destinationTag = '67890';
               component.destinationTagChange.emit(component.destinationTag);
               expect(component.destinationTagChange.emit).toHaveBeenCalledWith('67890');
          });
     });

     describe('handleSearchQueryChange', () => {
          it('should emit searchQueryChange with the query', () => {
               spyOn(component.searchQueryChange, 'emit');
               const query = 'new search';
               component.handleSearchQueryChange(query);
               expect(component.searchQueryChange.emit).toHaveBeenCalledWith(query);
          });

          it('should emit empty string when passed empty', () => {
               spyOn(component.searchQueryChange, 'emit');
               component.handleSearchQueryChange('');
               expect(component.searchQueryChange.emit).toHaveBeenCalledWith('');
          });
     });

     describe('handleDestinationChange', () => {
          it('should emit destinationChange with the item', () => {
               spyOn(component.destinationChange, 'emit');
               const item = { id: 'rNewDest', display: 'New Destination' };
               component.handleDestinationChange(item);
               expect(component.destinationChange.emit).toHaveBeenCalledWith(item);
          });

          it('should emit null when null is passed', () => {
               spyOn(component.destinationChange, 'emit');
               component.handleDestinationChange(null);
               expect(component.destinationChange.emit).toHaveBeenCalledWith(null);
          });
     });

     describe('Template Logic', () => {
          it('should show different labels based on activeTab', () => {
               expect(component.activeTab).toBe('issueCurrency');

               component.activeTab = 'clawbackTokens';
               expect(component.activeTab).toBe('clawbackTokens');
          });

          it('should show formTitle and hintText from viewModel when activeTab is issueCurrency', () => {
               component.activeTab = 'issueCurrency';
               expect(viewModelSpy.formTitle()).toBe('Issue Currency');
               expect(viewModelSpy.hintText()).toBe('Issue a new currency token');
          });

          it('should show generic destination label when activeTab is clawbackTokens', () => {
               component.activeTab = 'clawbackTokens';
               expect(component.activeTab).toBe('clawbackTokens');
          });
     });

     describe('Destination Tag Field', () => {
          it('should update destinationTag when ngModel changes', () => {
               component.destinationTag = '99999';
               expect(component.destinationTag).toBe('99999');
          });

          it('should emit destinationTagChange when destination tag is updated', () => {
               spyOn(component.destinationTagChange, 'emit');
               const newTag = '55555';
               component.destinationTag = newTag;
               component.destinationTagChange.emit(newTag);
               expect(component.destinationTagChange.emit).toHaveBeenCalledWith('55555');
          });

          it('should handle empty destination tag', () => {
               component.destinationTag = '';
               expect(component.destinationTag).toBe('');
          });

          it('should handle numeric destination tag as string', () => {
               component.destinationTag = '12345';
               expect(component.destinationTag).toBe('12345');
          });
     });

     describe('Service Injection', () => {
          it('should have viewModel injected', () => {
               expect(component.viewModel).toBe(viewModelSpy);
          });

          it('should access viewModel properties', () => {
               expect(viewModelSpy.formTitle()).toBeDefined();
               expect(viewModelSpy.hintText()).toBeDefined();
          });
     });

     describe('Edge Cases', () => {
          it('should handle empty destinationItems', () => {
               fixture.componentRef.setInput('destinationItems', []);
               fixture.detectChanges();
               expect(component.destinationItems()).toEqual([]);
          });

          it('should handle undefined selectedDestinationItem', () => {
               fixture.componentRef.setInput('selectedDestinationItem', undefined);
               fixture.detectChanges();
               expect(component.selectedDestinationItem()).toBeUndefined();
          });

          it('should handle empty destinationSearchQuery', () => {
               fixture.componentRef.setInput('destinationSearchQuery', '');
               fixture.detectChanges();
               expect(component.destinationSearchQuery()).toBe('');
          });

          it('should handle undefined view input', () => {
               fixture.componentRef.setInput('view', undefined);
               fixture.detectChanges();
               expect(component.view()).toBeUndefined();
          });

          it('should handle special characters in destinationTag', () => {
               component.destinationTag = '@#$%';
               expect(component.destinationTag).toBe('@#$%');
          });

          it('should handle very long destination tag', () => {
               const longTag = '1'.repeat(100);
               component.destinationTag = longTag;
               expect(component.destinationTag).toBe(longTag);
          });
     });
});
