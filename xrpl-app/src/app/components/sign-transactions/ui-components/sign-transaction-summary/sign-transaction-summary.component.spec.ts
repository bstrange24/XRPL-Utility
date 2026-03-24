import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignTransactionSummaryComponent } from './sign-transaction-summary.component';

describe('SignTransactionSummaryComponent', () => {
  let component: SignTransactionSummaryComponent;
  let fixture: ComponentFixture<SignTransactionSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignTransactionSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SignTransactionSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
