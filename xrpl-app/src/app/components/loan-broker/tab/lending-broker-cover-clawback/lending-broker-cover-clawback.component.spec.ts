import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LendingBrokerCoverClawbackComponent } from './lending-broker-cover-clawback.component';

describe('LendingBrokerCoverClawbackComponent', () => {
  let component: LendingBrokerCoverClawbackComponent;
  let fixture: ComponentFixture<LendingBrokerCoverClawbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LendingBrokerCoverClawbackComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LendingBrokerCoverClawbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
