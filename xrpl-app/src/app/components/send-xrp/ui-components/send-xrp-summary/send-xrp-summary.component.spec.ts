import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SendXrpSummaryComponent } from './send-xrp-summary.component';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('SendXrpSummaryComponent', () => {
     let fixture: ComponentFixture<SendXrpSummaryComponent>;
     let component: SendXrpSummaryComponent;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [SendXrpSummaryComponent],
               providers: [
                    provideRouter([]),
                    provideNoopAnimations(),
                    {
                         provide: LUCIDE_ICONS,
                         useValue: new LucideIconProvider(icons),
                         multi: true,
                    },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(SendXrpSummaryComponent);
          component = fixture.componentInstance;

          fixture.componentRef.setInput('tab', 'sendXrp');
     });

     it('should create', () => {
          fixture.componentRef.setInput('info', null);
          fixture.detectChanges();

          expect(component).toBeTruthy();
     });

     it('should NOT render info block when info is null', () => {
          fixture.componentRef.setInput('info', null);
          fixture.detectChanges();

          const block = fixture.nativeElement.querySelector('.bg-green-50');
          expect(block).toBeNull();
     });

     it('should render info block when info is provided', () => {
          fixture.componentRef.setInput('info', '<p>Test Info Message</p>');
          fixture.detectChanges();

          const block = fixture.nativeElement.querySelector('.bg-green-50');
          expect(block).not.toBeNull();
     });

     it('should render HTML content inside info container', () => {
          fixture.componentRef.setInput('info', '<p>Test Info Message</p>');
          fixture.detectChanges();

          const container = fixture.nativeElement.querySelector('.text-green-800');

          expect(container.innerHTML).toContain('Test Info Message');
     });

     it('should update when input changes dynamically', () => {
          fixture.componentRef.setInput('info', '<p>First</p>');
          fixture.detectChanges();

          fixture.componentRef.setInput('info', '<p>Updated</p>');
          fixture.detectChanges();

          const container = fixture.nativeElement.querySelector('.text-green-800');

          expect(container.innerHTML).toContain('Updated');
          expect(container.innerHTML).not.toContain('First');
     });
});
