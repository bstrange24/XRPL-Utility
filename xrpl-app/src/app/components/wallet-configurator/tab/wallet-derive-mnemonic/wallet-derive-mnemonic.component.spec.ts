import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletDeriveMnemonicComponent } from './wallet-derive-mnemonic.component';

describe('WalletDeriveMnemonicComponent', () => {
  let component: WalletDeriveMnemonicComponent;
  let fixture: ComponentFixture<WalletDeriveMnemonicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletDeriveMnemonicComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletDeriveMnemonicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
