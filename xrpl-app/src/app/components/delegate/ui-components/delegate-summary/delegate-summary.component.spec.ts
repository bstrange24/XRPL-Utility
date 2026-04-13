import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelegateSummaryComponent } from './delegate-summary.component';

describe('DelegateSummaryComponent', () => {
  let component: DelegateSummaryComponent;
  let fixture: ComponentFixture<DelegateSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelegateSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DelegateSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
