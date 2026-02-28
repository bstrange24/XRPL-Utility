import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowFinishItemComponent } from './escrow-finish-item.component';

describe('EscrowFinishItemComponent', () => {
  let component: EscrowFinishItemComponent;
  let fixture: ComponentFixture<EscrowFinishItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscrowFinishItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscrowFinishItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
