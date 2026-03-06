import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerformanceBaseComponent } from './performance-base.component';

describe('PerformanceBaseComponent', () => {
  let component: PerformanceBaseComponent;
  let fixture: ComponentFixture<PerformanceBaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerformanceBaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PerformanceBaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
