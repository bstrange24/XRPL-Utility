import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionDomainDeleteFormComponent } from './permission-domain-delete-form.component';

describe('PermissionDomainDeleteFormComponent', () => {
  let component: PermissionDomainDeleteFormComponent;
  let fixture: ComponentFixture<PermissionDomainDeleteFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionDomainDeleteFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermissionDomainDeleteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
