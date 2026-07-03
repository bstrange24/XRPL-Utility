import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaultDepositWithdrawlComponent } from './vault-deposit-withdrawl.component';

describe('VaultDepositWithdrawlComponent', () => {
  let component: VaultDepositWithdrawlComponent;
  let fixture: ComponentFixture<VaultDepositWithdrawlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultDepositWithdrawlComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VaultDepositWithdrawlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
