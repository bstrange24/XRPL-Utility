import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LendingBrokerCoverDepositComponent } from './lending-broker-cover-deposit.component';

describe('LendingBrokerCoverDepositComponent', () => {
  let component: LendingBrokerCoverDepositComponent;
  let fixture: ComponentFixture<LendingBrokerCoverDepositComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LendingBrokerCoverDepositComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LendingBrokerCoverDepositComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
