import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredentialsWalletCredentialsSummaryComponent } from './credentials-wallet-credentials-summary.component';

describe('CredentialsWalletCredentialsSummaryComponent', () => {
  let component: CredentialsWalletCredentialsSummaryComponent;
  let fixture: ComponentFixture<CredentialsWalletCredentialsSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialsWalletCredentialsSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CredentialsWalletCredentialsSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
