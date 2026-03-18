import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredentialTransactionOptionsComponent } from './credential-transaction-options.component';

describe('CredentialTransactionOptionsComponent', () => {
  let component: CredentialTransactionOptionsComponent;
  let fixture: ComponentFixture<CredentialTransactionOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialTransactionOptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CredentialTransactionOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
