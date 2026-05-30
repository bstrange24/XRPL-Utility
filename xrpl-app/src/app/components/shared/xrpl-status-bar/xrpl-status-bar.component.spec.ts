import { ComponentFixture, TestBed } from '@angular/core/testing';

import { XrplStatusBarComponent } from './xrpl-status-bar.component';

describe('XrplStatusBarComponent', () => {
  let component: XrplStatusBarComponent;
  let fixture: ComponentFixture<XrplStatusBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XrplStatusBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(XrplStatusBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
