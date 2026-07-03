import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LendingBrokerDeleteComponent } from './lending-broker-delete.component';

describe('LendingBrokerDeleteComponent', () => {
  let component: LendingBrokerDeleteComponent;
  let fixture: ComponentFixture<LendingBrokerDeleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LendingBrokerDeleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LendingBrokerDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
