import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MptRequirementsInfoComponent } from './mpt-requirements-info.component';

describe('MptRequirementsInfoComponent', () => {
  let component: MptRequirementsInfoComponent;
  let fixture: ComponentFixture<MptRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MptRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MptRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
