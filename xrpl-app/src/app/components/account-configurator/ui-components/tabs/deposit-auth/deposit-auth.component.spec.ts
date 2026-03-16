import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepositAuthComponent } from './deposit-auth.component';

describe('DepositAuthComponent', () => {
  let component: DepositAuthComponent;
  let fixture: ComponentFixture<DepositAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepositAuthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepositAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
