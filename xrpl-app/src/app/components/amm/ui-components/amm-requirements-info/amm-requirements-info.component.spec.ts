import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmmRequirementsInfoComponent } from './amm-requirements-info.component';

describe('AmmRequirementsInfoComponent', () => {
  let component: AmmRequirementsInfoComponent;
  let fixture: ComponentFixture<AmmRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmmRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AmmRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
