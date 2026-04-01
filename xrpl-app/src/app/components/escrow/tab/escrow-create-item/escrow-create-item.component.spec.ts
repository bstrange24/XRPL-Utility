import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowCreateItemComponent } from './escrow-create-item.component';

describe('EscrowCreateItemComponent', () => {
  let component: EscrowCreateItemComponent;
  let fixture: ComponentFixture<EscrowCreateItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscrowCreateItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscrowCreateItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
