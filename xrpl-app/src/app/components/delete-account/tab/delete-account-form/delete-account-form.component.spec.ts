import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteAccountFormComponent } from './delete-account-form.component';

describe('DeleteAccountFormComponent', () => {
  let component: DeleteAccountFormComponent;
  let fixture: ComponentFixture<DeleteAccountFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteAccountFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteAccountFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
