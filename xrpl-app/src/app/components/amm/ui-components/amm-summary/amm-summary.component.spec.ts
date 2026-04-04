import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmmSummaryComponent } from './amm-summary.component';

describe('AmmSummaryComponent', () => {
  let component: AmmSummaryComponent;
  let fixture: ComponentFixture<AmmSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmmSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AmmSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
