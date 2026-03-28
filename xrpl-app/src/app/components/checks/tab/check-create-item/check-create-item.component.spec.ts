import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckCreateItemComponent } from './check-create-item.component';

describe('CheckCreateItemComponent', () => {
  let component: CheckCreateItemComponent;
  let fixture: ComponentFixture<CheckCreateItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckCreateItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckCreateItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
