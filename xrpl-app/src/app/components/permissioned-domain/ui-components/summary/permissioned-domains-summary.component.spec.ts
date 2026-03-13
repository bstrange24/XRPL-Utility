import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionedDomainsSummaryComponent } from './permissioned-domains-summary.component';

describe('PermissionedDomainsSummaryComponent', () => {
  let component: PermissionedDomainsSummaryComponent;
  let fixture: ComponentFixture<PermissionedDomainsSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionedDomainsSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermissionedDomainsSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
