import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelegateRequirementInfoComponent } from './delegate-requirement-info.component';

describe('DelegateRequirementInfoComponent', () => {
  let component: DelegateRequirementInfoComponent;
  let fixture: ComponentFixture<DelegateRequirementInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelegateRequirementInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DelegateRequirementInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
