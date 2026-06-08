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
});
