import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeBasedEscrowComponent } from './time-based-escrow.component';

describe('TimeBasedEscrowComponent', () => {
  let component: TimeBasedEscrowComponent;
  let fixture: ComponentFixture<TimeBasedEscrowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeBasedEscrowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeBasedEscrowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
