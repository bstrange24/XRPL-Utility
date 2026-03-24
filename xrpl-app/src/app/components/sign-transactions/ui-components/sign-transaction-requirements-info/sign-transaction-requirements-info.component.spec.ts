import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignTransactionRequirementsInfoComponent } from './sign-transaction-requirements-info.component';

describe('SignTransactionRequirementsInfoComponent', () => {
  let component: SignTransactionRequirementsInfoComponent;
  let fixture: ComponentFixture<SignTransactionRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignTransactionRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SignTransactionRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
