import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowsFinishComponent } from './escrows-finish.component';

describe('EscrowsFinishComponent', () => {
  let component: EscrowsFinishComponent;
  let fixture: ComponentFixture<EscrowsFinishComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscrowsFinishComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscrowsFinishComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
