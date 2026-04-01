import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowsCancelComponent } from './escrows-cancel.component';

describe('EscrowsCancelComponent', () => {
  let component: EscrowsCancelComponent;
  let fixture: ComponentFixture<EscrowsCancelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscrowsCancelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscrowsCancelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
