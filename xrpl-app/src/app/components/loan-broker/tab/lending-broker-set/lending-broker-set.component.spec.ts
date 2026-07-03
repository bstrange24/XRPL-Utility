import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LendingBrokerSetComponent } from './lending-broker-set.component';

describe('LendingBrokerSetComponent', () => {
  let component: LendingBrokerSetComponent;
  let fixture: ComponentFixture<LendingBrokerSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LendingBrokerSetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LendingBrokerSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
