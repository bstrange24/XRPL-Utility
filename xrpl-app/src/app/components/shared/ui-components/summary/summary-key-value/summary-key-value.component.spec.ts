import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SummaryKeyValueComponent } from './summary-key-value.component';

describe('SummaryKeyValueComponent', () => {
  let component: SummaryKeyValueComponent;
  let fixture: ComponentFixture<SummaryKeyValueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryKeyValueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SummaryKeyValueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
