import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecksCashComponent } from './checks-cash.component';

describe('ChecksCashComponent', () => {
  let component: ChecksCashComponent;
  let fixture: ComponentFixture<ChecksCashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecksCashComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChecksCashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
