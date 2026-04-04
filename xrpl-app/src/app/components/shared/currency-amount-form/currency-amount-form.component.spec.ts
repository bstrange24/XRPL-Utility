import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrencyAmountFormComponent } from './currency-amount-form.component';

describe('CurrencyAmountFormComponent', () => {
  let component: CurrencyAmountFormComponent;
  let fixture: ComponentFixture<CurrencyAmountFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrencyAmountFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrencyAmountFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
