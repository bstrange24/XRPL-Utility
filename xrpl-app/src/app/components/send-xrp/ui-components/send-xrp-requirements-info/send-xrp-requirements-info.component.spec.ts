import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendXrpRequirementsInfoComponent } from './send-xrp-requirements-info.component';

describe('SendXrpRequirementsInfoComponent', () => {
  let component: SendXrpRequirementsInfoComponent;
  let fixture: ComponentFixture<SendXrpRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendXrpRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendXrpRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
