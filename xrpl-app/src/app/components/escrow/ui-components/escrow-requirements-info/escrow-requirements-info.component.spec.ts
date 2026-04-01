import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowRequirementsInfoComponent } from './escrow-requirements-info.component';

describe('EscrowRequirementsInfoComponent', () => {
     let component: EscrowRequirementsInfoComponent;
     let fixture: ComponentFixture<EscrowRequirementsInfoComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [EscrowRequirementsInfoComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(EscrowRequirementsInfoComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
