import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendXrpSummaryComponent } from './send-xrp-summary.component';

describe('SendXrpSummaryComponent', () => {
  let component: SendXrpSummaryComponent;
  let fixture: ComponentFixture<SendXrpSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendXrpSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendXrpSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
