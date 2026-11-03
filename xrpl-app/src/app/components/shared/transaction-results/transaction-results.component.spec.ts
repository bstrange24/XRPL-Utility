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

  it('should handle missing transaction labels', () => {
    expect(component.formatDetailLabel(undefined)).toBe('Unknown');
    expect(component.formatDetailLabel(null)).toBe('Unknown');
  });

  it('should render credential verification without a transaction hash', () => {
    fixture.componentRef.setInput('resultData', {
      ledger_index: 6648654,
      node: {
        LedgerEntryType: 'Credential',
        Flags: 65536,
      },
    });
    fixture.componentRef.setInput('explorerUrl', 'https://devnet.xrplwin.com/');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Credential accepted');
    expect(fixture.nativeElement.textContent).toContain('Credential Accepted');
    expect(fixture.nativeElement.textContent).not.toContain('Transaction Hash:');
    expect(fixture.nativeElement.textContent).not.toContain('Timestamp:');
  });
});
