import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletDeriveSeedComponent } from './wallet-derive-seed.component';

describe('WalletDeriveSeedComponent', () => {
  let component: WalletDeriveSeedComponent;
  let fixture: ComponentFixture<WalletDeriveSeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletDeriveSeedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletDeriveSeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
