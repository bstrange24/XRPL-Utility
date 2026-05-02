import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { By } from '@angular/platform-browser';
import { SummaryContainerComponent } from './summary-container.component';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

// Test component for content projection
@Component({
     template: `
          <app-summary-container [walletName]="walletName" [summaryText]="summaryText" [itemCount]="itemCount" [loading]="loading" [links]="links" [showExpandButton]="showExpandButton" [buttonLabel]="buttonLabel" [emptyStateMessage]="emptyStateMessage" [emptyStateSubMessage]="emptyStateSubMessage" [variant]="variant" [infoPanelExpanded]="infoPanelExpanded" (toggleInfoPanel)="onToggleInfoPanel()">
               <div items-list>
                    <div class="test-item">Test Item 1</div>
                    <div class="test-item">Test Item 2</div>
               </div>
          </app-summary-container>
     `,
     imports: [SummaryContainerComponent],
})
class TestHostComponent {
     walletName = 'Test Wallet';
     summaryText = 'has <strong>5 items</strong>';
     itemCount = 5;
     loading = false;
     links = '<a href="#">View All</a>';
     showExpandButton = true;
     buttonLabel = 'items';
     emptyStateMessage = 'No items found';
     emptyStateSubMessage = '';
     variant = 'blue';
     infoPanelExpanded = false;

     onToggleInfoPanel() {}
}

