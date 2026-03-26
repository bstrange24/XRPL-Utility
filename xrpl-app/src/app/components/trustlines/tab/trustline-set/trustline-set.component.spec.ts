import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrustlineSetComponent } from './trustline-set.component';

describe('TrustlineSetComponent', () => {
  let component: TrustlineSetComponent;
  let fixture: ComponentFixture<TrustlineSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustlineSetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrustlineSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
