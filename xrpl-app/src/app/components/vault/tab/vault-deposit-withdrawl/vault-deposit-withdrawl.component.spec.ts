import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaultDepositWithdrawComponent } from './vault-deposit-withdrawl.component';

describe('VaultDepositWithdrawComponent', () => {
  let component: VaultDepositWithdrawComponent;
  let fixture: ComponentFixture<VaultDepositWithdrawComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultDepositWithdrawComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VaultDepositWithdrawComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