describe('SummaryContainerComponent', () => {
     let component: SummaryContainerComponent;
     let fixture: ComponentFixture<SummaryContainerComponent>;
     let hostComponent: TestHostComponent;
     let hostFixture: ComponentFixture<TestHostComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [SummaryContainerComponent, TestHostComponent],
               providers: [{ provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }],
          }).compileComponents();

          fixture = TestBed.createComponent(SummaryContainerComponent);
          component = fixture.componentInstance;

          // Set default inputs
          fixture.componentRef.setInput('walletName', 'Test Wallet');
          fixture.componentRef.setInput('summaryText', 'has items');
          fixture.componentRef.setInput('itemCount', 0);
          fixture.componentRef.setInput('loading', false);
          fixture.componentRef.setInput('links', null);
          fixture.componentRef.setInput('showExpandButton', true);
          fixture.componentRef.setInput('buttonLabel', 'items');
          fixture.componentRef.setInput('emptyStateMessage', 'No items found.');
          fixture.componentRef.setInput('emptyStateSubMessage', '');
          fixture.componentRef.setInput('variant', 'blue');
          fixture.componentRef.setInput('infoPanelExpanded', false);

          fixture.detectChanges();

          // Create host component for content projection tests
          hostFixture = TestBed.createComponent(TestHostComponent);
          hostComponent = hostFixture.componentInstance;
          hostFixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          it('should accept walletName input', () => {
               expect(component.walletName()).toBe('Test Wallet');
          });

          it('should accept summaryText input', () => {
               expect(component.summaryText()).toBe('has items');
          });

          it('should accept itemCount input', () => {
               expect(component.itemCount()).toBe(0);
          });

          it('should accept loading input', () => {
               expect(component.loading()).toBeFalse();
          });

          it('should accept links input', () => {
               expect(component.links()).toBeNull();
          });

          it('should accept showExpandButton input', () => {
               expect(component.showExpandButton()).toBeTrue();
          });

          it('should accept buttonLabel input', () => {
               expect(component.buttonLabel()).toBe('items');
          });

          it('should accept emptyStateMessage input', () => {
               expect(component.emptyStateMessage()).toBe('No items found.');
          });

          it('should accept emptyStateSubMessage input', () => {
               expect(component.emptyStateSubMessage()).toBe('');
          });

          it('should accept variant input', () => {
               expect(component.variant()).toBe('blue');
          });

          it('should accept infoPanelExpanded input', () => {
               expect(component.infoPanelExpanded()).toBeFalse();
          });

          it('should update inputs when changed', () => {
               fixture.componentRef.setInput('walletName', 'New Wallet');
               fixture.componentRef.setInput('itemCount', 10);
               fixture.componentRef.setInput('infoPanelExpanded', true);
               fixture.detectChanges();

               expect(component.walletName()).toBe('New Wallet');
               expect(component.itemCount()).toBe(10);
               expect(component.infoPanelExpanded()).toBeTrue();
          });
     });

     describe('Output signals', () => {
          it('should have toggleInfoPanel output', () => {
               expect(component.toggleInfoPanel).toBeDefined();
               expect(component.toggleInfoPanel.emit).toBeDefined();
          });

          it('should emit toggleInfoPanel when called', () => {
               spyOn(component.toggleInfoPanel, 'emit');
               component.toggleInfoPanel.emit();
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });
     });

     describe('Template rendering - Header', () => {
          it('should display wallet name', () => {
               const walletNameEl = fixture.debugElement.query(By.css('code'));
               expect(walletNameEl.nativeElement.textContent).toContain('Test Wallet');
          });

          // it('should display summary text as HTML', () => {
          //      fixture.componentRef.setInput('summaryText', 'has <strong>5 items</strong>');
          //      fixture.detectChanges();

          //      const summaryTextEl = fixture.debugElement.query(By.css('.text-green-600'));
          //      expect(summaryTextEl.nativeElement.innerHTML).toContain('<strong>5 items</strong>');
          // });

          it('should display links when provided', () => {
               fixture.componentRef.setInput('links', '<a href="#">View All</a>');
               fixture.detectChanges();

               const linksEl = fixture.debugElement.query(By.css('.text-blue-600'));
               expect(linksEl).toBeTruthy();
          });

          it('should not display links when not provided', () => {
               fixture.componentRef.setInput('links', null);
               fixture.detectChanges();

               const linksEl = fixture.debugElement.query(By.css('.text-blue-600'));
               expect(linksEl).toBeFalsy();
          });

          it('should show expand button when showExpandButton is true and itemCount > 0', () => {
               fixture.componentRef.setInput('showExpandButton', true);
               fixture.componentRef.setInput('itemCount', 5);
               fixture.detectChanges();

               const expandButton = fixture.debugElement.query(By.css('button'));
               expect(expandButton).toBeTruthy();
          });

          it('should not show expand button when showExpandButton is false', () => {
               fixture.componentRef.setInput('showExpandButton', false);
               fixture.componentRef.setInput('itemCount', 5);
               fixture.detectChanges();

               const expandButton = fixture.debugElement.query(By.css('button'));
               expect(expandButton).toBeFalsy();
          });

          it('should not show expand button when itemCount is 0', () => {
               fixture.componentRef.setInput('itemCount', 0);
               fixture.detectChanges();

               const expandButton = fixture.debugElement.query(By.css('button'));
               expect(expandButton).toBeFalsy();
          });

          it('should display correct button label', () => {
               fixture.componentRef.setInput('showExpandButton', true);
               fixture.componentRef.setInput('itemCount', 5);
               fixture.componentRef.setInput('buttonLabel', 'MPTs');
               fixture.detectChanges();

               const buttonText = fixture.debugElement.query(By.css('button span')).nativeElement.textContent;
               expect(buttonText).toContain('Show MPTs');
          });

          it('should toggle button text when expanded', () => {
               fixture.componentRef.setInput('showExpandButton', true);
               fixture.componentRef.setInput('itemCount', 5);
               fixture.componentRef.setInput('infoPanelExpanded', true);
               fixture.detectChanges();

               const buttonText = fixture.debugElement.query(By.css('button span')).nativeElement.textContent;
               expect(buttonText).toContain('Hide items');
          });
     });

     describe('Template rendering - Expandable content', () => {
          it('should show items list when itemCount > 0 and infoPanelExpanded is true', () => {
               fixture.componentRef.setInput('itemCount', 5);
               fixture.componentRef.setInput('infoPanelExpanded', true);
               fixture.detectChanges();

               const itemsList = fixture.debugElement.query(By.css('.max-h-\\[420px\\]'));
               expect(itemsList).toBeTruthy();
          });

          it('should hide items list when infoPanelExpanded is false', () => {
               fixture.componentRef.setInput('itemCount', 5);
               fixture.componentRef.setInput('infoPanelExpanded', false);
               fixture.detectChanges();

               const itemsList = fixture.debugElement.query(By.css('.max-h-\\[420px\\]'));
               expect(itemsList).toBeFalsy();
          });

          it('should hide items list when itemCount is 0', () => {
               fixture.componentRef.setInput('itemCount', 0);
               fixture.componentRef.setInput('infoPanelExpanded', true);
               fixture.detectChanges();

               const itemsList = fixture.debugElement.query(By.css('.max-h-\\[420px\\]'));
               expect(itemsList).toBeFalsy();
          });

          // it('should project items-list content', () => {
          //      const projectedItems = hostFixture.debugElement.queryAll(By.css('.test-item'));
          //      expect(projectedItems.length).toBe(2);
          //      expect(projectedItems[0].nativeElement.textContent).toContain('Test Item 1');
          //      expect(projectedItems[1].nativeElement.textContent).toContain('Test Item 2');
          // });
     });

     describe('Template rendering - Empty state', () => {
          it('should show empty state when itemCount is 0, not expanded, and not loading', () => {
               fixture.componentRef.setInput('itemCount', 0);
               fixture.componentRef.setInput('infoPanelExpanded', false);
               fixture.componentRef.setInput('loading', false);
               fixture.detectChanges();

               const emptyState = fixture.debugElement.query(By.css('.text-center'));
               expect(emptyState).toBeTruthy();
               expect(emptyState.nativeElement.textContent).toContain('No items found.');
          });

          it('should not show empty state when loading is true', () => {
               fixture.componentRef.setInput('itemCount', 0);
               fixture.componentRef.setInput('infoPanelExpanded', false);
               fixture.componentRef.setInput('loading', true);
               fixture.detectChanges();

               const emptyState = fixture.debugElement.query(By.css('.text-center'));
               expect(emptyState).toBeFalsy();
          });

          it('should show empty state sub message when provided', () => {
               fixture.componentRef.setInput('itemCount', 0);
               fixture.componentRef.setInput('infoPanelExpanded', false);
               fixture.componentRef.setInput('emptyStateSubMessage', 'Try adding some items');
               fixture.detectChanges();

               const emptyState = fixture.debugElement.query(By.css('.text-center'));
               expect(emptyState.nativeElement.textContent).toContain('Try adding some items');
          });
     });

     describe('Button interaction', () => {
          it('should emit toggleInfoPanel when button is clicked', () => {
               fixture.componentRef.setInput('showExpandButton', true);
               fixture.componentRef.setInput('itemCount', 5);
               fixture.detectChanges();

               spyOn(component.toggleInfoPanel, 'emit');
               const button = fixture.debugElement.query(By.css('button'));
               button.triggerEventHandler('click', null);

               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty wallet name', () => {
               fixture.componentRef.setInput('walletName', '');
               fixture.detectChanges();

               const walletNameEl = fixture.debugElement.query(By.css('code'));
               expect(walletNameEl.nativeElement.textContent).toBe('');
          });

          // it('should handle null summary text', () => {
          //      fixture.componentRef.setInput('summaryText', null);
          //      fixture.detectChanges();

          //      const summaryTextEl = fixture.debugElement.query(By.css('.text-green-600'));
          //      expect(summaryTextEl).toBeFalsy();
          // });

          it('should handle large item counts', () => {
               fixture.componentRef.setInput('itemCount', 9999);
               fixture.detectChanges();

               expect(component.itemCount()).toBe(9999);
          });
     });
});
