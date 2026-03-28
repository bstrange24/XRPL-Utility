import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeEscrowTransactionOptionsComponent } from './time-escrow-transaction-options.component';

describe('TimeEscrowTransactionOptionsComponent', () => {
  let component: TimeEscrowTransactionOptionsComponent;
  let fixture: ComponentFixture<TimeEscrowTransactionOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeEscrowTransactionOptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeEscrowTransactionOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
