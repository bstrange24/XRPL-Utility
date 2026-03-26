import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrustlineIssuersComponent } from './trustline-issuers.component';

describe('TrustlineIssuersComponent', () => {
  let component: TrustlineIssuersComponent;
  let fixture: ComponentFixture<TrustlineIssuersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustlineIssuersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrustlineIssuersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
