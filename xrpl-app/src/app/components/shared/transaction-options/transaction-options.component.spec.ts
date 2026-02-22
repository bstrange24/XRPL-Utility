import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionOptionsComponent } from './transaction-options.component';

describe('TransactionOptionsComponent', () => {
  let component: TransactionOptionsComponent;
  let fixture: ComponentFixture<TransactionOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionOptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
