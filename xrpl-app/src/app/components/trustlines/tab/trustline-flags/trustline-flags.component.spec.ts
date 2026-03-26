import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrustlineFlagsComponent } from './trustline-flags.component';

describe('TrustlineFlagsComponent', () => {
  let component: TrustlineFlagsComponent;
  let fixture: ComponentFixture<TrustlineFlagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustlineFlagsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrustlineFlagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
