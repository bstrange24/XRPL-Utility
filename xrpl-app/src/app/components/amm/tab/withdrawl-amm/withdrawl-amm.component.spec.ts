import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WithdrawlAmmComponent } from './withdrawl-amm.component';

describe('WithdrawlAmmComponent', () => {
  let component: WithdrawlAmmComponent;
  let fixture: ComponentFixture<WithdrawlAmmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WithdrawlAmmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WithdrawlAmmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
