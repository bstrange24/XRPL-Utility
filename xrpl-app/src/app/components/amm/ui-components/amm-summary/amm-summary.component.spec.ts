import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmmSummaryComponent } from './amm-summary.component';
import { NO_ERRORS_SCHEMA } from '@angular/compiler';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('AmmSummaryComponent', () => {
     let component: AmmSummaryComponent;
     let fixture: ComponentFixture<AmmSummaryComponent>;

     let route: any;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AmmSummaryComponent],
               providers: [provideRouter([]), { provide: ActivatedRoute, useValue: route }, { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }],
               schemas: [NO_ERRORS_SCHEMA],
          }).compileComponents();

          fixture = TestBed.createComponent(AmmSummaryComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
