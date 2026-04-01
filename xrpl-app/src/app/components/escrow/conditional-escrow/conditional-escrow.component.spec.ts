import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConditionalEscrowComponent } from './conditional-escrow.component';

describe('ConditionalEscrowComponent', () => {
  let component: ConditionalEscrowComponent;
  let fixture: ComponentFixture<ConditionalEscrowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConditionalEscrowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConditionalEscrowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
