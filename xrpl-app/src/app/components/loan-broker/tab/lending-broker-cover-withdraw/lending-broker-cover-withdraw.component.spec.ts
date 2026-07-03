import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LendingBrokerCoverWithdrawComponent } from './lending-broker-cover-withdraw.component';

describe('LendingBrokerCoverWithdrawComponent', () => {
  let component: LendingBrokerCoverWithdrawComponent;
  let fixture: ComponentFixture<LendingBrokerCoverWithdrawComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LendingBrokerCoverWithdrawComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LendingBrokerCoverWithdrawComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
