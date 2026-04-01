import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowCancelItemComponent } from './escrow-cancel-item.component';

describe('EscrowCancelItemComponent', () => {
  let component: EscrowCancelItemComponent;
  let fixture: ComponentFixture<EscrowCancelItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscrowCancelItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscrowCancelItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
