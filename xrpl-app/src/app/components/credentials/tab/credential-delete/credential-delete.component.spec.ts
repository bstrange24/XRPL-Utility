import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredentialDeleteComponent } from './credential-delete.component';

describe('CredentialDeleteComponent', () => {
  let component: CredentialDeleteComponent;
  let fixture: ComponentFixture<CredentialDeleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialDeleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CredentialDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
