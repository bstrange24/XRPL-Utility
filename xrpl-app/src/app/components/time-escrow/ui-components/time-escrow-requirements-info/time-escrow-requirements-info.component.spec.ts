import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeEscrowRequirementsInfoComponent } from './time-escrow-requirements-info.component';

describe('TimeEscrowRequirementsInfoComponent', () => {
  let component: TimeEscrowRequirementsInfoComponent;
  let fixture: ComponentFixture<TimeEscrowRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeEscrowRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeEscrowRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
