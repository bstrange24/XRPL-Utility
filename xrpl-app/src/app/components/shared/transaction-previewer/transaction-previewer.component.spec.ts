import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionPreviewerComponent } from './transaction-previewer.component';

describe('TransactionPreviewerComponent', () => {
  let component: TransactionPreviewerComponent;
  let fixture: ComponentFixture<TransactionPreviewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionPreviewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionPreviewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format transaction field labels for readability', () => {
    expect(component.formatDetailLabel('LastLedgerSequence')).toBe('Last Ledger Sequence');
    expect(component.formatDetailLabel('FLAGS')).toBe('Flags');
    expect(component.formatDetailLabel('NFTokenID')).toBe('NF Token ID');
  });
});
