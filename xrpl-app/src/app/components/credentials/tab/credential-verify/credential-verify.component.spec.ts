import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredentialVerifyComponent } from './credential-verify.component';

describe('CredentialVerifyComponent', () => {
  let component: CredentialVerifyComponent;
  let fixture: ComponentFixture<CredentialVerifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialVerifyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CredentialVerifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
