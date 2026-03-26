import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrustlineClawbackComponent } from './trustline-clawback.component';

describe('TrustlineClawbackComponent', () => {
  let component: TrustlineClawbackComponent;
  let fixture: ComponentFixture<TrustlineClawbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustlineClawbackComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrustlineClawbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
