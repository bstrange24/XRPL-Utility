import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendXrpFormComponent } from './send-xrp-form.component';

describe('SendXrpFormComponent', () => {
  let component: SendXrpFormComponent;
  let fixture: ComponentFixture<SendXrpFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendXrpFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendXrpFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
