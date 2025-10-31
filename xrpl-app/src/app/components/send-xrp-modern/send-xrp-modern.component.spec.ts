import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendXrpModernComponent } from './send-xrp-modern.component';

describe('SendXrpModernComponent', () => {
  let component: SendXrpModernComponent;
  let fixture: ComponentFixture<SendXrpModernComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendXrpModernComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendXrpModernComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
