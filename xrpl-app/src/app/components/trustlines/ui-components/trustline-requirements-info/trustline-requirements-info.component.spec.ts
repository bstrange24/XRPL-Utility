import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrustlineRequirementsInfoComponent } from './trustline-requirements-info.component';

describe('TrustlineRequirementsInfoComponent', () => {
  let component: TrustlineRequirementsInfoComponent;
  let fixture: ComponentFixture<TrustlineRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustlineRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrustlineRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
