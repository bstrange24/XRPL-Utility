import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckCancelItemComponent } from './check-cancel-item.component';

describe('CheckCancelItemComponent', () => {
  let component: CheckCancelItemComponent;
  let fixture: ComponentFixture<CheckCancelItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckCancelItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckCancelItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
