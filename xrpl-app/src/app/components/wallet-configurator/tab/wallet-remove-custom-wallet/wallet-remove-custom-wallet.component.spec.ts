import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletRemoveCustomWalletComponent } from './wallet-remove-custom-wallet.component';

describe('WalletRemoveCustomWalletComponent', () => {
  let component: WalletRemoveCustomWalletComponent;
  let fixture: ComponentFixture<WalletRemoveCustomWalletComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletRemoveCustomWalletComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletRemoveCustomWalletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
