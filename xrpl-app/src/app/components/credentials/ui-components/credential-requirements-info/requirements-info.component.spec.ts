import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequirementsInfoComponent } from './requirements-info.component';

describe('RequirementsInfoComponent', () => {
  let component: RequirementsInfoComponent;
  let fixture: ComponentFixture<RequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
