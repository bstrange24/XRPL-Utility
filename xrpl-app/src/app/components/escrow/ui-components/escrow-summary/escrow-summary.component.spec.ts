import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowSummaryComponent } from './escrow-summary.component';

describe('EscrowSummaryComponent', () => {
     let component: EscrowSummaryComponent;
     let fixture: ComponentFixture<EscrowSummaryComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [EscrowSummaryComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(EscrowSummaryComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
