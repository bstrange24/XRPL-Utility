import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepositAmmComponent } from './deposit-amm.component';

describe('DepositAmmComponent', () => {
  let component: DepositAmmComponent;
  let fixture: ComponentFixture<DepositAmmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepositAmmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepositAmmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
