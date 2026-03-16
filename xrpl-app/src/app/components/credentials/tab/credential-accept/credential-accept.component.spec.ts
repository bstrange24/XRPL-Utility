import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredentialAcceptComponent } from './credential-accept.component';

describe('CredentialAcceptComponent', () => {
  let component: CredentialAcceptComponent;
  let fixture: ComponentFixture<CredentialAcceptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialAcceptComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CredentialAcceptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
