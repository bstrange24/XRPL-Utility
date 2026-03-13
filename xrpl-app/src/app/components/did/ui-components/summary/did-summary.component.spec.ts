import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DidSummaryComponent } from './did-summary.component';

describe('DidSummaryComponent', () => {
  let component: DidSummaryComponent;
  let fixture: ComponentFixture<DidSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DidSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DidSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
