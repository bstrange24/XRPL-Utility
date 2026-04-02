import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MptLockUnlockComponent } from './mpt-lock-unlock.component';

describe('MptLockUnlockComponent', () => {
  let component: MptLockUnlockComponent;
  let fixture: ComponentFixture<MptLockUnlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MptLockUnlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MptLockUnlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
