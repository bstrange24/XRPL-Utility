import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountFlagsComponent } from './account-flags.component';

describe('AccountFlagsComponent', () => {
  let component: AccountFlagsComponent;
  let fixture: ComponentFixture<AccountFlagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountFlagsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountFlagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
