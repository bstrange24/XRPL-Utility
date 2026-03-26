import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrustlineRemoveComponent } from './trustline-remove.component';

describe('TrustlineRemoveComponent', () => {
  let component: TrustlineRemoveComponent;
  let fixture: ComponentFixture<TrustlineRemoveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustlineRemoveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrustlineRemoveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
