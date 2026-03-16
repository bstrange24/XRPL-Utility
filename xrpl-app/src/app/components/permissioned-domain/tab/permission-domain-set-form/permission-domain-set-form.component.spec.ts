import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionDomainSetFormComponent } from './permission-domain-set-form.component';

describe('PermissionDomainSetFormComponent', () => {
  let component: PermissionDomainSetFormComponent;
  let fixture: ComponentFixture<PermissionDomainSetFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionDomainSetFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermissionDomainSetFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
