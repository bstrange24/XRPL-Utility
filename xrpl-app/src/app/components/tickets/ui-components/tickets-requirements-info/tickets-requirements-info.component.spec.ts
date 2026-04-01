import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketsRequirementsInfoComponent } from './tickets-requirements-info.component';

describe('TicketsRequirementsInfoComponent', () => {
  let component: TicketsRequirementsInfoComponent;
  let fixture: ComponentFixture<TicketsRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketsRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketsRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
