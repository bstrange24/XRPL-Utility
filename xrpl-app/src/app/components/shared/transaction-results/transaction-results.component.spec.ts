import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionResultsComponent } from './transaction-results.component';

describe('TransactionResultsComponent', () => {
  let component: TransactionResultsComponent;
  let fixture: ComponentFixture<TransactionResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format transaction field labels for readability', () => {
    expect(component.formatDetailLabel('LastLedgerSequence')).toBe('Last Ledger Sequence');
    expect(component.formatDetailLabel('FLAGS')).toBe('Flags');
    expect(component.formatDetailLabel('PaymentChannelFund')).toBe('Payment Channel Fund');
  });
});
