import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionOptionsSectionComponent } from './transaction-options-section.component';

describe('TransactionOptionsSectionComponent', () => {
  let component: TransactionOptionsSectionComponent;
  let fixture: ComponentFixture<TransactionOptionsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionOptionsSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionOptionsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
