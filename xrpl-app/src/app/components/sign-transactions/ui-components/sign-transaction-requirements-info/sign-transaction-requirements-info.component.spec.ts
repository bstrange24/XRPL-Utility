import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignTransactionRequirementsInfoComponent } from './sign-transaction-requirements-info.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

import { heroInformationCircle } from '@ng-icons/heroicons/outline';

describe('SignTransactionRequirementsInfoComponent', () => {
     let component: SignTransactionRequirementsInfoComponent;
     let fixture: ComponentFixture<SignTransactionRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [SignTransactionRequirementsInfoComponent],
               providers: [
                    provideNoopAnimations(),

                    {
                         provide: LUCIDE_ICONS,
                         useValue: new LucideIconProvider(icons),
                         multi: true,
                    },

                    provideIcons({
                         heroInformationCircle,
                    }),
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(SignTransactionRequirementsInfoComponent);
          component = fixture.componentInstance;

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should toggle expanded state', () => {
          expect(component.isExpanded()).toBeFalse();

          component.isExpanded.set(true);
          expect(component.isExpanded()).toBeTrue();

          component.isExpanded.set(false);
          expect(component.isExpanded()).toBeFalse();
     });
});
