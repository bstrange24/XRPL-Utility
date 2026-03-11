import { ComponentFixture, TestBed } from '@angular/core/testing';

import { XrplExpirationInputComponent } from './xrpl-expiration-input.component';

describe('XrplExpirationInputComponent', () => {
  let component: XrplExpirationInputComponent;
  let fixture: ComponentFixture<XrplExpirationInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XrplExpirationInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(XrplExpirationInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
