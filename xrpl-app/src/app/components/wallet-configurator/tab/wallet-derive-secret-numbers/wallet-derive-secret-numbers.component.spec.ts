import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletDeriveSecretNumbersComponent } from './wallet-derive-secret-numbers.component';

describe('WalletDeriveSecretNumbersComponent', () => {
  let component: WalletDeriveSecretNumbersComponent;
  let fixture: ComponentFixture<WalletDeriveSecretNumbersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletDeriveSecretNumbersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletDeriveSecretNumbersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
