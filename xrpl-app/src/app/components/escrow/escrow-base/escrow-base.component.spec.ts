import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowBaseComponent } from './escrow-base.component';

describe('EscrowBaseComponent', () => {
  let component: EscrowBaseComponent;
  let fixture: ComponentFixture<EscrowBaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscrowBaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscrowBaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
