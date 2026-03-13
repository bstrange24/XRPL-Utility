import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteAccountRequirementsInfoComponent } from './delete-account-requirements-info.component';

describe('DeleteAccountRequirementsInfoComponent', () => {
  let component: DeleteAccountRequirementsInfoComponent;
  let fixture: ComponentFixture<DeleteAccountRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteAccountRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteAccountRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
