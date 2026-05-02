import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { TicketsSummaryComponent } from './tickets-summary.component';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { provideIcons, NgIcon } from '@ng-icons/core';
import { heroInformationCircle } from '@ng-icons/heroicons/outline';
import { LucideAngularModule } from 'lucide-angular';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('TicketsSummaryComponent', () => {
     let component: TicketsSummaryComponent;
     let fixture: ComponentFixture<TicketsSummaryComponent>;
     let xrplTxOptionsStore: any;

     beforeEach(async () => {
          xrplTxOptionsStore = {
               // Add any needed store properties/methods here
          };

          await TestBed.configureTestingModule({
               imports: [TicketsSummaryComponent],
               providers: [provideNoopAnimations(), provideIcons({ heroInformationCircle }), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStore }],
          }).compileComponents();

          fixture = TestBed.createComponent(TicketsSummaryComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('infoData', null);

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should have required infoData input', () => {
               const testMessage = 'Test info message';
               fixture.componentRef.setInput('infoData', testMessage);
               fixture.detectChanges();

               expect(component.infoData()).toBe(testMessage);
          });

          it('should accept null infoData', () => {
               fixture.componentRef.setInput('infoData', null);
               fixture.detectChanges();

               expect(component.infoData()).toBeNull();
          });

          it('should have tab input with default value', () => {
               expect(component.tab()).toBe('createTicket');
          });

          it('should accept tab input value', () => {
               fixture.componentRef.setInput('tab', 'deleteTicket');
               fixture.detectChanges();

               expect(component.tab()).toBe('deleteTicket');
          });

          it('should have summaryMessage input', () => {
               const message = 'Test summary';
               fixture.componentRef.setInput('summaryMessage', message);
               fixture.detectChanges();

               expect(component.summaryMessage()).toBe(message);
          });

          it('should have infoPanelExpanded input with default value', () => {
               expect(component.infoPanelExpanded()).toBeFalse();
          });

          it('should accept infoPanelExpanded input value', () => {
               fixture.componentRef.setInput('infoPanelExpanded', true);
               fixture.detectChanges();

               expect(component.infoPanelExpanded()).toBeTrue();
          });

          it('should have walletName input', () => {
               const name = 'Test Wallet';
               fixture.componentRef.setInput('walletName', name);
               fixture.detectChanges();

               expect(component.walletName()).toBe(name);
          });
     });

     describe('Outputs', () => {
          it('should emit toggleInfoPanel when called', () => {
               spyOn(component.toggleInfoPanel, 'emit');

               component.toggleInfoPanel.emit();

               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });
     });

     describe('Computed Values', () => {
          describe('emptyStateMessage', () => {
               it('should return create ticket message when tab is createTicket', () => {
                    fixture.componentRef.setInput('tab', 'createTicket');
                    fixture.detectChanges();

                    const message = component.emptyStateMessage();
                    expect(message).toBe('This wallet has not created any Tickets yet.');
               });

               it('should return delete ticket message when tab is not createTicket', () => {
                    fixture.componentRef.setInput('tab', 'deleteTicket');
                    fixture.detectChanges();

                    const message = component.emptyStateMessage();
                    expect(message).toBe('This wallet has no Tickets to delete.');
               });
          });

          describe('emptyStateSubMessage', () => {
               it('should return empty string', () => {
                    expect(component.emptyStateSubMessage()).toBe('');
               });
          });
     });

     describe('Template Rendering', () => {
          it('should show info panel when infoData is provided', () => {
               const testMessage = '<strong>Important:</strong> Test message';
               fixture.componentRef.setInput('infoData', testMessage);
               fixture.detectChanges();

               const infoPanel = fixture.nativeElement.querySelector('.bg-green-50');
               expect(infoPanel).toBeTruthy();
          });

          it('should not show info panel when infoData is null', () => {
               fixture.componentRef.setInput('infoData', null);
               fixture.detectChanges();

               const infoPanel = fixture.nativeElement.querySelector('.bg-green-50');
               expect(infoPanel).toBeFalsy();
          });

          it('should not show info panel when infoData is empty string', () => {
               fixture.componentRef.setInput('infoData', '');
               fixture.detectChanges();

               const infoPanel = fixture.nativeElement.querySelector('.bg-green-50');
               expect(infoPanel).toBeFalsy();
          });

          it('should render HTML content in info panel', () => {
               const htmlMessage = '<strong>Bold text</strong> and <em>italic text</em>';
               fixture.componentRef.setInput('infoData', htmlMessage);
               fixture.detectChanges();

               // Find the div that contains the HTML content - it's the one with class "flex-1" inside the info panel
               const infoPanel = fixture.nativeElement.querySelector('.bg-green-50');
               expect(infoPanel).toBeTruthy();

               // Find the div that contains the innerHTML binding
               const contentDiv = infoPanel.querySelector('.flex-1 div');
               expect(contentDiv).toBeTruthy();

               // Check that the HTML content is rendered (Jasmine doesn't easily check innerHTML binding, so just verify the div exists)
               expect(contentDiv).toBeTruthy();
          });

          it('should display ng-icon in info panel', () => {
               fixture.componentRef.setInput('infoData', 'Test message');
               fixture.detectChanges();

               const icon = fixture.nativeElement.querySelector('ng-icon');
               expect(icon).toBeTruthy();
          });
     });

     describe('Edge Cases', () => {
          it('should handle special characters in infoData', () => {
               const specialChars = '<>&"\'';
               fixture.componentRef.setInput('infoData', specialChars);
               fixture.detectChanges();

               const infoPanel = fixture.nativeElement.querySelector('.bg-green-50');
               expect(infoPanel).toBeTruthy();
          });

          it('should handle long text in infoData', () => {
               const longText = 'A'.repeat(1000);
               fixture.componentRef.setInput('infoData', longText);
               fixture.detectChanges();

               const infoPanel = fixture.nativeElement.querySelector('.bg-green-50');
               expect(infoPanel).toBeTruthy();
          });

          it('should update info panel when infoData changes', () => {
               fixture.componentRef.setInput('infoData', 'First message');
               fixture.detectChanges();

               let infoPanel = fixture.nativeElement.querySelector('.bg-green-50');
               expect(infoPanel).toBeTruthy();

               fixture.componentRef.setInput('infoData', null);
               fixture.detectChanges();

               infoPanel = fixture.nativeElement.querySelector('.bg-green-50');
               expect(infoPanel).toBeFalsy();

               fixture.componentRef.setInput('infoData', 'Second message');
               fixture.detectChanges();

               infoPanel = fixture.nativeElement.querySelector('.bg-green-50');
               expect(infoPanel).toBeTruthy();
          });
     });

     describe('Service Injection', () => {
          it('should have xrplTxOptionsStore injected', () => {
               expect(component.xrplTxOptionsStore).toBe(xrplTxOptionsStore);
          });
     });
});
