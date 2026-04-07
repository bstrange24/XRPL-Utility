import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExecutionTimeComponent } from './execution-time.component';

describe('ExecutionTimeComponent', () => {
  let component: ExecutionTimeComponent;
  let fixture: ComponentFixture<ExecutionTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutionTimeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExecutionTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
