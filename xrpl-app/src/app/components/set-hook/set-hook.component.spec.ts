import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetHookComponent } from './set-hook.component';

describe('SetHookComponent', () => {
  let component: SetHookComponent;
  let fixture: ComponentFixture<SetHookComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetHookComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetHookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
