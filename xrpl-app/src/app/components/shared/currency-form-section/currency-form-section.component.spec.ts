import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrencyFormSectionComponent } from './currency-form-section.component';

describe('CurrencyFormSectionComponent', () => {
  let component: CurrencyFormSectionComponent;
  let fixture: ComponentFixture<CurrencyFormSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrencyFormSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrencyFormSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
