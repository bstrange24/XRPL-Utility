import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MptFlagsComponent } from './mpt-flags.component';

describe('MptFlagsComponent', () => {
  let component: MptFlagsComponent;
  let fixture: ComponentFixture<MptFlagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MptFlagsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MptFlagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
