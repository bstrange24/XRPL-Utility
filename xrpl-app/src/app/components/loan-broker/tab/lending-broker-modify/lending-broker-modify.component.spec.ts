import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LendingBrokerModifyComponent } from './lending-broker-modify.component';

describe('LendingBrokerModifyComponent', () => {
  let component: LendingBrokerModifyComponent;
  let fixture: ComponentFixture<LendingBrokerModifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LendingBrokerModifyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LendingBrokerModifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
