import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionPreviewComponent } from './transaction-preview.component';

describe('TransactionPreviewComponent', () => {
  let component: TransactionPreviewComponent;
  let fixture: ComponentFixture<TransactionPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionPreviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
