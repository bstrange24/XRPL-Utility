import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmmAmountFieldsComponent } from './amm-amount-fields.component';

describe('AmmAmountFieldsComponent', () => {
  let component: AmmAmountFieldsComponent;
  let fixture: ComponentFixture<AmmAmountFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmmAmountFieldsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AmmAmountFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
