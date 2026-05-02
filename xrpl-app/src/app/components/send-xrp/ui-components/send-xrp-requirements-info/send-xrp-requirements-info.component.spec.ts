import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SendXrpRequirementsInfoComponent } from './send-xrp-requirements-info.component';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('SendXrpRequirementsInfoComponent', () => {
     let fixture: ComponentFixture<SendXrpRequirementsInfoComponent>;
     let component: SendXrpRequirementsInfoComponent;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [SendXrpRequirementsInfoComponent],
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

          fixture = TestBed.createComponent(SendXrpRequirementsInfoComponent);
          component = fixture.componentInstance;

          fixture.componentRef.setInput('activeTab', 'sendXrp');
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should be collapsed by default', () => {
          expect(component.isExpanded()).toBeFalse();

          const content = fixture.nativeElement.querySelector('.overflow-hidden');
          expect(content).toBeNull();
     });

     it('should expand when header is clicked', () => {
          const headerBtn = fixture.nativeElement.querySelector('button');

          headerBtn.click();
          fixture.detectChanges();

          expect(component.isExpanded()).toBeTrue();
          expect(fixture.nativeElement.textContent).toContain('Required / Optional Fields');
     });

     it('should collapse when clicked twice', () => {
          const headerBtn = fixture.nativeElement.querySelector('button');

          headerBtn.click();
          fixture.detectChanges();

          headerBtn.click();
          fixture.detectChanges();

          expect(component.isExpanded()).toBeFalse();
     });

     it('should render important notes when expanded', () => {
          component.isExpanded.set(true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).toContain('Important Notes');
          expect(text).toContain('Safety Tips');
     });

     it('should not render expanded content when collapsed', () => {
          component.isExpanded.set(false);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;

          expect(text).not.toContain('Important Notes');
     });
});
