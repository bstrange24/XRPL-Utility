import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscrowsCreateComponent } from './escrows-create.component';

describe('EscrowsCreateComponent', () => {
  let component: EscrowsCreateComponent;
  let fixture: ComponentFixture<EscrowsCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscrowsCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscrowsCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
