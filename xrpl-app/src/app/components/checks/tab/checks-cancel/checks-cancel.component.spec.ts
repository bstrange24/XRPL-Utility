import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecksCancelComponent } from './checks-cancel.component';

describe('ChecksCancelComponent', () => {
  let component: ChecksCancelComponent;
  let fixture: ComponentFixture<ChecksCancelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecksCancelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChecksCancelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
